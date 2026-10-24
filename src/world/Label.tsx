// Billboard text labels drawn to a canvas texture (no font downloads needed).
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface LabelStyle {
  text: string;
  sub?: string;
  color?: string;
  bg?: string;
  border?: string;
  size?: 'sm' | 'lg';
}

const cache = new Map<string, { tex: THREE.Texture; aspect: number }>();

function makeTexture({ text, sub, color = '#0f1c2e', bg = 'rgba(255,255,255,0.94)', border = '#1f56a3', size = 'sm' }: LabelStyle) {
  const key = JSON.stringify([text, sub, color, bg, border, size]);
  if (cache.has(key)) return cache.get(key)!;
  const scale = 2;
  const font = size === 'lg' ? 34 : 30;
  const subFont = 18;
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  g.font = `700 ${font * scale}px Sora, "Inter Tight", Arial, sans-serif`;
  const w1 = g.measureText(text).width;
  g.font = `500 ${subFont * scale}px "Inter Tight", Arial, sans-serif`;
  const w2 = sub ? g.measureText(sub).width : 0;
  const padX = 18 * scale;
  const h = (sub ? font + subFont + 26 : font + 22) * scale;
  const w = Math.max(w1, w2) + padX * 2;
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  g.fillStyle = bg;
  const r = 14 * scale;
  g.beginPath();
  g.roundRect(3, 3, c.width - 6, c.height - 6, r);
  g.fill();
  g.lineWidth = 4 * scale;
  g.strokeStyle = border;
  g.stroke();
  g.fillStyle = color;
  g.textBaseline = 'top';
  g.font = `700 ${font * scale}px Sora, "Inter Tight", Arial, sans-serif`;
  g.fillText(text, padX, 11 * scale);
  if (sub) {
    g.font = `500 ${subFont * scale}px "Inter Tight", Arial, sans-serif`;
    g.fillStyle = '#4a5c74';
    g.fillText(sub, padX, (font + 14) * scale);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const entry = { tex, aspect: c.width / c.height };
  cache.set(key, entry);
  return entry;
}

/**
 * `height` is a share of the viewport height, so labels stay legible at any zoom.
 * `maxDistance` hides the label when the camera is further away (level of detail).
 */
export function Label({
  position,
  height = 0.026,
  opacity = 1,
  maxDistance = Infinity,
  ...style
}: LabelStyle & { position: [number, number, number]; height?: number; opacity?: number; maxDistance?: number }) {
  const { tex, aspect } = useMemo(() => makeTexture(style), [style.text, style.sub, style.color, style.bg, style.border, style.size]);
  const ref = useRef<THREE.Sprite>(null);
  useFrame(({ camera }) => {
    const s = ref.current;
    if (!s || maxDistance === Infinity) return;
    s.getWorldPosition(_p);
    s.visible = camera.position.distanceTo(_p) < maxDistance;
  });
  return (
    <sprite ref={ref} position={position} scale={[height * aspect, height, 1]} renderOrder={10}>
      <spriteMaterial map={tex} transparent depthWrite={false} depthTest={false} opacity={opacity} sizeAttenuation={false} />
    </sprite>
  );
}

const _p = new THREE.Vector3();
