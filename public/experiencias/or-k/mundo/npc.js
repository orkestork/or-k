// Characters: procedural low-poly humanoids & animals, plus NPC behaviour (wander, travel
// across bridges, graze, patrol, fish) and talking.
import * as THREE from 'three';
import { scene, rand, rr, pick } from './core.js';
import { TEX } from './textures.js';
import { instantiate, play, attachToBone } from './models.js';
import { dress, visitorOutfit } from './outfits.js?v=5';
import { ISLANDS, CENTRAL, BRIDGES, groundAt, pushOut, randomPointOn, islandAt } from './terrain.js';

// ---------- material cache ----------
const matCache = new Map();
export function mat(color, o = {}) {
  const k = color + JSON.stringify(o, (key, v) => (v && v.isTexture ? v.uuid : v));
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o }));
  return matCache.get(k);
}
let woolMat = null;
const woolM = (c = 0xf6f2ea) => mat(c, { map: TEX.wool, normalMap: TEX.woolN, roughness: 1 });
const box = (w, h, d, y = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, y, 0); return g; };
const cap = (r, l, y = 0, seg = 8) => { const g = new THREE.CapsuleGeometry(r, l, 4, seg); g.translate(0, y, 0); return g; };
const ell = (rx, ry, rz, seg = 14) => { const g = new THREE.SphereGeometry(1, seg, Math.max(6, seg * 0.7 | 0)); g.scale(rx, ry, rz); return g; };
const GEO = {
  torso: (() => { const g = cap(0.16, 0.2); g.scale(1, 1, 0.75); return g; })(),
  belt: new THREE.CylinderGeometry(0.163, 0.163, 0.05, 16), buckle: box(0.06, 0.05, 0.02),
  collar: new THREE.TorusGeometry(0.085, 0.025, 6, 14),
  head: new THREE.SphereGeometry(0.17, 18, 14), nose: new THREE.SphereGeometry(0.028, 8, 6),
  eyeW: ell(0.034, 0.04, 0.02, 10), pupil: new THREE.SphereGeometry(0.019, 8, 6), shine: new THREE.SphereGeometry(0.007, 4, 3),
  brow: box(0.05, 0.012, 0.012), blush: ell(0.032, 0.02, 0.008, 8), mouth: new THREE.TorusGeometry(0.025, 0.006, 4, 10, Math.PI),
  arm: cap(0.045, 0.26, -0.17), hand: new THREE.SphereGeometry(0.048, 8, 6), leg: cap(0.055, 0.32, -0.22), shoe: ell(0.065, 0.045, 0.095, 10),
  brim: new THREE.CylinderGeometry(0.29, 0.29, 0.025, 18), cone: new THREE.ConeGeometry(0.17, 0.42, 12),
  wizCone: (() => { const g = new THREE.ConeGeometry(0.18, 0.6, 12, 4); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 0.3; p.setZ(i, p.getZ(i) - y * y * 0.35); } g.computeVertexNormals(); return g; })(),
  helmet: new THREE.SphereGeometry(0.185, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  hair: new THREE.SphereGeometry(0.178, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), bun: new THREE.SphereGeometry(0.08, 10, 8),
  tail: cap(0.05, 0.16), curl: new THREE.SphereGeometry(0.06, 8, 6),
  robe: new THREE.ConeGeometry(0.32, 0.78, 14, 1, true), pack: (() => { const g = new THREE.BoxGeometry(0.26, 0.3, 0.14, 2, 2, 2); return g; })(),
  roll: new THREE.CylinderGeometry(0.06, 0.06, 0.3, 10), crown: new THREE.CylinderGeometry(0.12, 0.14, 0.1, 8, 1, true),
  cape: (() => { const g = new THREE.PlaneGeometry(0.42, 0.66, 1, 6); g.translate(0, -0.33, 0); return g; })(),
  staff: new THREE.CylinderGeometry(0.02, 0.025, 1.3, 6), gem: new THREE.OctahedronGeometry(0.075, 0),
  rod: new THREE.CylinderGeometry(0.012, 0.018, 1.6, 4),
};
const SKIN = [0xf6d2b8, 0xe8b48e, 0xc68a62, 0x8d5a3c, 0x6a3e28, 0xffe0cc];
const SHIRTS = [0xe0504a, 0x4a8ae0, 0x5ac06a, 0xe0b04a, 0x9a5ae0, 0xe07ab0, 0x4ac0c0, 0xf4efe6, 0xff8a4a];
const PANTS = [0x3a3a5a, 0x5a3a2a, 0x2a4a6a, 0x4a4a4a, 0x6a5a3a, 0x3a5a4a];
const HAIR = [0x2a1a10, 0x6a3a1a, 0xe8c878, 0xc0502a, 0x151515, 0xdedede, 0xff8ac0, 0x5a7aff];

function addMesh(parent, geo, material, x = 0, y = 0, z = 0, cast = true) {
  const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.castShadow = cast; parent.add(m); return m;
}
function addEyes(head, r, y, z, sep, o = {}) {
  const eyes = [];
  const white = mat(0xffffff, { roughness: 0.3 }), pupil = mat(o.eye ?? 0x1a1020, o.eyeGlow ? { emissive: o.eye, emissiveIntensity: 3 } : { roughness: 0.2 });
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * sep, y, z); e.rotation.y = s * 0.32; head.add(e);
    if (!o.eyeGlow) addMesh(e, GEO.eyeW, white, 0, 0, 0, false);
    addMesh(e, GEO.pupil, pupil, 0, -0.004, 0.012, false).scale.setScalar(r);
    if (!o.eyeGlow) addMesh(e, GEO.shine, mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 1 }), 0.008, 0.01, 0.028, false);
    eyes.push(e);
  }
  return eyes;
}

// ---------- humanoid ----------
export function makeHumanoid(o = {}) {
  const s = o.scale ?? 1;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(s);
  const skinC = o.skin ?? pick(SKIN);
  const skin = mat(skinC), shirt = mat(o.shirt ?? pick(SHIRTS)), pants = mat(o.pants ?? pick(PANTS)), shoe = mat(o.shoe ?? pick([0x3a2418, 0x1a1a1a, 0x6a3a20, 0x8a1a2a]));
  const legL = new THREE.Group(), legR = new THREE.Group(); legL.position.set(-0.085, 0.5, 0); legR.position.set(0.085, 0.5, 0);
  for (const l of [legL, legR]) { addMesh(l, GEO.leg, pants); addMesh(l, GEO.shoe, shoe, 0, -0.47, 0.03); }
  body.add(legL, legR);
  const torso = addMesh(body, GEO.torso, shirt, 0, 0.78, 0);
  addMesh(body, GEO.belt, mat(0x3a2418), 0, 0.6, 0, false).scale.set(1, 1, 0.76);
  addMesh(body, GEO.buckle, mat(0xffd060, { metalness: 0.8, roughness: 0.3 }), 0, 0.6, 0.125, false);
  const col = addMesh(body, GEO.collar, mat(o.collar ?? 0xf4efe6), 0, 0.98, 0, false); col.rotation.x = Math.PI / 2;
  const armL = new THREE.Group(), armR = new THREE.Group(); armL.position.set(-0.2, 0.94, 0); armR.position.set(0.2, 0.94, 0);
  for (const a of [armL, armR]) { addMesh(a, GEO.arm, shirt); addMesh(a, GEO.hand, skin, 0, -0.36, 0, false); }
  armL.rotation.z = -0.08; armR.rotation.z = 0.08;
  body.add(armL, armR);
  const head = new THREE.Group(); head.position.set(0, 1.17, 0); body.add(head);
  addMesh(head, GEO.head, skin);
  addMesh(head, GEO.nose, mat(new THREE.Color(skinC).multiplyScalar(0.9).getHex()), 0, -0.02, 0.168, false);
  const eyes = o.eyeGlow ? addEyes(head, 1.4, 0.02, 0.14, 0.06, o) : addEyes(head, 1, 0.025, 0.148, 0.062, o);
  const hairC = mat(o.hair ?? pick(HAIR), { roughness: 0.6 });
  if (!o.eyeGlow) {
    for (const sx of [-1, 1]) { const b = addMesh(head, GEO.brow, hairC, sx * 0.062, 0.078, 0.152, false); b.rotation.z = sx * -0.12; }
    for (const sx of [-1, 1]) addMesh(head, GEO.blush, mat(0xff8a9a, { transparent: true, opacity: 0.55 }), sx * 0.1, -0.035, 0.135, false).rotation.y = sx * 0.62;
    const mo = addMesh(head, GEO.mouth, mat(0x6a2a2a), 0, -0.07, 0.158, false); mo.rotation.z = Math.PI;
  }
  const hat = o.hat ?? pick(['pelo', 'pelo', 'coleta', 'moño', 'rizos', 'paja', 'gorro']);
  const addHair = () => { const h = addMesh(head, GEO.hair, hairC, 0, 0.012, -0.012); h.rotation.x = -0.28; };
  if (['pelo', 'coleta', 'moño', 'rizos', 'corona'].includes(hat)) addHair();
  if (hat === 'coleta') { const t = addMesh(head, GEO.tail, hairC, 0, -0.02, -0.2); t.rotation.x = 0.5; addMesh(head, GEO.curl, hairC, 0, 0.08, -0.16, false).scale.setScalar(0.6); }
  if (hat === 'moño') addMesh(head, GEO.bun, hairC, 0, 0.17, -0.06);
  if (hat === 'rizos') for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; addMesh(head, GEO.curl, hairC, Math.cos(a) * 0.14, 0.08 + Math.sin(k * 2.3) * 0.03, Math.sin(a) * 0.12 - 0.03, false); }
  if (hat === 'paja') { addHair(); addMesh(head, GEO.brim, mat(0xe8c870, { roughness: 1 }), 0, 0.1, 0); addMesh(head, GEO.cone, mat(0xe8c870, { roughness: 1 }), 0, 0.23, 0).scale.set(1, 0.5, 1);
    addMesh(head, new THREE.CylinderGeometry(0.172, 0.172, 0.035, 16), mat(0xc0402a), 0, 0.14, 0, false); }
  if (hat === 'gorro') { const g = addMesh(head, GEO.helmet, mat(o.hatColor ?? pick(SHIRTS), { roughness: 1 }), 0, 0.03, 0); g.scale.set(1.0, 1.1, 1.0);
    addMesh(head, GEO.curl, mat(0xffffff, { roughness: 1 }), 0, 0.24, 0); }
  if (hat === 'mago') { addHair(); addMesh(head, GEO.brim, mat(o.hatColor ?? 0x4a2a8a), 0, 0.11, 0); addMesh(head, GEO.wizCone, mat(o.hatColor ?? 0x4a2a8a), 0, 0.41, -0.02);
    for (let k = 0; k < 3; k++) addMesh(head, GEO.gem, mat(0xffe070, { emissive: 0xffc040, emissiveIntensity: 2 }), Math.sin(k * 2.1) * 0.12, 0.28 + k * 0.1, 0.1 - k * 0.05, false).scale.setScalar(0.4); }
  if (hat === 'casco') { addMesh(head, GEO.helmet, mat(0xb0b8c8, { metalness: 0.8, roughness: 0.25 }), 0, 0.03, 0).scale.setScalar(1.08);
    addMesh(head, box(0.03, 0.12, 0.2), mat(0xe04a5a), 0, 0.22, -0.02, false); }
  if (hat === 'corona') addMesh(head, GEO.crown, mat(0xffd040, { metalness: 0.85, roughness: 0.2, emissive: 0x6a4a00, side: THREE.DoubleSide }), 0, 0.18, 0);
  if (o.robe) { const r = addMesh(body, GEO.robe, mat(o.shirt ?? 0x4a2a8a, { side: THREE.DoubleSide }), 0, 0.42, 0); r.scale.set(1, 1, 0.82); legL.visible = legR.visible = false;
    addMesh(body, new THREE.TorusGeometry(0.3, 0.02, 4, 20), mat(0xffd060, { metalness: 0.7 }), 0, 0.04, 0, false).rotation.x = Math.PI / 2; }
  if (o.pack) { addMesh(body, GEO.pack, mat(0x9a6a3a), 0, 0.8, -0.18); addMesh(body, GEO.roll, mat(0x5a8ac0), 0, 0.98, -0.18).rotation.z = Math.PI / 2; }
  let cape = null;
  if (o.cape) { cape = new THREE.Mesh(GEO.cape, mat(o.cape, { side: THREE.DoubleSide })); cape.position.set(0, 0.98, -0.13); cape.castShadow = true; body.add(cape); }
  if (o.staff) { const st = addMesh(armR, GEO.staff, mat(0x6a4a2a), 0, -0.3, 0.05); st.rotation.x = 0.15;
    addMesh(st, GEO.gem, mat(o.staffGem ?? 0x80e0ff, { emissive: o.staffGem ?? 0x80e0ff, emissiveIntensity: 3 }), 0, 0.68, 0, false); }
  if (o.rod) { const rod = addMesh(armR, GEO.rod, mat(0x6a4a2a), 0, -0.35, 0.6); rod.rotation.x = 1.15; root.userData.rod = rod; }
  return { root, body, legL, legR, armL, armR, head, torso, cape, eyes, kind: 'human', h: 1.4 * s, s };
}

// ---------- animals ----------
function quad(o) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(o.scale ?? 1);
  const legs = [];
  const pts = o.biped ? [[-1, 0], [1, 0]] : [[-1, 1], [1, 1], [-1, -1], [1, -1]];
  for (const [x, z] of pts) {
    const p = new THREE.Group(); p.position.set(x * o.lx, o.legH, z * o.lz);
    addMesh(p, cap(o.legW / 2, Math.max(0.01, o.legH - o.legW), -o.legH / 2, 6), o.legM);
    if (o.hoof) addMesh(p, ell(o.legW * 0.6, o.legW * 0.4, o.legW * 0.7, 6), o.hoof, 0, -o.legH + o.legW * 0.3, 0.01, false);
    body.add(p); legs.push(p);
  }
  const head = new THREE.Group(); head.position.set(0, o.headY, o.headZ); body.add(head);
  return { root, body, legs, head, kind: 'quad', s: o.scale ?? 1 };
}
export function makeSheep() {
  const q = quad({ lx: 0.14, lz: 0.19, legH: 0.3, legW: 0.07, legM: mat(0x2a2224), hoof: mat(0x111111), headY: 0.52, headZ: 0.36 });
  const wool = woolM(pick([0xf8f4ec, 0xf0e8dc, 0xfaf6f0, 0xd8d0c8]));
  for (let k = 0; k < 16; k++) {
    const a = k / 16 * Math.PI * 2, ring = k % 2;
    addMesh(q.body, new THREE.IcosahedronGeometry(rr(0.13, 0.17), 1), wool, Math.cos(a) * 0.16, 0.45 + Math.sin(k * 1.7) * 0.08 + ring * 0.08, Math.sin(a) * 0.22);
  }
  addMesh(q.body, ell(0.24, 0.2, 0.32), wool, 0, 0.47, 0);
  const face = mat(0x2a2224, { roughness: 0.9 });
  addMesh(q.head, ell(0.095, 0.11, 0.13), face, 0, 0, 0.04);
  addMesh(q.head, ell(0.06, 0.05, 0.05), face, 0, -0.04, 0.14);
  addMesh(q.head, new THREE.IcosahedronGeometry(0.09, 1), wool, 0, 0.09, -0.02);
  for (const s of [-1, 1]) { const e = addMesh(q.head, ell(0.07, 0.022, 0.04), face, s * 0.11, 0.02, -0.01); e.rotation.z = s * 0.4; }
  addEyes(q.head, 0.9, 0.025, 0.095, 0.055);
  q.h = 0.85; q.kind = 'sheep'; return q;
}
export function makeDeer() {
  const fur = mat(0xb0703e, { map: TEX.wool, roughness: 0.9 }), light = mat(0xf2e2cc);
  const q = quad({ lx: 0.12, lz: 0.26, legH: 0.6, legW: 0.06, legM: fur, hoof: mat(0x1a1210), headY: 1.12, headZ: 0.44 });
  const b = addMesh(q.body, cap(0.19, 0.42, 0, 10), fur, 0, 0.75, 0); b.rotation.x = Math.PI / 2;
  addMesh(q.body, ell(0.15, 0.12, 0.22), light, 0, 0.66, 0.02);
  const neck = addMesh(q.body, cap(0.07, 0.28, 0, 8), fur, 0, 0.98, 0.32); neck.rotation.x = 0.45;
  for (let k = 0; k < 10; k++) addMesh(q.body, new THREE.SphereGeometry(0.022, 6, 4), light, rr(-0.1, 0.1), 0.93, rr(-0.25, 0.2), false);
  addMesh(q.head, ell(0.09, 0.09, 0.13), fur, 0, 0, 0);
  addMesh(q.head, ell(0.055, 0.05, 0.08), fur, 0, -0.025, 0.12);
  addMesh(q.head, new THREE.SphereGeometry(0.025, 6, 4), mat(0x111111, { roughness: 0.2 }), 0, -0.01, 0.2, false);
  addEyes(q.head, 1, 0.03, 0.06, 0.07);
  for (const s of [-1, 1]) {
    const ear = addMesh(q.head, ell(0.03, 0.07, 0.015), fur, s * 0.1, 0.08, -0.04); ear.rotation.z = -s * 0.9;
    const ant = new THREE.Group(); ant.position.set(s * 0.045, 0.08, -0.02); q.head.add(ant);
    const am = mat(0xeadcc0);
    addMesh(ant, cap(0.012, 0.3, 0.15, 5), am).rotation.z = -s * 0.3;
    addMesh(ant, cap(0.01, 0.12, 0.06, 5), am, s * 0.06, 0.16, 0.02).rotation.set(0.4, 0, -s * 1.0);
    addMesh(ant, cap(0.01, 0.1, 0.05, 5), am, s * 0.08, 0.26, -0.02).rotation.set(-0.3, 0, -s * 0.7);
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.86, -0.4); q.body.add(tail);
  addMesh(tail, ell(0.05, 0.08, 0.03), light, 0, 0.02, 0);
  q.tail = tail; q.h = 1.5; q.kind = 'deer'; return q;
}
export function makeFox() {
  const fur = mat(0xe8702a, { roughness: 0.85 }), white = mat(0xfaf2e8), dark = mat(0x2a1a14);
  const q = quad({ lx: 0.08, lz: 0.15, legH: 0.2, legW: 0.05, legM: dark, headY: 0.36, headZ: 0.28 });
  const b = addMesh(q.body, cap(0.1, 0.26, 0, 10), fur, 0, 0.28, 0); b.rotation.x = Math.PI / 2;
  addMesh(q.body, ell(0.07, 0.07, 0.1), white, 0, 0.25, 0.13);
  addMesh(q.head, ell(0.1, 0.085, 0.09), fur);
  const snout = addMesh(q.head, new THREE.ConeGeometry(0.05, 0.13, 8), white, 0, -0.025, 0.11); snout.rotation.x = Math.PI / 2;
  addMesh(q.head, new THREE.SphereGeometry(0.016, 6, 4), dark, 0, -0.025, 0.18, false);
  addEyes(q.head, 0.8, 0.02, 0.07, 0.045);
  for (const s of [-1, 1]) { const e = addMesh(q.head, new THREE.ConeGeometry(0.04, 0.1, 6), fur, s * 0.055, 0.1, -0.01); e.rotation.z = -s * 0.2;
    addMesh(e, new THREE.ConeGeometry(0.02, 0.04, 6), dark, 0, 0.035, 0.005, false); }
  const tail = new THREE.Group(); tail.position.set(0, 0.3, -0.2); q.body.add(tail);
  const tm = addMesh(tail, ell(0.08, 0.08, 0.2), fur, 0, 0.04, -0.17); tm.rotation.x = 0.5;
  addMesh(tail, ell(0.055, 0.055, 0.07), white, 0, 0.12, -0.33).rotation.x = 0.5;
  q.tail = tail; q.h = 0.65; q.kind = 'fox'; return q;
}
export function makeChicken() {
  const feather = mat(pick([0xfaf6ee, 0xc8783a, 0x3a2a24, 0xe8c07a]), { roughness: 0.95 });
  const q = quad({ biped: true, lx: 0.05, lz: 0, legH: 0.12, legW: 0.022, legM: mat(0xf0b030), headY: 0.32, headZ: 0.1 });
  addMesh(q.body, ell(0.12, 0.11, 0.15), feather, 0, 0.2, 0);
  for (const s of [-1, 1]) addMesh(q.body, ell(0.02, 0.07, 0.1), feather, s * 0.11, 0.21, -0.01);
  for (let k = 0; k < 3; k++) { const t = addMesh(q.body, ell(0.025, 0.09, 0.04), feather, (k - 1) * 0.03, 0.3, -0.14); t.rotation.x = -0.6 + k * 0.1; }
  addMesh(q.head, new THREE.SphereGeometry(0.065, 10, 8), feather);
  const beak = addMesh(q.head, new THREE.ConeGeometry(0.022, 0.06, 6), mat(0xf0b030), 0, -0.005, 0.08); beak.rotation.x = Math.PI / 2;
  for (let k = 0; k < 3; k++) addMesh(q.head, new THREE.SphereGeometry(0.022, 6, 4), mat(0xe02a2a), 0, 0.065 + (k === 1 ? 0.01 : 0), -0.02 + k * 0.025, false);
  addMesh(q.head, ell(0.015, 0.03, 0.015), mat(0xe02a2a), 0, -0.05, 0.05, false);
  addEyes(q.head, 0.6, 0.015, 0.035, 0.05);
  q.h = 0.45; q.kind = 'chicken'; return q;
}
export function makeRabbit() {
  const fur = mat(pick([0xf4ece2, 0xb08a6a, 0x8a8a8a, 0xe8d8c0]), { map: TEX.wool, roughness: 1 });
  const q = quad({ lx: 0.06, lz: 0.08, legH: 0.08, legW: 0.05, legM: fur, headY: 0.26, headZ: 0.13 });
  addMesh(q.body, ell(0.11, 0.1, 0.14), fur, 0, 0.14, -0.02);
  addMesh(q.body, new THREE.SphereGeometry(0.045, 8, 6), mat(0xffffff, { roughness: 1 }), 0, 0.16, -0.16);
  addMesh(q.head, ell(0.075, 0.07, 0.08), fur);
  addMesh(q.head, new THREE.SphereGeometry(0.014, 6, 4), mat(0xff8aa0), 0, -0.01, 0.08, false);
  addEyes(q.head, 0.8, 0.015, 0.05, 0.045);
  const ears = [];
  for (const s of [-1, 1]) { const e = new THREE.Group(); e.position.set(s * 0.03, 0.05, -0.02); q.head.add(e); addMesh(e, cap(0.022, 0.13, 0.08, 6), fur).scale.set(1, 1, 0.5);
    addMesh(e, cap(0.012, 0.1, 0.08, 4), mat(0xffb0c0), 0, 0, 0.008, false).scale.set(1, 1, 0.3); e.rotation.set(-0.25, 0, -s * 0.15); ears.push(e); }
  q.ears = ears; q.h = 0.5; q.kind = 'rabbit'; return q;
}
export function makeCat() {
  const c = pick([0xe8903a, 0x5a5a62, 0x1e1e22, 0xf0e8dc]);
  const fur = mat(c, { roughness: 0.9 });
  const q = quad({ lx: 0.06, lz: 0.12, legH: 0.15, legW: 0.045, legM: fur, headY: 0.28, headZ: 0.2 });
  const b = addMesh(q.body, cap(0.08, 0.2, 0, 8), fur, 0, 0.21, 0); b.rotation.x = Math.PI / 2;
  addMesh(q.head, ell(0.085, 0.075, 0.075), fur);
  addMesh(q.head, ell(0.04, 0.03, 0.03), mat(0xfaf2e8), 0, -0.025, 0.06, false);
  addMesh(q.head, new THREE.SphereGeometry(0.012, 6, 4), mat(0xff8aa0), 0, -0.01, 0.08, false);
  addEyes(q.head, 0.85, 0.015, 0.06, 0.035, { eye: 0x60c020 });
  for (const s of [-1, 1]) addMesh(q.head, new THREE.ConeGeometry(0.03, 0.07, 4), fur, s * 0.05, 0.075, -0.005).rotation.z = -s * 0.25;
  const tail = new THREE.Group(); tail.position.set(0, 0.24, -0.15); q.body.add(tail);
  let prev = tail;
  for (let k = 0; k < 5; k++) { const seg = new THREE.Group(); seg.position.set(0, k ? 0.05 : 0, k ? -0.01 : 0); prev.add(seg); addMesh(seg, cap(0.018, 0.04, 0.03, 5), fur); seg.rotation.x = -0.25; prev = seg; }
  q.tail = tail; q.h = 0.45; q.kind = 'cat'; return q;
}
export function makeGolem() {
  const g = makeHumanoid({ skin: 0x8a94a8, shirt: 0x6a7488, pants: 0x5a6478, hat: 'none', eye: 0x40f0ff, eyeGlow: true, scale: 1.6, shoe: 0x4a5468 });
  g.torso.scale.set(1.45, 1.15, 1.45);
  g.torso.material = mat(0x8a94a8, { map: TEX.brick, normalMap: TEX.brickN, flatShading: true });
  g.head.children[0].geometry = new THREE.BoxGeometry(0.32, 0.27, 0.3);
  g.head.children[0].material = g.torso.material;
  g.head.children[1].visible = false; // no nose on a stone golem
  addMesh(g.body, new THREE.BoxGeometry(0.12, 0.12, 0.02), mat(0x40f0ff, { emissive: 0x40f0ff, emissiveIntensity: 3 }), 0, 0.8, 0.17, false);
  for (let k = 0; k < 5; k++) addMesh(g.body, new THREE.IcosahedronGeometry(0.05, 0), mat(0x4a8a3a, { flatShading: true }), rr(-0.2, 0.2), rr(0.9, 1.0), rr(-0.1, 0.1), false); // moss
  for (const a of [g.armL, g.armR]) a.scale.set(1.7, 1.15, 1.7);
  for (const l of [g.legL, g.legR]) l.scale.set(1.5, 1, 1.5);
  g.kind = 'golem'; return g;
}

// ---------- dialogue ----------
const NAMES = ['Lúa', 'Tomás', 'Inés', 'Bruno', 'Nerea', 'Sol', 'Pipo', 'Aurelio', 'Maya', 'Rocío', 'Teo', 'Iker', 'Abril', 'Mateo', 'Celeste', 'Uriel', 'Vega', 'Olmo', 'Brisa', 'Nilo', 'Alba', 'Ciro'];
const LINES = {
  aldeano: ['¡Bienvenido a Aldea Brisa!', 'El pan de la panadería sale calentito a esta hora.', 'Dicen que la ballena celeste trae buena suerte.', '¿Has tocado los cristales de la isla central? ¡Cantan!', 'Mi abuela cruzó los puentes con una cabra en brazos.', 'De noche las ventanas brillan como luciérnagas.'],
  mercader: ['¡Frutas del cielo! ¡Frescas y flotantes!', 'Tres manzanas doradas por una pluma de ballena.', 'Hoy tengo descuento para viajeros.'],
  granjero: ['Las ovejas otra vez se escaparon del corral...', 'Este año el trigo dorado viene enorme.', 'El molino nunca deja de girar, ni de noche.', 'Las nubes de abajo riegan mis cultivos.'],
  mago: ['Las runas de la torre se alinean esta noche.', 'La magia de los cristales mantiene las islas flotando.', 'Pulsa "Noche" y mira al cielo... verás la aurora.', 'El orbe de la torre guarda la memoria del cielo.'],
  druida: ['El árbol ancestral tiene mil años.', 'Los espíritus de luz solo salen para quien camina despacio.', 'Escucha... el bosque susurra tu nombre.'],
  explorador: ['Crucé los cinco puentes antes del desayuno.', 'Algún día bajaré hasta el mar de nubes.', '¡Mi mapa dice que hay una sexta isla escondida!', 'Si te caes, no pasa nada: las nubes son blanditas.'],
  nino: ['¡No me atrapas!', '¡Jijiji!', '¿Jugamos a las escondidas?', '¡Vi un pez saltar en el lago!'],
  pescador: ['Shhh... que se espantan los peces.', 'Ayer pesqué un pez que brillaba.', 'El Lago Espejo refleja las estrellas.', 'Paciencia, joven. El cielo no tiene prisa.'],
  golem: ['...BIP... GUARDIÁN ACTIVO.', '...PROTEGIENDO LA TORRE ASTRAL...', '...ESCANEANDO... AMIGO DETECTADO.'],
  viajero: ['Voy camino a {dest}.', 'Los puentes se mecen, ¡pero son seguros!', 'Llevo cartas para {dest}.', '¡Qué vista desde el puente!'],
  oveja: ['¡Beeeee!', 'Beee... (mastica pasto)', '(te mira y sigue comiendo)'],
  ciervo: ['(te observa con ojos brillantes)', '(mueve las orejas)'],
  zorro: ['(mueve la cola)', '¡Yip yip!'],
  gallina: ['¡Coc coc coc!', '¡Cocorocó!', '(picotea una semilla)'],
  gato: ['Miau.', '(ronronea)', '(te ignora con elegancia)', 'Mrrrau~'],
  conejo: ['(mueve la nariz)', '(da un saltito)'],
  perro: ['¡Guau guau!', '(mueve la cola feliz)', '(te trae un palito)'],
  vaca: ['Muuuu...', '(rumia tranquilamente)'], caballo: ['¡Hiiiii!', '(resopla)'], cerdo: ['¡Oink oink!', '(se revuelca feliz)'],
  llama: ['(te mira con desdén)', '¡Mehhh!'], lobo: ['Auuuuuu...', '(te observa con ojos sabios)'],
  guardian: ['La isla de cristal es el corazón del cielo.', 'Hay veinticinco cristales. ¿Los despertaste todos?'],
};

// ---------- NPC ----------
export const NPCS = [];
const _d = new THREE.Vector3();
export class NPC {
  constructor(model, o) {
    Object.assign(this, { speed: 1.0, behavior: 'wander', idleMin: 1.5, idleMax: 5, island: CENTRAL, role: 'aldeano' }, o);
    this.m = model; this.root = model.root;
    this.name = o.name ?? pick(NAMES);
    this.lines = LINES[this.role] ?? LINES.aldeano;
    this.path = []; this.timer = rr(0, 2); this.phase = rand() * 10; this.seed = rand() * 100;
    this.heading = rand() * Math.PI * 2; this.move = 0; this.talkT = 0; this.dest = null;
    this.pos = this.start ? this.start.clone() : randomPointOn(this.island, 0, this.maxFrac ?? 0.75, this.avoid);
    this.pos.y = this.fixedY ?? groundAt(this.pos.x, this.pos.z) ?? this.island.c.y;
    this.root.position.copy(this.pos);
    this.root.traverse(c => { if (c.isMesh) c.userData.npc = this; });
    scene.add(this.root);
    NPCS.push(this);
  }
  planNext() {
    const b = this.behavior;
    if (b === 'wander' || b === 'graze' || b === 'run' || b === 'hop') {
      const p = this.targets ? this.targets() : randomPointOn(this.island, this.minR ?? 0, this.maxFrac ?? 0.75, this.avoid);
      this.path = [p];
    } else if (b === 'patrol') {
      const n = 10; this.path = [];
      const dir = this.dirSign ?? 1, a0 = Math.atan2(this.pos.z - this.center.z, this.pos.x - this.center.x);
      for (let k = 1; k <= n; k++) { const a = a0 + dir * k / n * Math.PI * 2; this.path.push(new THREE.Vector3(this.center.x + Math.cos(a) * this.radius, 0, this.center.z + Math.sin(a) * this.radius)); }
    } else if (b === 'travel') {
      let from = islandAt(this.pos.x, this.pos.z) ?? CENTRAL; if (from.outer) from = CENTRAL;
      const inner = ISLANDS.filter(i => !i.outer);
      let to = pick([CENTRAL, ...inner]); if (to === from) to = pick(inner.filter(i => i !== from));
      this.dest = to; this.path = routeBetween(from, to, this.pos);
    }
  }
  talk(towards) {
    this.talkT = 4.5; this.path.length && (this.pausedPath = this.path); this.path = [];
    if (towards) this.faceTo = Math.atan2(towards.x - this.pos.x, towards.z - this.pos.z);
    let line = pick(this.lines);
    return line.replace('{dest}', this.dest?.name ?? 'la Aldea Brisa');
  }
  update(dt, t) {
    const m = this.m;
    // talking: stop, face listener, wave
    if (this.talkT > 0) {
      this.talkT -= dt; this.move = Math.max(0, this.move - dt * 4);
      if (this.faceTo !== undefined) this.heading = lerpAngle(this.heading, this.faceTo, dt * 6);
      if (m.armR) { m.armR.rotation.z = 2.6 + Math.sin(t * 9) * 0.35; m.armR.rotation.x = 0; }
      if (this.talkT <= 0) { if (this.pausedPath) { this.path = this.pausedPath; this.pausedPath = null; } if (m.armR) m.armR.rotation.z = 0; }
    } else if (this.behavior === 'sit') {
      this.move = 0;
      const jerk = Math.max(0, Math.sin(t * 0.6 + this.seed) - 0.93) * 12;
      if (m.armR) m.armR.rotation.x = -0.6 - jerk * 0.5;
    } else if (this.path.length) {
      const target = this.path[0];
      _d.set(target.x - this.pos.x, 0, target.z - this.pos.z);
      const dist = _d.length();
      if (dist < 0.25) { this.path.shift(); if (!this.path.length) this.timer = rr(this.idleMin, this.idleMax); }
      else {
        const want = Math.atan2(_d.x, _d.z);
        this.heading = lerpAngle(this.heading, want, dt * 5);
        this.move = Math.min(1, this.move + dt * 3);
        const sp = this.speed * this.move;
        this.pos.x += Math.sin(this.heading) * sp * dt; this.pos.z += Math.cos(this.heading) * sp * dt;
        if (!this.onBridge()) pushOut(this.pos, 0.22);
      }
    } else {
      this.move = Math.max(0, this.move - dt * 3);
      this.timer -= dt; if (this.timer <= 0) this.planNext();
    }
    // stick to ground
    const g = this.fixedY !== undefined ? this.fixedY : groundAt(this.pos.x, this.pos.z);
    if (g !== null) this.pos.y += (g - this.pos.y) * Math.min(1, dt * 12);
    else { this.pos.copy(randomPointOn(this.island)); this.pos.y = groundAt(this.pos.x, this.pos.z) ?? 0; this.path = []; }
    this.root.position.copy(this.pos);
    if (this.behavior === 'sit' && m.kind !== 'gltf') this.root.position.y -= 0.05;
    if (this.behavior === 'run' && this.move > 0.5 && m.kind !== 'gltf') this.root.position.y += Math.abs(Math.sin(this.phase)) * 0.12;
    this.root.rotation.y = this.heading;
    animate(this, dt, t);
  }
  onBridge() { return false; }   // the pavilion has no bridges: obstacles always apply
}
function lerpAngle(a, b, k) { let d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; return a + d * Math.min(1, k); }

const ACC = {
  Knight: ['1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', '1H_Sword', '2H_Sword', 'Knight_Helmet', 'Knight_Cape'],
  Barbarian: ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', '2H_Axe', 'Mug', 'Barbarian_Hat', 'Barbarian_Cape'],
  Mage: ['Spellbook', 'Spellbook_open', '1H_Wand', '2H_Staff', 'Mage_Hat', 'Mage_Cape'],
  Rogue: ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable', 'Rogue_Cape'],
};
ACC.RogueHooded = ACC.Rogue;
const PASTEL = [0xffffff, 0xffd0d0, 0xd0e0ff, 0xd8ffd0, 0xfff0c0, 0xe8d0ff, 0xffe0f0, 0xc8f0f0];
// a KayKit person: type + which accessories to show
// people are re-tailored into pavilion clothes (outfits.js); pass { outfit } to choose, or { outfit: false } to keep the original
export function person(type, show = [], o = {}) {
  const human = type in ACC, dressed = human && o.outfit !== false;
  const m = instantiate(type, { hide: ACC[type], show, tint: dressed ? undefined : (o.tint ?? (o.plain ? undefined : pick(PASTEL))), tintParts: ['Body', 'Arm', 'Leg'], scale: o.scale ?? rr(0.95, 1.05) });
  if (dressed) dress(m, type, o.outfit ?? visitorOutfit());
  return m;
}
function animateGltf(n, dt, t) {
  const m = n.m; let key = 'idle', ts = 1;
  if (n.talkT > 0) key = (n.role === 'nino' && m.A.cheer) ? 'cheer' : (m.A.talk ? 'talk' : 'idle');
  else if (n.behavior === 'sit') key = n.chair && m.A.sitChair ? 'sitChair' : m.A.sit ? 'sit' : 'idle';
  else if (n.move > 0.15) {
    const run = n.speed > 1.9;
    key = run && m.A.run ? 'run' : 'walk';
    ts = THREE.MathUtils.clamp(n.speed / (run ? 3.0 : 1.2) / (m.s || 1), 0.6, 1.7) * (m.speedRef || 1);
  } else if (n.caster && Math.sin(t * 0.25 + n.seed) > 0.8 && m.A.cast) key = 'cast';
  play(m, key, 0.3, ts);
  m.mixer.update(dt);
  // animals without a walk clip: gentle waddle so they don't glide
  if (key === 'walk' && !m.A.walk) { n.phase += dt * 9; m.inner.rotation.z = Math.sin(n.phase) * 0.06; m.inner.position.y = m.baseY + Math.abs(Math.sin(n.phase)) * 0.05; }
  else if (m.baseY !== undefined) { m.inner.rotation.z *= 0.9; m.inner.position.y = m.baseY; }
}
function animate(n, dt, t) {
  if (n.m.kind === 'gltf') return animateGltf(n, dt, t);
  const m = n.m, mv = n.move;
  n.phase += dt * (3 + n.speed * 5) * Math.max(mv, 0.0001);
  const sw = Math.sin(n.phase);
  // blinking
  if (m.eyes) {
    n.blink = (n.blink ?? rr(1, 5)) - dt;
    const closed = n.blink < 0.12 && n.blink > 0;
    for (const e of m.eyes) e.scale.y = closed ? 0.1 : 1;
    if (n.blink <= 0) n.blink = rr(2, 6);
  }
  if (m.kind === 'human' || m.kind === 'golem') {
    const amp = m.kind === 'golem' ? 0.45 : 0.75;
    if (n.behavior === 'sit') { m.legL.rotation.x = m.legR.rotation.x = -1.45; m.body.position.y = -0.5 * m.s; }
    else { m.legL.rotation.x = sw * amp * mv; m.legR.rotation.x = -sw * amp * mv; m.body.position.y = Math.abs(Math.cos(n.phase)) * 0.05 * mv; }
    if (n.talkT <= 0 && n.behavior !== 'sit') { m.armL.rotation.x = -sw * amp * 0.8 * mv; m.armR.rotation.x = sw * amp * 0.8 * mv; m.armR.rotation.z = 0.08; }
    m.armL.rotation.z = -0.08 - (1 - mv) * Math.sin(t * 1.5 + n.seed) * 0.03;
    m.head.rotation.y = (1 - mv) * Math.sin(t * 0.5 + n.seed) * 0.6;
    m.head.rotation.z = Math.sin(n.phase) * 0.04 * mv;
    m.torso.scale.y = (m.kind === 'golem' ? 1.15 : 1) * (1 + Math.sin(t * 2 + n.seed) * 0.015);
    if (m.cape) m.cape.rotation.x = 0.15 + mv * 0.45 + Math.sin(t * 3 + n.seed) * 0.05;
    return;
  }
  const legs = m.legs, amp = m.kind === 'chicken' ? 0.9 : 0.6;
  if (legs.length === 2) { legs[0].rotation.x = sw * amp * mv; legs[1].rotation.x = -sw * amp * mv; }
  else if (m.kind === 'rabbit') { // hop: legs together
    const hop = Math.sin(n.phase * 0.7);
    legs[0].rotation.x = legs[1].rotation.x = -hop * 0.8 * mv; legs[2].rotation.x = legs[3].rotation.x = hop * 0.9 * mv;
  } else {
    legs[0].rotation.x = sw * amp * mv; legs[3].rotation.x = sw * amp * mv;
    legs[1].rotation.x = -sw * amp * mv; legs[2].rotation.x = -sw * amp * mv;
  }
  m.body.position.y = m.kind === 'rabbit' ? Math.abs(Math.sin(n.phase * 0.7)) * 0.22 * mv : Math.abs(Math.cos(n.phase)) * 0.03 * mv;
  if (m.kind === 'chicken') m.body.rotation.x = Math.sin(n.phase) * 0.06 * mv;
  const graze = (n.behavior === 'graze') && mv < 0.1 && n.talkT <= 0 ? 1 : 0;
  n.graze = (n.graze ?? 0) + (graze - (n.graze ?? 0)) * Math.min(1, dt * 2);
  const peck = m.kind === 'chicken' ? Math.max(0, Math.sin(t * 9 + n.seed)) ** 4 * 1.2 : Math.sin(t * 6 + n.seed) * 0.05;
  m.head.rotation.x = n.graze * (m.kind === 'chicken' ? 0.3 : 0.9) + peck * n.graze;
  m.head.rotation.y = (1 - mv) * (1 - n.graze) * Math.sin(t * 0.7 + n.seed) * 0.5;
  if (m.tail) {
    if (m.kind === 'cat') { let seg = m.tail, k = 0; while (seg.children.length > 1 || (seg.children[0] && seg.children[0].isGroup)) { seg.rotation.x = -0.3 + Math.sin(t * 2 + k * 0.7 + n.seed) * 0.15; seg.rotation.z = Math.sin(t * 1.3 + k) * 0.12; seg = seg.children.find(c => c.isGroup); if (!seg) break; k++; } }
    else if (m.kind === 'deer') m.tail.rotation.x = Math.max(0, Math.sin(t * 3 + n.seed)) ** 8 * -0.8;
    else m.tail.rotation.y = Math.sin(t * 4 + n.seed) * 0.5;
  }
  if (m.ears) m.ears.forEach((e, i) => { e.rotation.x = -0.25 + Math.max(0, Math.sin(t * 2.3 + i + n.seed)) ** 10 * 0.6; });
}

// ---------- routing across bridges ----------
function bridgeOf(isl) { return BRIDGES.find(b => b.isl === isl && b.center); }
function routeBetween(from, to, pos) {
  const path = [];
  const ringPt = (a, r) => new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
  let angIn;
  if (from !== CENTRAL) {
    const b = bridgeOf(from);
    const inner = b.b.clone().addScaledVector(b.dir, 1.2);
    path.push(inner.clone().setY(0), b.b.clone().setY(0), b.a.clone().setY(0));
    angIn = Math.atan2(b.a.z, b.a.x);
  } else angIn = Math.atan2(pos.z, pos.x);
  let angOut;
  if (to !== CENTRAL) angOut = Math.atan2(bridgeOf(to).a.z, bridgeOf(to).a.x);
  else angOut = rand() * Math.PI * 2;
  // walk around the crystal on a ring
  const RR = 3.5 * CENTRAL.k;
  path.push(ringPt(angIn, RR));
  let d = ((angOut - angIn + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const steps = Math.ceil(Math.abs(d) / 0.35);
  for (let k = 1; k <= steps; k++) path.push(ringPt(angIn + d * k / steps, RR));
  if (to !== CENTRAL) {
    const b = bridgeOf(to);
    path.push(b.a.clone().setY(0), b.b.clone().setY(0), b.b.clone().addScaledVector(b.dir, 1.2).setY(0));
    path.push(randomPointOn(to, 1.5, 0.7));
  }
  return path;
}

// ---------- population ----------
export function populate() {
  const by = Object.fromEntries(ISLANDS.map(i => [i.id, i]));
  const A = by.aldea, Mo = by.molino, B = by.bosque, L = by.lago, T = by.torre;
  const villager = () => pick([
    () => person('Barbarian', rand() < 0.3 ? ['Mug'] : []),
    () => person('Rogue', []),
    () => person('Knight', []),
    () => person('Mage', rand() < 0.5 ? ['Spellbook'] : []),
    () => person('Barbarian', ['Barbarian_Hat']),
  ])();
  // village
  for (let i = 0; i < 12; i++) new NPC(villager(), {
    island: A, role: 'aldeano', speed: rr(0.9, 1.2), targets: () => pick([...A.doors, randomPointOn(A, 1.2, 0.55)]).clone() });
  for (let i = 0; i < 3; i++) new NPC(person(pick(['Rogue', 'Mage', 'Knight']), [], { scale: rr(0.6, 0.7) }), { island: A, role: 'nino', behavior: 'run', speed: rr(2.2, 2.8), idleMin: 0.3, idleMax: 1.5, maxFrac: 0.6 });
  const stallA = A.entryAng + 0.9;
  new NPC(person('Barbarian', ['Mug', 'Barbarian_Hat'], { tint: 0xffe0b0 }), { island: A, role: 'mercader', behavior: 'stand', name: 'Don Bartolo',
    start: new THREE.Vector3(A.c.x + Math.cos(stallA) * 3.6 * A.k, 0, A.c.z + Math.sin(stallA) * 3.6 * A.k) });
  for (let i = 0; i < 3; i++) new NPC(instantiate('Cat', { tint: pick([0x3a3a40, 0xe0903a, 0x8a8a90, 0xf0e8e0]) }), { island: A, role: 'gato', speed: 0.7, idleMin: 3, idleMax: 9, name: pick(['Michi', 'Bigotes', 'Luna', 'Canela']), maxFrac: 0.8 });
  new NPC(instantiate('Dog'), { island: A, role: 'perro', speed: 1.4, idleMin: 1, idleMax: 4, name: 'Toby' });
  new NPC(instantiate('Pug'), { island: A, role: 'perro', speed: 1.1, idleMin: 1, idleMax: 5, name: 'Pancho' });
  for (let i = 0; i < 2; i++) new NPC(makeRabbit(), { island: A, role: 'conejo', behavior: 'hop', speed: 1.6, idleMin: 1, idleMax: 4, name: 'Conejo', minR: 6.5 * A.k, maxFrac: 0.85 });
  // farm
  const farmAvoid = (x, z) => Mo.inField(x, z);
  for (let i = 0; i < 2; i++) new NPC(person('Barbarian', ['Barbarian_Hat'], { tint: pick([0xd0e0ff, 0xffd0d0]) }), { island: Mo, role: 'granjero', speed: 1.0,
    targets: () => { const f = pick(Mo.fields); return new THREE.Vector3(f.wx + rr(-f.w / 2, f.w / 2), 0, f.wz + f.d / 2 + 0.4); } });
  for (let i = 0; i < 3; i++) new NPC(instantiate('Cow'), { island: Mo, role: 'vaca', behavior: 'graze', speed: 0.5, idleMin: 4, idleMax: 10, name: 'Vaca', avoid: farmAvoid });
  for (let i = 0; i < 2; i++) new NPC(instantiate('Horse'), { island: Mo, role: 'caballo', behavior: 'graze', speed: 0.8, idleMin: 3, idleMax: 8, name: pick(['Rayo', 'Canela']), avoid: farmAvoid });
  for (let i = 0; i < 3; i++) new NPC(instantiate('Pig'), { island: Mo, role: 'cerdo', behavior: 'graze', speed: 0.5, idleMin: 2, idleMax: 6, name: 'Cerdito', avoid: farmAvoid });
  new NPC(instantiate('Llama'), { island: Mo, role: 'llama', behavior: 'graze', speed: 0.5, idleMin: 3, idleMax: 8, name: 'Llama Lola', avoid: farmAvoid });
  for (let i = 0; i < 5; i++) new NPC(instantiate('Sheep'), { island: Mo, role: 'oveja', behavior: 'graze', speed: 0.45, idleMin: 3, idleMax: 9, name: 'Oveja', avoid: farmAvoid });
  for (let i = 0; i < 8; i++) new NPC(makeChicken(), { island: Mo, role: 'gallina', behavior: 'graze', speed: 1.1, idleMin: 1, idleMax: 3.5, name: 'Gallina', avoid: farmAvoid });
  // forest
  for (let i = 0; i < 5; i++) new NPC(makeRabbit(), { island: B, role: 'conejo', behavior: 'hop', speed: 1.6, idleMin: 1, idleMax: 4, name: 'Conejo', minR: 2 });
  for (let i = 0; i < 4; i++) new NPC(makeDeer(), { island: B, role: 'ciervo', behavior: 'graze', speed: 0.9, idleMin: 3, idleMax: 8, name: 'Ciervo', minR: 2 });
  for (let i = 0; i < 3; i++) new NPC(makeFox(), { island: B, role: 'zorro', behavior: 'run', speed: 2.0, idleMin: 1, idleMax: 4, name: 'Zorro', minR: 2 });
  for (let i = 0; i < 2; i++) new NPC(instantiate('Wolf'), { island: B, role: 'lobo', speed: 1.1, idleMin: 2, idleMax: 6, name: 'Lobo Blanco', minR: 2.5 });
  new NPC(person('Mage', ['1H_Wand', 'Mage_Hat', 'Mage_Cape'], { tint: 0xa0f0b0 }), { island: B, role: 'druida', name: 'Druida Olmo', speed: 0.7, minR: 2, caster: true });
  // lake
  const fisher = person('Barbarian', ['Barbarian_Hat'], { tint: 0xd0ffd0 });
  const rod = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 1.8, 5), mat(0x6a4a2a)); pole.position.y = 0.9; rod.add(pole);
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 1.5, 3), mat(0xeeeeee)); line.position.set(0, 1.8, 0.0); line.rotation.x = 0; rod.add(line);
  rod.rotation.x = 1.0;
  attachToBone(fisher, 'handslot.r', rod);
  const fisherNpc = new NPC(fisher, { island: L, role: 'pescador', behavior: 'sit', name: 'Abuelo Nilo', start: L.dockEnd.clone(), fixedY: L.dockEnd.y - 0.02 });
  fisherNpc.heading = L.dockDir + Math.PI;
  for (let i = 0; i < 4; i++) new NPC(villager(), { island: L, role: 'aldeano', minR: 4.4 * L.k, maxFrac: 0.85 });
  for (let i = 0; i < 3; i++) new NPC(makeRabbit(), { island: L, role: 'conejo', behavior: 'hop', speed: 1.5, idleMin: 1, idleMax: 5, name: 'Conejo', minR: 4.5 * L.k, maxFrac: 0.85 });
  // tower
  for (let i = 0; i < 2; i++) new NPC(makeGolem(), { island: T, role: 'golem', behavior: 'patrol', name: 'Gólem ' + (i + 1), speed: 0.8, center: T.c, radius: (4.4 + i * 0.9) * T.k, dirSign: i ? -1 : 1, idleMin: 0.5, idleMax: 1 });
  for (let i = 0; i < 2; i++) new NPC(person('Mage', ['2H_Staff', 'Mage_Hat', 'Mage_Cape'], { plain: i === 0, tint: i ? 0xc0b0ff : undefined }),
    { island: T, role: 'mago', name: ['Maga Celeste', 'Archimago Ciro'][i], speed: 0.7, minR: 2.6, maxFrac: 0.8, caster: true });
  // centre
  new NPC(person('Knight', ['Knight_Helmet', 'Knight_Cape', '1H_Sword', 'Round_Shield'], { plain: true }), { island: CENTRAL, role: 'guardian', behavior: 'patrol', name: 'Guardiana Vega', center: new THREE.Vector3(), radius: 3.4 * CENTRAL.k, speed: 0.9, idleMin: 2, idleMax: 4 });
  // travellers crossing bridges
  const travellers = [
    () => person('RogueHooded', ['Rogue_Cape', '1H_Crossbow']), () => person('Rogue', ['Rogue_Cape', 'Knife']),
    () => person('Knight', ['Knight_Cape', '1H_Sword', 'Badge_Shield']), () => person('Barbarian', ['Barbarian_Cape', '2H_Axe', 'Barbarian_Hat']),
    () => person('Mage', ['Mage_Hat', 'Spellbook_open', 'Mage_Cape']),
  ];
  for (let i = 0; i < 10; i++) {
    const home = pick(ISLANDS.filter(i => !i.outer));
    new NPC(travellers[i % travellers.length](), { island: home, role: rand() < 0.5 ? 'viajero' : 'explorador', behavior: 'travel', speed: rr(1.2, 1.6), idleMin: 2, idleMax: 6, maxFrac: 0.6 });
  }
}
