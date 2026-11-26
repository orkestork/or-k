import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { renderer, scene, camera, controls, composer, bloom, world, params, updateEnvironment, flushInstances, rand, rr, pick, buildPuffs } from './core.js';
import { buildTextures, TEX, texMat } from './textures.js';
import { ISLANDS, OUTER, CENTRAL, CENTRAL_SCALE, buildIslands, buildBridges, buildCentralGrid, groundAt, addObstacle, pushOut } from './terrain.js';
import { anim as decorAnim } from './decor.js';
import { districts, buildDistrict, animateDistricts, createServiceConsole, buildLogo, logo, decorateCentral, buildBridgeLights, buildSkyDecor } from './service-world.js?v=36';
import { NPCS, populate, makeHumanoid, person } from './npc.js';
import { staffOutfit } from './outfits.js?v=5';
import { loadModels, instantiate, play } from './models.js';
import { buildSkyLife, buildHallOrca, updateSkyLife, whalePosition } from './sky.js';
import { buildPavilion } from './pavilion.js?v=20';
import { loadProps, loadEnvironment } from './props.js?v=5';
import { buildWildlife, updateWildlife, wildlife, dragonFiring } from './wildlife.js';
import { buildOuter, updateOuter } from './decor2.js';
import { buildDragons, DRAGONS, updateDragons } from './dragons.js';
import { STATS, combatHooks, spawnEnemies, updateCombat, gainXp, floatText } from './combat.js';
import { initQuests, questTalk, questEvent, questHooks, questMarkersTick } from './quests.js';
import { P, playerHooks, startExplore, stopExplore, updatePlayer, playerHit } from './player.js';
import { NPC } from './npc.js';
import { ENTRANCES, buildInteriors, nearbyDoor, nearbyChest, openChest, setCurrentRoom, updateInteriors, CHESTS } from './interiors.js';
import { EQUIP, applyEquipment, drinkPotion, openShop, shopOpen, shopHooks } from './shop.js';
import { saveSetup, saveGame, loadGame, resetGame } from './save.js';
import { buildTouch, touchHooks, isTouch, showTouch } from './touch.js';
import { spawnPet, updatePet, PET, nearestDragon } from './dragons.js';
import { ENEMIES, spawnDungeon } from './combat.js';
import { questSnapshot, questRestore, questStatus } from './quests.js';
import { teleport, setClass, setLook, mount, releaseKeys } from './player.js';
import { showAvatarMaker, isAvatarLook, addHeadset } from './avatar.js?v=18';
import { createChat } from './chat.js?v=7';
import { showCharSelect } from './charselect.js';
import { CLASSES } from './classes.js';

const $ = (s) => document.querySelector(s);

// ======================================================================
//  build the world
// ======================================================================
buildTextures();
buildPuffs(TEX.puff);
buildIslands();
const pavilion = buildPavilion({ districts });
buildHallOrca();
ISLANDS.forEach(buildDistrict);

const diagnosisSignals = [
  'Operación · Los pedidos se coordinan a mano y se duplican.',
  'Clientes · El equipo tarda en responder porque consulta varios canales.',
  'Datos · Cada área mide resultados en una hoja distinta.',
];
const diagnosis = new Set();
const crystals = [], mushrooms = [], runeRings = [], floatRocks = [];
let centralCrystal = null, totalAwake = 0;
const waterU = { time: { value: 0 } };

const bar = $('#bar div');
new GLTFLoader().load('isla.glb', async (gltf) => {
  const root = gltf.scene;
  const crystalDefs = { CristalCian: { color: 0xc9b2ff, note: 0 }, CristalMagenta: { color: 0xd11b42, note: 1 }, CristalVioleta: { color: 0x7c3cff, note: 2 } };
  const waterMat = new THREE.ShaderMaterial({
    uniforms: decorAnim.waterU, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform float time; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){ float s = n(vec2(vUv.x*8.0, vUv.y*14.0 + time*2.0))*0.6 + n(vec2(vUv.x*20.0, vUv.y*30.0 + time*3.0))*0.4;
        vec3 c = mix(vec3(0.25,0.6,1.0), vec3(0.95,0.99,1.0), smoothstep(0.4,0.8,s));
        float a = (1.0 - pow(abs(vUv.x-0.5)*2.0, 2.0)) * smoothstep(0.0, 0.35, vUv.y) * (0.5 + s*0.5);
        gl_FragColor = vec4(c*1.2, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  let runeMat = null, mushMat = null;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mn = o.material?.name || '';
    o.castShadow = true; o.receiveShadow = true;
    o.visible = mn === 'IslaMat';  // the crystals are replaced by the floating O R-K logo
    if (crystalDefs[mn]) {
      const d = crystalDefs[mn];
      const m = new THREE.MeshPhysicalMaterial({ color: d.color, emissive: d.color, emissiveIntensity: 0.8, roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.92, flatShading: true });
      o.material = m; o.castShadow = false;
      crystals.push({ mesh: o, mat: m, s0: o.scale.clone(), pulse: 0, awake: false, color: new THREE.Color(d.color), note: d.note });
      if (o.name.startsWith('CristalCentral')) centralCrystal = o;
    } else if (mn === 'Agua') { o.material = waterMat; o.castShadow = false; }
    else if (mn === 'Runas') { runeMat = runeMat || new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.7, 0.3).multiplyScalar(3), toneMapped: false }); o.material = runeMat; o.castShadow = false; runeRings.push(o); }
    else if (mn === 'SetaSombrero') { mushMat = mushMat || new THREE.MeshStandardMaterial({ color: 0x29f0d4, emissive: 0x29f0d4, emissiveIntensity: 2.2 }); o.material = mushMat.clone(); o.castShadow = false; mushrooms.push({ mesh: o, base: o.scale.clone(), bounce: 0 }); }
    else if (mn === 'HierbaMat') { o.material = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85, color: 0x7fbf6a }); o.castShadow = false; }
    else if (mn === 'FloresMat') { o.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }); o.castShadow = false; }
    else if (mn === 'IslaMat') { o.material = texMat("rock", { color: 0x655578, roughness: 0.88 }, 4); }
    if (o.name.startsWith('RocaFlotante')) floatRocks.push({ obj: o, y: o.position.y, ph: rand() * 6.28, sp: rr(0.4, 0.9) });
  });
  root.scale.setScalar(CENTRAL_SCALE);   // the GLB only provides the (hidden) diagnosis crystals now
  addObstacle(0, 0, 2.2);                 // logo pedestal in the lobby
  buildLogo(0.02);

  // the cartoon planet + moon are gone: the sky is now a real photographed sunset (core.js)
  flushInstances();
  $('#loader p').textContent = 'Abriendo el pabellón…';
  await loadModels((f) => { bar.style.width = (60 + f * 25).toFixed(0) + '%'; });
  $('#loader p').textContent = 'Amueblando los stands…';
  await Promise.all([loadProps((f) => { bar.style.width = (85 + f * 13).toFixed(0) + '%'; }), loadEnvironment(0.5)]);
  buildFireflies();
  serviceAgents();
  collectPickables();
  buildLabels();
  buildTouch();
  restoreSave();
  renderDiagnosis();
  setInterval(saveGame, 8000);
  $('#total').textContent = crystals.length;
  bar.style.width = '100%';
  $('#loader p').textContent = '¡todo listo! pulsa entrar';
  $('#enter').classList.add('ready');
  if (params.has('auto')) $('#enter').click();
  if (params.has('bakeexport')) setTimeout(() => import('./bake-export.js').then(m => m.exportForBake(scene, pavilion.floor)), 5000);
}, (e) => { if (e.total) bar.style.width = (e.loaded / e.total * 60).toFixed(0) + '%'; },
   (err) => { console.error(err); $('#loader h1').textContent = 'Error cargando el mundo'; });

// ---------- eagles soaring above the islands ----------
const eagles = [];
function buildEagles() {
  for (let i = 0; i < 6; i++) {
    const e = instantiate('Eagle', { scale: rr(0.9, 1.3) }); play(e, 'fly', 0, rr(0.8, 1.1));
    e.mixer.setTime(rand() * 2); scene.add(e.root);
    eagles.push({ e, r: rr(40, 95), h: rr(24, 40), sp: rr(0.05, 0.1) * (rand() < 0.5 ? 1 : -1), ph: rand() * 6.28 });
  }
}
const _ea = new THREE.Vector3(), _eb = new THREE.Vector3();
function updateEagles(dt, t) {
  for (const k of eagles) {
    const a = k.ph + t * k.sp, f = (u, o) => o.set(Math.cos(u) * k.r, k.h + Math.sin(u * 3) * 2, Math.sin(u) * k.r);
    f(a, _ea); f(a + 0.02 * Math.sign(k.sp), _eb);
    k.e.root.position.copy(_ea); k.e.root.lookAt(_eb); k.e.root.rotateZ(-Math.sign(k.sp) * 0.35);
    k.e.mixer.update(dt);
  }
}

// ======================================================================
//  fireflies & bursts
// ======================================================================
let ffU = null;
function buildFireflies() {
  const N = 700, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  const spots = [CENTRAL, ...ISLANDS];
  for (let i = 0; i < N; i++) {
    const isl = spots[i % spots.length], a = rand() * 6.28, r = rand() * (isl.R ?? 5) * 0.95;
    const x = isl.c.x + Math.cos(a) * r, z = isl.c.z + Math.sin(a) * r;
    pos.set([x, (groundAt(x, z) ?? isl.c.y) + rr(0.3, 3.5), z], i * 3); seed[i] = rand() * 100;
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  ffU = { time: { value: 0 }, size: { value: 30 * renderer.getPixelRatio() }, boost: { value: 0 } };
  scene.add(new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: ffU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float time, size; attribute float seed; varying float vA; varying float vS;
      void main(){ vec3 p = position; p.x += sin(time*0.35+seed)*0.6; p.z += cos(time*0.3+seed*1.3)*0.6; p.y += sin(time*0.5+seed*2.1)*0.45;
        vec4 mv = modelViewMatrix*vec4(p,1.0); vA = 0.5+0.5*sin(time*2.2+seed*7.0); vS = seed;
        gl_PointSize = size*(0.6+vA*0.6)/-mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float boost; varying float vA; varying float vS;
      void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.0,d); a*=a;
        vec3 c = mix(vec3(1.0,0.85,0.45), vec3(0.6,1.0,0.9), step(0.75, fract(vS)));
        gl_FragColor = vec4(c*(1.5+boost*1.5), a*(0.35+vA*0.65)*(0.5+boost*0.5)); }`,
  })));
}

const BURST = 2000;
const bGeo = new THREE.BufferGeometry();
const bPos = new Float32Array(BURST * 3), bVel = new Float32Array(BURST * 3), bLife = new Float32Array(BURST), bCol = new Float32Array(BURST * 3);
bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3));
bGeo.setAttribute('life', new THREE.BufferAttribute(bLife, 1));
bGeo.setAttribute('color', new THREE.BufferAttribute(bCol, 3));
const burstPts = new THREE.Points(bGeo, new THREE.ShaderMaterial({
  uniforms: { size: { value: 26 * renderer.getPixelRatio() } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
  vertexShader: `uniform float size; attribute float life; varying float vL; varying vec3 vC;
    void main(){ vL = life; vC = color; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = size*life/-mv.z; gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `varying float vL; varying vec3 vC; void main(){ float d = length(gl_PointCoord-0.5); if (vL <= 0.0) discard; gl_FragColor = vec4(vC*3.0, smoothstep(0.5,0.0,d)*vL); }`,
}));
burstPts.frustumCulled = false; scene.add(burstPts);
let bHead = 0;
function burst(o, color, n = 160, speed = 3.2, up = 1.5) {
  for (let k = 0; k < n; k++) {
    const i = bHead; bHead = (bHead + 1) % BURST;
    bPos.set([o.x, o.y, o.z], i * 3);
    const v = new THREE.Vector3().randomDirection().multiplyScalar(speed * (0.3 + Math.random())); v.y += up * Math.random();
    bVel.set([v.x, v.y, v.z], i * 3); bLife[i] = 1;
    const c = color.clone().offsetHSL((Math.random() - 0.5) * 0.08, 0, Math.random() * 0.2); bCol.set([c.r, c.g, c.b], i * 3);
  }
}
decorAnim.onFishSplash = (p) => burst(p, new THREE.Color(0x9fe0ff), 28, 1.2, 2.2);
const fireA = new THREE.Color(0xffd040), fireB = new THREE.Color(0xff3a10);
function fireBreath(o, dir) {
  for (let k = 0; k < 14; k++) {
    const i = bHead; bHead = (bHead + 1) % BURST;
    bPos.set([o.x, o.y, o.z], i * 3);
    const sp = rr(7, 12);
    bVel.set([dir.x * sp + rr(-1.2, 1.2), dir.y * sp + rr(-1.2, 1.2) + 1.5, dir.z * sp + rr(-1.2, 1.2)], i * 3);
    bLife[i] = rr(0.6, 1);
    const c = fireA.clone().lerp(fireB, Math.random()); bCol.set([c.r * 1.4, c.g * 1.2, c.b], i * 3);
  }
}
let roared = false;

// ======================================================================
//  audio — all synthesized
// ======================================================================
let ac = null, master = null, reverb = null, soundOn = true;
function initAudio() {
  if (ac) return;
  ac = new (window.AudioContext || window.webkitAudioContext)(); ac.resume();
  master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination);
  const len = ac.sampleRate * 3.5, ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  reverb = ac.createConvolver(); reverb.buffer = ir; const wet = ac.createGain(); wet.gain.value = 0.7; reverb.connect(wet); wet.connect(master);
  // ambient pad
  const pad = ac.createGain(); pad.gain.value = 0; pad.connect(master); pad.connect(reverb);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(pad);
  const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 400; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
  [130.81, 196.0, 246.94, 329.63, 392.0].forEach((f, i) => [-6, 6].forEach((det) => {
    const o = ac.createOscillator(); o.type = i < 2 ? 'triangle' : 'sawtooth'; o.frequency.value = f; o.detune.value = det;
    const g = ac.createGain(); g.gain.value = i < 2 ? 0.05 : 0.016; o.connect(g); g.connect(lp); o.start();
  }));
  pad.gain.linearRampToValueAtTime(0.5, ac.currentTime + 6);
}
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
function tone(f, t, dur, vol, type = 'sine') {
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); g.connect(reverb); o.start(t); o.stop(t + dur + 0.1); return o;
}
function chime(idx, vel = 1) {
  if (!ac || !soundOn) return;
  const t = ac.currentTime, f = 523.25 * Math.pow(2, SCALE[idx % SCALE.length] / 12);
  [1, 2.01, 3, 4.2].forEach((m, k) => tone(f * m, t, 2.8 / (k * 0.6 + 1), 0.16 * vel / (k + 1)));
}
function bloop() { if (!ac || !soundOn) return; const t = ac.currentTime; const o = tone(320, t, 0.35, 0.25); o.frequency.exponentialRampToValueAtTime(900, t + 0.12); }
function voice(role) { // little "animal crossing"-style babble
  if (!ac || !soundOn) return;
  const base = { golem: 90, oveja: 380, nino: 520, zorro: 700, ciervo: 300, mago: 160, pescador: 140, gallina: 820, gato: 600, conejo: 900 }[role] ?? 240;
  const t = ac.currentTime;
  for (let k = 0; k < 7; k++) tone(base * (1 + Math.random() * 0.5), t + k * 0.07, 0.08, 0.06, role === 'golem' ? 'square' : 'triangle');
}
function roar() {
  if (!ac || !soundOn) return;
  orcaPosition(_rv); const dist = _rv.distanceTo(camera.position), vol = Math.max(0.02, 0.35 * Math.exp(-dist / 60));
  const t = ac.currentTime, len = ac.sampleRate * 1.6, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1);
  const src = ac.createBufferSource(); src.buffer = buf;
  const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(380, t); f.frequency.exponentialRampToValueAtTime(140, t + 1.5); f.Q.value = 1.6;
  const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(55, t + 1.5);
  const og = ac.createGain(); og.gain.value = 0.25;
  const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
  src.connect(f); f.connect(g); o.connect(og); og.connect(g); g.connect(master); g.connect(reverb);
  src.start(t); o.start(t); o.stop(t + 1.7);
}
const _rv = new THREE.Vector3();
function whaleSong(dist) {
  if (!ac || !soundOn) return;
  const t = ac.currentTime, vol = Math.max(0.02, 0.22 * Math.exp(-dist / 70));
  const o = ac.createOscillator(), g = ac.createGain(), o2 = ac.createOscillator();
  o.type = 'sine'; o2.type = 'sine';
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(260, t + 1.6); o.frequency.exponentialRampToValueAtTime(95, t + 4.2);
  o2.frequency.setValueAtTime(282, t); o2.frequency.exponentialRampToValueAtTime(520, t + 1.6); o2.frequency.exponentialRampToValueAtTime(190, t + 4.2);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 1.2); g.gain.linearRampToValueAtTime(0, t + 4.5);
  const g2 = ac.createGain(); g2.gain.value = 0.3;
  o.connect(g); o2.connect(g2); g2.connect(g); g.connect(reverb); g.connect(master); o.start(t); o2.start(t); o.stop(t + 5); o2.stop(t + 5);
}

// ======================================================================
//  picking: crystals, mushrooms, NPCs
// ======================================================================
let pickables = [];
function collectPickables() {
  pickables = [];
  for (const n of NPCS) { if (n.m.hitbox) { pickables.push(n.m.hitbox); n.m.hitbox.userData.npc = n; } else n.root.traverse(o => { if (o.isMesh) pickables.push(o); }); }
}
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
function pickAt(x, y) {
  mouse.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  return ray.intersectObjects(pickables.concat(logo.hits), false)[0] || null;
}
let hovered = null, lastMove = 0;
renderer.domElement.addEventListener('pointermove', (ev) => {
  if (document.pointerLockElement) return;
  const now = performance.now(); if (now - lastMove < 70) return; lastMove = now;
  const h = pickAt(ev.clientX, ev.clientY); hovered = h?.object ?? null;
  renderer.domElement.style.cursor = hovered ? 'pointer' : 'grab';
  const npc = hovered?.userData.npc;
  const tip = $('#tip');
  if (npc && npc.talkT <= 0) { tip.textContent = npc.name; tip.style.opacity = 1; tip.style.left = ev.clientX + 14 + 'px'; tip.style.top = ev.clientY + 10 + 'px'; }
  else tip.style.opacity = 0;
});
let downAt = null;
renderer.domElement.addEventListener('pointerdown', (ev) => { downAt = [ev.clientX, ev.clientY]; });
renderer.domElement.addEventListener('pointerup', (ev) => {
  if (document.pointerLockElement) return;
  if (!downAt || Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]) > 6) return;
  const h = pickAt(ev.clientX, ev.clientY); if (!h) return;
  const npc = h.object.userData.npc;
  if (npc) { talkTo(npc, P.active ? P.pos : camera.position); return; }
  if (logo.hits.includes(h.object)) { clickLogo(h.point); return; }
  const m = mushrooms.find(m => m.mesh === h.object);
  if (m) { m.bounce = 1; bloop(); burst(h.point, new THREE.Color(0x29f0d4), 50, 1.6, 2); }
});
function touchCrystal(c, point) {
  c.pulse = 1;
  const big = c.mesh === centralCrystal;
  burst(point, c.color, big ? 420 : 170, big ? 5 : 3.2);
  chime(c.note + Math.floor(Math.random() * 3) + (big ? 0 : 3));
  if (big) [0, 4, 7].forEach((n, k) => setTimeout(() => chime(n + 5, 0.8), 120 * k));
  if (!c.awake) {
    c.awake = true;
    totalAwake++;
    $('#count').textContent = totalAwake;
    if (!diagnosis.has(c.note)) {
      diagnosis.add(c.note);
      renderDiagnosis();
      toast(diagnosis.size === 3
        ? `${diagnosisSignals[c.note]} Diagnóstico completo: conecta operación, datos y clientes.`
        : diagnosisSignals[c.note], 6500);
      questEvent('crystal');
    }
    saveGame();
    if (totalAwake === crystals.length) magicRain(true);
  }
}
function magicRain(finale = false) {
  crystals.forEach((c, i) => setTimeout(() => { c.pulse = 1; const p = new THREE.Vector3(); c.mesh.getWorldPosition(p); p.y += 1.2; burst(p, c.color, finale ? 120 : 60, 3); chime(i, 0.6); }, i * 90));
  for (let k = 0; k < 8; k++) setTimeout(() => burst(new THREE.Vector3(rr(-6, 6), 10 + rr(0, 4), rr(-6, 6)), new THREE.Color().setHSL(Math.random(), 0.9, 0.65), 160, 2.5, -2), 300 + k * 240);
  if (finale) toast('✦ ¡Despertaste todos los cristales! El cielo te lo agradece ✦', 5000);
}


// ---------- O R-K logo: each click reveals the next diagnosis signal ----------
function clickLogo(point) {
  logo.pulse = 1;
  const next = crystals.find(c => !c.awake && !diagnosis.has(c.note)) ?? crystals.find(c => !c.awake);
  if (next) { touchCrystal(next, point); return; }
  burst(point, new THREE.Color(0xb89cff), 220, 4); [0, 4, 7].forEach((n, k) => setTimeout(() => chime(n + 5, 0.8), 120 * k));
}

// ---------- customer-service team: one agent per island + visiting clients ----------
const AGENTS = {
  aldea:  ['Sofía', 'Rogue', ['Hola, soy Sofía, de Tecnología y desarrollo. Unimos tus herramientas en una sola plataforma.', 'Hacemos software a medida, integraciones y automatizaciones. Te abrí el reto de este stand.']],
  molino: ['Mateo', 'Barbarian', ['Hola, soy Mateo, de Marketing y performance. Seguimos cada clic hasta la venta.', 'Campañas, embudos y optimización con datos. Mira el reto que te abrí.']],
  bosque: ['Valentina', 'Mage', ['Soy Valentina, de Comunidad y contenido. Creamos conversaciones, no solo publicaciones.', 'Estrategia de redes, contenido y gestión de comunidad. ¿Resolvemos el reto?']],
  lago:   ['Diego', 'Knight', ['Hola, soy Diego, de Diseño corporativo. Tu marca, coherente en cada punto de contacto.', 'Sistemas visuales, catálogos, presentaciones e impresos. Te abrí el reto.']],
  torre:  ['Camila', 'RogueHooded', ['Soy Camila, de Plataformas web. Diseñamos sitios y tiendas fáciles de usar.', 'Webs, e-commerce y portales a la medida de tu operación. Prueba el reto.']],
  ruinas: ['Andrés', 'Knight', ['Hola, soy Andrés, de Analítica y KPIs. Convertimos tus datos en decisiones.', 'Tableros e indicadores con una sola fuente de verdad. Te abrí el reto.']],
  helada: ['Lucía', 'Mage', ['Soy Lucía, de Producción audiovisual. Planeamos cada toma para cada formato.', 'Video, fotografía y animación para web, redes y campañas. Mira el reto.']],
  volcan: ['Martín', 'Barbarian', ['Hola, soy Martín, de Branding e identidad. Empezamos por lo que hace única a tu marca.', 'Posicionamiento, naming, logotipo e identidad. ¿Resolvemos el reto?']],
};
const CLIENT_LINES = ['Vine a conocer cómo pueden ayudar a mi empresa.', '¡Me explicaron todo en dos minutos!', 'Estoy esperando mi turno en el mostrador.', 'Quiero llevar mi negocio al siguiente nivel.', 'El equipo de esta isla sabe muchísimo.'];
function serviceAgents() {
  const types = ['Rogue', 'Mage', 'Knight', 'Barbarian'];
  for (const isl of ISLANDS) {
    const a = AGENTS[isl.id]; if (!a || !isl.agent) continue;
    const color = districts[isl.id].color;
    const m = person(a[1], [], { outfit: staffOutfit(color), scale: 1 }); addHeadset(m, color);
    const n = new NPC(m, { island: isl, role: 'agente', behavior: 'stand', name: `${a[0]} · Atención al cliente`, start: isl.agent.pos.clone() });
    n.heading = isl.agent.heading; n.lines = a[2]; n.service = isl.id; n.chatId = isl.id; n.home = n.heading;
    for (let i = 0; i < 2; i++) {
      const v = new NPC(person(pick(types)), { island: isl, role: 'cliente', speed: rr(0.7, 1.0), idleMin: 2, idleMax: 6, minR: isl.R * 0.35, maxFrac: 0.68 });
      v.lines = CLIENT_LINES;
    }
  }
  // visitors seated on stand seating (e.g. the Community amphitheatre)
  for (const isl of ISLANDS) for (const p of isl.seats ?? []) {
    const v = new NPC(person(pick(types)), { island: isl, role: 'cliente', behavior: 'sit', start: p.clone(), fixedY: p.y }); v.chair = true;
    v.heading = Math.atan2(isl.c.x - p.x, isl.c.z - p.z); v.lines = ['¡Esta charla sobre comunidad está buenísima!', 'Tomo notas para mi equipo.', 'Quiero que mi marca converse así con su gente.'];
  }
  // visitors relaxing on picnic blankets
  for (const isl of ISLANDS) for (const spot of isl.picnic ?? []) {
    const v = new NPC(person(pick(types)), { island: isl, role: 'cliente', behavior: 'sit', start: spot.pos.clone(), fixedY: spot.pos.y });
    v.heading = spot.heading; v.lines = ['¡Qué buena vista desde aquí!', 'Vine a la reunión y me quedé a recorrer el pabellón.', 'Después de hablar con el equipo, un descanso.'];
  }
  // visitors strolling around the whole pavilion, between the lobby and the stands
  const hallSpot = () => { for (let k = 0; k < 20; k++) { const a = Math.random() * Math.PI * 2, r = 11 + Math.random() * 41, x = Math.cos(a) * r, z = Math.sin(a) * r; const p = { x, z }; pushOut(p, 0.35); if (Math.abs(p.x - x) < 1e-3 && Math.abs(p.z - z) < 1e-3) return new THREE.Vector3(x, 0, z); } return new THREE.Vector3(0, 0, 14); };
  for (let i = 0; i < 14; i++) {
    const v = new NPC(person(pick(types)), { island: CENTRAL, role: 'cliente', speed: rr(0.9, 1.3), idleMin: 1.5, idleMax: 5, start: hallSpot(), targets: hallSpot });
    v.lines = CLIENT_LINES;
  }
  // people resting on the lobby sofas, looking at the logo
  ISLANDS.slice(0, 6).forEach((isl, i) => {
    const a = Math.atan2(isl.c.z, isl.c.x) + Math.PI / 8 + (i % 2 ? 0.08 : -0.08), x = Math.cos(a) * 8.15, z = Math.sin(a) * 8.15;
    const v = new NPC(person(pick(types)), { island: CENTRAL, role: 'cliente', behavior: 'sit', start: new THREE.Vector3(x, 0, z), fixedY: 0.02 }); v.chair = true;
    v.heading = Math.atan2(-x, -z); v.lines = ['¡Qué buen lugar para descansar entre stands!', 'Ya hablé con dos stands, me faltan los demás.', 'Esa orca allá arriba es increíble.'];
  });
  // host at the logo island, right where you spawn
  const host = person('Mage', [], { outfit: staffOutfit(0x7c3cff), scale: 1 }); addHeadset(host, 0x7c3cff);
  const h = new NPC(host, { island: CENTRAL, role: 'agente', behavior: 'stand', name: 'Ana · Recepción O R-K', start: new THREE.Vector3(2.4, 0.3, 5.0), fixedY: 0.3 });   // stands on the lobby plinth
  h.heading = -0.4; h.home = h.heading; h.chatId = 'centro';
  h.lines = ['¡Bienvenido a O R-K! Cada stand es uno de nuestros servicios.', 'En cada stand te atiende alguien del equipo: acércate al mostrador con el "?".', 'Haz clic en el logo para descubrir las señales del diagnóstico.'];
}


// ---------- spoken voices for the customer-service team (Web Speech API, no server needed) ----------
const FEMALE = new Set(['Sofía', 'Valentina', 'Camila', 'Lucía', 'Ana']);
const VOICE_PREF = ['es-CO', 'es-MX', 'es-US', 'es-419', 'es-AR', 'es-ES', 'es'];
const FEMALE_HINT = /paulina|m[oó]nica|flo\b|sandy|shelley|sabina|helena|laura|elvira|dalia|salom[eé]|lupe|paloma|marisol|ximena|female|mujer|google español/i;
const MALE_HINT = /eddy|reed|jorge|juan|diego|carlos|pablo|[aá]lvaro|enrique|gonzalo|male|hombre/i;
const NOVELTY = /grandma|grandpa|rocko|bubbles|whisper|zarvox|trinoids|bells|boing|bahh|cellos|organ|jester|superstar|wobble|albert|bad news|good news/i;
let voices = [];
const loadVoices = () => { voices = (window.speechSynthesis?.getVoices() ?? []).filter(v => /^es/i.test(v.lang) && !NOVELTY.test(v.name)); };
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
const langRank = (v) => { const l = v.lang.replace('_', '-').toLowerCase(); const i = VOICE_PREF.findIndex(p => l.startsWith(p.toLowerCase())); return i < 0 ? 99 : i; };
const hashName = (n) => [...n].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
// each agent keeps the same voice: gendered voices first, Latin-American accents before Spain
function pickVoice(female, name) {
  const want = female ? FEMALE_HINT : MALE_HINT, avoid = female ? MALE_HINT : FEMALE_HINT;
  const hinted = voices.filter(v => want.test(v.name) && !avoid.test(v.name)).sort((a, b) => langRank(a) - langRank(b));
  if (hinted.length) {
    const best = hinted.filter(v => langRank(v) === langRank(hinted[0]));
    const pool = new Map(); for (const v of best) if (!pool.has(v.name.split(' (')[0])) pool.set(v.name.split(' (')[0], v);
    const list = [...pool.values()]; return { voice: list[hashName(name) % list.length], gendered: true };
  }
  const any = [...voices].sort((a, b) => langRank(a) - langRank(b));
  return { voice: any[0] ?? null, gendered: false };
}
function speak(npc, text) {
  if (!soundOn || !('speechSynthesis' in window) || !npc?.chatId) return;
  const female = FEMALE.has(npc.name.split(' ·')[0]);
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[«»"“”]/g, ''));
  const { voice: v, gendered } = pickVoice(female, npc.name); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'es-CO';
  u.pitch = gendered ? 1 : (female ? 1.25 : 0.8);     // fall back to pitch when no gendered voice exists
  u.rate = 1.03; u.volume = 0.95;
  u.onstart = () => { npc.speaking = true; }; u.onend = u.onerror = () => { npc.speaking = false; };
  speechSynthesis.speak(u);
}
const hush = () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); };
// ---------- direct chat with the agents ----------
let chatting = null;
function say(npc, text, ms) {
  talking = npc;
  $('#bubble b').textContent = npc.name;
  $('#bubble span').textContent = text.length > 150 ? text.slice(0, text.lastIndexOf(' ', 147)) + '…' : text;
  $('#bubble').classList.add('show');
  if (npc.chatId && soundOn && 'speechSynthesis' in window) speak(npc, text); else voice(npc.role);
  clearTimeout(talkTo.tm); talkTo.tm = setTimeout(() => { $('#bubble').classList.remove('show'); talking = null; }, ms ?? Math.max(4300, 1500 + text.length * 62));
}
const chat = createChat({
  openChallenge: (id) => serviceConsole.open(id),
  onListen: () => hush(),   // stop the agent talking while you speak
  onReply: (id, reply) => { if (chatting?.chatId === id) say(chatting, reply); },
  onOpen: () => { $('#lockHint').style.opacity = 0; },
  onClose: () => { hush(); if (P.active) $('#lockHint').style.opacity = 1; if (chatting) { chatting.talkT = 0.9; chatting.faceTo = chatting.home; chatting = null; } },
});
function openChat(npc, from) {
  if (chatting && chatting !== npc) { chatting.talkT = 0.9; chatting.faceTo = chatting.home; }
  chatting = npc; releaseKeys();
  npc.talkT = 1e6; npc.faceTo = Math.atan2(from.x - npc.pos.x, from.z - npc.pos.z);
  const greeting = npc.lines[0] + ' Escríbeme o háblame con el 🎤.';
  chat.open({ id: npc.chatId, name: npc.name, role: npc.chatId === 'centro' ? 'Recepción · Pabellón O R-K' : districts[npc.chatId].name, greeting, hasChallenge: npc.chatId !== 'centro' });
  say(npc, npc.lines[0]);
}
addEventListener('keydown', (e) => { if (e.code === 'Escape' && chat.isOpen() && !e.target.closest?.('input')) chat.close(); });
// ---------- speech bubble ----------
let talking = null;
function talkTo(npc, from) {
  if (npc.chatId) { openChat(npc, from); return; }
  let line = npc.talk(from);
  const q = questTalk(npc); if (q) line = q;
  if (!q && npc.name === 'Don Bartolo') { line = '¡Bienvenido a mi tienda! Echa un vistazo, todo de primera.'; setTimeout(openShop, 250); }
  if (!q && npc.name === 'Abuela Rosa') { STATS.hp = STATS.maxHp; line = 'Siéntate junto al fuego, cariño… Listo, ¡como nuevo! (vida restaurada)'; burst(new THREE.Vector3(P.pos.x, P.pos.y + 1, P.pos.z), new THREE.Color(0x80ff90), 60, 1.5, 2); }
  if (q) saveGame();
  const ms = Math.max(4300, 1500 + line.length * 55); npc.talkT = ms / 1000;
  talking = npc;
  $('#bubble b').textContent = npc.name;
  $('#bubble span').textContent = line;
  $('#bubble').classList.add('show');
  voice(npc.role);
  clearTimeout(talkTo.tm); talkTo.tm = setTimeout(() => { $('#bubble').classList.remove('show'); talking = null; }, ms);
}
function toast(msg, ms = 2800) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.tm); toast.tm = setTimeout(() => t.classList.remove('show'), ms); }

// ---------- island labels ----------
const labels = [];
function buildLabels() {
  for (const isl of [CENTRAL, ...ISLANDS]) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'label';
    el.textContent = districts[isl.id]?.name ?? isl.name;
    $('#labels').appendChild(el);
    el.onclick = () => visitIsland(isl.id);
    labels.push({ el, isl, h: isl === CENTRAL ? 8 : isl.id === 'torre' ? 18 : 12 });
  }
}
let fly = null;
function flyTo(target, camPos, dur = 2.4) { controls.autoRotate = false; $('#bRotate').classList.remove('on'); fly = { t: 0, dur, a: controls.target.clone(), b: target, ca: camera.position.clone(), cb: camPos }; }

// ======================================================================
//  quests, combat & hero wiring
// ======================================================================
function extraNpcs() {
  const by = Object.fromEntries(ISLANDS.map(i => [i.id, i]));
  const A = by.aldea, N = by.nido;
  const ga = Math.atan2(by.ruinas.c.z - A.c.z, by.ruinas.c.x - A.c.x);
  new NPC(person('Knight', ['Knight_Cape', '1H_Sword', 'Badge_Shield'], { plain: true }), { island: A, role: 'guardian', name: 'Capitana Leona', behavior: 'stand',
    start: new THREE.Vector3(A.c.x + Math.cos(ga) * 7.2 * A.k, 0, A.c.z + Math.sin(ga) * 7.2 * A.k) }).heading = ga + Math.PI;
  new NPC(person('RogueHooded', ['Rogue_Cape'], { tint: 0xffd0a0 }), { island: N, role: 'explorador', name: 'Domadora Ayla', behavior: 'stand', start: N.keeperSpot.clone() });
}
function swish() {
  if (!ac || !soundOn) return;
  const t = ac.currentTime, len = ac.sampleRate * 0.25, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const s = ac.createBufferSource(); s.buffer = buf; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(2500, t); f.frequency.exponentialRampToValueAtTime(700, t + 0.2);
  const g = ac.createGain(); g.gain.value = 0.25; s.connect(f); f.connect(g); g.connect(master); s.start(t);
}
function thud(high = false) { if (!ac || !soundOn) return; const t = ac.currentTime; const o = tone(high ? 220 : 110, t, 0.2, 0.25, 'triangle'); o.frequency.exponentialRampToValueAtTime(high ? 90 : 45, t + 0.18); }
function fanfare() { if (!ac || !soundOn) return; [0, 4, 7, 12].forEach((n, k) => setTimeout(() => chime(n, 0.9), k * 120)); }
combatHooks({
  burst, toast,
  playerPos: () => (P.active && P.mode === 'walk' ? P.pos : null),
  isBlocking: () => P.blocking,
  onKill: (e, xp, gold) => {
    STATS.gold += gold; gainXp(xp); updateHudNow();
    floatText(new THREE.Vector3(e.pos.x, e.pos.y + 2.2, e.pos.z), `+${gold} oro  +${xp} XP`, '#ffd040', 18);
    questEvent('kill', e.K.tag); thud(true);
    if (e.K.boss) { toast('👑 ¡Derrotaste al Rey de Magma!', 5000); magicRain(true); }
  },
  onPlayerHit: (dmg, from) => { playerHit(dmg); thud(); floatText(new THREE.Vector3(P.pos.x, P.pos.y + 2, P.pos.z), '-' + Math.round(dmg), '#ff5a5a', 20); },
  onLevel: (lvl) => { saveGame(); toast(`⭐ ¡Subiste a nivel ${lvl}! Más vida y más daño`, 3500); fanfare(); burst(new THREE.Vector3(P.pos.x, P.pos.y + 1, P.pos.z), new THREE.Color(0xffe080), 200, 4, 3); },
});
questHooks({ toast, crystals: () => diagnosis.size, reward: (q) => { STATS.gold += q.gold; gainXp(q.xp); fanfare(); updateHudNow(); saveGame(); } });
playerHooks({
  toast, burst, swish,
  fire: (o, dir) => fireBreath(o, dir),
  roar: () => roar(),
  onMount: () => questEvent('mount'),
  interact: (pos) => interact(pos),
  hasShield: () => EQUIP.shield,
  onClass: () => { applyEquipment(P); updateHudNow(); },
  nova: (p) => { const c = new THREE.Color(0x9fe8ff); for (let k = 0; k < 6; k++) setTimeout(() => burst(new THREE.Vector3(p.x, p.y + 0.4, p.z), c, 70, 6 + k, 0.4), k * 40); chime(9); chime(11, 0.7); },
  rage: (p) => { burst(new THREE.Vector3(p.x, p.y + 1, p.z), new THREE.Color(0xff4a2a), 220, 4, 3); thud(); thud(true); },
  potion: () => drinkPotion(),
  blocked: () => shopOpen() || chat.isOpen(),
  talkNearest: (pos) => {
    let best = null, bd = 3.0;
    for (const n of NPCS) { const d = n.pos.distanceTo(pos); if (d < bd) { bd = d; best = n; } }
    if (best) talkTo(best, pos); else toast('No hay nadie cerca para hablar (acércate más)');
  },
});
// ---------- doors, chests, prompts, pet, save ----------
const ENTRANCES_ALL = () => ENTRANCES;
let fading = false;
function enterDoor(d) {
  if (fading) return; fading = true;
  const f = $('#fade'); f.style.opacity = 1;
  setTimeout(() => {
    if (d.exit) { teleport(d.e.outside, d.e.yawOut); setCurrentRoom(null); }
    else { teleport(d.e.inside, d.e.yawIn); setCurrentRoom(d.e.room); toast('📍 ' + d.e.room.name); }
    if (PET) { PET.head.copy(P.pos).add(new THREE.Vector3(1, 2, 1)); PET.trail.forEach(p => p.copy(PET.head)); }
    setTimeout(() => { f.style.opacity = 0; fading = false; }, 120);
  }, 380);
}
function interact(pos) {
  const d = nearbyDoor(pos); if (d) return enterDoor(d);
  const c = nearbyChest(pos);
  if (c) {
    openChest(c); STATS.gold += 300; EQUIP.weapon = 'cristal'; applyEquipment(P); gainXp(150);
    toast('💎 ¡Encontraste la ESPADA DE CRISTAL y 300 de oro!', 5000); fanfare();
    burst(new THREE.Vector3(c.pos.x, c.pos.y + 1, c.pos.z - 0.9), new THREE.Color(0xffd040), 260, 4, 3);
    questEvent('chest'); updateHudNow(); saveGame(); return;
  }
  let best = null, bd = 3.0;
  for (const n of NPCS) { const dd = n.pos.distanceTo(pos); if (dd < bd) { bd = dd; best = n; } }
  if (best) talkTo(best, pos); else toast('No hay nada cerca (acércate más)');
}
function interiorNpcs(rooms) {
  new NPC(person('Mage', ['Mage_Hat'], { tint: 0xffd0e0 }), { island: rooms.casa, role: 'aldeano', name: 'Abuela Rosa', behavior: 'stand', start: rooms.casa.npcSpot.clone() });
  new NPC(person('Mage', ['Mage_Hat', 'Spellbook_open', 'Mage_Cape'], { tint: 0xd0c0ff }), { island: rooms.lib, role: 'mago', name: 'Bibliotecaria Selene', behavior: 'stand', start: rooms.lib.npcSpot.clone(), caster: true });
  const s = NPCS[NPCS.length - 1]; s.lines = ['Estos libros cuentan que las islas fueron una sola montaña.', 'El orbe recuerda cada estrella que ha caído.', 'Shhh… los libros voladores se asustan fácil.'];
  NPCS[NPCS.length - 2].lines = ['¿Tienes hambre? Hay pan recién hecho.', 'Mi nieta cruzó todos los puentes antes de los diez años.'];
}
function petFire(origin, dir, target) {
  for (let k = 0; k < 30; k++) {
    const i = bHead; bHead = (bHead + 1) % BURST; const sp = rr(6, 10);
    bPos.set([origin.x, origin.y, origin.z], i * 3);
    bVel.set([dir.x * sp + rr(-0.6, 0.6), dir.y * sp + rr(-0.6, 0.6) + 1, dir.z * sp + rr(-0.6, 0.6)], i * 3);
    bLife[i] = rr(0.5, 0.8); const c = fireA.clone().lerp(fireB, Math.random()); bCol.set([c.r * 1.4, c.g * 1.2, c.b], i * 3);
  }
  setTimeout(() => target.alive && target.hit(10 + STATS.level * 3, origin), 220);
}
const promptEl = () => $('#prompt');
function gameplayTick(dt, t) {
  // context prompt
  let txt = '';
  if (P.mode === 'ride') txt = '';
  else {
    const d = nearbyDoor(P.pos), c = nearbyChest(P.pos), dr = nearestDragon(P.pos, 6);
    if (d) txt = `<b>E</b> · ${d.label}`; else if (c) txt = '<b>E</b> · Abrir el cofre';
    else if (dr) txt = `<b>F</b> · Montar a ${dr.name}`;
    else { for (const n of NPCS) if (n.pos.distanceTo(P.pos) < 2.6) { txt = `<b>E</b> · Hablar con ${n.name}`; break; } }
    if (isTouch) txt = txt.replace('<b>E</b>', '💬').replace('<b>F</b>', '🐉');
  }
  const pe = promptEl(); if (pe.dataset.t !== txt) { pe.innerHTML = txt; pe.dataset.t = txt; pe.style.opacity = txt ? 1 : 0; }
  // egg hatches at the crater
  if (!PET && questStatus('huevo') === 'active') {
    const V = OUTER.find(i => i.id === 'volcan');
    if (Math.hypot(P.pos.x - V.crater.x, P.pos.z - V.crater.z) < 7.5) {
      spawnPet(P.pos.clone()); questEvent('reach', 'crater'); fanfare();
      burst(new THREE.Vector3(P.pos.x, P.pos.y + 2, P.pos.z), new THREE.Color(0xffa040), 300, 4, 3);
      toast('🥚➡️🐉 ¡El huevo eclosionó! Conoce a CHISPA, tu dragón', 5000); saveGame();
    }
  }
  $('#potions').textContent = EQUIP.potions;
}
function snapshot() {
  return {
    stats: { hp: STATS.hp, maxHp: STATS.maxHp, level: STATS.level, xp: STATS.xp, gold: STATS.gold, dmg: STATS.dmg },
    equip: { ...EQUIP }, quests: questSnapshot(), cls: P.cls, look: P.look ?? null, services: serviceConsole.snapshot(),
    crystals: crystals.map((c, i) => c.awake ? i : -1).filter(i => i >= 0),
    chests: CHESTS.filter(c => c.open).map(c => c.id), pet: !!PET,
  };
}
function restoreSave() {
  saveSetup({ snapshot });
  const s = loadGame(); if (!s) return;
  Object.assign(STATS, s.stats); Object.assign(EQUIP, s.equip); P.cls = s.cls ?? null; P.look = s.look ?? null; applyEquipment(P);
  questRestore(s.quests);
  serviceConsole.restore(s.services);
  for (const i of s.crystals ?? []) if (crystals[i] && !crystals[i].awake) { crystals[i].awake = true; totalAwake++; diagnosis.add(crystals[i].note); }
  $('#count').textContent = totalAwake;
  renderDiagnosis();
  for (const id of s.chests ?? []) { const c = CHESTS.find(c => c.id === id); if (c) { openChest(c); c.shine.material.opacity = 0; } }
  if (s.pet) spawnPet(new THREE.Vector3(0, 1, 3));
  updateHudNow();
  setTimeout(() => toast(`💾 Partida cargada · Nivel ${STATS.level} · ${STATS.gold} de oro`, 3500), 1500);
}
function openAvatarMaker(first = false) {
  showAvatarMaker(P.look, (look) => {
    setLook(look); applyEquipment(P); updateHudNow(); saveGame();
    if (!P.active) $('#bExplore').click(); else toast(`✨ Avatar actualizado · ¡Hola, ${look.name}!`);
  }, first ? { onSkip: () => toast('Puedes crear tu avatar cuando quieras con el botón 👤 Avatar') } : {});
}
$('#bHero').onclick = () => openAvatarMaker(false);
$('#bReset').onclick = () => { if (confirm('¿Empezar una partida nueva? Se borrará tu progreso.')) { resetGame(); saveSetup(null); location.reload(); } };
addEventListener('beforeunload', saveGame);
shopHooks({ toast, sound: (k) => (k === 'buy' ? fanfare() : chime(2)), onChange: () => { applyEquipment(P); updateHudNow(); saveGame(); } });
touchHooks({ interact: (p) => interact(p), potion: () => drinkPotion() });

function updateHudNow() { $('#gold').textContent = STATS.gold; $('#lvl').textContent = STATS.level; $('#potions') && ($('#potions').textContent = EQUIP.potions); }

// ======================================================================
//  HUD
// ======================================================================
$('#bTime').onclick = () => { world.modeTarget = world.modeTarget ? 0 : 1; $('#bTime').textContent = world.modeTarget ? 'Atardecer' : 'Noche'; $('#bTime').classList.toggle('on', !!world.modeTarget); };
$('#bRotate').onclick = () => { if (P.active) return; controls.autoRotate = !controls.autoRotate; $('#bRotate').classList.toggle('on', controls.autoRotate); };
$('#bSound').onclick = () => { soundOn = !soundOn; if (!soundOn) hush(); $('#bSound').classList.toggle('on', soundOn); if (ac) master.gain.linearRampToValueAtTime(soundOn ? 0.55 : 0, ac.currentTime + 0.4); };
$('#bMagic').onclick = () => magicRain();
$('#bExplore').onclick = () => {
  if (P.active) { stopExplore(); showTouch(false); setCurrentRoom(null); $('#bExplore').classList.remove('on'); $('#bExplore').textContent = 'Explorar caminando'; flyTo(new THREE.Vector3(-10, 2, 12), camEnd.clone()); }
  else if (!P.cls || !isAvatarLook(P.look)) { openAvatarMaker(true); return; }
  else { followWhale = false; syncFollow(); fly = null; startExplore(); applyEquipment(P); showTouch(true); setCurrentRoom(null); $('#bExplore').classList.add('on'); $('#bExplore').textContent = 'Vista libre'; }
};
$('#bWhale').onclick = () => { if (P.active) $('#bExplore').click(); followWhale = followWhale === 'whale' ? false : 'whale'; syncFollow(); if (followWhale) toast('Siguiendo a la ballena celeste 🐋'); };
const signalButtons = [...document.querySelectorAll('#diagnosisTools button')];
function renderDiagnosis() {
  $('#diagnosisCount').textContent = diagnosis.size;
  serviceConsole.updateProgress();
  for (const button of signalButtons) button.disabled = diagnosis.has(Number(button.dataset.signal));
}
for (const button of signalButtons) {
  button.onclick = () => {
    const crystal = crystals.find((item) => !item.awake && item.note === Number(button.dataset.signal));
    if (crystal) touchCrystal(crystal, crystal.mesh.getWorldPosition(new THREE.Vector3()));
  };
}
const serviceConsole = createServiceConsole({
  navigate: visitIsland,
  getProgress: () => diagnosis.size === 3,
  onComplete: saveGame,
});
function visitIsland(id) {
  const isl = id === CENTRAL.id ? CENTRAL : ISLANDS.find(item => item.id === id);
  if (!isl) return;
  if (P.active) $('#bExplore').click();
  intro = 1;
  followWhale = false;
  syncFollow();
  const direction = isl.c.clone().setY(0);
  if (direction.lengthSq() < 1) direction.set(-1, 0, 1);
  direction.normalize();
  const target = isl.c.clone().add(new THREE.Vector3(0, 3, 0));
  const side = new THREE.Vector3(-direction.z, 0, direction.x);
  const cameraPosition = isl === CENTRAL ? new THREE.Vector3(-20, 16, 26)
    : isl.c.clone().addScaledVector(direction, -22).addScaledVector(side, 5).add(new THREE.Vector3(0, 13, 0));
  flyTo(target, cameraPosition);
  $('#diagnosisTools').classList.toggle('is-open', isl === CENTRAL);
  if (isl === CENTRAL || id === 'nido') serviceConsole.close();
  else serviceConsole.open(id);
}
function visitService(id) { if (P.active) serviceConsole.open(id); else visitIsland(id); }
$('#bUnderstand').onclick = () => visitIsland(CENTRAL.id);
$('#bDragon').onclick = () => {
  $('#diagnosisTools').classList.remove('is-open');
  serviceConsole.close();
  const orca = DRAGONS[0];
  if (!orca) return;
  if (P.mode === 'ride') {
    toast('Pulsa F o usa el control táctil para bajar cuando estés sobre tierra.');
    return;
  }
  if (!isAvatarLook(P.look)) { openAvatarMaker(true); return; }
  if (!P.active) $('#bExplore').click();
  mount(orca);
};
function orcaPosition(out) { return out.copy(DRAGONS[0]?.head ?? CENTRAL.c); }
function syncFollow() { $('#bWhale').classList.toggle('on', followWhale === 'whale'); if (followWhale) { controls.autoRotate = false; $('#bRotate').classList.remove('on'); } }
$('#glow').oninput = (e) => { bloom.strength = +e.target.value; };
let followWhale = false;

let intro = params.has('still') ? 1 : -1;
const camEnd = new THREE.Vector3(-96, 52, 118), endTarget = new THREE.Vector3(-10, 2, 12);
// opening shot: down from the clouds, past the O R-K letters, through the doors, up at the lobby logo and out through the dome
const INTRO_SECS = 14;
const ED = new THREE.Vector3(Math.cos(pavilion.entranceAngle), 0, Math.sin(pavilion.entranceAngle)), EP = new THREE.Vector3(-ED.z, 0, ED.x);
const at = (d, side, y) => ED.clone().multiplyScalar(d).addScaledVector(EP, side).setY(y);
const camPath = new THREE.CatmullRomCurve3([at(260, -40, 110), at(150, 14, 22), at(104, 7, 4.5), at(68, 0, 3.4), at(30, 0, 7.5), at(16, 8, 7), at(46, 10, 24), camEnd], false, 'centripetal');
const tgtPath = new THREE.CatmullRomCurve3([at(0, 0, 2), at(80, 0, 3), at(66, 0, 4.5), at(0, 0, 7), new THREE.Vector3(0, 13, 0), new THREE.Vector3(0, 13, 0), new THREE.Vector3(0, 8, 0), endTarget], false, 'centripetal');
const camStart = camPath.getPointAt(0);
camera.position.copy(intro === 1 ? camEnd : camStart);
const skipIntro = () => { if (intro >= 0 && intro < 1) intro = 0.999; };
addEventListener('keydown', skipIntro); renderer.domElement.addEventListener('pointerdown', skipIntro);
controls.target.copy(intro === 1 ? endTarget : tgtPath.getPoint(0));
if (params.has('foto')) document.body.classList.add('foto');
if (params.get('cam')) { const c = params.get('cam').split(',').map(Number); camera.position.set(c[0], c[1], c[2]); controls.target.set(c[3], c[4], c[5]); intro = 1; controls.autoRotate = false; }
$('#enter').onclick = () => {
  initAudio();
  const L = $('#loader'); L.style.opacity = 0; setTimeout(() => L.remove(), 1300);
  const cine = intro < 0 && !params.get('cam');
  if (intro < 0) intro = 0;
  const T0 = cine ? INTRO_SECS * 1000 - 1200 : 600;
  if (cine) { document.body.classList.add('cine'); controls.autoRotate = false; }
  setTimeout(() => $('#title').style.opacity = 1, cine ? 8200 : 600);
  ['#hud', '#hint', '#counter', '#labels'].forEach((s, i) => setTimeout(() => $(s).style.opacity = 1, T0 + 350 + i * 350));
  setTimeout(() => $('#title').style.opacity = 0, cine ? 15500 : 7500);
  if (params.get('cls')) setClass(params.get('cls'));
  else if (!isAvatarLook(P.look) && !params.has('explore') && !params.has('still') && !params.get('cam')) { const wait = () => (intro < 1 ? setTimeout(wait, 300) : setTimeout(() => openAvatarMaker(true), 900)); wait(); }
  if (params.has('explore') || params.get('room')) $('#bExplore').click();
  if (params.get('room')) { const e = ENTRANCES_ALL().find(e => e.room.id === params.get('room')); if (e) setTimeout(() => enterDoor({ exit: false, e }), 300); }
  if (params.has('whale')) $('#bWhale').click();
};

// ======================================================================
//  main loop
// ======================================================================
const clock = new THREE.Clock();
const _v = new THREE.Vector3(), _w = new THREE.Vector3();
let nextSong = 12;
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  world.time = t;
  if (intro >= 0 && intro < 1) {
    intro = Math.min(1, intro + dt / INTRO_SECS); const e = intro * intro * (3 - 2 * intro);
    camera.position.copy(camPath.getPointAt(e)); controls.target.copy(tgtPath.getPoint(camPath.getUtoTmapping(e)));   // target follows the same keyframe as the camera
    if (intro >= 1) { document.body.classList.remove('cine'); controls.autoRotate = $('#bRotate').classList.contains('on'); camera.position.copy(camEnd); controls.target.copy(endTarget); }
  }
  if (fly) {
    fly.t = Math.min(1, fly.t + dt / fly.dur); const e = fly.t < 0.5 ? 4 * fly.t ** 3 : 1 - Math.pow(-2 * fly.t + 2, 3) / 2;
    controls.target.lerpVectors(fly.a, fly.b, e); camera.position.lerpVectors(fly.ca, fly.cb, e); if (fly.t >= 1) fly = null;
  }
  if (followWhale && !P.active) {
    whalePosition(_w);
    const delta = _v.copy(_w).sub(controls.target).multiplyScalar(Math.min(1, dt * 2));
    controls.target.add(delta); camera.position.add(delta);
    if (camera.position.distanceTo(controls.target) > 40) camera.position.lerp(controls.target, dt);
  }
  if (P.active) updatePlayer(dt, t); else controls.update();
  updateEnvironment(dt, t);
  pavilion.update(t);
  updateSkyLife(dt, t);
  animateDistricts(t);
  updateDragons(dt, t);
  updateCombat(dt, t, P);
  updateInteriors(dt, t);
  updatePet(dt, t, P.active ? P.pos : controls.target, ENEMIES, petFire);
  if (P.active) gameplayTick(dt, t);
  questMarkersTick(t);
  if (dragonFiring() && !roared) { roared = true; roar(); } if (!dragonFiring()) roared = false;
  if (params.has('dragoncam')) { orcaPosition(_w); controls.target.copy(_w); camera.position.copy(_w).add(new THREE.Vector3(-9, 4, 9)); }
  if (params.has('whalecam')) { whalePosition(_w); controls.target.copy(_w); camera.position.copy(_w).add(new THREE.Vector3(-20, 7, 16)); }
  for (const n of NPCS) n.update(dt, t);
  if (ffU) { ffU.time.value = t; ffU.boost.value = world.mode; }

  // crystal island life
  if (centralCrystal) centralCrystal.rotateY(dt * 0.25);
  runeRings.forEach((r, i) => r.rotateY(dt * (i % 2 ? -0.35 : 0.5)));
  floatRocks.forEach((r) => { r.obj.position.y = r.y + Math.sin(t * r.sp + r.ph) * 0.45; r.obj.rotation.y += dt * 0.05 * r.sp; });
  crystals.forEach((c, i) => {
    c.pulse = Math.max(0, c.pulse - dt * 1.3);
    c.mat.emissiveIntensity = 0.7 + Math.sin(t * 1.3 + i) * 0.15 + (c.mesh === hovered ? 0.7 : 0) + (c.awake ? 0.35 : 0) + c.pulse * 3 + world.mode * 0.1;
    c.mesh.scale.copy(c.s0).multiplyScalar(1 + c.pulse * 0.08);
  });
  mushrooms.forEach((m, i) => {
    m.bounce = Math.max(0, m.bounce - dt * 2.2); const k = 1 + Math.sin(m.bounce * Math.PI * 3) * m.bounce * 0.5;
    m.mesh.scale.set(m.base.x * (2 - k), m.base.y * k, m.base.z * (2 - k));
    m.mesh.material.emissiveIntensity = 1.6 + Math.sin(t * 2 + i * 1.7) * 0.6 + m.bounce * 5 + world.mode * 1.2 + (m.mesh === hovered ? 1.5 : 0);
  });

  // bursts
  for (let i = 0; i < BURST; i++) {
    if (bLife[i] <= 0) continue;
    bVel[i * 3 + 1] -= 2.2 * dt; bVel[i * 3] *= 0.985; bVel[i * 3 + 2] *= 0.985;
    bPos[i * 3] += bVel[i * 3] * dt; bPos[i * 3 + 1] += bVel[i * 3 + 1] * dt; bPos[i * 3 + 2] += bVel[i * 3 + 2] * dt;
    bLife[i] -= dt * 0.55;
  }
  bGeo.attributes.position.needsUpdate = true; bGeo.attributes.life.needsUpdate = true; bGeo.attributes.color.needsUpdate = true;

  // whale song
  if (t > nextSong && ac) { whalePosition(_w); whaleSong(_w.distanceTo(camera.position)); nextSong = t + rr(22, 38); }

  // speech bubble follows the speaker
  const bub = $('#bubble');
  if (talking) {
    _v.copy(talking.root.position); _v.y += (talking.m.h ?? 1.3) + 0.35; _v.project(camera);
    if (_v.z < 1) { bub.style.left = ((_v.x + 1) / 2 * innerWidth) + 'px'; bub.style.top = ((1 - _v.y) / 2 * innerHeight) + 'px'; }
  }
  // labels
  for (const L of labels) {
    _v.copy(L.isl.c); _v.y += L.h; const d = _v.distanceTo(camera.position); _v.project(camera);
    const vis = _v.z < 1 && d < 380 && d > (P.active ? 14 : 6);
    L.el.style.display = vis ? 'block' : 'none';
    if (vis) { L.el.style.transform = `translate(-50%,-50%) translate(${(_v.x + 1) / 2 * innerWidth}px, ${(1 - _v.y) / 2 * innerHeight}px)`; L.el.style.opacity = Math.min(1, (380 - d) / 80); }
  }
  composer.render();
  requestAnimationFrame(tick);
}
tick();
