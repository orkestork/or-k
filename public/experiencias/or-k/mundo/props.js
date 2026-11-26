// Real CC0 props from Poly Haven (furniture, plants, decor) + a studio HDRI for realistic reflections.
// Anything can requestProp() while the world is being built; props appear once their models load.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { scene, renderer, LOW } from './core.js';

const BASE = 'modelos/props/';
export const PROPS = {
  armchair:   { url: 'modern_arm_chair_01/modern_arm_chair_01.gltf', shadow: true },
  lounge:     { url: 'mid_century_lounge_chair/mid_century_lounge_chair.gltf', shadow: true },
  roundTable: { url: 'coffee_table_round_01/coffee_table_round_01.gltf', shadow: true },
  woodTable:  { url: 'modern_coffee_table_01/modern_coffee_table_01.gltf', shadow: true },
  plantTall:  { url: 'potted_plant_01/potted_plant_01_lod.glb', heavy: true },
  plant:      { url: 'potted_plant_02/potted_plant_02_lod.glb', heavy: true },
  succulent:  { url: 'potted_plant_04/potted_plant_04.gltf' },
  pendant:    { url: 'modern_ceiling_lamp_01/modern_ceiling_lamp_01.gltf' },
  vase:       { url: 'ceramic_vase_01/ceramic_vase_01.gltf' },
  whale:      { url: 'bronze_whale_statue/bronze_whale_statue.gltf', shadow: true },
  // modelled for the pavilion in Blender (scripts/blender/build_furniture.py)
  sofaModule: { url: 'custom/sofa_module.glb', shadow: true },
  sofaArm:    { url: 'custom/sofa_arm.glb', shadow: true },
  standWall:  { url: 'custom/stand_wall.glb', shadow: true },
};
const queue = [], templates = {}, waiting = [];
let ready = false;

export function requestProp(name, x, y, z, yaw = 0, scale = 1) {
  const req = { name, x, y, z, yaw, scale };
  if (ready) spawn(req); else queue.push(req);
}
function spawn({ name, x, y, z, yaw, scale }) {
  const t = templates[name]; if (!t) return;
  if (LOW && PROPS[name].heavy && Math.random() < 0.5) return;   // lighter on phones
  const o = t.clone(true); o.position.set(x, y, z); o.rotation.y = yaw; o.scale.setScalar(scale);
  scene.add(o);
}

export async function loadProps(onProgress) {
  const loader = new GLTFLoader(), names = Object.keys(PROPS); let done = 0;
  await Promise.all(names.map(async (n) => {
    try {
      const g = await loader.loadAsync(BASE + PROPS[n].url);
      g.scene.traverse(o => { if (o.isMesh) { o.castShadow = !!PROPS[n].shadow; o.receiveShadow = true; } });
      templates[n] = g.scene;
    } catch (e) { console.warn('prop no disponible', n, e); }
    onProgress?.(++done / names.length);
  }));
  ready = true;
  for (const r of queue.splice(0)) spawn(r);
  for (const [n, cb] of waiting.splice(0)) if (templates[n]) cb(templates[n].clone(true));
}

// studio HDRI: real soft reflections on metals, glass and polished floors
export function loadEnvironment(intensity = 0.55) {
  return new Promise((resolve) => {
    new RGBELoader().load('entorno/pav_studio_03_1k.hdr', (hdr) => {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromEquirectangular(hdr).texture;
      scene.environmentIntensity = intensity;
      hdr.dispose(); pmrem.dispose(); resolve(true);
    }, undefined, () => resolve(false));
  });
}

// oak veneer PBR set (diffuse / normal / roughness); loaded per material so repeats stay independent
export function oakMaterial(repeatX = 1, repeatY = 1, opts = {}) {
  const tl = new THREE.TextureLoader();
  const [map, normalMap, roughnessMap] = ['diff', 'nor', 'rough'].map(k => {
    const t = tl.load(`entorno/oak/oak_${k}_1k.jpg`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeatX, repeatY);
    if (k === 'diff') t.colorSpace = THREE.SRGBColorSpace; return t;
  });
  return new THREE.MeshStandardMaterial({ map, normalMap, roughnessMap, roughness: 1, ...opts });
}

// any downloaded PBR set in entorno/tex: { map, normalMap, roughnessMap } with an independent repeat
export function pbrMaps(name, repeatX = 1, repeatY = repeatX, which = ['diff', 'nor', 'rough']) {
  const tl = new THREE.TextureLoader(), out = {};
  for (const k of which) {
    const t = tl.load(`entorno/tex/${name}_${k}_1k.jpg`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeatX, repeatY); t.anisotropy = 8;
    if (k === 'diff') { t.colorSpace = THREE.SRGBColorSpace; out.map = t; } else if (k === 'nor') out.normalMap = t; else out.roughnessMap = t;
  }
  return out;
}

// get your own copy of a model once it has loaded (for pieces that need custom materials)
export function onProp(name, cb) { if (ready) { if (templates[name]) cb(templates[name].clone(true)); } else waiting.push([name, cb]); }
