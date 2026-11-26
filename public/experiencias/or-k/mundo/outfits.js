// Re-tailors the KayKit adventurers into pavilion people. Instead of their fantasy texture, every vertex is
// re-mapped (once per body type) to a clothing "role" picked from its skeleton bone and position: hands → skin,
// feet → shoes, legs → trousers, torso → jacket with an open collar, shirt and tie, plus a belt. Each person
// then only needs a tiny palette texture (16 roles × 32 px of soft vertical shading), so outfits are cheap.
import * as THREE from 'three';

export const ROLE = { skin: 0, hair: 1, eyes: 2, jacket: 3, shirt: 4, pants: 5, shoes: 6, tie: 7, forearm: 8, belt: 9 };
const NR = 16, PH = 32;
const geoCache = new Map(), palCache = new Map();

// gentle top-light → bottom-shade ramp, like the original swatches
const ramp = (v) => 1.07 - 0.2 * v;

function palette(o) {
  const key = JSON.stringify(o);
  if (palCache.has(key)) return palCache.get(key);
  const cols = [o.skin, o.hair, 0x1b1c21, o.jacket, o.shirt, o.pants, o.shoes, o.tie ?? o.shirt, o.forearm ?? o.jacket, o.belt ?? 0x1a1a1d];
  const data = new Uint8Array(NR * PH * 4);
  for (let y = 0; y < PH; y++) for (let x = 0; x < NR; x++) {
    const hex = cols[x] ?? 0x808080, k = ramp(y / (PH - 1)), i = (y * NR + x) * 4;   // raw sRGB bytes (texture is tagged sRGB)
    data[i] = Math.min(255, ((hex >> 16) & 255) * k); data[i + 1] = Math.min(255, ((hex >> 8) & 255) * k); data[i + 2] = Math.min(255, (hex & 255) * k); data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, NR, PH); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
  palCache.set(key, t); return t;
}

// soft rim light so the little people read against the floor (shared program for everyone)
function clothMaterial(map) {
  const m = new THREE.MeshStandardMaterial({ map, roughness: 0.72, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float rim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);
      totalEmissiveRadiance += vec3(0.75, 0.8, 1.0) * rim * 0.16;`);
  };
  m.customProgramCacheKey = () => 'orkcloth';
  return m;
}

const cellOf = (u, v) => [Math.min(7, Math.floor(u * 8)), Math.min(3, Math.floor(v * 4))];

function remap(mesh, type) {
  const key = type + '|' + mesh.name;
  if (geoCache.has(key)) return geoCache.get(key);
  // one role per triangle (un-indexed), so colours never smear across a face
  const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  const uv = g.attributes.uv, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  const bones = mesh.skeleton.bones.map(b => b.name);
  g.computeBoundingBox(); const bb = g.boundingBox, H = bb.max.y - bb.min.y, W = bb.max.x - bb.min.x, xc = (bb.max.x + bb.min.x) / 2, D = bb.max.z - bb.min.z;
  const isHead = /Head/.test(mesh.name), isBody = /Body/.test(mesh.name), isArm = /Arm/.test(mesh.name), isLeg = /Leg/.test(mesh.name);
  const skinCells = new Set(['0,0', ...(type === 'Mage' ? ['7,2'] : [])]);
  for (let f = 0; f < uv.count; f += 3) {
    const bw = {}, cells = {}; let x = 0, y = 0, z = 0;
    for (let i = f; i < f + 3; i++) {
      for (let k = 0; k < 4; k++) { const b = bones[si.getComponent(i, k)] ?? ''; bw[b] = (bw[b] ?? 0) + sw.getComponent(i, k); }
      const [cx, cy] = cellOf(uv.getX(i), uv.getY(i)), c = cx + ',' + cy; cells[c] = (cells[c] ?? 0) + 1;
      x += pos.getX(i) / 3; y += pos.getY(i) / 3; z += pos.getZ(i) / 3;
    }
    const bone = Object.entries(bw).sort((a, b) => b[1] - a[1])[0][0], cell = Object.entries(cells).sort((a, b) => b[1] - a[1])[0][0];
    const h = (y - bb.min.y) / H;
    let r;
    if (isHead) r = cell === '0,0' ? ROLE.skin : cell === '2,0' ? ROLE.eyes : ROLE.hair;
    else if (skinCells.has(cell)) r = ROLE.skin;
    else if (/hand|wrist/.test(bone)) r = ROLE.skin;
    else if (/foot|toes/.test(bone)) r = ROLE.shoes;
    else if (isLeg) r = ROLE.pants;
    else if (isArm) r = /lowerarm/.test(bone) ? ROLE.forearm : ROLE.jacket;
    else if (isBody) {
      const front = z > bb.min.z + D * 0.6, dx = Math.abs(x - xc) / W;
      if (h < 0.25) r = ROLE.pants;
      else if (h < 0.32) r = ROLE.belt;
      else if (front && h > 0.52 && dx < 0.05) r = ROLE.tie;
      else if (front && h > 0.5 && dx < 0.05 + (h - 0.5) * 0.5) r = ROLE.shirt;
      else r = ROLE.jacket;
    } else r = ROLE.jacket;
    for (let i = f; i < f + 3; i++) { const [, cy] = cellOf(uv.getX(i), uv.getY(i)); uv.setXY(i, (r + 0.5) / NR, Math.min(0.98, Math.max(0.02, uv.getY(i) * 4 - cy))); }
  }
  uv.needsUpdate = true;
  geoCache.set(key, g); return g;
}

// dress a model made by models.instantiate() (KayKit person). Accessories stay as they were (hidden or not).
export function dress(model, type, outfit) {
  const mat = clothMaterial(palette(outfit));
  model.inner.traverse((c) => {
    if (!c.isSkinnedMesh || !/(Body|Head|Arm|Leg)/.test(c.name)) return;
    c.geometry = remap(c, type); c.material = mat;
  });
  model.outfit = outfit;
  return model;
}

// ---- wardrobe ----
export const SKIN = [0xf5cfb0, 0xeab894, 0xd29b74, 0xb07a55, 0x8a5a3c, 0x5e3b27];
export const HAIR = [0x231a15, 0x3b281d, 0x5e3f28, 0x18181b, 0xa7804f, 0x8d8d92, 0x6e3420, 0xc9a46c];
const pick = (a, r = Math.random) => a[Math.floor(r() * a.length)];
// O R-K team: charcoal suit, white shirt, tie in the colour of their service
export function staffOutfit(accent, r = Math.random) {
  return { skin: pick(SKIN, r), hair: pick(HAIR, r), jacket: 0x2a2c33, shirt: 0xf3f1ed, pants: 0x2a2c33, shoes: 0x141519, tie: accent, forearm: 0x2a2c33, belt: 0x141519 };
}
// visitors: smart-casual mixes
const TOPS = [0xf1efe9, 0x24304a, 0xb4956c, 0x5d6b4b, 0x9db4cc, 0xa95a3e, 0x1c1d21, 0x7d828c, 0xd6c6a6, 0x6b4a6e, 0x3f5d62];
const PANTS = [0x33445e, 0x283246, 0xc5b595, 0x1c1d21, 0x62656c, 0x4a3f36];
const SHOES = [0xf1f1ef, 0x18181b, 0x5a3a26, 0x9a7a5a];
export function visitorOutfit(r = Math.random) {
  const top = pick(TOPS, r), pants = pick(PANTS, r), style = r();
  const o = { skin: pick(SKIN, r), hair: pick(HAIR, r), jacket: top, pants, shoes: pick(SHOES, r), belt: pick([0x1a1a1d, 0x5a3a26], r) };
  if (style < 0.35) { o.shirt = top; o.tie = top; o.forearm = o.skin; }                         // t-shirt
  else if (style < 0.75) { o.shirt = pick([0xf3f1ed, 0x1c1d21, 0xd9d3c7], r); o.tie = o.shirt; o.forearm = top; }   // jacket over a tee
  else { o.shirt = top; o.tie = top; o.forearm = top; }                                           // sweater
  return o;
}
