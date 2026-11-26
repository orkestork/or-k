// Downloaded CC0 models (KayKit Adventurers, Quaternius animals): loading, normalising
// size/orientation, cloning skinned instances, and animation playback helpers.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

// size: target height (people) or target body length (animals). yaw: rotation so the model faces +Z.
export const DEFS = {
  Knight:      { url: 'modelos/personajes/Knight.glb',       height: 1.3, yaw: 0 },
  Barbarian:   { url: 'modelos/personajes/Barbarian.glb',    height: 1.3, yaw: 0 },
  Mage:        { url: 'modelos/personajes/Mage.glb',         height: 1.3, yaw: 0 },
  Rogue:       { url: 'modelos/personajes/Rogue.glb',        height: 1.25, yaw: 0 },
  RogueHooded: { url: 'modelos/personajes/Rogue_Hooded.glb', height: 1.25, yaw: 0 },
  SkMinion:  { url: 'modelos/enemigos/Skeleton_Minion.glb',  height: 1.3, yaw: 0 },
  SkRogue:   { url: 'modelos/enemigos/Skeleton_Rogue.glb',   height: 1.3, yaw: 0 },
  SkWarrior: { url: 'modelos/enemigos/Skeleton_Warrior.glb', height: 1.35, yaw: 0 },
  SkMage:    { url: 'modelos/enemigos/Skeleton_Mage.glb',    height: 1.3, yaw: 0 },
  Cow:     { url: 'modelos/animales/Cow.glb',     length: 1.9, yaw: 0 },
  Horse:   { url: 'modelos/animales/Horse.glb',   length: 2.1, yaw: 0 },
  Zebra:   { url: 'modelos/animales/Zebra.glb',   length: 2.0, yaw: 0 },
  Pig:     { url: 'modelos/animales/Pig.glb',     length: 1.0, yaw: 0 },
  Llama:   { url: 'modelos/animales/Llama.glb',   length: 1.3, yaw: 0 },
  Sheep:   { url: 'modelos/animales/Sheep.glb',   length: 1.0, yaw: 0 },
  Pug:     { url: 'modelos/animales/Pug.glb',     length: 0.55, yaw: 0 },
  Dog:     { url: 'modelos/animales/Dog.glb',     length: 0.85, yaw: Math.PI / 2, tint: 0xb07a40 },
  Cat:     { url: 'modelos/animales/Cat.glb',     length: 0.55, yaw: Math.PI / 2, tint: 0x3a3a40 },
  Wolf:    { url: 'modelos/animales/Wolf.glb',    length: 1.3, yaw: Math.PI / 2, tint: 0xd8d4cc },
  Eagle:   { url: 'modelos/animales/Eagle.glb',   length: 1.6, yaw: 0, wings: true, tint: 0x6a4428 },
};
export const MODELS = {};
// modular heads built in Blender (scripts/blender/build_heads.py): faces, hairstyles, beard and brows
export const HEADS = { scene: null };

export async function loadModels(onProgress, base = '') {
  const loader = new GLTFLoader();
  const names = Object.keys(DEFS); let done = 0;
  await Promise.all(names.map(async (n) => {
    const def = DEFS[n];
    const gltf = await loader.loadAsync(base + def.url);
    gltf.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(gltf.scene), size = box.getSize(new THREE.Vector3());
    let scale;
    if (def.height) scale = def.height / size.y;
    else scale = def.length / (def.wings ? Math.max(size.x, size.z) : Math.max(size.x, size.z));
    MODELS[n] = { gltf, scale, minY: box.min.y, size, clips: gltf.animations };
    onProgress && onProgress(++done / names.length);
  }));
  try { HEADS.scene = (await loader.loadAsync(base + 'modelos/personajes/Heads.glb')).scene; } catch (e) { console.warn('Heads.glb no disponible', e); }
  return MODELS;
}

const clipFind = (clips, keys) => { for (const k of keys) { const c = clips.find(c => c.name.toLowerCase().endsWith(k.toLowerCase()) || c.name.toLowerCase().includes('|' + k.toLowerCase())); if (c) return c; } return null; };

// returns a model object compatible with the NPC system (kind 'gltf')
export function instantiate(name, o = {}) {
  const M = MODELS[name], def = DEFS[name];
  const root = new THREE.Group(), inner = SkeletonUtils.clone(M.gltf.scene);
  const s = M.scale * (o.scale ?? 1);
  inner.scale.setScalar(s);
  inner.position.y = -M.minY * s;
  inner.rotation.y = def.yaw;
  root.add(inner);
  // accessories: hide everything listed in o.hide (substring match), keep o.show
  const tintHex = o.tint ?? def.tint, tint = tintHex !== undefined ? new THREE.Color(tintHex) : null;
  inner.traverse((c) => {
    if (!c.isMesh) return;
    c.castShadow = true; c.receiveShadow = false; c.frustumCulled = false;
    if (o.hide && o.hide.some(h => c.name.includes(h)) && !(o.show && o.show.some(h => c.name === h))) c.visible = false;
    if (tint && (!o.tintParts || o.tintParts.some(p => c.name.includes(p)))) { c.material = c.material.clone(); c.material.color.multiply(tint).multiplyScalar(def.height ? 1 : 1.25); }
  });
  const mixer = new THREE.AnimationMixer(inner);
  const A = {};
  const want = {
    idle: ['Idle', 'Unarmed_Idle'], walk: ['Walking_A', 'Walk', 'Walking', 'WalkSlow'], run: ['Running_A', 'Run', 'Walking'],
    sit: ['Sit_Floor_Idle'], sitChair: ['Sit_Chair_Idle'], cheer: ['Cheer'], talk: ['Interact', 'Cheer'], cast: ['Spellcasting'], jump: ['Jump_Full_Short', 'Jump'],
    jumpIdle: ['Jump_Idle'], fly: ['Flying'], pick: ['PickUp'], lie: ['Lie_Idle'], use: ['Use_Item'],
    attack: ['1H_Melee_Attack_Slice_Horizontal', '1H_Melee_Attack_Chop'], attack2: ['1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal'],
    attack3: ['1H_Melee_Attack_Stab', '2H_Melee_Attack_Spin'], slam: ['2H_Melee_Attack_Chop', '1H_Melee_Attack_Jump_Chop'],
    hit: ['Hit_A', 'Hit_B'], death: ['Death_A', 'Death_C_Skeletons'], spawn: ['Spawn_Ground_Skeletons', 'Spawn_Ground'],
    h2a: ['2H_Melee_Attack_Slice'], h2b: ['2H_Melee_Attack_Chop'], h2c: ['2H_Melee_Attack_Spin'], shoot: ['Spellcast_Shoot', '1H_Ranged_Shoot'], raise: ['Spellcast_Raise', 'Spellcast_Long'],
    taunt: ['Taunt'], combat: ['Idle_Combat', '2H_Melee_Idle', 'Idle'], walkSk: ['Walking_D_Skeletons', 'Walking_A'], block: ['Blocking'],
  };
  for (const [k, keys] of Object.entries(want)) { const c = clipFind(M.clips, keys); if (c) A[k] = mixer.clipAction(c); }
  if (o.idleClip) { const c = M.clips.find(c => c.name === o.idleClip); if (c) A.idle = mixer.clipAction(c); }
  if (o.walkClip) { const c = M.clips.find(c => c.name === o.walkClip); if (c) A.walk = mixer.clipAction(c); }
  // hitbox for picking (raycasting skinned meshes is slow)
  const hb = new THREE.Mesh(new THREE.CylinderGeometry(def.height ? 0.32 : (def.length * 0.35), def.height ? 0.32 : (def.length * 0.35), (def.height ?? def.length * 0.8) * (o.scale ?? 1), 8),
    new THREE.MeshBasicMaterial({ visible: false }));
  hb.position.y = (def.height ?? def.length * 0.8) * (o.scale ?? 1) / 2; root.add(hb);
  const m = { root, inner, mixer, A, cur: null, kind: 'gltf', name, baseY: inner.position.y, h: (def.height ?? def.length * 0.75) * (o.scale ?? 1), s: o.scale ?? 1, hitbox: hb, speedRef: o.speedRef ?? 1.0 };
  play(m, 'idle', 0);
  if (m.cur) m.cur.time = Math.random() * m.cur.getClip().duration;
  return m;
}
export function play(m, key, fade = 0.25, timeScale = 1) {
  if (m.busy > 0) return;            // a one-shot (attack, hit…) is playing
  const a = m.A[key] || m.A.idle; if (!a) return;
  a.timeScale = timeScale;
  if (m.cur === a) return;
  a.reset().setEffectiveWeight(1).fadeIn(fade).play();
  if (m.cur) m.cur.fadeOut(fade);
  m.cur = a; m.curKey = key;
}
export function attachToBone(m, boneNameIncludes, object) {
  let bone = null; m.inner.traverse(c => { if (!bone && c.isBone && c.name.toLowerCase().includes(boneNameIncludes)) bone = c; });
  if (bone) { bone.add(object); object.scale.divideScalar(MODELS[m.name].scale * (m.s || 1)); }
  return bone;
}

// play a clip once (attack, hit, death…); locks other animations until it ends
export function oneShot(m, key, fade = 0.1, timeScale = 1, hold = false) {
  const a = m.A[key]; if (!a) return 0;
  a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = timeScale;
  a.setEffectiveWeight(1).fadeIn(fade).play();
  if (m.cur && m.cur !== a) m.cur.fadeOut(fade);
  m.cur = a; m.curKey = key;
  const dur = a.getClip().duration / timeScale;
  m.busy = hold ? 1e9 : dur * 0.92;
  return dur;
}
export function tickModel(m, dt) { if (m.busy > 0) m.busy -= dt; m.mixer.update(dt); }
// copy a prop (e.g. the Knight's sword) onto another KayKit rig, in the same bone
export function borrowProp(fromModel, propName, toModel) {
  const src = MODELS[fromModel].gltf.scene.getObjectByName(propName);
  if (!src || !src.parent) return null;
  const boneName = src.parent.name;
  let bone = null; toModel.inner.traverse(c => { if (!bone && c.name === boneName) bone = c; });
  if (!bone) return null;
  const p = src.clone(); p.castShadow = true; p.visible = true; bone.add(p);
  return p;
}
