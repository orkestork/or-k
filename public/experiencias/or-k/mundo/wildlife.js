// Free-roaming wildlife that doesn't walk on the ground: ducks with ducklings, koi,
// butterflies, and a dragon circling the wizard tower.
import * as THREE from 'three';
import { scene, rand, rr, pick } from './core.js';
import { ISLANDS } from './terrain.js';
import { mat } from './npc.js';

const W = { ducks: [], koi: [], butterflies: [], dragon: null, onFire: null };
export { W as wildlife };
const ell = (rx, ry, rz, seg = 12) => { const g = new THREE.SphereGeometry(1, seg, Math.max(6, seg * 0.7 | 0)); g.scale(rx, ry, rz); return g; };
const add = (p, g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; p.add(o); return o; };

// ---------- ducks ----------
function duck(scale, color) {
  const g = new THREE.Group(); g.scale.setScalar(scale);
  const body = mat(color, { roughness: 0.7 });
  add(g, ell(0.14, 0.1, 0.2), body, 0, 0.06, 0);
  const tail = add(g, new THREE.ConeGeometry(0.06, 0.12, 6), body, 0, 0.12, -0.2); tail.rotation.x = -2.2;
  const head = new THREE.Group(); head.position.set(0, 0.2, 0.14); g.add(head);
  add(head, new THREE.SphereGeometry(0.075, 10, 8), color === 0x6a5a40 ? mat(0x2a6a3a, { roughness: 0.3, metalness: 0.3 }) : body);
  const beak = add(head, ell(0.04, 0.015, 0.06), mat(0xf0a020), 0, -0.01, 0.08);
  for (const s of [-1, 1]) { add(head, new THREE.SphereGeometry(0.013, 6, 4), mat(0x111111), s * 0.045, 0.02, 0.05); add(g, ell(0.03, 0.06, 0.12), body, s * 0.12, 0.09, -0.02); }
  g.userData.head = head;
  scene.add(g); return g;
}
function buildDucks() {
  const L = ISLANDS.find(i => i.id === 'lago');
  for (let f = 0; f < 2; f++) {
    const fam = { center: L.c, r: rr(1.4, 2.6) * L.k, sp: rr(0.18, 0.28) * (f ? -1 : 1), ph: rand() * 6, y: L.waterLevel, members: [] };
    fam.members.push(duck(1, f ? 0xf4efe6 : 0x6a5a40));
    for (let k = 0; k < 4; k++) fam.members.push(duck(0.5, 0xffe070));
    W.ducks.push(fam);
  }
}
function updateDucks(t) {
  for (const fam of W.ducks) fam.members.forEach((d, i) => {
    const a = fam.ph + t * fam.sp - i * 0.16 * Math.sign(fam.sp);
    const r = fam.r + Math.sin(t * 0.3 + fam.ph) * 0.4;
    d.position.set(fam.center.x + Math.cos(a) * r, fam.y + Math.sin(t * 3 + i) * 0.01, fam.center.z + Math.sin(a) * r);
    d.rotation.y = -a + (fam.sp > 0 ? Math.PI : 0) + Math.sin(t * 2 + i) * 0.1;
    d.userData.head.rotation.x = Math.max(0, Math.sin(t * 0.7 + i * 2)) ** 20 * 1.6; // dip for food
  });
}

// ---------- koi ----------
function buildKoi() {
  const L = ISLANDS.find(i => i.id === 'lago');
  for (let k = 0; k < 7; k++) {
    const g = new THREE.Group();
    const c = pick([0xff6a2a, 0xffffff, 0xffb020, 0xff3a3a]);
    add(g, ell(0.07, 0.05, 0.2), mat(c, { roughness: 0.3, emissive: c, emissiveIntensity: 0.15 }));
    const spot = add(g, ell(0.05, 0.03, 0.08), mat(pick([0xff3a1a, 0x111111, 0xffffff])), 0, 0.025, 0.03);
    const tail = new THREE.Group(); tail.position.z = -0.19; g.add(tail);
    const tf = add(tail, ell(0.06, 0.012, 0.07), mat(c, { transparent: true, opacity: 0.85 }), 0, 0, -0.05);
    scene.add(g);
    W.koi.push({ g, tail, c: L.c, y: L.waterLevel - 0.12, r: rr(0.8, 2.8) * L.k, sp: rr(0.3, 0.6) * (rand() < 0.5 ? 1 : -1), ph: rand() * 6 });
  }
}
function updateKoi(t) {
  for (const f of W.koi) {
    const a = f.ph + t * f.sp, r = f.r + Math.sin(t * 0.5 + f.ph) * 0.4;
    f.g.position.set(f.c.x + Math.cos(a) * r, f.y, f.c.z + Math.sin(a) * r);
    f.g.rotation.y = -a + (f.sp > 0 ? Math.PI : 0);
    f.tail.rotation.y = Math.sin(t * 8 + f.ph) * 0.5;
  }
}

// ---------- butterflies ----------
function buildButterflies() {
  const wing = new THREE.CircleGeometry(0.09, 8); wing.translate(0.09, 0, 0);
  const cols = [0xff6ad0, 0x6ad0ff, 0xffe06a, 0xffffff, 0xb08cff, 0xff9a4a];
  const spots = ISLANDS.filter(i => i.id !== 'torre');
  for (let k = 0; k < 46; k++) {
    const isl = spots[k % spots.length], c = pick(cols);
    const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    const g = new THREE.Group();
    const L = new THREE.Mesh(wing, m), R = new THREE.Mesh(wing, m); R.scale.x = -1;
    const L2 = new THREE.Mesh(wing, m), R2 = new THREE.Mesh(wing, m); L2.scale.set(0.7, 0.7, 1); R2.scale.set(-0.7, 0.7, 1); L2.position.z = R2.position.z = -0.06;
    const wl = new THREE.Group(), wr = new THREE.Group(); wl.add(L, L2); wr.add(R, R2); g.add(wl, wr);
    for (const w of [L, R, L2, R2]) w.rotation.x = -Math.PI / 2;
    g.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.1, 2, 4).rotateX(Math.PI / 2), mat(0x221a1a)));
    scene.add(g);
    const a = rand() * 6.28, r = rr(1, isl.R * 0.8);
    W.butterflies.push({ g, wl, wr, home: new THREE.Vector3(isl.c.x + Math.cos(a) * r, isl.c.y + 0.6, isl.c.z + Math.sin(a) * r), ph: rand() * 100, rate: rr(14, 20) });
  }
}
const _p = new THREE.Vector3(), _q = new THREE.Vector3();
function updateButterflies(t) {
  for (const b of W.butterflies) {
    const u = t * 0.4 + b.ph;
    _p.set(b.home.x + Math.sin(u * 1.1) * 1.6 + Math.sin(u * 2.7) * 0.4, b.home.y + 0.4 + Math.sin(u * 1.9) * 0.35 + Math.abs(Math.sin(t * 6 + b.ph)) * 0.08, b.home.z + Math.cos(u * 0.9) * 1.6 + Math.cos(u * 3.1) * 0.4);
    _q.copy(b.g.position); b.g.position.copy(_p);
    b.g.lookAt(_p.x * 2 - _q.x, _p.y, _p.z * 2 - _q.z);
    const f = Math.sin(t * b.rate + b.ph) * 1.1;
    b.wl.rotation.z = f; b.wr.rotation.z = -f;
  }
}

// ---------- dragon ----------
function buildDragon() {
  const T = ISLANDS.find(i => i.id === 'torre');
  const N = 22, segs = [];
  const scale = mat(0xc0302a, { roughness: 0.45, metalness: 0.25, flatShading: true });
  const belly = mat(0xf0c060, { roughness: 0.6 });
  const spikeM = mat(0xffd060, { metalness: 0.6, roughness: 0.3 });
  const root = new THREE.Group(); scene.add(root);
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const r = (i < 3 ? 0.45 + i * 0.12 : Math.max(0.08, 0.75 * Math.pow(1 - (t - 0.1) / 0.9, 1.3)));
    const s = new THREE.Group(); root.add(s);
    const b = add(s, new THREE.IcosahedronGeometry(1, 1), scale); b.scale.set(r, r * 0.9, Math.max(r * 1.6, 0.42));
    if (i > 2) add(s, ell(r * 0.7, r * 0.5, r * 1.3), belly, 0, -r * 0.45, 0);
    if (i > 1 && i < N - 1) { const sp = add(s, new THREE.ConeGeometry(r * 0.35, r * 0.9, 4), spikeM, 0, r * 1.05, 0); sp.rotation.x = -0.4; }
    segs.push({ s, r });
  }
  // head
  const head = segs[0].s;
  const snout = add(head, ell(0.35, 0.28, 0.6), scale, 0, -0.05, 0.55);
  const jaw = add(head, ell(0.3, 0.12, 0.5), belly, 0, -0.25, 0.45);
  for (const sx of [-1, 1]) {
    const horn = add(head, new THREE.ConeGeometry(0.1, 0.7, 6), spikeM, sx * 0.25, 0.45, -0.25); horn.rotation.set(-0.9, 0, -sx * 0.3);
    add(head, new THREE.SphereGeometry(0.09, 8, 6), mat(0xffe040, { emissive: 0xffb020, emissiveIntensity: 4 }), sx * 0.28, 0.16, 0.42);
    const nost = add(head, new THREE.SphereGeometry(0.04, 6, 4), mat(0x2a0a0a), sx * 0.12, 0.08, 1.1);
  }
  // wings on segment 4
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0); wingShape.lineTo(3.6, 0.9); wingShape.lineTo(4.4, -0.2); wingShape.quadraticCurveTo(3.4, -0.6, 3.0, -1.6);
  wingShape.quadraticCurveTo(2.2, -1.0, 1.8, -2.2); wingShape.quadraticCurveTo(1.0, -1.2, 0, -1.2); wingShape.lineTo(0, 0);
  const wingG = new THREE.ShapeGeometry(wingShape, 8); wingG.rotateX(-Math.PI / 2);
  const memb = new THREE.MeshStandardMaterial({ color: 0xe0503a, side: THREE.DoubleSide, roughness: 0.5, emissive: 0x5a0a00, emissiveIntensity: 0.4, transparent: true, opacity: 0.95 });
  const wings = [];
  for (const sx of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(sx * 0.6, 0.35, 0.2); segs[4].s.add(piv);
    const w = new THREE.Mesh(wingG, memb); w.scale.x = sx; w.castShadow = true; piv.add(w);
    const bone = add(piv, new THREE.CylinderGeometry(0.05, 0.08, 3.7, 5), spikeM, sx * 1.8, 0.02, 0.45); bone.rotation.z = Math.PI / 2; bone.rotation.y = -sx * 0.24;
    wings.push({ piv, sx });
  }
  // legs (tucked)
  for (const i of [5, 10]) for (const sx of [-1, 1]) { const l = add(segs[i].s, new THREE.CapsuleGeometry(0.1, 0.4, 2, 6), scale, sx * 0.45, -0.45, 0); l.rotation.x = 1.0;
    for (let c = -1; c <= 1; c++) add(l, new THREE.ConeGeometry(0.03, 0.12, 4), spikeM, c * 0.05, -0.3, 0.05).rotation.x = 2.6; }
  // tail tip
  const tip = add(segs[N - 1].s, new THREE.OctahedronGeometry(0.3, 0), spikeM, 0, 0, -0.3); tip.scale.set(1, 0.3, 1.6);
  W.dragon = { segs, wings, N, center: T.c.clone(), jaw, fireT: 8, head };
}
function dragonPath(u, c, out) {
  const R = 19 + Math.sin(u * 2) * 4;
  return out.set(c.x + Math.cos(u) * R, c.y + 17 + Math.sin(u * 3) * 3.5, c.z + Math.sin(u) * R);
}
const _dir = new THREE.Vector3();
function updateDragon(dt, t) {
  const d = W.dragon; if (!d) return;
  const u0 = t * 0.16;
  for (let i = 0; i < d.N; i++) {
    const u = u0 - i * 0.038;
    dragonPath(u, d.center, _p); dragonPath(u + 0.01, d.center, _q);
    const wave = Math.sin(t * 2.2 - i * 0.45) * 0.35 * Math.min(1, i / 4);
    d.segs[i].s.position.set(_p.x, _p.y + wave, _p.z);
    d.segs[i].s.lookAt(_q.x, _q.y + Math.sin(t * 2.2 - (i - 1) * 0.45) * 0.35 * Math.min(1, i / 4), _q.z);
  }
  const flap = Math.sin(t * 2.6);
  for (const w of d.wings) w.piv.rotation.z = w.sx * (flap * 0.75 + 0.1);
  // fire breath every ~12s
  d.fireT -= dt;
  const open = d.fireT < 1.4 && d.fireT > 0;
  d.jaw.rotation.x = open ? 0.35 : 0;
  if (open && W.onFire) {
    const h = d.segs[0].s; _dir.set(0, -0.15, 1).applyQuaternion(h.quaternion);
    const mouth = _p.copy(h.position).addScaledVector(_dir, 1.2);
    W.onFire(mouth, _dir);
  }
  if (d.fireT <= 0) d.fireT = rr(9, 15);
}
export function dragonHead(out) { return W.dragon ? out.copy(W.dragon.segs[0].s.position) : out.set(0, 20, 0); }
export function dragonFiring() { return W.dragon && W.dragon.fireT < 1.4 && W.dragon.fireT > 1.3; }

export function buildWildlife() { buildDucks(); buildKoi(); buildButterflies(); }
export function updateWildlife(dt, t) { updateDucks(t); updateKoi(t); updateButterflies(t); updateDragon(dt, t); }
