// Dev tool: exports the static pavilion (geometry + base/emissive colours) as GLB for the Blender light bake.
// Loaded only with ?bakeexport and posted to the dev-only /api/dev-bake endpoint.
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

const visibleInWorld = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
const firstMat = (m) => (Array.isArray(m) ? m.find(Boolean) : m);

export async function exportForBake(scene, floorMesh) {
  scene.updateMatrixWorld(true);
  const out = new THREE.Scene(), cache = new Map(), _m = new THREE.Matrix4(), box = new THREE.Box3();
  const matFor = (m) => {
    const c = m.color ? m.color.clone() : new THREE.Color(0.8, 0.8, 0.8);
    let base = c.clone(), em = new THREE.Color(0, 0, 0), rough = m.roughness ?? 0.7;
    if (m.isMeshBasicMaterial) {
      // neon / LED / screens: they emit light in the bake
      em = c.clone().multiplyScalar(m.map ? 0.55 : 1); base = new THREE.Color(0.05, 0.05, 0.05);
    } else if (m.emissive) {
      em = m.emissive.clone().multiplyScalar((m.emissiveIntensity ?? 1) * (m.emissiveMap ? 0.35 : 1));
      if (m.map) base.multiplyScalar(0.85);
    }
    const strength = Math.max(1, em.r, em.g, em.b);
    const key = base.getHexString() + em.getHexString() + strength.toFixed(2) + rough.toFixed(1);
    if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color: base, emissive: em.clone().multiplyScalar(1 / strength), emissiveIntensity: strength, roughness: rough, metalness: 0 }));
    return cache.get(key);
  };
  const add = (geo, matrix, mat, name) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', geo.attributes.position.clone());
    if (geo.attributes.normal) g.setAttribute('normal', geo.attributes.normal.clone());
    if (geo.index) g.setIndex(geo.index.clone());
    g.applyMatrix4(matrix);
    const mesh = new THREE.Mesh(g, mat); mesh.name = name; out.add(mesh);
  };
  let n = 0;
  scene.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || !visibleInWorld(o) || !o.geometry?.attributes?.position) return;
    const m = firstMat(o.material); if (!m) return;
    if (m.isShaderMaterial && o !== floorMesh) return;                     // sky, clouds, mirror, beams, motes
    if (m.transparent || m.blending === THREE.AdditiveBlending) return;    // glass, holograms, glows
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    box.setFromObject(o); if (box.getCenter(new THREE.Vector3()).length() > 140) return;   // planet, moon, far puffs
    if (o === floorMesh) { add(o.geometry, o.matrixWorld, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), 'HALL_FLOOR'); return; }
    const mat = matFor(m);
    if (o.isInstancedMesh) {
      for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, _m); add(o.geometry, _m.premultiply(o.matrixWorld).clone(), mat, `inst_${n++}`); }
    } else add(o.geometry, o.matrixWorld, mat, `m_${n++}`);
  });
  const glb = await new GLTFExporter().parseAsync(out, { binary: true });
  const res = await fetch('/api/dev-bake', { method: 'POST', body: glb });
  document.title = `BAKE-EXPORT ${res.status} meshes=${out.children.length} bytes=${glb.byteLength}`;
  console.log(document.title);
}
