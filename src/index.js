/**
 * PROFESSIONAL BRANDED MP3 UPLOADER - COMPLETE VERSION
 * 
 * Features:
 * - Complete ID3v2.3 tags (all standard fields)
 * - 15MB file limit with validation
 * - Watermark image embedding
 * - Audio duration detection
 * - Professional UI with all metadata fields
 * - XSS protection
 * - Proper error handling
 * - CORS support
 * 
 * @version 2.0.0
 * @author Your Brand
 */

const SITENAME = "Example.Com";
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_COVER_SIZE = 5*1024 * 1024; // 5MB for watermark
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

        // Get and sanitize form data
        const rawTitle = sanitizeInput(formData.get('title') || 'Unknown Title');
        const rawArtist = sanitizeInput(formData.get('artist') || 'Unknown Artist');
        const rawAlbum = sanitizeInput(formData.get('album') || `${SITENAME} Release`);
        const rawYear = sanitizeYear(formData.get('year') || new Date().getFullYear().toString());
        const rawGenre = sanitizeGenre(formData.get('genre') || 'Podcast');
        const rawTrack = sanitizeTrack(formData.get('track') || '1');
        const rawComment = sanitizeInput(formData.get('comment') || `Branded by ${SITENAME}`);
        const duration = sanitizeDuration(formData.get('duration') || '');

        // Branded metadata
        const taggedTitle = `${rawTitle} (${SITENAME})`;
        const taggedArtist = `${rawArtist} | ${SITENAME}`;
        const taggedAlbum = `${rawAlbum} [${SITENAME}]`;
        const taggedComment = `${rawComment} - Uploaded via ${SITENAME} System`;

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
            // Validate image buffer (basic check)
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

        // Create safe filename
        const safeTitle = sanitizeFilename(rawTitle).substring(0, 50);
        const safeArtist = sanitizeFilename(rawArtist).substring(0, 30);
        const timestamp = Date.now();
        const filename = `${safeTitle} - ${safeArtist} (${SITENAME}) ${timestamp}.mp3`;

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
        // Return error response
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
  // Remove any HTML tags and trim
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
  return SUPPORTED_GENRES.includes(genre) ? genre : 'Podcast';
}

function sanitizeTrack(track) {
  // Allow formats like "1", "1/12", "1-12"
  const trackStr = track.replace(/[^0-9/\-]/g, '').trim();
  return trackStr || '1';
}

function sanitizeDuration(duration) {
  const d = parseInt(duration);
  return !isNaN(d) && d > 0 ? d.toString() : '';
}

/**
 * Sanitize filename to remove illegal characters
 */
function sanitizeFilename(str) {
  return str
    .replace(/[<>:"/\\|?*]/g, '_')  // Remove Windows reserved chars
    .replace(/\s+/g, '_')            // Replace spaces with underscore
    .replace(/[^\w\-_.]/g, '')       // Remove any other weird chars
    .replace(/_+/g, '_')             // Collapse multiple underscores
    .replace(/^[_.\-]+|[_.\-]+$/g, ''); // Remove leading/trailing special chars
}

/**
 * Strip existing ID3 tags from MP3 file
 */
function stripExistingID3(buffer) {
  const view = new Uint8Array(buffer);
  
  // Check for ID3v2 header
  if (view.length > 10 && view[0] === 0x49 && view[1] === 0x44 && view[2] === 0x33) {
    // Decode synchsafe integer safely using multiplication to avoid bit shift issues
    const size = (view[6] * 0x200000) + (view[7] * 0x4000) + (view[8] * 0x80) + view[9];
    const tagSize = 10 + size;
    
    if (tagSize <= view.length && tagSize > 0) {
      return buffer.slice(tagSize);
    }
  }
  
  return buffer;
}

/**
 * Create complete ID3v2.3 tags with all standard fields
 */
function createCompleteID3Tags(audioBuffer, metadata) {
  const audioBytes = new Uint8Array(audioBuffer);
  const frames = [];

  // --- TEXT FRAMES (all standard fields) ---
  
  // Core identification (required)
  if (metadata.artist) frames.push(createTextFrame('TPE1', metadata.artist)); // Lead artist
  if (metadata.title) frames.push(createTextFrame('TIT2', metadata.title));   // Title
  if (metadata.album) frames.push(createTextFrame('TALB', metadata.album));   // Album
  if (metadata.year) frames.push(createTextFrame('TYER', metadata.year));      // Year
  if (metadata.genre) frames.push(createTextFrame('TCON', metadata.genre));    // Genre
  if (metadata.track) frames.push(createTextFrame('TRCK', metadata.track));    // Track number
  
  // Duration (if available)
  if (metadata.duration) {
    frames.push(createTextFrame('TLEN', metadata.duration.toString()));
  }
  
  // Additional artist info
  if (metadata.artist) {
    frames.push(createTextFrame('TPE2', metadata.artist)); // Album artist
    frames.push(createTextFrame('TSOP', metadata.artist)); // Artist sort order
  }
  
  // Technical metadata
  if (metadata.encoder) frames.push(createTextFrame('TENC', metadata.encoder)); // Encoded by
  if (metadata.publisher) frames.push(createTextFrame('TPUB', metadata.publisher)); // Publisher
  if (metadata.copyright) frames.push(createTextFrame('TCOP', metadata.copyright)); // Copyright
  
  // Comments (special frame type)
  if (metadata.comment) {
    frames.push(createCommentFrame(metadata.comment));
  }
  
  // --- COVER ART FRAME ---
  if (metadata.cover && metadata.cover.byteLength > 0) {
    frames.push(createAPICFrame(metadata.cover));
  }
  
  // --- PRIVATE FRAME FOR INTERNAL USE ---
  const privateData = JSON.stringify({
    uploader: SITENAME,
    version: '2.0.0',
    timestamp: Date.now()
  });
  frames.push(createPrivateFrame('XXXX', privateData));

  // Calculate total frames size
  const framesSize = frames.reduce((acc, f) => acc + f.length, 0);
  
  // Add padding (2KB recommended for future edits)
  const PADDING_SIZE = 2048;
  
  // Create ID3v2.3 header
  const header = new Uint8Array(10);
  header.set([0x49, 0x44, 0x33, 0x03, 0x00, 0x00], 0); // "ID3", version 3, flags 0
  header.set(encodeSynchsafe(framesSize + PADDING_SIZE), 6);

  // Build final file: header + frames + padding + audio
  const final = new Uint8Array(10 + framesSize + PADDING_SIZE + audioBytes.length);
  final.set(header, 0);
  
  let offset = 10;
  for (const f of frames) {
    final.set(f, offset);
    offset += f.length;
  }
  
  // Padding (already zeros)
  offset += PADDING_SIZE;
  
  // Original audio
  final.set(audioBytes, offset);
  
  return final;
}

/**
 * Create a standard text frame (ID3v2.3, UTF-8)
 */
function createTextFrame(frameId, value) {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(value);
  
  // Frame: header (10) + encoding (1) + text
  const frame = new Uint8Array(10 + 1 + textBytes.length);
  
  // Frame ID (4 bytes)
  frame.set(encoder.encode(frameId), 0);
  
  // Frame size (big-endian 32-bit)
  const size = 1 + textBytes.length;
  frame[4] = (size >> 24) & 0xFF;
  frame[5] = (size >> 16) & 0xFF;
  frame[6] = (size >> 8) & 0xFF;
  frame[7] = size & 0xFF;
  
  // Flags (none)
  frame[8] = 0;
  frame[9] = 0;
  
  // Encoding: UTF-8 (0x03) - works in most modern players
  frame[10] = 0x03;
  
  // Text content
  frame.set(textBytes, 11);
  
  return frame;
}

/**
 * Create a comment frame (COMM)
 */
function createCommentFrame(comment) {
  const encoder = new TextEncoder();
  const lang = encoder.encode('eng'); // 3-byte language code
  const description = encoder.encode('\0'); // Empty description with null
  const textBytes = encoder.encode(comment);
  
  // Frame size: encoding(1) + language(3) + description + text
  const size = 1 + 3 + description.length + textBytes.length;
  const frame = new Uint8Array(10 + size);
  
  // Frame ID
  frame.set(encoder.encode('COMM'), 0);
  
  // Frame size
  frame[4] = (size >> 24) & 0xFF;
  frame[5] = (size >> 16) & 0xFF;
  frame[6] = (size >> 8) & 0xFF;
  frame[7] = size & 0xFF;
  
  // Flags
  frame[8] = 0;
  frame[9] = 0;
  
  let pos = 10;
  
  // Encoding: UTF-8
  frame[pos++] = 0x03;
  
  // Language (eng)
  frame.set(lang, pos);
  pos += 3;
  
  // Description (empty)
  frame.set(description, pos);
  pos += description.length;
  
  // Comment text
  frame.set(textBytes, pos);
  
  return frame;
}

/**
 * Create a private frame for internal data
 */
function createPrivateFrame(ownerId, data) {
  const encoder = new TextEncoder();
  const ownerBytes = encoder.encode(ownerId + '\0'); // Owner identifier with null
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

/**
 * Create APIC (attached picture) frame
 */
function createAPICFrame(coverBuffer) {
  const encoder = new TextEncoder();
  const coverBytes = new Uint8Array(coverBuffer);
  const mime = "image/jpeg";
  const mimeBytes = encoder.encode(mime);
  const description = new Uint8Array([0]); // Empty description with null (ISO-8859-1)
  
  // Frame data size: encoding(1) + mime(+null) + picType(1) + description(+null) + image
  const frameDataSize = 1 + mimeBytes.length + 1 + 1 + description.length + coverBytes.length;
  const frame = new Uint8Array(10 + frameDataSize);
  
  // Frame ID
  frame.set(encoder.encode('APIC'), 0);
  
  // Frame size
  frame[4] = (frameDataSize >> 24) & 0xFF;
  frame[5] = (frameDataSize >> 16) & 0xFF;
  frame[6] = (frameDataSize >> 8) & 0xFF;
  frame[7] = frameDataSize & 0xFF;
  
  // Flags
  frame[8] = 0;
  frame[9] = 0;
  
  let pos = 10;
  
  // Encoding: ISO-8859-1 (0x00) for max compatibility with APIC
  frame[pos++] = 0x00;
  
  // MIME type
  frame.set(mimeBytes, pos);
  pos += mimeBytes.length;
  frame[pos++] = 0; // MIME null terminator
  
  // Picture type: 0x03 = Front Cover
  frame[pos++] = 0x03;
  
  // Description (empty)
  frame.set(description, pos);
  pos += description.length;
  
  // Image data
  frame.set(coverBytes, pos);
  
  return frame;
}

/**
 * Encode size as synchsafe integer for ID3 header
 */
function encodeSynchsafe(size) {
  return [
    (size >> 21) & 0x7F,
    (size >> 14) & 0x7F,
    (size >> 7) & 0x7F,
    size & 0x7F
  ];
}

/**
 * Professional HTML UI with complete metadata form
 */
function getHTML(site) {
  const safeSite = site.replace(/[<>]/g, '');
  const currentYear = new Date().getFullYear();
  const genreOptions = SUPPORTED_GENRES.map(g => 
    `<option value="${g}" ${g === 'Podcast' ? 'selected' : ''}>${g}</option>`
  ).join('');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeSite} - Professional Audio Branding System</title>
  <meta name="description" content="Upload MP3 files to add professional ID3 tags with branding">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .container {
      max-width: 700px;
      width: 100%;
      margin: 0 auto;
    }

    .card {
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(10px);
      border-radius: 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      padding: 40px;
      animation: slideUp 0.5s ease;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
    }

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
      font-weight: 500;
    }

    .subtitle {
      color: #718096;
      font-size: 16px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 20px;
    }

    .form-group {
      margin-bottom: 5px;
    }

    .form-group.full-width {
      grid-column: span 2;
    }

    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #4a5568;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .required::after {
      content: "*";
      color: #e53e3e;
      margin-left: 4px;
    }

    input, select, textarea {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      font-size: 15px;
      transition: all 0.3s;
      background: white;
      font-family: inherit;
    }

    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    input[type="file"] {
      padding: 10px;
      background: #f7fafc;
      cursor: pointer;
      border-style: dashed;
    }

    input[type="file"]:hover {
      border-color: #667eea;
      background: #f0f5ff;
    }

    input[type="file"]::file-selector-button {
      background: #667eea;
      color: white;
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      margin-right: 10px;
      font-weight: 500;
      transition: background 0.2s;
    }

    input[type="file"]::file-selector-button:hover {
      background: #5a67d8;
    }

    .file-info {
      background: #f7fafc;
      border-radius: 10px;
      padding: 15px;
      margin: 15px 0;
      font-size: 14px;
      border-left: 4px solid #667eea;
      transition: all 0.3s;
    }

    .file-info.warning {
      border-left-color: #e53e3e;
      background: #fff5f5;
    }

    .file-info.success {
      border-left-color: #38a169;
      background: #f0fff4;
    }

    .file-info div {
      margin: 4px 0;
      color: #2d3748;
    }

    .progress-bar {
      width: 100%;
      height: 4px;
      background: #e2e8f0;
      border-radius: 2px;
      margin: 10px 0;
      overflow: hidden;
      display: none;
    }

    .progress-bar.active {
      display: block;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      width: 0%;
      transition: width 0.3s;
      animation: shimmer 1s infinite;
    }

    @keyframes shimmer {
      0% { opacity: 1; }
      50% { opacity: 0.7; }
      100% { opacity: 1; }
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
      transition: all 0.3s;
      margin: 20px 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      position: relative;
      overflow: hidden;
    }

    button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
    }

    button:active:not(:disabled) {
      transform: translateY(0);
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      background: #cbd5e0;
    }

    .result {
      background: #f7fafc;
      border-radius: 12px;
      padding: 20px;
      margin-top: 20px;
      animation: fadeIn 0.5s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .result.success {
      background: #f0fff4;
      border: 2px solid #38a169;
    }

    .result.error {
      background: #fff5f5;
      border: 2px solid #e53e3e;
    }

    .result-title {
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
    }

    .url-box {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      margin: 10px 0;
      font-family: 'Monaco', 'Menlo', monospace;
      word-break: break-all;
      font-size: 14px;
    }

    .button-group {
      display: flex;
      gap: 10px;
      margin-top: 15px;
    }

    .copy-btn, .download-btn {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      transition: all 0.2s;
    }

    .copy-btn {
      background: #4299e1;
      color: white;
    }

    .copy-btn:hover {
      background: #3182ce;
    }

    .download-btn {
      background: #48bb78;
      color: white;
    }

    .download-btn:hover {
      background: #38a169;
    }

    .metadata-summary {
      margin-top: 15px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 8px;
      font-size: 13px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 8px;
    }

    .metadata-item {
      color: #4a5568;
    }

    .metadata-item strong {
      color: #2d3748;
      margin-right: 5px;
    }

    .footer {
      text-align: center;
      margin-top: 20px;
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
    }

    .features {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
      margin-top: 10px;
    }

    .feature-tag {
      background: rgba(255, 255, 255, 0.2);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      backdrop-filter: blur(5px);
    }

    @media (max-width: 640px) {
      .card { padding: 20px; }
      .form-grid { grid-template-columns: 1fr; }
      .form-group.full-width { grid-column: span 1; }
      .button-group { flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>
          🎵 ${safeSite}
          <span class="badge">PRO</span>
        </h1>
        <div class="subtitle">
          Professional Audio Branding System • Complete ID3 Tags
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label class="required">🎤 Artist</label>
          <input type="text" id="artist" placeholder="Drake" value="Unknown Artist">
        </div>

        <div class="form-group">
          <label class="required">📝 Title</label>
          <input type="text" id="title" placeholder="God's Plan" value="Unknown Title">
        </div>

        <div class="form-group">
          <label>💿 Album</label>
          <input type="text" id="album" placeholder="Album Name" value="${safeSite} Release">
        </div>

        <div class="form-group">
          <label>📅 Year</label>
          <input type="text" id="year" placeholder="2024" value="${currentYear}">
        </div>

        <div class="form-group">
          <label>🎵 Genre</label>
          <select id="genre">
            ${genreOptions}
          </select>
        </div>

        <div class="form-group">
          <label>🔢 Track</label>
          <input type="text" id="track" placeholder="1 or 1/12" value="1">
        </div>

        <div class="form-group full-width">
          <label>💬 Comment</label>
          <textarea id="comment" rows="2" placeholder="Additional comments...">Branded by ${safeSite}</textarea>
        </div>

        <div class="form-group full-width">
          <label class="required">📁 MP3 File</label>
          <input type="file" id="file" accept=".mp3,audio/mpeg,audio/mp3">
          <div class="progress-bar" id="progressBar">
            <div class="progress-bar-fill" id="progressFill"></div>
          </div>
          <div id="fileInfo" class="file-info" style="display: none;"></div>
        </div>
      </div>

      <button id="uploadBtn" disabled>
        <span>⬆️</span>
        Process & Upload MP3
      </button>

      <div id="result"></div>
    </div>
    
    <div class="footer">
      <div class="features">
        <span class="feature-tag">✨ Complete ID3 Tags</span>
        <span class="feature-tag">📦 15MB Limit</span>
        <span class="feature-tag">🖼️ Watermark Support</span>
        <span class="feature-tag">⚡ Instant Processing</span>
      </div>
    </div>
  </div>

  <script>
    // Configuration
    const MAX_SIZE = ${MAX_FILE_SIZE};
    let audioContext = null;
    let durationMs = 0;
    
    // Initialize AudioContext
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      // Resume on user interaction
      document.addEventListener('click', () => {
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume();
        }
      }, { once: true });
    } catch (e) {
      console.warn('AudioContext not supported');
    }

    // DOM Elements
    const fileInput = document.getElementById('file');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInfo = document.getElementById('fileInfo');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');

    // File input handler
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      
      if (!file) {
        fileInfo.style.display = 'none';
        uploadBtn.disabled = true;
        return;
      }

      // Basic validation
      if (!file.name.toLowerCase().endsWith('.mp3')) {
        showFileInfo('❌ File must be an MP3 audio file', 'warning');
        uploadBtn.disabled = true;
        return;
      }

      if (file.size > MAX_SIZE) {
        showFileInfo(\`❌ File too large: \${(file.size / 1024 / 1024).toFixed(2)}MB (max 15MB)\`, 'warning');
        uploadBtn.disabled = true;
        return;
      }

      // Show file info
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      showFileInfo(\`📊 File: \${file.name}\\n📦 Size: \${sizeMB}MB\\n⏱️ Analyzing duration...\`, 'info');

      // Try to get duration
      if (audioContext) {
        try {
          const buffer = await file.arrayBuffer();
          const decoded = await audioContext.decodeAudioData(buffer.slice(0));
          durationMs = Math.floor(decoded.duration * 1000);
          const durationStr = formatDuration(decoded.duration);
          showFileInfo(\`📊 File: \${file.name}\\n📦 Size: \${sizeMB}MB\\n⏱️ Duration: \${durationStr}\`, 'success');
        } catch (err) {
          console.warn('Could not decode duration:', err);
          showFileInfo(\`📊 File: \${file.name}\\n📦 Size: \${sizeMB}MB\\n⏱️ Duration: Unknown\`, 'info');
        }
      } else {
        showFileInfo(\`📊 File: \${file.name}\\n📦 Size: \${sizeMB}MB\\n⏱️ Duration: Unknown\`, 'info');
      }

      uploadBtn.disabled = false;
    });

    function showFileInfo(message, type) {
      const lines = message.split('\\n');
      fileInfo.innerHTML = lines.map(line => \`<div>\${line}</div>\`).join('');
      fileInfo.className = 'file-info ' + (type === 'warning' ? 'warning' : type === 'success' ? 'success' : '');
      fileInfo.style.display = 'block';
    }

    function formatDuration(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return \`\${mins}:\${secs.toString().padStart(2, '0')}\`;
    }

    function showProgress(percent) {
      progressBar.classList.add('active');
      progressFill.style.width = percent + '%';
    }

    function hideProgress() {
      progressBar.classList.remove('active');
      progressFill.style.width = '0%';
    }

    // Upload handler
    document.getElementById('uploadBtn').addEventListener('click', async () => {
      const file = fileInput.files[0];
      if (!file) {
        alert('Please select an MP3 file');
        return;
      }

      // Double-check size
      if (file.size > MAX_SIZE) {
        alert('File too large (max 15MB)');
        return;
      }

      // Validate required fields
      const artist = document.getElementById('artist').value.trim();
      const title = document.getElementById('title').value.trim();
      
      if (!artist) {
        alert('Please enter an artist name');
        return;
      }
      if (!title) {
        alert('Please enter a title');
        return;
      }

      // Get form values
      const formData = new FormData();
      formData.append('file', file);
      formData.append('artist', artist);
      formData.append('title', title);
      formData.append('album', document.getElementById('album').value.trim());
      formData.append('year', document.getElementById('year').value.trim());
      formData.append('genre', document.getElementById('genre').value);
      formData.append('track', document.getElementById('track').value.trim());
      formData.append('comment', document.getElementById('comment').value.trim());
      formData.append('duration', durationMs);

      // Disable button and show progress
      const btn = document.getElementById('uploadBtn');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span>⏳</span> Processing...';
      btn.disabled = true;
      showProgress(30);

      try {
        const response = await fetch('/upload', {
          method: 'POST',
          body: formData
        });

        showProgress(80);
        const data = await response.json();

        if (data.success) {
          const fullUrl = window.location.origin + data.url;
          
          // Build metadata summary
          const metadataItems = [
            { label: 'Title', value: data.metadata.title },
            { label: 'Artist', value: data.metadata.artist },
            { label: 'Album', value: data.metadata.album },
            { label: 'Year', value: data.metadata.year },
            { label: 'Genre', value: data.metadata.genre }
          ].filter(item => item.value).map(item => 
            \`<div class="metadata-item"><strong>\${item.label}:</strong> \${item.value}</div>\`
          ).join('');
          
          document.getElementById('result').innerHTML = \`
            <div class="result success">
              <div class="result-title">✅ Success! File Branded with ${safeSite} Metadata</div>
              <div class="url-box">\${fullUrl}</div>
              <div class="button-group">
                <button class="copy-btn" onclick="copyToClipboard('\${fullUrl}')">
                  <span>📋</span> Copy URL
                </button>
                <button class="download-btn" onclick="window.open('\${fullUrl}', '_blank')">
                  <span>⬇️</span> Download
                </button>
              </div>
              <div class="metadata-summary">
                \${metadataItems}
                <div class="metadata-item"><strong>Duration:</strong> \${data.duration ? formatDuration(data.duration/1000) : 'Unknown'}</div>
                <div class="metadata-item"><strong>Size:</strong> \${(data.size/1024/1024).toFixed(2)}MB</div>
              </div>
            </div>
          \`;
          showProgress(100);
        } else {
          throw new Error(data.error || 'Upload failed');
        }
      } catch (err) {
        document.getElementById('result').innerHTML = \`
          <div class="result error">
            <div class="result-title">❌ Error</div>
            <div>\${err.message}</div>
          </div>
        \`;
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        setTimeout(hideProgress, 1000);
      }
    });

    // Copy to clipboard function
    window.copyToClipboard = (text) => {
      navigator.clipboard.writeText(text).then(
        () => {
          // Show temporary success message
          const btn = document.querySelector('.copy-btn');
          const originalText = btn.innerHTML;
          btn.innerHTML = '<span>✅</span> Copied!';
          setTimeout(() => {
            btn.innerHTML = originalText;
          }, 2000);
        },
        () => alert('Press Ctrl+C to copy')
      );
    };

    // Load demo data if ?demo=true
    if (window.location.search.includes('demo')) {
      document.getElementById('artist').value = 'Drake';
      document.getElementById('title').value = "God's Plan";
      document.getElementById('album').value = 'Scorpion';
      document.getElementById('year').value = '2018';
      document.getElementById('track').value = '4/25';
      document.getElementById('genre').value = 'Hip-Hop';
    }
  </script>
</body>
</html>`;
}