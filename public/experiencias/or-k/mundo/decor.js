// Decorations for each themed island. Returns animated handles for the main loop.
import * as THREE from 'three';
import { scene, rand, rr, pick, inst, mat4, windowMat, lanternMat, NOISE, simplex, addWind } from './core.js';
import { texMat } from './textures.js';
import { ISLANDS, gy, addObstacle, addBox, freeSpot } from './terrain.js';

const anim = { spinners: [], smokeEmitters: [], orbs: [], floaters: [], waterU: { time: { value: 0 } }, fish: [], wisps: null, ponds: [] };
export { anim };

// ---------- shared geometry ----------
const G = {
  blade: (() => { const g = new THREE.ConeGeometry(0.022, 0.34, 3); g.scale(1, 1, 0.35); g.translate(0, 0.17, 0); return g; })(),
  flower: new THREE.IcosahedronGeometry(0.06, 0),
  trunk: (() => { const g = new THREE.CylinderGeometry(0.08, 0.12, 1, 6); g.translate(0, 0.5, 0); return g; })(),
  canopy: new THREE.IcosahedronGeometry(0.6, 1),
  pine: (() => { const g = new THREE.ConeGeometry(0.75, 1.3, 7); g.translate(0, 0.65, 0); return g; })(),
  rock: new THREE.DodecahedronGeometry(0.4, 0),
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
  roof: (() => { const g = new THREE.ConeGeometry(0.75, 0.7, 4); g.rotateY(Math.PI / 4); return g; })(),
  mush: (() => { const g = new THREE.SphereGeometry(0.12, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); return g; })(),
  stem: (() => { const g = new THREE.CylinderGeometry(0.03, 0.04, 0.2, 6); g.translate(0, 0.1, 0); return g; })(),
  crop: (() => { const g = new THREE.ConeGeometry(0.09, 0.5, 4); g.translate(0, 0.25, 0); return g; })(),
  reed: (() => { const g = new THREE.CylinderGeometry(0.012, 0.02, 0.9, 3); g.translate(0, 0.45, 0); return g; })(),
  pad: new THREE.CircleGeometry(0.28, 10).rotateX(-Math.PI / 2),
};
const M = {
  grass: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }),
  flower: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, emissive: 0x222222 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 1 }),
  canopy: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, flatShading: true }),
  rock: new THREE.MeshStandardMaterial({ color: 0x8a8090, roughness: 1, flatShading: true }),
  wall: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }),
  roof: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, flatShading: true }),
  wood: new THREE.MeshStandardMaterial({ color: 0x7a4e2d, roughness: 0.95 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x9a90a0, roughness: 0.95, flatShading: true }),
  glowMush: new THREE.MeshStandardMaterial({ color: 0x29f0d4, emissive: 0x29f0d4, emissiveIntensity: 1.6 }),
  stemW: new THREE.MeshStandardMaterial({ color: 0xeee2cc }),
  crop: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, flatShading: true }),
  rune: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.7, 0.3).multiplyScalar(2.5), toneMapped: false }),
  violet: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 0.4, 1.0).multiplyScalar(3), toneMapped: false }),
};
export { M as DMAT };

// ---------- generic scatter ----------
export function scatterGrass(isl, n, avoid) {
  n = Math.round(n * Math.min(2.6, (isl.k ?? 1) ** 2));
  const base = new THREE.Color(...isl.grass);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2, r = isl.R * 0.9 * Math.sqrt(rand());
    const lx = Math.cos(a) * r, lz = Math.sin(a) * r;
    if (avoid && avoid(lx, lz)) continue;
    const y = gy(isl, lx, lz);
    const c = base.clone().multiplyScalar(rr(0.8, 1.25)).offsetHSL(rr(-0.03, 0.03), 0, 0);
    inst('grass', G.blade, M.grass, mat4(isl.c.x + lx, y - 0.02, isl.c.z + lz, rand() * 6, 1, rr(0.6, 1.4), 1, rr(-0.25, 0.25), rr(-0.25, 0.25)), c, false);
  }
}
export function scatterFlowers(isl, n, colors, avoid) {
  n = Math.round(n * Math.min(2.6, (isl.k ?? 1) ** 2));
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2, r = isl.R * 0.88 * Math.sqrt(rand());
    const lx = Math.cos(a) * r, lz = Math.sin(a) * r;
    if (avoid && avoid(lx, lz)) continue;
    inst('flower', G.flower, M.flower, mat4(isl.c.x + lx, gy(isl, lx, lz) + 0.12, isl.c.z + lz, 0, rr(0.7, 1.3)), new THREE.Color(pick(colors)), false);
  }
}
export function roundTree(x, y, z, s = 1, color = 0xff9ac8) {
  inst('trunk', G.trunk, M.trunk, mat4(x, y - 0.05, z, rand() * 6, s, s * rr(1.1, 1.6), s));
  const c = new THREE.Color(color).offsetHSL(rr(-0.03, 0.03), 0, rr(-0.06, 0.06));
  inst('canopy', G.canopy, M.canopy, mat4(x, y + s * 1.55, z, rand() * 6, s * rr(0.9, 1.2), s * rr(0.85, 1.1), s * rr(0.9, 1.2)), c);
  addObstacle(x, z, 0.25 * s);
}
export function pineTree(x, y, z, s = 1, color = 0x2f6b45) {
  inst('trunk', G.trunk, M.trunk, mat4(x, y - 0.05, z, 0, s * 0.9, s * 0.8, s * 0.9));
  const c = new THREE.Color(color).offsetHSL(rr(-0.02, 0.02), 0, rr(-0.05, 0.05));
  for (let k = 0; k < 3; k++)
    inst('pine', G.pine, M.canopy, mat4(x, y + s * (0.55 + k * 0.62), z, rand() * 6, s * (1.05 - k * 0.25), s * 0.95, s * (1.05 - k * 0.25)), c);
  addObstacle(x, z, 0.3 * s);
}
export function rockAt(x, y, z, s) { if (s > 0.45) addObstacle(x, z, s * 0.38); inst('rock', G.rock, M.rock, mat4(x, y + s * 0.15, z, rand() * 6, s, s * rr(0.6, 1), s * rr(0.8, 1.2), rand(), rand())); }
const nearEntry = (isl, w = 0.38) => (lx, lz) => {
  const a = Math.atan2(lz, lx); let d = Math.abs(((a - isl.entryAng) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
  return d < w && Math.hypot(lx, lz) > 2.0;
};

// ---------- smoke particles ----------
const SMOKE_N = 260;
const smokeGeo = new THREE.BufferGeometry();
const smokePos = new Float32Array(SMOKE_N * 3), smokeLife = new Float32Array(SMOKE_N), smokeSeed = new Float32Array(SMOKE_N);
smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
smokeGeo.setAttribute('life', new THREE.BufferAttribute(smokeLife, 1));
smokeGeo.setAttribute('seed', new THREE.BufferAttribute(smokeSeed, 1));
const smokePts = new THREE.Points(smokeGeo, new THREE.ShaderMaterial({
  uniforms: { px: { value: 160 * Math.min(devicePixelRatio, 1.75) } }, transparent: true, depthWrite: false,
  vertexShader: `uniform float px; attribute float life; attribute float seed; varying float vL;
    void main(){ vL = life; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = px*(0.3+ (1.0-life)*1.2)/-mv.z; gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `varying float vL; void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.1,d)*vL*0.35; if (vL<=0.0) discard; gl_FragColor = vec4(vec3(0.85,0.8,0.85), a); }`,
}));
smokePts.frustumCulled = false;
scene.add(smokePts);
let smokeHead = 0;
export function updateSmoke(dt) {
  for (const e of anim.smokeEmitters) {
    e.acc += dt * 6;
    while (e.acc > 1) {
      e.acc -= 1; const i = smokeHead; smokeHead = (smokeHead + 1) % SMOKE_N;
      smokePos.set([e.x + rr(-0.05, 0.05), e.y, e.z + rr(-0.05, 0.05)], i * 3); smokeLife[i] = 1; smokeSeed[i] = rand() * 10;
    }
  }
  for (let i = 0; i < SMOKE_N; i++) {
    if (smokeLife[i] <= 0) continue;
    smokeLife[i] -= dt * 0.28;
    smokePos[i * 3 + 1] += dt * 0.7; smokePos[i * 3] += dt * (0.25 + Math.sin(smokeSeed[i] + smokeLife[i] * 4) * 0.1);
  }
  smokeGeo.attributes.position.needsUpdate = true; smokeGeo.attributes.life.needsUpdate = true;
}

// ---------- water ----------
export const pondMat = new THREE.ShaderMaterial({
  uniforms: anim.waterU, transparent: true, depthWrite: false,
  vertexShader: `varying vec2 vP; void main(){ vP = (modelMatrix*vec4(position,1.0)).xz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: NOISE + `uniform float time; varying vec2 vP;
    void main(){
      float n = snoise(vec3(vP*0.9, time*0.25))*0.5+0.5;
      float r = snoise(vec3(vP*3.5, time*0.6));
      vec3 deep = vec3(0.05,0.25,0.45), shallow = vec3(0.25,0.75,0.85);
      vec3 c = mix(deep, shallow, n);
      c += vec3(1.0,0.85,0.9) * smoothstep(0.55, 0.9, r) * 0.6;
      gl_FragColor = vec4(c, 0.82);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
export const fallMat = new THREE.ShaderMaterial({
  uniforms: anim.waterU, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: NOISE + `uniform float time; varying vec2 vUv;
    void main(){
      float n = snoise(vec3(vUv.x*7.0, vUv.y*10.0 + time*1.6, time*0.2))*0.5+0.5;
      float n2 = snoise(vec3(vUv.x*18.0, vUv.y*26.0 + time*2.6, 4.0))*0.5+0.5;
      float s = smoothstep(0.35, 0.85, n*0.7 + n2*0.4);
      vec3 c = mix(vec3(0.25,0.6,1.0), vec3(0.95,0.99,1.0), s);
      float a = (1.0 - pow(abs(vUv.x-0.5)*2.0, 2.0)) * smoothstep(0.0, 0.35, vUv.y) * (0.45 + s*0.55);
      gl_FragColor = vec4(c*1.25, a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
function waterfall(x, y, z, dirX, dirZ, w = 1.0, drop = 16) {
  const pts = [];
  for (let k = 0; k <= 30; k++) {
    const t = k / 30, d = 0.2 + 1.4 * (1 - Math.exp(-5 * t));
    pts.push(new THREE.Vector3(x + dirX * d, y - drop * Math.pow(t, 1.3), z + dirZ * d));
  }
  const geo = new THREE.BufferGeometry(), pos = [], uv = [], idx = [];
  const px = -dirZ, pz = dirX;
  pts.forEach((p, k) => {
    const ww = w * (1 + k / 30 * 1.2);
    for (let s = 0; s <= 4; s++) { const o = (s / 4 - 0.5) * ww; pos.push(p.x + px * o, p.y, p.z + pz * o); uv.push(s / 4, 1 - k / 30); }
  });
  for (let k = 0; k < 30; k++) for (let s = 0; s < 4; s++) { const a = k * 5 + s, b = a + 5; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  scene.add(new THREE.Mesh(geo, fallMat));
}

// =====================================================================
//  ALDEA BRISA — village
// =====================================================================
const roofColors = [0xc8443a, 0x3a6fc8, 0x8a3ac8, 0xd9822b, 0x2f9a7a];
const wallColors = [0xf2e6d0, 0xe8d3b0, 0xf5efe6, 0xdcc6a6];
function house(x, y, z, face, s = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = face;
  const w = 1.6 * s, d = 1.4 * s, h = 1.2 * s;
  const walls = new THREE.Mesh(G.box, M.wall.clone()); walls.material.color.set(pick(wallColors));
  walls.scale.set(w, h + 0.4, d); walls.position.y = h / 2 - 0.2; g.add(walls);
  const beam = new THREE.Mesh(G.box, M.wood); beam.scale.set(w + 0.05, 0.1, d + 0.05); beam.position.y = h * 0.45; g.add(beam);
  const roof = new THREE.Mesh(G.roof, M.roof.clone()); roof.material.color.set(pick(roofColors));
  roof.scale.set(w * 0.98, h * 0.95, d * 1.06); roof.position.y = h + h * 0.33; g.add(roof);
  const door = new THREE.Mesh(G.box, M.wood); door.scale.set(0.36 * s, 0.62 * s, 0.06); door.position.set(0, 0.31 * s - 0.05, d / 2 + 0.01); g.add(door);
  for (const sx of [-1, 1]) {
    const win = new THREE.Mesh(G.box, windowMat); win.scale.set(0.28 * s, 0.26 * s, 0.05); win.position.set(sx * w * 0.3, h * 0.62, d / 2 + 0.01); g.add(win);
    const win2 = new THREE.Mesh(G.box, windowMat); win2.scale.set(0.05, 0.26 * s, 0.28 * s); win2.position.set(sx * (w / 2 + 0.01), h * 0.62, 0); g.add(win2);
  }
  const ch = new THREE.Mesh(G.box, M.stone); ch.scale.set(0.22, 0.7, 0.22); ch.position.set(w * 0.28, h + 0.55, -d * 0.2); g.add(ch);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);
  const cp = new THREE.Vector3(w * 0.28, h + 0.95, -d * 0.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), face).add(g.position);
  anim.smokeEmitters.push({ x: cp.x, y: cp.y, z: cp.z, acc: rand() });
  addBox(x, z, w / 2 + 0.02, d / 2 + 0.02, face);
  // door position for villagers
  return new THREE.Vector3(0, 0, d / 2 + 0.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), face).add(g.position);
}
function lamppost(x, y, z) {
  inst('lpost', new THREE.CylinderGeometry(0.05, 0.07, 1.6, 6), M.wood, mat4(x, y + 0.8, z));
  inst('lampV', new THREE.SphereGeometry(0.14, 10, 8), lanternMat, mat4(x, y + 1.65, z), null, false);
  addObstacle(x, z, 0.12);
}
function buildAldea(isl) {
  const doors = [];
  const N = 7;
  for (let i = 0; i < N; i++) {
    const a = isl.entryAng + Math.PI * 2 * (i + 0.5) / (N + 0.6) + 0.5;
    const r = rr(5.6, 6.6) * isl.k, lx = Math.cos(a) * r, lz = Math.sin(a) * r;
    const face = Math.atan2(-lx, -lz);
    doors.push(house(isl.c.x + lx, gy(isl, lx, lz), isl.c.z + lz, face, rr(1.25, 1.5)));
  }
  // well
  const wy = gy(isl, 0, 0);
  const well = new THREE.Group(); well.position.set(isl.c.x, wy, isl.c.z);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.65, 0.6, 14, 1, true), M.stone); ring.position.y = 0.3; ring.material.side = THREE.DoubleSide; well.add(ring);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.55, 14).rotateX(-Math.PI / 2), pondMat); water.position.y = 0.4; well.add(water);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(G.box, M.wood); p.scale.set(0.08, 1.3, 0.08); p.position.set(s * 0.55, 0.9, 0); well.add(p); }
  const wr = new THREE.Mesh(G.roof, M.roof.clone()); wr.material.color.set(0xc8443a); wr.scale.set(1.0, 0.6, 1.0); wr.position.y = 1.75; well.add(wr);
  well.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(well); addObstacle(isl.c.x, isl.c.z, 0.8);
  // market stall
  const sa = isl.entryAng + 0.9, sx = isl.c.x + Math.cos(sa) * 2.8 * isl.k, sz = isl.c.z + Math.sin(sa) * 2.8 * isl.k, sy = gy(isl, sx - isl.c.x, sz - isl.c.z);
  const stall = new THREE.Group(); stall.position.set(sx, sy, sz); stall.rotation.y = Math.atan2(-(sx - isl.c.x), -(sz - isl.c.z));
  const table = new THREE.Mesh(G.box, M.wood); table.scale.set(1.4, 0.1, 0.6); table.position.y = 0.7; stall.add(table);
  const awn = new THREE.Mesh(G.box, new THREE.MeshStandardMaterial({ color: 0xff6a8a })); awn.scale.set(1.6, 0.06, 0.9); awn.position.y = 1.6; awn.rotation.x = 0.2; stall.add(awn);
  for (const [px, pz] of [[-0.65, -0.25], [0.65, -0.25], [-0.65, 0.25], [0.65, 0.25]]) { const p = new THREE.Mesh(G.box, M.wood); p.scale.set(0.06, 1.6, 0.06); p.position.set(px, 0.8, pz); stall.add(p); }
  for (let k = 0; k < 7; k++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshStandardMaterial({ color: pick([0xff4040, 0xffb020, 0x80d040, 0xff8030]) })); f.position.set(-0.55 + k * 0.18, 0.8, rr(-0.15, 0.15)); stall.add(f); }
  stall.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(stall); addBox(sx, sz, 0.75, 0.35, stall.rotation.y);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; const lx = Math.cos(a) * 3.6 * isl.k, lz = Math.sin(a) * 3.6 * isl.k; if (freeSpot(isl.c.x + lx, isl.c.z + lz, 0.3)) lamppost(isl.c.x + lx, gy(isl, lx, lz), isl.c.z + lz); }
  // flower boxes & trees at rim
  for (let i = 0; i < 20; i++) { const a = rand() * 6.28, r = rr(7, 8.3) * isl.k, lx = Math.cos(a) * r, lz = Math.sin(a) * r; if (!nearEntry(isl)(lx, lz) && freeSpot(isl.c.x + lx, isl.c.z + lz, 0.6)) roundTree(isl.c.x + lx, gy(isl, lx, lz), isl.c.z + lz, rr(0.9, 1.3), pick([0xff9ac8, 0xffc06a, 0x9ad66a])); }
  // cobble path from bridge to plaza
  for (let k = 0; k < 24; k++) {
    const t = k / 24, r = (8.4 * (1 - t) + 1.2 * t) * isl.k, a = isl.entryAng + rr(-0.05, 0.05);
    const lx = Math.cos(a) * r + rr(-0.35, 0.35), lz = Math.sin(a) * r + rr(-0.35, 0.35);
    inst('cobble', new THREE.CylinderGeometry(0.22, 0.24, 0.06, 7), M.stone, mat4(isl.c.x + lx, gy(isl, lx, lz) + 0.01, isl.c.z + lz, rand() * 6, rr(0.8, 1.2), 1, rr(0.8, 1.2)), null, false);
  }
  const avoid = (lx, lz) => !freeSpot(isl.c.x + lx, isl.c.z + lz, 0.1);
  scatterGrass(isl, 2600, avoid);
  scatterFlowers(isl, 260, [0xff7ab0, 0xffe066, 0xffffff, 0xb08cff], avoid);
  isl.doors = doors;
}

// =====================================================================
//  MOLINO DORADO — windmill & farm
// =====================================================================
function buildMolino(isl) {
  const wx = isl.c.x + 3.0 * isl.k, wz = isl.c.z - 2.4 * isl.k, wy = gy(isl, 3.0 * isl.k, -2.4 * isl.k);
  const mill = new THREE.Group(); mill.position.set(wx, wy, wz);
  mill.rotation.y = Math.atan2(-isl.c.x, -isl.c.z);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 4.4, 8), texMat('plaster', { color: 0xf6ead4, flatShading: true }, 2));
  tower.position.y = 2.1; mill.add(tower);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.5, 8), texMat('roof', { color: 0xb84a32, flatShading: true }, 2)); cap.position.y = 5.0; mill.add(cap);
  const door = new THREE.Mesh(G.box, M.wood); door.scale.set(0.5, 0.9, 0.1); door.position.set(0, 0.45, 1.3); mill.add(door);
  const win = new THREE.Mesh(G.box, windowMat); win.scale.set(0.3, 0.35, 0.08); win.position.set(0, 2.8, 1.05); mill.add(win);
  const hub = new THREE.Group(); hub.position.set(0, 3.9, 1.15); mill.add(hub);
  const axle = new THREE.Mesh(G.cyl, M.wood); axle.scale.set(0.25, 0.4, 0.25); axle.rotation.x = Math.PI / 2; hub.add(axle);
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xfff6ea, roughness: 0.8, side: THREE.DoubleSide });
  for (let k = 0; k < 4; k++) {
    const arm = new THREE.Group(); arm.rotation.z = k * Math.PI / 2; hub.add(arm);
    const spar = new THREE.Mesh(G.box, M.wood); spar.scale.set(0.1, 3.0, 0.08); spar.position.y = 1.5; arm.add(spar);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 2.4), sailMat); sail.position.set(0.42, 1.75, 0.05); arm.add(sail);
  }
  mill.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(mill); addObstacle(wx, wz, 1.5);
  anim.spinners.push({ obj: hub, axis: 'z', speed: 0.6 });
  // crop fields
  const K = isl.k;
  const fields = [{ x: -3.2 * K, z: 1.0 * K, w: 4 * K, d: 3 * K, type: 'wheat' }, { x: 1.0 * K, z: 3.6 * K, w: 3.6 * K, d: 2.4 * K, type: 'cabbage' }, { x: -1.5 * K, z: -3.5 * K, w: 3 * K, d: 2.2 * K, type: 'pumpkin' }];
  const wheatG = (() => { const g = new THREE.CylinderGeometry(0.008, 0.012, 0.75, 3); g.translate(0, 0.375, 0); return g; })();
  const earG = (() => { const g = new THREE.CapsuleGeometry(0.025, 0.1, 2, 5); g.translate(0, 0.8, 0); return g; })();
  const cabG = new THREE.IcosahedronGeometry(0.17, 1), leafG = (() => { const g = new THREE.SphereGeometry(0.22, 8, 4, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45); return g; })();
  const pumpG = (() => { const g = new THREE.SphereGeometry(0.22, 12, 8); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x); const k = 1 + Math.cos(a * 8) * 0.06; p.setX(i, x * k); p.setZ(i, z * k); p.setY(i, p.getY(i) * 0.72); } g.computeVertexNormals(); return g; })();
  const stemG = new THREE.CylinderGeometry(0.02, 0.03, 0.1, 5);
  const wheatM = M.crop, cabM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, flatShading: true }), pumpM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
  addWind(cabM, 0.0);
  for (const f of fields) {
    if (f.type === 'wheat') for (let ix = 0; ix < f.w / 0.12; ix++) for (let iz = 0; iz < f.d / 0.14; iz++) {
      const lx = f.x - f.w / 2 + ix * 0.12 + rr(-0.05, 0.05), lz = f.z - f.d / 2 + iz * 0.14 + rr(-0.05, 0.05), y = gy(isl, lx, lz) - 0.02, h = rr(0.75, 1.15), ry = rand() * 6, tx = rr(-0.12, 0.12), tz = rr(-0.12, 0.12);
      inst('wheat', wheatG, wheatM, mat4(isl.c.x + lx, y, isl.c.z + lz, ry, 1, h, 1, tx, tz), new THREE.Color(0xd8c070).offsetHSL(0, 0, rr(-0.06, 0.06)), false);
      inst('ear', earG, wheatM, mat4(isl.c.x + lx, y, isl.c.z + lz, ry, 1, h, 1, tx, tz), new THREE.Color(0xf0c850).offsetHSL(rr(-0.02, 0.02), 0, rr(-0.05, 0.08)), false);
    }
    if (f.type === 'cabbage') for (let ix = 0; ix < f.w / 0.45; ix++) for (let iz = 0; iz < f.d / 0.5; iz++) {
      const lx = f.x - f.w / 2 + 0.2 + ix * 0.45, lz = f.z - f.d / 2 + 0.25 + iz * 0.5, y = gy(isl, lx, lz);
      const c = new THREE.Color(0x8fd060).offsetHSL(rr(-0.03, 0.03), 0, rr(-0.06, 0.06));
      inst('cab', cabG, cabM, mat4(isl.c.x + lx, y + 0.12, isl.c.z + lz, rand() * 6, rr(0.8, 1.1)), c);
      inst('cableaf', leafG, cabM, mat4(isl.c.x + lx, y + 0.26, isl.c.z + lz, rand() * 6, rr(1, 1.2)), c.clone().offsetHSL(0, 0, -0.08), false);
    }
    if (f.type === 'pumpkin') for (let ix = 0; ix < f.w / 0.6; ix++) for (let iz = 0; iz < f.d / 0.6; iz++) {
      if (rand() < 0.25) continue;
      const lx = f.x - f.w / 2 + 0.3 + ix * 0.6 + rr(-0.1, 0.1), lz = f.z - f.d / 2 + 0.3 + iz * 0.6 + rr(-0.1, 0.1), y = gy(isl, lx, lz), s = rr(0.7, 1.5);
      inst('pump', pumpG, pumpM, mat4(isl.c.x + lx, y + 0.13 * s, isl.c.z + lz, rand() * 6, s), new THREE.Color(0xf08a20).offsetHSL(rr(-0.02, 0.02), 0, rr(-0.06, 0.05)));
      inst('pstem', stemG, M.trunk, mat4(isl.c.x + lx, y + 0.3 * s, isl.c.z + lz, 0, 1, 1, 1, rr(-0.3, 0.3)), null, false);
    }
    // soil
    const soil = new THREE.Mesh(new THREE.PlaneGeometry(f.w + 0.3, f.d + 0.3).rotateX(-Math.PI / 2), M.soil);
    soil.position.set(isl.c.x + f.x, gy(isl, f.x, f.z) + 0.015, isl.c.z + f.z); soil.receiveShadow = true; scene.add(soil);
    f.wx = isl.c.x + f.x; f.wz = isl.c.z + f.z;
  }
  isl.fields = fields;
  // fence ring
  for (let k = 0; k < 110; k++) {
    const a = k / 110 * Math.PI * 2; const lx = Math.cos(a) * isl.R * 0.86, lz = Math.sin(a) * isl.R * 0.86;
    if (nearEntry(isl, 0.12)(lx, lz)) continue;
    inst('fence', G.box, M.wood, mat4(isl.c.x + lx, gy(isl, lx, lz) + 0.3, isl.c.z + lz, -a, 0.08, 0.6, 0.08));
    const a2 = (k + 0.5) / 110 * Math.PI * 2;
    const railL = isl.R * 0.86 * Math.PI * 2 / 110;
    inst('rail', G.box, M.wood, mat4(isl.c.x + Math.cos(a2) * isl.R * 0.86, gy(isl, lx, lz) + 0.42, isl.c.z + Math.sin(a2) * isl.R * 0.86, -a2, 0.05, 0.06, railL));
    addBox(isl.c.x + Math.cos(a2) * isl.R * 0.86, isl.c.z + Math.sin(a2) * isl.R * 0.86, 0.08, railL / 2 + 0.05, -a2);
  }
  // hay bales
  for (let k = 0; k < 6; k++) {
    const p = { x: rr(-5, 5) * isl.k, z: rr(-5, 5) * isl.k }; if (!freeSpot(isl.c.x + p.x, isl.c.z + p.z, 0.8) || Math.hypot(p.x, p.z) > 6.5 * isl.k) continue;
    inst('hay', new THREE.CylinderGeometry(0.4, 0.4, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0xe0c060, roughness: 1 }),
      mat4(isl.c.x + p.x, gy(isl, p.x, p.z) + 0.38, isl.c.z + p.z, rand() * 6, 1, 1, 1, 0, Math.PI / 2));
    addObstacle(isl.c.x + p.x, isl.c.z + p.z, 0.5);
  }
  const inField = (lx, lz) => fields.some(f => Math.abs(lx - f.x) < f.w / 2 + 0.2 && Math.abs(lz - f.z) < f.d / 2 + 0.2);
  scatterGrass(isl, 2400, (lx, lz) => inField(lx, lz) || !freeSpot(isl.c.x + lx, isl.c.z + lz, 0.1));
  scatterFlowers(isl, 180, [0xffe066, 0xffffff, 0xff9a5a], inField);
  isl.inField = inField;
  for (let i = 0; i < 9; i++) { const a = rand() * 6.28, r = rr(6.6, 7.6) * isl.k, lx = Math.cos(a) * r, lz = Math.sin(a) * r; if (!nearEntry(isl)(lx, lz) && !inField(lx, lz)) roundTree(isl.c.x + lx, gy(isl, lx, lz), isl.c.z + lz, 1.1, 0xffb84a); }
}

// =====================================================================
//  BOSQUE SUSURRO — enchanted forest
// =====================================================================
function buildBosque(isl) {
  const y0 = gy(isl, 0, 0);
  const tree = new THREE.Group(); tree.position.set(isl.c.x, y0, isl.c.z);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.1, 5.5, 10), texMat('bark', { color: 0x8a6a52 }, 2));
  trunk.position.y = 2.6; tree.add(trunk);
  for (let k = 0; k < 5; k++) { // roots
    const r = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 5), trunk.material); const a = k / 5 * 6.28;
    r.position.set(Math.cos(a) * 0.9, 0.3, Math.sin(a) * 0.9); r.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); tree.add(r);
  }
  const leafM = new THREE.MeshStandardMaterial({ color: 0x3fa88a, roughness: 0.7, flatShading: true, emissive: 0x0a3a30, emissiveIntensity: 0.4 });
  for (let k = 0; k < 9; k++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(rr(1.3, 2.0), 1), leafM);
    b.position.set(rr(-1.8, 1.8), rr(5.4, 7.2), rr(-1.8, 1.8)); tree.add(b);
  }
  for (let k = 0; k < 14; k++) { // hanging lanterns
    const a = rand() * 6.28, r = rr(1.6, 2.6);
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshStandardMaterial({ color: 0xbfffee, emissive: 0x7fffe0, emissiveIntensity: 2.5 }));
    l.position.set(Math.cos(a) * r, rr(4.0, 5.0), Math.sin(a) * r); tree.add(l);
    const cord = new THREE.Mesh(G.cyl, M.trunk); cord.scale.set(0.015, 0.8, 0.015); cord.position.set(l.position.x, l.position.y + 0.45, l.position.z); tree.add(cord);
  }
  tree.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(tree); addObstacle(isl.c.x, isl.c.z, 1.3);
  // pines
  for (let k = 0; k < 160; k++) {
    const a = rand() * 6.28, r = rr(3.2, isl.R * 0.88), lx = Math.cos(a) * r, lz = Math.sin(a) * r;
    if (nearEntry(isl, 0.3)(lx, lz) || !freeSpot(isl.c.x + lx, isl.c.z + lz, 0.9)) continue;
    pineTree(isl.c.x + lx, gy(isl, lx, lz), isl.c.z + lz, rr(0.8, 1.6), pick([0x2f6b45, 0x24584a, 0x3b7a4a, 0x2a5f5f]));
  }
  // glowing mushrooms & rocks
  for (let k = 0; k < 130; k++) {
    const a = rand() * 6.28, r = rr(1.8, isl.R * 0.9), lx = Math.cos(a) * r, lz = Math.sin(a) * r, y = gy(isl, lx, lz);
    const s = rr(0.8, 2.2);
    inst('stem', G.stem, M.stemW, mat4(isl.c.x + lx, y, isl.c.z + lz, 0, s), null, false);
    inst('mush', G.mush, M.glowMush, mat4(isl.c.x + lx, y + 0.19 * s, isl.c.z + lz, 0, s, s * 0.7, s), new THREE.Color(pick([0x29f0d4, 0x9a6bff, 0x4ad0ff])), false);
  }
  for (let k = 0; k < 14; k++) { const a = rand() * 6.28, r = rr(2, isl.R * 0.85), lx = Math.cos(a) * r, lz = Math.sin(a) * r; rockAt(isl.c.x + lx, gy(isl, lx, lz), isl.c.z + lz, rr(0.5, 1.2)); }
  scatterGrass(isl, 2600, (lx, lz) => Math.hypot(lx, lz) < 1.2);
  scatterFlowers(isl, 120, [0x9ad0ff, 0xd0a0ff, 0xffffff]);
  // wisps (spirits of light)
  const N = 60, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { const a = rand() * 6.28, r = rr(0.5, isl.R * 0.85); pos.set([isl.c.x + Math.cos(a) * r, gy(isl, Math.cos(a) * r, Math.sin(a) * r) + rr(0.4, 3), isl.c.z + Math.sin(a) * r], i * 3); seed[i] = rand() * 100; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  anim.wisps = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, size: { value: 90 * Math.min(devicePixelRatio, 1.75) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float time, size; attribute float seed; varying float vA;
      void main(){ vec3 p = position; p.x += sin(time*0.4+seed)*1.2; p.z += cos(time*0.33+seed*1.7)*1.2; p.y += sin(time*0.7+seed*2.3)*0.6;
        vec4 mv = modelViewMatrix*vec4(p,1.0); vA = 0.55+0.45*sin(time*1.8+seed*5.0); gl_PointSize = size*vA/-mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord-0.5); float a = pow(smoothstep(0.5,0.0,d),2.5);
      gl_FragColor = vec4(vec3(0.55,1.0,0.9)*3.0, a*vA); }`,
  }));
  scene.add(anim.wisps);
}

// =====================================================================
//  LAGO ESPEJO — lake
// =====================================================================
function buildLago(isl) {
  const wl = isl.c.y - 0.55;
  const K = isl.k;
  const pond = new THREE.Mesh(new THREE.CircleGeometry(3.6 * K, 64).rotateX(-Math.PI / 2), pondMat);
  pond.position.set(isl.c.x, wl, isl.c.z); scene.add(pond);
  isl.waterLevel = wl;
  // dock pointing to the pond from the entry side
  const da = isl.entryAng + 1.2, dx = Math.cos(da), dz = Math.sin(da);
  for (let k = 0; k < 12; k++) {
    const r = 4.6 * K - k * 0.3, x = isl.c.x + dx * r, z = isl.c.z + dz * r;
    inst('dock', new THREE.BoxGeometry(1.0, 0.07, 0.28), M.wood, mat4(x, wl + 0.35, z, Math.atan2(dx, dz)), new THREE.Color(0x8a5a36).offsetHSL(0, 0, rr(-0.05, 0.05)));
    if (k % 3 === 0) for (const s of [-1, 1]) inst('dockpost', G.cyl, M.wood, mat4(x + dz * 0.45 * s, wl + 0.05, z - dx * 0.45 * s, 0, 0.12, 0.9, 0.12));
  }
  isl.dockEnd = new THREE.Vector3(isl.c.x + dx * (4.6 * K - 3.3), wl + 0.39, isl.c.z + dz * (4.6 * K - 3.3));
  isl.dockDir = Math.atan2(-dx, -dz);
  // lily pads & reeds
  for (let k = 0; k < 50; k++) { const a = rand() * 6.28, r = rr(0.6, 3.3) * K; inst('pad', G.pad, new THREE.MeshStandardMaterial({ color: 0x3f9a4a, side: THREE.DoubleSide }), mat4(isl.c.x + Math.cos(a) * r, wl + 0.02, isl.c.z + Math.sin(a) * r, rand() * 6, rr(0.7, 1.3)), null, false); }
  for (let k = 0; k < 14; k++) { const a = rand() * 6.28, r = rr(0.6, 3.0) * K; inst('lotus', new THREE.IcosahedronGeometry(0.1, 0), new THREE.MeshStandardMaterial({ color: 0xffb0d8, emissive: 0xff60b0, emissiveIntensity: 0.8 }), mat4(isl.c.x + Math.cos(a) * r, wl + 0.08, isl.c.z + Math.sin(a) * r), null, false); }
  for (let k = 0; k < 240; k++) { const a = rand() * 6.28, r = rr(3.5, 4.4) * K, lx = Math.cos(a) * r, lz = Math.sin(a) * r; inst('reed', G.reed, M.reedM, mat4(isl.c.x + lx, gy(isl, lx, lz) - 0.1, isl.c.z + lz, 0, 1, rr(0.6, 1.4), 1, rr(-0.15, 0.15), rr(-0.15, 0.15)), null, false); }
  addObstacle(isl.c.x, isl.c.z, 3.9 * K);
  // willow-ish trees and boulders
  for (let i = 0; i < 18; i++) { const a = rand() * 6.28, r = rr(5.3, 7.6) * K, lx = Math.cos(a) * r, lz = Math.sin(a) * r; if (!nearEntry(isl)(lx, lz) && freeSpot(isl.c.x + lx, isl.c.z + lz, 0.8)) roundTree(isl.c.x + lx, gy(isl, lx, lz), isl.c.z + lz, rr(1.0, 1.5), pick([0x8fd6a0, 0xb8e07a, 0xff9ac8])); }
  for (let k = 0; k < 14; k++) { const a = rand() * 6.28, r = rr(4.4, 7.5) * K, lx = Math.cos(a) * r, lz = Math.sin(a) * r; rockAt(isl.c.x + lx, gy(isl, lx, lz), isl.c.z + lz, rr(0.4, 0.9)); }
  scatterGrass(isl, 2400, (lx, lz) => Math.hypot(lx, lz) < 3.7 * K);
  scatterFlowers(isl, 200, [0xffffff, 0x9ad0ff, 0xffe066], (lx, lz) => Math.hypot(lx, lz) < 3.9 * K);
  // waterfall off the outer rim
  const oa = Math.atan2(isl.c.z, isl.c.x), ox = Math.cos(oa), oz = Math.sin(oa);
  const rx = isl.c.x + ox * isl.R * 0.92, rz = isl.c.z + oz * isl.R * 0.92;
  waterfall(rx, gy(isl, rx - isl.c.x, rz - isl.c.z) + 0.02, rz, ox, oz, 1.1, 20);
  // jumping fish
  for (let k = 0; k < 4; k++) {
    const f = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshStandardMaterial({ color: pick([0xff7a2a, 0xffd040, 0xff4a6a]), roughness: 0.3, metalness: 0.2 }));
    body.scale.set(0.7, 0.8, 1.6); f.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 4), body.material); tail.rotation.x = Math.PI / 2; tail.position.z = -0.25; tail.scale.set(1, 1, 0.3); f.add(tail);
    f.visible = false; scene.add(f);
    anim.fish.push({ obj: f, t: -rr(0, 6), dur: 1.1, a: new THREE.Vector3(), b: new THREE.Vector3(), isl });
  }
}

// =====================================================================
//  TORRE ASTRAL — wizard tower
// =====================================================================
function buildTorre(isl) {
  const y0 = gy(isl, 0, 0);
  const T = new THREE.Group(); T.position.set(isl.c.x, y0, isl.c.z);
  const stoneM = texMat('brick', { vertexColors: true, roughness: 0.95 }); stoneM.map.repeat.set(5, 1.3); stoneM.normalMap.repeat.set(5, 1.3);
  let y = 0;
  for (let k = 0; k < 7; k++) {
    const h = 1.35, r0 = 1.7 - k * 0.08, r1 = r0 - 0.08;
    const g = new THREE.CylinderGeometry(r1, r0, h, 12, 2);
    const c = new THREE.Color(0xc8c0e0).offsetHSL(0, 0, (k % 2) * 0.04 - 0.02), cols = [];
    for (let i = 0; i < g.attributes.position.count; i++) { const cc = c.clone().offsetHSL(0, 0, rr(-0.04, 0.04)); cols.push(cc.r, cc.g, cc.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const seg = new THREE.Mesh(g, stoneM); seg.position.y = y + h / 2; T.add(seg);
    const band = new THREE.Mesh(new THREE.TorusGeometry(r1 + 0.02, 0.06, 6, 24), M.stone); band.rotation.x = Math.PI / 2; band.position.y = y + h; T.add(band);
    if (k > 0) for (let w = 0; w < 3; w++) { const a = w / 3 * 6.28 + k; const win = new THREE.Mesh(G.box, windowMat); win.scale.set(0.18, 0.4, 0.1); win.position.set(Math.cos(a) * (r1 + 0.02), y + 0.7, Math.sin(a) * (r1 + 0.02)); win.rotation.y = -a + Math.PI / 2; T.add(win); }
    y += h;
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.75, 3.2, 12), texMat('roof', { color: 0x6a3ab0, roughness: 0.6, flatShading: true }, 3)); roof.position.y = y + 1.6; T.add(roof);
  const door = new THREE.Mesh(G.box, M.wood); door.scale.set(0.6, 1.1, 0.1); door.position.set(0, 0.55, 1.68); T.add(door);
  T.rotation.y = Math.atan2(-isl.c.x, -isl.c.z);
  T.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(T); addObstacle(isl.c.x, isl.c.z, 1.9);
  // floating orb + rings
  const orbG = new THREE.Group(); orbG.position.set(isl.c.x, y0 + y + 4.6, isl.c.z); scene.add(orbG);
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.65, 3), new THREE.MeshStandardMaterial({ color: 0xc9a0ff, emissive: 0xa060ff, emissiveIntensity: 3 })); orbG.add(orb);
  for (let k = 0; k < 3; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.1 + k * 0.35, 0.025, 6, 64), M.violet); r.rotation.set(rr(0, 3), rr(0, 3), 0); orbG.add(r); anim.spinners.push({ obj: r, axis: 'xy', speed: 0.4 + k * 0.25 }); }
  anim.orbs.push({ obj: orbG, y: orbG.position.y });
  // orbiting rune stones
  for (let k = 0; k < 8; k++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshStandardMaterial({ color: 0x6a5aa0, emissive: 0x8a6aff, emissiveIntensity: 1.5, flatShading: true }));
    scene.add(s); anim.floaters.push({ obj: s, c: isl.c.clone().setY(y0), r: (3.0 + (k % 2) * 0.6) * isl.k, h: 2 + (k % 4) * 1.6, ph: k / 8 * 6.28, sp: 0.3 });
  }
  // rune circle on the ground
  const circle = new THREE.Mesh(new THREE.RingGeometry(3.3 * isl.k, 3.3 * isl.k + 0.14, 96).rotateX(-Math.PI / 2), M.violet); circle.position.set(isl.c.x, y0 + 0.05, isl.c.z); scene.add(circle);
  for (let k = 0; k < 12; k++) { const a = k / 12 * 6.28; const g = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3).rotateX(-Math.PI / 2), M.violet); const rr2 = 3.65 * isl.k; g.position.set(isl.c.x + Math.cos(a) * rr2, gy(isl, Math.cos(a) * rr2, Math.sin(a) * rr2) + 0.04, isl.c.z + Math.sin(a) * rr2); g.rotation.y = a; scene.add(g); }
  // crystals around tower
  for (let k = 0; k < 10; k++) {
    const a = rand() * 6.28, r = rr(4.6, 6.4) * isl.k, lx = Math.cos(a) * r, lz = Math.sin(a) * r; if (nearEntry(isl, 0.3)(lx, lz)) continue;
    inst('tcrystal', new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshStandardMaterial({ color: 0xb08cff, emissive: 0x8a5aff, emissiveIntensity: 1.8, flatShading: true }),
      mat4(isl.c.x + lx, gy(isl, lx, lz) + 0.3, isl.c.z + lz, rand() * 6, rr(0.6, 1.2), rr(1.5, 3), rr(0.6, 1.2), rr(-0.3, 0.3), rr(-0.3, 0.3)), null, false);
    addObstacle(isl.c.x + lx, isl.c.z + lz, 0.3);
  }
  scatterGrass(isl, 1600, (lx, lz) => Math.hypot(lx, lz) < 2.0);
  scatterFlowers(isl, 120, [0xb08cff, 0xffffff, 0x8ad0ff]);
}

function initMaterials() {
  Object.assign(M, {
    trunk: texMat('bark', { color: 0x9a7a60 }),
    wall: texMat('plaster', {}),
    roof: texMat('roof', { flatShading: true }, 2),
    wood: texMat('wood', { color: 0xc09070 }),
    stone: texMat('brick', { flatShading: true, color: 0xd8d0e0 }),
    soil: texMat('soil', { color: 0xa07a5a }, 2),
  });
  addWind(M.grass, 1.2); addWind(M.canopy, 0.04); addWind(M.crop, 0.55); addWind(M.reedM = new THREE.MeshStandardMaterial({ color: 0x6f9a4a }), 0.25);
}
export function buildDecor() {
  initMaterials();
  const by = Object.fromEntries(ISLANDS.map(i => [i.id, i]));
  buildAldea(by.aldea); buildMolino(by.molino); buildBosque(by.bosque); buildLago(by.lago); buildTorre(by.torre);
}

const _v = new THREE.Vector3();
export function updateDecor(dt, t, mode) {
  anim.waterU.time.value = t;
  for (const s of anim.spinners) { if (s.axis === 'z') s.obj.rotation.z += dt * s.speed; else { s.obj.rotation.x += dt * s.speed * 0.6; s.obj.rotation.y += dt * s.speed; } }
  for (const o of anim.orbs) { o.obj.position.y = o.y + Math.sin(t * 0.8) * 0.3; o.obj.rotation.y += dt * 0.4; }
  for (const f of anim.floaters) { const a = f.ph + t * f.sp; f.obj.position.set(f.c.x + Math.cos(a) * f.r, f.c.y + f.h + Math.sin(t + f.ph) * 0.3, f.c.z + Math.sin(a) * f.r); f.obj.rotation.y += dt; f.obj.rotation.x += dt * 0.5; }
  if (anim.wisps) anim.wisps.material.uniforms.time.value = t;
  windowMat.emissiveIntensity = 0.5 + mode * 2.2;
  lanternMat.emissiveIntensity = 0.9 + mode * 2.5;
  updateSmoke(dt);
  // fish jumps
  for (const f of anim.fish) {
    f.t += dt;
    if (f.t < 0) continue;
    if (!f.obj.visible) {
      const isl = f.isl, a = rand() * 6.28, r = rr(0.5, 2.6) * isl.k, a2 = a + rr(-0.6, 0.6), r2 = rr(0.5, 2.8) * isl.k;
      f.a.set(isl.c.x + Math.cos(a) * r, isl.waterLevel, isl.c.z + Math.sin(a) * r);
      f.b.set(isl.c.x + Math.cos(a2) * r2, isl.waterLevel, isl.c.z + Math.sin(a2) * r2);
      f.obj.visible = true; f.t = 0; f.onSplash && f.onSplash(f.a);
      anim.onFishSplash && anim.onFishSplash(f.a);
    }
    const u = f.t / f.dur;
    if (u >= 1) { f.obj.visible = false; f.t = -rr(2, 7); anim.onFishSplash && anim.onFishSplash(f.b); continue; }
    _v.lerpVectors(f.a, f.b, u); _v.y += Math.sin(Math.PI * u) * 1.1;
    f.obj.position.copy(_v);
    f.obj.lookAt(f.b.x, f.a.y + Math.cos(Math.PI * u) * 1.5, f.b.z);
  }
}
