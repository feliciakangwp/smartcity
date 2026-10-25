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
  /** World height above which the mesh is cut away (buildings under construction). */
  clipY?: number;
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
      side: o.clipY !== undefined ? THREE.DoubleSide : (o.side ?? THREE.FrontSide),
      depthWrite: o.opacity === undefined || o.opacity >= 1,
      clippingPlanes: o.clipY !== undefined ? [new THREE.Plane(new THREE.Vector3(0, -1, 0), o.clipY)] : undefined,
      clipShadows: o.clipY !== undefined,
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
/** Standard, legacy (older than five years) or modern (new and vibrant). */
export type Look = 'standard' | 'legacy' | 'modern';

/** Material set for a building in a given interaction tone, age look and build cut-off. */
export function buildingMats(accent: string, tone: Tone, look: Look = 'standard', clipY?: number) {
  const dim = tone === 'dim' ? 0.32 : undefined;
  const glow = tone === 'hover' ? 0.22 : tone === 'highlight' ? 0.42 : 0;
  const legacy = look === 'legacy';
  const modern = look === 'modern';
  const acc = legacy ? tint(accent, '#7d7468', 0.55) : accent;
  const em = glow ? { emissive: accent, emissiveIntensity: glow } : modern ? { emissive: accent, emissiveIntensity: 0.12 } : {};
  const c = clipY !== undefined ? { clipY } : {};
  return {
    wall: (map?: THREE.Texture) => mat(legacy ? '#d3c7b2' : modern ? '#f7fafc' : C.white, { map, opacity: dim, roughness: legacy ? 0.95 : 0.6, ...em, ...c }),
    accent: mat(acc, { opacity: dim, roughness: legacy ? 0.9 : modern ? 0.35 : 0.5, metalness: modern ? 0.2 : 0.05, ...em, ...c }),
    glass: mat(legacy ? '#7d8f9b' : modern ? '#7cc6f2' : C.glass, { opacity: dim ?? 0.95, roughness: legacy ? 0.55 : modern ? 0.05 : 0.12, metalness: modern ? 0.5 : 0.35, ...em, ...c }),
    roof: mat(legacy ? '#7a6455' : C.roof, { opacity: dim, roughness: 0.85, ...c }),
    dark: mat(legacy ? '#4a4038' : C.dark, { opacity: dim, roughness: 0.6, ...c }),
    steel: mat(legacy ? '#6d6a66' : C.steel, { opacity: dim, roughness: legacy ? 0.85 : 0.45, metalness: legacy ? 0.1 : 0.4, ...c }),
    screen: mat(legacy ? '#9fb3bd' : '#5ad6f0', { emissive: legacy ? '#000000' : '#22c3e6', emissiveIntensity: legacy ? 0 : modern ? 1.2 : 0.9, opacity: dim, ...c }),
    tone,
    look,
  };
}
export type BuildingMats = ReturnType<typeof buildingMats>;

export function tint(hex: string, toward = '#ffffff', amount = 0.7) {
  return '#' + new THREE.Color(hex).lerp(new THREE.Color(toward), amount).getHexString();
}
