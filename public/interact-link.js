// Advanced UI script for Akave • Phala API

const state = {
  base: localStorage.getItem('akave_base') || location.origin,
  queued: [],
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

const setBase = () => { $('base-url').textContent = `Base: ${state.base}`; const baseInput = $('api-base'); if (baseInput) baseInput.value = state.base; };
const setConn = (ok, masked) => {
  const el = $('conn-status');
  el.className = `status ${ok?'ok':'warn'}`;
  el.textContent = ok ? `Wallet: ${masked||'Connected'}` : 'Wallet: Disconnected';
  $('masked-address').textContent = `Address: ${masked||'—'}`;
};

// Removed header save/password UI (true gate handled below)

// No password gating

// Health
const healthCheck = async () => {
  try {
    const res = await api('GET', '/health');
    log('Health: ok');
  } catch (e) {
    log('Health failed', true);
  }
};

// Wallet connect/disconnect (modal, plus MetaMask display-only)
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
  try { await api('POST','/admin/disconnect',{}); setConn(false); log('Disconnected'); } catch(e){ log('Disconnect failed: '+e.message,true); }
});

// Attempt MetaMask detection to show the user's address if available (no signing)
(async () => {
  try {
    const eth = window.ethereum;
    if (!eth) return; // MetaMask not installed; nothing to do
    const accounts = await eth.request({ method: 'eth_accounts' });
    if (accounts && accounts.length) {
      const addr = accounts[0];
      const masked = `${addr.slice(0,6)}...${addr.slice(-4)}`;
      // Only update display; server-side wallet still needs /admin/wallet
      document.getElementById('masked-address').textContent = `Address: ${masked}`;
    }
  } catch (_) {}
})();

// Init status
(async () => {
  setBase();
  try {
    const s = await api('GET','/admin/status');
    setConn(s.data.connected, s.data.address);
  } catch (_) {
    setConn(false);
  }
  // allow overriding base at runtime
  const saveBtn = document.getElementById('btn-save-base');
  const baseInput = document.getElementById('api-base');
  if (saveBtn && baseInput) {
    saveBtn.addEventListener('click', () => {
      const v = baseInput.value.trim();
      if (!v) return;
      state.base = v.replace(/\/$/, '');
      localStorage.setItem('akave_base', state.base);
      setBase();
      log('Base set to ' + state.base);
    });
  }
})();

// Bucket quick actions
$('btn-create-bucket')?.addEventListener('click', async () => {
  const bucket = $('bucket-upload').value.trim() || prompt('Bucket name');
  if (!bucket) return;
  try { const res = await api('POST','/buckets',{ bucketName: bucket }); $('upload-out').textContent = JSON.stringify(res,null,2); log(`Bucket created: ${bucket}`);} catch(e){ $('upload-out').textContent=e.message; log('Create bucket failed',true);} 
});
$('btn-list-buckets')?.addEventListener('click', async () => {
  try { const res = await api('GET','/buckets'); $('upload-out').textContent = JSON.stringify(res,null,2); log('Buckets listed'); } catch(e){ $('upload-out').textContent=e.message; log('List buckets failed',true);} 
});

// Drag & drop logic (single uploader)
const qcount = $('queued-count');
const addQueue = (file, type) => { state.queued.push({ file, type }); qcount.textContent = state.queued.length; };
const previewCSV = async (file, el) => {
  const text = await file.text();
  const lines = text.split(/\r?\n/).slice(0,10).join('\n');
  el.textContent = lines || '(empty)';
};
const previewImage = (file, el) => {
  const url = URL.createObjectURL(file);
  const img = new Image(); img.src=url; img.style.maxWidth='100%'; img.onload=()=>URL.revokeObjectURL(url); el.innerHTML=''; el.appendChild(img);
};
const previewVideo = (file, el) => {
  const url=URL.createObjectURL(file); const v=document.createElement('video'); v.controls=true; v.src=url; v.style.maxWidth='100%'; el.innerHTML=''; el.appendChild(v);
};

const singleTile = document.getElementById('single-tile');
const singleTitle = document.getElementById('single-title');
const singleDrop = document.getElementById('single-drop');
const singleInput = document.getElementById('single-input');
const singlePreview = document.getElementById('single-preview');
const uploadTypeSelect = document.getElementById('upload-type');

const configureSingle = () => {
  const selected = uploadTypeSelect.options[uploadTypeSelect.selectedIndex];
  const type = selected.value;
  const accept = selected.getAttribute('data-accept') || '*/*';
  singleTile.dataset.type = type;
  singleDrop.setAttribute('data-accept', accept);
  singleInput.setAttribute('accept', accept);
  singleTitle.textContent = type === 'image' ? 'Images' : type === 'video' ? 'Videos' : type === 'csv' ? 'CSV' : 'Other Files';
  singleDrop.textContent = `Drop ${singleTitle.textContent.toLowerCase()} here or click to select`;
  singlePreview.textContent = '';
};

const handleFiles = async (files) => {
  for (const f of files) {
    addQueue(f, singleTile.dataset.type);
    if (singleTile.dataset.type==='image') previewImage(f, singlePreview);
    else if (singleTile.dataset.type==='video') previewVideo(f, singlePreview);
    else if (singleTile.dataset.type==='csv') await previewCSV(f, singlePreview);
    else singlePreview.textContent = f.name;
  }
};

singleDrop.addEventListener('click', () => singleInput.click());
singleInput.addEventListener('change', (e) => handleFiles(e.target.files));
['dragenter','dragover'].forEach(ev => singleDrop.addEventListener(ev, (e)=>{ e.preventDefault(); singleDrop.classList.add('dragover'); }));
['dragleave','drop'].forEach(ev => singleDrop.addEventListener(ev, (e)=>{ e.preventDefault(); singleDrop.classList.remove('dragover'); }));
singleDrop.addEventListener('drop', (e) => { handleFiles(e.dataTransfer.files); });
uploadTypeSelect.addEventListener('change', configureSingle);
configureSingle();

$('btn-upload-queued').addEventListener('click', async () => {
  const bucket = $('bucket-upload').value.trim(); if (!bucket) { alert('Enter bucket'); return; }
  if (!state.queued.length) { alert('No files queued'); return; }
  const out = $('upload-out');
  out.textContent = '';
  for (const item of state.queued) {
    const form = new FormData(); form.append('file', item.file, item.file.name);
    try { const res = await api('POST', `/buckets/${bucket}/files`, form, true); out.textContent += `Uploaded ${item.file.name}: ${JSON.stringify(res)}\n`; log(`Uploaded ${item.file.name}`); } catch(e){ out.textContent += `Error ${item.file.name}: ${e.message}\n`; log('Upload failed: '+item.file.name,true); }
  }
  state.queued = []; qcount.textContent='0';
});

// API Explorer
const buildPath = () => {
  const ep = $('endpoint').value; const b=$('ep-bucket').value.trim(); const f=$('ep-file').value.trim();
  switch(ep){
    case 'health': return '/health';
    case 'createBucket': return '/buckets';
    case 'listBuckets': return '/buckets';
    case 'viewBucket': return `/buckets/${encodeURIComponent(b)}`;
    case 'deleteBucket': return `/buckets/${encodeURIComponent(b)}`;
    case 'listFiles': return `/buckets/${encodeURIComponent(b)}/files`;
    case 'getFileInfo': return `/buckets/${encodeURIComponent(b)}/files/${encodeURIComponent(f)}`;
    case 'download': return `/buckets/${encodeURIComponent(b)}/files/${encodeURIComponent(f)}/download`;
  }
};
$('btn-run').addEventListener('click', async () => {
  const ep=$('endpoint').value; const path=buildPath(); const out=$('api-out');
  try {
    let res;
    if (ep==='createBucket') res = await api('POST', path, { bucketName: $('ep-bucket').value.trim() });
    else if (ep==='deleteBucket') res = await api('DELETE', path);
    else res = await api('GET', path);
    out.textContent = typeof res==='string' ? res : JSON.stringify(res,null,2);
    log(`Ran ${ep}`);
  } catch(e){ out.textContent=e.message; log(`Run failed: ${e.message}`, true); }
});
$('btn-curl').addEventListener('click', async () => {
  const path=buildPath(); const ep=$('endpoint').value; const headers = state.pass ? `-H 'x-api-pass: ${state.pass}' ` : '';
  let body=''; if (ep==='createBucket'){ body="-H 'Content-Type: application/json' -d '{\"bucketName\":\""+($('ep-bucket').value.trim())+"\"}' "; }
  const curl = `curl -sS ${headers}${state.base}${path} ${ep==='createBucket'? '-X POST '+body: ep==='deleteBucket'? '-X DELETE': ''}`.trim();
  navigator.clipboard.writeText(curl); log('curl copied');
});

// On load
setBase();
healthCheck();
log('UI ready');

// Docs modal controls
(() => {
  const modal = document.getElementById('docs-modal');
  const open = () => { modal.style.display = 'flex'; modal.setAttribute('aria-hidden','false'); };
  const close = () => { modal.style.display = 'none'; modal.setAttribute('aria-hidden','true'); };
  const btn = document.getElementById('btn-docs');
  const closeBtn = document.getElementById('docs-close');
  if (btn && closeBtn && modal) {
    btn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
  }
})();
