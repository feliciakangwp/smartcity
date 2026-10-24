// Animated sea: vertex-displaced waves with fresnel colouring, shallow water by
// the quay and a soft fade to the horizon.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorld } from '@/store/world';

export const WAVE_GLSL = /* glsl */ `
float wave(vec2 p, float t) {
  return 0.34 * sin(p.x * 0.045 + t * 0.9)
       + 0.24 * sin(p.y * 0.061 - t * 1.1 + p.x * 0.021)
       + 0.10 * sin((p.x + p.y) * 0.13 + t * 1.7);
}`;

/** Same function as the shader, for bobbing ships and buoys. */
export function waveHeight(x: number, z: number, t: number) {
  return 0.34 * Math.sin(x * 0.045 + t * 0.9) + 0.24 * Math.sin(z * 0.061 - t * 1.1 + x * 0.021) + 0.1 * Math.sin((x + z) * 0.13 + t * 1.7);
}

const vertex = /* glsl */ `
uniform float uTime;
varying vec3 vWorld;
varying float vH;
${WAVE_GLSL}
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float h = wave(wp.xz, uTime);
  wp.y += h;
  vH = h;
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const fragment = /* glsl */ `
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uHorizon;
uniform vec3 uSun;
varying vec3 vWorld;
varying float vH;
void main() {
  vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  if (n.y < 0.0) n = -n;
  vec3 view = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(n, view), 0.0), 3.0);
  float shore = smoothstep(70.0, 4.0, vWorld.z);
  vec3 col = mix(uDeep, uShallow, clamp(0.25 + vH * 0.45 + shore * 0.45, 0.0, 1.0));
  col = mix(col, uHorizon, fres * 0.55);
  float diff = max(dot(n, normalize(uSun)), 0.0);
  col *= 0.78 + diff * 0.3;
  float spec = pow(max(dot(reflect(-normalize(uSun), n), view), 0.0), 90.0);
  col += vec3(1.0, 0.97, 0.9) * spec * 0.45;
  float foam = smoothstep(0.52, 0.68, vH) * 0.18 + shore * smoothstep(0.2, 0.5, vH) * 0.22;
  col = mix(col, vec3(0.93, 0.97, 1.0), foam);
  float dist = length(cameraPosition.xz - vWorld.xz);
  col = mix(col, uHorizon, smoothstep(500.0, 1500.0, dist));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export function Ocean() {
  const quality = useWorld((s) => s.quality);
  const segments = quality === 'high' ? 280 : quality === 'medium' ? 180 : 90;
  const ref = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color('#0d4f8f') },
      uShallow: { value: new THREE.Color('#2f9bd0') },
      uHorizon: { value: new THREE.Color('#bfdcf0') },
      uSun: { value: new THREE.Vector3(0.5, 0.8, 0.3) },
    }),
    [],
  );
  useFrame((_, dt) => {
    if (ref.current) ref.current.uniforms.uTime.value += dt;
  });
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 500]} frustumCulled={false}>
      <planeGeometry args={[3200, 2000, segments, segments]} />
      <shaderMaterial ref={ref} vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} />
    </mesh>
  );
}
