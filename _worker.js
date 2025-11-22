// Cloudflare Pages Worker for HS Hosting
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, *',
    };

    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Serve HTML interface for root
    if (path === '/' || path === '/index.html') {
      return await serveHTMLInterface(corsHeaders);
    }

    // API Routes
    try {
      // Upload file API - POST /upload
      if (path === '/upload' && request.method === 'POST') {
        return await handleFileUpload(request, corsHeaders);
      }
      
      // Upload from URL API - GET /hosturl
      if (path === '/hosturl' && request.method === 'GET') {
        return await handleUrlUpload(request, corsHeaders);
      }
      
      // File serving - any other path
      if (request.method === 'GET' && path !== '/') {
        return await handleFileServe(request, corsHeaders);
      }
      
      // API not found
      return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// Serve HTML interface
async function serveHTMLInterface(corsHeaders) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HS Hosting - File Upload Service</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background: linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d); color: #fff; min-height: 100vh; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        header { text-align: center; padding: 40px 0; }
        header h1 { font-size: 3rem; margin-bottom: 10px; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3); }
        header p { font-size: 1.2rem; opacity: 0.9; max-width: 600px; margin: 0 auto; }
        .upload-section { display: flex; flex-wrap: wrap; gap: 30px; margin: 40px 0; }
        .upload-card { flex: 1; min-width: 300px; background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 15px; padding: 30px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.1); }
        .upload-card h2 { font-size: 1.8rem; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        .upload-form { display: flex; flex-direction: column; gap: 20px; }
        .file-input-container { position: relative; overflow: hidden; display: inline-block; width: 100%; }
        .file-input-container input[type="file"] { position: absolute; left: 0; top: 0; opacity: 0; width: 100%; height: 100%; cursor: pointer; }
        .file-input-label { display: block; padding: 15px; background: rgba(255, 255, 255, 0.1); border: 2px dashed rgba(255, 255, 255, 0.3); border-radius: 10px; text-align: center; cursor: pointer; transition: all 0.3s ease; }
        .file-input-label:hover { background: rgba(255, 255, 255, 0.2); border-color: rgba(255, 255, 255, 0.5); }
        .url-input { width: 100%; padding: 15px; border: none; border-radius: 10px; background: rgba(255, 255, 255, 0.1); color: white; font-size: 1rem; border: 2px solid rgba(255, 255, 255, 0.1); }
        .url-input:focus { outline: none; border-color: #fdbb2d; }
        .url-input::placeholder { color: rgba(255, 255, 255, 0.6); }
        .upload-btn { padding: 15px; border: none; border-radius: 10px; background: linear-gradient(to right, #fdbb2d, #b21f1f); color: white; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .upload-btn:hover { transform: translateY(-3px); box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3); }
        .upload-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
        .response-section { margin-top: 40px; background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 15px; padding: 30px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.1); }
        .response-section h2 { font-size: 1.8rem; margin-bottom: 20px; }
        .response-box { background: rgba(0, 0, 0, 0.2); border-radius: 10px; padding: 20px; min-height: 100px; font-family: monospace; white-space: pre-wrap; overflow-x: auto; }
        .instructions { margin-top: 40px; background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 15px; padding: 30px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.1); }
        .instructions h2 { font-size: 1.8rem; margin-bottom: 20px; }
        .instructions ul { padding-left: 20px; margin-bottom: 20px; }
        .instructions li { margin-bottom: 10px; line-height: 1.5; }
        footer { text-align: center; margin-top: 40px; padding: 20px; opacity: 0.8; }
        .loading { display: none; text-align: center; margin: 20px 0; }
        .spinner { border: 4px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top: 4px solid #fdbb2d; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .success { color: #4ade80; }
        .error { color: #f87171; }
        .link-preview { margin-top: 15px; padding: 10px; background: rgba(255, 255, 255, 0.1); border-radius: 5px; }
        .link-preview a { color: #fdbb2d; text-decoration: none; word-break: break-all; }
        .link-preview a:hover { text-decoration: underline; }
        @media (max-width: 768px) {
            header h1 { font-size: 2.2rem; }
            .upload-card { min-width: 100%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>HS Hosting</h1>
            <p>Upload and host your media files with our easy-to-use service</p>
        </header>
        
        <div class="upload-section">
            <div class="upload-card">
                <h2><i>📁</i> Direct File Upload</h2>
                <form class="upload-form" id="fileUploadForm">
                    <div class="file-input-container">
                        <label class="file-input-label" id="fileInputLabel">
                            <span>Choose a file (Max 20MB)</span>
                        </label>
                        <input type="file" id="fileInput" name="file" required>
                    </div>
                    <button type="submit" class="upload-btn" id="fileUploadBtn">
                        <span>Upload File</span>
                        <i>⬆️</i>
                    </button>
                </form>
            </div>
            
            <div class="upload-card">
                <h2><i>🔗</i> Upload from URL</h2>
                <form class="upload-form" id="urlUploadForm">
                    <input type="url" class="url-input" id="urlInput" placeholder="Enter media URL (e.g., https://example.com/image.jpg)" required>
                    <button type="submit" class="upload-btn" id="urlUploadBtn">
                        <span>Upload from URL</span>
                        <i>🌐</i>
                    </button>
                </form>
            </div>
        </div>
        
        <div class="loading" id="loadingIndicator">
            <div class="spinner"></div>
            <p>Uploading your file...</p>
        </div>
        
        <div class="response-section">
            <h2>Upload Response</h2>
            <div class="response-box" id="responseBox">
                Your upload response will appear here...
            </div>
            <div class="link-preview" id="linkPreview" style="display: none;">
                <strong>Direct Link: </strong><a href="#" id="fileLink" target="_blank"></a>
            </div>
        </div>
        
        <div class="instructions">
            <h2>How to Use</h2>
            <ul>
                <li><strong>Direct Upload:</strong> Select a file from your device (max 20MB) and click "Upload File"</li>
                <li><strong>URL Upload:</strong> Paste a direct URL to a media file and click "Upload from URL"</li>
                <li>Supported file types: Images, videos, documents, and other media files</li>
                <li>After upload, you'll receive a response with the hosted file URL</li>
                <li>Click on the generated link to view your uploaded file</li>
            </ul>
        </div>
        
        <footer>
            <p>HS Hosting Service &copy; 2023 | Powered by HS Hosting</p>
        </footer>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const fileUploadForm = document.getElementById('fileUploadForm');
            const urlUploadForm = document.getElementById('urlUploadForm');
            const fileInput = document.getElementById('fileInput');
            const fileInputLabel = document.getElementById('fileInputLabel');
            const urlInput = document.getElementById('urlInput');
            const responseBox = document.getElementById('responseBox');
            const loadingIndicator = document.getElementById('loadingIndicator');
            const fileUploadBtn = document.getElementById('fileUploadBtn');
            const urlUploadBtn = document.getElementById('urlUploadBtn');
            const linkPreview = document.getElementById('linkPreview');
            const fileLink = document.getElementById('fileLink');
            
            // API endpoints - Same domain
            const UPLOAD_API_URL = "/upload";
            const HOSTURL_API_URL = "/hosturl";
            
            // Update file input label with selected file name
            fileInput.addEventListener('change', function() {
                if (this.files.length > 0) {
                    fileInputLabel.innerHTML = '<span>Selected: ' + this.files[0].name + '</span>';
                } else {
                    fileInputLabel.innerHTML = '<span>Choose a file (Max 20MB)</span>';
                }
            });
            
            // Handle direct file upload
            fileUploadForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                if (!fileInput.files.length) {
                    showError('Please select a file to upload.');
                    return;
                }
                
                const file = fileInput.files[0];
                
                // Check file size (20MB limit)
                if (file.size > 20 * 1024 * 1024) {
                    showError('File size exceeds 20MB limit.');
                    return;
                }
                
                await uploadFile(file);
            });
            
            // Handle URL upload
            urlUploadForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const url = urlInput.value.trim();
                
                if (!url) {
                    showError('Please enter a valid URL.');
                    return;
                }
                
                await uploadFromUrl(url);
            });
            
            async function uploadFile(file) {
                showLoading(true, fileUploadBtn);
                hideLinkPreview();
                
                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    const response = await fetch(UPLOAD_API_URL, {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error('HTTP error! status: ' + response.status + '. ' + errorText);
                    }
                    
                    const data = await response.json();
                    
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    
                    showSuccess(JSON.stringify(data, null, 2));
                    
                    // Show clickable link if available
                    if (data.url) {
                        showLinkPreview(data.url);
                    }
                    
                } catch (error) {
                    showError('Upload failed: ' + error.message);
                } finally {
                    showLoading(false, fileUploadBtn);
                }
            }
            
            async function uploadFromUrl(url) {
                showLoading(true, urlUploadBtn);
                hideLinkPreview();
                
                try {
                    const response = await fetch(HOSTURL_API_URL + '?url=' + encodeURIComponent(url));
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error('HTTP error! status: ' + response.status + '. ' + errorText);
                    }
                    
                    const data = await response.json();
                    
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    
                    showSuccess(JSON.stringify(data, null, 2));
                    
                    // Show clickable link if available
                    if (data.url) {
                        showLinkPreview(data.url);
                    }
                    
                } catch (error) {
                    showError('URL upload failed: ' + error.message);
                } finally {
                    showLoading(false, urlUploadBtn);
                }
            }
            
            function showLoading(show, button) {
                if (show) {
                    loadingIndicator.style.display = 'block';
                    button.disabled = true;
                } else {
                    loadingIndicator.style.display = 'none';
                    button.disabled = false;
                }
            }
            
            function showSuccess(message) {
                responseBox.textContent = message;
                responseBox.className = 'response-box success';
            }
            
            function showError(message) {
                responseBox.textContent = message;
                responseBox.className = 'response-box error';
            }
            
            function showLinkPreview(url) {
                fileLink.href = url;
                fileLink.textContent = url;
                linkPreview.style.display = 'block';
            }
            
            function hideLinkPreview() {
                linkPreview.style.display = 'none';
            }
        });
    </script>
</body>
</html>`;
  
  return new Response(html, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8'
    }
  });
}

// Handle direct file upload
async function handleFileUpload(request, corsHeaders) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Check file size (20MB limit)
    const fileBuffer = await file.arrayBuffer();
    if (fileBuffer.byteLength > 20 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File size exceeds 20MB limit' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Forward to ar-hosting API
    const arFormData = new FormData();
    arFormData.append('file', new Blob([fileBuffer]), file.name);
    
    const uploadResponse = await fetch('https://ar-hosting.pages.dev/upload', {
      method: 'POST',
      body: arFormData
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed with status: ${uploadResponse.status}`);
    }
    
    const responseData = await uploadResponse.json();
    
    // Replace domain in response
    const modifiedData = replaceDomainInResponse(responseData, request.url);
    
    return new Response(JSON.stringify(modifiedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: `Upload failed: ${error.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handle URL upload
async function handleUrlUpload(request, corsHeaders) {
  try {
    const url = new URL(request.url);
    const mediaUrl = url.searchParams.get('url');
    
    if (!mediaUrl) {
      return new Response(JSON.stringify({ error: 'URL parameter is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Validate URL
    try {
      new URL(mediaUrl);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Forward to ar-hosting API
    const uploadResponse = await fetch(`https://ar-hosting.pages.dev/hosturl?url=${encodeURIComponent(mediaUrl)}`);
    
    if (!uploadResponse.ok) {
      throw new Error(`URL upload failed with status: ${uploadResponse.status}`);
    }
    
    const responseData = await uploadResponse.json();
    
    // Replace domain in response
    const modifiedData = replaceDomainInResponse(responseData, request.url);
    
    return new Response(JSON.stringify(modifiedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: `URL upload failed: ${error.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handle file serving
async function handleFileServe(request, corsHeaders) {
  try {
    const filename = request.url.split('/').pop();
    
    if (!filename || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
      return new Response(JSON.stringify({ error: 'Invalid filename' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Fetch file from ar-hosting
    const fileResponse = await fetch(`https://ar-hosting.pages.dev/${filename}`);
    
    if (!fileResponse.ok) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Get content type
    const contentType = fileResponse.headers.get('content-type') || getContentTypeFromFilename(filename);
    const fileData = await fileResponse.arrayBuffer();
    
    return new Response(fileData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: `File serve failed: ${error.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Replace domain in response
function replaceDomainInResponse(data, workerUrl) {
  const workerDomain = new URL(workerUrl).origin;
  
  if (typeof data === 'string') {
    return data.replace(/https:\/\/ar-hosting\.pages\.dev/g, workerDomain);
  } else if (typeof data === 'object' && data !== null) {
    const newData = {};
    for (const key in data) {
      newData[key] = replaceDomainInResponse(data[key], workerUrl);
    }
    return newData;
  }
  return data;
}

// Get content type from filename
function getContentTypeFromFilename(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const contentTypes = {
    'html': 'text/html',
    'htm': 'text/html',
    'txt': 'text/plain',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'pdf': 'application/pdf',
    'mp4': 'video/mp4',
    'mp3': 'audio/mpeg',
    'zip': 'application/zip',
    'json': 'application/json'
  };
  return contentTypes[ext] || 'application/octet-stream';
}