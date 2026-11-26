// Interiors: a cosy house, the wizard's library and a dungeon. They live far away under the
// clouds (x > 400, y = -300); doors teleport the hero with a fade.
import * as THREE from 'three';
import { scene, rand, rr, pick, inst, mat4, lanternMat } from './core.js';
import { ISLANDS, addRoom, addBox, addObstacle, gy } from './terrain.js';
import { texMat } from './textures.js';
import { mat } from './npc.js';

const Y = -300;
export const ENTRANCES = [];      // {pos, r, label, room, inside, yawIn, outside, yawOut}
export const CHESTS = [];
const lights = [];                 // per-room lights, only on while the hero is inside
const flames = [];
const floaters = [];
let current = null;

function shell(id, name, cx, cz, w, d, h, wallMat, floorMat, ceilMat) {
  const g = new THREE.Group(); scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), floorMat); floor.position.set(cx, Y, cz); floor.receiveShadow = true; g.add(floor);
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.3, d + 0.6), ceilMat ?? wallMat); ceil.position.set(cx, Y + h + 0.15, cz); ceil.castShadow = true; g.add(ceil);
  const walls = [[cx, cz - d / 2 - 0.15, w + 0.6, 0.3], [cx, cz + d / 2 + 0.15, w + 0.6, 0.3], [cx - w / 2 - 0.15, cz, 0.3, d], [cx + w / 2 + 0.15, cz, 0.3, d]];
  for (const [x, z, sx, sz] of walls) { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), wallMat); m.position.set(x, Y + h / 2, z); m.castShadow = true; m.receiveShadow = true; g.add(m); addBox(x, z, sx / 2, sz / 2, 0); }
  const room = addRoom({ id, name, x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2, y: Y, h, c: new THREE.Vector3(cx, Y, cz), R: Math.min(w, d) / 2 - 0.6, indoor: true, lights: [] });
  // exit door on the +z wall
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.3, 0.12), texMat('wood', { color: 0xa07050 })); door.position.set(cx, Y + 1.15, cz + d / 2 - 0.02); g.add(door);
  const glow = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.85, 0.5).multiplyScalar(1.6), toneMapped: false, transparent: true, opacity: 0.35 })); glow.position.set(cx, Y + 1.2, cz + d / 2 - 0.1); g.add(glow);
  room.exit = new THREE.Vector3(cx, Y, cz + d / 2 - 0.9);
  room.group = g;
  return room;
}
function light(room, color, intensity, dist, x, y, z, flicker = false) {
  const l = new THREE.PointLight(color, intensity, dist, 1.6); l.position.set(x, y, z); l.visible = false; scene.add(l);
  room.lights.push({ l, base: intensity, flicker }); return l;
}
const add = (g, geo, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// ----------------------------------------------------------------- house
function buildHouse() {
  const cx = 420, cz = 0, w = 9, d = 8, h = 3.6;
  const wood = texMat('wood', { color: 0xc89870 }, 2), wall = texMat('plaster', { color: 0xf0dcc0 }, 2), beam = texMat('wood', { color: 0x7a4e30 });
  const R = shell('casa', 'Casa de la Aldea', cx, cz, w, d, h, wall, wood, beam);
  const g = R.group, y = Y;
  for (let k = -3; k <= 3; k++) add(g, B(0.25, 0.3, d), beam, cx + k * 1.3, y + h - 0.15, cz);
  // fireplace
  const stone = texMat('brick', { color: 0xb8a8a0 });
  add(g, B(2.4, 2.6, 0.9), stone, cx, y + 1.3, cz - d / 2 + 0.45); add(g, B(1.3, 1.0, 0.04), mat(0x0a0606), cx, y + 0.5, cz - d / 2 + 0.92);
  add(g, B(2.8, 0.2, 1.1), wood, cx, y + 2.0, cz - d / 2 + 0.5); addBox(cx, cz - d / 2 + 0.6, 1.3, 0.7);
  const fire = add(g, new THREE.ConeGeometry(0.35, 0.8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.5, 0.1).multiplyScalar(3), toneMapped: false }), cx, y + 0.42, cz - d / 2 + 1.05); flames.push(fire);
  for (let k = 0; k < 3; k++) add(g, new THREE.CylinderGeometry(0.07, 0.07, 0.8, 6), wood, cx + (k - 1) * 0.2, y + 0.08, cz - d / 2 + 1.05).rotation.z = Math.PI / 2;
  light(R, 0xff9a4a, 22, 12, cx, y + 1.0, cz - d / 2 + 1.2, true);
  light(R, 0xffe0b0, 6, 14, cx, y + h - 0.6, cz + 1);
  // bed
  const bx = cx + w / 2 - 1.3, bz = cz - 1.6;
  add(g, B(1.6, 0.45, 2.4), wood, bx, y + 0.25, bz); add(g, B(1.5, 0.22, 2.2), mat(0xf4efe6), bx, y + 0.55, bz);
  add(g, B(1.52, 0.1, 1.5), mat(0x3a6ac0), bx, y + 0.68, bz + 0.35); add(g, B(0.8, 0.18, 0.45), mat(0xffffff), bx, y + 0.72, bz - 0.8);
  add(g, B(1.6, 1.0, 0.12), wood, bx, y + 0.6, bz - 1.2); addBox(bx, bz, 0.85, 1.25);
  // table, chairs, candles, bread
  const tx = cx - 1.8, tz = cz + 0.6;
  add(g, B(1.8, 0.1, 1.1), wood, tx, y + 0.8, tz); for (const [a, b] of [[-0.8, -0.45], [0.8, -0.45], [-0.8, 0.45], [0.8, 0.45]]) add(g, B(0.1, 0.8, 0.1), wood, tx + a, y + 0.4, tz + b);
  addBox(tx, tz, 0.95, 0.6);
  for (const s of [-1, 1]) { add(g, B(0.5, 0.08, 0.5), wood, tx + s * 1.3, y + 0.48, tz); add(g, B(0.5, 0.6, 0.08), wood, tx + s * 1.55, y + 0.78, tz).rotation.y = Math.PI / 2; for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) add(g, B(0.06, 0.48, 0.06), wood, tx + s * 1.3 + a, y + 0.24, tz + b); addObstacle(tx + s * 1.3, tz, 0.3); }
  for (const s of [-0.4, 0.4]) { add(g, new THREE.CylinderGeometry(0.04, 0.04, 0.22, 8), mat(0xfff4e0), tx + s, y + 0.96, tz); add(g, new THREE.SphereGeometry(0.035, 6, 4), lanternMat, tx + s, y + 1.1, tz); }
  add(g, new THREE.CapsuleGeometry(0.1, 0.25, 4, 8), mat(0xd89a4a), tx, y + 0.92, tz).rotation.z = Math.PI / 2;
  // shelves with jars
  const sx = cx - w / 2 + 0.3;
  for (let k = 0; k < 3; k++) { add(g, B(0.35, 0.06, 2.6), wood, sx, y + 0.9 + k * 0.6, cz - 1.5);
    for (let j = 0; j < 6; j++) add(g, new THREE.CylinderGeometry(0.08, 0.08, rr(0.15, 0.3), 8), mat(pick([0xc04a4a, 0x4a8ac0, 0x8ac04a, 0xe0b040, 0xb08ce0]), { roughness: 0.3, transparent: true, opacity: 0.85 }), sx + 0.02, y + 1.05 + k * 0.6, cz - 2.6 + j * 0.42); }
  addBox(sx, cz - 1.5, 0.25, 1.3);
  // rug, barrels, plant, windows
  add(g, new THREE.CircleGeometry(1.6, 24).rotateX(-Math.PI / 2), mat(0xa03a3a, { roughness: 1 }), cx + 0.3, y + 0.01, cz + 0.8);
  for (const [x, z] of [[cx + w / 2 - 0.6, cz + d / 2 - 1.8], [cx + w / 2 - 1.3, cz + d / 2 - 1.5]]) { add(g, new THREE.CylinderGeometry(0.38, 0.33, 0.9, 12), wood, x, y + 0.45, z); addObstacle(x, z, 0.4); }
  add(g, new THREE.CylinderGeometry(0.22, 0.16, 0.4, 10), mat(0xb0603a), cx - w / 2 + 0.6, y + 0.2, cz + d / 2 - 0.8); add(g, new THREE.IcosahedronGeometry(0.4, 1), mat(0x4a9a4a, { flatShading: true }), cx - w / 2 + 0.6, y + 0.75, cz + d / 2 - 0.8);
  for (const z of [cz - 1.5, cz + 1.5]) { add(g, B(0.06, 1.0, 1.0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.75, 0.5).multiplyScalar(1.3), toneMapped: false }), cx + w / 2 - 0.02, y + 1.8, z); add(g, B(0.1, 1.15, 0.08), wood, cx + w / 2 - 0.04, y + 1.8, z); }
  R.npcSpot = new THREE.Vector3(cx - 1.4, Y, cz - d / 2 + 1.6);
  return R;
}

// ----------------------------------------------------------------- tower library
function buildLibrary() {
  const cx = 470, cz = 0, w = 10, d = 10, h = 7;
  const wall = texMat('brick', { color: 0xa898c8 }, 2), floor = texMat('brick', { color: 0x7a7088 }, 3), wood = texMat('wood', { color: 0x8a5a3a });
  const R = shell('biblioteca', 'Biblioteca Astral', cx, cz, w, d, h, wall, floor);
  const g = R.group, y = Y;
  const bookCols = [0xc04a4a, 0x4a6ac0, 0x4ac06a, 0xe0b040, 0x9a5ae0, 0x3a3a3a, 0xe07a3a];
  const shelf = (x, z, ry, len) => {
    add(g, B(len, 4.2, 0.5), wood, x, y + 2.1, z, ry);
    for (let row = 0; row < 5; row++) for (let k = 0; k < len * 6; k++) {
      const off = -len / 2 + 0.12 + k / 6, bh = rr(0.25, 0.4);
      const px = x + Math.cos(ry) * off, pz = z - Math.sin(ry) * off;
      inst('book', B(0.12, 1, 0.3), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), mat4(px + Math.sin(ry) * 0.12, y + 0.35 + row * 0.82 + bh / 2, pz + Math.cos(ry) * 0.12, ry, 1, bh, 1, 0, rr(-0.08, 0.08)), new THREE.Color(pick(bookCols)), false);
    }
  };
  shelf(cx, cz - d / 2 + 0.3, 0, 8); addBox(cx, cz - d / 2 + 0.3, 4, 0.3);
  shelf(cx - w / 2 + 0.3, cz, Math.PI / 2, 7); addBox(cx - w / 2 + 0.3, cz, 0.3, 3.5);
  shelf(cx + w / 2 - 0.3, cz, -Math.PI / 2, 7); addBox(cx + w / 2 - 0.3, cz, 0.3, 3.5);
  // magic circle + pedestal + orb
  add(g, new THREE.RingGeometry(2.2, 2.35, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 0.4, 1).multiplyScalar(2.5), toneMapped: false }), cx, y + 0.02, cz);
  add(g, new THREE.RingGeometry(1.5, 1.56, 6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 0.4, 1).multiplyScalar(2.5), toneMapped: false }), cx, y + 0.02, cz);
  add(g, new THREE.CylinderGeometry(0.4, 0.55, 1.1, 8), texMat('brick', { color: 0xd0c8e0 }), cx, y + 0.55, cz); addObstacle(cx, cz, 0.6);
  const orb = add(g, new THREE.IcosahedronGeometry(0.42, 3), new THREE.MeshStandardMaterial({ color: 0xc9a0ff, emissive: 0xa060ff, emissiveIntensity: 3 }), cx, y + 1.9, cz);
  floaters.push({ o: orb, kind: 'orb', y: y + 1.9 });
  light(R, 0xb070ff, 30, 14, cx, y + 2.2, cz, true);
  for (let k = 0; k < 10; k++) {
    const book = add(g, B(0.35, 0.08, 0.26), mat(pick(bookCols)), cx, y + 2.5, cz);
    floaters.push({ o: book, kind: 'book', a: k / 10 * 6.28, r: rr(2.2, 3.4), h: rr(2.2, 5), cx, cz, y, sp: rr(0.2, 0.4) });
  }
  // potion table
  const tx = cx + 2.8, tz = cz + 2.6;
  add(g, B(1.6, 0.1, 0.8), wood, tx, y + 0.85, tz); for (const [a, b] of [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]]) add(g, B(0.08, 0.85, 0.08), wood, tx + a, y + 0.42, tz + b);
  for (let k = 0; k < 5; k++) { const c = pick([0x40ff90, 0xff40c0, 0x40c0ff, 0xffd040]); add(g, new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.5, transparent: true, opacity: 0.85 }), tx - 0.6 + k * 0.3, y + 1.02, tz + rr(-0.2, 0.2)); }
  addBox(tx, tz, 0.85, 0.45);
  R.npcSpot = new THREE.Vector3(cx - 2.8, Y, cz + 2.2);
  return R;
}

// ----------------------------------------------------------------- dungeon
function buildDungeon() {
  const cx = 520, cz = 0, w = 12, d = 28, h = 4.5;
  const wall = texMat('brick', { color: 0x6a6070 }, 3), floor = texMat('brick', { color: 0x4a4450 }, 4);
  const R = shell('mazmorra', 'Mazmorra de las Ruinas', cx, cz, w, d, h, wall, floor);
  const g = R.group, y = Y;
  for (let k = 0; k < 6; k++) for (const s of [-1, 1]) {
    const px = cx + s * 3.6, pz = cz - d / 2 + 3 + k * 4.4;
    add(g, new THREE.CylinderGeometry(0.4, 0.45, h, 8), wall, px, y + h / 2, pz); addObstacle(px, pz, 0.48);
    // wall torches
    const tx = cx + s * (w / 2 - 0.25), tz = pz;
    add(g, new THREE.CylinderGeometry(0.05, 0.03, 0.45, 5), mat(0x3a2a1a), tx, y + 2.2, tz).rotation.z = s * 0.5;
    const f = add(g, new THREE.ConeGeometry(0.12, 0.35, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.55, 0.15).multiplyScalar(3), toneMapped: false }), tx - s * 0.12, y + 2.55, tz); flames.push(f);
  }
  light(R, 0xff8a3a, 30, 16, cx, y + 3, cz + 6, true);
  light(R, 0xff7a2a, 30, 16, cx, y + 3, cz - 7, true);
  // cells with bars along the walls
  const bar = mat(0x3a3a40, { metalness: 0.7, roughness: 0.4 });
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
    const z0 = cz - d / 2 + 5 + k * 5;
    for (let b = 0; b < 8; b++) add(g, new THREE.CylinderGeometry(0.03, 0.03, h - 0.4, 5), bar, cx + s * 4.6, y + (h - 0.4) / 2, z0 + b * 0.22);
  }
  // bones & skulls
  const bone = mat(0xefe6d6);
  for (let k = 0; k < 20; k++) { const x = cx + rr(-5.4, 5.4), z = cz + rr(-d / 2 + 1, d / 2 - 2); if (Math.abs(x - cx) < 3) continue;
    add(g, new THREE.CapsuleGeometry(0.04, 0.35, 2, 5), bone, x, y + 0.05, z).rotation.set(Math.PI / 2, 0, rand() * 6);
    if (rand() < 0.4) add(g, new THREE.SphereGeometry(0.12, 8, 6), bone, x + 0.2, y + 0.11, z); }
  // treasure chest at the far end
  const chx = cx, chz = cz - d / 2 + 1.4;
  const wood = texMat('wood', { color: 0x9a6a3a }), gold = mat(0xffc040, { metalness: 0.85, roughness: 0.25, emissive: 0x4a3000 });
  const base = add(g, B(1.4, 0.7, 0.9), wood, chx, y + 0.35, chz);
  for (const s of [-0.55, 0.55]) add(g, B(0.08, 0.72, 0.92), gold, chx + s, y + 0.36, chz);
  const lid = new THREE.Group(); lid.position.set(chx, y + 0.7, chz - 0.45); g.add(lid);
  const lm = add(lid, new THREE.CylinderGeometry(0.45, 0.45, 1.4, 12, 1, false, 0, Math.PI), wood, 0, 0, 0.45); lm.rotation.z = Math.PI / 2;
  add(lid, B(0.2, 0.2, 0.06), gold, 0, -0.02, 0.92);
  const shine = add(g, new THREE.SphereGeometry(0.6, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.8, 0.3).multiplyScalar(2), toneMapped: false, transparent: true, opacity: 0 }), chx, y + 0.9, chz);
  addBox(chx, chz, 0.75, 0.5);
  CHESTS.push({ id: 'mazmorra', pos: new THREE.Vector3(chx, y, chz + 0.9), lid, shine, open: false });
  return R;
}

// ----------------------------------------------------------------- entrances
export function buildInteriors() {
  const by = Object.fromEntries(ISLANDS.map(i => [i.id, i]));
  const casa = buildHouse(), lib = buildLibrary(), dun = buildDungeon();
  // every village door leads into the cosy house
  for (const door of by.aldea.doors) {
    const out = door.clone(); const toC = Math.atan2(by.aldea.c.x - out.x, by.aldea.c.z - out.z);
    ENTRANCES.push({ pos: out, r: 1.2, label: 'Entrar a la casa', room: casa, inside: casa.exit.clone(), yawIn: 0, outside: out.clone(), yawOut: toC + Math.PI });
  }
  // tower door
  const T = by.torre, rot = Math.atan2(-T.c.x, -T.c.z);
  const td = new THREE.Vector3(T.c.x + Math.sin(rot) * 2.4, 0, T.c.z + Math.cos(rot) * 2.4);
  ENTRANCES.push({ pos: td, r: 1.3, label: 'Entrar a la Torre Astral', room: lib, inside: lib.exit.clone(), yawIn: 0, outside: td.clone(), yawOut: rot + Math.PI });
  // dungeon stairs next to the ruins altar
  const Ru = by.ruinas, sx = Ru.c.x + 2.9 * Ru.k, sz = Ru.c.z + 2.4 * Ru.k, sy = gy(Ru, 2.9 * Ru.k, 2.4 * Ru.k);
  const stairs = new THREE.Group(); stairs.position.set(sx, sy, sz); scene.add(stairs);
  const dark = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x050308 })); dark.position.y = 0.03; stairs.add(dark);
  for (let k = 0; k < 4; k++) { const st = new THREE.Mesh(B(1.6, 0.08, 0.3), texMat('brick', { color: 0x8a8398 })); st.position.set(0, 0.02 - k * 0.12, -0.6 + k * 0.3); stairs.add(st); }
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.3, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.3, 1).multiplyScalar(2.5), toneMapped: false })); ring.position.y = 0.05; stairs.add(ring);
  floaters.push({ o: ring, kind: 'pulse' });
  const sp = new THREE.Vector3(sx, 0, sz);
  ENTRANCES.push({ pos: sp, r: 1.4, label: 'Bajar a la mazmorra', room: dun, inside: dun.exit.clone(), yawIn: 0, outside: sp.clone().add(new THREE.Vector3(1.6, 0, 0)), yawOut: -Math.PI / 2 });
  return { casa, lib, dun };
}

// nearest door (outside) or exit (inside) within reach
export function nearbyDoor(p) {
  if (p.x > 300) {
    for (const e of ENTRANCES) if (e.room === current && Math.hypot(p.x - e.room.exit.x, p.z - e.room.exit.z) < 1.4) return { exit: true, e, label: 'Salir' };
    return null;
  }
  let best = null, bd = 99;
  for (const e of ENTRANCES) { const d = Math.hypot(p.x - e.pos.x, p.z - e.pos.z); if (d < e.r && d < bd) { bd = d; best = e; } }
  return best ? { exit: false, e: best, label: best.label } : null;
}
export function nearbyChest(p) { for (const c of CHESTS) if (!c.open && p.distanceTo(c.pos) < 1.6) return c; return null; }
// switch the active room's lights (changing light counts recompiles shaders, so only on transitions)
export function setCurrentRoom(room) {
  current = room;
  for (const R of [...new Set(ENTRANCES.map(e => e.room))]) for (const L of R.lights) L.l.visible = R === room;
}
export function currentRoom() { return current; }
export function updateInteriors(dt, t) {
  if (current) for (const L of current.lights) if (L.flicker) L.l.intensity = L.base * (0.85 + Math.sin(t * 11) * 0.08 + Math.sin(t * 17.3) * 0.07);
  for (const f of flames) { const k = 1 + Math.sin(t * 12 + f.position.x) * 0.12; f.scale.set(1 / k, k, 1 / k); }
  for (const f of floaters) {
    if (f.kind === 'orb') { f.o.position.y = f.y + Math.sin(t * 1.2) * 0.15; f.o.rotation.y += dt * 0.6; }
    else if (f.kind === 'book') { f.a += dt * f.sp; f.o.position.set(f.cx + Math.cos(f.a) * f.r, f.y + f.h + Math.sin(t + f.a * 3) * 0.3, f.cz + Math.sin(f.a) * f.r); f.o.rotation.set(Math.sin(t + f.a) * 0.3, -f.a, 0); }
    else if (f.kind === 'pulse') { const s = 1 + Math.sin(t * 3) * 0.08; f.o.scale.set(s, 1, s); }
  }
  for (const c of CHESTS) if (c.open) { c.lid.rotation.x = Math.max(c.lid.rotation.x - dt * 3, -1.9); c.shine.material.opacity = Math.max(0, c.shine.material.opacity - dt * 0.4); }
}
export function openChest(c) { c.open = true; c.shine.material.opacity = 0.9; }
