// Linkage validation. A link A -> B is healthy only when A declares it pushes
// to B (downstream) AND B declares it pulls from A (upstream).
import { progressOf } from './store.js';

export function computeLinks(systems) {
  const byId = new Map(systems.map((s) => [s.id, s]));
  const links = new Map();
  const get = (from, to) => {
    const k = `${from}>${to}`;
    if (!links.has(k)) links.set(k, { from, to, push: null, pull: null });
    return links.get(k);
  };

  for (const s of systems) {
    for (const d of s.downstream) if (d.to) get(s.id, d.to).push = d.data || '';
    for (const u of s.upstream) if (u.from) get(u.from, s.id).pull = u.data || '';
  }

  return [...links.values()].map((l) => {
    const src = byId.get(l.from);
    const tgt = byId.get(l.to);
    const srcName = src?.name ?? l.from;
    const tgtName = tgt?.name ?? l.to;
    const issues = [];
    let status = 'ok';
    let lost = false;

    if (!src || !tgt) {
      status = 'broken';
      issues.push(`${!src ? srcName : tgtName} is not in the register`);
    }
    if (l.push === null) {
      status = 'broken';
      issues.push(`${srcName} has not declared that it pushes this data to ${tgtName}`);
    }
    if (l.pull === null) {
      status = 'broken';
      issues.push(`${tgtName} has not declared that it needs this data from ${srcName}`);
    }
    if (tgt && progressOf(tgt) === 0) {
      if (status === 'ok') status = 'risk';
      lost = true;
      issues.push(`${tgtName} is not built yet, so data sent to it is lost`);
    }
    if (src && progressOf(src) === 0) {
      if (status === 'ok') status = 'risk';
      issues.push(`${srcName} is not built yet, so nothing is being sent`);
    }

    return {
      ...l,
      srcName,
      tgtName,
      data: l.push || l.pull || 'Unnamed data',
      status,
      lost,
      issues,
    };
  });
}

export function summarise(links) {
  return {
    total: links.length,
    ok: links.filter((l) => l.status === 'ok').length,
    risk: links.filter((l) => l.status === 'risk').length,
    broken: links.filter((l) => l.status === 'broken').length,
  };
}

export const STATUS_LABEL = { ok: 'Connected', risk: 'At risk', broken: 'Broken linkage' };
