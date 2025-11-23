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
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>HS Hosting - Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', 'Roboto', Helvetica, Arial, sans-serif;
            -webkit-tap-highlight-color: transparent;
        }

        :root {
            --primary: #4f46e5;
            --bg-dark: #0f172a;
            --bg-card: #1e293b;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --success: #10b981;
            --border: rgba(255, 255, 255, 0.1);
        }

        body {
            background-color: var(--bg-dark);
            background-image: radial-gradient(circle at top, #1e293b 0%, var(--bg-dark) 100%);
            color: var(--text-main);
            min-height: 100vh;
            padding: 15px;
            overflow-x: hidden;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
            padding-bottom: 50px;
        }

        /* Header */
        header { text-align: center; margin-bottom: 25px; padding-top: 10px; }
        .logo {
            font-size: 2.2rem; font-weight: 800;
            background: linear-gradient(135deg, #6366f1, #ec4899);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            margin-bottom: 5px;
        }
        .tagline { color: var(--text-muted); font-size: 1rem; }

        /* Stats */
        .stats-container {
            display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 25px;
        }
        .stat-card {
            background: var(--bg-card); border: 1px solid var(--border);
            padding: 15px 10px; border-radius: 16px; text-align: center;
        }
        .stat-value { font-size: 1.5rem; font-weight: 700; margin-bottom: 2px; }
        .stat-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }

        /* Upload Section */
        .upload-wrapper {
            background: var(--bg-card); border-radius: 24px; padding: 20px;
            border: 1px solid var(--border); box-shadow: 0 20px 40px -5px rgba(0,0,0,0.4);
            margin-bottom: 20px;
        }
        .upload-area {
            border: 2px dashed rgba(255,255,255,0.15); background: rgba(0,0,0,0.2);
            border-radius: 16px; padding: 30px 15px; text-align: center; transition: all 0.3s ease;
        }
        .upload-area.drag-over { border-color: var(--primary); background: rgba(79, 70, 229, 0.1); }
        .upload-icon { font-size: 3.5rem; margin-bottom: 15px; display: block; }
        
        /* Buttons */
        .main-actions {
            display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
            max-width: 600px; margin: 0 auto;
        }
        .btn-main {
            padding: 12px; border-radius: 12px; border: none; font-size: 0.95rem;
            font-weight: 600; cursor: pointer; display: flex; align-items: center;
            justify-content: center; gap: 8px; color: white;
        }
        .btn-browse { background: var(--primary); }
        .btn-url { background: #334155; border: 1px solid var(--border); }
        .file-input { display: none; }

        /* Processing Area */
        .file-status-area { margin-top: 25px; display: none; }
        .file-card {
            background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px;
            display: flex; align-items: center; gap: 15px; margin-bottom: 15px;
        }
        .file-details { flex: 1; overflow: hidden; }
        .file-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .btn-confirm { flex: 1; padding: 12px; border-radius: 10px; border: none; font-weight: bold; cursor: pointer; color: white; }
        .btn-start { background: var(--success); }
        .btn-cancel { background: #ef4444; }
        .confirm-actions { display: flex; gap: 10px; }
        
        /* Progress Bar */
        .progress-container {
            height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; margin-top: 10px;
        }
        .progress-bar {
            height: 100%; background: linear-gradient(90deg, var(--primary), #ec4899); width: 0%; transition: width 0.3s;
        }
        .progress-bar.animated { width: 100%; animation: shimmer 2s infinite linear; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        /* Success Response Area */
        .response-wrapper {
            background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 20px; padding: 20px; margin-bottom: 25px;
            display: none; animation: slideDown 0.4s ease;
        }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

        .response-header {
            display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;
            border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;
        }
        .success-badge { color: var(--success); font-weight: 800; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; }
        .close-resp-btn { background: none; border: none; color: var(--text-muted); font-size: 1.2rem; cursor: pointer; padding: 5px; }
        
        .resp-body { display: flex; flex-direction: column; gap: 15px; }
        .resp-info { background: rgba(0,0,0,0.2); padding: 12px; border-radius: 10px; }
        .resp-filename { font-weight: 600; word-break: break-all; color: white; margin-bottom: 5px; }
        .resp-time { font-size: 0.85rem; color: var(--text-muted); }

        .resp-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .btn-resp { padding: 10px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; color: white; font-size: 0.9rem; }
        .btn-resp-copy { background: var(--primary); }
        .btn-resp-open { background: var(--success); }

        /* Recent Files */
        .recent-wrapper {
            background: var(--bg-card); border-radius: 24px; padding: 20px; border: 1px solid var(--border); margin-bottom: 30px;
        }
        .section-title {
            font-size: 1.1rem; margin-bottom: 15px; font-weight: 700;
            display: flex; justify-content: space-between; align-items: center;
        }
        .recent-grid { display: flex; flex-direction: column; gap: 10px; }
        .recent-item {
            background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05);
            padding: 12px; border-radius: 12px; display: flex; align-items: center; gap: 12px;
        }
        .recent-info { flex: 1; min-width: 0; }
        .recent-name {
            font-size: 0.9rem; font-weight: 600;
            white-space: normal; word-break: break-word; overflow-wrap: break-word; line-height: 1.4;
            margin-bottom: 3px; color: #e2e8f0;
        }
        .recent-meta { font-size: 0.75rem; color: var(--text-muted); }
        .recent-btn {
            background: rgba(255,255,255,0.1); color: var(--text-main);
            border: none; width: 35px; height: 35px; border-radius: 8px;
            cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        /* --- NEW INFO SECTION STYLES --- */
        .info-grid {
            display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px;
        }
        .info-card {
            background: var(--bg-card); border: 1px solid var(--border);
            padding: 20px; border-radius: 20px;
        }
        .info-title {
            font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-bottom: 15px;
            display: flex; align-items: center; gap: 8px;
        }
        .info-list { list-style: none; }
        .info-list li {
            margin-bottom: 10px; color: var(--text-muted); font-size: 0.9rem;
            display: flex; align-items: start; gap: 8px;
        }
        .info-icon { color: var(--primary); font-weight: bold; }
        .tag-container { display: flex; flex-wrap: wrap; gap: 8px; }
        .file-tag {
            background: rgba(255,255,255,0.05); border: 1px solid var(--border);
            padding: 5px 12px; border-radius: 50px; font-size: 0.8rem; color: #cbd5e1;
        }

        /* URL Popup */
        .url-popup {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); z-index: 1500; display: none; align-items: center; justify-content: center; padding: 20px;
        }
        .url-popup.active { display: flex; }
        .popup-box {
            background: var(--bg-card); width: 100%; max-width: 500px; padding: 25px; border-radius: 20px; border: 1px solid var(--border);
        }
        .popup-input {
            width: 100%; padding: 15px; background: rgba(0,0,0,0.3); border: 1px solid var(--border);
            border-radius: 10px; color: white; margin: 15px 0; font-size: 1rem;
        }

        /* Notification */
        .notification {
            position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(100px);
            background: var(--success); padding: 12px 24px; border-radius: 50px;
            color: white; font-weight: bold; transition: transform 0.3s; z-index: 3000;
            white-space: nowrap; box-shadow: 0 10px 20px rgba(0,0,0,0.3);
        }
        .notification.show { transform: translateX(-50%) translateY(0); }
        .notification.error { background: #ef4444; }

        @media (max-width: 768px) {
            .stats-container { grid-template-columns: 1fr 1fr; gap: 8px; }
            .main-actions { grid-template-columns: 1fr; }
            .info-grid { grid-template-columns: 1fr; gap: 15px; } /* Stack info cards on mobile */
        }
    </style>
</head>
<body>

    <div class="container">
        <header>
            <div class="logo">HS Hosting</div>
            <div class="tagline">Professional File Distribution</div>
        </header>

        <div class="stats-container">
            <div class="stat-card">
                <div class="stat-value" id="totalUploads">0</div>
                <div class="stat-label">Files</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="todayUploads">0</div>
                <div class="stat-label">Today</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="totalSize">0</div>
                <div class="stat-label">Used</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="activeFiles">0</div>
                <div class="stat-label">Active</div>
            </div>
        </div>

        <div class="upload-wrapper">
            <div class="upload-area" id="uploadArea">
                <div class="upload-icon">☁️</div>
                <div class="upload-text">Upload Your Files</div>
                <div class="upload-sub" style="color:#94a3b8; margin-bottom:20px;">Max 20MB • All Formats</div>
                
                <div class="main-actions">
                    <button class="btn-main btn-browse" onclick="document.getElementById('fileInput').click()">
                        <span>📂</span> Browse Files
                    </button>
                    <button class="btn-main btn-url" id="urlPopupBtn">
                        <span>🔗</span> URL Upload
                    </button>
                </div>
                <input type="file" class="file-input" id="fileInput">
            </div>

            <div class="file-status-area" id="fileStatusArea">
                <div class="file-card">
                    <div style="font-size: 2rem;">📄</div>
                    <div class="file-details">
                        <div class="file-name" id="selectedFileName">filename.jpg</div>
                        <div style="font-size:0.9rem; color:#94a3b8;" id="selectedFileSize">2.5 MB</div>
                    </div>
                </div>
                
                <div id="actionContainer">
                    <div class="confirm-actions">
                        <button class="btn-confirm btn-cancel" id="cancelBtn">Cancel</button>
                        <button class="btn-confirm btn-start" id="uploadNowBtn">Upload</button>
                    </div>
                </div>

                <div id="progressContainer" style="display: none;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 5px;">
                        <span>Uploading...</span>
                        <span>Please wait</span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar" id="progressBar"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="response-wrapper" id="responseWrapper">
            <div class="response-header">
                <div class="success-badge">✅ Upload Successful</div>
                <button class="close-resp-btn" onclick="closeResponse()">✖</button>
            </div>
            <div class="resp-body">
                <div class="resp-info">
                    <div class="resp-filename" id="respFileName">file_name_here.jpg</div>
                    <div class="resp-time" id="respTime">10:30 AM</div>
                    <div id="respUrl" style="display:none;"></div> 
                </div>
                <div class="resp-actions">
                    <button class="btn-resp btn-resp-copy" onclick="copyNewResult()">📋 Copy URL</button>
                    <button class="btn-resp btn-resp-open" onclick="openNewResult()">🔗 Test / Open</button>
                </div>
            </div>
        </div>

        <div class="recent-wrapper" id="recentWrapper" style="display: none;">
            <div class="section-title">
                <span>🕒 Recent Uploads</span>
                <button onclick="clearHistory()" style="background:none; border:none; color:#ef4444; cursor:pointer;">Clear</button>
            </div>
            <div class="recent-grid" id="recentList">
                </div>
        </div>

        <div class="info-grid">
            <div class="info-card">
                <div class="info-title">📖 How to Use</div>
                <ul class="info-list">
                    <li><span class="info-icon">1.</span> Select a file or paste a URL.</li>
                    <li><span class="info-icon">2.</span> Click 'Upload' and wait for processing.</li>
                    <li><span class="info-icon">3.</span> Copy the link or open it directly.</li>
                    <li><span class="info-icon">4.</span> Files are instantly available globally.</li>
                </ul>
            </div>
            
            <div class="info-card">
                <div class="info-title">✨ Supported & Limits</div>
                <div style="margin-bottom: 10px; color: var(--text-muted); font-size: 0.9rem;">
                    Max file size: <strong style="color: var(--text-main);">20 MB</strong>
                </div>
                <div class="tag-container">
                    <span class="file-tag">📸 Images (JPG, PNG)</span>
                    <span class="file-tag">🎬 Videos (MP4)</span>
                    <span class="file-tag">🎵 Audio (MP3)</span>
                    <span class="file-tag">📄 Docs (PDF, TXT)</span>
                    <span class="file-tag">📦 Archives (ZIP)</span>
                    <span class="file-tag">💻 Code (JS, HTML)</span>
                </div>
            </div>
        </div>

    </div>

    <div class="url-popup" id="urlPopup">
        <div class="popup-box">
            <h3 style="margin-bottom:15px">Paste File URL</h3>
            <input type="url" class="popup-input" id="urlInput" placeholder="https://example.com/file.png">
            <div class="confirm-actions">
                <button class="btn-confirm btn-cancel" onclick="closeUrlPopup()">Close</button>
                <button class="btn-confirm btn-start" id="startUrlUpload">Upload</button>
            </div>
        </div>
    </div>

    <div class="notification" id="notification"></div>

    <script>
        const UPLOAD_API = "/upload";
        const URL_API = "/hosturl";

        // DOM Elements
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');
        const fileStatusArea = document.getElementById('fileStatusArea');
        const selectedFileName = document.getElementById('selectedFileName');
        const selectedFileSize = document.getElementById('selectedFileSize');
        const actionContainer = document.getElementById('actionContainer');
        const progressContainer = document.getElementById('progressContainer');
        const progressBar = document.getElementById('progressBar');
        const urlPopup = document.getElementById('urlPopup');
        
        // Response Elements
        const responseWrapper = document.getElementById('responseWrapper');
        const respFileName = document.getElementById('respFileName');
        const respTime = document.getElementById('respTime');
        const respUrl = document.getElementById('respUrl');
        
        const recentWrapper = document.getElementById('recentWrapper');
        const recentList = document.getElementById('recentList');
        
        let currentFile = null;

        document.addEventListener('DOMContentLoaded', () => {
            loadStats();
            loadRecent();
        });

        // --- Stats ---
        function loadStats() {
            const stats = JSON.parse(localStorage.getItem('hs_stats')) || { total: 0, today: 0, size: 0, active: 0 };
            const today = new Date().toDateString();
            if (localStorage.getItem('hs_date') !== today) {
                stats.today = 0;
                localStorage.setItem('hs_date', today);
                localStorage.setItem('hs_stats', JSON.stringify(stats));
            }
            document.getElementById('totalUploads').innerText = stats.total;
            document.getElementById('todayUploads').innerText = stats.today;
            document.getElementById('totalSize').innerText = formatSize(stats.size);
            document.getElementById('activeFiles').innerText = stats.active;
        }

        function updateStats(size) {
            const stats = JSON.parse(localStorage.getItem('hs_stats')) || { total: 0, today: 0, size: 0, active: 0 };
            stats.total++;
            stats.today++;
            stats.size += size;
            stats.active++;
            localStorage.setItem('hs_stats', JSON.stringify(stats));
            loadStats();
        }

        // --- File Handling ---
        fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
        uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            handleFile(e.dataTransfer.files[0]);
        });

        function handleFile(file) {
            if (!file) return;
            currentFile = file;
            selectedFileName.innerText = file.name;
            selectedFileSize.innerText = formatSize(file.size);
            fileStatusArea.style.display = 'block';
            actionContainer.style.display = 'block';
            progressContainer.style.display = 'none';
            responseWrapper.style.display = 'none';
        }

        document.getElementById('cancelBtn').addEventListener('click', () => {
            currentFile = null;
            fileInput.value = '';
            fileStatusArea.style.display = 'none';
        });

        document.getElementById('uploadNowBtn').addEventListener('click', () => {
            if (currentFile) startUploadProcess(currentFile);
        });

        // --- URL Upload ---
        document.getElementById('urlPopupBtn').addEventListener('click', () => urlPopup.classList.add('active'));
        window.closeUrlPopup = () => urlPopup.classList.remove('active');
        
        document.getElementById('startUrlUpload').addEventListener('click', async () => {
            const url = document.getElementById('urlInput').value.trim();
            if (!url) return showNotify('Enter a valid URL', 'error');
            
            closeUrlPopup();
            fileStatusArea.style.display = 'block';
            responseWrapper.style.display = 'none';
            
            selectedFileName.innerText = "Processing URL...";
            selectedFileSize.innerText = "...";
            actionContainer.style.display = 'none';
            progressContainer.style.display = 'block';
            progressBar.classList.add('animated');
            progressBar.style.width = '100%';

            try {
                const res = await fetch(\`\${URL_API}?url=\${encodeURIComponent(url)}\`);
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                finishUpload(data);
                updateStats(data.size);
            } catch (e) {
                showNotify(e.message, 'error');
                fileStatusArea.style.display = 'none';
            }
        });

        // --- Main Upload Process ---
        async function startUploadProcess(file) {
            actionContainer.style.display = 'none';
            progressContainer.style.display = 'block';
            progressBar.classList.add('animated');
            progressBar.style.width = '100%';

            try {
                const formData = new FormData();
                formData.append('file', file);
                const res = await fetch(UPLOAD_API, { method: 'POST', body: formData });
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                finishUpload(data);
                updateStats(file.size);
            } catch (e) {
                showNotify(e.message, 'error');
                actionContainer.style.display = 'block';
                progressContainer.style.display = 'none';
                progressBar.classList.remove('animated');
            }
        }

        // --- Success Handling ---
        function finishUpload(data) {
            progressBar.classList.remove('animated');
            fileStatusArea.style.display = 'none';
            currentFile = null;
            fileInput.value = '';

            respFileName.innerText = data.filename;
            respTime.innerText = "Uploaded: " + new Date().toLocaleTimeString();
            respUrl.innerText = data.url;

            responseWrapper.style.display = 'block';
            addToRecent(data);
            showNotify('Upload Successful!');
        }

        window.closeResponse = () => { responseWrapper.style.display = 'none'; }
        window.copyNewResult = () => {
            const url = respUrl.innerText;
            navigator.clipboard.writeText(url);
            showNotify('URL Copied!');
        }
        window.openNewResult = () => {
            const url = respUrl.innerText;
            window.open(url, '_blank');
        }

        // --- Recent Files ---
        function loadRecent() {
            const history = JSON.parse(localStorage.getItem('hs_history')) || [];
            if (history.length > 0) {
                recentWrapper.style.display = 'block';
                recentList.innerHTML = history.map(item => \`
                    <div class="recent-item">
                        <div style="font-size:1.5rem">📄</div>
                        <div class="recent-info">
                            <div class="recent-name" title="\${item.name}">\${item.name}</div>
                            <div class="recent-meta">\${formatSize(item.size)} • \${new Date(item.date).toLocaleDateString()}</div>
                        </div>
                        <button class="recent-btn" onclick="navigator.clipboard.writeText('\${item.url}'); showNotify('Copied!')">📋</button>
                        <button class="recent-btn" onclick="window.open('\${item.url}', '_blank')">🔗</button>
                    </div>
                \`).join('');
            } else {
                recentWrapper.style.display = 'none';
            }
        }

        function addToRecent(data) {
            const history = JSON.parse(localStorage.getItem('hs_history')) || [];
            history.unshift({
                name: data.filename,
                url: data.url,
                size: data.size,
                date: new Date()
            });
            localStorage.setItem('hs_history', JSON.stringify(history.slice(0, 10)));
            loadRecent();
        }

        window.clearHistory = () => {
            localStorage.removeItem('hs_history');
            loadRecent();
        }

        function formatSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        function showNotify(msg, type = 'success') {
            const note = document.getElementById('notification');
            note.innerText = msg;
            note.className = \`notification show \${type}\`;
            setTimeout(() => note.classList.remove('show'), 3000);
        }
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