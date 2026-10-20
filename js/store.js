// App state: the system register, saved in this browser's localStorage.
// PM sign-in is a client-side demo gate, not real authentication.
import { seedSystems } from './data.js';

const KEY = 'ict-cityscape.v1';
const SESSION_KEY = 'ict-cityscape.session';
const listeners = new Set();

let state = load();
let session = loadSession();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.systems)) return parsed;
    }
  } catch {}
  return { systems: seedSystems() };
}

function loadSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

function emit() {
  for (const fn of listeners) fn(state);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getSystems = () => state.systems;
export const getSystem = (id) => state.systems.find((s) => s.id === id);

export function saveSystem(sys) {
  const i = state.systems.findIndex((s) => s.id === sys.id);
  if (i >= 0) state.systems[i] = sys;
  else state.systems.push(sys);
  persist();
  emit();
}

export function removeSystem(id) {
  state.systems = state.systems.filter((s) => s.id !== id);
  for (const s of state.systems) {
    s.upstream = s.upstream.filter((u) => u.from !== id);
    s.downstream = s.downstream.filter((d) => d.to !== id);
  }
  if (session === id) logout();
  persist();
  emit();
}

export function resetDemo() {
  state = { systems: seedSystems() };
  logout();
  persist();
  emit();
}

export function login(id, username, passcode) {
  const sys = getSystem(id);
  if (!sys) return false;
  const ok = username.trim().toLowerCase() === sys.pm.username.toLowerCase() && passcode === sys.passcode;
  if (ok) {
    session = id;
    try { sessionStorage.setItem(SESSION_KEY, id); } catch {}
    emit();
  }
  return ok;
}

export function logout() {
  session = null;
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  emit();
}

export const isSignedInFor = (id) => session === id;
export const signedInSystem = () => session;

export function progressOf(sys) {
  if (!sys || !sys.parts.length) return 0;
  return Math.round(sys.parts.reduce((a, p) => a + p.progress, 0) / sys.parts.length);
}

export function stageOf(progress) {
  if (progress <= 0) return 'Empty land';
  if (progress <= 15) return 'Discovery';
  if (progress < 50) return 'Foundation';
  if (progress < 100) return 'Construction';
  return 'Live';
}

export function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
