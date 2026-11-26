// Combat: player stats, enemies with simple AI, projectiles, damage numbers and health bars.
import * as THREE from 'three';
import { scene, camera, rand, rr, pick } from './core.js';
import { OUTER, groundAt, pushOut, randomPointOn, islandAt } from './terrain.js';
import { instantiate, play, oneShot, tickModel, borrowProp } from './models.js';

export const STATS = { hp: 100, maxHp: 100, level: 1, xp: 0, gold: 0, dmg: 22, alive: true, invuln: 0, dmgBonus: 0, armor: 0, block: 0.25, speed: 1 };
export const xpNeeded = () => 80 + STATS.level * 60;
export const ENEMIES = [];
const hooks = { onKill: null, onPlayerHit: null, onLevel: null, burst: null, toast: null, sound: null };
export function combatHooks(h) { Object.assign(hooks, h); }

// ---------- floating damage numbers & bars (DOM) ----------
const layer = document.createElement('div'); layer.id = 'dmgLayer';
Object.assign(layer.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: 7 });
document.body.appendChild(layer);
const floats = [];
export function floatText(pos, text, color = '#fff', size = 22) {
  const el = document.createElement('div'); el.textContent = text;
  Object.assign(el.style, { position: 'absolute', left: 0, top: 0, font: `800 ${size}px Inter, sans-serif`, color, textShadow: '0 2px 6px rgba(0,0,0,.7)', whiteSpace: 'nowrap' });
  layer.appendChild(el); floats.push({ el, p: pos.clone(), t: 0, vx: rr(-0.6, 0.6) });
}
const _s = new THREE.Vector3();
function project(p, el, dx = 0, dy = 0) {
  _s.copy(p).project(camera);
  if (_s.z > 1) { el.style.display = 'none'; return false; }
  el.style.display = 'block';
  el.style.transform = `translate(-50%,-50%) translate(${(_s.x + 1) / 2 * innerWidth + dx}px, ${(1 - _s.y) / 2 * innerHeight + dy}px)`;
  return true;
}
function makeBar(boss) {
  const el = document.createElement('div');
  Object.assign(el.style, { position: 'absolute', left: 0, top: 0, width: boss ? '90px' : '54px', height: '6px', borderRadius: '4px', background: 'rgba(0,0,0,.55)', border: '1px solid rgba(255,255,255,.35)', display: 'none', overflow: 'hidden' });
  const f = document.createElement('div'); Object.assign(f.style, { height: '100%', width: '100%', background: boss ? 'linear-gradient(90deg,#ff7a1a,#ffd040)' : 'linear-gradient(90deg,#ff3a4a,#ff8a6a)' });
  el.appendChild(f); layer.appendChild(el); return { el, f };
}

// ---------- enemy kinds ----------
const KINDS = {
  minion:  { model: 'SkMinion',  name: 'Esqueleto',          hp: 45,  dmg: 8,  speed: 2.2, range: 1.4, aggro: 9,  xp: 25, gold: [3, 8],   tag: 'skeleton', props: [['Knight', '1H_Sword']] },
  rogue:   { model: 'SkRogue',   name: 'Esqueleto Pícaro',   hp: 55,  dmg: 10, speed: 2.8, range: 1.4, aggro: 10, xp: 35, gold: [5, 12],  tag: 'skeleton', props: [['Rogue', 'Knife'], ['Rogue', 'Knife_Offhand']] },
  warrior: { model: 'SkWarrior', name: 'Esqueleto Guerrero', hp: 95,  dmg: 14, speed: 2.0, range: 1.6, aggro: 9,  xp: 50, gold: [8, 18],  tag: 'skeleton', props: [['Barbarian', '1H_Axe'], ['Knight', 'Round_Shield']] },
  mage:    { model: 'SkMage',    name: 'Esqueleto Hechicero', hp: 50, dmg: 12, speed: 1.8, range: 9,   aggro: 13, xp: 45, gold: [6, 14],  tag: 'skeleton', ranged: true, props: [['Mage', '2H_Staff']] },
  icewolf: { model: 'Wolf',      name: 'Lobo de Hielo',      hp: 55,  dmg: 11, speed: 3.4, range: 1.5, aggro: 11, xp: 35, gold: [4, 10],  tag: 'icewolf', tint: 0x9fd8ff, animal: true },
  magma:   { model: 'SkMinion',  name: 'Esqueleto de Magma', hp: 70,  dmg: 13, speed: 2.4, range: 1.4, aggro: 10, xp: 45, gold: [8, 15],  tag: 'magma', tint: 0xff7a40, props: [['Barbarian', '2H_Axe']] },
  boss:    { model: 'SkWarrior', name: 'Rey de Magma',       hp: 900, dmg: 24, speed: 2.1, range: 3.2, aggro: 16, xp: 700, gold: [400, 400], tag: 'boss', tint: 0xff6a2a, scale: 2.6, boss: true, props: [['Knight', '2H_Sword']] },
};

export class Enemy {
  constructor(kind, island, home) {
    const K = this.K = KINDS[kind]; this.kind = kind; this.island = island;
    this.m = instantiate(K.model, { scale: K.scale ?? rr(0.95, 1.08), tint: K.tint });
    // own materials so hit-flash only affects this one
    this.mats = [];
    this.m.inner.traverse(c => { if (c.isMesh) { c.material = c.material.clone(); this.mats.push(c.material); } });
    for (const [from, prop] of K.props ?? []) borrowProp(from, prop, this.m);
    if (K.tint && !K.animal) this.mats.forEach(mm => { if (mm.emissive) { mm.emissive.set(K.tint).multiplyScalar(0.25); } });
    this.root = this.m.root; scene.add(this.root);
    this.home = home ?? randomPointOn(island, 0, 0.75); this.pos = this.home.clone();
    this.pos.y = groundAt(this.pos.x, this.pos.z) ?? island.c.y;
    this.root.position.copy(this.pos);
    this.hp = K.hp; this.state = 'wander'; this.target = null; this.timer = rr(0, 3); this.heading = rand() * 6.28;
    this.cd = rr(0.5, 1.5); this.flash = 0; this.knock = new THREE.Vector3(); this.deadT = 0; this.pending = null;
    this.bar = makeBar(K.boss); this.showBar = 0;
    this.bodyR = this.m.hitbox.geometry.parameters.radiusTop * 0.9;
    this.m.hitbox.userData.enemy = this;
    ENEMIES.push(this);
  }
  get alive() { return this.state !== 'dead'; }
  hit(dmg, from, crit = false) {
    if (!this.alive) return;
    this.hp -= dmg; this.flash = 0.18; this.showBar = 4;
    floatText(_s.copy(this.pos).setY(this.pos.y + (this.m.h ?? 1.3) + 0.3), (crit ? '¡' : '') + Math.round(dmg) + (crit ? '!' : ''), crit ? '#ffd040' : '#fff', crit ? 30 : 22);
    if (from) this.knock.subVectors(this.pos, from).setY(0).normalize().multiplyScalar(this.K.boss ? 0.6 : 5);
    this.state = 'chase';
    hooks.burst && hooks.burst(_s.copy(this.pos).setY(this.pos.y + 0.9), new THREE.Color(this.K.tag === 'icewolf' ? 0x9fe0ff : 0xe8e0d0), 18, 2.2, 1.5);
    if (this.hp <= 0) return this.die();
    if (!this.K.boss || rand() < 0.25) { if (this.m.A.hit) oneShot(this.m, 'hit', 0.05, 1.4); this.cd = Math.max(this.cd, 0.5); this.pending = null; }
  }
  die() {
    this.state = 'dead'; this.deadT = this.K.boss ? 60 : rr(25, 40); this.hp = 0; this.bar.el.style.display = 'none';
    if (this.m.A.death) { this.m.busy = 0; oneShot(this.m, 'death', 0.1, 1, true); } else this.fall = 1;
    const g = rr(this.K.gold[0], this.K.gold[1]) | 0;
    hooks.onKill && hooks.onKill(this, this.K.xp, g);
    hooks.burst && hooks.burst(_s.copy(this.pos).setY(this.pos.y + 1), new THREE.Color(0xffd040), this.K.boss ? 300 : 40, this.K.boss ? 6 : 2.5, 2);
  }
  respawn() {
    this.hp = this.K.hp; this.state = 'wander'; this.pos.copy(randomPointOn(this.island, 0, 0.75)); this.pos.y = groundAt(this.pos.x, this.pos.z) ?? this.pos.y;
    this.root.visible = true; this.root.rotation.z = 0; this.fall = 0; this.m.busy = 0;
    if (this.m.A.spawn) oneShot(this.m, 'spawn', 0.05, 1.1); else play(this.m, 'idle', 0);
  }
  update(dt, t, P) {
    const m = this.m;
    if (this.state === 'dead') {
      this.deadT -= dt;
      if (this.fall !== undefined && this.fall > 0) { this.root.rotation.z = Math.min(Math.PI / 2, this.root.rotation.z + dt * 4); }
      if (this.deadT < 2) this.root.visible = Math.sin(this.deadT * 30) > 0;
      if (this.deadT <= 0) this.respawn();
      tickModel(m, dt); return;
    }
    const toP = _a.subVectors(P.pos, this.pos).setY(0), dP = toP.length();
    const playerHere = P.active && STATS.alive && P.mode === 'walk' && dP < this.K.aggro * (this.state === 'chase' ? 1.8 : 1) && Math.abs(P.pos.y - this.pos.y) < 4;
    if (this.slowT > 0) this.slowT -= dt;
    let moving = false, speed = this.K.speed * (this.slowT > 0 ? 0.35 : 1);
    if (playerHere) {
      if (this.state !== 'chase' && this.K.boss) { hooks.toast && hooks.toast('🔥 ¡El Rey de Magma despierta!'); if (m.A.taunt) oneShot(m, 'taunt', 0.1); }
      this.state = 'chase'; this.showBar = Math.max(this.showBar, 1.5);
      this.heading = lerpAngle(this.heading, Math.atan2(toP.x, toP.z), dt * 8);
      const range = this.K.range;
      if (dP > range * 0.85 && !(m.busy > 0)) { moving = true; this.move(dt, speed, toP.normalize()); }
      this.cd -= dt;
      if (dP < range && this.cd <= 0 && !(m.busy > 0)) {
        this.cd = this.K.ranged ? rr(1.8, 2.6) : rr(1.1, 1.7) * (this.K.boss ? 1.3 : 1);
        const key = this.K.ranged ? (m.A.cast ? 'cast' : 'attack') : (this.K.boss && rand() < 0.4 ? 'slam' : pick(['attack', 'attack2', 'attack3']));
        if (m.A[key]) oneShot(m, key, 0.08, this.K.boss ? 0.9 : 1.15); else this.lunge = 0.3;
        this.pending = { t: this.K.ranged ? 0.55 : (this.K.boss ? 0.75 : 0.42), slam: key === 'slam' && this.K.boss };
      }
    } else {
      if (this.state === 'chase') { this.state = 'wander'; this.target = null; }
      this.timer -= dt;
      if (!this.target && this.timer <= 0) this.target = randomPointOn(this.island, 0, 0.8);
      if (this.target) {
        const d = _b.subVectors(this.target, this.pos).setY(0);
        if (d.length() < 0.4) { this.target = null; this.timer = rr(2, 6); }
        else { moving = true; speed *= 0.4; this.heading = lerpAngle(this.heading, Math.atan2(d.x, d.z), dt * 4); this.move(dt, speed, d.normalize()); }
      }
    }
    // resolve a pending attack (wind-up)
    if (this.pending) {
      this.pending.t -= dt;
      if (this.pending.t <= 0) {
        if (this.K.ranged) shoot(this, P);
        else {
          const reach = this.K.range + (this.pending.slam ? 1.5 : 0.4);
          if (P.mode === 'walk' && _a.subVectors(P.pos, this.pos).setY(0).length() < reach) hurtPlayer(this.K.dmg * (this.pending.slam ? 1.5 : 1) * rr(0.85, 1.15), this.pos);
          if (this.pending.slam) hooks.burst && hooks.burst(_s.copy(this.pos).addScaledVector(_b.set(Math.sin(this.heading), 0, Math.cos(this.heading)), 2), new THREE.Color(0xff6a1a), 120, 5, 3);
        }
        this.pending = null;
      }
    }
    // knockback
    if (this.knock.lengthSq() > 0.01) { this.pos.addScaledVector(this.knock, dt); this.knock.multiplyScalar(Math.max(0, 1 - dt * 8)); }
    const g = groundAt(this.pos.x, this.pos.z);
    if (g === null || islandAt(this.pos.x, this.pos.z) !== this.island) { this.pos.sub(this.knock.multiplyScalar(0)); this.pos.lerp(this.island.c, 0.02); }
    else this.pos.y += (g - this.pos.y) * Math.min(1, dt * 12);
    this.root.position.copy(this.pos); this.root.rotation.y = this.heading;
    // animation
    if (!(m.busy > 0)) {
      if (moving) play(m, this.state === 'chase' ? 'run' : (m.A.walkSk && this.K.tag !== 'icewolf' ? 'walkSk' : 'walk'), 0.2, this.state === 'chase' ? 1.0 : 0.9);
      else play(m, this.state === 'chase' && m.A.combat ? 'combat' : 'idle', 0.25);
    }
    tickModel(m, dt);
    // hit flash
    if (this.flash > 0) this.flash -= dt;
    const f = Math.max(0, this.flash) / 0.18;
    for (const mm of this.mats) if (mm.emissive) { if (f > 0) mm.emissive.setRGB(f, f * 0.25, f * 0.2); else if (this.K.tint && !this.K.animal) mm.emissive.set(this.K.tint).multiplyScalar(0.25); else mm.emissive.setRGB(0, 0, 0); }
    // health bar
    this.showBar -= dt;
    const vis = this.showBar > 0 || this.K.boss && this.state === 'chase';
    if (vis && project(_s.copy(this.pos).setY(this.pos.y + (this.m.h ?? 1.3) + (this.K.boss ? 1.2 : 0.45)), this.bar.el)) this.bar.f.style.width = (this.hp / this.K.hp * 100) + '%';
    else this.bar.el.style.display = 'none';
  }
  move(dt, speed, dir) {
    this.pos.addScaledVector(dir, speed * dt);
    pushOut(this.pos, 0.35);
    // don't walk into the hero or into each other
    const me = this.bodyR ?? 0.35;
    if (hooks.playerPos) { const pp = hooks.playerPos(); if (pp) { const dx = this.pos.x - pp.x, dz = this.pos.z - pp.z, d = Math.hypot(dx, dz), m = me + 0.32; if (d < m && d > 1e-4) { this.pos.x = pp.x + dx / d * m; this.pos.z = pp.z + dz / d * m; } } }
    for (const o of ENEMIES) { if (o === this || !o.alive) continue; const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z; if (Math.abs(dx) > 2 || Math.abs(dz) > 2) continue; const d = Math.hypot(dx, dz), m = me + (o.bodyR ?? 0.35); if (d < m && d > 1e-4) { this.pos.x += dx / d * (m - d) * 0.5; this.pos.z += dz / d * (m - d) * 0.5; } }
  }
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
function lerpAngle(a, b, k) { const d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; return a + d * Math.min(1, k); }

// ---------- projectiles (skeleton mages) ----------
const bolts = [];
const boltGeo = new THREE.SphereGeometry(0.18, 10, 8);
const boltMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.3, 1.0).multiplyScalar(4), toneMapped: false });
function shoot(e, P) {
  const b = new THREE.Mesh(boltGeo, boltMat); b.position.copy(e.pos).setY(e.pos.y + 1.2); scene.add(b);
  const target = _s.copy(P.pos).setY(P.pos.y + 0.9);
  bolts.push({ b, v: target.sub(b.position).normalize().multiplyScalar(11), t: 2.2, dmg: e.K.dmg });
}
function updateBolts(dt, P) {
  for (let i = bolts.length - 1; i >= 0; i--) {
    const k = bolts[i]; k.t -= dt; k.b.position.addScaledVector(k.v, dt);
    hooks.burst && rand() < 0.5 && hooks.burst(k.b.position, new THREE.Color(0x9a6aff), 1, 0.3, 0);
    const hitP = P.mode === 'walk' && k.b.position.distanceTo(_s.copy(P.pos).setY(P.pos.y + 0.9)) < 0.7;
    if (hitP) hurtPlayer(k.dmg, k.b.position);
    if (hitP || k.t <= 0) { scene.remove(k.b); bolts.splice(i, 1); }
  }
}

// ---------- player damage ----------
export function hurtPlayer(dmg, from) {
  if (!STATS.alive || STATS.invuln > 0) return;
  if (hooks.isBlocking && hooks.isBlocking()) dmg *= STATS.block;
  dmg *= 1 - STATS.armor;
  STATS.hp = Math.max(0, STATS.hp - dmg); STATS.invuln = 0.35;
  hooks.onPlayerHit && hooks.onPlayerHit(dmg, from);
}
export function gainXp(x) {
  STATS.xp += x;
  while (STATS.xp >= xpNeeded()) {
    STATS.xp -= xpNeeded(); STATS.level++; STATS.maxHp += 20; STATS.dmg += 6; STATS.hp = STATS.maxHp;
    hooks.onLevel && hooks.onLevel(STATS.level);
  }
}

// player swing: returns number of enemies hit
export function playerSwing(pos, heading, bonus = 1, reachBase = 2.0) {
  let n = 0;
  const fx = Math.sin(heading), fz = Math.cos(heading);
  for (const e of ENEMIES) {
    if (!e.alive) continue;
    const dx = e.pos.x - pos.x, dz = e.pos.z - pos.z, d = Math.hypot(dx, dz);
    const reach = reachBase + (e.K.boss ? 1.6 : 0);
    if (d > reach || Math.abs(e.pos.y - pos.y) > 2.5) continue;
    const dot = (dx * fx + dz * fz) / Math.max(d, 0.01);
    if (dot < 0.2 && d > 0.8) continue;
    const crit = rand() < 0.15;
    e.hit((STATS.dmg + STATS.dmgBonus) * rr(0.85, 1.15) * bonus * (crit ? 1.8 : 1), pos, crit); n++;
  }
  return n;
}
// dragon fire: cone damage
export function fireCone(origin, dir, range = 16, dps = 60, dt = 0.016) {
  for (const e of ENEMIES) {
    if (!e.alive) continue;
    const to = _a.subVectors(e.pos, origin); to.y += 0.8; const d = to.length();
    if (d > range) continue;
    if (to.normalize().dot(dir) < 0.88) continue;
    e.burnAcc = (e.burnAcc ?? 0) + dps * dt;
    if (e.burnAcc > 12) { e.hit(e.burnAcc, null, false); e.burnAcc = 0; }
  }
}

export function spawnEnemies() {
  const by = Object.fromEntries(OUTER.map(i => [i.id, i]));
  const R = by.ruinas, H = by.helada, V = by.volcan;
  ['minion', 'minion', 'minion', 'minion', 'minion', 'rogue', 'rogue', 'rogue', 'rogue', 'warrior', 'warrior', 'warrior', 'mage', 'mage', 'mage'].forEach(k => new Enemy(k, R));
  for (let i = 0; i < 10; i++) new Enemy('icewolf', H);
  for (let i = 0; i < 7; i++) new Enemy('magma', V, randomPointOn(V, 9 * V.k, 0.85));
  const boss = new Enemy('boss', V, new THREE.Vector3(V.crater.x + 4.5 * V.k, 0, V.crater.z));
  return boss;
}
export function spawnDungeon(room) {
  ['warrior', 'minion', 'minion', 'rogue', 'rogue', 'mage', 'warrior'].forEach((k, i) =>
    new Enemy(k, room, new THREE.Vector3(room.c.x + (i % 2 ? 1.5 : -1.5), 0, room.z0 + 4 + i * 3)));
}
export function updateCombat(dt, t, P) {
  if (STATS.invuln > 0) STATS.invuln -= dt;
  for (const e of ENEMIES) e.update(dt, t, P);
  updateBolts(dt, P);
  updatePlayerBolts(dt);
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i]; f.t += dt; f.p.y += dt * 1.6; f.p.x += f.vx * dt;
    project(f.p, f.el); f.el.style.opacity = Math.max(0, 1 - f.t / 1.1);
    if (f.t > 1.1) { f.el.remove(); floats.splice(i, 1); }
  }
}

// ---------- hero magic: arcane orbs & frost nova ----------
const pbolts = [];
const pGeo = new THREE.IcosahedronGeometry(0.22, 2);
const pMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 0.9, 1.0).multiplyScalar(4), toneMapped: false });
export function playerBolt(origin, dir, dmg) {
  const b = new THREE.Mesh(pGeo, pMat); b.position.copy(origin); scene.add(b);
  pbolts.push({ b, v: dir.clone().multiplyScalar(26), t: 1.3, dmg });
}
function updatePlayerBolts(dt) {
  for (let i = pbolts.length - 1; i >= 0; i--) {
    const k = pbolts[i]; k.t -= dt; k.b.position.addScaledVector(k.v, dt); k.b.rotation.x += dt * 9;
    hooks.burst && hooks.burst(k.b.position, new THREE.Color(0x60d0ff), 2, 0.4, 0.2);
    let hit = null;
    for (const e of ENEMIES) { if (!e.alive) continue; _a.copy(e.pos); _a.y += 0.9 * (e.K.scale ?? 1); if (_a.distanceTo(k.b.position) < 0.9 * (e.K.scale ?? 1)) { hit = e; break; } }
    if (hit) { const crit = rand() < 0.15; hit.hit(k.dmg * (crit ? 1.8 : 1), k.b.position, crit); hooks.burst && hooks.burst(k.b.position, new THREE.Color(0x80e0ff), 30, 2.5, 1); }
    const g = groundAt(k.b.position.x, k.b.position.z);
    if (hit || k.t <= 0 || (g !== null && k.b.position.y < g)) { scene.remove(k.b); pbolts.splice(i, 1); }
  }
}
export function nova(pos, radius, dmg) {
  let n = 0;
  for (const e of ENEMIES) {
    if (!e.alive) continue;
    if (Math.hypot(e.pos.x - pos.x, e.pos.z - pos.z) > radius + (e.K.boss ? 1.5 : 0) || Math.abs(e.pos.y - pos.y) > 3) continue;
    e.hit(dmg, pos); e.slowT = 3.5; n++;
  }
  return n;
}
export function nearestEnemyInFront(pos, fwd, range = 22) {
  let best = null, bs = -1;
  for (const e of ENEMIES) {
    if (!e.alive) continue;
    const dx = e.pos.x - pos.x, dz = e.pos.z - pos.z, d = Math.hypot(dx, dz);
    if (d > range || d < 0.3) continue;
    const dot = (dx * fwd.x + dz * fwd.z) / d; if (dot < 0.8) continue;
    const score = dot * 2 - d / range; if (score > bs) { bs = score; best = e; }
  }
  return best;
}
