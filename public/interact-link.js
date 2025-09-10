// Advanced UI script for Akave • Phala API

const state = {
  base: localStorage.getItem('akave_base') || location.origin,
  queued: [],
  uploadedFiles: JSON.parse(localStorage.getItem('akave_uploaded_files') || '{}'),
  currentBucket: localStorage.getItem('akave_current_bucket') || ''
};

const $ = (id) => document.getElementById(id);
const log = (msg, isErr = false) => {
  const logDiv = $('log');
  const time = new Date().toLocaleTimeString();
  const color = isErr ? '#ff6b8a' : '#8cc2ff';
  logDiv.innerHTML = `<div style="color:${color}">[${time}] ${msg}</div>` + logDiv.innerHTML;
};

const headersWithPass = (extra={}) => ({ ...extra });

const api = async (method, path, body=null, isFile=false) => {
  const opts = { method, headers: headersWithPass() };
  if (body && !isFile) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (isFile) {
    opts.body = body;
  }
  const url = path.startsWith('http') ? path : `${state.base}${path}`;
  const res = await fetch(url, opts);
  if (!res.ok) {
    let txt = await res.text().catch(()=> '');
    throw new Error(txt || `${res.status}`);
  }
  const ct = res.headers.get('content-type')||'';
  if (ct.includes('application/json')) return res.json();
  return res.text();
};

// RPC monitoring for better UX on uploads
const checkTransactionStatus = async (txHash) => {
  try {
    const rpcUrl = 'https://c1-us.akave.ai/ext/bc/239eAqXjawEJyEbr1GhDUoYWZdyBA3b7NeDc6Hozw3sn3xXm9H/rpc';
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 1
      })
    });
    const data = await response.json();
    return data.result;
  } catch (e) {
    return null;
  }
};

const updateProgress = (percent, text) => {
  const progressDiv = $('upload-progress');
  const progressBar = $('progress-bar');
  const progressText = $('progress-text');
  
  if (percent > 0) {
    progressDiv.style.display = 'block';
    progressBar.style.width = `${percent}%`;
    progressText.textContent = text || `${percent}%`;
  } else {
    progressDiv.style.display = 'none';
  }
};

// Store uploaded files in localStorage for persistence
const saveUploadedFile = (bucket, fileName) => {
  if (!state.uploadedFiles[bucket]) {
    state.uploadedFiles[bucket] = [];
  }
  if (!state.uploadedFiles[bucket].includes(fileName)) {
    state.uploadedFiles[bucket].push(fileName);
    localStorage.setItem('akave_uploaded_files', JSON.stringify(state.uploadedFiles));
  }
};

const clearUploadedFiles = (bucket) => {
  if (bucket && state.uploadedFiles[bucket]) {
    delete state.uploadedFiles[bucket];
    localStorage.setItem('akave_uploaded_files', JSON.stringify(state.uploadedFiles));
  }
};

// Set base automatically from environment
const setBase = () => { 
  const baseInput = $('api-base');
  if (baseInput) baseInput.value = state.base;
  localStorage.setItem('akave_base', state.base);
};

const setConn = (ok, masked) => {
  const el = $('conn-status');
  el.className = `status ${ok?'ok':'warn'}`;
  el.textContent = ok ? `Wallet: ${masked||'Connected'}` : 'Wallet: Disconnected';
  $('masked-address').textContent = `Address: ${masked||'—'}`;
};

// Health check
const healthCheck = async () => {
  try {
    const res = await api('GET', '/health');
    log('Health: ok');
  } catch (e) {
    log('Health failed', true);
  }
};

// Wallet connect/disconnect modal
const modal = document.getElementById('connect-modal');
const openModal = () => { modal.style.display = 'flex'; modal.setAttribute('aria-hidden','false'); };
const closeModal = () => { modal.style.display = 'none'; modal.setAttribute('aria-hidden','true'); };

document.getElementById('btn-open-connect').addEventListener('click', () => {
  const savedNode = localStorage.getItem('akave_node_address') || 'connect.akave.ai:5500';
  document.getElementById('modal-node').value = savedNode;
  document.getElementById('modal-pk').value = '';
  openModal();
});

document.getElementById('modal-cancel').addEventListener('click', closeModal);

document.getElementById('modal-connect').addEventListener('click', async () => {
  const nodeAddress = document.getElementById('modal-node').value.trim();
  const pk = document.getElementById('modal-pk').value.trim();
  if (!nodeAddress || !pk) { alert('Enter node address and private key'); return; }
  try {
    const res = await api('POST','/admin/wallet',{ nodeAddress, privateKey: pk });
    localStorage.setItem('akave_node_address', nodeAddress);
    setConn(true, res.data.address);
    closeModal();
    log('Wallet connected');
  } catch (e) {
    log('Connect failed: ' + e.message, true);
  }
});

$('btn-disconnect').addEventListener('click', async () => {
  try { 
    await api('POST','/admin/disconnect',{}); 
    setConn(false); 
    log('Disconnected'); 
  } catch(e){ 
    log('Disconnect failed: '+e.message,true); 
  }
});

// Bucket operations
$('btn-create-bucket').addEventListener('click', async () => {
  const name = $('bucket-upload').value.trim();
  if (!name) { log('Enter bucket name', true); return; }
  try {
    await api('POST', '/buckets', { bucketName: name });
    log(`Bucket created: ${name}`);
    state.currentBucket = name;
    localStorage.setItem('akave_current_bucket', name);
  } catch (e) {
    log('Create bucket failed: ' + e.message, true);
  }
});

$('btn-list-buckets').addEventListener('click', async () => {
  try {
    const res = await api('GET', '/buckets');
    $('upload-out').textContent = JSON.stringify(res, null, 2);
    log('Listed buckets');
  } catch (e) {
    log('List buckets failed: ' + e.message, true);
  }
});

// New List Objects functionality
$('btn-list-objects').addEventListener('click', async () => {
  const bucket = $('bucket-upload').value.trim();
  if (!bucket) { 
    log('Enter bucket name to list objects', true); 
    return; 
  }
  
  try {
    const res = await api('GET', `/buckets/${bucket}/files`);
    const files = res.data || [];
    
    // Create clickable download links
    let output = `Files in bucket "${bucket}":\n\n`;
    if (files.length === 0) {
      output += "No files found.";
    } else {
      const fileListHTML = files.map(file => {
        const downloadUrl = `${state.base}/buckets/${bucket}/files/${file.Name}/download`;
        return `<div class="file-item">
          <a href="${downloadUrl}" class="file-link" target="_blank" download="${file.Name}">
            📄 ${file.Name} (${formatFileSize(file.Size || 0)})
          </a>
          <span class="hint">${new Date(file.Created).toLocaleDateString()}</span>
        </div>`;
      }).join('');
      
      $('upload-out').innerHTML = fileListHTML;
      log(`Listed ${files.length} objects in bucket: ${bucket}`);
      return;
    }
    
    $('upload-out').textContent = output;
    log(`Listed objects in bucket: ${bucket}`);
  } catch (e) {
    log('List objects failed: ' + e.message, true);
    $('upload-out').textContent = '';
  }
});

// Format file size helper
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Upload type switcher
$('upload-type').addEventListener('change', (e) => {
  const opt = e.target.options[e.target.selectedIndex];
  const accept = opt.getAttribute('data-accept') || '*/*';
  const typeName = opt.textContent;
  
  $('single-title').textContent = typeName;
  $('single-drop').setAttribute('data-accept', accept);
  $('single-drop').textContent = `Drop ${typeName.toLowerCase()} here or click to select`;
  $('single-input').setAttribute('accept', accept);
  $('single-tile').setAttribute('data-type', opt.value);
});

// Drag and drop with improved state management
const dropZone = $('single-drop');
const fileInput = $('single-input');
const preview = $('single-preview');

const updateQueueCount = () => {
  $('queued-count').textContent = state.queued.length;
};

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
});

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

const handleFiles = (files) => {
  const accept = dropZone.getAttribute('data-accept');
  for (const file of files) {
    if (accept !== '*/*' && !file.type.match(accept.replace('*', '.*'))) {
      log(`File type not accepted: ${file.name}`, true);
      continue;
    }
    state.queued.push(file);
    preview.innerHTML += `<div>📎 ${file.name} (${formatFileSize(file.size)})</div>`;
  }
  updateQueueCount();
};

// Upload with progress tracking
$('btn-upload-queued').addEventListener('click', async () => {
  const bucket = $('bucket-upload').value.trim();
  if (!bucket) { log('Enter bucket name', true); return; }
  if (state.queued.length === 0) { log('No files queued', true); return; }
  
  const totalFiles = state.queued.length;
  let uploadedCount = 0;
  
  updateProgress(0, 'Starting uploads...');
  
  for (const file of state.queued) {
    try {
      updateProgress(
        Math.round((uploadedCount / totalFiles) * 100),
        `Uploading ${file.name}...`
      );
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Simulate progress with timeout (since we can't get real progress from fetch)
      const uploadPromise = api('POST', `/buckets/${bucket}/files`, formData, true);
      
      // Update progress periodically while uploading
      const progressInterval = setInterval(() => {
        const current = parseInt($('progress-bar').style.width) || 0;
        if (current < 90) {
          updateProgress(current + 5, `Uploading ${file.name}...`);
        }
      }, 200);
      
      const res = await uploadPromise;
      clearInterval(progressInterval);
      
      uploadedCount++;
      updateProgress(
        Math.round((uploadedCount / totalFiles) * 100),
        `Uploaded ${uploadedCount}/${totalFiles} files`
      );
      
      log(`Uploaded: ${file.name}`);
      saveUploadedFile(bucket, file.name);
      
    } catch (e) {
      log(`Upload failed for ${file.name}: ${e.message}`, true);
    }
  }
  
  // Clear queue and preview after successful uploads
  state.queued = [];
  preview.innerHTML = '';
  updateQueueCount();
  
  // Show completion
  updateProgress(100, 'All uploads complete!');
  setTimeout(() => updateProgress(0), 3000);
  
  // Auto-refresh the object list if bucket matches
  if (bucket === $('bucket-upload').value.trim()) {
    $('btn-list-objects').click();
  }
});

// API Explorer with clickable download links
$('btn-run').addEventListener('click', async () => {
  const endpoint = $('endpoint').value;
  const bucket = $('ep-bucket').value.trim();
  const file = $('ep-file').value.trim();
  const out = $('api-out');
  
  let method = 'GET', path = '', body = null;
  
  switch(endpoint) {
    case 'health': path = '/health'; break;
    case 'createBucket': method = 'POST'; path = '/buckets'; body = { bucketName: bucket }; break;
    case 'listBuckets': path = '/buckets'; break;
    case 'viewBucket': path = `/buckets/${bucket}`; break;
    case 'deleteBucket': method = 'DELETE'; path = `/buckets/${bucket}`; break;
    case 'listFiles': path = `/buckets/${bucket}/files`; break;
    case 'getFileInfo': path = `/buckets/${bucket}/files/${file}`; break;
    case 'download': 
      // For download, create a direct link
      const downloadUrl = `${state.base}/buckets/${bucket}/files/${file}/download`;
      out.innerHTML = `<a href="${downloadUrl}" class="file-link" target="_blank" download="${file}">
        📥 Click here to download: ${file}
      </a>`;
      log(`Download link generated for: ${file}`);
      return;
  }
  
  try {
    const res = await api(method, path, body);
    
    // If listing files, make them clickable
    if (endpoint === 'listFiles' && res.data) {
      const files = res.data;
      if (Array.isArray(files) && files.length > 0) {
        const fileListHTML = files.map(f => {
          const dlUrl = `${state.base}/buckets/${bucket}/files/${f.Name}/download`;
          return `<div class="file-item">
            <a href="${dlUrl}" class="file-link" target="_blank" download="${f.Name}">
              📄 ${f.Name} (${formatFileSize(f.Size || 0)})
            </a>
          </div>`;
        }).join('');
        out.innerHTML = fileListHTML;
        log(`API: ${method} ${path} - Found ${files.length} files`);
        return;
      }
    }
    
    out.textContent = JSON.stringify(res, null, 2);
    log(`API: ${method} ${path}`);
  } catch (e) {
    out.textContent = `Error: ${e.message}`;
    log(`API failed: ${e.message}`, true);
  }
});

// Copy curl command
$('btn-curl').addEventListener('click', () => {
  const endpoint = $('endpoint').value;
  const bucket = $('ep-bucket').value.trim();
  const file = $('ep-file').value.trim();
  
  let cmd = '';
  switch(endpoint) {
    case 'health': cmd = `curl ${state.base}/health`; break;
    case 'createBucket': cmd = `curl -X POST ${state.base}/buckets -H "Content-Type: application/json" -d '{"bucketName":"${bucket}"}'`; break;
    case 'listBuckets': cmd = `curl ${state.base}/buckets`; break;
    case 'viewBucket': cmd = `curl ${state.base}/buckets/${bucket}`; break;
    case 'deleteBucket': cmd = `curl -X DELETE ${state.base}/buckets/${bucket}`; break;
    case 'listFiles': cmd = `curl ${state.base}/buckets/${bucket}/files`; break;
    case 'getFileInfo': cmd = `curl ${state.base}/buckets/${bucket}/files/${file}`; break;
    case 'download': cmd = `curl -L -o ${file} ${state.base}/buckets/${bucket}/files/${file}/download`; break;
  }
  
  navigator.clipboard.writeText(cmd);
  log('Copied curl command');
});

// Docs modal
const docsModal = $('docs-modal');
$('btn-docs').addEventListener('click', () => {
  docsModal.style.display = 'flex';
  docsModal.setAttribute('aria-hidden','false');
});
$('docs-close').addEventListener('click', () => {
  docsModal.style.display = 'none';
  docsModal.setAttribute('aria-hidden','true');
});

// Initialize
(async () => {
  setBase();
  await healthCheck();
  
  // Load current bucket if saved
  if (state.currentBucket) {
    $('bucket-upload').value = state.currentBucket;
  }
  
  // Check wallet status
  try {
    const res = await api('GET', '/admin/status');
    if (res.data && res.data.connected) {
      setConn(true, res.data.address);
    }
  } catch (e) {
    // Wallet not connected
  }
})();