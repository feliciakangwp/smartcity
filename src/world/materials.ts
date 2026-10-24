// Shared geometries, materials and textures. Everything is cached so repeated
// buildings and props reuse GPU resources instead of creating new ones.
import * as THREE from 'three';

const geoCache = new Map<string, THREE.BufferGeometry>();
export function boxGeo(w = 1, h = 1, d = 1) {
  const k = `b${w}|${h}|${d}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.BoxGeometry(w, h, d));
  return geoCache.get(k)!;
}
export function cylGeo(rt = 1, rb = 1, h = 1, seg = 12) {
  const k = `c${rt}|${rb}|${h}|${seg}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.CylinderGeometry(rt, rb, h, seg));
  return geoCache.get(k)!;
}
export const UNIT_BOX = boxGeo(1, 1, 1);
export const UNIT_CYL = cylGeo(1, 1, 1, 14);

const matCache = new Map<string, THREE.Material>();
export interface MatOpts {
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  map?: THREE.Texture;
  side?: THREE.Side;
}
export function mat(color: string, o: MatOpts = {}) {
  const k = `${color}|${JSON.stringify({ ...o, map: o.map?.uuid })}`;
  let m = matCache.get(k) as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: o.roughness ?? 0.75,
      metalness: o.metalness ?? 0.05,
      emissive: o.emissive ?? '#000000',
      emissiveIntensity: o.emissiveIntensity ?? 0,
      transparent: o.opacity !== undefined && o.opacity < 1,
      opacity: o.opacity ?? 1,
      map: o.map ?? null,
      side: o.side ?? THREE.FrontSide,
      depthWrite: o.opacity === undefined || o.opacity >= 1,
    });
    matCache.set(k, m);
  }
  return m;
}

export const C = {
  concrete: '#c9cfd4',
  asphalt: '#454d55',
  quay: '#8c949b',
  grass: '#9cc98c',
  sand: '#e3d6b4',
  white: '#f3f6f9',
  glass: '#86b9de',
  dark: '#34404d',
  roof: '#a3adb7',
  steel: '#6f7b86',
  craneBlue: '#2c6fbf',
  craneYellow: '#f2b705',
};

// Window grid texture, tinted per material through `color`.
const texCache = new Map<string, THREE.Texture>();
export function windowTexture(cols: number, rows: number, style: 'grid' | 'band' | 'slit' = 'grid') {
  const k = `${cols}x${rows}|${style}`;
  if (texCache.has(k)) return texCache.get(k)!;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, size, size);
  g.fillStyle = '#6f9cc4';
  if (style === 'band') {
    g.fillRect(0, size * 0.35, size, size * 0.42);
    g.fillStyle = '#9fc2df';
    g.fillRect(0, size * 0.35, size, size * 0.08);
  } else if (style === 'slit') {
    g.fillRect(size * 0.42, size * 0.25, size * 0.16, size * 0.5);
  } else {
    g.fillRect(size * 0.18, size * 0.22, size * 0.64, size * 0.56);
    g.fillStyle = '#a9cbe6';
    g.fillRect(size * 0.18, size * 0.22, size * 0.64, size * 0.14);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(cols, rows);
  t.anisotropy = 4;
  texCache.set(k, t);
  return t;
}

export type Tone = 'normal' | 'hover' | 'highlight' | 'dim';

/** Material set for a building in a given interaction tone. */
export function buildingMats(accent: string, tone: Tone) {
  const dim = tone === 'dim' ? 0.32 : undefined;
  const glow = tone === 'hover' ? 0.22 : tone === 'highlight' ? 0.42 : 0;
  const em = glow ? { emissive: accent, emissiveIntensity: glow } : {};
  return {
    wall: (map?: THREE.Texture) => mat(C.white, { map, opacity: dim, roughness: 0.65, ...em }),
    accent: mat(accent, { opacity: dim, roughness: 0.5, ...em }),
    glass: mat(C.glass, { opacity: dim ?? 0.95, roughness: 0.12, metalness: 0.35, ...em }),
    roof: mat(C.roof, { opacity: dim, roughness: 0.8 }),
    dark: mat(C.dark, { opacity: dim, roughness: 0.6 }),
    steel: mat(C.steel, { opacity: dim, roughness: 0.45, metalness: 0.4 }),
    screen: mat('#5ad6f0', { emissive: '#22c3e6', emissiveIntensity: 0.9, opacity: dim }),
    tone,
  };
}
export type BuildingMats = ReturnType<typeof buildingMats>;

export function tint(hex: string, toward = '#ffffff', amount = 0.7) {
  return '#' + new THREE.Color(hex).lerp(new THREE.Color(toward), amount).getHexString();
}
