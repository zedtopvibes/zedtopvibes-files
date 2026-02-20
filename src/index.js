// src/index.js - Fixed version with proper escaping
const UPLOAD_FORM = `<!DOCTYPE html>
<html>
<head>
    <title>MP3 Upload with Tags</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: system-ui, -apple-system, sans-serif; 
            padding: 20px;
            max-width: 600px;
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
        input[type="file"], input[type="text"] {
            width: 100%;
            padding: 10px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            background: #f8fafc;
            font-size: 14px;
        }
        input[type="text"] {
            background: white;
        }
        input[type="file"]:hover, input[type="text"]:focus {
            border-color: #4299e1;
            background: #fff;
        }
        .preview {
            margin-top: 15px;
            text-align: center;
            min-height: 150px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .preview img {
            max-width: 200px;
            max-height: 200px;
            border-radius: 8px;
            border: 2px solid #e2e8f0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .preview-placeholder {
            width: 200px;
            height: 200px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
            border: 2px dashed #fff;
        }
        .row {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
        }
        .row .form-group {
            flex: 1;
            margin-bottom: 0;
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
            margin: 10px;
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
        .tag-badge {
            display: inline-block;
            padding: 4px 8px;
            background: #e2e8f0;
            border-radius: 4px;
            font-size: 12px;
            margin: 2px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎵 Upload MP3 with ID3 Tags</h1>
        
        <div class="form-group">
            <label>📁 MP3 File</label>
            <input type="file" id="mp3File" accept=".mp3" required>
        </div>
        
        <div class="row">
            <div class="form-group">
                <label>🎤 Artist</label>
                <input type="text" id="artist" placeholder="Artist name" value="Unknown Artist">
            </div>
            <div class="form-group">
                <label>💿 Album</label>
                <input type="text" id="album" placeholder="Album name" value="Unknown Album">
            </div>
        </div>
        
        <div class="row">
            <div class="form-group">
                <label>📝 Title</label>
                <input type="text" id="title" placeholder="Song title">
            </div>
            <div class="form-group">
                <label>📅 Year</label>
                <input type="text" id="year" placeholder="2024" value="2024">
            </div>
        </div>
        
        <div class="row">
            <div class="form-group">
                <label>🎸 Genre</label>
                <input type="text" id="genre" placeholder="Genre" value="Unknown">
            </div>
            <div class="form-group">
                <label>🔢 Track</label>
                <input type="text" id="track" placeholder="1" value="1">
            </div>
        </div>
        
        <div class="form-group">
            <label>🖼️ Cover Art (optional - will be embedded in MP3)</label>
            <input type="file" id="coverFile" accept=".jpg,.jpeg,.png,.gif">
            <div class="preview" id="preview">
                <div class="preview-placeholder" id="previewPlaceholder">
                    Cover preview
                </div>
            </div>
        </div>
        
        <button id="uploadBtn">⬆️ Upload & Add Tags</button>
        
        <div class="progress" id="progress">
            <div class="progress-bar" id="progressBar"></div>
            <div class="progress-text" id="progressText">0%</div>
        </div>
        
        <div class="result" id="result"></div>
    </div>

    <script>
        // Auto-fill title from filename
        document.getElementById('mp3File').addEventListener('change', function(e) {
            const file = e.target.files[0];
            const titleInput = document.getElementById('title');
            
            if (file && !titleInput.value) {
                let title = file.name.replace('.mp3', '').replace(/[_-]/g, ' ');
                title = title.replace(/\\s+/g, ' ').trim();
                titleInput.value = title;
            }
        });

        // Preview cover
        document.getElementById('coverFile').addEventListener('change', function(e) {
            const file = e.target.files[0];
            const preview = document.getElementById('preview');
            
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.innerHTML = '<img src=\"' + e.target.result + '\" alt=\"Cover Preview\">';
                };
                reader.readAsDataURL(file);
            } else {
                preview.innerHTML = '<div class=\"preview-placeholder\">Cover preview</div>';
            }
        });

        // Upload function
        document.getElementById('uploadBtn').addEventListener('click', async function() {
            const mp3File = document.getElementById('mp3File').files[0];
            
            if (!mp3File) {
                alert('Please select an MP3 file');
                return;
            }

            const formData = new FormData();
            formData.append('file', mp3File);
            formData.append('artist', document.getElementById('artist').value || 'Unknown Artist');
            formData.append('album', document.getElementById('album').value || 'Unknown Album');
            formData.append('title', document.getElementById('title').value || mp3File.name.replace('.mp3', ''));
            formData.append('year', document.getElementById('year').value || '2024');
            formData.append('genre', document.getElementById('genre').value || 'Unknown');
            formData.append('track', document.getElementById('track').value || '1');
            
            const coverFile = document.getElementById('coverFile').files[0];
            if (coverFile) {
                formData.append('cover', coverFile);
            }

            const btn = document.getElementById('uploadBtn');
            const progress = document.getElementById('progress');
            const progressBar = document.getElementById('progressBar');
            const progressText = document.getElementById('progressText');
            const result = document.getElementById('result');

            btn.disabled = true;
            progress.style.display = 'block';
            result.style.display = 'none';
            progressBar.style.width = '0%';
            progressText.textContent = '0%';

            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    progressBar.style.width = percent + '%';
                    progressText.textContent = percent + '%';
                }
            });

            xhr.addEventListener('load', function() {
                btn.disabled = false;
                
                try {
                    const data = JSON.parse(xhr.responseText);
                    
                    if (xhr.status === 200) {
                        let html = '<p>✅ Upload successful!</p>' +
                            '<p>' +
                            '<span class="tag-badge">🎤 ' + data.tags.artist + '</span> ' +
                            '<span class="tag-badge">💿 ' + data.tags.album + '</span> ' +
                            '<span class="tag-badge">📝 ' + data.tags.title + '</span>' +
                            '</p>' +
                            '<a href="/download/' + data.filename + '" class="download-link" download>📥 Download MP3</a>';
                        
                        result.className = 'result success';
                        result.innerHTML = html;
                    } else {
                        result.className = 'result error';
                        result.innerHTML = '❌ Error: ' + (data.error || 'Upload failed');
                    }
                    
                    result.style.display = 'block';
                    
                    setTimeout(() => {
                        progress.style.display = 'none';
                        progressBar.style.width = '0%';
                    }, 500);
                    
                } catch (err) {
                    result.className = 'result error';
                    result.innerHTML = '❌ Upload failed: ' + err.message;
                    result.style.display = 'block';
                    progress.style.display = 'none';
                }
            });

            xhr.addEventListener('error', function() {
                btn.disabled = false;
                result.className = 'result error';
                result.innerHTML = '❌ Upload failed - network error';
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
        headers: { 
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache'
        }
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
    
    // Get metadata from form
    const tags = {
      artist: formData.get('artist') || 'Unknown Artist',
      album: formData.get('album') || 'Unknown Album',
      title: formData.get('title') || file.name.replace('.mp3', ''),
      year: formData.get('year') || '2024',
      genre: formData.get('genre') || 'Unknown',
      track: formData.get('track') || '1'
    };
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!file.name.toLowerCase().endsWith('.mp3')) {
      return new Response(JSON.stringify({ error: 'Only MP3 files are allowed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate safe filename
    const timestamp = Date.now();
    const safeName = (tags.artist + ' - ' + tags.title).replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, ' ');
    const filename = timestamp + '-' + safeName + '.mp3';
    
    // Read MP3 file
    const fileBuffer = await file.arrayBuffer();
    
    // Process cover if provided
    let coverBuffer = null;
    let coverMime = null;
    if (cover && cover.size > 0) {
      if (!cover.type.startsWith('image/')) {
        return new Response(JSON.stringify({ error: 'Cover must be an image' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      coverBuffer = await cover.arrayBuffer();
      coverMime = cover.type;
    }
    
    // Add ID3 tags to MP3
    const mp3WithTags = addID3Tags(fileBuffer, tags, coverBuffer, coverMime);
    
    // Store tagged MP3 in R2
    await env.recycle.put(filename, mp3WithTags, {
      httpMetadata: {
        contentType: 'audio/mpeg',
        contentDisposition: 'attachment; filename="' + filename + '"'
      },
      customMetadata: {
        artist: tags.artist,
        album: tags.album,
        title: tags.title,
        year: tags.year,
        genre: tags.genre,
        track: tags.track,
        uploadedAt: new Date().toISOString(),
        hasCover: coverBuffer ? 'true' : 'false'
      }
    });

    return new Response(JSON.stringify({
      success: true,
      filename: filename,
      tags: tags,
      size: file.size
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleDownload(filename, env) {
  try {
    const object = await env.recycle.get(filename);
    
    if (!object) {
      return new Response('File not found', { status: 404 });
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="' + filename + '"',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response('Download failed', { status: 500 });
  }
}

// ==================== ID3 TAG FUNCTIONS ====================

function addID3Tags(audioBuffer, tags, coverBuffer, coverMime) {
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
  const id3Tags = createID3v23Tags(tags, coverBuffer, coverMime);
  
  // Remove existing tags and prepend new ones
  const audioData = hasExistingID3 ? audioBytes.slice(id3Size) : audioBytes;
  
  // Combine
  const finalBuffer = new Uint8Array(id3Tags.length + audioData.length);
  finalBuffer.set(id3Tags, 0);
  finalBuffer.set(audioData, id3Tags.length);
  
  return finalBuffer.buffer;
}

function createID3v23Tags(tags, coverBuffer, coverMime) {
  const header = new Uint8Array(10);
  
  // ID3v2.3 header
  header[0] = 0x49; // I
  header[1] = 0x44; // D
  header[2] = 0x33; // 3
  header[3] = 0x03; // Version 2.3.0
  header[4] = 0x00;
  header[5] = 0x00; // Flags
  
  const frames = [];
  
  // Add text frames for each tag
  if (tags.title) frames.push(createTextFrame('TIT2', tags.title));
  if (tags.artist) frames.push(createTextFrame('TPE1', tags.artist));
  if (tags.album) frames.push(createTextFrame('TALB', tags.album));
  if (tags.year) frames.push(createTextFrame('TYER', tags.year));
  if (tags.genre) frames.push(createTextFrame('TCON', tags.genre));
  if (tags.track) frames.push(createTextFrame('TRCK', tags.track));
  
  // Add cover if provided
  if (coverBuffer && coverMime) {
    frames.push(createCoverFrame(coverBuffer, coverMime));
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
  
  // Combine header and frames
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
  const textBytes = encoder.encode(text + '\0'); // Null-terminated string
  
  // Frame header (10 bytes) + encoding (1 byte) + text
  const frameSize = 10 + 1 + textBytes.length;
  const frame = new Uint8Array(frameSize);
  
  // Frame ID (4 bytes)
  frame[0] = frameId.charCodeAt(0);
  frame[1] = frameId.charCodeAt(1);
  frame[2] = frameId.charCodeAt(2);
  frame[3] = frameId.charCodeAt(3);
  
  // Size (4 bytes) - excluding header
  const dataSize = 1 + textBytes.length;
  frame[4] = (dataSize >> 24) & 0xFF;
  frame[5] = (dataSize >> 16) & 0xFF;
  frame[6] = (dataSize >> 8) & 0xFF;
  frame[7] = dataSize & 0xFF;
  
  // Flags (2 bytes)
  frame[8] = 0x00;
  frame[9] = 0x00;
  
  // Encoding (3 = UTF-8)
  frame[10] = 0x03;
  
  // Text
  frame.set(textBytes, 11);
  
  return frame;
}

function createCoverFrame(coverBuffer, coverMime) {
  const coverBytes = new Uint8Array(coverBuffer);
  
  // Determine MIME type string
  let mimeString;
  if (coverMime.includes('png')) {
    mimeString = 'image/png\0';
  } else if (coverMime.includes('gif')) {
    mimeString = 'image/gif\0';
  } else {
    mimeString = 'image/jpeg\0';
  }
  
  const mimeBytes = new TextEncoder().encode(mimeString);
  const description = 'Cover\0';
  const descBytes = new TextEncoder().encode(description);
  
  // Frame size: header(10) + encoding(1) + mime + type(1) + description + data
  const frameSize = 10 + 1 + mimeBytes.length + 1 + descBytes.length + coverBytes.length;
  const frame = new Uint8Array(frameSize);
  
  // Frame ID: APIC
  frame[0] = 0x41; // A
  frame[1] = 0x50; // P
  frame[2] = 0x49; // I
  frame[3] = 0x43; // C
  
  // Size
  const dataSize = frameSize - 10;
  frame[4] = (dataSize >> 24) & 0xFF;
  frame[5] = (dataSize >> 16) & 0xFF;
  frame[6] = (dataSize >> 8) & 0xFF;
  frame[7] = dataSize & 0xFF;
  
  // Flags
  frame[8] = 0x00;
  frame[9] = 0x00;
  
  // Text encoding (0 = ISO-8859-1)
  frame[10] = 0x00;
  
  // MIME type
  let offset = 11;
  frame.set(mimeBytes, offset);
  offset += mimeBytes.length;
  
  // Picture type (3 = cover front)
  frame[offset] = 0x03;
  offset++;
  
  // Description
  frame.set(descBytes, offset);
  offset += descBytes.length;
  
  // Picture data
  frame.set(coverBytes, offset);
  
  return frame;
}