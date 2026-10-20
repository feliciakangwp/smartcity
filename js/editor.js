// System register: read-only profile for everyone, edit form for the signed-in PM.
import * as store from './store.js';
import { computeLinks, STATUS_LABEL } from './validation.js';
import { esc, toast, requestLogin, partsBar, stageClass } from './ui.js';

let selectedId = null;
let draft = null;
let mode = 'view'; // 'view' | 'new'
let confirmingDelete = false;
let root;

const clone = (o) => JSON.parse(JSON.stringify(o));

export function renderRegister(el, opts = {}) {
  root = el;
  if (opts.system && opts.system !== selectedId) {
    selectedId = opts.system;
    draft = null;
    mode = 'view';
  }
  const systems = store.getSystems();
  if (mode !== 'new' && !systems.some((s) => s.id === selectedId)) {
    selectedId = systems[0]?.id ?? null;
    draft = null;
  }
  const links = computeLinks(systems);

  root.innerHTML = `<div class="wrap">
    <div class="view-head">
      <div>
        <div class="eyebrow">System register</div>
        <h1>System details</h1>
        <p class="muted">Each product manager records what their system is, how far the build has got, where it pulls data from and where it pushes data to.</p>
      </div>
    </div>
    <div class="register">
      <nav class="sys-list" aria-label="Systems">
        ${systems.map((s) => {
          const broken = links.some((l) => (l.from === s.id || l.to === s.id) && l.status === 'broken');
          return `<button data-sel="${esc(s.id)}" aria-current="${mode !== 'new' && s.id === selectedId}">
            <span>${esc(s.name)}</span>
            <span class="meta">${broken ? '<span class="dot bad" title="Has a broken linkage"></span>' : ''}${store.isSignedInFor(s.id) ? '<span title="Signed in">●</span>' : '<span aria-hidden="true">🔒</span>'} ${store.progressOf(s)}%</span>
          </button>`;
        }).join('')}
        <button class="add" data-new aria-current="${mode === 'new'}">+ Register a new system</button>
      </nav>
      <div id="reg-panel" style="min-width:0"></div>
    </div>
  </div>`;

  root.querySelectorAll('[data-sel]').forEach((b) => b.addEventListener('click', () => {
    selectedId = b.dataset.sel;
    draft = null;
    mode = 'view';
    confirmingDelete = false;
    renderRegister(root);
  }));
  root.querySelector('[data-new]').addEventListener('click', () => { mode = 'new'; renderRegister(root); });
  renderPanel();
}

function renderPanel() {
  const panel = root.querySelector('#reg-panel');
  if (mode === 'new') return renderNewForm(panel);
  const sys = store.getSystem(selectedId);
  if (!sys) { panel.innerHTML = '<div class="panel"><p class="empty">No systems yet. Register the first one.</p></div>'; return; }
  if (store.isSignedInFor(sys.id)) {
    if (!draft || draft.id !== sys.id) draft = clone(sys);
    renderEditForm(panel);
  } else {
    draft = null;
    renderReadOnly(panel, sys);
  }
}

// ---------- Read-only profile ----------
function renderReadOnly(panel, sys) {
  const links = computeLinks(store.getSystems());
  const p = store.progressOf(sys);
  const linkItem = (otherId, dir) => {
    const l = links.find((x) => (dir === 'up' ? x.from === otherId && x.to === sys.id : x.from === sys.id && x.to === otherId));
    const other = store.getSystem(otherId);
    return `<li><span><b>${esc(other?.name ?? otherId)}</b> · ${esc(l?.data ?? '')}</span>${l ? `<span class="chip ${l.status}">${STATUS_LABEL[l.status]}</span>` : ''}</li>`;
  };
  panel.innerHTML = `<div class="panel">
    <div class="panel-head">
      <div class="title">
        <div class="eyebrow">Product manager: ${esc(sys.pm.name)}</div>
        <h2>${esc(sys.name)}</h2>
        <div class="chips"><span class="chip ${stageClass(store.stageOf(p))}">${store.stageOf(p)}</span>${sys.legacy ? '<span class="chip legacy">Legacy</span>' : ''}${sys.leakingPipe ? '<span class="chip leak">Data leaks</span>' : ''}</div>
      </div>
      <div class="card-pct">${p}%</div>
    </div>
    <div class="lock-banner">
      <span>Only the ${esc(sys.name)} product manager can change these details.</span>
      <button class="btn primary" id="ro-login">Sign in to update</button>
    </div>
    <div class="read">
      <h3>About the build</h3>
      <p style="margin:0;max-width:65ch">${esc(sys.description || 'No description yet.')}</p>
    </div>
    <div class="block">
      <h3>Build parts</h3>
      ${partsBar(sys)}
      <ul class="ro-list">${sys.parts.map((pt) => `<li><span>${esc(pt.name)}</span><span class="num">${pt.progress}% · ${store.stageOf(pt.progress)}</span></li>`).join('') || '<li>No parts recorded</li>'}</ul>
    </div>
    <div class="grid-2">
      <div class="block"><h3>Pulls data from (upstream)</h3><ul class="ro-list">${sys.upstream.map((u) => linkItem(u.from, 'up')).join('') || '<li class="muted">None declared</li>'}</ul></div>
      <div class="block"><h3>Pushes data to (downstream)</h3><ul class="ro-list">${sys.downstream.map((d) => linkItem(d.to, 'down')).join('') || '<li class="muted">None declared</li>'}</ul></div>
    </div>
  </div>`;
  panel.querySelector('#ro-login').addEventListener('click', () => requestLogin(sys.id, () => renderRegister(root)));
}

// ---------- Edit form ----------
function systemsWithDraft() {
  return store.getSystems().map((s) => (s.id === draft.id ? draft : s));
}

function options(selected) {
  const others = store.getSystems().filter((s) => s.id !== draft.id);
  return `<option value="">Choose a system…</option>` +
    others.map((s) => `<option value="${esc(s.id)}" ${s.id === selected ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
}

function renderEditForm(panel) {
  const d = draft;
  const p = store.progressOf(d);
  panel.innerHTML = `<form class="panel" id="edit-form" novalidate>
    <div class="panel-head">
      <div class="title">
        <div class="eyebrow">Signed in as ${esc(d.pm.name)}</div>
        <h2>${esc(d.name)}</h2>
        <div class="chips" id="ed-chips"></div>
      </div>
      <div style="display:flex;gap:8px;align-items:center"><div class="card-pct" id="ed-total">${p}%</div><button type="button" class="btn small" id="ed-logout">Sign out</button></div>
    </div>

    <div class="block">
      <div class="block-head"><h3>About the build</h3></div>
      <div class="grid-2">
        <label class="field"><span>System name</span><input id="ed-name" data-f="name" value="${esc(d.name)}"></label>
        <label class="field"><span>Product manager</span><input id="ed-pm" data-f="pm.name" value="${esc(d.pm.name)}"></label>
      </div>
      <label class="field"><span>What is this system for?</span><textarea id="ed-desc" data-f="description" rows="3">${esc(d.description)}</textarea></label>
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        <label class="check"><input type="checkbox" id="ed-legacy" data-f="legacy" ${d.legacy ? 'checked' : ''}> Legacy system (shown as an old house)</label>
        <label class="check"><input type="checkbox" id="ed-leak" data-f="leakingPipe" ${d.leakingPipe ? 'checked' : ''}> Known data leaks or quality issues (leaking pipe)</label>
      </div>
    </div>

    <div class="block">
      <div class="block-head"><div><h3>Build parts</h3><p>Split the system into the parts being delivered. 0% is empty land, up to 15% is discovery, 100% is live.</p></div>
        <button type="button" class="btn small" data-add="part">+ Add part</button></div>
      ${d.parts.map((pt, i) => `<div class="row part-row">
        <input id="part-name-${i}" data-part="${i}" data-k="name" value="${esc(pt.name)}" aria-label="Part name">
        <input id="part-pct-${i}" type="range" min="0" max="100" step="5" data-part="${i}" data-k="progress" value="${pt.progress}" aria-label="${esc(pt.name)} progress">
        <output class="pct-out" id="part-out-${i}">${pt.progress}%</output>
        <button type="button" class="icon-btn" data-del-part="${i}" aria-label="Remove part ${esc(pt.name)}">✕</button>
      </div>`).join('') || '<p class="muted" style="margin:0">No parts yet. The system shows as empty land.</p>'}
    </div>

    ${linkBlock('up', 'Pulls data from (upstream)', 'Which systems does this system take data from?', d.upstream)}
    ${linkBlock('down', 'Pushes data to (downstream)', 'Which systems does this system send data to?', d.downstream)}

    <div class="block" id="ed-unmatched"></div>

    <div class="actions">
      <span class="confirm" id="ed-delete-zone"></span>
      <span style="flex:1"></span>
      <button type="button" class="btn ghost" id="ed-discard">Discard changes</button>
      <button type="submit" class="btn primary">Save changes</button>
    </div>
  </form>`;

  refresh();
  wireEdit(panel);
}

function linkBlock(dir, title, help, rows) {
  const key = dir === 'up' ? 'from' : 'to';
  return `<div class="block">
    <div class="block-head"><div><h3>${title}</h3><p>${help} Both sides must declare a link for it to count as connected.</p></div>
      <button type="button" class="btn small" data-add="${dir}">+ Add link</button></div>
    ${rows.map((r, i) => `<div class="row link-row">
      <select id="${dir}-sys-${i}" data-link="${dir}" data-i="${i}" data-k="${key}" aria-label="System">${options(r[key])}</select>
      <input id="${dir}-data-${i}" data-link="${dir}" data-i="${i}" data-k="data" value="${esc(r.data)}" placeholder="What data? e.g. Master records" aria-label="Data">
      <span class="status" id="${dir}-status-${i}"></span>
      <button type="button" class="icon-btn" data-del-link="${dir}" data-i="${i}" aria-label="Remove link">✕</button>
    </div>`).join('') || '<p class="muted" style="margin:0">None declared.</p>'}
  </div>`;
}

// Update everything derived from the draft without rebuilding inputs (keeps focus).
function refresh() {
  const panel = root.querySelector('#edit-form');
  if (!panel) return;
  const d = draft;
  const p = store.progressOf(d);
  panel.querySelector('#ed-total').textContent = `${p}%`;
  panel.querySelector('#ed-chips').innerHTML =
    `<span class="chip ${stageClass(store.stageOf(p))}">${store.stageOf(p)}</span>${d.legacy ? '<span class="chip legacy">Legacy</span>' : ''}${d.leakingPipe ? '<span class="chip leak">Data leaks</span>' : ''}`;
  d.parts.forEach((pt, i) => { const o = panel.querySelector(`#part-out-${i}`); if (o) o.textContent = `${pt.progress}%`; });

  const links = computeLinks(systemsWithDraft());
  const statusFor = (dir, otherId) => {
    if (!otherId) return '<span class="muted">Choose a system</span>';
    const other = store.getSystem(otherId);
    const l = links.find((x) => (dir === 'up' ? x.from === otherId && x.to === d.id : x.from === d.id && x.to === otherId));
    if (!l) return '';
    if (dir === 'up' && l.push === null) return `<span class="chip broken">✗ ${esc(other.name)} has not declared this push</span>`;
    if (dir === 'down' && l.pull === null) return `<span class="chip broken">✗ ${esc(other.name)} has not declared this need</span>`;
    if (l.status === 'risk') return `<span class="chip risk" title="${esc(l.issues.join('. '))}">! ${esc(other.name)} not built yet</span>`;
    return `<span class="chip ok">✓ ${esc(other.name)} confirms</span>`;
  };
  d.upstream.forEach((u, i) => { const el = panel.querySelector(`#up-status-${i}`); if (el) el.innerHTML = statusFor('up', u.from); });
  d.downstream.forEach((x, i) => { const el = panel.querySelector(`#down-status-${i}`); if (el) el.innerHTML = statusFor('down', x.to); });

  // Claims other systems make about this one that it has not matched yet.
  const claims = [];
  for (const l of links) {
    if (l.to === d.id && l.pull === null && l.push !== null) claims.push({ dir: 'up', other: l.from, name: l.srcName, data: l.data, text: `${l.srcName} says it pushes “${l.data}” to ${d.name}` });
    if (l.from === d.id && l.push === null && l.pull !== null) claims.push({ dir: 'down', other: l.to, name: l.tgtName, data: l.data, text: `${l.tgtName} says it pulls “${l.data}” from ${d.name}` });
  }
  const box = panel.querySelector('#ed-unmatched');
  box.hidden = !claims.length;
  box.innerHTML = claims.length ? `<div class="block-head"><div><h3>Unmatched claims</h3><p>Other systems list a link with ${esc(d.name)} that it has not declared. These show as broken linkages until they are matched.</p></div></div>
    <ul class="ro-list">${claims.map((c, i) => `<li><span>${esc(c.text)}</span><button type="button" class="btn small" data-accept="${i}">Add as ${c.dir === 'up' ? 'upstream' : 'downstream'}</button></li>`).join('')}</ul>` : '';
  box.querySelectorAll('[data-accept]').forEach((b) => b.addEventListener('click', () => {
    const c = claims[+b.dataset.accept];
    if (c.dir === 'up') draft.upstream.push({ from: c.other, data: c.data });
    else draft.downstream.push({ to: c.other, data: c.data });
    renderEditForm(root.querySelector('#reg-panel'));
  }));

  const zone = panel.querySelector('#ed-delete-zone');
  zone.innerHTML = confirmingDelete
    ? `Delete ${esc(d.name)} and remove its links? <button type="button" class="btn small" data-delete="no">Keep it</button><button type="button" class="btn small danger" data-delete="yes">Delete system</button>`
    : `<button type="button" class="btn small ghost danger" data-delete="ask">Delete system</button>`;
}

function wireEdit(panel) {
  const form = panel.querySelector('#edit-form');
  const rerender = () => renderEditForm(panel);

  form.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.f) {
      const v = t.type === 'checkbox' ? t.checked : t.value;
      if (t.dataset.f === 'pm.name') draft.pm.name = v;
      else draft[t.dataset.f] = v;
    } else if (t.dataset.part !== undefined) {
      const pt = draft.parts[+t.dataset.part];
      pt[t.dataset.k] = t.dataset.k === 'progress' ? +t.value : t.value;
    } else if (t.dataset.link) {
      const list = t.dataset.link === 'up' ? draft.upstream : draft.downstream;
      list[+t.dataset.i][t.dataset.k] = t.value;
      if (t.tagName === 'SELECT') return rerender();
    }
    refresh();
  });

  form.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.add === 'part') { draft.parts.push({ name: `Part ${String.fromCharCode(65 + draft.parts.length)}`, progress: 0 }); rerender(); }
    else if (t.dataset.add === 'up') { draft.upstream.push({ from: '', data: '' }); rerender(); }
    else if (t.dataset.add === 'down') { draft.downstream.push({ to: '', data: '' }); rerender(); }
    else if (t.dataset.delPart !== undefined) { draft.parts.splice(+t.dataset.delPart, 1); rerender(); }
    else if (t.dataset.delLink) { (t.dataset.delLink === 'up' ? draft.upstream : draft.downstream).splice(+t.dataset.i, 1); rerender(); }
    else if (t.dataset.delete === 'ask') { confirmingDelete = true; refresh(); }
    else if (t.dataset.delete === 'no') { confirmingDelete = false; refresh(); }
    else if (t.dataset.delete === 'yes') {
      const name = draft.name;
      confirmingDelete = false;
      draft = null;
      store.removeSystem(selectedId);
      toast(`Deleted ${name}`);
    }
  });

  form.querySelector('#ed-logout').addEventListener('click', () => { draft = null; store.logout(); toast('Signed out'); });
  form.querySelector('#ed-discard').addEventListener('click', () => { draft = null; renderPanel(); toast('Changes discarded'); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) { toast('Give the system a name before saving'); form.querySelector('#ed-name').focus(); return; }
    const out = clone(draft);
    out.name = name.toUpperCase();
    out.upstream = out.upstream.filter((u) => u.from).map((u) => ({ from: u.from, data: u.data.trim() }));
    out.downstream = out.downstream.filter((x) => x.to).map((x) => ({ to: x.to, data: x.data.trim() }));
    out.parts = out.parts.map((p) => ({ name: p.name.trim() || 'Unnamed part', progress: Math.max(0, Math.min(100, Math.round(p.progress))) }));
    draft = clone(out);
    store.saveSystem(out);
    toast(`Saved ${out.name}`);
  });
}

// ---------- New system ----------
function renderNewForm(panel) {
  panel.innerHTML = `<form class="panel" id="new-form" novalidate>
    <div class="panel-head"><div class="title"><div class="eyebrow">New system</div><h2>Register a new system</h2></div></div>
    <p class="muted" style="margin:0">You become the product manager for this system and are signed in straight away.</p>
    <div class="grid-2">
      <label class="field"><span>System name</span><input id="new-name" required placeholder="e.g. ATLAS"></label>
      <label class="field"><span>Product manager name</span><input id="new-pm" placeholder="e.g. Jordan Lee"></label>
      <label class="field"><span>Username</span><input id="new-user" required autocomplete="off" placeholder="e.g. atlas.pm"></label>
      <label class="field"><span>Passcode</span><input id="new-pass" type="password" required autocomplete="new-password"></label>
    </div>
    <p class="form-error" id="new-error" hidden></p>
    <div class="actions"><button type="button" class="btn ghost" id="new-cancel">Cancel</button><button type="submit" class="btn primary">Create and sign in</button></div>
  </form>`;
  const f = panel.querySelector('#new-form');
  panel.querySelector('#new-cancel').addEventListener('click', () => { mode = 'view'; renderRegister(root); });
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = f.querySelector('#new-name').value.trim();
    const user = f.querySelector('#new-user').value.trim();
    const pass = f.querySelector('#new-pass').value;
    const err = f.querySelector('#new-error');
    const id = store.slugify(name);
    let msg = '';
    if (!name || !id) msg = 'Enter a system name using letters or numbers.';
    else if (store.getSystem(id)) msg = `${name.toUpperCase()} is already in the register. Pick it from the list instead.`;
    else if (!user || !pass) msg = 'Enter a username and passcode so you can sign in later.';
    if (msg) { err.textContent = msg; err.hidden = false; return; }
    store.saveSystem({
      id, name: name.toUpperCase(), description: '',
      pm: { name: f.querySelector('#new-pm').value.trim() || `${name.toUpperCase()} Product Manager`, username: user },
      passcode: pass, legacy: false, leakingPipe: false,
      parts: [{ name: 'Whole system', progress: 0 }], upstream: [], downstream: [],
    });
    selectedId = id;
    mode = 'view';
    store.login(id, user, pass);
    toast(`Registered ${name.toUpperCase()}`);
  });
}
