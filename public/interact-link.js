// Advanced UI script for Akave • Phala API

const state = {
  base: location.origin,
  pass: localStorage.getItem('akave_api_pass') || '',
  queued: [],
};

const $ = (id) => document.getElementById(id);
const log = (msg, isErr = false) => {
  const logDiv = $('log');
  const time = new Date().toLocaleTimeString();
  const color = isErr ? '#ff6b8a' : '#8cc2ff';
  logDiv.innerHTML = `<div style="color:${color}">[${time}] ${msg}</div>` + logDiv.innerHTML;
};

const headersWithPass = (extra={}) => {
  const h = { ...extra };
  if (state.pass) h['x-api-pass'] = state.pass;
  return h;
};

const api = async (method, path, body=null, isFile=false) => {
  const opts = { method, headers: headersWithPass() };
  if (body && !isFile) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (isFile) {
    opts.body = body;
  }
  const res = await fetch(path, opts);
  if (!res.ok) {
    let txt = await res.text().catch(()=> '');
    throw new Error(txt || `${res.status}`);
  }
  const ct = res.headers.get('content-type')||'';
  if (ct.includes('application/json')) return res.json();
  return res.text();
};

const setBase = () => $('base-url').textContent = `Base: ${state.base}`;
const setConn = (ok, masked) => {
  const el = $('conn-status');
  el.className = `status ${ok?'ok':'warn'}`;
  el.textContent = ok ? `Wallet: ${masked||'Connected'}` : 'Wallet: Disconnected';
  $('masked-address').textContent = `Address: ${masked||'—'}`;
};

// Password save
$('api-pass').value = state.pass;
$('btn-save-pass').addEventListener('click', () => {
  state.pass = $('api-pass').value.trim();
  localStorage.setItem('akave_api_pass', state.pass);
  log('API password saved');
});

// Health
const healthCheck = async () => {
  try {
    const res = await api('GET', '/health');
    log('Health: ok');
  } catch (e) {
    log('Health failed', true);
  }
};

// Wallet connect/disconnect
$('btn-connect').addEventListener('click', async () => {
  const nodeAddress = prompt('Node address', 'connect.akave.ai:5500');
  if (!nodeAddress) return;
  const pk = prompt('Enter PRIVATE_KEY (0x... or hex)');
  if (!pk) return;
  try {
    const res = await api('POST','/admin/wallet',{ nodeAddress, privateKey: pk });
    setConn(true, res.data.address);
    log('Wallet connected');
  } catch (e) {
    log('Connect failed: ' + e.message, true);
  }
});
$('btn-disconnect').addEventListener('click', async () => {
  try { await api('POST','/admin/disconnect',{}); setConn(false); log('Disconnected'); } catch(e){ log('Disconnect failed: '+e.message,true); }
});

// Init status
(async () => {
  setBase();
  try {
    const s = await api('GET','/admin/status');
    setConn(s.data.connected, s.data.address);
  } catch (_) {
    setConn(false);
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

// Drag & drop logic
const tiles = document.querySelectorAll('.tile');
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

tiles.forEach(tile => {
  const drop = tile.querySelector('.drop');
  const input = tile.querySelector('input[type=file]');
  const preview = tile.querySelector('.preview');
  const accept = drop.getAttribute('data-accept')||'*/*';
  input.setAttribute('accept', accept);

  const handleFiles = async (files) => {
    for (const f of files) {
      addQueue(f, tile.dataset.type);
      if (tile.dataset.type==='image') previewImage(f, preview);
      else if (tile.dataset.type==='video') previewVideo(f, preview);
      else if (tile.dataset.type==='csv') await previewCSV(f, preview);
      else preview.textContent = f.name;
    }
  };

  drop.addEventListener('click', () => input.click());
  input.addEventListener('change', (e) => handleFiles(e.target.files));
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, (e)=>{ e.preventDefault(); drop.classList.add('dragover'); }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, (e)=>{ e.preventDefault(); drop.classList.remove('dragover'); }));
  drop.addEventListener('drop', (e) => { handleFiles(e.dataTransfer.files); });
});

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
      filesList.innerHTML = '<p style="color:#9fb3d2">No files found</p>';
    }
  } catch (err) {
    filesList.innerHTML = `<p style="color:#ff5e7d">Error: ${err.message}</p>`;
  }
});

// Initialize
log('API interface ready');
