/* ============================================================
   Vyoma Linguistic Labs Foundation — Dispatch Tool
   app.js — Shared Utilities  v4.0
   ============================================================ */

'use strict';

/* ── Constants ─────────────────────────────────────────────── */
const KEYS = {
  users:      'vyoma_users',
  dispatches: 'vyoma_dispatches',
  session:    'vyoma_session',
  activity:   'vyoma_activity',
  darkMode:   'vyoma_dark',
  settings:   'vyoma_settings',
};

const ADMIN_SEED = {
  id: 'admin_001',
  name: 'Prasanna',
  email: 'prasanna.vyoma@gmail.com',
  password: '#VyomaLabs@0612',
  role: 'admin',
  status: 'active',
  dateAdded: new Date().toISOString(),
};

/* ── Default dropdown lists (fallback if no custom saved) ─── */
const DEFAULT_WEBSITES = [
  'digitalsanskritguru.com',
  'Direct Sales',
  'Sponsored Sales',
  'Bulk Sales',
];

const DEFAULT_NAME_TYPES = [
  'Complimentary',
  'Retail',
  'Discounted',
  'Free',
];

const DEFAULT_DISPATCH_TYPES = [
  'Post Office',
  'DDTC',
  'Professional',
  'FedEx',
  'Other Couriers',
  'Post Card',
  'Gift',
];

const DEFAULT_PRIORITIES = [
  'Emergency',
  'Urgent',
  'Normal',
  'Moderate',
];

/* ── Dispatch types where tracking is NOT required ─────────── */
const NO_TRACKING_TYPES = ['Post Card', 'Gift'];

/* ── Settings helpers ──────────────────────────────────────── */
function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.settings)) || {};
  } catch { return {}; }
}
function saveSettings(s) {
  localStorage.setItem(KEYS.settings, JSON.stringify(s));
}

function getDropdownList(key) {
  const s = getSettings();
  const defaults = {
    websites:      DEFAULT_WEBSITES,
    nameTypes:     DEFAULT_NAME_TYPES,
    dispatchTypes: DEFAULT_DISPATCH_TYPES,
    priorities:    DEFAULT_PRIORITIES,
  };
  return (s[key] && s[key].length > 0) ? s[key] : (defaults[key] || []);
}

function getTrackingUrls() {
  const s = getSettings();
  return s.trackingUrls || {};
}

/* Convenience getters used throughout the app */
const WEBSITES       = { get: () => getDropdownList('websites') };
const NAME_TYPES     = { get: () => getDropdownList('nameTypes') };
const DISPATCH_TYPES = { get: () => getDropdownList('dispatchTypes') };
const PRIORITIES     = { get: () => getDropdownList('priorities') };

/* ── Backwards-compat arrays (read once at load for charts etc) */
/* These are reassigned at init time per page */

const STATUSES = ['Draft', 'In Process', 'Dispatched', 'Delivered', 'Completed'];
const STATUS_FLOW = {
  'Draft': ['Draft', 'In Process'],
  'In Process': ['In Process', 'Dispatched'],
  'Dispatched': ['Dispatched', 'Delivered'],
  'Delivered': ['Delivered', 'Completed'],
  'Completed': ['Completed'],
};

const PRIORITY_COLORS = {
  'Emergency': '#c62828',
  'Urgent':    '#f57c00',
  'Normal':    '#1565c0',
  'Moderate':  '#2e7d32',
};

const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours

/* ── Storage Helpers ───────────────────────────────────────── */
const store = {
  get:    (key) => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  set:    (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  getObj: (key) => { try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; } },
  setObj: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  remove: (key) => localStorage.removeItem(key),
};

const getUsers       = () => store.get(KEYS.users);
const saveUsers      = (u) => store.set(KEYS.users, u);
const getDispatches  = () => store.get(KEYS.dispatches);
const saveDispatches = (d) => store.set(KEYS.dispatches, d);
const getActivity    = () => store.get(KEYS.activity);
const saveActivity   = (a) => store.set(KEYS.activity, a);
const getSession     = () => store.getObj(KEYS.session);
const saveSession    = (s) => store.setObj(KEYS.session, s);
const clearSession   = () => store.remove(KEYS.session);

/* ── Seed Admin ────────────────────────────────────────────── */
function seedAdmin() {
  const users = getUsers();
  const exists = users.some(u => u.email === ADMIN_SEED.email);
  if (!exists) {
    users.unshift({ ...ADMIN_SEED });
    saveUsers(users);
  }
}

/* ── Auth ──────────────────────────────────────────────────── */
function login(email, password) {
  const users = getUsers();
  const input = (email || '').toLowerCase().trim();
  const user = users.find(u =>
    ((u.email || "").toLowerCase() === input || (u.username && u.username.toLowerCase() === input)) && (u.password || "") === password
  );
  if (!user) return { ok: false, error: 'Invalid username/email or password.' };
  if (user.status === 'inactive') return { ok: false, error: 'Your account is inactive. Contact admin.' };

  const session = {
    userId:       user.id,
    email:        user.email,
    name:         user.name,
    role:         user.role,
    loginTime:    Date.now(),
    lastActivity: Date.now(),
  };
  saveSession(session);
  logActivity('login', `${user.name} logged in`, null, 'session', user.id, user.name);
  return { ok: true, session };
}

function logout() {
  const s = getSession();
  if (s) logActivity('logout', `${s.name} logged out`, null, 'session', s.userId, s.name);
  clearSession();
  window.location.href = 'index.html';
}

function checkSession(requiredRole) {
  const s = getSession();
  if (!s) { window.location.href = 'index.html'; return null; }

  // Timeout check
  if (Date.now() - s.lastActivity > SESSION_TIMEOUT_MS) {
    clearSession();
    window.location.href = 'index.html?timeout=1';
    return null;
  }

  // Role check
  if (requiredRole === 'admin' && s.role !== 'admin') {
    window.location.href = 'dashboard.html';
    return null;
  }
  // 'user' means dispatcher OR assigner — both go to dashboard.html
  if (requiredRole === 'user' && s.role === 'admin') {
    window.location.href = 'admin.html';
    return null;
  }

  s.lastActivity = Date.now();
  saveSession(s);
  return s;
}

function touchActivity() {
  const s = getSession();
  if (s) { s.lastActivity = Date.now(); saveSession(s); }
}
if (typeof document !== 'undefined') {
  ['click','keydown','mousemove','touchstart'].forEach(function(evt) {
    document.addEventListener(evt, touchActivity, { passive: true });
  });
}

/* ── Activity Log ──────────────────────────────────────────── */
function logActivity(action, details, entityId, entityType, userId, userName) {
  const s = getSession();
  const log = getActivity();
  log.unshift({
    id:         genId(),
    action,
    details,
    entityId:   entityId || null,
    entityType: entityType || null,
    userId:     userId || (s ? s.userId : null),
    userName:   userName || (s ? s.name : 'System'),
    timestamp:  new Date().toISOString(),
  });
  if (log.length > 500) log.length = 500;
  saveActivity(log);
}

/* ── Dispatch CRUD ─────────────────────────────────────────── */
function getNextSlNo(userId) {
  const dispatches = getDispatches();
  const userDispatches = dispatches.filter(d => d.createdBy === userId);
  if (userDispatches.length === 0) return 1;
  const max = Math.max(...userDispatches.map(d => parseInt(d.slNo) || 0));
  return max + 1;
}

function createDispatch(data, session) {
  const dispatches = getDispatches();
  const newEntry = {
    id:              genId(),
    slNo:            data.slNo || getNextSlNo(session.userId),
    customerName:    data.customerName,
    nameType:        data.nameType || '',
    address:         data.address || '',
    orderId:         data.orderId,
    website:         data.website,
    dispatchType:    data.dispatchType,
    trackingNo:      data.trackingNo || '',
    customerEmail:   data.customerEmail || '',
    customerPhone:   data.customerPhone || '',
    products:        data.products || [],
    notes:           data.notes || '',
    priority:        data.priority || 'Normal',
    status:          data.status || 'In Process',
    assignedTo:      data.assignedTo || null,
    assignedToName:  data.assignedToName || null,
    assignedBy:      data.assignedBy || null,
    assignedByName:  data.assignedByName || null,
    assignedAt:      data.assignedTo ? new Date().toISOString() : null,
    escalated:       false,
    escalatedAt:     null,
    emailSent:       false,
    emailSentAt:     null,
    createdBy:       session.userId,
    createdByName:   session.name,
    createdAt:       new Date().toISOString(),
    updatedAt:       new Date().toISOString(),
  };
  dispatches.push(newEntry);
  saveDispatches(dispatches);
  logActivity('create', `Created dispatch entry for ${newEntry.customerName} (${newEntry.orderId})`, newEntry.id, 'dispatch');
  return newEntry;
}

function updateDispatch(id, data) {
  const dispatches = getDispatches();
  const idx = dispatches.findIndex(d => d.id === id);
  if (idx === -1) return null;
  const old = dispatches[idx];
  dispatches[idx] = { ...old, ...data, id: old.id, updatedAt: new Date().toISOString() };
  saveDispatches(dispatches);
  logActivity('update', `Updated dispatch ${dispatches[idx].orderId}`, id, 'dispatch');
  return dispatches[idx];
}

function updateDispatchStatus(id, newStatus) {
  const dispatches = getDispatches();
  const idx = dispatches.findIndex(d => d.id === id);
  if (idx === -1) return null;
  const old = dispatches[idx];
  dispatches[idx] = { ...old, status: newStatus, updatedAt: new Date().toISOString() };
  saveDispatches(dispatches);
  logActivity('status', `Status changed to ${newStatus} for ${old.orderId}`, id, 'dispatch');
  return dispatches[idx];
}

function deleteDispatch(id) {
  let dispatches = getDispatches();
  const entry = dispatches.find(d => d.id === id);
  dispatches = dispatches.filter(d => d.id !== id);
  saveDispatches(dispatches);
  if (entry) logActivity('delete', `Deleted dispatch ${entry.orderId} for ${entry.customerName}`, id, 'dispatch');
}

/* ── Toast Notifications ───────────────────────────────────── */
function showToast(message, type) {
  type = type || 'info';
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warn: '⚠️' };
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.innerHTML = '<span class="toast-icon">' + (icons[type] || 'ℹ️') + '</span><span>' + message + '</span>';
  container.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 5000);
}

/* ── Confirm Dialog ────────────────────────────────────────── */
function confirmAction(message, onConfirm, title) {
  title = title || 'Confirm Action';
  const existing = document.getElementById('confirm-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="modal modal-sm">
      <div class="modal-header"><h3>${title}</h3></div>
      <div class="modal-body"><p style="font-size:0.95rem">${message}</p></div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="confirm-cancel">Cancel</button>
        <button class="btn btn-danger" id="confirm-ok" data-ocid="confirm.confirm_button">Confirm</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  document.getElementById('confirm-cancel').onclick = function() { overlay.remove(); };
  document.getElementById('confirm-ok').onclick = function() { overlay.remove(); onConfirm(); };
}

/* ── Dark Mode ─────────────────────────────────────────────── */
function initDarkMode() {
  const saved = localStorage.getItem(KEYS.darkMode);
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
}

function toggleDarkMode() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(KEYS.darkMode, 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem(KEYS.darkMode, 'dark');
  }
  updateDarkToggle();
}

function updateDarkToggle() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.querySelectorAll('.dark-toggle').forEach(function(btn) {
    btn.textContent = isDark ? '☀️' : '🌙';
    btn.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  });
}

/* ── Utility Helpers ───────────────────────────────────────── */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const day = Math.floor(h / 24);
  return day + 'd ago';
}

function statusBadgeClass(status) {
  const map = {
    'Draft': 'badge-draft',
    'In Process': 'badge-inprocess',
    'Dispatched': 'badge-dispatched',
    'Delivered': 'badge-delivered',
    'Completed': 'badge-completed',
  };
  return map[status] || 'badge-draft';
}

function priorityBadgeHtml(priority) {
  const color = PRIORITY_COLORS[priority] || '#555';
  return '<span class="badge" style="background:' + color + ';color:#fff;font-size:0.7rem;padding:2px 7px;border-radius:20px">' + escHtml(priority || 'Normal') + '</span>';
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function buildSelectOptions(arr, selected) {
  selected = selected || '';
  return arr.map(function(v) {
    return '<option value="' + escHtml(v) + '"' + (v === selected ? ' selected' : '') + '>' + escHtml(v) + '</option>';
  }).join('');
}

/* ── Tracking URL helper ───────────────────────────────────── */
function getTrackingUrlForType(dispatchType) {
  const urls = getTrackingUrls();
  return urls[dispatchType] || '';
}

/* ── Email / WhatsApp Template ─────────────────────────────── */
function buildEmailBody(entry) {
  const date = formatDate(entry.updatedAt || entry.createdAt);
  const trackingUrl = getTrackingUrlForType(entry.dispatchType);
  const productLines = (entry.products || []).map(function(p) {
    return '  - ' + p.name + ' (Qty: ' + p.qty + ')';
  }).join('\n');

  let body = 'Dear ' + entry.customerName + ',\n\n';
  body += 'Your order has been dispatched successfully.\n\n';
  body += 'Order Details:\n';
  body += '- Order ID: ' + entry.orderId + '\n';
  body += '- Dispatch Type: ' + entry.dispatchType + '\n';
  body += '- Dispatch Date: ' + date + '\n';

  const noTracking = NO_TRACKING_TYPES.includes(entry.dispatchType);
  if (!noTracking && entry.trackingNo) {
    body += '- Tracking Number: ' + entry.trackingNo + '\n';
    if (trackingUrl) {
      body += '- Track your order: ' + trackingUrl + '\n';
    }
  }

  if (entry.priority && entry.priority !== 'Normal') {
    body += '- Priority: ' + entry.priority + '\n';
  }

  if (productLines) {
    body += '\nProducts Ordered:\n' + productLines + '\n';
  }

  body += '\nThank you for your support!\n\nWarm regards,\nVyoma Linguistic Labs Foundation';
  return body;
}

function buildEmailSubject(entry) {
  return 'Your Order ' + entry.orderId + ' has been dispatched — Vyoma Linguistic Labs Foundation';
}

function buildWhatsAppLink(entry) {
  const body = buildEmailBody(entry);
  const phone = (entry.customerPhone || '').replace(/\D/g, '');
  const encodedMsg = encodeURIComponent(body);
  if (phone) {
    return 'https://wa.me/' + phone + '?text=' + encodedMsg;
  }
  return 'https://wa.me/?text=' + encodedMsg;
}

/* ── Export Helpers ────────────────────────────────────────── */
function exportCSV(rows, filename) {
  if (!rows || rows.length === 0) { showToast('No data to export', 'warn'); return; }
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(function(row) {
      return headers.map(function(h) {
        let v = row[h] === null || row[h] === undefined ? '' : String(row[h]);
        v = v.replace(/"/g, '""');
        if (v.includes(',') || v.includes('\n') || v.includes('"')) v = '"' + v + '"';
        return v;
      }).join(',');
    })
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported successfully', 'success');
}

function dispatchToExportRow(d) {
  const productsSummary = (d.products || []).map(function(p) { return p.name + ' x' + p.qty; }).join('; ');
  return {
    'Sl No':          d.slNo,
    'Customer Name':  d.customerName,
    'Name Type':      d.nameType || '',
    'Address':        d.address,
    'Order ID':       d.orderId,
    'Website':        d.website,
    'Dispatch Type':  d.dispatchType,
    'Tracking No':    d.trackingNo,
    'Customer Email': d.customerEmail,
    'Customer Phone': d.customerPhone || '',
    'Products':       productsSummary,
    'Priority':       d.priority || 'Normal',
    'Status':         d.status,
    'Email Sent':     d.emailSent ? 'Yes' : 'No',
    'Assigned To':    d.assignedToName || '',
    'Created By':     d.createdByName,
    'Created At':     formatDateTime(d.createdAt),
    'Updated At':     formatDateTime(d.updatedAt),
    'Notes':          d.notes,
  };
}

/* ── Bulk Import Template Download ────────────────────────── */
function downloadBulkTemplate() {
  if (typeof XLSX === 'undefined') {
    showToast('Excel library not loaded yet — try again in a moment', 'warn');
    return;
  }
  const headers = [
    'Customer Name',
    'Address',
    'Order ID',
    'Customer Email',
    'Customer Phone',
    'Website',
    'Name Type',
    'Dispatch Type',
    'Tracking No',
    'Priority',
    'Product 1 Name',
    'Product 1 Qty',
    'Product 2 Name',
    'Product 2 Qty',
    'Notes',
  ];
  const sampleRow = {
    'Customer Name':   'Ramesh Kumar',
    'Address':         '12, MG Road, Bengaluru',
    'Order ID':        'ORD-2026-001',
    'Customer Email':  'ramesh@example.com',
    'Customer Phone':  '919876543210',
    'Website':         'digitalsanskritguru.com',
    'Name Type':       'Retail',
    'Dispatch Type':   'Post Office',
    'Tracking No':     'IN123456789IN',
    'Priority':        'Normal',
    'Product 1 Name':  'Sanskrit Grammar Book',
    'Product 1 Qty':   '2',
    'Product 2 Name':  '',
    'Product 2 Qty':   '',
    'Notes':           '',
  };

  const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bulk Import');
  ws['!cols'] = headers.map(function() { return { wch: 22 }; });
  XLSX.writeFile(wb, 'vyoma_bulk_import_template.xlsx');
  showToast('Template downloaded', 'success');
}

/* ── Parse Bulk Import File ────────────────────────────────── */
function parseBulkImportFile(file, assignedTo, assignedToName, session, onDone) {
  if (typeof XLSX === 'undefined') {
    showToast('Excel library not loaded', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (!rows.length) { showToast('No data rows found in file', 'warn'); return; }

      let created = 0;
      let errors  = [];
      rows.forEach(function(row, idx) {
        const name     = String(row['Customer Name'] || '').trim();
        const orderId  = String(row['Order ID'] || '').trim();
        const website  = String(row['Website'] || '').trim();
        const dtype    = String(row['Dispatch Type'] || '').trim();
        if (!name || !orderId || !website || !dtype) {
          errors.push('Row ' + (idx + 2) + ': missing required field(s)');
          return;
        }

        const products = [];
        for (let i = 1; i <= 5; i++) {
          const pname = String(row['Product ' + i + ' Name'] || '').trim();
          const pqty  = parseInt(row['Product ' + i + ' Qty']) || 1;
          if (pname) products.push({ name: pname, qty: pqty });
        }

        const noTracking = NO_TRACKING_TYPES.includes(dtype);
        const trackingNo = noTracking ? '' : String(row['Tracking No'] || '').trim();

        createDispatch({
          customerName:  name,
          address:       String(row['Address'] || '').trim(),
          orderId:       orderId,
          customerEmail: String(row['Customer Email'] || '').trim(),
          customerPhone: String(row['Customer Phone'] || '').trim(),
          website:       website,
          nameType:      String(row['Name Type'] || '').trim(),
          dispatchType:  dtype,
          trackingNo:    trackingNo,
          priority:      String(row['Priority'] || 'Normal').trim(),
          notes:         String(row['Notes'] || '').trim(),
          products:      products,
          assignedTo:    assignedTo || null,
          assignedToName: assignedToName || null,
          assignedBy:    session.userId,
          assignedByName: session.name,
          status:        'In Process',
        }, session);
        created++;
      });

      let msg = created + ' task(s) created successfully.';
      if (errors.length) msg += ' ' + errors.length + ' row(s) skipped: ' + errors.slice(0, 2).join('; ');
      showToast(msg, created > 0 ? 'success' : 'warn');
      if (onDone) onDone(created);
    } catch(err) {
      showToast('Failed to parse file: ' + err.message, 'error');
    }
  };
  reader.readAsBinaryString(file);
}

/* ── Auto-Escalation ───────────────────────────────────────── */
const ESCALATION_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Run on every page load for dispatchers.
 * Any task that is:
 *   - assigned to a specific dispatcher (assignedTo is set)
 *   - NOT yet completed
 *   - has NOT been escalated yet
 *   - was assigned more than 24 hours ago
 * gets flagged as escalated = true so ALL dispatchers can see and act on it.
 */
function runEscalationCheck() {
  const dispatches = getDispatches();
  let changed = false;
  const now = Date.now();

  dispatches.forEach(function(d) {
    if (d.escalated) return;                   // already escalated
    if (d.status === 'Completed') return;      // already done
    if (!d.assignedTo) return;                 // not an assigned task
    const assignedAt = new Date(d.assignedAt || d.createdAt).getTime();
    if (now - assignedAt >= ESCALATION_THRESHOLD_MS) {
      d.escalated    = true;
      d.escalatedAt  = new Date().toISOString();
      d.updatedAt    = new Date().toISOString();
      changed = true;
      logActivity('escalate',
        `Task ${d.orderId} auto-escalated after 24h — visible to all dispatchers`,
        d.id, 'dispatch', 'system', 'System');
    }
  });

  if (changed) saveDispatches(dispatches);
  return changed;
}

/* ── Auto-init ─────────────────────────────────────────────── */
(function init() {
  seedAdmin();
  initDarkMode();
})();

/* ── OCR Image Upload Feature ──────────────────────────────── */
function openImageOCRModal() {
  resetOCRModal();
  document.getElementById('ocr-modal-overlay').classList.add('open');
}

function closeImageOCRModal() {
  document.getElementById('ocr-modal-overlay').classList.remove('open');
}

function resetOCRModal() {
  document.getElementById('ocr-step-upload').classList.remove('hidden');
  document.getElementById('ocr-step-processing').classList.add('hidden');
  document.getElementById('ocr-step-review').classList.add('hidden');
  document.getElementById('ocr-create-btn').style.display = 'none';
  document.getElementById('ocr-file-input').value = '';
  ['ocr-name','ocr-email','ocr-phone','ocr-orderid','ocr-address','ocr-notes'].forEach(function(id){
    var el = document.getElementById(id);
    if(el){ el.value = ''; el.classList.remove('ocr-field-filled'); }
  });
}

function handleOCRDrop(e) {
  e.preventDefault();
  document.getElementById('ocr-dropzone').classList.remove('drag-over');
  var files = e.dataTransfer.files;
  if (files && files[0] && files[0].type.startsWith('image/')) {
    startOCR(files[0]);
  } else {
    showToast('Please drop an image file (JPG, PNG, etc.)', 'error');
  }
}

function startOCR(file) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var imgSrc = e.target.result;
    document.getElementById('ocr-preview-img').src = imgSrc;
    document.getElementById('ocr-review-img').src = imgSrc;
    document.getElementById('ocr-step-upload').classList.add('hidden');
    document.getElementById('ocr-step-processing').classList.remove('hidden');
    document.getElementById('ocr-status-text').textContent = 'Reading image...';
    document.getElementById('ocr-progress-bar').style.width = '0%';

    if (typeof Tesseract === 'undefined') {
      showToast('OCR library not loaded. Check internet connection.', 'error');
      resetOCRModal();
      return;
    }

    Tesseract.recognize(imgSrc, 'eng', {
      logger: function(m) {
        if (m.status === 'recognizing text') {
          var pct = Math.round((m.progress || 0) * 100);
          document.getElementById('ocr-progress-bar').style.width = pct + '%';
          document.getElementById('ocr-status-text').textContent = 'Reading image... ' + pct + '%';
        }
      }
    }).then(function(result) {
      var text = result.data.text || '';
      document.getElementById('ocr-step-processing').classList.add('hidden');
      document.getElementById('ocr-step-review').classList.remove('hidden');
      document.getElementById('ocr-create-btn').style.display = '';
      document.getElementById('ocr-raw-text').textContent = text.trim() || '(No text detected)';
      fillOCRFields(text);
    }).catch(function(err) {
      console.error('OCR error', err);
      showToast('Could not read image. Try a clearer photo.', 'error');
      resetOCRModal();
    });
  };
  reader.readAsDataURL(file);
}

function fillOCRFields(text) {
  var lines = text.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
  var lower = text.toLowerCase();

  // Email
  var emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  setOCRField('ocr-email', emailMatch ? emailMatch[0] : '');

  // Phone (10+ digits, optional separators)
  var phoneMatch = text.match(/(?:\+?91[\s\-]?)?[6-9]\d{9}|\+?[\d][\d\s\-\(\)]{9,14}\d/);
  setOCRField('ocr-phone', phoneMatch ? phoneMatch[0].replace(/\s/g,'') : '');

  // Order ID (patterns like ORD-xxx, #xxx, Order No: xxx, ID: xxx)
  var orderMatch = text.match(/(?:order\s*(?:id|no|number|#)[:\s#]*|#\s*)([A-Z0-9\-]{4,20})/i)
                || text.match(/\b(ORD[-\/]?[A-Z0-9\-]{3,15})\b/i)
                || text.match(/\bID[:\s]+([A-Z0-9\-]{4,20})\b/i);
  setOCRField('ocr-orderid', orderMatch ? orderMatch[1].trim() : '');

  // Name (look for "Name:", "Customer:", "To:", then use first non-empty non-label line)
  var nameMatch = text.match(/(?:name|customer|to|attn|recipient)[:\s]+([A-Za-z][A-Za-z\s\.]{2,40})/i);
  if (!nameMatch) {
    // Try first line that looks like a proper name (2 words, mostly alpha)
    for (var i = 0; i < Math.min(lines.length, 8); i++) {
      var l = lines[i];
      if (/^[A-Z][a-zA-Z\s\.]{4,40}$/.test(l) && l.split(' ').length >= 2) {
        nameMatch = [null, l];
        break;
      }
    }
  }
  setOCRField('ocr-name', nameMatch ? nameMatch[1].trim() : '');

  // Address (look for address-like block: contains pin/zip, street keywords)
  var addrMatch = text.match(/(?:address|addr|ship\s*to|deliver\s*to)[:\s]+([^\n]{5,}(?:\n[^\n]{5,}){0,3})/i);
  if (!addrMatch) {
    // Try to find pin code line and grab surrounding lines
    var pinIdx = lines.findIndex(function(l){ return /\b\d{6}\b/.test(l) || /\b\d{5}(?:[-\s]\d{4})?\b/.test(l); });
    if (pinIdx >= 0) {
      var start = Math.max(0, pinIdx - 2);
      var end = Math.min(lines.length, pinIdx + 2);
      addrMatch = [null, lines.slice(start, end).join(', ')];
    }
  }
  setOCRField('ocr-address', addrMatch ? addrMatch[1].replace(/\n/g,', ').trim() : '');

  // Notes: remaining non-empty lines not already captured
  var captured = [
    document.getElementById('ocr-email').value,
    document.getElementById('ocr-phone').value,
    document.getElementById('ocr-orderid').value,
    document.getElementById('ocr-name').value
  ].filter(Boolean).map(function(v){ return v.toLowerCase(); });

  var notesLines = lines.filter(function(l){
    if (l.length < 4) return false;
    var ll = l.toLowerCase();
    return !captured.some(function(c){ return ll.includes(c) || c.includes(ll); });
  });
  setOCRField('ocr-notes', notesLines.slice(0, 6).join(' | '));
}

function setOCRField(id, value) {
  var el = document.getElementById(id);
  if (!el) return;
  el.value = value || '';
  if (value) el.classList.add('ocr-field-filled');
  else el.classList.remove('ocr-field-filled');
}

function createOrderFromOCR() {
  var name    = (document.getElementById('ocr-name').value || '').trim();
  var email   = (document.getElementById('ocr-email').value || '').trim();
  var phone   = (document.getElementById('ocr-phone').value || '').trim();
  var orderid = (document.getElementById('ocr-orderid').value || '').trim();
  var address = (document.getElementById('ocr-address').value || '').trim();
  var notes   = (document.getElementById('ocr-notes').value || '').trim();

  closeImageOCRModal();
  openEntryModal();   // opens blank entry modal

  // Fill in the entry modal fields after a tick (to let modal render)
  setTimeout(function() {
    if (name)    { var n=document.getElementById('e-name');    if(n) n.value=name; }
    if (email)   { var e=document.getElementById('e-email');   if(e) e.value=email; }
    if (phone)   { var p=document.getElementById('e-phone');   if(p) p.value=phone; }
    if (orderid) { var o=document.getElementById('e-orderid'); if(o) o.value=orderid; }
    if (address) { var a=document.getElementById('e-address'); if(a) a.value=address; }
    if (notes)   {
      // Append notes to address or set in address if empty
      var addrEl = document.getElementById('e-address');
      if (addrEl && !addrEl.value && notes) addrEl.value = notes;
    }
    showToast('Form pre-filled from image. Review and save.', 'success');
  }, 150);
}
