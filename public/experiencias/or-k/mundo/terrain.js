// Terrain: the O R-K pavilion layout (stands on a ring around the lobby), its flat walkable floor,
// obstacles, and a single groundAt(x,z) query used by every walker (NPCs and the player).
import * as THREE from 'three';
import { scene, simplex, rand, rr, smooth, inst, mat4, lanternMat } from './core.js';
import { texMat } from './textures.js';

// ---------- O R-K pavilion: one big round hall; every service is a stand on a ring around the lobby ----------
export const HALL = { R: 60, wallH: 11, roofH: 27, entrance: 2.26, doorHalf: 0.105, plazaR: 84, plazaHalf: 0.3 };
const angTo = (a, b) => Math.abs(((a - b) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
function inPlaza(x, z) { const r = Math.hypot(x, z); return r >= HALL.R - 1 && r < HALL.plazaR - 0.5 && angTo(Math.atan2(z, x), HALL.entrance) < HALL.plazaHalf; }
const STAND_IDS = ['aldea', 'molino', 'bosque', 'lago', 'torre', 'ruinas', 'helada', 'volcan'];
const STAND_NAMES = { aldea: 'Tecnología', molino: 'Marketing', bosque: 'Comunidad', lago: 'Diseño', torre: 'Web', ruinas: 'Analítica', helada: 'Audiovisual', volcan: 'Branding' };
export const ISLANDS = STAND_IDS.map((id, i) => ({ id, name: STAND_NAMES[id], ang: Math.PI / 2 + Math.PI / 8 + i * Math.PI / 4, dist: 37, R: 14, R0: 8.5, y: 0, grass: [0.36, 0.62, 0.24], seed: 11 + i * 7 }));
export const INNER = ISLANDS, OUTER = [];
for (const isl of ISLANDS) {
  isl.k = isl.R / isl.R0;
  isl.c = new THREE.Vector3(Math.cos(isl.ang) * isl.dist, isl.y, Math.sin(isl.ang) * isl.dist);
  isl.entryAng = Math.atan2(-isl.c.z, -isl.c.x);
}
export const CENTRAL_SCALE = 1.6;
export const CENTRAL = { id: 'centro', name: 'Lobby O R-K', c: new THREE.Vector3(0, 0, 0), R: 9, k: 1 };

// ---------- island surface ----------
function topLocal() { return 0.02; }   // stands sit on the pavilion's flat floor
export function islandGround(isl, x, z) {
  const lx = x - isl.c.x, lz = z - isl.c.z;
  if (Math.hypot(lx, lz) > isl.R * 0.93) return null;
  return isl.c.y + topLocal(isl, lx, lz);
}

function buildIslandMesh(isl) {
  // rings carry SEG+1 vertices (duplicated seam) so UVs wrap cleanly
  const RINGS = Math.round(isl.R * 2.6), SEG = isl.outer ? 112 : 72, DOWN = 16, depth = isl.R * 1.25, W = SEG + 1;
  const pos = [], col = [], uv = [];
  const g = new THREE.Color(...isl.grass);
  const tmp = new THREE.Color();
  const pushV = (x, y, z, c, u, v) => { pos.push(x, y, z); col.push(c.r, c.g, c.b); uv.push(u, v); };
  pushV(0, topLocal(isl, 0, 0), 0, g, 0, 0);
  for (let i = 1; i <= RINGS; i++) {
    const r = isl.R * i / RINGS;
    for (let j = 0; j <= SEG; j++) {
      const a = j / SEG * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
      const n = simplex.noise(x * 0.4 + isl.seed, z * 0.4) * 0.5 + 0.5;
      tmp.copy(g).multiplyScalar(0.8 + n * 0.35);
      if (i >= RINGS - 1) tmp.lerp(new THREE.Color(0.42, 0.3, 0.2), i === RINGS ? 0.75 : 0.3);
      if (isl.id === 'lago' && r < 3.0 * isl.k) tmp.lerp(new THREE.Color(0.55, 0.47, 0.32), smooth(3.0, 2.2, r / isl.k));
      if (isl.id === 'volcan') tmp.lerp(new THREE.Color(0.12, 0.1, 0.1), smooth(9, 3, r / isl.k)).lerp(new THREE.Color(1.0, 0.35, 0.05), smooth(2.4, 1.4, r / isl.k));
      if (isl.id === 'nido' && n > 0.6) tmp.lerp(new THREE.Color(0.5, 0.48, 0.45), 0.5);
      pushV(x, topLocal(isl, x, z), z, tmp, x / 2.2, z / 2.2);
    }
  }
  const circ = Math.round(isl.R * Math.PI * 2 / 3.5);
  for (let k = 1; k <= DOWN; k++) {
    const t = k / DOWN;
    for (let j = 0; j <= SEG; j++) {
      const a = j / SEG * Math.PI * 2, jj = j % SEG, aa = jj / SEG * Math.PI * 2;
      const wob = 1 + simplex.noise(Math.cos(aa) * 2 + isl.seed, Math.sin(aa) * 2 + k * 0.3) * 0.16;
      const r = isl.R * Math.pow(1 - t, 0.85) * wob;
      const y = -t * depth + simplex.noise(aa * 3 % (Math.PI * 6), k * 0.5 + isl.seed) * 0.6 - 0.3;
      tmp.setRGB(0.62, 0.5, 0.44).lerp(new THREE.Color(0.48, 0.38, 0.36), t);
      if (k <= 2) tmp.lerp(new THREE.Color(0.3, 0.42, 0.2), 0.45 / k);
      const yy = y + topLocal(isl, Math.cos(aa) * isl.R * 0.98, Math.sin(aa) * isl.R * 0.98) * (1 - t);
      pushV(Math.cos(aa) * r, yy, Math.sin(aa) * r, tmp, a / (Math.PI * 2) * circ, yy / 3.5);
    }
  }
  pushV(0, -depth - 1.5, 0, new THREE.Color(0.4, 0.3, 0.28), 0, (-depth - 1.5) / 3.5);
  const idx = [];
  for (let j = 0; j < SEG; j++) idx.push(0, 1 + j + 1, 1 + j);
  const ringStart = (i) => 1 + (i - 1) * W;
  const total = RINGS + DOWN;
  let topCount = 0;
  for (let i = 1; i < total; i++) {
    if (i === RINGS) topCount = idx.length;
    const a0 = ringStart(i), b0 = ringStart(i + 1);
    for (let j = 0; j < SEG; j++) idx.push(a0 + j, a0 + j + 1, b0 + j, a0 + j + 1, b0 + j + 1, b0 + j);
  }
  const tip = pos.length / 3 - 1, last = ringStart(total);
  for (let j = 0; j < SEG; j++) idx.push(last + j, last + j + 1, tip);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.addGroup(0, topCount, 0); geo.addGroup(topCount, idx.length - topCount, 1);
  geo.computeVertexNormals();
  const top = texMat('brick', { color: 0x5d567e, roughness: 0.44, metalness: 0.65 }, 2); top.normalScale.set(0.42, 0.42);
  const side = texMat('rock', { color: 0x514267, roughness: 0.62, metalness: 0.42, flatShading: true }); side.normalScale.set(1.4, 1.4);
  const mesh = new THREE.Mesh(geo, [top, side]);
  mesh.position.copy(isl.c);
  mesh.receiveShadow = true; mesh.castShadow = true;
  scene.add(mesh);
  isl.mesh = mesh;
}

// ---------- crystal island height grid (from the loaded GLB) ----------
const GRID = { min: -9, size: 0.25, n: 72, h: null };
export function buildCentralGrid(islandMesh) {
  islandMesh.updateMatrixWorld(true);
  const p = islandMesh.geometry.attributes.position, v = new THREE.Vector3();
  const h = new Float32Array(GRID.n * GRID.n).fill(-Infinity);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(islandMesh.matrixWorld);
    const gx = Math.floor((v.x - GRID.min) / GRID.size), gz = Math.floor((v.z - GRID.min) / GRID.size);
    if (gx < 0 || gz < 0 || gx >= GRID.n || gz >= GRID.n) continue;
    const k = gz * GRID.n + gx; if (v.y > h[k]) h[k] = v.y;
  }
  GRID.h = h;
}
function centralGround(x, z) {
  if (!GRID.h || Math.hypot(x, z) > CENTRAL.R) return null;
  const fx = (x - GRID.min) / GRID.size - 0.5, fz = (z - GRID.min) / GRID.size - 0.5;
  const x0 = Math.floor(fx), z0 = Math.floor(fz), tx = fx - x0, tz = fz - z0;
  const at = (a, b) => (a < 0 || b < 0 || a >= GRID.n || b >= GRID.n) ? -Infinity : GRID.h[b * GRID.n + a];
  const h00 = at(x0, z0), h10 = at(x0 + 1, z0), h01 = at(x0, z0 + 1), h11 = at(x0 + 1, z0 + 1);
  if ([h00, h10, h01, h11].some(v => v === -Infinity)) {
    const m = Math.max(h00, h10, h01, h11); return m === -Infinity ? null : m;
  }
  return (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz;
}

// ---------- bridges ----------
export const BRIDGES = [];
const plankGeo = new THREE.BoxGeometry(1.25, 0.07, 0.3);
let plankMat = null;
const postGeo = new THREE.CylinderGeometry(0.07, 0.09, 1.3, 6);
const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8c70ff, emissive: 0x6542e2, emissiveIntensity: 0.9, roughness: 0.5 });
const lampGeo = new THREE.SphereGeometry(0.13, 10, 8);
const hangGeo = new THREE.CylinderGeometry(0.015, 0.015, 1, 4);

function bridgeY(b, t) { return THREE.MathUtils.lerp(b.a.y, b.b.y, t) - Math.sin(Math.PI * t) * b.sag; }

export function buildBridges() {
  plankMat = new THREE.MeshStandardMaterial({ color: 0x8279a2, metalness: 0.68, roughness: 0.34 });
  for (const isl of ISLANDS) {
    let ax, az, ay, bx, bz;
    if (!isl.outer) {
      const dir = isl.c.clone().setY(0).normalize();
      ax = dir.x * 4.3 * CENTRAL_SCALE; az = dir.z * 4.3 * CENTRAL_SCALE; ay = (centralGround(ax, az) ?? 0.3);
      bx = isl.c.x - dir.x * isl.R * 0.86; bz = isl.c.z - dir.z * isl.R * 0.86;
    } else {
      const from = ISLANDS.find(i => i.id === isl.link);
      const dir = isl.c.clone().sub(from.c).setY(0).normalize();
      ax = from.c.x + dir.x * from.R * 0.86; az = from.c.z + dir.z * from.R * 0.86; ay = (islandGround(from, ax, az) ?? from.y);
      bx = isl.c.x - dir.x * isl.R * 0.88; bz = isl.c.z - dir.z * isl.R * 0.88;
      isl.from = from;
    }
    const a = new THREE.Vector3(ax, ay + 0.05, az);
    const b = new THREE.Vector3(bx, (islandGround(isl, bx, bz) ?? isl.y) + 0.05, bz);
    const len = Math.hypot(bx - ax, bz - az);
    const br = { isl, a, b, len, sag: len * (isl.outer ? 0.03 : 0.045), dir: new THREE.Vector3(bx - ax, 0, bz - az).normalize(), center: !isl.outer };
    isl.bridge = br;
    BRIDGES.push(br);
    const yaw = Math.atan2(br.dir.x, br.dir.z);
    const side = new THREE.Vector3(br.dir.z, 0, -br.dir.x);
    const N = Math.floor(len / 0.36);
    const ropeL = [], ropeR = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = bridgeY(br, t);
      const slope = Math.atan2(bridgeY(br, Math.min(1, t + 0.01)) - bridgeY(br, Math.max(0, t - 0.01)), len * 0.02);
      const c = new THREE.Color().setHSL(0.71, 0.16, 0.62 + rand() * 0.18);
      inst('plank', plankGeo, plankMat, mat4(x, y, z, yaw, 1, 1, 1, -slope, (rand() - 0.5) * 0.05), c);
      const ry = y + 0.9 + Math.sin(Math.PI * t) * 0.05;
      ropeL.push(new THREE.Vector3(x + side.x * 0.62, ry, z + side.z * 0.62));
      ropeR.push(new THREE.Vector3(x - side.x * 0.62, ry, z - side.z * 0.62));
      if (i % 4 === 0) for (const s of [1, -1])
        inst('hang', hangGeo, ropeMat, mat4(x + side.x * 0.62 * s, y + 0.45, z + side.z * 0.62 * s, 0, 1, 0.9, 1), null, false);
    }
    br.ropes = [];
    for (const pts of [ropeL, ropeR]) {
      const curve = new THREE.CatmullRomCurve3(pts); br.ropes.push(curve);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.03, 5), ropeMat);
      scene.add(tube);
    }
    for (const end of [a, b]) for (const s of [1, -1]) {
      const x = end.x + side.x * 0.65 * s, z = end.z + side.z * 0.65 * s;
      inst('post', postGeo, plankMat, mat4(x, end.y + 0.55, z));
      inst('lamp', lampGeo, lanternMat, mat4(x, end.y + 1.3, z), null, false);
    }
  }
}
function bridgeGround(x, z) {
  let best = null;
  for (const b of BRIDGES) {
    const dx = x - b.a.x, dz = z - b.a.z;
    const along = dx * b.dir.x + dz * b.dir.z, lat = Math.abs(dx * b.dir.z - dz * b.dir.x);
    if (along < -0.3 || along > b.len + 0.3 || lat > 0.62) continue;
    const y = bridgeY(b, THREE.MathUtils.clamp(along / b.len, 0, 1)) + 0.04;
    if (best === null || y > best) best = y;
  }
  return best;
}

// ---------- interior rooms (far away from the archipelago) ----------
export const ROOMS = [];
export function addRoom(room) { ROOMS.push(room); return room; }
function roomAt(x, z) { for (const r of ROOMS) if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return r; return null; }

// ---------- unified ground query ----------
export function groundAt(x, z) {
  if (x > 300) { const r = roomAt(x, z); return r ? r.y : null; }
  if (!(Math.hypot(x, z) < HALL.R - 0.3 || inPlaza(x, z))) return null;   // pavilion floor + arrival plaza
  if (Math.hypot(x, z) < 6.3) return 0.3;                                    // lobby plinth
  for (const isl of ISLANDS) if (Math.hypot(x - isl.c.x, z - isl.c.z) < isl.R * 0.74) return 0.1;   // stand stages
  return 0.02;
  let g = centralGround(x, z);
  for (const isl of ISLANDS) {
    if (Math.abs(x - isl.c.x) > isl.R || Math.abs(z - isl.c.z) > isl.R) continue;
    const h = islandGround(isl, x, z); if (h !== null && (g === null || h > g)) g = h;
  }
  const b = bridgeGround(x, z); if (b !== null && (g === null || b > g)) g = b;
  return g;
}
export function islandAt(x, z) {
  if (x > 300) return roomAt(x, z);
  if (Math.hypot(x, z) < CENTRAL.R) return CENTRAL;
  for (const isl of ISLANDS) if (Math.hypot(x - isl.c.x, z - isl.c.z) < isl.R * 0.93) return isl;
  return null;
}

// ---------- obstacles: circles and rotated boxes ----------
export const OBST = [];
export function addObstacle(x, z, r) { OBST.push({ x, z, r }); }
// rotated rectangle: half sizes hx (local X) and hz (local Z), rot = the object's rotation.y
export function addBox(x, z, hx, hz, rot = 0) { OBST.push({ x, z, hx, hz, rot, c: Math.cos(rot), s: Math.sin(rot), r: Math.hypot(hx, hz) }); }
export function pushOut(p, radius = 0.3) {
  if (p.x < 300) {                                                        // the pavilion wall, with the doorway to the plaza
    const dc = Math.hypot(p.x, p.z), da = angTo(Math.atan2(p.z, p.x), HALL.entrance);
    const inner = HALL.R - 1.2 - radius, outer = HALL.R + 1.2 + radius;
    if (dc > inner && dc < outer && da > HALL.doorHalf - radius * 0.02) { const k = (dc < HALL.R ? inner : outer) / dc; p.x *= k; p.z *= k; }
    else if (dc >= outer) {
      const lim = HALL.plazaR - 1 - radius, maxA = HALL.plazaHalf - 0.02;
      let a = Math.atan2(p.z, p.x), r = Math.min(dc, lim); const d = ((a - HALL.entrance) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      if (Math.abs(d) > maxA) a = HALL.entrance + Math.sign(d) * maxA;
      p.x = Math.cos(a) * r; p.z = Math.sin(a) * r;
    }
  }
  for (const o of OBST) {
    const dx = p.x - o.x, dz = p.z - o.z;
    if (Math.abs(dx) > o.r + radius + 0.1 || Math.abs(dz) > o.r + radius + 0.1) continue;
    if (o.hx === undefined) {
      const d = Math.hypot(dx, dz), m = o.r + radius;
      if (d < m && d > 1e-4) { p.x = o.x + dx / d * m; p.z = o.z + dz / d * m; }
      continue;
    }
    // into box space
    let lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c;
    const ex = o.hx + radius, ez = o.hz + radius;
    if (Math.abs(lx) >= ex || Math.abs(lz) >= ez) continue;
    if (ex - Math.abs(lx) < ez - Math.abs(lz)) lx = Math.sign(lx || 1) * ex; else lz = Math.sign(lz || 1) * ez;
    p.x = o.x + lx * o.c + lz * o.s; p.z = o.z - lx * o.s + lz * o.c;
  }
}
export function freeSpot(x, z, radius = 0.4) {
  const p = { x, z }; pushOut(p, radius);
  return Math.abs(p.x - x) < 1e-6 && Math.abs(p.z - z) < 1e-6;
}
// random walkable point on an island (local frac of radius), avoiding obstacles
export function randomPointOn(isl, minR = 0, maxFrac = 0.75, avoid = null) {
  const c = isl.c, R = (isl.R ?? 5) * maxFrac;
  for (let k = 0; k < 30; k++) {
    const a = rand() * Math.PI * 2, r = minR + (R - minR) * Math.sqrt(rand());
    const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
    if (avoid && avoid(x - c.x, z - c.z)) continue;
    if (freeSpot(x, z) && groundAt(x, z) !== null) return new THREE.Vector3(x, 0, z);
  }
  return new THREE.Vector3(c.x, 0, c.z);
}

export function buildIslands() { /* the pavilion replaces the floating islands */ }

// helpers for decorators: ground y at an island-local point
export function gy(isl, lx, lz) { return islandGround(isl, isl.c.x + lx, isl.c.z + lz) ?? isl.c.y; }
export { rr };
