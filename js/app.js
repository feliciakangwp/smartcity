// Entry point: tab navigation, session chip, and re-rendering on data changes.
import * as store from './store.js';
import { renderOverview } from './overview.js';
import { renderRegister } from './editor.js';
import { setNavigator, initLoginModal, esc, toast } from './ui.js';

const VIEWS = ['overview', 'register', 'city'];
let current = null;
let city = null;
let cityDirty = true;

function show(view, opts = {}) {
  if (!VIEWS.includes(view)) view = 'overview';
  current = view;
  for (const v of VIEWS) {
    document.getElementById(`view-${v}`).hidden = v !== view;
    document.getElementById(`tab-${v}`).setAttribute('aria-selected', String(v === view));
  }
  if (location.hash.slice(1) !== view) history.replaceState(null, '', `#${view}`);
  if (view === 'overview') renderOverview(document.getElementById('view-overview'));
  if (view === 'register') renderRegister(document.getElementById('view-register'), opts);
  if (view === 'city') showCity();
  else city?.pause();
  window.scrollTo(0, 0);
}

async function showCity() {
  try {
    if (!city) city = await import('./city.js');
    city.start(document.getElementById('city-stage'), { rebuild: cityDirty });
    cityDirty = false;
  } catch (err) {
    console.error(err);
    document.getElementById('city-loading').textContent = 'The 3D city could not load. Check your connection and reload the page.';
  }
}

function renderSession() {
  const id = store.signedInSystem();
  const sys = id && store.getSystem(id);
  const chip = document.getElementById('session-chip');
  chip.innerHTML = sys
    ? `<span>Signed in for <b>${esc(sys.name)}</b></span><button class="btn small" id="sess-out">Sign out</button>`
    : '<span>Viewing as guest</span>';
  chip.querySelector('#sess-out')?.addEventListener('click', () => { store.logout(); toast('Signed out'); });
}

setNavigator(show);
initLoginModal();
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => show(t.dataset.view)));
window.addEventListener('hashchange', () => {
  const v = location.hash.slice(1);
  if (v !== current && VIEWS.includes(v)) show(v);
});

store.subscribe(() => {
  cityDirty = true;
  renderSession();
  if (current === 'overview') renderOverview(document.getElementById('view-overview'));
  if (current === 'register') renderRegister(document.getElementById('view-register'));
  if (current === 'city') showCity();
});

renderSession();
show(location.hash.slice(1) || 'overview');
