// Third-person hero: mouse-look (pointer lock), WASD movement, sword combat, blocking,
// mounting and flying dragons, death & respawn, HUD.
import * as THREE from 'three';
import { BODIES, isAvatarLook, buildAvatar } from './avatar.js?v=18';
import { renderer, scene, camera, controls, rand } from './core.js';
import { groundAt, pushOut } from './terrain.js';
import { play, oneShot, tickModel } from './models.js';
import { person } from './npc.js';
import { STATS, playerSwing, fireCone, xpNeeded, ENEMIES, playerBolt, nova, nearestEnemyInFront } from './combat.js';
import { CLASSES, classStats } from './classes.js';
import { NPCS } from './npc.js';
import { nearestDragon } from './dragons.js';
import { currentRoom } from './interiors.js';

export const P = { active: false, mode: 'walk', pos: new THREE.Vector3(), vy: 0, onGround: false, heading: 0, yaw: 0, pitch: 0.35, dist: 6,
  m: null, cls: null, skillCd: 0, rageT: 0, ride: null, attackT: 0, combo: 0, blocking: false, firing: false, move: 0, lastHit: 0, deadT: 0, flyPitch: 0 };
const H = { nova: () => {}, rage: () => {}, onClass: null, hasShield: null, toast: () => {}, talkNearest: () => {}, interact: () => {}, potion: () => {}, blocked: () => false, burst: () => {}, fire: () => {}, onMount: () => {}, swish: () => {}, roar: () => {}, onExit: () => {} };
export function playerHooks(h) { Object.assign(H, h); }
export const keys = {};
export const TOUCH = { on: false, jx: 0, jy: 0 };
const $ = (s) => document.querySelector(s);
const GUARD = ['guerrero', 'explorador'];
const SPAWN = new THREE.Vector3(0, 0, 5.8);

// ---------- input ----------
const canvas = renderer.domElement;
const locked = () => document.pointerLockElement === canvas;
canvas.addEventListener('mousedown', (e) => {
  if (!P.active || TOUCH.on || H.blocked()) return;
  if (!locked()) { canvas.requestPointerLock?.(); return; }
  if (e.button === 0) { if (P.mode === 'ride') P.firing = true; else attack(); }
  if (e.button === 2) skillPress();
});
addEventListener('mouseup', (e) => { if (e.button === 0) P.firing = false; if (e.button === 2) skillRelease(); });
canvas.addEventListener('contextmenu', (e) => { if (P.active) e.preventDefault(); });
const chatOpen = () => !$('#chat')?.hidden;
// compact hint: full controls only until the first time you take the camera, never over the chat
document.addEventListener('pointerlockchange', () => {
  const h = $('#lockHint'); if (!h) return;
  if (locked()) h.classList.add('seen');
  h.style.opacity = P.active && !locked() && !chatOpen() ? 1 : 0;
});
addEventListener('mousemove', (e) => {
  if (!P.active || !locked()) return;
  P.yaw -= e.movementX * 0.0024;
  if (P.mode === 'ride') P.flyPitch = THREE.MathUtils.clamp(P.flyPitch - e.movementY * 0.0022, -0.9, 0.9);
  else P.pitch = THREE.MathUtils.clamp(P.pitch + e.movementY * 0.0022, -0.3, 1.25);
});
addEventListener('wheel', (e) => { if (P.active) P.dist = THREE.MathUtils.clamp(P.dist + Math.sign(e.deltaY) * 0.6, 2.5, 16); }, { passive: true });
addEventListener('keydown', (e) => {
  if (e.target?.closest?.('input, textarea, select')) return;  // typing in the chat never moves the hero
  keys[e.code] = true;
  if (!P.active || !STATS.alive || H.blocked()) return;
  if (e.code === 'Space') { e.preventDefault(); if (P.mode === 'walk' && P.onGround) { P.vy = 7.8; P.onGround = false; } }
  if (e.code === 'KeyE' && P.mode === 'walk') H.interact(P.pos);
  if (e.code === 'KeyR') H.potion();
  if (e.code === 'KeyF') { if (P.mode === 'ride') dismount(); else mount(); }
  if (e.code === 'KeyQ' && P.mode === 'walk') attack();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
export function releaseKeys() { for (const k in keys) keys[k] = false; }

// ---------- lifecycle ----------
export function startExplore() {
  if (!P.m) setClass(P.cls || 'guerrero');
  P.m.root.visible = true; P.active = true; P.mode = 'walk';
  respawn(true);
  P.yaw = 0; P.pitch = 0.35;
  controls.enabled = false; controls.autoRotate = false;
  camera.fov = 60; camera.updateProjectionMatrix();
  $('#playerHud').style.opacity = 1;
  $('#lockHint').style.opacity = TOUCH.on || chatOpen() ? 0 : 1;
  H.toast(`${CLASSES[P.cls].icon} ¡Hola, ${P.look?.name || 'viajero'}! Haz clic para usar el ratón · Habla con el equipo en los mostradores "?"`);
}
export function stopExplore() {
  if (P.mode === 'ride') dismount(true);
  P.active = false; P.m && (P.m.root.visible = false);
  controls.enabled = true; camera.fov = 45; camera.updateProjectionMatrix();
  document.exitPointerLock?.();
  $('#playerHud').style.opacity = 0; $('#lockHint').style.opacity = 0;
}
function respawn(first = false) {
  P.pos.copy(SPAWN); P.pos.y = (groundAt(SPAWN.x, SPAWN.z) ?? 0.5) + (first ? 0 : 3); P.vy = 0;
  STATS.hp = STATS.maxHp; STATS.alive = true; P.m.busy = 0; play(P.m, 'idle', 0);
}

// ---------- classes ----------
export function setLook(look) { P.look = look; setClass(BODIES[look.body]?.cls ?? 'guerrero'); }
export function setClass(cls) {
  const wasVisible = P.m ? P.m.root.visible : false;
  if (P.m) scene.remove(P.m.root);
  P.cls = cls; const C = CLASSES[cls];
  P.m = isAvatarLook(P.look) && BODIES[P.look.body].cls === cls ? buildAvatar(P.look, { scale: cls === 'bestia' ? 1.12 : 1.05 }) : person(C.model, C.show, { plain: true, scale: cls === 'bestia' ? 1.12 : 1.05 });
  P.m.root.visible = wasVisible || P.active; scene.add(P.m.root);
  const st = classStats(cls, STATS.level, H.hasShield ? H.hasShield() : false);
  const ratio = STATS.maxHp ? STATS.hp / STATS.maxHp : 1;
  STATS.maxHp = st.maxHp; STATS.dmg = st.dmg; STATS.hp = Math.max(1, Math.round(st.maxHp * ratio));
  P.m.root.position.copy(P.pos);
  H.onClass && H.onClass(cls);
}

// ---------- combat ----------
export function attack() {
  if (P.attackT > 0 || !STATS.alive || P.mode !== 'walk') return;
  const C = CLASSES[P.cls || 'guerrero'];
  const key = C.combo[P.combo % C.combo.length]; P.combo++;
  P.m.busy = 0; oneShot(P.m, key, 0.05, C.ts * (P.rageT > 0 ? 1.25 : 1));
  P.attackT = C.atkT / (P.rageT > 0 ? 1.25 : 1); P.heading = Math.atan2(-Math.sin(P.yaw), -Math.cos(P.yaw));
  H.swish(P.cls);
  const rage = P.rageT > 0 ? 1.6 : 1;
  if (P.cls === 'mago') {
    const fwd = new THREE.Vector3(Math.sin(P.heading), 0, Math.cos(P.heading));
    setTimeout(() => {
      const o = new THREE.Vector3(P.pos.x + fwd.x * 0.6, P.pos.y + 1.3, P.pos.z + fwd.z * 0.6);
      const tgt = nearestEnemyInFront(P.pos, fwd, C.reach);
      const dir = tgt ? new THREE.Vector3(tgt.pos.x, tgt.pos.y + 0.9 * (tgt.K.scale ?? 1), tgt.pos.z).sub(o).normalize() : fwd.clone().setY(-Math.sin(P.pitch - 0.35) * 0.4).normalize();
      if (tgt) P.heading = Math.atan2(dir.x, dir.z);
      playerBolt(o, dir, (STATS.dmg + STATS.dmgBonus) * 1.0);
    }, 230);
    return;
  }
  setTimeout(() => {
    const finisher = P.combo % C.combo.length === 0;
    const n = playerSwing(P.pos, P.heading, (finisher ? 1.4 : 1) * rage * (P.cls === 'bestia' ? 1.15 : 1), C.reach);
    if (n) H.burst(new THREE.Vector3(P.pos.x + Math.sin(P.heading) * 1.2, P.pos.y + 1, P.pos.z + Math.cos(P.heading) * 1.2), new THREE.Color(P.rageT > 0 ? 0xff6a4a : 0xfff0c0), 14 + n * 6, 2, 1);
  }, P.cls === 'bestia' ? 260 : 170);
}
// right mouse / touch shield button
export function skillPress() {
  if (!STATS.alive || P.mode !== 'walk') return;
  if (GUARD.includes(P.cls || 'guerrero')) { P.blocking = true; return; }
  if (P.skillCd > 0) { H.toast(`${CLASSES[P.cls].skill} se recarga… (${Math.ceil(P.skillCd)} s)`); return; }
  if (P.cls === 'mago') {
    P.m.busy = 0; oneShot(P.m, 'raise', 0.05, 1.6);
    const n = nova(P.pos, 5.5, (STATS.dmg + STATS.dmgBonus) * 1.3);
    H.nova(P.pos); P.skillCd = 6;
    if (n) H.toast(`❄️ ¡${n} enemigo${n > 1 ? 's' : ''} congelado${n > 1 ? 's' : ''}!`);
  } else if (P.cls === 'bestia') {
    P.m.busy = 0; oneShot(P.m, 'cheer', 0.05, 1.4);
    P.rageT = 7; P.skillCd = 16; H.rage(P.pos); H.toast('🐻 ¡FURIA! Más daño y velocidad');
  }
}
export function skillRelease() { P.blocking = false; }

export function playerHit(dmg) {
  P.lastHit = 0;
  if (STATS.hp <= 0 && STATS.alive) {
    STATS.alive = false; P.deadT = 3.2; P.m.busy = 0; oneShot(P.m, 'death', 0.1, 1, true);
    H.toast('💀 Has caído… las nubes te devolverán a la Isla de Cristal');
  } else if (P.mode === 'walk' && !P.blocking && P.m.A.hit && P.attackT <= 0) { P.m.busy = 0; oneShot(P.m, 'hit', 0.05, 1.5); }
  const v = $('#vignetteHit'); v.style.opacity = 0.75; setTimeout(() => v.style.opacity = 0, 120);
}

// ---------- dragons ----------
export function toggleMount() { if (P.mode === 'ride') dismount(); else mount(); }
export function jump() { if (P.mode === 'walk' && P.onGround && STATS.alive) { P.vy = 7.8; P.onGround = false; } }
export function mount(d = nearestDragon(P.pos, 6)) {
  if (!d || !P.active || P.mode === "ride") return;
  P.mode = 'ride'; P.ride = d; d.state = 'ridden'; d.speed = 10;
  P.flyPitch = 0.25; P.yaw = Math.atan2(-d.dir.x, -d.dir.z);
  P.m.busy = 0; play(P.m, 'sit', 0.2);
  H.toast(`¡Montas a ${d.name}! Ratón: dirección · W: acelerar · S: frenar · Clic: energía · F: bajar`, 5000);
  H.onMount(d);
}
function dismount(force = false) {
  const d = P.ride; if (!d) return;
  const g = groundAt(d.head.x, d.head.z);
  if (!force && (g === null || d.head.y - g > 30)) { H.toast('Busca tierra firme debajo para bajar de la orca'); return; }
  P.mode = 'walk'; P.ride = null; d.state = 'return';
  P.pos.set(d.head.x, (g ?? 0) + 0.2, d.head.z); P.vy = 0; P.pitch = 0.35;
  P.m.root.quaternion.identity(); P.m.busy = 0;
}

// ---------- per frame ----------
const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _mv = new THREE.Vector3(), _t = new THREE.Vector3(), _c = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
export function updatePlayer(dt, t) {
  if (!P.active) return;
  const m = P.m;
  P.attackT -= dt; P.lastHit += dt; P.skillCd = Math.max(0, P.skillCd - dt); P.rageT = Math.max(0, P.rageT - dt);
  if (STATS.alive && P.lastHit > 5 && STATS.hp < STATS.maxHp) STATS.hp = Math.min(STATS.maxHp, STATS.hp + dt * (4 + STATS.level));
  if (!STATS.alive) { P.deadT -= dt; if (P.deadT <= 0) respawn(); }

  if (P.mode === 'ride') { updateRide(dt, t); updateHud(); return; }

  // movement relative to camera yaw
  _f.set(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)); _r.set(-_f.z, 0, _f.x);
  _mv.set(0, 0, 0);
  if (STATS.alive && !H.blocked()) {
    if (TOUCH.jx || TOUCH.jy) { _mv.addScaledVector(_f, -TOUCH.jy).addScaledVector(_r, TOUCH.jx); }
    if (keys.KeyW || keys.ArrowUp) _mv.add(_f); if (keys.KeyS || keys.ArrowDown) _mv.sub(_f);
    if (keys.KeyD || keys.ArrowRight) _mv.add(_r); if (keys.KeyA || keys.ArrowLeft) _mv.sub(_r);
  }
  const run = keys.ShiftLeft || keys.ShiftRight || Math.hypot(TOUCH.jx, TOUCH.jy) > 0.85, want = _mv.lengthSq() > 0.01 ? 1 : 0;
  P.move += (want - P.move) * Math.min(1, dt * 10);
  if (want) {
    _mv.normalize();
    const sp = (P.blocking ? 1.6 : run ? 6.8 : 3.6) * (P.attackT > 0 ? 0.35 : 1) * STATS.speed * CLASSES[P.cls || 'guerrero'].speed * (P.rageT > 0 ? 1.3 : 1);
    P.pos.addScaledVector(_mv, sp * dt);
    if (P.attackT <= 0 && !P.blocking) { const target = Math.atan2(_mv.x, _mv.z); const d = ((target - P.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI; P.heading += d * Math.min(1, dt * 12); }
    pushOut(P.pos, 0.32);
  }
  pushBodies(P.pos, 0.32);
  if (P.blocking) P.heading = Math.atan2(-Math.sin(P.yaw), -Math.cos(P.yaw));
  P.vy -= 22 * dt; P.pos.y += P.vy * dt;
  const g = groundAt(P.pos.x, P.pos.z);
  if (g !== null && P.pos.y <= g + 0.02 && P.pos.y > g - 1.0) { P.pos.y = g; P.vy = 0; P.onGround = true; } else P.onGround = false;
  if (P.pos.y < -30) { H.toast('¡Splash! Las nubes te devolvieron a la Isla de Cristal ☁️'); respawn(); }
  m.root.position.copy(P.pos); m.root.rotation.set(0, P.heading, 0);
  // animation
  if (STATS.alive) {
    let key = 'idle', ts = 1;
    if (!P.onGround) key = 'jumpIdle';
    else if (P.blocking && GUARD.includes(P.cls)) key = 'block';
    else if (P.move > 0.2) { key = run ? 'run' : 'walk'; ts = run ? 1.25 : 1.35; }
    play(m, key, 0.15, ts);
  }
  tickModel(m, dt);
  // camera orbit around the hero
  const tgt = _t.copy(P.pos).add(_up.set(0, 1.35, 0));
  const cp = Math.cos(P.pitch);
  _c.set(Math.sin(P.yaw) * cp, Math.sin(P.pitch), Math.cos(P.yaw) * cp).multiplyScalar(P.dist).add(tgt);
  const room = P.pos.x > 300 ? currentRoom() : null;
  if (room) {   // keep the camera inside the walls
    _c.sub(tgt).setLength(Math.min(P.dist, 3.6)).add(tgt);
    _c.x = THREE.MathUtils.clamp(_c.x, room.x0 + 0.35, room.x1 - 0.35); _c.z = THREE.MathUtils.clamp(_c.z, room.z0 + 0.35, room.z1 - 0.35);
    _c.y = THREE.MathUtils.clamp(_c.y, room.y + 0.4, room.y + room.h - 0.3);
  }
  const cg = groundAt(_c.x, _c.z); if (cg !== null && _c.y < cg + 0.4) _c.y = cg + 0.4;
  camera.position.lerp(_c, Math.min(1, dt * 14));
  camera.lookAt(tgt); controls.target.copy(tgt);
  updateHud();
}
function updateRide(dt, t) {
  const d = P.ride, m = P.m;
  const cp = Math.cos(P.flyPitch);
  const fwd = _f.set(-Math.sin(P.yaw) * cp, Math.sin(P.flyPitch), -Math.cos(P.yaw) * cp).normalize();
  let speed = 15; if (keys.KeyW || TOUCH.jy < -0.5) speed = 30; if (keys.KeyS || TOUCH.jy > 0.5) speed = 6;
  if (TOUCH.jx) P.yaw -= TOUCH.jx * dt * 1.6;
  d.speed += (speed - d.speed) * Math.min(1, dt * 2);
  d.dir.lerp(fwd, Math.min(1, dt * 3)).normalize();
  d.head.addScaledVector(d.dir, d.speed * dt);
  if (keys.Space) d.head.y += 9 * dt; if (keys.KeyC || keys.ControlLeft) d.head.y -= 9 * dt;
  const g = groundAt(d.head.x, d.head.z); if (g !== null && d.head.y < g + 2) d.head.y = g + 2;
  d.head.y = THREE.MathUtils.clamp(d.head.y, -18, 90);
  d.state = keys.KeyW ? 'ridden' : (fwd.y < -0.3 ? 'glide' : 'ridden');
  d._dt = dt; d.fireT = P.firing ? 0.15 : Math.max(0, d.fireT - dt);
  d.layout(t);
  // rider on the saddle
  d.seat(m.root.position); m.root.quaternion.copy(d.seatQuat());
  play(m, 'sit', 0.2); tickModel(m, dt);
  P.pos.copy(m.root.position);
  // fire breath
  if (P.firing) {
    const mouth = _c.copy(d.segs[0].s.position).addScaledVector(d.dir, 1.4 * d.scale);
    H.fire(mouth, d.dir); fireCone(mouth, d.dir, 18, 140, dt);
    if (!P.roaring) { P.roaring = true; H.roar(d.head); }
  } else P.roaring = false;
  // chase camera
  const desired = _t.copy(d.head).addScaledVector(d.dir, -13 * P.dist / 6).add(_mv.set(0, 4.5, 0));
  camera.position.lerp(desired, Math.min(1, dt * 5));
  camera.lookAt(_mv.copy(d.head).addScaledVector(d.dir, 6)); controls.target.copy(d.head);
}

// ---------- HUD ----------
function updateHud() {
  $('#hpFill').style.width = (STATS.hp / STATS.maxHp * 100) + '%';
  $('#hpText').textContent = `${Math.ceil(STATS.hp)} / ${STATS.maxHp}`;
  $('#xpFill').style.width = (STATS.xp / xpNeeded() * 100) + '%';
  $('#lvl').textContent = STATS.level; $('#gold').textContent = STATS.gold;
  const C = CLASSES[P.cls || 'guerrero'], sk = $('#skill');
  if (sk) sk.innerHTML = GUARD.includes(P.cls) ? `🛡️ ${C.skill}: clic der.` : (P.skillCd > 0 ? `${C.icon} ${C.skill}: ${Math.ceil(P.skillCd)} s` : `${C.icon} ${C.skill}: <b>¡lista!</b>`) + (P.rageT > 0 ? ` · 🔥 ${Math.ceil(P.rageT)} s` : '');
}

// bodies (NPCs, animals, enemies) are solid too
export function bodyRadius(m) { return m.hitbox ? m.hitbox.geometry.parameters.radiusTop * 0.9 : 0.3; }
function pushBodies(pos, r) {
  const push = (bp, br, share) => {
    const dx = pos.x - bp.x, dz = pos.z - bp.z, d = Math.hypot(dx, dz), m = br + r;
    if (d >= m || d < 1e-4 || Math.abs(pos.y - bp.y) > 1.8) return;
    const k = (m - d) / d;
    pos.x += dx * k * (1 - share); pos.z += dz * k * (1 - share);
    bp.x -= dx * k * share; bp.z -= dz * k * share;
  };
  for (const n of NPCS) { if (Math.abs(n.pos.x - pos.x) > 3 || Math.abs(n.pos.z - pos.z) > 3) continue; push(n.pos, n.bodyR ?? (n.bodyR = bodyRadius(n.m)), n.behavior === 'sit' || n.behavior === 'stand' ? 0 : 0.35); }
  for (const e of ENEMIES) { if (!e.alive || Math.abs(e.pos.x - pos.x) > 4 || Math.abs(e.pos.z - pos.z) > 4) continue; push(e.pos, e.bodyR ?? (e.bodyR = bodyRadius(e.m)), 0); }
}

// move the hero instantly (doors); camera snaps behind
export function teleport(pos, yaw) {
  P.pos.copy(pos); P.pos.y = (groundAt(pos.x, pos.z) ?? pos.y) + 0.05; P.vy = 0; P.yaw = yaw; P.heading = yaw + Math.PI; P.pitch = 0.3;
  const tgt = _t.copy(P.pos).add(_up.set(0, 1.35, 0));
  camera.position.set(Math.sin(yaw), 0.4, Math.cos(yaw)).multiplyScalar(3).add(tgt);
}
