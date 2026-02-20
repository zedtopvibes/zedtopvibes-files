// src/index.js - Fully Optimized Version

const UPLOAD_FORM = `<!DOCTYPE html>
<html>
<head>
    <title>MP3 Tag Studio</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; }
        body { font-family: system-ui, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background: #f0f2f5; }
        .container { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: 500; font-size: 14px; }
        input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
        .row { display: flex; gap: 10px; margin-bottom: 10px; }
        .row div { flex: 1; }
        button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
        button:disabled { background: #ccc; }
        .result { margin-top: 20px; padding: 15px; border-radius: 6px; display: none; text-align: center; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        .preview img { max-width: 150px; margin-top: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎵 MP3 Tagger</h1>
        <div class="form-group">
            <label>MP3 File</label>
            <input type="file" id="mp3File" accept=".mp3">
        </div>
        <div class="row">
            <div><label>Artist</label><input type="text" id="artist" value="Unknown Artist"></div>
            <div><label>Title</label><input type="text" id="title"></div>
        </div>
        <div class="form-group">
            <label>Cover Art</label>
            <input type="file" id="coverFile" accept="image/*">
            <div id="preview" class="preview"></div>
        </div>
        <button id="uploadBtn">Upload & Tag</button>
        <div id="result" class="result"></div>
    </div>

    <script>
        const mp3Input = document.getElementById('mp3File');
        const titleInput = document.getElementById('title');
        
        mp3Input.addEventListener('change', (e) => {
            if (e.target.files[0] && !titleInput.value) {
                titleInput.value = e.target.files[0].name.replace('.mp3', '');
            }
        });

        document.getElementById('uploadBtn').onclick = async () => {
            const btn = document.getElementById('uploadBtn');
            const result = document.getElementById('result');
            const file = mp3Input.files[0];
            if (!file) return alert('Select a file');

            btn.disabled = true;
            result.style.display = 'none';

            const fd = new FormData();
            fd.append('file', file);
            fd.append('artist', document.getElementById('artist').value);
            fd.append('title', titleInput.value);
            const cover = document.getElementById('coverFile').files[0];
            if (cover) fd.append('cover', cover);

            try {
                const res = await fetch('/upload', { method: 'POST', body: fd });
                const data = await res.json();
                if (data.success) {
                    result.className = 'result success';
                    result.innerHTML = 'Done! <br><br> <a href="/download/' + data.filename + '" style="color:green; font-weight:bold;">Download Tagged MP3</a>';
                } else {
                    throw new Error(data.error);
                }
            } catch (e) {
                result.className = 'result error';
                result.textContent = e.message;
            }
            result.style.display = 'block';
            btn.disabled = false;
        };
    </script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/') return new Response(UPLOAD_FORM, { headers: { 'Content-Type': 'text/html' } });

    if (url.pathname === '/upload' && request.method === 'POST') {
      return handleUpload(request, env);
    }

    if (url.pathname.startsWith('/download/')) {
      const filename = url.pathname.split('/').pop();
      return handleDownload(filename, env);
    }

    return new Response('Not Found', { status: 404 });
  }
};

async function handleUpload(request, env) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const cover = formData.get('cover');
    const artist = formData.get('artist') || 'Unknown';
    const title = formData.get('title') || 'Unknown';

    const fileBuffer = await file.arrayBuffer();
    let coverBuffer = null;
    let coverMime = null;

    if (cover && cover.size > 0) {
      coverBuffer = await cover.arrayBuffer();
      coverMime = cover.type;
    }

    // Process Tags
    const tags = { artist, title };
    const taggedMp3 = addID3Tags(fileBuffer, tags, coverBuffer, coverMime);

    const filename = `${Date.now()}-${title.replace(/\s+/g, '_')}.mp3`;
    
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

async function handleDownload(filename, env) {
  const object = await env.recycle.get(filename);
  if (!object) return new Response('Not Found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  headers.set('Access-Control-Allow-Origin', '*');

  // Streaming the body directly from R2 avoids memory overflow
  return new Response(object.body, { headers });
}

// --- ID3 BINARY UTILITIES ---

function encodeSynchsafe(size) {
  return [
    (size >> 21) & 0x7f,
    (size >> 14) & 0x7f,
    (size >> 7) & 0x7f,
    size & 0x7f
  ];
}

function createTextFrame(id, text) {
  const encoded = new TextEncoder().encode(text);
  const size = encoded.length + 1; // +1 for encoding flag
  const frame = new Uint8Array(10 + size);
  
  // ID
  frame.set([...id].map(c => c.charCodeAt(0)), 0);
  // Size (Standard Big-Endian for v2.3 frames)
  frame[4] = (size >> 24) & 0xFF;
  frame[5] = (size >> 16) & 0xFF;
  frame[6] = (size >> 8) & 0xFF;
  frame[7] = size & 0xFF;
  
  frame[10] = 0x03; // UTF-8
  frame.set(encoded, 11);
  return frame;
}

function createCoverFrame(buffer, mime) {
  const mimeStr = (mime || 'image/jpeg') + '\0';
  const mimeBytes = new TextEncoder().encode(mimeStr);
  const descBytes = new TextEncoder().encode('\0'); // No description
  const data = new Uint8Array(buffer);
  
  const size = 1 + mimeBytes.length + 1 + descBytes.length + data.length;
  const frame = new Uint8Array(10 + size);
  
  frame.set([0x41, 0x50, 0x49, 0x43], 0); // APIC
  frame[4] = (size >> 24) & 0xFF;
  frame[5] = (size >> 16) & 0xFF;
  frame[6] = (size >> 8) & 0xFF;
  frame[7] = size & 0xFF;
  
  frame[10] = 0x03; // UTF-8
  let offset = 11;
  frame.set(mimeBytes, offset);
  offset += mimeBytes.length;
  frame[offset] = 0x03; // Cover front
  offset += 1;
  frame.set(descBytes, offset);
  offset += descBytes.length;
  frame.set(data, offset);
  
  return frame;
}

function addID3Tags(audioBuffer, tags, coverBuffer, coverMime) {
  const audioBytes = new Uint8Array(audioBuffer);
  const frames = [];
  
  frames.push(createTextFrame('TPE1', tags.artist));
  frames.push(createTextFrame('TIT2', tags.title));
  if (coverBuffer) frames.push(createCoverFrame(coverBuffer, coverMime));

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
