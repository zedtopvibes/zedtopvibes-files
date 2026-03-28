/**
 * PROFESSIONAL BRANDED MP3 UPLOADER - SINGLE USER VERSION
 * 
 * Features:
 * - Complete ID3v2.3 tags
 * - 15MB file limit
 * - Watermark image embedding
 * - Audio duration detection
 * - ALL FIELDS PRE-FILLED with smart defaults
 * - Custom Filename at TOP position
 * - Filename Preview in middle
 * - You only need to change Artist & Title
 *  
 * @version 2.0.0
 * @author Zedtopvibes.Com
 */

const SITENAME = "Zedtopvibes.Com";
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_COVER_SIZE = 10 * 1024 * 1024; // 10MB for watermark
const SUPPORTED_GENRES = [
  'Podcast', 'Music', 'Hip-Hop', 'Rock', 'Pop', 
  'Electronic', 'Jazz', 'Classical', 'Audiobook', 'Other'
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    // Handle OPTIONS request for CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: 204,
        headers: corsHeaders 
      });
    }

    // --- DOWNLOAD ROUTE ---
    if (url.pathname.startsWith('/download/')) {
      try {
        const filename = decodeURIComponent(url.pathname.split('/').pop());
        
        // Security: Prevent directory traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
          return new Response('Invalid filename', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        const object = await env.recycle.get(filename);
        
        if (!object) {
          return new Response('File Not Found', { 
            status: 404, 
            headers: corsHeaders 
          });
        }

        // Get file metadata
        const metadata = object.customMetadata || {};
        
        // Proper filename encoding for all browsers
        const encodedFilename = filename.replace(/"/g, '\\"');
        
        // Create response with proper headers
        const headers = new Headers({
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "Content-Disposition": `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
          "Content-Length": object.size,
          "Cache-Control": "public, max-age=3600",
          "Accept-Ranges": "bytes",
        });

        // Add metadata headers for debugging/info
        if (metadata.uploader) {
          headers.set("X-Uploader", metadata.uploader);
        }
        if (metadata.uploadDate) {
          headers.set("X-Upload-Date", metadata.uploadDate);
        }

        return new Response(object.body, { headers });

      } catch (err) {
        return new Response('Download failed: ' + err.message, { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }

    // --- UPLOAD ROUTE ---
    if (request.method === 'POST' && url.pathname === '/upload') {
      try {
        const formData = await request.formData();
        const file = formData.get('file');
        
        // Validate file presence
        if (!file || !(file instanceof File)) {
          throw new Error('No file uploaded');
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
        }

        // Validate file type
        const isValidType = file.type.includes('audio/mpeg') || 
                           file.type.includes('audio/mp3') || 
                           file.name.toLowerCase().endsWith('.mp3');
        
        if (!isValidType) {
          throw new Error('File must be an MP3 audio file');
        }

        // =====================================================
        // 📝 Get form data - all fields are PRE-FILLED
        // =====================================================
        const customFilename = formData.get('customFilename') || '';
        const rawArtist = sanitizeInput(formData.get('artist') || 'Various Artists');
        const rawTitle = sanitizeInput(formData.get('title') || 'Untitled Track');
        const rawAlbum = sanitizeInput(formData.get('album') || 'Zedtopvibes Compilation');
        const rawYear = sanitizeYear(formData.get('year') || new Date().getFullYear().toString());
        const rawGenre = sanitizeGenre(formData.get('genre') || 'Music');
        const rawTrack = sanitizeTrack(formData.get('track') || '1');
        const duration = sanitizeDuration(formData.get('duration') || '');

        // Branded metadata
        const taggedTitle = `${rawTitle} (${SITENAME})`;
        const taggedArtist = `${rawArtist} | ${SITENAME}`;
        const taggedAlbum = rawAlbum;
        const taggedComment = `🎵 Discover your next favorite track at ${SITENAME}`;

        // Read file buffer
        const fileBuffer = await file.arrayBuffer();
        
        // Strip existing ID3 tags
        const cleanBuffer = stripExistingID3(fileBuffer);
        
        // Get and validate watermark
        let coverBuffer = null;
        try {
          const watermark = await env.recycle.get('watermark.jpg');
          if (watermark) {
            coverBuffer = await watermark.arrayBuffer();
            if (coverBuffer.byteLength < 100 || coverBuffer.byteLength > MAX_COVER_SIZE) {
              console.warn('Invalid watermark size, skipping');
              coverBuffer = null;
            }
          }
        } catch (err) {
          console.warn('Watermark not found:', err.message);
        }

        // Create complete ID3 tags
        const taggedMp3 = createCompleteID3Tags(cleanBuffer, {
          artist: taggedArtist,
          title: taggedTitle,
          album: taggedAlbum,
          year: rawYear,
          genre: rawGenre,
          track: rawTrack,
          comment: taggedComment,
          duration: duration,
          encoder: `${SITENAME} Uploader v2.0`,
          publisher: SITENAME,
          copyright: `${new Date().getFullYear()} ${SITENAME}`,
          cover: coverBuffer
        });

        // Create filename
        let filename;
        if (customFilename && customFilename.trim() !== '') {
          const cleanCustom = cleanWithSpaces(customFilename).substring(0, 100);
          filename = `${cleanCustom} (${SITENAME}).mp3`;
        } else {
          const cleanArtist = cleanWithSpaces(rawArtist).substring(0, 30);
          const cleanTitle = cleanWithSpaces(rawTitle).substring(0, 50);
          filename = `${cleanArtist} - ${cleanTitle} (${SITENAME}).mp3`;
        }

        // Upload to R2 with metadata
        await env.recycle.put(filename, taggedMp3, {
          httpMetadata: { 
            contentType: 'audio/mpeg',
            contentDisposition: `attachment; filename="${filename}"`
          },
          customMetadata: {
            uploader: SITENAME,
            uploadDate: new Date().toISOString(),
            originalTitle: rawTitle,
            originalArtist: rawArtist,
            originalAlbum: rawAlbum,
            genre: rawGenre,
            year: rawYear,
            version: '2.0.0'
          }
        });

        // Generate download URL
        const downloadUrl = `/download/${encodeURIComponent(filename)}`;

        // Return success response
        return new Response(JSON.stringify({ 
          success: true, 
          filename,
          url: downloadUrl,
          size: file.size,
          duration: duration,
          metadata: {
            title: taggedTitle,
            artist: taggedArtist,
            album: taggedAlbum,
            year: rawYear,
            genre: rawGenre
          }
        }), {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });

      } catch (err) {
        const status = err.message.includes('too large') ? 413 : 
                      err.message.includes('MP3') ? 415 : 500;
        
        return new Response(JSON.stringify({ 
          success: false, 
          error: err.message 
        }), { 
          status: status,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          }
        });
      }
    }

    // --- UI ROUTE ---
    return new Response(getHTML(SITENAME), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }
};

/**
 * Input Sanitization Functions
 */
function sanitizeInput(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').trim().substring(0, 200);
}

function sanitizeYear(year) {
  const y = parseInt(year);
  if (isNaN(y) || y < 1900 || y > 2100) {
    return new Date().getFullYear().toString();
  }
  return y.toString();
}

function sanitizeGenre(genre) {
  return SUPPORTED_GENRES.includes(genre) ? genre : 'Music';
}

function sanitizeTrack(track) {
  const trackStr = track.replace(/[^0-9/\-]/g, '').trim();
  return trackStr || '1';
}

function sanitizeDuration(duration) {
  const d = parseInt(duration);
  return !isNaN(d) && d > 0 ? d.toString() : '';
}

/**
 * Clean filename - keep dashes, remove other specials
 */
function cleanWithSpaces(str) {
  if (!str) return '';
  return str
    .replace(/[^a-zA-Z0-9\s\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strip existing ID3 tags from MP3 file
 */
function stripExistingID3(buffer) {
  const view = new Uint8Array(buffer);
  
  if (view.length > 10 && view[0] === 0x49 && view[1] === 0x44 && view[2] === 0x33) {
    const size = (view[6] * 0x200000) + (view[7] * 0x4000) + (view[8] * 0x80) + view[9];
    const tagSize = 10 + size;
    
    if (tagSize <= view.length && tagSize > 0) {
      return buffer.slice(tagSize);
    }
  }
  
  return buffer;
}

/**
 * Create complete ID3v2.3 tags
 */
function createCompleteID3Tags(audioBuffer, metadata) {
  const audioBytes = new Uint8Array(audioBuffer);
  const frames = [];

  // Core identification
  if (metadata.artist) frames.push(createTextFrame('TPE1', metadata.artist));
  if (metadata.title) frames.push(createTextFrame('TIT2', metadata.title));
  if (metadata.album) frames.push(createTextFrame('TALB', metadata.album));
  if (metadata.year) frames.push(createTextFrame('TYER', metadata.year));
  if (metadata.genre) frames.push(createTextFrame('TCON', metadata.genre));
  if (metadata.track) frames.push(createTextFrame('TRCK', metadata.track));
  
  if (metadata.duration) {
    frames.push(createTextFrame('TLEN', metadata.duration.toString()));
  }
  
  if (metadata.artist) {
    frames.push(createTextFrame('TPE2', metadata.artist));
    frames.push(createTextFrame('TSOP', metadata.artist));
  }
  
  if (metadata.encoder) frames.push(createTextFrame('TENC', metadata.encoder));
  if (metadata.publisher) frames.push(createTextFrame('TPUB', metadata.publisher));
  if (metadata.copyright) frames.push(createTextFrame('TCOP', metadata.copyright));
  
  if (metadata.comment) {
    frames.push(createCommentFrame(metadata.comment));
  }
  
  if (metadata.cover && metadata.cover.byteLength > 0) {
    frames.push(createAPICFrame(metadata.cover));
  }
  
  const privateData = JSON.stringify({
    uploader: SITENAME,
    version: '2.0.0',
    timestamp: Date.now()
  });
  frames.push(createPrivateFrame('XXXX', privateData));

  const framesSize = frames.reduce((acc, f) => acc + f.length, 0);
  const PADDING_SIZE = 2048;
  
  const header = new Uint8Array(10);
  header.set([0x49, 0x44, 0x33, 0x03, 0x00, 0x00], 0);
  header.set(encodeSynchsafe(framesSize + PADDING_SIZE), 6);

  const final = new Uint8Array(10 + framesSize + PADDING_SIZE + audioBytes.length);
  final.set(header, 0);
  
  let offset = 10;
  for (const f of frames) {
    final.set(f, offset);
    offset += f.length;
  }
  
  offset += PADDING_SIZE;
  final.set(audioBytes, offset);
  
  return final;
}

function createTextFrame(frameId, value) {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(value);
  
  const frame = new Uint8Array(10 + 1 + textBytes.length);
  frame.set(encoder.encode(frameId), 0);
  
  const size = 1 + textBytes.length;
  frame[4] = (size >> 24) & 0xFF;
  frame[5] = (size >> 16) & 0xFF;
  frame[6] = (size >> 8) & 0xFF;
  frame[7] = size & 0xFF;
  
  frame[8] = 0;
  frame[9] = 0;
  frame[10] = 0x03;
  frame.set(textBytes, 11);
  
  return frame;
}

function createCommentFrame(comment) {
  const encoder = new TextEncoder();
  const lang = encoder.encode('eng');
  const description = encoder.encode('\0');
  const textBytes = encoder.encode(comment);
  
  const size = 1 + 3 + description.length + textBytes.length;
  const frame = new Uint8Array(10 + size);
  
  frame.set(encoder.encode('COMM'), 0);
  
  frame[4] = (size >> 24) & 0xFF;
  frame[5] = (size >> 16) & 0xFF;
  frame[6] = (size >> 8) & 0xFF;
  frame[7] = size & 0xFF;
  
  frame[8] = 0;
  frame[9] = 0;
  
  let pos = 10;
  frame[pos++] = 0x03;
  frame.set(lang, pos);
  pos += 3;
  frame.set(description, pos);
  pos += description.length;
  frame.set(textBytes, pos);
  
  return frame;
}

function createPrivateFrame(ownerId, data) {
  const encoder = new TextEncoder();
  const ownerBytes = encoder.encode(ownerId + '\0');
  const dataBytes = encoder.encode(data);
  
  const size = ownerBytes.length + dataBytes.length;
  const frame = new Uint8Array(10 + size);
  
  frame.set(encoder.encode('PRIV'), 0);
  
  frame[4] = (size >> 24) & 0xFF;
  frame[5] = (size >> 16) & 0xFF;
  frame[6] = (size >> 8) & 0xFF;
  frame[7] = size & 0xFF;
  
  frame[8] = 0;
  frame[9] = 0;
  
  frame.set(ownerBytes, 10);
  frame.set(dataBytes, 10 + ownerBytes.length);
  
  return frame;
}

function createAPICFrame(coverBuffer) {
  const encoder = new TextEncoder();
  const coverBytes = new Uint8Array(coverBuffer);
  const mime = "image/jpeg";
  const mimeBytes = encoder.encode(mime);
  const description = new Uint8Array([0]);
  
  const frameDataSize = 1 + mimeBytes.length + 1 + 1 + description.length + coverBytes.length;
  const frame = new Uint8Array(10 + frameDataSize);
  
  frame.set(encoder.encode('APIC'), 0);
  
  frame[4] = (frameDataSize >> 24) & 0xFF;
  frame[5] = (frameDataSize >> 16) & 0xFF;
  frame[6] = (frameDataSize >> 8) & 0xFF;
  frame[7] = frameDataSize & 0xFF;
  
  frame[8] = 0;
  frame[9] = 0;
  
  let pos = 10;
  frame[pos++] = 0x00;
  frame.set(mimeBytes, pos);
  pos += mimeBytes.length;
  frame[pos++] = 0;
  frame[pos++] = 0x03;
  frame.set(description, pos);
  pos += description.length;
  frame.set(coverBytes, pos);
  
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

/**
 * UI - Custom Filename at TOP, Preview in MIDDLE with Audio Player & Download Button
 */
function getHTML(site) {
  const safeSite = site.replace(/[<>]/g, '');
  const currentYear = new Date().getFullYear();
  const genreOptions = SUPPORTED_GENRES.map(g => 
    `<option value="${g}" ${g === 'Music' ? 'selected' : ''}>${g}</option>`
  ).join('');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeSite} - Upload (Single User Mode)</title>
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
          🎵 ${safeSite}
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
            Auto-generates as: Artist - Title (${safeSite}).mp3
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
          <label>📅 YEAR <span class="default-value">default: ${currentYear}</span></label>
          <input type="text" id="year" value="${currentYear}">
        </div>

        <div class="form-group">
          <label>🎵 GENRE <span class="default-value">default: Music</span></label>
          <select id="genre">
            ${genreOptions}
          </select>
        </div>

        <div class="form-group">
          <label>🔢 TRACK <span class="default-value">default: 1</span></label>
          <input type="text" id="track" value="1">
        </div>

        <!-- 🟢 FILENAME PREVIEW - MIDDLE POSITION -->
        <div class="form-group full-width">
          <div id="filenamePreview" class="filename-preview">
            <strong>Preview:</strong> <span id="previewText">Various Artists - Untitled Track (${safeSite}).mp3</span>
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
        <span>⬆️</span> Upload to ${safeSite}
      </button>

      <div id="result"></div>
    </div>
    
    <div class="footer">
      <div>✨ Custom Filename at Top • Preview in Middle • Just change Artist & Title</div>
    </div>
  </div>

  <script>
    const MAX_SIZE = ${MAX_FILE_SIZE};
    const SITENAME = "${safeSite}";
    let audioContext = null;
    let durationMs = 0;
    let currentAudioBlobUrl = null;
    
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      document.addEventListener('click', () => {
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume();
        }
      }, { once: true });
    } catch (e) {}

    const fileInput = document.getElementById('file');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInfo = document.getElementById('fileInfo');
    const artistInput = document.getElementById('artist');
    const titleInput = document.getElementById('title');
    const filenameInput = document.getElementById('filename');
    const previewSpan = document.getElementById('previewText');
    const resultDiv = document.getElementById('result');

    function updateFilenamePreview() {
      const artist = artistInput.value.trim() || 'Various Artists';
      const title = titleInput.value.trim() || 'Untitled Track';
      const custom = filenameInput.value.trim();
      
      let preview;
      if (custom) {
        preview = custom.replace(/[^a-zA-Z0-9\\s\\-_]/g, ' ').replace(/\\s+/g, ' ').trim();
        preview = preview.substring(0, 100);
        preview = \`\${preview} (\${SITENAME}).mp3\`;
      } else {
        const cleanArtist = artist.replace(/[^a-zA-Z0-9\\s\\-_]/g, ' ').replace(/\\s+/g, ' ').trim();
        const cleanTitle = title.replace(/[^a-zA-Z0-9\\s\\-_]/g, ' ').replace(/\\s+/g, ' ').trim();
        preview = \`\${cleanArtist} - \${cleanTitle} (\${SITENAME}).mp3\`;
      }
      previewSpan.textContent = preview;
    }

    artistInput.addEventListener('input', updateFilenamePreview);
    titleInput.addEventListener('input', updateFilenamePreview);
    filenameInput.addEventListener('input', updateFilenamePreview);

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      
      if (!file) {
        fileInfo.style.display = 'none';
        uploadBtn.disabled = true;
        if (currentAudioBlobUrl) {
          URL.revokeObjectURL(currentAudioBlobUrl);
          currentAudioBlobUrl = null;
        }
        const tempCard = document.getElementById('tempPreviewCard');
        if (tempCard) tempCard.remove();
        return;
      }

      if (!file.name.toLowerCase().endsWith('.mp3')) {
        fileInfo.innerHTML = '❌ Must be MP3';
        fileInfo.style.display = 'block';
        uploadBtn.disabled = true;
        return;
      }

      if (file.size > MAX_SIZE) {
        fileInfo.innerHTML = \`❌ Too large: \${(file.size / 1024 / 1024).toFixed(2)}MB (max 15MB)\`;
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
          durationText = \`<br>⏱️ \${mins}:\${secs.toString().padStart(2, '0')}\`;
        } catch (err) {}
      }
      fileInfo.innerHTML = \`✅ \${file.name} - \${sizeMB}MB\${durationText}\`;
      fileInfo.className = 'file-info success';
      fileInfo.style.display = 'block';
      uploadBtn.disabled = false;

      if (currentAudioBlobUrl) {
        URL.revokeObjectURL(currentAudioBlobUrl);
      }
      const tempUrl = URL.createObjectURL(file);
      currentAudioBlobUrl = tempUrl;
      
      const existingTemp = document.getElementById('tempPreviewCard');
      if (existingTemp) existingTemp.remove();
      
      const tempPlayerHtml = \`
        <div class="audio-preview" id="tempPreviewCard">
          <span class="preview-title">🎧 Selected preview:</span>
          <audio controls src="\${tempUrl}" preload="metadata"></audio>
          <button class="download-btn-small" id="tempDownloadBtn">⬇️ Download (original)</button>
        </div>
      \`;
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
          
          const playerHtml = \`
            <div class="result success">
              <div style="font-weight:bold; margin-bottom:12px;">✅ Upload complete!</div>
              <div class="audio-preview" style="background:#ffffff; border:1px solid #cbd5e1;">
                <span class="preview-title">🎵 \${data.metadata?.title || 'Track'}</span>
                <audio controls src="\${downloadEndpoint}" preload="metadata" style="flex:1"></audio>
                <a href="\${downloadEndpoint}" download="\${encodeURIComponent(data.filename)}" class="download-btn-small" style="text-decoration:none;">
                  ⬇️ Direct Download
                </a>
              </div>
              <div class="url-box" style="margin-top:12px;">
                🔗 Share link: <strong>\${fullUrl}</strong>
                <button onclick="navigator.clipboard.writeText('\${fullUrl}')" style="margin-top:8px; padding:8px 16px; font-size:13px; width:auto; background:#4a5568;">📋 Copy URL</button>
              </div>
            </div>
          \`;
          
          resultDiv.innerHTML = playerHtml;
          
          const tempCard = document.getElementById('tempPreviewCard');
          if (tempCard) tempCard.remove();
          
          if (currentAudioBlobUrl) {
            URL.revokeObjectURL(currentAudioBlobUrl);
            currentAudioBlobUrl = null;
          }
          
          fileInfo.style.display = 'none';
          fileInput.value = '';
          uploadBtn.disabled = true;
          
        } else {
          throw new Error(data.error);
        }
      } catch (err) {
        resultDiv.innerHTML = \`<div class="result" style="background:#fee2e2; border:2px solid #ef4444;">❌ Upload failed: \${err.message}</div>\`;
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    });

    window.copyToClipboard = (text) => {
      navigator.clipboard.writeText(text).then(
        () => alert('✅ Copied!'),
        () => alert('Press Ctrl+C to copy')
      );
    };
    
    if (window.location.search.includes('demo')) {
      artistInput.value = 'Yo Maps';
      titleInput.value = 'Komando';
      document.getElementById('album').value = 'Komando Album';
      document.getElementById('year').value = '2024';
      document.getElementById('track').value = '1';
      document.getElementById('genre').value = 'Music';
      updateFilenamePreview();
    }
    
    window.addEventListener('beforeunload', () => {
      if (currentAudioBlobUrl) URL.revokeObjectURL(currentAudioBlobUrl);
    });
  </script>
</body>
</html>`;
}