// src/index.js - UUID + R2 Watermark + Streaming Download

const UPLOAD_FORM = `<!DOCTYPE html>
<html>
<head>
    <title>Brand MP3 Tagger</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; }
        body { font-family: system-ui, sans-serif; padding: 20px; max-width: 500px; margin: 0 auto; background: #f4f7f6; }
        .container { background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        h1 { font-size: 22px; text-align: center; color: #333; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: 600; color: #555; }
        input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; }
        button { width: 100%; padding: 14px; background: #000; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-top: 10px; transition: opacity 0.2s; }
        button:disabled { opacity: 0.5; }
        .result { margin-top: 20px; padding: 15px; border-radius: 8px; display: none; text-align: center; border: 1px solid transparent; }
        .success { background: #e7f9ee; color: #1d753c; border-color: #bee3cc; }
        .error { background: #fff5f5; color: #c53030; border-color: #fed7d7; }
        .brand-note { font-size: 12px; color: #888; text-align: center; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎵 MP3 Tagger</h1>
        <div class="form-group">
            <label>Select MP3 File</label>
            <input type="file" id="mp3File" accept=".mp3">
        </div>
        <div class="form-group">
            <label>Artist Name</label>
            <input type="text" id="artist" value="My Brand">
        </div>
        <div class="form-group">
            <label>Song Title</label>
            <input type="text" id="title" placeholder="Auto-fills from filename">
        </div>
        <button id="uploadBtn">Upload & Add Watermark</button>
        <div class="brand-note">Your official watermark will be added automatically.</div>
        <div id="result" class="result"></div>
    </div>

    <script>
        const mp3Input = document.getElementById('mp3File');
        const titleInput = document.getElementById('title');
        
        mp3Input.addEventListener('change', (e) => {
            if (e.target.files[0] && !titleInput.value) {
                titleInput.value = e.target.files[0].name.replace('.mp3', '').replace(/[-_]/g, ' ');
            }
        });

        document.getElementById('uploadBtn').onclick = async () => {
            const btn = document.getElementById('uploadBtn');
            const result = document.getElementById('result');
            const file = mp3Input.files[0];
            if (!file) return alert('Please select a file');

            btn.disabled = true;
            result.style.display = 'none';

            const fd = new FormData();
            fd.append('file', file);
            fd.append('artist', document.getElementById('artist').value);
            fd.append('title', titleInput.value);

            try {
                const res = await fetch('/upload', { method: 'POST', body: fd });
                const data = await res.json();
                if (data.success) {
                    result.className = 'result success';
                    result.innerHTML = '✅ Processed Successfully!<br><br><a href="/download/' + data.filename + '" style="color:#1d753c; font-weight:bold; text-decoration:none;">📥 DOWNLOAD MP3</a>';
                } else {
                    throw new Error(data.error);
                }
            } catch (e) {
                result.className = 'result error';
                result.textContent = 'Error: ' + e.message;
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
    const artist = formData.get('artist') || 'Unknown';
    const title = formData.get('title') || 'Unknown';

    if (!file) throw new Error("No file found");

    const fileBuffer = await file.arrayBuffer();

    // 1. Fetch watermark from R2
    let coverBuffer = null;
    let coverMime = "image/jpeg";
    const watermark = await env.recycle.get('watermark.jpg');
    if (watermark) {
      coverBuffer = await watermark.arrayBuffer();
      coverMime = watermark.httpMetadata?.contentType || "image/jpeg";
    }

    // 2. Add ID3 Tags (MP3 + Metadata + Watermark)
    const tags = { artist, title };
    const taggedMp3 = addID3Tags(fileBuffer, tags, coverBuffer, coverMime);

    // 3. Generate a UUID filename (Professional, no timestamps)
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

async function handleDownload(filename, env) {
  const object = await env.recycle.get(filename);
  if (!object) return new Response('File Expired or Not Found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  headers.set('Access-Control-Allow-Origin', '*');

  return new Response(object.body, { headers });
}

// --- CORE ID3 LOGIC ---

function encodeSynchsafe(size) {
  return [(size >> 21) & 0x7f, (size >> 14) & 0x7f, (size >> 7) & 0x7f, size & 0x7f];
}

function createTextFrame(id, text) {
  const encoded = new TextEncoder().encode(text);
  const size = encoded.length + 1;
  const frame = new Uint8Array(10 + size);
  frame.set([...id].map(c => c.charCodeAt(0)), 0);
  frame[4] = (size >> 24) & 0xFF;
  frame[5] = (size >> 16) & 0xFF;
  frame[6] = (size >> 8) & 0xFF;
  frame[7] = size & 0xFF;
  frame[10] = 0x03; // UTF-8 Encoding
  frame.set(encoded, 11);
  return frame;
}

function createCoverFrame(buffer, mime) {
  const mimeStr = (mime || 'image/jpeg') + '\0';
  const mimeBytes = new TextEncoder().encode(mimeStr);
  const data = new Uint8Array(buffer);
  const size = 1 + mimeBytes.length + 1 + 1 + data.length; // encoding + mime + type + desc + data
  
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
  offset += 2; // skip type and null desc
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
