// Sky life: a giant sky whale, flocks of birds and a drifting airship.
import * as THREE from 'three';
import { scene, rand, rr } from './core.js';

const life = { whale: null, birds: [], airship: null };
// whale path & look; buildHallOrca() turns it into an orca swimming under the pavilion dome
const W = { R: 78, wob: 10, y: 34, yWob: 5, top: 0x2a3a8a, belly: 0xbfd8ff, spot: 0x9fe8ff, spotEm: 0x6fd8ff, scale: 1, spacing: 0.034, speed: 0.022 };
export { life };

// ---------- sky whale ----------
function buildWhale() {
  const N = 14, segs = [];
  const group = new THREE.Group(); scene.add(group);
  const geo = new THREE.SphereGeometry(1, 20, 14);
  // belly lighter via vertex colours
  const cols = [], top = new THREE.Color(W.top), belly = new THREE.Color(W.belly), c = new THREE.Color();
  for (let i = 0; i < geo.attributes.position.count; i++) {
    const y = geo.attributes.position.getY(i); c.copy(top).lerp(belly, THREE.MathUtils.smoothstep(-y, -0.1, 0.7)); cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const skinM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.1 });
  const spotM = new THREE.MeshStandardMaterial({ color: W.spot, emissive: W.spotEm, emissiveIntensity: 2.5 });
  const spotG = new THREE.SphereGeometry(0.12, 8, 6);
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const r = Math.max(0.35, Math.sin(Math.PI * Math.pow(t, 0.62) * 0.98) * 3.2 * (1 - t * 0.55)) * W.scale;
    const m = new THREE.Mesh(geo, skinM); m.scale.set(r, r * 0.82, 2.9 * W.scale); m.castShadow = true;
    group.add(m); segs.push({ m, r });
    if (i > 1 && i < N - 2) for (const s of [-1, 1]) for (let k = 0; k < 2; k++) {
      const sp = new THREE.Mesh(spotG, spotM); sp.position.set(s * 0.93, 0.25 + k * 0.3, rr(-0.3, 0.3)); m.add(sp);
    }
  }
  // eyes
  const eyeM = new THREE.MeshStandardMaterial({ color: 0x101020, roughness: 0.2 });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), eyeM); e.position.set(s * 0.8, 0.05, 0.45); segs[1].m.add(e); }
  // fins
  const finG = new THREE.SphereGeometry(1, 12, 8); finG.scale(2.4, 0.12, 0.9);
  const fins = [];
  const r3 = segs[3].r;
  for (const s of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(s * 0.85, -0.35, 0); piv.scale.set(1 / r3, 1 / (0.82 * r3), 1 / 2.9); segs[3].m.add(piv);
    const f = new THREE.Mesh(finG, skinM); f.position.x = s * 2.0; f.castShadow = true; piv.add(f); piv.userData.s = s; fins.push(piv); }
  const flukeG = new THREE.SphereGeometry(1, 12, 8); flukeG.scale(2.0, 0.1, 0.8);
  const rl = segs[N - 1].r, fluke = new THREE.Group(); fluke.scale.set(1 / rl, 1 / (0.82 * rl), 1 / 2.9); segs[N - 1].m.add(fluke);
  for (const s of [-1, 1]) { const f = new THREE.Mesh(flukeG, skinM); f.position.set(s * 1.5, 0, -1.4); f.rotation.y = s * 0.5; fluke.add(f); }
  life.whale = { group, segs, fins, fluke, N };
}
const _p = new THREE.Vector3(), _q = new THREE.Vector3();
function whalePath(s, out) { // big lazy loop around the world
  const R = W.R + Math.sin(s * 2) * W.wob;
  return out.set(Math.cos(s) * R, W.y + Math.sin(s * 3) * W.yWob, Math.sin(s) * R);
}
function updateWhale(t) {
  const w = life.whale; if (!w) return;
  const s0 = t * W.speed;
  for (let i = 0; i < w.N; i++) {
    const s = s0 - i * W.spacing;
    whalePath(s, _p); whalePath(s + 0.01, _q);
    const und = Math.sin(t * 1.1 - i * 0.45) * 0.35 * (i / w.N) * 3;
    const seg = w.segs[i].m;
    seg.position.set(_p.x, _p.y + und, _p.z);
    seg.lookAt(_q.x, _q.y + Math.sin(t * 1.1 - (i - 1) * 0.45) * 0.35 * (i / w.N) * 3, _q.z);
  }
  for (const f of w.fins) f.rotation.z = Math.sin(t * 1.1) * 0.35 * f.userData.s;
  w.fluke.rotation.x = Math.sin(t * 1.1 - 1.5) * 0.4;
}
export function whalePosition(out) { return life.whale ? out.copy(life.whale.segs[2].m.position) : out.set(62, 19, 0); }

// ---------- birds ----------
function buildBirds() {
  const wingG = new THREE.BufferGeometry();
  wingG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.12, 0, 0, -0.12, 0.55, 0, -0.05], 3));
  wingG.computeVertexNormals();
  const bodyG = new THREE.ConeGeometry(0.07, 0.4, 5); bodyG.rotateX(Math.PI / 2);
  const flocks = [{ n: 26, c: 0xffffff, rad: 60, h: 16, sp: 0.07 }, { n: 18, c: 0x2a2a3a, rad: 45, h: 12, sp: -0.09 }, { n: 14, c: 0xffd0a0, rad: 80, h: 20, sp: 0.05 }];
  for (const f of flocks) {
    const mat = new THREE.MeshStandardMaterial({ color: f.c, side: THREE.DoubleSide, roughness: 0.8 });
    const leaderPh = rand() * 6.28;
    for (let i = 0; i < f.n; i++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(bodyG, mat));
      const L = new THREE.Mesh(wingG, mat), R = new THREE.Mesh(wingG, mat); R.scale.x = -1; g.add(L, R);
      scene.add(g);
      life.birds.push({ g, L, R, f, off: new THREE.Vector3(rr(-3, 3), rr(-1.2, 1.2), rr(-3, 3)), ph: rand() * 6.28, leaderPh, rate: rr(9, 13) });
    }
  }
}
const _prev = new THREE.Vector3();
function updateBirds(t) {
  for (const b of life.birds) {
    const f = b.f, a = b.leaderPh + t * f.sp;
    const R = f.rad + Math.sin(t * 0.13 + b.leaderPh) * 8;
    _p.set(Math.cos(a) * R, f.h + Math.sin(t * 0.3 + b.leaderPh) * 3, Math.sin(a) * R);
    _p.x += b.off.x + Math.sin(t * 0.7 + b.ph) * 0.6; _p.y += b.off.y + Math.sin(t * 0.9 + b.ph) * 0.4; _p.z += b.off.z + Math.cos(t * 0.6 + b.ph) * 0.6;
    _prev.copy(b.g.position); b.g.position.copy(_p);
    if (_prev.lengthSq() > 0) b.g.lookAt(_p.x * 2 - _prev.x, _p.y * 2 - _prev.y, _p.z * 2 - _prev.z);
    const glide = Math.sin(t * 0.5 + b.ph) > 0.6 ? 0.15 : 1;
    const fl = Math.sin(t * b.rate + b.ph) * 0.7 * glide;
    b.L.rotation.z = fl; b.R.rotation.z = -fl;
  }
}

// ---------- airship ----------
function buildAirship() {
  const g = new THREE.Group(); scene.add(g);
  const bal = new THREE.SphereGeometry(1, 24, 16); bal.scale(1.4, 1.4, 3.4);
  const cols = [], cA = new THREE.Color(0xe04a5a), cB = new THREE.Color(0xf6e6c8);
  for (let i = 0; i < bal.attributes.position.count; i++) {
    const x = bal.attributes.position.getX(i), y = bal.attributes.position.getY(i);
    const ang = Math.atan2(y, x); const c = Math.floor((ang + Math.PI) / (Math.PI * 2) * 12) % 2 ? cA : cB; cols.push(c.r, c.g, c.b);
  }
  bal.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const balloon = new THREE.Mesh(bal, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })); balloon.position.y = 2.2; balloon.castShadow = true; g.add(balloon);
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a4e2d, roughness: 0.9 });
  const gond = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 2.4), wood); gond.castShadow = true; g.add(gond);
  const winM = new THREE.MeshStandardMaterial({ color: 0x332211, emissive: 0xffb84d, emissiveIntensity: 1.5 });
  for (let k = 0; k < 4; k++) for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.28), winM); w.position.set(s * 0.51, 0.05, -0.8 + k * 0.55); g.add(w); }
  const ropeM = new THREE.MeshStandardMaterial({ color: 0xd0b080 });
  for (const [x, z] of [[-0.45, -1.1], [0.45, -1.1], [-0.45, 1.1], [0.45, 1.1]]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.7, 4), ropeM); r.position.set(x * 1.4, 1.0, z * 1.2); r.rotation.z = -x * 0.35; g.add(r); }
  for (const s of [-1, 1]) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 1.0), new THREE.MeshStandardMaterial({ color: 0xe04a5a })); fin.position.set(0, 2.2 + s * 1.0, -3.0); g.add(fin);
    const fin2 = fin.clone(); fin2.rotation.z = Math.PI / 2; fin2.position.set(s * 1.0, 2.2, -3.0); g.add(fin2); }
  const prop = new THREE.Group(); prop.position.set(0, 0, -1.35); g.add(prop);
  for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.03), wood); b.rotation.z = k * Math.PI / 1.5; b.position.y = 0; prop.add(b); }
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffc060, emissiveIntensity: 4 })); lamp.position.set(0, -0.15, 1.25); g.add(lamp);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.35), new THREE.MeshStandardMaterial({ color: 0x40b0ff, side: THREE.DoubleSide })); flag.position.set(0, 4.0, -1.8); g.add(flag);
  life.airship = { g, prop, flag };
}
function updateAirship(t) {
  const a = life.airship; if (!a) return;
  const s = t * 0.035;
  const pos = (u, o) => o.set(Math.sin(u) * 70, 18 + Math.sin(u * 2) * 3, Math.sin(u) * Math.cos(u) * 62);
  pos(s, _p); pos(s + 0.01, _q);
  a.g.position.copy(_p); a.g.lookAt(_q);
  a.g.rotateZ(Math.sin(t * 0.7) * 0.04);
  a.prop.rotation.z += 0.4;
  a.flag.rotation.y = Math.sin(t * 5) * 0.3;
}
export function airshipPosition(out) { return life.airship ? out.copy(life.airship.g.position) : out.set(0, 12, 0); }

export function buildSkyLife() { buildWhale(); buildBirds(); buildAirship(); }
export function buildHallOrca() {
  Object.assign(W, { R: 30, wob: 4, y: 18.5, yWob: 1.2, top: 0x16131f, belly: 0xf6f3fa, spot: 0xd9c5ff, spotEm: 0x9371ff, scale: 0.85, spacing: 0.07, speed: 0.04 });
  buildWhale();
}
export function updateSkyLife(dt, t) { updateWhale(t); updateBirds(t); updateAirship(t); }
