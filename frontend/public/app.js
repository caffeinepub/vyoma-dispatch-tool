/* ============================================================
   Vyoma Linguistic Labs Foundation — Dispatch Tool
   app.js — Shared Utilities
   ============================================================ */

'use strict';

/* ── Constants ─────────────────────────────────────────────── */
const KEYS = {
  users:      'vyoma_users',
  dispatches: 'vyoma_dispatches',
  session:    'vyoma_session',
  activity:   'vyoma_activity',
  darkMode:   'vyoma_dark',
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

const WEBSITES = [
  'digitalsanskritguru.com',
  'Direct Sales',
  'Sponsored Sales',
  'Bulk Sales',
];

const NAME_TYPES = [
  'Complimentary',
  'Retail',
  'Discounted',
  'Free',
];

const DISPATCH_TYPES = [
  'Post Office',
  'DDTC',
  'Professional',
  'FedEx',
  'Other Couriers',
];

const STATUSES = ['Draft', 'In Process', 'Dispatched', 'Delivered', 'Completed'];
const STATUS_FLOW = {
  'Draft': ['Draft', 'In Process'],
  'In Process': ['In Process', 'Dispatched'],
  'Dispatched': ['Dispatched', 'Delivered'],
  'Delivered': ['Delivered', 'Completed'],
  'Completed': ['Completed'],
};

const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours

/* ── Storage Helpers ───────────────────────────────────────── */
const store = {
  get: (key) => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  getObj: (key) => { try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; } },
  setObj: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  remove: (key) => localStorage.removeItem(key),
};

const getUsers      = () => store.get(KEYS.users);
const saveUsers     = (u) => store.set(KEYS.users, u);
const getDispatches = () => store.get(KEYS.dispatches);
const saveDispatches= (d) => store.set(KEYS.dispatches, d);
const getActivity   = () => store.get(KEYS.activity);
const saveActivity  = (a) => store.set(KEYS.activity, a);
const getSession    = () => store.getObj(KEYS.session);
const saveSession   = (s) => store.setObj(KEYS.session, s);
const clearSession  = () => store.remove(KEYS.session);

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
  const user = users.find(u =>
    u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!user) return { ok: false, error: 'Invalid email or password.' };
  if (user.status === 'inactive') return { ok: false, error: 'Your account is inactive. Contact admin.' };

  const session = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    loginTime: Date.now(),
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
  if (requiredRole === 'user' && s.role === 'admin') {
    window.location.href = 'admin.html';
    return null;
  }

  // Refresh last activity
  s.lastActivity = Date.now();
  saveSession(s);
  return s;
}

// Touch last activity on any user interaction
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
    id: genId(),
    action,
    details,
    entityId: entityId || null,
    entityType: entityType || null,
    userId: userId || (s ? s.userId : null),
    userName: userName || (s ? s.name : 'System'),
    timestamp: new Date().toISOString(),
  });
  // Keep latest 500
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
    id: genId(),
    slNo: data.slNo || getNextSlNo(session.userId),
    customerName: data.customerName,
    nameType: data.nameType || '',
    address: data.address || '',
    orderId: data.orderId,
    website: data.website,
    dispatchType: data.dispatchType,
    trackingNo: data.trackingNo || '',
    customerEmail: data.customerEmail || '',
    products: data.products || [],
    notes: data.notes || '',
    status: data.status || 'In Process',
    emailSent: false,
    emailSentAt: null,
    createdBy: session.userId,
    createdByName: session.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warn: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3400);
}

/* ── Confirm Dialog ────────────────────────────────────────── */
function confirmAction(message, onConfirm, title = 'Confirm Action') {
  const existing = document.getElementById('confirm-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="modal modal-sm">
      <div class="modal-header">
        <h3>${title}</h3>
      </div>
      <div class="modal-body">
        <p style="font-size:0.95rem">${message}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="confirm-cancel">Cancel</button>
        <button class="btn btn-danger" id="confirm-ok" data-ocid="confirm.confirm_button">Confirm</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  document.getElementById('confirm-cancel').onclick = () => overlay.remove();
  document.getElementById('confirm-ok').onclick = () => { overlay.remove(); onConfirm(); };
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
  document.querySelectorAll('.dark-toggle').forEach(btn => {
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
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  return `${day}d ago`;
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

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function buildSelectOptions(arr, selected = '') {
  return arr.map(v =>
    `<option value="${escHtml(v)}" ${v === selected ? 'selected' : ''}>${escHtml(v)}</option>`
  ).join('');
}

/* ── Email Template ────────────────────────────────────────── */
function buildEmailBody(entry) {
  const date = formatDate(entry.updatedAt || entry.createdAt);
  return `Dear ${entry.customerName},

Your order has been dispatched successfully.

Order Details:
- Order ID: ${entry.orderId}
- Tracking Number: ${entry.trackingNo || 'N/A'}
- Dispatch Type: ${entry.dispatchType}
- Dispatch Date: ${date}

You can track your order using the tracking number above.

Thank you for your support!

Warm regards,
Vyoma Linguistic Labs Foundation`;
}

function buildEmailSubject(entry) {
  return `Your Order ${entry.orderId} has been dispatched - Vyoma Linguistic Labs Foundation`;
}

/* ── Export Helpers ────────────────────────────────────────── */
function exportCSV(rows, filename) {
  if (!rows || rows.length === 0) { showToast('No data to export', 'warn'); return; }
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        let v = row[h] === null || row[h] === undefined ? '' : String(row[h]);
        v = v.replace(/"/g, '""');
        if (v.includes(',') || v.includes('\n') || v.includes('"')) v = `"${v}"`;
        return v;
      }).join(',')
    )
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
    'Sl No': d.slNo,
    'Customer Name': d.customerName,
    'Name Type': d.nameType || '',
    'Address': d.address,
    'Order ID': d.orderId,
    'Website': d.website,
    'Dispatch Type': d.dispatchType,
    'Tracking No': d.trackingNo,
    'Customer Email': d.customerEmail,
    'Products': productsSummary,
    'Status': d.status,
    'Email Sent': d.emailSent ? 'Yes' : 'No',
    'Created By': d.createdByName,
    'Created At': formatDateTime(d.createdAt),
    'Updated At': formatDateTime(d.updatedAt),
    'Notes': d.notes,
  };
}

/* ── Auto-init ─────────────────────────────────────────────── */
(function init() {
  seedAdmin();
  initDarkMode();
})();
