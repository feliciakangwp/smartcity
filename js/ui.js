// Shared UI helpers: escaping, toast, PM sign-in modal, navigation hook.
import * as store from './store.js';

export const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2600);
}

let navigate = () => {};
export const setNavigator = (fn) => (navigate = fn);
export const go = (view, opts) => navigate(view, opts);

// Open the register for a system, asking the PM to sign in first if needed.
export function openSystem(id, { requireLogin = true } = {}) {
  if (!requireLogin || store.isSignedInFor(id)) return go('register', { system: id });
  requestLogin(id, () => go('register', { system: id }));
}

let pending = null;
export function requestLogin(id, onSuccess) {
  const sys = store.getSystem(id);
  if (!sys) return;
  pending = { id, onSuccess };
  const modal = document.getElementById('login-modal');
  document.getElementById('login-desc').textContent = `Only the product manager for ${sys.name} can update its build progress and data links.`;
  document.getElementById('login-hint-user').textContent = sys.pm.username;
  document.getElementById('login-user').value = sys.pm.username;
  document.getElementById('login-pass').value = '';
  document.getElementById('login-error').hidden = true;
  modal.hidden = false;
  document.getElementById('login-pass').focus();
}

export function initLoginModal() {
  const modal = document.getElementById('login-modal');
  const form = document.getElementById('login-form');
  const close = () => { modal.hidden = true; pending = null; };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!pending) return;
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    if (store.login(pending.id, user, pass)) {
      const { onSuccess, id } = pending;
      close();
      toast(`Signed in as ${store.getSystem(id).name} product manager`);
      onSuccess?.();
    } else {
      const err = document.getElementById('login-error');
      err.textContent = 'Username or passcode does not match this system. Check the details and try again.';
      err.hidden = false;
    }
  });
  document.getElementById('login-cancel').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });
}

export function stageClass(stage) {
  return 'stage-' + stage.split(' ')[0].toLowerCase();
}

export function partsBar(sys) {
  const parts = sys.parts.length ? sys.parts : [{ name: '—', progress: 0 }];
  return `<div class="parts-bar" role="img" aria-label="${esc(parts.map((p) => `${p.name} ${p.progress}%`).join(', '))}">
    ${parts.map((p) => `<span class="seg" title="${esc(p.name)}: ${p.progress}%"><i class="${sys.legacy ? 'legacy' : ''}" style="width:${p.progress}%"></i></span>`).join('')}
  </div>`;
}
