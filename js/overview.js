// Front page: agency-wide summary, every system as a card, and the linkage check.
import * as store from './store.js';
import { computeLinks, summarise, STATUS_LABEL } from './validation.js';
import { esc, openSystem, partsBar, stageClass, go } from './ui.js';

export function renderOverview(root) {
  const systems = store.getSystems();
  const links = computeLinks(systems);
  const sum = summarise(links);
  const avg = systems.length ? Math.round(systems.reduce((a, s) => a + store.progressOf(s), 0) / systems.length) : 0;
  const live = systems.filter((s) => store.progressOf(s) === 100).length;
  const legacy = systems.filter((s) => s.legacy).length;

  const order = { broken: 0, risk: 1, ok: 2 };
  links.sort((a, b) => order[a.status] - order[b.status] || a.srcName.localeCompare(b.srcName));

  root.innerHTML = `<div class="wrap">
    <div class="view-head">
      <div>
        <div class="eyebrow">Agency ICT landscape</div>
        <h1>How far along is every system?</h1>
        <p class="muted">Build progress and data links as reported by each product manager. Select a system to sign in and update it.</p>
      </div>
      <div class="demo-note">Showing demo data <button class="btn small ghost" id="reset-demo">Reset demo data</button></div>
    </div>

    <div class="kpis">
      <div class="kpi"><div class="kpi-label">Systems in register</div><div class="kpi-value">${systems.length}</div><div class="kpi-sub">${live} live · ${legacy} legacy</div></div>
      <div class="kpi"><div class="kpi-label">Average build progress</div><div class="kpi-value">${avg}%</div><div class="kpi-sub">Mean across all systems</div></div>
      <div class="kpi"><div class="kpi-label">Healthy data links</div><div class="kpi-value">${sum.ok}<span class="muted" style="font-size:.5em"> / ${sum.total}</span></div><div class="kpi-sub">${sum.risk} at risk</div></div>
      <div class="kpi ${sum.broken ? 'alert' : ''}"><div class="kpi-label">Broken linkages</div><div class="kpi-value">${sum.broken}</div><div class="kpi-sub">Push or pull not declared</div></div>
    </div>

    <div class="section-title"><h2>Systems</h2><span class="muted" style="font-size:var(--step--1)">One bar segment per build part</span></div>
    <div class="cards">
      ${systems.map((s) => card(s, links)).join('')}
    </div>

    <div class="section-title"><h2>Data linkage check</h2><button class="btn small" id="to-city">See it in the city</button></div>
    <div class="table-wrap">
      ${links.length ? `<table>
        <thead><tr><th>Flow</th><th>Data</th><th>Push declared</th><th>Pull declared</th><th>Status</th><th>Findings</th></tr></thead>
        <tbody>${links.map(linkRow).join('')}</tbody>
      </table>` : '<div class="empty">No data links declared yet.</div>'}
    </div>
  </div>`;

  root.querySelectorAll('[data-open]').forEach((el) => el.addEventListener('click', () => openSystem(el.dataset.open)));
  root.querySelector('#to-city')?.addEventListener('click', () => go('city'));
  const reset = root.querySelector('#reset-demo');
  reset.addEventListener('click', () => {
    if (reset.dataset.armed) return store.resetDemo();
    reset.dataset.armed = '1';
    reset.textContent = 'Click again to discard all changes';
    reset.classList.add('danger');
    setTimeout(() => { if (reset.isConnected) { delete reset.dataset.armed; reset.textContent = 'Reset demo data'; reset.classList.remove('danger'); } }, 4000);
  });
}

function card(s, links) {
  const p = store.progressOf(s);
  const stage = store.stageOf(p);
  const mine = links.filter((l) => l.from === s.id || l.to === s.id);
  const broken = mine.filter((l) => l.status === 'broken').length;
  const ups = s.upstream.length;
  const downs = s.downstream.length;
  return `<button class="card" data-open="${esc(s.id)}" aria-label="Open ${esc(s.name)}">
    <div class="card-top">
      <div class="card-name">${esc(s.name)}</div>
      <div class="card-pct">${p}%</div>
    </div>
    ${partsBar(s)}
    ${s.parts.length > 1 ? `<div class="parts-legend">${s.parts.map((pt) => `<span>${esc(pt.name)} ${pt.progress}%</span>`).join('')}</div>` : ''}
    <div class="chips">
      <span class="chip ${stageClass(stage)}">${stage}</span>
      ${s.legacy ? '<span class="chip legacy">Legacy</span>' : ''}
      ${s.leakingPipe ? '<span class="chip leak">Data leaks</span>' : ''}
      ${broken ? `<span class="chip broken">${broken} broken link${broken > 1 ? 's' : ''}</span>` : ''}
    </div>
    <p class="card-desc">${esc(s.description || 'No description yet.')}</p>
    <div class="card-foot"><span>Pulls from ${ups} · Pushes to ${downs}</span><span class="card-cta">${store.isSignedInFor(s.id) ? 'Edit' : 'Sign in to update'} →</span></div>
  </button>`;
}

function linkRow(l) {
  const tick = (v) => v === null ? '<span class="tick no">✗ No</span>' : '<span class="tick yes">✓ Yes</span>';
  return `<tr>
    <td class="flow">${esc(l.srcName)}<span class="arrow">→</span>${esc(l.tgtName)}</td>
    <td>${esc(l.data)}</td>
    <td>${tick(l.push)}</td>
    <td>${tick(l.pull)}</td>
    <td><span class="chip ${l.status}">${STATUS_LABEL[l.status]}</span></td>
    <td>${l.issues.length ? `<ul class="issues">${l.issues.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '<span class="muted">Both sides agree</span>'}</td>
  </tr>`;
}
