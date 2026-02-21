/**
 * ONE-STOP WORKER SCRIPT
 * Handles: ID3 Tagging (Artist, Title, Duration), Watermarking, 
 * UUID generation, and R2 Storage.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. ROUTE: DOWNLOAD
    if (url.pathname.startsWith('/download/')) {
      const filename = url.pathname.split('/').pop();
      const object = await env.recycle.get(filename);
      if (!object) return new Response('File Not Found', { status: 404 });

      const headers = new Headers();
      headers.set('Content-Type', 'audio/mpeg');
      headers.set('Content-Length', object.size);
      headers.set('Accept-Ranges', 'bytes');
      headers.set('Content-Disposition', `inline; filename="${filename}"`);
      headers.set('Access-Control-Allow-Origin', '*');

      return new Response(object.body, { headers });
    }

    // 2. ROUTE: UPLOAD
    if (request.method === 'POST' && url.pathname === '/upload') {
      try {
        const formData = await request.formData();
        const file = formData.get('file');
        const artist = formData.get('artist') || 'Admin';
        const title = formData.get('title') || 'New Track';
        const duration = formData.get('duration') || ''; // From your frontend 'win'

        const fileBuffer = await file.arrayBuffer();

        // Internal fetch of watermark from same R2 bucket
        const watermark = await env.recycle.get('watermark.jpg');
        const coverBuffer = watermark ? await watermark.arrayBuffer() : null;

        // Apply Metadata
        const taggedMp3 = addID3Tags(fileBuffer, { artist, title, duration }, coverBuffer);

        // Save with unique ID
        const filename = `${crypto.randomUUID()}.mp3`;
        await env.recycle.put(filename, taggedMp3, {
          httpMetadata: { contentType: 'audio/mpeg' }
        });

        return new Response(JSON.stringify({ success: true, filename }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};

/**
 * BINARY HELPERS (The "Secret Sauce")
 */

function addID3Tags(audioBuffer, tags, coverBuffer) {
  const audioBytes = new Uint8Array(audioBuffer);
  const frames = [];

  // Metadata Frames
  frames.push(createTextFrame('TPE1', tags.artist));
  frames.push(createTextFrame('TIT2', tags.title));
  if (tags.duration) {
    frames.push(createTextFrame('TLEN', tags.duration.toString()));
  }

  // Cover Art Frame
  if (coverBuffer) {
    const coverBytes = new Uint8Array(coverBuffer);
    const mime = "image/jpeg";
    const frame = new Uint8Array(10 + 1 + mime.length + 1 + 1 + 1 + coverBytes.length);
    frame.set(new TextEncoder().encode('APIC'), 0);
    const size = frame.length - 10;
    frame[4] = (size >> 24) & 0xFF; frame[5] = (size >> 16) & 0xFF;
    frame[6] = (size >> 8) & 0xFF; frame[7] = size & 0xFF;
    frame[10] = 0; // Text encoding
    frame.set(new TextEncoder().encode(mime), 11);
    frame[11 + mime.length] = 0; // Terminator
    frame[11 + mime.length + 1] = 0x03; // Picture type (Cover)
    frame[11 + mime.length + 2] = 0; // Description terminator
    frame.set(coverBytes, 11 + mime.length + 3);
    frames.push(frame);
  }

  const framesSize = frames.reduce((acc, f) => acc + f.length, 0);
  const header = new Uint8Array(10);
  header.set([0x49, 0x44, 0x33, 0x03, 0x00, 0x00], 0);
  header.set(encodeSynchsafe(framesSize), 6);

  const final = new Uint8Array(10 + framesSize + audioBytes.length);
  final.set(header, 0);
  let offset = 10;
  for (const f of frames) {
    final.set(f, offset);
    offset += f.length;
  }
  final.set(audioBytes, offset);
  return final;
}

function createTextFrame(type, value) {
  const encodedValue = new TextEncoder().encode(value);
  const frame = new Uint8Array(10 + 1 + encodedValue.length);
  frame.set(new TextEncoder().encode(type), 0);
  const size = 1 + encodedValue.length;
  frame[4] = (size >> 24) & 0xFF; frame[5] = (size >> 16) & 0xFF;
  frame[6] = (size >> 8) & 0xFF; frame[7] = size & 0xFF;
  frame[10] = 0; // ISO-8859-1
  frame.set(encodedValue, 11);
  return frame;
}

function encodeSynchsafe(size) {
  return [
    (size >> 21) & 0x7F,
    (size >> 14) & 0x7F,
    (size >> 7) & 0x7F,
    size & 0x7F
  ];
}
