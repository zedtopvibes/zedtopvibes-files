<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zedtopvibes.Com - Upload (Single User Mode)</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container { max-width: 700px; width: 100%; }
    .card {
      background: rgba(255, 255, 255, 0.98);
      border-radius: 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      padding: 40px;
      animation: slideUp 0.5s ease;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .header { text-align: center; margin-bottom: 30px; }
    h1 {
      font-size: 32px;
      color: #1a202c;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .badge {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      font-size: 14px;
      padding: 4px 12px;
      border-radius: 20px;
    }
    .subtitle { color: #718096; font-size: 16px; }
    
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 20px;
    }
    .form-group.full-width { grid-column: span 2; }
    
    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #4a5568;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .default-value {
      color: #667eea;
      font-weight: normal;
      font-size: 11px;
      margin-left: 8px;
      background: #e6e9ff;
      padding: 2px 8px;
      border-radius: 12px;
    }
    .note {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 12px 16px;
      margin-bottom: 20px;
      border-radius: 8px;
      font-size: 14px;
    }
    input, select {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      font-size: 15px;
      transition: all 0.3s;
      background: white;
    }
    input:focus, select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    input[type="file"] {
      padding: 10px;
      background: #f7fafc;
      border-style: dashed;
    }
    .file-info {
      background: #f7fafc;
      border-radius: 10px;
      padding: 15px;
      margin: 15px 0;
      font-size: 14px;
      border-left: 4px solid #667eea;
    }
    .file-info.success { border-left-color: #38a169; background: #f0fff4; }
    .filename-preview {
      background: #ebf4ff;
      border-radius: 8px;
      padding: 12px 15px;
      margin: 10px 0;
      font-family: monospace;
      font-size: 14px;
      border: 1px dashed #667eea;
    }
    button {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      margin: 20px 0;
    }
    button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
    }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .result {
      background: #f7fafc;
      border-radius: 12px;
      padding: 20px;
      margin-top: 20px;
    }
    .result.success { background: #f0fff4; border: 2px solid #38a169; }
    .url-box {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      margin: 10px 0;
      font-family: monospace;
      word-break: break-all;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      color: rgba(255, 255, 255, 0.9);
    }
    .audio-preview {
      background: #f1f5f9;
      border-radius: 12px;
      padding: 12px 16px;
      margin: 12px 0;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      border: 1px solid #e2e8f0;
    }
    .audio-preview audio {
      flex: 1;
      min-width: 180px;
      height: 40px;
      border-radius: 30px;
    }
    .download-btn-small {
      background: linear-gradient(135deg, #2c7da0 0%, #1f5068 100%);
      padding: 8px 20px;
      border-radius: 40px;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      color: white;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      border: none;
      cursor: pointer;
      width: auto;
      margin: 0;
    }
    .download-btn-small:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .preview-title {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      margin-right: 4px;
    }
    @media (max-width: 640px) {
      .card { padding: 20px; }
      .form-grid { grid-template-columns: 1fr; }
      .form-group.full-width { grid-column: span 1; }
      .audio-preview { flex-direction: column; align-items: stretch; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>
          🎵 Zedtopvibes.Com
          <span class="badge">SINGLE USER MODE</span>
        </h1>
        <div class="subtitle">Custom Filename at Top • Just change Artist & Title</div>
      </div>

      <!-- Note -->
      <div class="note">
        <strong>👋 Hey!</strong> Custom filename is now at the TOP. 
        Only change <strong>Artist</strong> and <strong>Title</strong> - everything else is pre-filled!
      </div>

      <div class="form-grid">
        <!-- 🔴 CUSTOM FILENAME - TOP POSITION -->
        <div class="form-group full-width">
          <label>📛 CUSTOM FILENAME <span class="default-value">optional</span></label>
          <input type="text" id="filename" placeholder="Leave empty for auto: Artist - Title (Site).mp3">
          <small style="color: #718096; font-size: 12px; margin-top: 4px; display: block;">
            Auto-generates as: Artist - Title (Zedtopvibes.Com).mp3
          </small>
        </div>

        <!-- 🔴 MOST IMPORTANT - Change these for every upload -->
        <div class="form-group">
          <label>🎤 ARTIST <span class="default-value">default: Various Artists</span></label>
          <input type="text" id="artist" value="Various Artists">
        </div>

        <div class="form-group">
          <label>📝 TITLE <span class="default-value">default: Untitled Track</span></label>
          <input type="text" id="title" value="Untitled Track">
        </div>

        <!-- 🔵 OPTIONAL - Change if needed -->
        <div class="form-group">
          <label>💿 ALBUM <span class="default-value">default: Zedtopvibes Compilation</span></label>
          <input type="text" id="album" value="Zedtopvibes Compilation">
        </div>

        <div class="form-group">
          <label>📅 YEAR <span class="default-value">default: 2026</span></label>
          <input type="text" id="year" value="2026">
        </div>

        <div class="form-group">
          <label>🎵 GENRE <span class="default-value">default: Music</span></label>
          <select id="genre">
            <option value="Podcast">Podcast</option><option value="Music" selected>Music</option><option value="Hip-Hop">Hip-Hop</option><option value="Rock">Rock</option><option value="Pop">Pop</option><option value="Electronic">Electronic</option><option value="Jazz">Jazz</option><option value="Classical">Classical</option><option value="Audiobook">Audiobook</option><option value="Other">Other</option>
          </select>
        </div>

        <div class="form-group">
          <label>🔢 TRACK <span class="default-value">default: 1</span></label>
          <input type="text" id="track" value="1">
        </div>

        <!-- 🟢 FILENAME PREVIEW - MIDDLE POSITION -->
        <div class="form-group full-width">
          <div id="filenamePreview" class="filename-preview">
            <strong>Preview:</strong> <span id="previewText">Various Artists - Untitled Track (Zedtopvibes.Com).mp3</span>
          </div>
        </div>

        <!-- 🔴 FILE INPUT - BOTTOM -->
        <div class="form-group full-width">
          <label>📁 MP3 FILE <span class="default-value">required</span></label>
          <input type="file" id="file" accept=".mp3,audio/mpeg,audio/mp3">
          <div id="fileInfo" class="file-info" style="display: none;"></div>
        </div>
      </div>

      <button id="uploadBtn" disabled>
        <span>⬆️</span> Upload to Zedtopvibes.Com
      </button>

      <div id="result"></div>
    </div>
    
    <div class="footer">
      <div>✨ Custom Filename at Top • Preview in Middle • Just change Artist & Title</div>
    </div>
  </div>

  <script>
    // Configuration
    const MAX_SIZE = 15 * 1024 * 1024;
    const SITENAME = "Zedtopvibes.Com";
    let audioContext = null;
    let durationMs = 0;
    let currentDownloadUrl = null;
    let currentAudioBlobUrl = null;
    
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      document.addEventListener('click', () => {
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume();
        }
      }, { once: true });
    } catch (e) {}

    // DOM Elements
    const fileInput = document.getElementById('file');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInfo = document.getElementById('fileInfo');
    const artistInput = document.getElementById('artist');
    const titleInput = document.getElementById('title');
    const filenameInput = document.getElementById('filename');
    const previewSpan = document.getElementById('previewText');
    const resultDiv = document.getElementById('result');

    // Update filename preview
    function updateFilenamePreview() {
      const artist = artistInput.value.trim() || 'Various Artists';
      const title = titleInput.value.trim() || 'Untitled Track';
      const custom = filenameInput.value.trim();
      
      let preview;
      if (custom) {
        preview = custom.replace(/[^a-zA-Z0-9\s\-_]/g, ' ').replace(/\s+/g, ' ').trim();
        preview = preview.substring(0, 100);
        preview = `${preview} (${SITENAME}).mp3`;
      } else {
        const cleanArtist = artist.replace(/[^a-zA-Z0-9\s\-_]/g, ' ').replace(/\s+/g, ' ').trim();
        const cleanTitle = title.replace(/[^a-zA-Z0-9\s\-_]/g, ' ').replace(/\s+/g, ' ').trim();
        preview = `${cleanArtist} - ${cleanTitle} (${SITENAME}).mp3`;
      }
      
      previewSpan.textContent = preview;
    }

    artistInput.addEventListener('input', updateFilenamePreview);
    titleInput.addEventListener('input', updateFilenamePreview);
    filenameInput.addEventListener('input', updateFilenamePreview);

    // File input handler
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      
      if (!file) {
        fileInfo.style.display = 'none';
        uploadBtn.disabled = true;
        if (currentAudioBlobUrl) {
          URL.revokeObjectURL(currentAudioBlobUrl);
          currentAudioBlobUrl = null;
        }
        return;
      }

      if (!file.name.toLowerCase().endsWith('.mp3')) {
        fileInfo.innerHTML = '❌ Must be MP3';
        fileInfo.style.display = 'block';
        uploadBtn.disabled = true;
        return;
      }

      if (file.size > MAX_SIZE) {
        fileInfo.innerHTML = `❌ Too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max 15MB)`;
        fileInfo.style.display = 'block';
        uploadBtn.disabled = true;
        return;
      }

      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      let durationText = '';
      if (audioContext) {
        try {
          const buffer = await file.arrayBuffer();
          const decoded = await audioContext.decodeAudioData(buffer.slice(0));
          durationMs = Math.floor(decoded.duration * 1000);
          const mins = Math.floor(decoded.duration / 60);
          const secs = Math.floor(decoded.duration % 60);
          durationText = `<br>⏱️ ${mins}:${secs.toString().padStart(2, '0')}`;
        } catch (err) {
          console.warn("duration detect fail");
        }
      }
      fileInfo.innerHTML = `✅ ${file.name} - ${sizeMB}MB${durationText}`;
      fileInfo.className = 'file-info success';
      fileInfo.style.display = 'block';
      uploadBtn.disabled = false;

      // 🔥 Create temporary audio preview for selected file BEFORE upload
      if (currentAudioBlobUrl) {
        URL.revokeObjectURL(currentAudioBlobUrl);
        currentAudioBlobUrl = null;
      }
      const tempUrl = URL.createObjectURL(file);
      currentAudioBlobUrl = tempUrl;
      
      // Show inline preview player + download button for local file (optional but intuitive)
      // We'll embed into result area without disturbing upload flow
      const tempPlayerHtml = `
        <div class="audio-preview" id="tempPreviewCard">
          <span class="preview-title">🎧 Selected preview:</span>
          <audio controls src="${tempUrl}" preload="metadata"></audio>
          <button class="download-btn-small" id="tempDownloadBtn">⬇️ Download (original)</button>
        </div>
      `;
      // Insert temporary preview just above upload button but not conflicting final result
      const existingTemp = document.getElementById('tempPreviewCard');
      if (existingTemp) existingTemp.remove();
      uploadBtn.insertAdjacentHTML('beforebegin', tempPlayerHtml);
      const tempDownload = document.getElementById('tempDownloadBtn');
      if (tempDownload) {
        tempDownload.onclick = (e) => {
          e.preventDefault();
          const a = document.createElement('a');
          a.href = tempUrl;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        };
      }
    });

    // Upload handler with extended UI: after upload -> show permanent audio player + direct download
    document.getElementById('uploadBtn').addEventListener('click', async () => {
      const file = fileInput.files[0];
      if (!file) return alert('Select MP3 file');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('customFilename', filenameInput.value.trim());
      formData.append('artist', artistInput.value.trim());
      formData.append('title', titleInput.value.trim());
      formData.append('album', document.getElementById('album').value.trim());
      formData.append('year', document.getElementById('year').value.trim());
      formData.append('genre', document.getElementById('genre').value);
      formData.append('track', document.getElementById('track').value.trim());
      formData.append('duration', durationMs);

      const btn = document.getElementById('uploadBtn');
      const originalText = btn.innerHTML;
      btn.innerHTML = '⏳ Uploading...';
      btn.disabled = true;

      try {
        const response = await fetch('/upload', { method: 'POST', body: formData });
        const data = await response.json();

        if (data.success) {
          const fullUrl = window.location.origin + data.url;
          const downloadEndpoint = fullUrl;
          
          // Store final download URL for later use
          currentDownloadUrl = downloadEndpoint;
          
          // Build permanent player + direct download button (preserve design)
          const playerHtml = `
            <div class="result success" style="margin-top: 16px;">
              <div style="font-weight:bold; margin-bottom:12px;">✅ Upload complete!</div>
              <div class="audio-preview" style="background:#ffffff; border:1px solid #cbd5e1;">
                <span class="preview-title">🎵 ${data.metadata?.title || 'Track'}</span>
                <audio controls src="${downloadEndpoint}" preload="metadata" style="flex:1"></audio>
                <a href="${downloadEndpoint}" download="${encodeURIComponent(data.filename)}" class="download-btn-small" style="text-decoration:none; display:inline-flex;">
                  ⬇️ Direct Download
                </a>
              </div>
              <div class="url-box" style="margin-top:12px;">
                🔗 Share link: <strong>${fullUrl}</strong>
                <button onclick="navigator.clipboard.writeText('${fullUrl}')" style="margin-top:8px; padding:8px 16px; font-size:13px; width:auto; background:#4a5568;">📋 Copy URL</button>
              </div>
            </div>
          `;
          
          resultDiv.innerHTML = playerHtml;
          
          // Also remove any leftover temporary preview card to keep UI clean
          const tempCard = document.getElementById('tempPreviewCard');
          if (tempCard) tempCard.remove();
          
          // Optional: revoke temporary blob URL after upload
          if (currentAudioBlobUrl) {
            URL.revokeObjectURL(currentAudioBlobUrl);
            currentAudioBlobUrl = null;
          }
          
          // Reset file info and preview to reflect new uploaded state? Not required, but nice.
          fileInfo.style.display = 'none';
          fileInput.value = '';
          uploadBtn.disabled = true;
          
        } else {
          throw new Error(data.error);
        }
      } catch (err) {
        resultDiv.innerHTML = `<div class="result" style="background:#fee2e2; border:2px solid #ef4444;">❌ Upload failed: ${err.message}</div>`;
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    });

    // Copy to clipboard function (global)
    window.copyToClipboard = (text) => {
      navigator.clipboard.writeText(text).then(
        () => alert('✅ Copied!'),
        () => alert('Press Ctrl+C to copy')
      );
    };
    
    // Demo loader
    if (window.location.search.includes('demo')) {
      artistInput.value = 'Yo Maps';
      titleInput.value = 'Komando';
      document.getElementById('album').value = 'Komando Album';
      document.getElementById('year').value = '2024';
      document.getElementById('track').value = '1';
      document.getElementById('genre').value = 'Music';
      updateFilenamePreview();
    }
    
    // Extra cleanup on page unload to avoid memory leaks
    window.addEventListener('beforeunload', () => {
      if (currentAudioBlobUrl) URL.revokeObjectURL(currentAudioBlobUrl);
    });
  </script>
</body>
</html>