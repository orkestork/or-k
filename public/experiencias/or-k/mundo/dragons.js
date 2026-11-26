// Rideable dragons: a segmented body that follows its head's trail, wings that flap with
// speed, a resting behaviour around the nests and a player-controlled flight mode.
import * as THREE from 'three';
import { scene, rand, rr } from './core.js';
import { mat } from './npc.js';

const PALETTES = [
  { name: 'Nova',  body: 0xc0302a, belly: 0xf0c060, wing: 0xe0503a, horn: 0xffd060, eye: 0xffe040 },
  { name: 'Órbita', body: 0x2a5ac8, belly: 0xa0e0ff, wing: 0x3a8aff, horn: 0xe0f0ff, eye: 0x80ffff },
  { name: 'Nébula', body: 0x2a9a5a, belly: 0xe0f0a0, wing: 0x40c080, horn: 0xffe8a0, eye: 0xb0ff60 },
];
export const DRAGONS = [];

function buildBody(scale = 1) {
  const N = 8;
  const segs = Array.from({ length: N }, () => {
    const s = new THREE.Group();
    scene.add(s);
    return { s };
  });
  const body = new THREE.Group();
  body.scale.setScalar(scale);
  segs[4].s.add(body);
  const ink = mat(0x100d19, { roughness: 0.4 });
  const white = mat(0xf2eee7, { roughness: 0.5 });
  const violet = mat(0x7c3cff, { emissive: 0x4820a0, emissiveIntensity: 0.55 });

  const ellipsoid = (parent, material, size, position) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material);
    mesh.scale.set(...size);
    mesh.position.set(...position);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const fin = (shape, horizontal = false) => {
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.09, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.055, bevelSegments: 2,
    });
    geometry.translate(0, 0, -0.045);
    if (horizontal) geometry.rotateX(-Math.PI / 2);
    return new THREE.Mesh(geometry, ink);
  };

  ellipsoid(body, ink, [0.88, 0.84, 2.35], [0, -0.08, 0.45]);
  ellipsoid(body, white, [0.69, 0.46, 1.91], [0, -0.49, 0.57]);
  ellipsoid(body, ink, [0.72, 0.65, 0.98], [0, -0.14, 1.96]);
  ellipsoid(body, white, [0.6, 0.28, 0.89], [0, -0.57, 1.97]);
  ellipsoid(body, ink, [0.34, 0.28, 1.08], [0, -0.05, -1.97]);
  ellipsoid(body, violet, [0.39, 0.08, 0.44], [0, 0.73, 0.25]);

  const dorsal = new THREE.Shape();
  dorsal.moveTo(0, 0);
  dorsal.quadraticCurveTo(-0.2, 1.2, -0.94, 1.53);
  dorsal.quadraticCurveTo(-0.62, 0.6, -1.38, 0);
  dorsal.closePath();
  const dorsalFin = fin(dorsal);
  dorsalFin.rotation.y = -Math.PI / 2;
  dorsalFin.position.set(0, 0.57, -0.33);
  body.add(dorsalFin);

  const flipper = new THREE.Shape();
  flipper.moveTo(0, 0);
  flipper.quadraticCurveTo(0.96, -0.08, 1.52, -0.83);
  flipper.quadraticCurveTo(0.76, -0.97, 0, -0.6);
  flipper.closePath();
  const fluke = new THREE.Shape();
  fluke.moveTo(0, 0);
  fluke.quadraticCurveTo(0.82, 0.35, 1.46, -0.22);
  fluke.quadraticCurveTo(0.61, -0.42, 0, -0.52);
  fluke.closePath();

  const wings = [];
  for (const sx of [-1, 1]) {
    ellipsoid(body, white, [0.095, 0.23, 0.47], [sx * 0.69, 0.24, 1.41]);
    ellipsoid(body, ink, [0.05, 0.063, 0.074], [sx * 0.69, 0.14, 1.94]);
    const piv = new THREE.Group();
    piv.position.set(sx * 0.68, -0.34, 0.72);
    const pectoral = fin(flipper, true);
    pectoral.scale.x = sx;
    piv.add(pectoral);
    body.add(piv);
    wings.push({ piv, sx });
    const tail = fin(fluke, true);
    tail.position.set(0, -0.08, -2.8);
    tail.scale.x = sx;
    body.add(tail);
  }
  return { segs, wings, N, spacing: 0.62 * scale, scale };
}

class Dragon {
  constructor(palette, home, scale = 1) {
    Object.assign(this, buildBody(scale));
    this.name = palette.name; this.home = home.clone(); this.palette = palette;
    this.head = new THREE.Vector3(home.x + 3, home.y + 3, home.z);
    this.dir = new THREE.Vector3(1, 0, 0); this.speed = 0; this.flap = rand() * 6;
    this.trail = []; for (let k = 0; k < 200; k++) this.trail.push(this.head.clone().addScaledVector(this.dir, -k * 0.2));
    this.state = 'rest'; this.restA = rand() * 6.28; this.fireT = 0;
    DRAGONS.push(this);
  }
  // keep a trail of head positions; segments are laid along it
  layout(t) {
    const last = this.trail[0];
    if (last.distanceToSquared(this.head) > 0.0025) { this.trail.unshift(this.head.clone()); if (this.trail.length > 400) this.trail.pop(); }
    let seg = 0, acc = 0, prev = this.head;
    const place = (i, p, q) => { const s = this.segs[i].s; s.position.copy(p); s.lookAt(q); };
    this.segs[0].s.position.copy(this.head); this.segs[0].s.lookAt(_q.copy(this.head).add(this.dir));
    seg = 1;
    for (let k = 0; k < this.trail.length && seg < this.N; k++) {
      const p = this.trail[k], d = prev.distanceTo(p);
      if (acc + d >= this.spacing) {
        const f = (this.spacing - acc) / Math.max(d, 1e-5);
        const pos = _p.copy(prev).lerp(p, f);
        place(seg, pos, prev === this.head ? this.head : this.segs[seg - 1].s.position);
        prev = this.segs[seg].s.position; acc = 0; seg++; k--; continue;
      }
      acc += d; prev = p;
    }
    for (; seg < this.N; seg++) place(seg, _p.copy(this.segs[seg - 1].s.position).addScaledVector(this.dir, -this.spacing), this.segs[seg - 1].s.position);
    // wings
    this.flap += (0.8 + Math.min(this.speed, 30) * 0.08) * 0.05 * 60 * this._dt;
    const amp = this.state === 'glide' ? 0.15 : 0.75;
    for (const w of this.wings) w.piv.rotation.z = w.sx * (Math.sin(this.flap) * amp * 0.32 + 0.15);
  }
  update(dt, t) {
    this._dt = dt;
    if (this.state === 'rest') {           // lazy circles above the nest
      this.restA += dt * 0.35;
      const target = _t.set(this.home.x + Math.cos(this.restA) * 6, this.home.y + 4 + Math.sin(t * 0.6 + this.restA) * 1.2, this.home.z + Math.sin(this.restA) * 6);
      const want = target.sub(this.head).normalize();
      this.dir.lerp(want, Math.min(1, dt * 2)).normalize();
      this.speed = 4; this.head.addScaledVector(this.dir, this.speed * dt);
    } else if (this.state === 'return') {
      const to = _t.copy(this.home).add(_v.set(0, 5, 0)).sub(this.head); const d = to.length();
      this.dir.lerp(to.normalize(), Math.min(1, dt * 1.5)).normalize(); this.speed = 14;
      this.head.addScaledVector(this.dir, this.speed * dt);
      if (d < 4) this.state = 'rest';
    }
    if (this.fireT > 0) this.fireT -= dt;
    this.layout(t);
  }
  seat(out) { const s = this.segs[4].s; return out.copy(s.position).add(_v.set(0, 0.7 * this.scale, 0).applyQuaternion(s.quaternion)); }
  seatQuat() { return this.segs[4].s.quaternion; }
}
const _p = new THREE.Vector3(), _q = new THREE.Vector3(), _t = new THREE.Vector3(), _v = new THREE.Vector3();

export function buildDragons(nido) {
  nido.nests.forEach((n, i) => new Dragon(PALETTES[i % PALETTES.length], n, 1.15));
}
export function updateDragons(dt, t) { for (const d of DRAGONS) if (d.state !== 'ridden' && !d.pet) d.update(dt, t); }

// ---------- baby dragon pet ----------
export let PET = null;
const PET_PAL = { name: 'Chispa', body: 0xff8a2a, belly: 0xfff0a0, wing: 0xffb040, horn: 0xffffff, eye: 0x60ffff };
export function spawnPet(at) {
  if (PET) return PET;
  PET = new Dragon(PET_PAL, at, 0.32); PET.pet = true; PET.state = 'pet'; PET.cool = 0; PET.orbit = 0;
  PET.head.copy(at).add(new THREE.Vector3(0, 2, 0));
  for (const p of PET.trail) p.copy(PET.head);
  return PET;
}
// follow the hero, hover near enemies and spit small fireballs at them
export function updatePet(dt, t, heroPos, enemies, fire) {
  const d = PET; if (!d) return;
  d._dt = dt; d.orbit += dt * 0.9; d.cool -= dt;
  let target = null, td = 10;
  for (const e of enemies) { if (!e.alive) continue; const dd = e.pos.distanceTo(heroPos); if (dd < td) { td = dd; target = e; } }
  const goal = _t.copy(heroPos);
  if (target) goal.lerp(target.pos, 0.55).add(_v.set(Math.cos(d.orbit * 2) * 1.5, 2.4, Math.sin(d.orbit * 2) * 1.5));
  else goal.add(_v.set(Math.cos(d.orbit) * 1.6, 2.1 + Math.sin(t * 2) * 0.25, Math.sin(d.orbit) * 1.6));
  const to = _p.copy(goal).sub(d.head), dist = to.length();
  if (dist > 40) { d.head.copy(goal); for (const p of d.trail) p.copy(goal); }       // teleported with the hero
  const sp = Math.min(14, 2 + dist * 2.2);
  d.dir.lerp(to.normalize(), Math.min(1, dt * 4)).normalize(); d.speed = sp;
  d.head.addScaledVector(d.dir, Math.min(dist, sp * dt));
  if (target && d.cool <= 0 && td < 9) {
    d.cool = 1.4; d.fireT = 0.35;
    const aim = _q.copy(target.pos).add(_v.set(0, 0.8, 0)).sub(d.head).normalize();
    d.dir.copy(aim); fire(d.head.clone(), aim.clone(), target);
  }
  if (d.fireT > 0) d.fireT -= dt;
  d.layout(t);
}
export function nearestDragon(p, maxD = 6) {
  let best = null, bd = maxD;
  for (const d of DRAGONS) { if (d.state === 'ridden' || d.pet) continue; for (const s of d.segs.slice(0, 8)) { const dd = s.s.position.distanceTo(p); if (dd < bd) { bd = dd; best = d; } } }
  return best;
}
export { Dragon };
