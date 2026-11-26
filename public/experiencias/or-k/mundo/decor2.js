// The outer ring: Ruinas Sombrías, Nido del Dragón, Isla Helada, Volcán Ígneo.
import * as THREE from 'three';
import { scene, rand, rr, pick, inst, mat4, NOISE } from './core.js';
import { OUTER, gy, addObstacle, addBox, freeSpot } from './terrain.js';
import { DMAT as M, pineTree, scatterGrass, scatterFlowers, rockAt } from './decor.js';
import { texMat } from './textures.js';

const A = { lavaU: { time: { value: 0 } }, braziers: [], snow: null, embers: null, eggs: [] };
const by = () => Object.fromEntries(OUTER.map(i => [i.id, i]));
const P = (isl, lx, lz) => [isl.c.x + lx, gy(isl, lx, lz), isl.c.z + lz];
const nearEntry = (isl, w = 0.3) => (lx, lz) => {
  const ang = Math.atan2(isl.from.c.z - isl.c.z, isl.from.c.x - isl.c.x), a = Math.atan2(lz, lx);
  return Math.abs(((a - ang) + Math.PI * 3) % (Math.PI * 2) - Math.PI) < w && Math.hypot(lx, lz) > 3;
};
const ringPt = (isl, rMin, rMax, avoid) => {
  rMin *= isl.k; rMax = Math.min(rMax * isl.k, isl.R * 0.9);
  for (let k = 0; k < 40; k++) { const a = rand() * 6.28, r = rr(rMin, rMax), lx = Math.cos(a) * r, lz = Math.sin(a) * r;
    if ((!avoid || !avoid(lx, lz)) && freeSpot(isl.c.x + lx, isl.c.z + lz, 0.8)) return [lx, lz]; }
  return [rMin, 0];
};

// ---------------- Ruinas Sombrías ----------------
function buildRuinas(isl) {
  const stone = texMat('brick', { color: 0x8a8398, flatShading: true });
  const moss = new THREE.MeshStandardMaterial({ color: 0x3a5a3a, roughness: 1, flatShading: true });
  const avoid = nearEntry(isl, 0.25);
  // circle of broken columns around a central altar
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2, r = 7.5 * isl.k, lx = Math.cos(a) * r, lz = Math.sin(a) * r;
    if (avoid(lx, lz)) continue;
    const [x, y, z] = P(isl, lx, lz), h = rand() < 0.35 ? rr(0.6, 1.4) : rr(2.6, 4.2);
    inst('rcol', new THREE.CylinderGeometry(0.42, 0.5, 1, 10), stone, mat4(x, y + h / 2 - 0.1, z, rand() * 6, 1, h, 1, rr(-0.05, 0.05), rr(-0.05, 0.05)));
    inst('rbase', new THREE.BoxGeometry(1.3, 0.35, 1.3), stone, mat4(x, y + 0.1, z, a));
    if (h > 2) inst('rcap', new THREE.BoxGeometry(1.2, 0.3, 1.2), stone, mat4(x, y + h, z, a));
    addObstacle(x, z, 0.65);
  }
  // fallen columns
  for (let k = 0; k < 6; k++) { const [lx, lz] = ringPt(isl, 3, 13, avoid), [x, y, z] = P(isl, lx, lz);
    const ry = rand() * 6, L = rr(2, 3.5); inst('rfall', new THREE.CylinderGeometry(0.42, 0.42, 1, 10), stone, mat4(x, y + 0.35, z, ry, 1, L, 1, 0, Math.PI / 2)); addBox(x, z, L / 2, 0.45, ry); }
  // crumbling walls
  for (let w = 0; w < 8; w++) {
    const a0 = rand() * 6.28, r = rr(10.5, 13) * isl.k, segs = 7 + (rand() * 5 | 0);
    for (let k = 0; k < segs; k++) {
      const a = a0 + k * 0.11 / isl.k, lx = Math.cos(a) * r, lz = Math.sin(a) * r; if (avoid(lx, lz)) continue;
      const [x, y, z] = P(isl, lx, lz), h = rand() < 0.3 ? rr(0.3, 0.8) : rr(1.2, 2.4);
      inst('rwall', new THREE.BoxGeometry(1, 1, 0.6), stone, mat4(x, y + h / 2 - 0.1, z, -a, 1.25, h, 1)); addBox(x, z, 0.64, 0.32, -a);
      if (rand() < 0.4) inst('rmoss', new THREE.IcosahedronGeometry(0.3, 0), moss, mat4(x, y + h, z, rand() * 6, rr(0.8, 1.5), 0.4, rr(0.8, 1.5)));
    }
  }
  // graves
  const graveM = new THREE.MeshStandardMaterial({ color: 0x7a7488, roughness: 1, flatShading: true });
  for (let k = 0; k < 40; k++) {
    const [lx, lz] = ringPt(isl, 3.5, 14, avoid), [x, y, z] = P(isl, lx, lz), ry = rand() * 6;
    addObstacle(x, z, 0.3);
    if (rand() < 0.5) inst('grave', new THREE.CapsuleGeometry(0.28, 0.5, 2, 6), graveM, mat4(x, y + 0.35, z, ry, 1, 1, 0.35, rr(-0.2, 0.2)));
    else { inst('cross1', new THREE.BoxGeometry(0.12, 1.0, 0.12), graveM, mat4(x, y + 0.45, z, ry, 1, 1, 1, 0, rr(-0.2, 0.2))); inst('cross2', new THREE.BoxGeometry(0.55, 0.12, 0.12), graveM, mat4(x, y + 0.7, z, ry)); }
  }
  // dead trees
  const deadM = new THREE.MeshStandardMaterial({ color: 0x2a2228, roughness: 1, flatShading: true });
  for (let k = 0; k < 26; k++) {
    const [lx, lz] = ringPt(isl, 4, 14.5, avoid), [x, y, z] = P(isl, lx, lz), s = rr(1, 1.8);
    inst('dtrunk', new THREE.CylinderGeometry(0.06, 0.16, 1, 5).translate(0, 0.5, 0), deadM, mat4(x, y, z, rand() * 6, s, s * 2.2, s, rr(-0.1, 0.1)));
    for (let b = 0; b < 4; b++) inst('dbranch', new THREE.CylinderGeometry(0.02, 0.06, 1, 4).translate(0, 0.5, 0), deadM,
      mat4(x, y + s * rr(1.0, 2.0), z, rand() * 6, s * 0.8, s * rr(0.6, 1.1), s * 0.8, rr(0.6, 1.1), rr(-0.4, 0.4)));
    addObstacle(x, z, 0.3);
  }
  // altar + green braziers
  const [ax, ay, az] = P(isl, 0, 0);
  inst('altar', new THREE.BoxGeometry(3, 0.6, 3), stone, mat4(ax, ay + 0.2, az, 0.3)); inst('altar2', new THREE.BoxGeometry(1.8, 0.9, 1.0), stone, mat4(ax, ay + 0.9, az, 0.3));
  addBox(ax, az, 1.5, 1.5, 0.3);
  const fireM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.0, 0.5).multiplyScalar(3), toneMapped: false });
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * 6.28 + 0.2, lx = Math.cos(a) * 4.2 * isl.k, lz = Math.sin(a) * 4.2 * isl.k; if (avoid(lx, lz)) continue; const [x, y, z] = P(isl, lx, lz);
    inst('brz', new THREE.CylinderGeometry(0.35, 0.15, 0.5, 8), M.stone, mat4(x, y + 0.9, z)); inst('brzp', new THREE.CylinderGeometry(0.08, 0.1, 0.9, 6), M.stone, mat4(x, y + 0.45, z));
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.8, 8), fireM); f.position.set(x, y + 1.5, z); scene.add(f); A.braziers.push(f);
    addObstacle(x, z, 0.4);
  }
  // ruined gate facing the bridge
  const ga = Math.atan2(isl.from.c.z - isl.c.z, isl.from.c.x - isl.c.x);
  for (const s of [-1, 1]) {
    const lx = Math.cos(ga) * (isl.R * 0.8) + Math.cos(ga + Math.PI / 2) * 1.6 * s, lz = Math.sin(ga) * (isl.R * 0.8) + Math.sin(ga + Math.PI / 2) * 1.6 * s;
    const [x, y, z] = P(isl, lx, lz); inst('gatep', new THREE.BoxGeometry(0.9, 4.5, 0.9), stone, mat4(x, y + 2.1, z, -ga)); addBox(x, z, 0.47, 0.47, -ga);
  }
  { const lx = Math.cos(ga) * isl.R * 0.8, lz = Math.sin(ga) * isl.R * 0.8, [x, y, z] = P(isl, lx, lz); inst('gatet', new THREE.BoxGeometry(4.4, 0.8, 1.0), stone, mat4(x, y + 4.6, z, -ga + Math.PI / 2, 1, 1, 1, 0, 0.08)); }
  scatterGrass(isl, 3500);
  scatterFlowers(isl, 120, [0x8a6aff, 0x6affa0, 0xaaaaaa]);
}

// ---------------- Nido del Dragón ----------------
function buildNido(isl) {
  const stick = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 });
  const K = isl.k, nests = [[0, 0, 3.4], [6.5 * K, -4 * K, 2.6], [-6 * K, 4.5 * K, 2.6]];
  isl.nests = [];
  for (const [nx, nz, R] of nests) {
    const [x, y, z] = P(isl, nx, nz);
    for (let k = 0; k < 90; k++) {
      const a = rand() * 6.28, r = R + rr(-0.4, 0.4), h = rr(0, 0.9);
      inst('stick', new THREE.CylinderGeometry(0.05, 0.07, 1, 5), stick, mat4(x + Math.cos(a) * r, y + h, z + Math.sin(a) * r, a + rr(1.2, 1.9), 1, rr(1.4, 2.4), 1, rr(1.2, 1.8), rr(-0.5, 0.5)), new THREE.Color(0x6a4a2a).offsetHSL(0, 0, rr(-0.08, 0.08)));
    }
    inst('nestbed', new THREE.CylinderGeometry(R, R * 0.8, 0.4, 20), new THREE.MeshStandardMaterial({ color: 0xb09060, roughness: 1 }), mat4(x, y + 0.15, z));
    for (let e = 0; e < 3; e++) {
      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 10).scale(1, 1.3, 1), new THREE.MeshStandardMaterial({ color: pick([0xff6a4a, 0x6ad0ff, 0xffd04a, 0xb08cff]), roughness: 0.35, metalness: 0.2, emissive: 0x220000 }));
      egg.position.set(x + rr(-1, 1), y + 0.75, z + rr(-1, 1)); addObstacle(egg.position.x, egg.position.z, 0.38); egg.rotation.set(rr(-0.3, 0.3), 0, rr(-0.3, 0.3)); egg.castShadow = true; scene.add(egg); A.eggs.push(egg);
    }
    isl.nests.push(new THREE.Vector3(x, y, z));
  }
  // crags & bones
  const crag = new THREE.MeshStandardMaterial({ color: 0x8a7a70, roughness: 1, flatShading: true });
  for (let k = 0; k < 16; k++) { const [lx, lz] = ringPt(isl, 4, 12.5, nearEntry(isl)), [x, y, z] = P(isl, lx, lz), s = rr(0.8, 2.6);
    inst('crag', new THREE.ConeGeometry(0.8, 2.5, 5), crag, mat4(x, y + s * 0.9, z, rand() * 6, s * 0.8, s, s * 0.8, rr(-0.2, 0.2), rr(-0.2, 0.2))); addObstacle(x, z, 0.6 * s); }
  const bone = new THREE.MeshStandardMaterial({ color: 0xefe6d6, roughness: 0.8 });
  for (let k = 0; k < 10; k++) { const [lx, lz] = ringPt(isl, 2, 12), [x, y, z] = P(isl, lx, lz);
    inst('rib', new THREE.TorusGeometry(0.8, 0.07, 5, 12, Math.PI), bone, mat4(x, y, z, rand() * 6, rr(0.8, 1.4))); }
  // keeper's tent
  const ta = Math.atan2(isl.from.c.z - isl.c.z, isl.from.c.x - isl.c.x) + 0.6, tx = Math.cos(ta) * 9 * isl.k, tz = Math.sin(ta) * 9 * isl.k, [x, y, z] = P(isl, tx, tz);
  const tent = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2.6, 6), new THREE.MeshStandardMaterial({ color: 0xc04a3a, roughness: 0.9, flatShading: true }));
  tent.position.set(x, y + 1.25, z); tent.castShadow = true; scene.add(tent); addObstacle(x, z, 1.7);
  isl.keeperSpot = new THREE.Vector3(x + Math.cos(ta + 0.5) * 2.6, 0, z + Math.sin(ta + 0.5) * 2.6);
  scatterGrass(isl, 2600, (lx, lz) => nests.some(([nx, nz, R]) => Math.hypot(lx - nx, lz - nz) < R + 0.4));
}

// ---------------- Isla Helada ----------------
function buildHelada(isl) {
  const avoid = nearEntry(isl, 0.25);
  const snowM = new THREE.MeshStandardMaterial({ color: 0xf4f8ff, roughness: 0.6, flatShading: true });
  const K = isl.k, lk = [4 * K, -3 * K];
  for (let k = 0; k < 140; k++) {
    const [lx, lz] = ringPt(isl, 3, 15.5, avoid), [x, y, z] = P(isl, lx, lz), s = rr(1, 2.1);
    if (Math.hypot(lx - lk[0], lz - lk[1]) < 4 * K) continue;
    inst('trunk', new THREE.CylinderGeometry(0.08, 0.12, 1, 6).translate(0, 0.5, 0), M.trunk, mat4(x, y - 0.05, z, 0, s * 0.9, s * 0.8, s * 0.9));
    for (let t = 0; t < 3; t++) {
      inst('spine', new THREE.ConeGeometry(0.75, 1.3, 7).translate(0, 0.65, 0), M.canopy, mat4(x, y + s * (0.55 + t * 0.62), z, rand() * 6, s * (1.05 - t * 0.25), s * 0.95, s * (1.05 - t * 0.25)), new THREE.Color(0x2f5a55));
      inst('ssnow', new THREE.ConeGeometry(0.6, 0.5, 7).translate(0, 1.1, 0), snowM, mat4(x, y + s * (0.55 + t * 0.62), z, rand() * 6, s * (1.05 - t * 0.25), s * 0.95, s * (1.05 - t * 0.25)), null, false);
    }
    addObstacle(x, z, 0.35 * s);
  }
  const iceM = new THREE.MeshPhysicalMaterial({ color: 0x9fe0ff, emissive: 0x2a8acc, emissiveIntensity: 0.8, roughness: 0.05, transparent: true, opacity: 0.85, flatShading: true, clearcoat: 1 });
  for (let k = 0; k < 26; k++) { const [lx, lz] = ringPt(isl, 2, 15, avoid), [x, y, z] = P(isl, lx, lz), s = rr(0.5, 1.6);
    inst('ice', new THREE.OctahedronGeometry(0.5, 0), iceM, mat4(x, y + s * 0.6, z, rand() * 6, s * 0.6, s * 2, s * 0.6, rr(-0.3, 0.3), rr(-0.3, 0.3)), null, false); addObstacle(x, z, 0.3 * s); }
  // frozen lake
  const [fx, fy, fz] = P(isl, lk[0], lk[1]);
  const ice = new THREE.Mesh(new THREE.CircleGeometry(3.6 * K, 48).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xbfeaff, roughness: 0.05, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.9 }));
  ice.position.set(fx, fy + 0.06, fz); ice.receiveShadow = true; scene.add(ice);
  for (let k = 0; k < 10; k++) { const [lx, lz] = ringPt(isl, 2, 15, avoid), [x, y, z] = P(isl, lx, lz); rockAt(x, y, z, rr(0.6, 1.4)); inst('rsnow', new THREE.SphereGeometry(0.4, 8, 5, 0, 6.3, 0, 1.4), snowM, mat4(x, y + 0.35, z, 0, rr(0.9, 1.4), 0.5, rr(0.9, 1.4)), null, false); }
  // falling snow
  const N = 1400, pos = new Float32Array(N * 3), sd = new Float32Array(N);
  for (let i = 0; i < N; i++) { const a = rand() * 6.28, r = Math.sqrt(rand()) * isl.R * 1.05; pos.set([isl.c.x + Math.cos(a) * r, isl.c.y + rr(0, 16), isl.c.z + Math.sin(a) * r], i * 3); sd[i] = rand() * 100; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.BufferAttribute(sd, 1));
  A.snow = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, base: { value: isl.c.y }, px: { value: 22 * Math.min(devicePixelRatio, 1.75) } }, transparent: true, depthWrite: false,
    vertexShader: `uniform float time, base, px; attribute float seed;
      void main(){ vec3 p = position; p.y = base + mod(p.y - base - time*1.2 - seed, 16.0); p.x += sin(time*0.7+seed)*0.4; p.z += cos(time*0.6+seed)*0.4;
        vec4 mv = modelViewMatrix*vec4(p,1.0); gl_PointSize = px/-mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `void main(){ float d = length(gl_PointCoord-0.5); gl_FragColor = vec4(1.0,1.0,1.0, smoothstep(0.5,0.1,d)*0.9); }`,
  }));
  scene.add(A.snow);
  scatterGrass(isl, 1200, (lx, lz) => Math.hypot(lx - lk[0], lz - lk[1]) < 3.8 * K);
}

// ---------------- Volcán Ígneo ----------------
const lavaMat = new THREE.ShaderMaterial({
  uniforms: A.lavaU,
  vertexShader: `varying vec2 vP; void main(){ vP = (modelMatrix*vec4(position,1.0)).xz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: NOISE + `uniform float time; varying vec2 vP;
    void main(){ float n = snoise(vec3(vP*0.7, time*0.15))*0.5+0.5; float n2 = snoise(vec3(vP*2.5 + time*0.2, 3.0))*0.5+0.5;
      vec3 c = mix(vec3(0.6,0.05,0.0), vec3(1.0,0.55,0.05), n); c = mix(c, vec3(1.0,0.95,0.5), smoothstep(0.7,0.95,n2));
      c *= 2.2 - smoothstep(0.55, 0.3, n) * 1.4;
      gl_FragColor = vec4(c, 1.0); }`,
  toneMapped: false,
});
function buildVolcan(isl) {
  const avoid = nearEntry(isl, 0.25);
  const [cx, cy, cz] = P(isl, 0, 0);
  const lava = new THREE.Mesh(new THREE.CircleGeometry(2.3 * isl.k, 48).rotateX(-Math.PI / 2), lavaMat);
  lava.position.set(cx, gy(isl, 0, 0) + 0.25, cz); scene.add(lava);
  isl.crater = lava.position.clone();
  const obs = new THREE.MeshStandardMaterial({ color: 0x1a1418, roughness: 0.35, metalness: 0.3, flatShading: true });
  for (let k = 0; k < 70; k++) { const [lx, lz] = ringPt(isl, 3, 16.5, avoid), [x, y, z] = P(isl, lx, lz), s = rr(0.4, 1.6);
    inst('obs', new THREE.DodecahedronGeometry(0.6, 0), obs, mat4(x, y + s * 0.3, z, rand() * 6, s, s * rr(0.8, 2.2), s, rr(-0.3, 0.3), rr(-0.3, 0.3))); if (s > 0.6) addObstacle(x, z, 0.5 * s); }
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.4, 0.05).multiplyScalar(2.5), toneMapped: false });
  for (let k = 0; k < 90; k++) { const [lx, lz] = ringPt(isl, 3, 16), [x, y, z] = P(isl, lx, lz);
    inst('crack', new THREE.BoxGeometry(0.08, 0.04, 1), glow, mat4(x, y + 0.02, z, rand() * 6, 1, 1, rr(0.8, 2.5)), null, false); }
  const char = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 1, flatShading: true });
  for (let k = 0; k < 12; k++) { const [lx, lz] = ringPt(isl, 10, 16, avoid), [x, y, z] = P(isl, lx, lz), s = rr(1, 1.6);
    inst('char', new THREE.CylinderGeometry(0.06, 0.15, 1, 5).translate(0, 0.5, 0), char, mat4(x, y, z, rand() * 6, s, s * 2, s, rr(-0.15, 0.15))); addObstacle(x, z, 0.3); }
  // embers rising from the crater
  const N = 500, pos = new Float32Array(N * 3), sd = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos.set([cx + rr(-2, 2) * isl.k, cy, cz + rr(-2, 2) * isl.k], i * 3); sd[i] = rand() * 100; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.BufferAttribute(sd, 1));
  A.embers = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, px: { value: 40 * Math.min(devicePixelRatio, 1.75) }, top: { value: gy(isl, 0, 0) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float time, px, top; attribute float seed; varying float vL;
      void main(){ float l = fract(time*0.12 + seed*0.37); vL = l; vec3 p = position; p.y = top + l*22.0; p.x += sin(seed + time*0.5)*l*4.0; p.z += cos(seed*1.3 + time*0.4)*l*4.0;
        vec4 mv = modelViewMatrix*vec4(p,1.0); gl_PointSize = px*(1.0-l)/-mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying float vL; void main(){ float d = length(gl_PointCoord-0.5); gl_FragColor = vec4(vec3(1.0,0.5,0.1)*3.0, smoothstep(0.5,0.0,d)*(1.0-vL)); }`,
  }));
  scene.add(A.embers);
  scatterGrass(isl, 600, (lx, lz) => Math.hypot(lx, lz) < 10 * isl.k);
}

export function buildOuter() {
  const b = by();
  buildRuinas(b.ruinas); buildNido(b.nido); buildHelada(b.helada); buildVolcan(b.volcan);
}
export function updateOuter(dt, t) {
  A.lavaU.time.value = t;
  if (A.snow) A.snow.material.uniforms.time.value = t;
  if (A.embers) A.embers.material.uniforms.time.value = t;
  A.braziers.forEach((f, i) => { const k = 1 + Math.sin(t * 9 + i) * 0.12 + Math.sin(t * 13.7 + i * 2) * 0.08; f.scale.set(1 / k, k, 1 / k); });
  A.eggs.forEach((e, i) => { if (Math.sin(t * 0.8 + i * 2) > 0.97) e.rotation.z = Math.sin(t * 30) * 0.15; });
}
