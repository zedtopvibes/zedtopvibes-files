// src/index.js - Ultra Lightweight Upload Form
const UPLOAD_FORM = `<!DOCTYPE html>
<html>
<head>
    <title>MP3 Upload</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: system-ui, -apple-system, sans-serif; 
            padding: 20px;
            max-width: 500px;
            margin: 0 auto;
            background: #f0f2f5;
        }
        .container {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { 
            font-size: 24px; 
            color: #1a1a1a; 
            margin: 0 0 20px 0;
            text-align: center;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #4a5568;
            font-size: 14px;
        }
        input[type="file"] {
            width: 100%;
            padding: 10px;
            border: 2px dashed #cbd5e0;
            border-radius: 8px;
            background: #f8fafc;
            font-size: 14px;
        }
        input[type="file"]:hover {
            border-color: #4299e1;
            background: #fff;
        }
        .preview {
            margin-top: 15px;
            text-align: center;
            min-height: 100px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .preview img {
            max-width: 150px;
            max-height: 150px;
            border-radius: 8px;
            border: 2px solid #e2e8f0;
        }
        .preview-placeholder {
            width: 150px;
            height: 150px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
        }
        button {
            width: 100%;
            padding: 14px;
            background: #4299e1;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }
        button:hover {
            background: #3182ce;
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .progress {
            margin-top: 20px;
            display: none;
        }
        .progress-bar {
            height: 8px;
            background: #4299e1;
            border-radius: 4px;
            width: 0%;
            transition: width 0.3s;
        }
        .progress-text {
            font-size: 14px;
            color: #718096;
            margin-top: 8px;
            text-align: center;
        }
        .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 8px;
            display: none;
            text-align: center;
        }
        .success {
            background: #c6f6d5;
            color: #22543d;
        }
        .error {
            background: #fed7d7;
            color: #742a2a;
        }
        .download-link {
            display: inline-block;
            margin-top: 10px;
            padding: 10px 20px;
            background: #48bb78;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
        }
        .download-link:hover {
            background: #38a169;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎵 Upload MP3</h1>
        
        <div class="form-group">
            <label>Choose MP3 File</label>
            <input type="file" id="mp3File" accept=".mp3" required>
        </div>
        
        <div class="form-group">
            <label>Cover Art (optional)</label>
            <input type="file" id="coverFile" accept=".jpg,.jpeg,.png,.gif">
            <div class="preview" id="preview">
                <div class="preview-placeholder" id="previewPlaceholder">
                    No cover selected
                </div>
            </div>
        </div>
        
        <button id="uploadBtn">⬆️ Upload</button>
        
        <div class="progress" id="progress">
            <div class="progress-bar" id="progressBar"></div>
            <div class="progress-text" id="progressText">0%</div>
        </div>
        
        <div class="result" id="result"></div>
    </div>

    <script>
        // Preview cover
        document.getElementById('coverFile').addEventListener('change', function(e) {
            const file = e.target.files[0];
            const preview = document.getElementById('preview');
            
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.innerHTML = \`<img src="\${e.target.result}" alt="Cover">\`;
                };
                reader.readAsDataURL(file);
            } else {
                preview.innerHTML = \`<div class="preview-placeholder">No cover selected</div>\`;
            }
        });

        // Upload with progress
        document.getElementById('uploadBtn').addEventListener('click', async function() {
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

            const btn = document.getElementById('uploadBtn');
            const progress = document.getElementById('progress');
            const progressBar = document.getElementById('progressBar');
            const progressText = document.getElementById('progressText');
            const result = document.getElementById('result');

            btn.disabled = true;
            progress.style.display = 'block';
            result.style.display = 'none';

            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    progressBar.style.width = percent + '%';
                    progressText.textContent = percent + '%';
                }
            });

            xhr.addEventListener('load', () => {
                btn.disabled = false;
                
                try {
                    const data = JSON.parse(xhr.responseText);
                    
                    if (xhr.status === 200) {
                        result.className = 'result success';
                        result.innerHTML = \`
                            <p>✅ Upload successful!</p>
                            <a href="/download/\${data.filename}" class="download-link" download>📥 Download MP3</a>
                        \`;
                    } else {
                        result.className = 'result error';
                        result.innerHTML = \`❌ \${data.error || 'Upload failed'}\`;
                    }
                    
                    result.style.display = 'block';
                    
                    setTimeout(() => {
                        progress.style.display = 'none';
                        progressBar.style.width = '0%';
                    }, 500);
                    
                } catch (err) {
                    result.className = 'result error';
                    result.innerHTML = '❌ Upload failed';
                    result.style.display = 'block';
                }
            });

            xhr.addEventListener('error', () => {
                btn.disabled = false;
                result.className = 'result error';
                result.innerHTML = '❌ Upload failed';
                result.style.display = 'block';
                progress.style.display = 'none';
            });

            xhr.open('POST', '/upload');
            xhr.send(formData);
        });
    </script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Serve upload form
    if (path === '/' || path === '/upload-form') {
      return new Response(UPLOAD_FORM, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Handle upload
    if (path === '/upload' && request.method === 'POST') {
      return handleUpload(request, env);
    }

    // Handle download
    if (path.startsWith('/download/')) {
      return handleDownload(path.replace('/download/', ''), env);
    }

    // Redirect to form
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/' }
    });
  }
};

async function handleUpload(request, env) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const cover = formData.get('cover');
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!file.name.endsWith('.mp3')) {
      return new Response(JSON.stringify({ error: 'MP3 only' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Read file
    const fileBuffer = await file.arrayBuffer();
    
    // Simple filename (remove special chars)
    const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Store in R2
    await env.recycle.put(filename, fileBuffer, {
      httpMetadata: {
        contentType: 'audio/mpeg',
        contentDisposition: `attachment; filename="${filename}"`
      }
    });

    // Store cover if exists
    if (cover && cover.size > 0) {
      const coverBuffer = await cover.arrayBuffer();
      const coverName = filename.replace('.mp3', '.jpg');
      await env.recycle.put(`covers/${coverName}`, coverBuffer, {
        httpMetadata: { contentType: cover.type }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      filename: filename,
      size: file.size
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleDownload(filename, env) {
  const object = await env.recycle.get(filename);
  
  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=3600'
    }
  });
}