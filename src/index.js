export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- 1. ROUTE: DOWNLOAD (Serves the actual MP3) ---
    if (url.pathname.startsWith('/download/')) {
      const filename = url.pathname.split('/').pop();
      const object = await env.recycle.get(filename);
      
      if (!object) return new Response('File Not Found', { status: 404 });

      const headers = new Headers();
      headers.set('Content-Type', 'audio/mpeg');
      headers.set('Content-Length', object.size);
      headers.set('Accept-Ranges', 'bytes');
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
      headers.set('Access-Control-Allow-Origin', '*');

      return new Response(object.body, { headers });
    }

    // --- 2. ROUTE: UPLOAD (The API endpoint) ---
    if (request.method === 'POST' && url.pathname === '/upload') {
      try {
        const formData = await request.formData();
        const file = formData.get('file');
        const artist = formData.get('artist') || 'Admin';
        const title = formData.get('title') || 'New Track';
        const duration = formData.get('duration') || ''; 

        const fileBuffer = await file.arrayBuffer();
        const watermark = await env.recycle.get('watermark.jpg');
        const coverBuffer = watermark ? await watermark.arrayBuffer() : null;

        const taggedMp3 = addID3Tags(fileBuffer, { artist, title, duration }, coverBuffer);

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

    // --- 3. ROUTE: FRONTEND (The UI) ---
    return new Response(getHTML(url.origin), {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  }
};

/**
 * THE UI (HTML & JS)
 */
function getHTML(origin) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>MP3 Admin Panel</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; max-width: 450px; margin: 2rem auto; padding: 1rem; background: #f8f9fa; color: #333; }
      .card { background: white; padding: 2rem; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
      h2 { margin-top: 0; color: #007bff; text-align: center; }
      input, button { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; font-size: 1rem; }
      button { background: #007bff; color: white; border: none; font-weight: bold; cursor: pointer; transition: background 0.2s; }
      button:hover { background: #0056b3; }
      button:disabled { background: #ccc; cursor: not-allowed; }
      #status { margin-top: 1.5rem; padding: 1rem; border-radius: 8px; font-size: 0.9rem; text-align: center; display: none; }
      .success-box { background: #e7f3ff; border: 1px solid #b3d7ff; color: #004085; display: block !important; }
      .link-btn { display: inline-block; margin-top: 10px; color: #007bff; text-decoration: none; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="card">
      <h2>🎵 MP3 Uploader</h2>
      <label>Select MP3</label>
      <input type="file" id="f" accept="audio/mpeg">
      <input type="text" id="t" placeholder="Song Title">
      <input type="text" id="a" placeholder="Artist Name">
      <button id="btn">Upload & Watermark</button>
      <div id="status"></div>
    </div>

    <script>
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      let ms = 0;

      document.getElementById('f').onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const status = document.getElementById('status');
        status.style.display = 'block';
        status.innerText = "Analyzing duration...";
        
        try {
          const buf = await file.arrayBuffer();
          const decoded = await ctx.decodeAudioData(buf);
          ms = Math.floor(decoded.duration * 1000);
          status.innerText = "Duration: " + Math.floor(decoded.duration) + "s (Ready)";
        } catch(e) {
          status.innerText = "Could not read duration.";
        }
      };

      document.getElementById('btn').onclick = async () => {
        const file = document.getElementById('f').files[0];
        if (!file) return alert("Please select a file.");
        
        const btn = document.getElementById('btn');
        const status = document.getElementById('status');
        
        btn.disabled = true;
        status.style.display = 'block';
        status.innerText = "Uploading to R2...";

        const fd = new FormData();
        fd.append('file', file);
        fd.append('title', document.getElementById('t').value);
        fd.append('artist', document.getElementById('a').value);
        fd.append('duration', ms);

        try {
          const res = await fetch('/upload', { method: 'POST', body: fd });
          const data = await res.json();
          
          if (data.success) {
            status.className = 'success-box';
            const dlLink = \`\${window.location.origin}/download/\${data.filename}\`;
            status.innerHTML = \`
              <b>✅ Upload Complete!</b><br>
              <a href="\${dlLink}" class="link-btn" target="_blank">Download Tagged File</a><br>
              <small style="word-break: break-all;">\${dlLink}</small>
            \`;
          } else {
            throw new Error();
          }
        } catch (e) {
          status.innerText = "Upload failed. Check your R2 binding.";
          btn.disabled = false;
        }
      };
    </script>
  </body>
  </html>`;
}

/**
 * BINARY HELPERS
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
    frame[4] = (size >> 24) & 0xFF; frame[5] = (size >> 16) & 0xFF;
    frame[6] = (size >> 8) & 0xFF; frame[7] = size & 0xFF;
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
  for (const f of frames) {
    final.set(f, offset);
    offset += f.length;
  }
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
