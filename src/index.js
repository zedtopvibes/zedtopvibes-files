export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const SITENAME = "Example.Com"; // Your branding

    // --- 1. ROUTE: DOWNLOAD ---
    if (url.pathname.startsWith('/download/')) {
      const filename = decodeURIComponent(url.pathname.split('/').pop());
      const object = await env.recycle.get(filename);
      if (!object) return new Response('File Not Found', { status: 404 });

      return new Response(object.body, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // --- 2. ROUTE: UPLOAD ---
    if (request.method === 'POST' && url.pathname === '/upload') {
      try {
        const formData = await request.formData();
        const file = formData.get('file');
        const rawTitle = formData.get('title') || 'Unknown';
        const rawArtist = formData.get('artist') || 'Unknown';
        const duration = formData.get('duration') || '';

        // Apply your specific branding format
        const taggedTitle = `${rawTitle} (${SITENAME})`;
        const taggedArtist = `${rawArtist} | ${SITENAME}`;

        const fileBuffer = await file.arrayBuffer();
        const watermark = await env.recycle.get('watermark.jpg');
        const coverBuffer = watermark ? await watermark.arrayBuffer() : null;

        const taggedMp3 = addID3Tags(fileBuffer, { 
          artist: taggedArtist, 
          title: taggedTitle, 
          duration 
        }, coverBuffer);

        // Dashboard-friendly filename (No hashes, just clean names)
        const filename = `${rawTitle} - ${rawArtist}.mp3`.replace(/[<>:"/\\|?*]/g, '');

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

    // --- 3. ROUTE: FRONTEND UI ---
    return new Response(getHTML(SITENAME), {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  }
};

/**
 * THE UI (Clean & Hidden Branding)
 */
function getHTML(site) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>${site} Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { font-family: system-ui; max-width: 400px; margin: 2rem auto; padding: 1rem; background: #f4f4f9; }
      .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      input, button { width: 100%; padding: 12px; margin: 8px 0; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; }
      button { background: #007bff; color: white; border: none; font-weight: bold; cursor: pointer; }
      #status { margin-top: 1rem; font-size: 0.9rem; color: #555; text-align: center; }
      .link-box { margin-top: 10px; padding: 10px; background: #eef; border-radius: 4px; word-break: break-all; }
    </style>
  </head>
  <body>
    <div class="card">
      <h2 style="text-align:center">🎵 ${site} Uploader</h2>
      <input type="file" id="f" accept="audio/mpeg">
      <input type="text" id="t" placeholder="Title">
      <input type="text" id="a" placeholder="Artist">
      <button id="btn">Upload & Brand</button>
      <div id="status"></div>
    </div>
    <script>
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      let ms = 0;
      document.getElementById('f').onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        document.getElementById('status').innerText = "Analyzing...";
        const buf = await file.arrayBuffer();
        const decoded = await ctx.decodeAudioData(buf);
        ms = Math.floor(decoded.duration * 1000);
        document.getElementById('status').innerText = "Ready (" + Math.floor(decoded.duration) + "s)";
      };
      document.getElementById('btn').onclick = async () => {
        const file = document.getElementById('f').files[0];
        if (!file) return alert("Select file");
        document.getElementById('btn').disabled = true;
        document.getElementById('status').innerText = "Uploading...";
        const fd = new FormData();
        fd.append('file', file);
        fd.append('title', document.getElementById('t').value);
        fd.append('artist', document.getElementById('a').value);
        fd.append('duration', ms);
        const res = await fetch('/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) {
          const url = window.location.origin + '/download/' + encodeURIComponent(data.filename);
          document.getElementById('status').innerHTML = '✅ <b>Branded!</b><div class="link-box">' + url + '</div>';
        } else {
          document.getElementById('status').innerText = "Error!";
          document.getElementById('btn').disabled = false;
        }
      };
    </script>
  </body>
  </html>`;
}

/**
 * BINARY TAGGING LOGIC
 */
function addID3Tags(audioBuffer, tags, coverBuffer) {
  const audioBytes = new Uint8Array(audioBuffer);
  const frames = [];
  frames.push(createTextFrame('TPE1', tags.artist));
  frames.push(createTextFrame('TIT2', tags.title));
  if (tags.duration) frames.push(createTextFrame('TLEN', tags.duration.toString()));
  if (coverBuffer) {
    const coverBytes = new Uint8Array(coverBuffer);
    const mime = "image/jpeg";
    const frame = new Uint8Array(10 + 1 + mime.length + 1 + 1 + 1 + coverBytes.length);
    frame.set(new TextEncoder().encode('APIC'), 0);
    const size = frame.length - 10;
    frame[4] = (size >> 24) & 0xFF; frame[5] = (size >> 16) & 0xFF; frame[6] = (size >> 8) & 0xFF; frame[7] = size & 0xFF;
    frame.set(new TextEncoder().encode(mime), 11);
    frame[11 + mime.length + 1] = 0x03; 
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
  for (const f of frames) { final.set(f, offset); offset += f.length; }
  final.set(audioBytes, offset);
  return final;
}
function createTextFrame(type, value) {
  const enc = new TextEncoder().encode(value);
  const f = new Uint8Array(10 + 1 + enc.length);
  f.set(new TextEncoder().encode(type), 0);
  const s = 1 + enc.length;
  f[4] = (s >> 24) & 0xFF; f[5] = (s >> 16) & 0xFF; f[6] = (s >> 8) & 0xFF; f[7] = s & 0xFF;
  f.set(enc, 11);
  return f;
}
function encodeSynchsafe(size) {
  return [(size >> 21) & 0x7F, (size >> 14) & 0x7F, (size >> 7) & 0x7F, size & 0x7F];
}
