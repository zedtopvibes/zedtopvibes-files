// src/index.js - Complete solution with embedded form, upload progress, and direct download

// ==================== HTML FORM TEMPLATE ====================
const UPLOAD_FORM_HTML = `<!DOCTYPE html>
<html>
<head>
    <title>MP3 Upload with Album Art</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            padding: 20px;
            max-width: 900px;
            margin: 0 auto;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 { 
            color: #333; 
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .subtitle {
            color: #718096;
            margin-bottom: 30px;
        }
        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge-blue {
            background: #bee3f8;
            color: #2c5282;
        }
        .badge-green {
            background: #c6f6d5;
            color: #276749;
        }
        .badge-purple {
            background: #e9d8fd;
            color: #553c9a;
        }
        .form-row {
            display: flex;
            gap: 30px;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
            flex: 1;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #555;
        }
        input[type="text"], 
        input[type="file"],
        select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.3s;
            background: #f7fafc;
        }
        input[type="text"]:focus,
        input[type="file"]:focus,
        select:focus {
            outline: none;
            border-color: #667eea;
            background: white;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .cover-section {
            flex: 1;
            text-align: center;
        }
        .cover-preview {
            width: 200px;
            height: 200px;
            border: 2px dashed #cbd5e0;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 15px;
            background-size: cover;
            background-position: center;
            background-color: #f7fafc;
            overflow: hidden;
            transition: all 0.3s;
        }
        .cover-preview.has-image {
            border: 2px solid #48bb78;
            box-shadow: 0 4px 12px rgba(72, 187, 120, 0.2);
        }
        .cover-preview img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .cover-preview svg {
            width: 100%;
            height: 100%;
        }
        .cover-actions {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 10px;
            flex-wrap: wrap;
        }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        }
        .btn-primary {
            background: #667eea;
            color: white;
        }
        .btn-primary:hover {
            background: #5a67d8;
            transform: translateY(-1px);
        }
        .btn-success {
            background: #48bb78;
            color: white;
        }
        .btn-success:hover {
            background: #38a169;
            transform: translateY(-1px);
        }
        .btn-danger {
            background: #f56565;
            color: white;
        }
        .btn-danger:hover {
            background: #e53e3e;
            transform: translateY(-1px);
        }
        .btn-download {
            background: #9f7aea;
            color: white;
            text-decoration: none;
            display: inline-block;
        }
        .btn-download:hover {
            background: #805ad5;
        }
        .default-images-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin: 15px 0;
            padding: 15px;
            background: #f7fafc;
            border-radius: 8px;
        }
        .default-image-item {
            cursor: pointer;
            border: 2px solid transparent;
            border-radius: 6px;
            padding: 5px;
            transition: all 0.2s;
            text-align: center;
        }
        .default-image-item:hover {
            border-color: #667eea;
            background: #edf2f7;
        }
        .default-image-item.selected {
            border-color: #48bb78;
            background: #f0fff4;
        }
        .default-image-item img {
            width: 100%;
            height: 60px;
            object-fit: cover;
            border-radius: 4px;
            margin-bottom: 5px;
        }
        .default-image-item span {
            font-size: 11px;
            color: #4a5568;
        }
        .upload-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            font-size: 16px;
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
            width: 100%;
            transition: all 0.3s;
            margin-top: 10px;
        }
        .upload-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
        }
        .upload-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .progress-container {
            margin-top: 20px;
            display: none;
        }
        .progress-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 14px;
            color: #4a5568;
        }
        .progress-bar-container {
            width: 100%;
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
        }
        .progress-bar {
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            width: 0%;
            transition: width 0.3s;
        }
        .result {
            margin-top: 30px;
            padding: 20px;
            border-radius: 8px;
            display: none;
        }
        .success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .download-section {
            margin-top: 20px;
            padding: 15px;
            background: #ebf8ff;
            border-radius: 8px;
            display: flex;
            gap: 15px;
            align-items: center;
            flex-wrap: wrap;
        }
        .download-section a {
            color: #2b6cb0;
            text-decoration: none;
            font-weight: 600;
        }
        .download-section a:hover {
            text-decoration: underline;
        }
        .metadata-display {
            background: #2d3748;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            overflow-x: auto;
            margin-top: 15px;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 10px;
        }
        .status-processing {
            background: #fefcbf;
            color: #975a16;
        }
        .status-complete {
            background: #c6f6d5;
            color: #22543d;
        }
        .files-list {
            margin-top: 30px;
            border-top: 2px solid #e2e8f0;
            padding-top: 20px;
        }
        .files-list h3 {
            color: #4a5568;
            margin-bottom: 15px;
        }
        .file-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: #f7fafc;
            border-radius: 6px;
            margin-bottom: 8px;
            transition: background 0.2s;
        }
        .file-item:hover {
            background: #edf2f7;
        }
        .file-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .file-icon {
            font-size: 20px;
        }
        .file-name {
            font-weight: 500;
            color: #2d3748;
        }
        .file-meta {
            font-size: 12px;
            color: #718096;
        }
        .file-actions {
            display: flex;
            gap: 10px;
        }
        .file-actions a, .file-actions button {
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            text-decoration: none;
            border: none;
            cursor: pointer;
        }
        .download-link {
            background: #9f7aea;
            color: white;
        }
        .delete-btn {
            background: #f56565;
            color: white;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>
            🎵 MP3 Uploader with Album Art
            <span class="badge badge-purple">v2.0</span>
        </h1>
        <p class="subtitle">Upload MP3 files with automatic ID3 tags and album art</p>
        
        <div id="uploadForm">
            <div class="form-row">
                <div class="form-group" style="flex: 2;">
                    <label>🎵 MP3 File:</label>
                    <input type="file" id="mp3File" accept=".mp3" required>
                    
                    <div style="margin-top: 20px;">
                        <label>🖼️ Upload Custom Cover (optional):</label>
                        <input type="file" id="coverFile" accept=".jpg,.jpeg,.png,.gif">
                    </div>
                    
                    <div style="margin-top: 20px;">
                        <label>🎨 Test with Default Images:</label>
                        <div class="default-images-grid" id="defaultImagesGrid"></div>
                    </div>
                </div>
                
                <div class="cover-section">
                    <label>Cover Preview:</label>
                    <div class="cover-preview" id="coverPreview">
                        <svg width="200" height="200" viewBox="0 0 200 200">
                            <rect width="200" height="200" fill="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"/>
                            <text x="100" y="100" font-family="Arial" font-size="14" fill="white" text-anchor="middle">Drop cover here</text>
                            <text x="100" y="130" font-family="Arial" font-size="10" fill="white" text-anchor="middle">or click default images</text>
                        </svg>
                    </div>
                    
                    <div class="cover-actions">
                        <button type="button" class="btn btn-success" id="randomDefaultBtn">🎲 Random</button>
                        <button type="button" class="btn btn-danger" id="clearCoverBtn">🗑️ Clear</button>
                    </div>
                    
                    <div style="margin-top: 10px; font-size: 12px; color: #718096;" id="coverSource"></div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Title:</label>
                    <input type="text" id="title" placeholder="Auto from filename">
                </div>
                <div class="form-group">
                    <label>Artist:</label>
                    <input type="text" id="artist" value="Unknown Artist">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Album:</label>
                    <input type="text" id="album" value="Unknown Album">
                </div>
                <div class="form-group">
                    <label>Year:</label>
                    <input type="text" id="year" value="2024">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Genre:</label>
                    <input type="text" id="genre" value="Unknown">
                </div>
                <div class="form-group">
                    <label>Track #:</label>
                    <input type="text" id="track" value="1">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Composer:</label>
                    <input type="text" id="composer">
                </div>
                <div class="form-group">
                    <label>Publisher:</label>
                    <input type="text" id="publisher">
                </div>
            </div>
            
            <div class="form-group">
                <label>Comment:</label>
                <input type="text" id="comment">
            </div>
            
            <button class="upload-btn" id="submitBtn">⬆️ Upload & Process MP3</button>
            
            <div class="progress-container" id="progressContainer">
                <div class="progress-info">
                    <span id="progressStatus">Preparing upload...</span>
                    <span id="progressPercentage">0%</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" id="progressBar"></div>
                </div>
            </div>
        </div>
        
        <div class="result" id="result"></div>
        
        <div class="files-list" id="filesList">
            <h3>📁 Recent Uploads</h3>
            <div id="filesListContent">Loading...</div>
        </div>
    </div>

    <script>
        // Sample default images
        const defaultImages = [
            { name: "Vinyl", url: "https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=150&h=150&fit=crop" },
            { name: "Cassette", url: "https://images.unsplash.com/photo-1589674781759-c21c37956a44?w=150&h=150&fit=crop" },
            { name: "Concert", url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=150&h=150&fit=crop" },
            { name: "Studio", url: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=150&h=150&fit=crop" },
            { name: "Headphones", url: "https://images.unsplash.com/photo-1487215078519-e21cc028cb29?w=150&h=150&fit=crop" },
            { name: "Notes", url: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=150&h=150&fit=crop" }
        ];

        // Load default images
        function loadDefaultImages() {
            const grid = document.getElementById('defaultImagesGrid');
            grid.innerHTML = '';
            defaultImages.forEach((img, i) => {
                const div = document.createElement('div');
                div.className = 'default-image-item';
                div.innerHTML = \`<img src="\${img.url}" alt="\${img.name}"><span>\${img.name}</span>\`;
                div.onclick = () => selectDefaultImage(img.url, img.name);
                grid.appendChild(div);
            });
        }

        // Select default image
        async function selectDefaultImage(url, name) {
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                const file = new File([blob], \`default-\${name}.jpg\`, { type: 'image/jpeg' });
                
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                document.getElementById('coverFile').files = dataTransfer.files;
                
                updatePreview(url, 'default');
                document.getElementById('coverSource').innerHTML = \`<span class="badge badge-green">Using: \${name}</span>\`;
                
                document.querySelectorAll('.default-image-item').forEach(el => el.classList.remove('selected'));
                event.currentTarget.classList.add('selected');
            } catch (error) {
                console.error('Failed to load default image:', error);
            }
        }

        // Update preview
        function updatePreview(url, type) {
            const preview = document.getElementById('coverPreview');
            preview.innerHTML = \`<img src="\${url}" alt="Cover">\`;
            preview.classList.add('has-image');
        }

        // Random default
        function selectRandomDefault() {
            const random = Math.floor(Math.random() * defaultImages.length);
            selectDefaultImage(defaultImages[random].url, defaultImages[random].name);
        }

        // Clear cover
        function clearCover() {
            document.getElementById('coverFile').value = '';
            document.getElementById('coverPreview').innerHTML = \`
                <svg width="200" height="200" viewBox="0 0 200 200">
                    <rect width="200" height="200" fill="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"/>
                    <text x="100" y="100" font-family="Arial" font-size="14" fill="white" text-anchor="middle">No Cover</text>
                </svg>
            \`;
            document.getElementById('coverPreview').classList.remove('has-image');
            document.getElementById('coverSource').innerHTML = '';
        }

        // Upload with progress
        async function uploadFile() {
            const mp3File = document.getElementById('mp3File').files[0];
            if (!mp3File) {
                alert('Please select an MP3 file');
                return;
            }

            const formData = new FormData();
            formData.append('file', mp3File);
            
            if (document.getElementById('coverFile').files[0]) {
                formData.append('cover', document.getElementById('coverFile').files[0]);
            }
            
            formData.append('title', document.getElementById('title').value);
            formData.append('artist', document.getElementById('artist').value);
            formData.append('album', document.getElementById('album').value);
            formData.append('year', document.getElementById('year').value);
            formData.append('genre', document.getElementById('genre').value);
            formData.append('track', document.getElementById('track').value);
            formData.append('composer', document.getElementById('composer').value);
            formData.append('publisher', document.getElementById('publisher').value);
            formData.append('comment', document.getElementById('comment').value);

            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    document.getElementById('progressContainer').style.display = 'block';
                    document.getElementById('progressBar').style.width = percent + '%';
                    document.getElementById('progressPercentage').textContent = percent + '%';
                    
                    if (percent < 30) {
                        document.getElementById('progressStatus').textContent = '📤 Uploading...';
                    } else if (percent < 70) {
                        document.getElementById('progressStatus').textContent = '⚙️ Processing MP3 tags...';
                    } else {
                        document.getElementById('progressStatus').textContent = '💾 Saving to R2...';
                    }
                }
            });

            xhr.addEventListener('load', () => {
                document.getElementById('progressBar').style.width = '100%';
                document.getElementById('progressStatus').textContent = '✅ Complete!';
                
                setTimeout(() => {
                    document.getElementById('progressContainer').style.display = 'none';
                    document.getElementById('progressBar').style.width = '0%';
                }, 1000);
                
                const result = JSON.parse(xhr.responseText);
                showResult(result, xhr.status === 200);
                loadFiles(); // Refresh file list
            });

            xhr.addEventListener('error', () => {
                showResult({ error: 'Upload failed' }, false);
                document.getElementById('progressContainer').style.display = 'none';
            });

            xhr.open('POST', '/upload', true);
            xhr.send(formData);
        }

        // Show result with download link
        function showResult(data, isSuccess) {
            const resultDiv = document.getElementById('result');
            resultDiv.style.display = 'block';
            resultDiv.className = 'result ' + (isSuccess ? 'success' : 'error');
            
            if (isSuccess) {
                resultDiv.innerHTML = \`
                    <h3>✅ Upload Successful!</h3>
                    <div class="download-section">
                        <span>⬇️ Direct Download:</span>
                        <a href="/download/\${data.filename}" class="btn btn-download" download>📥 \${data.filename}</a>
                        <span class="badge badge-blue">\${(data.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <div class="metadata-display">
                        <strong>ID3 Tags Added:</strong>
                        <pre>\${JSON.stringify(data.metadata, null, 2)}</pre>
                    </div>
                \`;
            } else {
                resultDiv.innerHTML = \`<h3>❌ Error</h3><p>\${data.error || 'Upload failed'}</p>\`;
            }
            
            // Scroll to result
            resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Load recent files
        async function loadFiles() {
            try {
                const response = await fetch('/files');
                const files = await response.json();
                
                const content = document.getElementById('filesListContent');
                if (files.length === 0) {
                    content.innerHTML = '<p style="color: #718096;">No files uploaded yet</p>';
                    return;
                }
                
                content.innerHTML = files.map(file => \`
                    <div class="file-item">
                        <div class="file-info">
                            <span class="file-icon">🎵</span>
                            <div>
                                <div class="file-name">\${file.name}</div>
                                <div class="file-meta">\${(file.size / 1024 / 1024).toFixed(2)} MB • Uploaded \${new Date(file.uploaded).toLocaleString()}</div>
                            </div>
                        </div>
                        <div class="file-actions">
                            <a href="/download/\${file.name}" class="download-link" download>📥 Download</a>
                            <button class="delete-btn" onclick="deleteFile('\${file.name}')">🗑️</button>
                        </div>
                    </div>
                \").join('');
            } catch (error) {
                document.getElementById('filesListContent').innerHTML = '<p style="color: #f56565;">Failed to load files</p>';
            }
        }

        // Delete file
        async function deleteFile(filename) {
            if (!confirm(\`Delete \${filename}?\`)) return;
            
            try {
                const response = await fetch(\`/delete/\${filename}\`, { method: 'DELETE' });
                if (response.ok) {
                    loadFiles();
                }
            } catch (error) {
                alert('Delete failed');
            }
        }

        // Event listeners
        document.getElementById('mp3File').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && !document.getElementById('title').value) {
                document.getElementById('title').value = file.name.replace('.mp3', '').replace(/[_-]/g, ' ');
            }
        });

        document.getElementById('coverFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => updatePreview(e.target.result, 'custom');
                reader.readAsDataURL(file);
                document.getElementById('coverSource').innerHTML = \`<span class="badge badge-green">Using: Custom</span>\`;
            }
        });

        document.getElementById('submitBtn').addEventListener('click', uploadFile);
        document.getElementById('randomDefaultBtn').addEventListener('click', selectRandomDefault);
        document.getElementById('clearCoverBtn').addEventListener('click', clearCover);

        // Initialize
        loadDefaultImages();
        loadFiles();
        
        // Refresh file list every 30 seconds
        setInterval(loadFiles, 30000);
    </script>
</body>
</html>`;

// ==================== WORKER MAIN CODE ====================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Serve the upload form
    if (path === '/' || path === '/upload-form') {
      return new Response(UPLOAD_FORM_HTML, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Handle file upload
    if (path === '/upload' && request.method === 'POST') {
      return handleUpload(request, env);
    }

    // Download file
    if (path.startsWith('/download/')) {
      const filename = path.replace('/download/', '');
      return handleDownload(filename, env);
    }

    // List files
    if (path === '/files' && request.method === 'GET') {
      return handleListFiles(env);
    }

    // Delete file
    if (path.startsWith('/delete/') && request.method === 'DELETE') {
      const filename = path.replace('/delete/', '');
      return handleDelete(filename, env);
    }

    // Redirect to form
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/' }
    });
  }
};

// ==================== UPLOAD HANDLER ====================
async function handleUpload(request, env) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const coverFile = formData.get('cover');
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!file.name.toLowerCase().endsWith('.mp3')) {
      return new Response(JSON.stringify({ error: 'Only MP3 files are supported' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Process cover if provided
    let coverBuffer = null;
    let coverMime = null;
    if (coverFile && coverFile.size > 0) {
      coverBuffer = await coverFile.arrayBuffer();
      coverMime = coverFile.type;
    }

    // Get metadata
    const metadata = {
      title: formData.get('title') || file.name.replace('.mp3', '').replace(/[_-]/g, ' '),
      artist: formData.get('artist') || 'Unknown Artist',
      album: formData.get('album') || 'Unknown Album',
      year: formData.get('year') || new Date().getFullYear().toString(),
      genre: formData.get('genre') || 'Unknown',
      track: formData.get('track') || '1',
      composer: formData.get('composer') || '',
      publisher: formData.get('publisher') || '',
      comment: formData.get('comment') || ''
    };

    // Process MP3 with ID3 tags
    const fileBuffer = await file.arrayBuffer();
    const processedBuffer = addID3Tags(fileBuffer, metadata, coverBuffer, coverMime);

    // Generate clean filename
    const cleanFilename = generateCleanFilename(metadata, file.name);

    // Store in R2
    await env.recycle.put(cleanFilename, processedBuffer, {
      httpMetadata: {
        contentType: 'audio/mpeg',
        contentDisposition: `attachment; filename="${cleanFilename}"`
      },
      customMetadata: {
        ...metadata,
        hasCover: coverBuffer ? 'true' : 'false',
        uploadedAt: new Date().toISOString(),
        size: file.size.toString()
      }
    });

    // Store cover separately if provided
    if (coverBuffer) {
      const coverKey = `covers/${cleanFilename.replace('.mp3', '.jpg')}`;
      await env.recycle.put(coverKey, coverBuffer, {
        httpMetadata: { contentType: coverMime }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      filename: cleanFilename,
      metadata: metadata,
      hasCover: !!coverBuffer,
      size: file.size,
      url: `/download/${cleanFilename}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ==================== DOWNLOAD HANDLER ====================
async function handleDownload(filename, env) {
  try {
    const object = await env.recycle.get(filename);
    
    if (!object) {
      return new Response('File not found', { status: 404 });
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    return new Response('Download failed', { status: 500 });
  }
}

// ==================== LIST FILES HANDLER ====================
async function handleListFiles(env) {
  try {
    const objects = await env.recycle.list();
    
    const files = await Promise.all(
      objects.objects
        .filter(obj => obj.key.endsWith('.mp3'))
        .slice(0, 20) // Last 20 files
        .map(async obj => {
          const metadata = obj.customMetadata || {};
          return {
            name: obj.key,
            size: parseInt(metadata.size || obj.size),
            uploaded: metadata.uploadedAt || obj.uploaded,
            title: metadata.title || obj.key.replace('.mp3', ''),
            artist: metadata.artist || 'Unknown'
          };
        })
    );

    return new Response(JSON.stringify(files), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ==================== DELETE HANDLER ====================
async function handleDelete(filename, env) {
  try {
    await env.recycle.delete(filename);
    
    // Also delete cover if exists
    try {
      await env.recycle.delete(`covers/${filename.replace('.mp3', '.jpg')}`);
    } catch (e) {
      // Ignore if cover doesn't exist
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Delete failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ==================== ID3 TAG GENERATION ====================
function addID3Tags(audioBuffer, metadata, coverBuffer, coverMime) {
  const audioBytes = new Uint8Array(audioBuffer);
  
  // Check for existing ID3 tags
  const hasExistingID3 = audioBytes.length > 10 && 
                         audioBytes[0] === 0x49 && 
                         audioBytes[1] === 0x44 && 
                         audioBytes[2] === 0x33;
  
  let id3Size = 0;
  if (hasExistingID3) {
    id3Size = ((audioBytes[6] & 0x7F) << 21) |
              ((audioBytes[7] & 0x7F) << 14) |
              ((audioBytes[8] & 0x7F) << 7) |
              (audioBytes[9] & 0x7F);
    id3Size += 10;
  }
  
  // Create new ID3 tags
  const id3Tags = createID3v23Tags(metadata, coverBuffer, coverMime);
  
  // Remove existing tags and prepend new ones
  const audioData = hasExistingID3 ? audioBytes.slice(id3Size) : audioBytes;
  
  // Combine
  const finalBuffer = new Uint8Array(id3Tags.length + audioData.length);
  finalBuffer.set(id3Tags, 0);
  finalBuffer.set(audioData, id3Tags.length);
  
  return finalBuffer.buffer;
}

function createID3v23Tags(metadata, coverBuffer, coverMime) {
  const header = new Uint8Array(10);
  
  header[0] = 0x49; // I
  header[1] = 0x44; // D
  header[2] = 0x33; // 3
  header[3] = 0x03; // Version 2.3.0
  header[4] = 0x00;
  header[5] = 0x00; // Flags
  
  const frames = [];
  
  // Add text frames
  if (metadata.title) frames.push(createTextFrame('TIT2', metadata.title));
  if (metadata.artist) frames.push(createTextFrame('TPE1', metadata.artist));
  if (metadata.album) frames.push(createTextFrame('TALB', metadata.album));
  if (metadata.year) frames.push(createTextFrame('TYER', metadata.year));
  if (metadata.genre) frames.push(createTextFrame('TCON', metadata.genre));
  if (metadata.track) frames.push(createTextFrame('TRCK', metadata.track));
  if (metadata.composer) frames.push(createTextFrame('TCOM', metadata.composer));
  if (metadata.publisher) frames.push(createTextFrame('TPUB', metadata.publisher));
  if (metadata.comment) frames.push(createCommentFrame(metadata.comment));
  
  // Add cover if provided
  if (coverBuffer) {
    frames.push(createCoverFrame(coverBuffer, coverMime || 'image/jpeg'));
  } else {
    // Add default cover
    frames.push(createDefaultCoverFrame());
  }
  
  // Calculate total size
  let framesSize = 0;
  for (const frame of frames) {
    framesSize += frame.length;
  }
  
  // Set size in header (synchsafe)
  const size = framesSize;
  header[6] = (size >> 21) & 0x7F;
  header[7] = (size >> 14) & 0x7F;
  header[8] = (size >> 7) & 0x7F;
  header[9] = size & 0x7F;
  
  // Combine
  const id3Tag = new Uint8Array(10 + framesSize);
  id3Tag.set(header, 0);
  
  let offset = 10;
  for (const frame of frames) {
    id3Tag.set(frame, offset);
    offset += frame.length;
  }
  
  return id3Tag;
}

function createTextFrame(frameId, text) {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text + '\0');
  
  const frameSize = 10 + 1 + textBytes.length;
  const frame = new Uint8Array(frameSize);
  
  // Frame ID
  frame[0] = frameId.charCodeAt(0);
  frame[1] = frameId.charCodeAt(1);
  frame[2] = frameId.charCodeAt(2);
  frame[3] = frameId.charCodeAt(3);
  
  // Size
  const dataSize = 1 + textBytes.length;
  frame[4] = (dataSize >> 24) & 0xFF;
  frame[5] = (dataSize >> 16) & 0xFF;
  frame[6] = (dataSize >> 8) & 0xFF;
  frame[7] = dataSize & 0xFF;
  
  // Flags
  frame[8] = 0x00;
  frame[9] = 0x00;
  
  // Encoding (UTF-8)
  frame[10] = 0x03;
  
  // Text
  frame.set(textBytes, 11);
  
  return frame;
}

function createCommentFrame(comment) {
  const encoder = new TextEncoder();
  const language = 'eng\0';
  const description = '\0';
  
  const langBytes = encoder.encode(language);
  const descBytes = encoder.encode(description);
  const textBytes = encoder.encode(comment + '\0');
  
  const frameSize = 10 + 1 + langBytes.length + descBytes.length + textBytes.length;
  const frame = new Uint8Array(frameSize);
  
  frame[0] = 0x43; // C
  frame[1] = 0x4F; // O
  frame[2] = 0x4D; // M
  frame[3] = 0x4D; // M
  
  const dataSize = frameSize - 10;
  frame[4] = (dataSize >> 24) & 0xFF;
  frame[5] = (dataSize >> 16) & 0xFF;
  frame[6] = (dataSize >> 8) & 0xFF;
  frame[7] = dataSize & 0xFF;
  
  frame[8] = 0x00;
  frame[9] = 0x00;
  frame[10] = 0x03; // Encoding
  
  let offset = 11;
  frame.set(langBytes, offset);
  offset += langBytes.length;
  frame.set(descBytes, offset);
  offset += descBytes.length;
  frame.set(textBytes, offset);
  
  return frame;
}

function createCoverFrame(coverBuffer, coverMime) {
  const coverBytes = new Uint8Array(coverBuffer);
  
  let mimeString;
  if (coverMime.includes('png')) mimeString = 'image/png\0';
  else if (coverMime.includes('gif')) mimeString = 'image/gif\0';
  else mimeString = 'image/jpeg\0';
  
  const mimeBytes = new TextEncoder().encode(mimeString);
  const description = 'Cover Art\0';
  const descBytes = new TextEncoder().encode(description);
  
  const frameSize = 10 + 1 + mimeBytes.length + 1 + descBytes.length + coverBytes.length;
  const frame = new Uint8Array(frameSize);
  
  frame[0] = 0x41; // A
  frame[1] = 0x50; // P
  frame[2] = 0x49; // I
  frame[3] = 0x43; // C
  
  const dataSize = frameSize - 10;
  frame[4] = (dataSize >> 24) & 0xFF;
  frame[5] = (dataSize >> 16) & 0xFF;
  frame[6] = (dataSize >> 8) & 0xFF;
  frame[7] = dataSize & 0xFF;
  
  frame[8] = 0x00;
  frame[9] = 0x00;
  frame[10] = 0x00; // Encoding
  
  let offset = 11;
  frame.set(mimeBytes, offset);
  offset += mimeBytes.length;
  frame[offset] = 0x03; // Cover type
  offset++;
  frame.set(descBytes, offset);
  offset += descBytes.length;
  frame.set(coverBytes, offset);
  
  return frame;
}

function createDefaultCoverFrame() {
  // Simple 1x1 transparent GIF as default
  const defaultCoverBase64 = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  try {
    const coverBytes = Uint8Array.from(atob(defaultCoverBase64), c => c.charCodeAt(0));
    return createCoverFrame(coverBytes.buffer, 'image/gif');
  } catch (e) {
    return new Uint8Array(0);
  }
}

function generateCleanFilename(metadata, originalName) {
  const artist = metadata.artist.replace(/[^\w\s]/gi, '').trim().substring(0, 30);
  const title = metadata.title.replace(/[^\w\s]/gi, '').trim().substring(0, 30);
  
  if (artist && title && artist !== 'Unknown Artist') {
    return `${artist} - ${title}.mp3`.replace(/\s+/g, ' ');
  }
  return originalName.replace(/\s+/g, ' ').replace(/[^\w\s.-]/gi, '');
}