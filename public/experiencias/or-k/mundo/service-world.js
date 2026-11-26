// Service districts: every island is a landmark that shows one O R-K service at a glance.
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { scene, camera, rand, rr, pick, inst, mat4, LOW } from './core.js';
import { ISLANDS, BRIDGES, gy, addObstacle, groundAt, freeSpot } from './terrain.js';
import { roundTree, pineTree, scatterGrass, scatterFlowers } from './decor.js';
import { requestProp, onProp, pbrMaps } from './props.js?v=5';

export const districts = {
  aldea: { name: 'Tecnología y desarrollo', color: 0x67deff, form: 'stacks', brief: 'Una empresa registra los mismos pedidos en tres herramientas.', question: '¿Qué implementarías primero?', options: ['Otro formulario independiente', 'Una plataforma que sincronice los pedidos'], answer: 1, result: 'Una plataforma integrada reduce la digitación repetida y da al equipo una fuente de información compartida.' },
  molino: { name: 'Marketing y performance', color: 0xff698a, form: 'signal', brief: 'La campaña recibe clics, pero el equipo desconoce cuántos terminan en ventas.', question: '¿Qué medirías?', options: ['Sólo el alcance de los anuncios', 'Conversiones y coste por adquisición'], answer: 1, result: 'Medir conversiones y coste por adquisición conecta la inversión con resultados comerciales.' },
  bosque: { name: 'Comunidad y contenido', color: 0xb299ff, form: 'arena', brief: 'Las redes publican a diario, pero la comunidad casi nunca responde.', question: '¿Cómo probarías una mejora?', options: ['Publicar preguntas útiles y medir las conversaciones', 'Duplicar la frecuencia sin cambiar el contenido'], answer: 0, result: 'Las preguntas y los formatos participativos ayudan a entender qué valora la comunidad.' },
  lago: { name: 'Diseño corporativo', color: 0xffca8a, form: 'gallery', brief: 'Un cliente recibe un catálogo, un correo y una web que parecen de marcas distintas.', question: '¿Qué diseñarías primero?', options: ['Un sistema visual para los tres canales', 'Una estética independiente por canal'], answer: 0, result: 'Un sistema visual coherente hace que la marca sea reconocible en cada punto de contacto.' },
  torre: { name: 'Plataformas web', color: 0x8d84ff, form: 'tower', brief: 'Un catálogo grande obliga a los compradores a llamar para encontrar productos.', question: '¿Qué facilitaría la compra?', options: ['Una galería de fotos sin filtros', 'Una búsqueda que filtre por atributos relevantes'], answer: 1, result: 'La búsqueda y los filtros ayudan a encontrar productos y reducen consultas evitables.' },
  ruinas: { name: 'Analítica y KPIs', color: 0x7affd2, form: 'bars', brief: 'Ventas y marketing reportan resultados con definiciones distintas.', question: '¿Qué necesita el tablero?', options: ['Indicadores con definiciones y fuentes compartidas', 'Más gráficas con las métricas actuales'], answer: 0, result: 'Acordar cómo se calcula cada KPI permite comparar resultados y tomar decisiones con confianza.' },
  nido: { name: 'Base Nova', color: 0x9371ff, form: 'dock' },
  helada: { name: 'Producción audiovisual', color: 0xff8fcc, form: 'studio', brief: 'Un lanzamiento debe funcionar en una landing y en formatos verticales.', question: '¿Cómo organizarías la producción?', options: ['Planear un rodaje con encuadres y entregables por canal', 'Recortar automáticamente un solo video al final'], answer: 0, result: 'Planificar las versiones desde el rodaje permite cuidar el encuadre y el mensaje en cada formato.' },
  volcan: { name: 'Branding e identidad', color: 0xff867a, form: 'prism', brief: 'Una marca nueva necesita diferenciarse en una categoría saturada.', question: '¿Dónde empieza el trabajo?', options: ['Elegir una tipografía de moda', 'Definir posicionamiento e identidad a partir de la audiencia'], answer: 1, result: 'El posicionamiento guía las decisiones visuales y ayuda a que la marca se distinga por algo relevante.' },
};

// ---------------------------------------------------------------------------
//  shared resources
// ---------------------------------------------------------------------------
const BRAND = 0x7c3cff;
const ticks = [];
const U = { time: { value: 0 } };
const deckMat = new THREE.MeshStandardMaterial({ color: 0x1d1e23, metalness: 0.65, roughness: 0.38 });
const alloy = new THREE.MeshStandardMaterial({ color: 0x8d9097, metalness: 0.7, roughness: 0.38, envMapIntensity: 0.7 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x141518, metalness: 0.4, roughness: 0.5 });
const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf4f2ee, roughness: 0.35, metalness: 0.1 });
const goldMat = new THREE.MeshStandardMaterial({ color: 0xffc860, emissive: 0xffa020, emissiveIntensity: 0.9, metalness: 0.9, roughness: 0.25 });
const box = new THREE.BoxGeometry(1, 1, 1);
const boxUp = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const pillar = new THREE.CylinderGeometry(1, 1, 1, 6);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 24);
const orb = new THREE.IcosahedronGeometry(1, 1);
const ball = new THREE.SphereGeometry(1, 20, 14);
const css = (c) => '#' + new THREE.Color(c).getHexString();
const Y = new THREE.Vector3(0, 1, 0);

// ---------- canvas textures (redrawn once the web fonts arrive) ----------
const redraws = [];
function canvasTex(w, h, draw, { repeatY = 1 } = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  if (repeatY !== 1) { tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, repeatY); }
  const redraw = (t = 0) => { ctx.clearRect(0, 0, w, h); draw(ctx, w, h, t); tex.needsUpdate = true; };
  redraw(); redraws.push(redraw);
  return { tex, redraw };
}
if (document.fonts) Promise.all([document.fonts.load('40px Anton'), document.fonts.load('600 20px Inter'), document.fonts.load('400 20px Inter')])
  .then(() => redraws.forEach(r => r())).catch(() => {});
function rrect(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
const holoMat = (tex, opacity = 1) => new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const screenMat = (tex, k = 0.95) => new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(k, k, k) });

// ---------- floor: metallic deck with animated circuit rings ----------
function floorMaterial(color, radius) {
  // herringbone parquet stage; the service's neon lines run across the wood
  const m = new THREE.MeshStandardMaterial({ color: 0x9a8b7e, metalness: 0.0, roughness: 1, ...pbrMaps('herringbone_parquet', radius / 1.4, radius / 1.4) });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.time; sh.uniforms.uCol = { value: new THREE.Color(color) }; sh.uniforms.uR = { value: radius };
    sh.vertexShader = 'varying vec2 vL;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvL = position.xy;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = max(roughnessFactor, 0.55);');
    sh.fragmentShader = 'uniform float uTime; uniform vec3 uCol; uniform float uR; varying vec2 vL;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float r = length(vL), a = atan(vL.y, vL.x);
      float rx = r / 1.7; float ring = 1.0 - min(abs(fract(rx - 0.5) - 0.5) / fwidth(rx), 1.0);
      float sx = a / 6.2831853 * 36.0; float spoke = (1.0 - min(abs(fract(sx - 0.5) - 0.5) / fwidth(sx), 1.0)) * smoothstep(uR*0.25, uR*0.45, r);
      float hx = a / 6.2831853 * 12.0 + floor(rx) * 0.5; float seg = step(0.12, abs(fract(hx) - 0.5));
      float wd = (r / uR - fract(uTime * 0.11)) * 9.0; float wave = exp(-wd * wd);
      float rim = smoothstep(uR * 0.93, uR * 0.99, r);
      // booth floor: no game-like grid, just a fine inlay line near the edge in the service colour
      float inlay = 1.0 - min(abs(r - uR * 0.955) / (fwidth(r) * 1.5), 1.0);
      totalEmissiveRadiance += uCol * inlay * 0.35;`);
  };
  m.customProgramCacheKey = () => 'orkfloor';
  return m;
}

// ---------- suspended header: the circular rigging sign real expo booths hang over their stand ----------
function header(group, r, color, label) {
  if (!label) return;
  const R = r * 0.5, y = 9.2, hex = '#' + new THREE.Color(color).getHexString();
  const sign = canvasTex(2048, 128, (c, w, h) => {
    c.fillStyle = '#121317'; c.fillRect(0, 0, w, h);
    c.fillStyle = hex; c.fillRect(0, h - 6, w, 6);
    c.fillStyle = '#d8d5ce'; c.font = '64px Anton'; c.textBaseline = 'middle';
    // the text repeats a whole number of times so the ring has no seam
    const text = `${label.toUpperCase()}  ·  O R-K  ·  `, tw = c.measureText(text).width, n = Math.max(1, Math.round(w / tw));
    c.save(); c.scale(w / (tw * n), 1); for (let k = 0; k < n; k++) c.fillText(text, k * tw, h / 2); c.restore();
  }).tex;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 1.05, 96, 1, true), new THREE.MeshStandardMaterial({ map: sign, emissive: 0xffffff, emissiveMap: sign, emissiveIntensity: 0.1, roughness: 0.6, side: THREE.FrontSide }));
  band.position.y = y; group.add(band);
  // inside face: same sign mirrored so it also reads correctly from under the ring
  const signIn = sign.clone(); signIn.wrapS = THREE.RepeatWrapping; signIn.repeat.x = -1; signIn.needsUpdate = true;
  document.fonts?.load('64px Anton').then(() => setTimeout(() => { signIn.needsUpdate = true; }, 100));   // the copy re-uploads once the font is in
  const bandIn = new THREE.Mesh(band.geometry, new THREE.MeshStandardMaterial({ map: signIn, emissive: 0xffffff, emissiveMap: signIn, emissiveIntensity: 0.1, roughness: 0.6, side: THREE.BackSide }));
  bandIn.position.y = y; bandIn.scale.set(0.995, 1, 0.995); group.add(bandIn);
  for (const dy of [-0.55, 0.55]) { const t = new THREE.Mesh(new THREE.TorusGeometry(R, 0.05, 6, 96), alloy); t.rotation.x = Math.PI / 2; t.position.y = y + dy; group.add(t); }
  // downlights under the ring + hanging cables
  const dl = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 1.55, 1.35), toneMapped: false });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, d = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 16), dl); d.position.set(Math.cos(a) * (R - 0.25), y - 0.6, Math.sin(a) * (R - 0.25)); group.add(d); }
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4, cab = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 12, 4), alloy); cab.position.set(Math.cos(a) * R, y + 6.5, Math.sin(a) * R); group.add(cab); }
  // soft pool of light it throws on the booth
  const pool = new THREE.Mesh(new THREE.CircleGeometry(R * 1.25, 48), new THREE.MeshBasicMaterial({ map: poolTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.2; pool.userData.noAO = true; group.add(pool);
}
let _pool = null;
function poolTex() {
  if (_pool) return _pool;
  _pool = canvasTex(256, 256, (c, w) => { const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,236,210,.35)'); g.addColorStop(0.6, 'rgba(255,226,190,.12)'); g.addColorStop(1, 'rgba(255,220,180,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); }).tex;
  return _pool;
}

// ---------- vertical light beam (a lighthouse for every service) ----------
const beamGeo = new THREE.CylinderGeometry(1, 0.45, 1, 32, 1, true).translate(0, 0.5, 0);
function beamMaterial(color, strength = 0.2) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: U.time, uCol: { value: new THREE.Color(color) }, uS: { value: strength } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.0); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uTime, uS; uniform vec3 uCol; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ float edge = pow(clamp(1.0 - abs(dot(normalize(vN), vV)), 0.0, 1.0), 1.5);
        float fade = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 2.2) * smoothstep(0.0, 0.18, vUv.y);
        float bands = 0.75 + 0.25 * sin(vUv.y * 60.0 - uTime * 3.0);
        gl_FragColor = vec4(uCol * (0.35 + edge) * fade * bands * uS, 1.0); }`,
  });
}

// ---------- rising motes ----------
function motes(group, color, radius, height, n = 90) {
  const pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = rand() * 6.283, r = Math.sqrt(rand()) * radius; pos.set([Math.cos(a) * r, 0, Math.sin(a) * r], i * 3); seed[i] = rand(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: { uTime: U.time, uCol: { value: new THREE.Color(color) }, uH: { value: height }, uPx: { value: 90 * Math.min(devicePixelRatio, 1.75) } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime, uH, uPx; attribute float seed; varying float vA;
      void main(){ float u = fract(seed * 7.13 + uTime * (0.03 + seed * 0.04)); vec3 p = position;
        p.y += u * uH; p.x += sin(uTime * 0.7 + seed * 40.0) * 0.4; p.z += cos(uTime * 0.6 + seed * 30.0) * 0.4;
        vA = sin(u * 3.14159); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = uPx * (0.25 + seed * 0.35) / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uCol; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uCol * 2.2, a * a * vA); }`,
  }));
  pts.frustumCulled = false; group.add(pts);
}

// ---------- geometry helpers ----------
function rodBetween(a, b, radius, mat, parent) {
  const d = new THREE.Vector3().subVectors(b, a), m = new THREE.Mesh(cyl, mat);
  m.scale.set(radius, d.length(), radius);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(Y, d.normalize());
  parent.add(m); return m;
}
function arcTorus(radius, tube, start, arc, mat, parent, y) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 64, arc), mat);
  m.rotation.set(-Math.PI / 2, 0, start); m.position.y = y; parent.add(m); return m;
}
function framedScreen(parent, w, h, mat, { depth = 0.18, frame = alloy, back = true } = {}) {
  const g = new THREE.Group(); parent.add(g);
  const f = new THREE.Mesh(box, frame); f.scale.set(w + 0.22, h + 0.22, depth); g.add(f);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); s.position.z = depth / 2 + 0.01; g.add(s);
  if (back) { const b = s.clone(); b.rotation.y = Math.PI; b.position.z = -depth / 2 - 0.01; g.add(b); }
  return g;
}
const billboard = (obj) => { const p = new THREE.Vector3(); ticks.push(() => { obj.getWorldPosition(p); obj.lookAt(camera.position.x, p.y, camera.position.z); }); };

// ---------------------------------------------------------------------------
//  per-district build
// ---------------------------------------------------------------------------
export function buildDistrict(isl) {
  const def = districts[isl.id] ?? { color: 0xd9c5ff, form: 'core' };
  const { color, form } = def;
  const group = new THREE.Group();
  group.position.copy(isl.c);
  scene.add(group);
  const neon = new THREE.MeshBasicMaterial({ color });
  const neonHot = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.5), toneMapped: false });
  const glass = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, metalness: 0.6, roughness: 0.24 });
  const r = isl.R, S = r / 15;
  const place = (geo, mat, x, y, z, w = 1, h = 1, d = 1, parent = group) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  };
  const ring = (radius, y, thickness = 0.12, mat = neon) => {
    const mesh = place(new THREE.TorusGeometry(radius, thickness, 6, 64), mat, 0, y, 0);
    mesh.rotation.x = Math.PI / 2; mesh.castShadow = false; return mesh;
  };

  if (form === 'core') {   // the Understand crystal island keeps its own GLB look
    ring(r * 0.82, 0.35); ring(r * 0.72, -2.1, 0.18); ring(r * 0.52, -4.1, 0.12);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, x = Math.cos(a) * r * 0.8, z = Math.sin(a) * r * 0.8;
      place(pillar, alloy, x, 0.65, z, 0.42, 1.75, 0.42); place(orb, neon, x, 1.67, z, 0.27, 0.27, 0.27);
    }
    return;
  }

  // orient the island so local +Z faces the bridge you arrive by
  const from = isl.outer ? isl.from ?? ISLANDS.find(i => i.id === isl.link) : null;
  const front = from ? from.c.clone().sub(isl.c) : isl.c.clone().negate();
  const yaw = Math.atan2(front.x, front.z);
  group.rotation.y = yaw;
  group.updateMatrixWorld(true);
  const toIsland = (lx, lz) => new THREE.Vector3(lx, 0, lz).applyAxisAngle(Y, yaw);
  const floorY = (lx, lz) => { const v = toIsland(lx, lz); return Math.max(0.09, gy(isl, v.x, v.z) - isl.c.y); };
  const block = (lx, lz, rad) => { const v = toIsland(lx, lz); addObstacle(isl.c.x + v.x, isl.c.z + v.z, rad); };

  // ---- stand kit: low stage, neon floor ring, queue posts, planters ----
  const deck = place(cyl, deckMat, 0, 0, 0, r * 0.74, 0.18, r * 0.74); deck.castShadow = false;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(r * 0.74, 96), floorMaterial(color, r * 0.74));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.1; floor.receiveShadow = true; group.add(floor);
  place(new THREE.TorusGeometry(r * 0.742, 0.025, 6, 128), neon, 0, 0.17, 0).rotation.x = Math.PI / 2;
  header(group, r, color, def.name ?? '');
  const corridors = [Math.atan2(-isl.c.z, -isl.c.x)];   // the open side faces the lobby
  const free = (a) => corridors.every(c => Math.abs(((a - c) + Math.PI * 3) % (Math.PI * 2) - Math.PI) > 0.55);
  for (let i = 0; i < 14; i++) {
    const a = i * Math.PI / 7, da = Math.abs(((a - Math.PI / 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
    if (da < 0.7) continue;   // leave the front open: that's where visitors walk in
    const x = Math.cos(a) * r * 0.8, z = Math.sin(a) * r * 0.8;
    place(cyl, alloy, x, 0.5, z, 0.045, 1.0, 0.045);
    place(cyl, darkMat, x, 1.0, z, 0.07, 0.03, 0.07).castShadow = false;
  }
  if (!LOW) {   // a warm spotlight over every stand, tinted with the service colour
    const lamp = new THREE.PointLight(new THREE.Color(0xfff1e0).lerp(new THREE.Color(color), 0.25), 16, r * 1.6, 1.2);
    lamp.position.set(0, 13, 0); group.add(lamp);
  }
  const canopy = [0xb89cff, 0xff9ac8, 0x8fe6ff, new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.35).getHex()];
  for (const a of [0.55, 1.35, 2.6, 3.7, 4.9, 5.75]) {
    if (!free(a)) continue;
    const rad = r * 0.86, x = isl.c.x + Math.cos(a) * rad, z = isl.c.z + Math.sin(a) * rad;
    requestProp(rand() < 0.5 ? 'plantTall' : 'plant', x, 0.1, z, rand() * 6, rr(1.5, 1.8));
    addObstacle(x, z, 0.45);
  }

  // ---- the landmark ----
  const k = { isl, group, S, color, neon, neonHot, glass, place, ring, floorY, block };
  const builders = { stacks: tech, signal: marketing, arena: community, gallery: design, tower: web, bars: analytics, studio: studio, prism: branding, dock: dock };
  builders[form]?.(k);
  if (def.brief) reception(k, def.name);
  furnish(k, def, free);
}


// ---------------------------------------------------------------------------
//  "wow" kit: glowing rock veins, hanging crystals, light-falls, orbiting rocks,
//  blossom trees with fairy lights and drifting petals
// ---------------------------------------------------------------------------
const BT = {
  trunk: (() => { const g = new THREE.CylinderGeometry(0.07, 0.15, 1, 6); g.translate(0, 0.5, 0); return g; })(),
  blob: new THREE.IcosahedronGeometry(0.62, 1),
  fairy: new THREE.IcosahedronGeometry(0.06, 0),
  shard: (() => { const g = new THREE.ConeGeometry(0.5, 2.4, 5); g.translate(0, -1.2, 0); return g; })(),  // tip points down
  rock: new THREE.DodecahedronGeometry(1, 0),
};
const BM = {
  trunk: new THREE.MeshStandardMaterial({ color: 0x4a3358, roughness: 0.9 }),
  blob: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, flatShading: true, emissive: 0xffffff, emissiveIntensity: 0.08 }),
  fairy: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.9, 1.3), toneMapped: false }),
  rock: new THREE.MeshStandardMaterial({ color: 0x3b2f52, roughness: 0.75, metalness: 0.2, flatShading: true }),
};
function blossomTree(x, y, z, s, canopyColor) {
  const lean = rr(-0.12, 0.12), h = s * rr(1.5, 1.9);
  inst('btrunk', BT.trunk, BM.trunk, mat4(x, y - 0.05, z, rand() * 6, s, h, s, lean, -lean));
  const base = new THREE.Color(canopyColor);
  for (let k = 0; k < 3; k++) {
    const c = base.clone().offsetHSL(rr(-0.03, 0.03), 0, rr(-0.08, 0.06));
    const a = k * 2.1 + rand(), off = k === 0 ? 0 : 0.42 * s;
    inst('bblob', BT.blob, BM.blob, mat4(x + Math.cos(a) * off, y + h + (k === 0 ? 0.35 : 0.05) * s, z + Math.sin(a) * off, rand() * 6, s * rr(0.95, 1.2), s * rr(0.8, 1.0), s * rr(0.95, 1.2)), c);
  }
  for (let k = 0; k < 7; k++) {
    const a = rand() * 6.28, r = s * rr(0.6, 1.05);
    inst('bfairy', BT.fairy, BM.fairy, mat4(x + Math.cos(a) * r, y + h + rr(-0.35, 0.6) * s, z + Math.sin(a) * r), null, false);
  }
  addObstacle(x, z, 0.3 * s);
}
function rockVeins(isl, color) { const side = isl.mesh?.material?.[1]; if (side) veinMaterial(side, color); }
function veinMaterial(side, color, scale = 1, top = 0.5) {
  side.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.time; sh.uniforms.uVein = { value: new THREE.Color(color) };
    sh.vertexShader = 'varying vec3 vRock;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\nvRock = position * ${scale.toFixed(3)};`);
    sh.fragmentShader = 'uniform float uTime; uniform vec3 uVein; varying vec3 vRock;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float vy = vRock.y * 0.42 + sin(vRock.x * 0.35) * 0.7 + cos(vRock.z * 0.31) * 0.7;
      float vein = smoothstep(0.43, 0.49, abs(fract(vy) - 0.5));
      float crack = 1.0 - smoothstep(0.0, 0.035, abs(sin(vRock.x * 0.9 + vRock.y * 0.6) * cos(vRock.z * 0.8 - vRock.y * 0.4)));
      float depthFade = smoothstep(${top.toFixed(2)}, ${(top - 6.5).toFixed(2)}, vRock.y);
      float pulse = 0.65 + 0.35 * sin(uTime * 1.4 + vRock.y * 0.5);
      totalEmissiveRadiance += uVein * (vein * 1.6 + crack * 0.7) * depthFade * pulse + uVein * 0.05 * depthFade;`);
  };
  side.customProgramCacheKey = () => 'orkveins' + scale + '_' + top;
}
const fallGeo = new THREE.PlaneGeometry(1, 1, 1, 24).translate(0, -0.5, 0);
function lightFall(group, color, x, z, w, h) {
  const m = new THREE.Mesh(fallGeo, new THREE.ShaderMaterial({
    uniforms: { uTime: U.time, uCol: { value: new THREE.Color(color) }, uSeed: { value: rand() * 10 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; vec3 p = position; p.z += (1.0 - uv.y) * (1.0 - uv.y) * 0.9; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
    fragmentShader: `uniform float uTime, uSeed; uniform vec3 uCol; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        float flow = n(vec2(vUv.x * 9.0 + uSeed, vUv.y * 5.0 + uTime * 1.6)) * 0.6 + n(vec2(vUv.x * 23.0, vUv.y * 11.0 + uTime * 2.6)) * 0.4;
        float edge = 1.0 - pow(clamp(abs(vUv.x - 0.5) * 2.0, 0.0, 1.0), 2.0);
        float fade = smoothstep(0.0, 0.55, vUv.y) * smoothstep(1.0, 0.94, vUv.y);
        vec3 c = mix(uCol, vec3(1.0), smoothstep(0.55, 0.9, flow) * 0.7);
        gl_FragColor = vec4(c * (0.35 + flow * 1.1) * edge * fade, 1.0);
      }`,
  }));
  m.position.set(x, 0.25, z); m.scale.set(w, h, 1);
  m.lookAt(group.localToWorld(new THREE.Vector3(x * 2, 0.25, z * 2)));
  m.renderOrder = 3; group.add(m);
  // glowing lip where the light spills over the edge
  const lip = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.6), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  lip.scale.set(w * 0.55, 0.25, w * 0.35); lip.position.set(x, 0.3, z); lip.quaternion.copy(m.quaternion); group.add(lip);
}
function petals(group, radius, height, n = 110) {
  const pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = rand() * 6.283, r = radius * Math.sqrt(rr(0.45, 1)); pos.set([Math.cos(a) * r, 0, Math.sin(a) * r], i * 3); seed[i] = rand(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: { uTime: U.time, uH: { value: height }, uPx: { value: 70 * Math.min(devicePixelRatio, 1.75) } },
    transparent: true, depthWrite: false,
    vertexShader: `uniform float uTime, uH, uPx; attribute float seed; varying float vA; varying float vS;
      void main(){ float u = fract(seed * 5.31 + uTime * (0.035 + seed * 0.03)); vec3 p = position;
        p.y += (1.0 - u) * uH; p.x += sin(uTime * 0.9 + seed * 40.0) * 0.8 + u * 1.5; p.z += cos(uTime * 0.7 + seed * 23.0) * 0.8;
        vA = smoothstep(0.0, 0.1, u) * smoothstep(1.0, 0.85, u); vS = seed;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = uPx * (0.35 + seed * 0.3) / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uTime; varying float vA; varying float vS;
      void main(){ vec2 q = gl_PointCoord - 0.5; float ang = uTime * 2.0 + vS * 20.0; q = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * q;
        float d = length(q * vec2(1.0, 2.1)); float a = smoothstep(0.5, 0.25, d);
        vec3 c = mix(vec3(1.0, 0.72, 0.88), vec3(0.98, 0.95, 1.0), step(0.6, vS));
        if (a * vA < 0.02) discard; gl_FragColor = vec4(c, a * vA * 0.9); }`,
  }));
  pts.frustumCulled = false; group.add(pts);
}
function islandWow(isl, group, color, S, free) {
  const R = isl.R, depth = R * 1.25, Y = new THREE.Vector3(0, 1, 0);
  rockVeins(isl, color);
  // crystal clusters hanging under the island
  const crystalMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.1, roughness: 0.15, metalness: 0.2, flatShading: true });
  const under = new THREE.Group(); under.position.copy(isl.c); scene.add(under);
  const nClusters = Math.round(7 + R * 0.35);
  for (let i = 0; i < nClusters; i++) {
    const a = i / nClusters * 6.283 + rr(-0.2, 0.2), t = rr(0.25, 0.7);
    const rad = R * Math.pow(1 - t, 0.85) * 0.92, y = -t * depth + 0.4;
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    for (let k = 0; k < 4; k++) {
      const sc = rr(0.5, 1.15) * (k ? 0.65 : 1) * (0.8 + R * 0.025);
      const m = new THREE.Mesh(BT.shard, crystalMat);
      m.position.set(out.x * rad + rr(-0.6, 0.6), y + rr(-0.4, 0.4), out.z * rad + rr(-0.6, 0.6));
      const dir = new THREE.Vector3(out.x * rr(0.25, 0.7), -1, out.z * rr(0.25, 0.7)).normalize();
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
      m.scale.set(sc * 0.6, sc * rr(1, 1.9), sc * 0.6); under.add(m);
    }
  }
  // big tip crystal at the very bottom
  const tip = new THREE.Mesh(BT.shard, crystalMat); tip.position.y = -depth + 1.2; tip.scale.set(1.8 + R * 0.05, 3 + R * 0.08, 1.8 + R * 0.05); under.add(tip);
  // light-falls spilling over the rim (never on a bridge)
  let falls = 0;
  for (let k = 0; k < 24 && falls < (isl.outer ? 3 : 2); k++) {
    const a = rand() * 6.283; if (!free(a)) continue;
    const local = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).applyAxisAngle(Y, -group.rotation.y).multiplyScalar(R * 0.93);
    lightFall(group, color, local.x, local.z, rr(1.4, 2.4) * S, depth * 1.6);
    falls++;
  }
  // floating rocks with crystals, orbiting the island
  const orbit = new THREE.Group(); orbit.position.copy(isl.c); scene.add(orbit);
  const rocks = [];
  for (let i = 0; i < (isl.outer ? 9 : 6); i++) {
    const g = new THREE.Group(), sc = rr(0.6, 1.5) * S;
    const rock = new THREE.Mesh(BT.rock, BM.rock); rock.scale.set(sc, sc * 0.7, sc); rock.castShadow = true; g.add(rock);
    for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(BT.shard, crystalMat); c.rotation.x = Math.PI + rr(-0.4, 0.4); c.rotation.z = rr(-0.4, 0.4); c.position.set(rr(-0.4, 0.4) * sc, sc * 0.45, rr(-0.4, 0.4) * sc); c.scale.setScalar(sc * rr(0.25, 0.45)); g.add(c); }
    orbit.add(g);
    rocks.push({ g, a: rand() * 6.283, r: R * rr(1.2, 1.55), y: rr(-6, 1.5), sp: rr(0.03, 0.07) * (rand() < 0.5 ? 1 : -1), ph: rand() * 6.28 });
  }
  ticks.push((t) => { for (const k of rocks) { const a = k.a + t * k.sp; k.g.position.set(Math.cos(a) * k.r, k.y + Math.sin(t * 0.6 + k.ph) * 0.6, Math.sin(a) * k.r); k.g.rotation.y = t * 0.2 + k.ph; } });
  // petals drifting over the garden ring
  petals(group, R * 0.9, 7 * S);
}


// ---------------------------------------------------------------------------
//  physical plaza life: pavilions, benches, planters, street lamps, café tables,
//  picnic blankets, bushes and boulders — all placed around the landmark
// ---------------------------------------------------------------------------
const FG = {
  box: new THREE.BoxGeometry(1, 1, 1),
  boxUp: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
  cylUp: new THREE.CylinderGeometry(1, 1, 1, 14).translate(0, 0.5, 0),
  bush: new THREE.IcosahedronGeometry(1, 1),
  boulder: new THREE.DodecahedronGeometry(1, 0),
  umbrella: new THREE.ConeGeometry(1, 0.45, 10, 1, true).translate(0, -0.225, 0),
  lampHead: new THREE.SphereGeometry(0.16, 12, 8),
  blanket: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
};
const FM = {
  concrete: new THREE.MeshStandardMaterial({ color: 0xcdc9c2, roughness: 0.92 }),
  wood: new THREE.MeshStandardMaterial({ color: 0xa8774f, roughness: 0.8 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x26272c, roughness: 0.45, metalness: 0.7 }),
  bush: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, flatShading: true }),
  boulder: new THREE.MeshStandardMaterial({ color: 0x6c6280, roughness: 0.95, flatShading: true }),
  lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.9, 1.2), toneMapped: false }),
  cloth: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.DoubleSide }),
  roof: new THREE.MeshStandardMaterial({ color: 0xd2cec8, roughness: 0.7 }),
};
const GREENS = [0x5fae7a, 0x77c28c, 0x4f9a6e, 0x8fcf99, 0xb9a3f0, 0x9fd8a4];
const windowTex = {};
function pavilionWindows(color) {
  if (windowTex[color]) return windowTex[color];
  return (windowTex[color] = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#231b33'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      const x = 8 + i * 62, lit = i !== 2 || true;
      const g = c.createLinearGradient(0, 10, 0, h - 10); g.addColorStop(0, lit ? '#ffe1a8' : '#3a3050'); g.addColorStop(1, lit ? '#ff9f6a' : '#2a2238');
      c.fillStyle = g; c.fillRect(x, 10, 54, h - 20);
      c.fillStyle = 'rgba(40,20,50,.55)';                                  // people & plants silhouettes
      if (i === 1) { c.beginPath(); c.arc(x + 20, 62, 9, 0, 7); c.fill(); c.fillRect(x + 12, 72, 16, 40); }
      if (i === 3) { c.beginPath(); c.arc(x + 34, 58, 9, 0, 7); c.fill(); c.fillRect(x + 26, 68, 16, 44); }
      if (i === 0) { c.fillRect(x + 6, 84, 14, 28); c.beginPath(); c.arc(x + 13, 80, 12, 0, 7); c.fill(); }
      c.fillStyle = css(color); c.globalAlpha = 0.35; c.fillRect(x, h - 26, 54, 4); c.globalAlpha = 1;
    }
  }));
}
function standWall(group, lx, ly, lz, yaw, color, label) {
  const g = new THREE.Group(); g.position.set(lx, ly, lz); g.rotation.y = yaw; group.add(g);
  const add = (geo, mat, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const art = canvasTex(1024, 512, (c, w, h) => {
    const grd = c.createLinearGradient(0, 0, w, h); grd.addColorStop(0, '#130d22'); grd.addColorStop(1, '#241544'); c.fillStyle = grd; c.fillRect(0, 0, w, h);
    c.fillStyle = css(color); c.fillRect(0, 0, 18, h); c.globalAlpha = 0.18; c.beginPath(); c.arc(w * 0.86, h * 0.3, 260, 0, 7); c.fill(); c.globalAlpha = 1;
    c.fillStyle = 'rgba(255,255,255,.55)'; c.font = '600 30px Inter'; c.textBaseline = 'top'; c.fillText('O R-K · SERVICIOS', 70, 70);
    c.fillStyle = '#ffffff'; c.font = '120px Anton'; const words = label.toUpperCase().split(' ');
    let line = '', y = 130; for (const wd of words) { const test = line ? line + ' ' + wd : wd; if (c.measureText(test).width > w - 160 && line) { c.fillText(line, 70, y); y += 128; line = wd; } else line = test; } c.fillText(line, 70, y);
    c.fillStyle = css(color); c.fillRect(70, h - 90, 240, 10);
  });
  const face = new THREE.MeshStandardMaterial({ map: art.tex, emissive: 0xffffff, emissiveMap: art.tex, emissiveIntensity: 0.55, roughness: 0.5 });
  const shell = new THREE.MeshStandardMaterial({ color: 0x1a1b20, roughness: 0.55, metalness: 0.25 });
  const glowM = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.8), toneMapped: false });
  const baseM = new THREE.MeshStandardMaterial({ color: 0xf1eee9, roughness: 0.85, ...pbrMaps('white_stucco', 2, 2, ['nor', 'rough']) });
  // modelled wall (Blender): framed panel, inset artwork, LED fins, ledge and plinth
  onProp('standWall', (o) => {
    o.traverse(c => {
      if (!c.isMesh) return; const n = c.material.name;
      if (n === 'Face') { const geo = c.geometry.clone(), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i)); c.geometry = geo; }   // the exported plane is flipped vertically
      c.material = n === 'Face' ? face : n === 'Glow' ? glowM : n === 'Base' ? baseM : shell; c.castShadow = c.receiveShadow = true;
    });
    g.add(o);
  });
}
function pavilion(group, lx, ly, lz, yaw, color, label) {
  const g = new THREE.Group(); g.position.set(lx, ly, lz); g.rotation.y = yaw; group.add(g);
  const add = (geo, mat, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const win = pavilionWindows(color).tex;
  const glass = new THREE.MeshStandardMaterial({ map: win, emissive: 0xffffff, emissiveMap: win, emissiveIntensity: 0.85, roughness: 0.2, metalness: 0.1 });
  const wall = new THREE.MeshStandardMaterial({ color: 0xefece8, roughness: 0.85 });
  add(FG.boxUp, FM.concrete, 0, 0, 0, 3.6, 0.22, 3.0);
  add(FG.boxUp, [glass, glass, wall, wall, glass, wall], 0, 0.22, 0, 3.0, 2.1, 2.4);
  add(FG.boxUp, FM.roof, 0, 2.32, 0.1, 3.8, 0.18, 3.1);
  add(FG.box, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.8), toneMapped: false }), 0, 2.32, 1.66, 3.8, 0.05, 0.02);
  for (const [x, z] of [[-1.55, 1.25], [1.55, 1.25]]) add(FG.cylUp, FM.metal, x, 0.22, z, 0.07, 2.1, 0.07);
  add(FG.boxUp, new THREE.MeshStandardMaterial({ color: 0x2d2440, roughness: 0.5 }), 0, 0.22, 1.21, 0.8, 1.55, 0.04);   // door
  add(FG.boxUp, FM.concrete, 0, 0, 1.6, 1.4, 0.12, 0.5);                                                               // step
  for (const [x, z] of [[-1.3, -0.8], [-0.7, -0.9], [1.2, -0.7]]) add(FG.bush, new THREE.MeshStandardMaterial({ color: pick(GREENS), roughness: 0.8, flatShading: true }), x, 2.62, z, 0.38, 0.3, 0.38);
  const sign = canvasTex(512, 96, (c, w, h) => { c.fillStyle = '#100b1c'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '44px Anton'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label.toUpperCase(), w / 2, h / 2 + 2); });
  const sm = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.42), new THREE.MeshBasicMaterial({ map: sign.tex })); sm.position.set(0, 2.42, 1.67); g.add(sm);
  // two planters flanking the door
  for (const s of [-1, 1]) { add(FG.boxUp, FM.concrete, s * 1.05, 0.22, 1.7, 0.5, 0.42, 0.5); add(FG.bush, new THREE.MeshStandardMaterial({ color: pick(GREENS), roughness: 0.8, flatShading: true }), s * 1.05, 0.78, 1.7, 0.32, 0.36, 0.32); }
}
function furnish({ isl, group, S, color, floorY }, def, free) {
  const R = isl.R, yawG = group.rotation.y, Yax = new THREE.Vector3(0, 1, 0);
  const W = (lx, lz) => new THREE.Vector3(lx, 0, lz).applyAxisAngle(Yax, yawG).add(isl.c);
  const wy = (lx, lz) => isl.c.y + floorY(lx, lz);
  const angOK = (lx, lz) => { const v = W(lx, lz).sub(isl.c); return free(Math.atan2(v.z, v.x)); };
  const deskX = 2.7 * S, deskZ = R * 0.56;
  const clearOfDesk = (lx, lz, r) => Math.hypot(lx - deskX, lz - deskZ) > 2.2 + r && Math.abs(lx) > 1.6 + r * 0.5 || lz < deskZ - 3;
  const exclusion = def.form === 'studio' ? [[4.4 * S, 1.6 * S, 6.9 * S]] : def.form === 'prism' ? [[8.5 * S, 0, 4.5 * S]] : [];
  const clearOfZones = (lx, lz, r) => exclusion.every(([x, z, rad]) => Math.hypot(lx - x, lz - z) > rad + r);
  const spot = (lx, lz, r) => { const v = W(lx, lz); return angOK(lx, lz) && clearOfDesk(lx, lz, r) && clearOfZones(lx, lz, r) && freeSpot(v.x, v.z, r); };
  const blockAt = (lx, lz, r) => { const v = W(lx, lz); addObstacle(v.x, v.z, r); };
  const tryPlace = (n, rMin, rMax, radius, onPlace, tries = 80, backOnly = false) => {
    let done = 0;
    for (let k = 0; k < tries && done < n; k++) {
      const a = rand() * Math.PI * 2, r = rr(rMin, rMax), lx = Math.cos(a) * r, lz = Math.sin(a) * r;
      if (backOnly && lz > -R * 0.12) continue;  // keep the arrival view of the landmark open
      if (!spot(lx, lz, radius)) continue;
      onPlace(lx, lz, Math.atan2(-lx, -lz)); blockAt(lx, lz, radius); done++;
    }
    return done;
  };
  const deck = R * 0.74;
  // office pavilions facing the landmark
  const label = def.form === 'dock' ? 'Base Nova' : def.name;
  tryPlace(1, deck - 1.4, deck - 0.9, 2.6, (lx, lz, yaw) => standWall(group, lx, floorY(lx, lz), lz, yaw, color, label), 220, true);
  // lounge corners with real furniture: two armchairs around a round table, or a lounge chair + wood table
  tryPlace(2, deck - 3.4, deck - 1.8, 1.9, (lx, lz, yaw) => {
    const p = W(lx, lz), y = wy(lx, lz), yw = yaw + yawG, side = new THREE.Vector3(Math.cos(yw), 0, -Math.sin(yw));
    if (rand() < 0.6) {
      requestProp('roundTable', p.x, y, p.z, rand() * 6, 0.9);
      for (const k of [-1, 1]) { const x = p.x + side.x * k * 1.05, z = p.z + side.z * k * 1.05; requestProp('armchair', x, y, z, Math.atan2(p.x - x, p.z - z), 0.95); }
    } else {
      requestProp('lounge', p.x - side.x * 0.7, y, p.z - side.z * 0.7, yw + 0.5, 0.95);
      requestProp('woodTable', p.x + side.x * 0.55, y, p.z + side.z * 0.55, yw, 0.8);
      requestProp('succulent', p.x + side.x * 0.55, y + 0.31, p.z + side.z * 0.55, rand() * 6, 1.4);
    }
  });
  isl.picnic = [];
}

export function animateDistricts(t) {
  const dt = Math.min(0.05, Math.max(0, t - U.time.value));
  U.time.value = t;
  for (const f of ticks) f(t, dt);
}

// ---------------------------------------------------------------------------
//  01 · Tecnología y desarrollo — data centre with a live code core
// ---------------------------------------------------------------------------
const CODE = [
  ['k', 'import'], ['t', ' { plataforma } '], ['k', 'from'], ['s', " 'or-k/core'"], ['n', ''],
  ['k', 'const'], ['t', ' pedidos = '], ['k', 'await'], ['t', ' api.sincronizar({'], ['n', ''],
  ['t', '  canales: ['], ['s', "'web', 'erp', 'crm'"], ['t', '],'], ['n', ''],
  ['t', '  tiempoReal: '], ['k', 'true'], ['t', ','], ['n', ''],
  ['t', '});'], ['n', ''], ['n', ''],
  ['c', '// una sola fuente de verdad'], ['n', ''],
  ['k', 'export function'], ['f', ' automatizar'], ['t', '(flujo) {'], ['n', ''],
  ['k', '  return'], ['t', ' flujo.pasos.map(paso =>'], ['n', ''],
  ['t', '    paso.'], ['f', 'ejecutar'], ['t', '({ reintentos: 3 }));'], ['n', ''],
  ['t', '}'], ['n', ''], ['n', ''],
  ['t', 'tablero.'], ['f', 'render'], ['t', '(pedidos.resumen());'], ['n', ''],
  ['t', 'app.'], ['f', 'escalar'], ['t', '({ usuarios: '], ['s', "'∞'"], ['t', ' });'], ['n', ''], ['n', ''],
];
function codeTexture(accent) {
  const COL = { k: '#c79bff', s: '#7affd2', t: '#e8e4f4', f: css(accent), c: '#7d7898' };
  return canvasTex(512, 1024, (c, w, h) => {
    c.fillStyle = 'rgba(10,6,22,0.92)'; c.fillRect(0, 0, w, h);
    c.font = '500 19px Menlo, Consolas, monospace'; c.textBaseline = 'top';
    let x = 46, y = 18, line = 1;
    for (let rep = 0; rep < 2; rep++) for (const [kind, txt] of CODE) {
      if (kind === 'n') { c.fillStyle = '#4c4668'; c.fillText(String(line++).padStart(2, ' '), 8, y); x = 46; y += 29; continue; }
      c.fillStyle = COL[kind]; c.fillText(txt, x, y); x += c.measureText(txt).width;
    }
  }, { repeatY: 0.5 });
}
function tech({ group, S, color, neon, neonHot, glass, place, floorY, block }) {
  const led = canvasTex(128, 256, (c, w, h) => {
    c.fillStyle = '#0d0a18'; c.fillRect(0, 0, w, h);
    for (let y = 6; y < h; y += 14) {
      c.fillStyle = '#211b38'; c.fillRect(6, y, w - 12, 10);
      for (let x = 12; x < w - 14; x += 9) {
        const q = Math.random(); if (q > 0.42) continue;
        c.fillStyle = q < 0.07 ? '#ffb84d' : q < 0.25 ? css(color) : '#7affd2'; c.fillRect(x, y + 3, 4, 3);
      }
    }
  });
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x0d0a18, emissive: 0xffffff, emissiveMap: led.tex, emissiveIntensity: 1.6, metalness: 0.5, roughness: 0.3 });
  let blink = 0; ticks.push((t, dt) => { blink += dt; if (blink > 0.22) { blink = 0; led.redraw(); } });

  // racks in a horseshoe behind the core
  const core = new THREE.Vector3(0, 0, 0), coreY = floorY(0, 0) + 5.2 * S;
  const rackTops = [];
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + 0.25 + i * (Math.PI - 0.5) / 6, x = Math.cos(a) * 6.4 * S, z = Math.sin(a) * 6.4 * S;
    const y = floorY(x, z), h = (3.2 + (i % 3) * 0.7) * S;
    const rack = new THREE.Group(); rack.position.set(x, y, z); rack.rotation.y = Math.atan2(-x, -z); group.add(rack);
    place(boxUp, darkMat, 0, 0, 0, 1.35 * S, h, 1.1 * S, rack);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.15 * S, h - 0.3 * S), ledMat); face.position.set(0, h / 2, 0.56 * S); rack.add(face);
    place(box, neonHot, 0, h + 0.05, 0, 1.35 * S, 0.08, 1.1 * S, rack).castShadow = false;
    place(box, neon, 0, 0.08, 0.56 * S, 1.35 * S, 0.08, 0.04, rack);
    rackTops.push(new THREE.Vector3(x, y + h, z));
    block(x, z, 0.95 * S);
  }
  // core: pedestal + nested polyhedra
  place(cyl, alloy, 0, floorY(0, 0) + 0.6 * S, 0, 1.3 * S, 1.2 * S, 1.3 * S);
  place(new THREE.TorusGeometry(1.35 * S, 0.06 * S, 6, 48), neonHot, 0, floorY(0, 0) + 1.2 * S, 0).rotation.x = Math.PI / 2;
  block(0, 0, 1.5 * S);
  const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.1 * S, 1)), new THREE.LineBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.8), toneMapped: false }));
  wire.position.set(0, coreY, 0); group.add(wire);
  const inner = place(new THREE.IcosahedronGeometry(1.05 * S, 0), new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.1, clearcoat: 1, flatShading: true }), 0, coreY, 0);
  const orbitA = place(new THREE.TorusGeometry(2.9 * S, 0.035 * S, 6, 80), neonHot, 0, coreY, 0);
  const orbitB = place(new THREE.TorusGeometry(3.3 * S, 0.03 * S, 6, 80), neon, 0, coreY, 0);
  ticks.push((t) => {
    wire.rotation.set(t * 0.13, t * 0.21, 0); inner.rotation.set(-t * 0.4, -t * 0.3, 0);
    const by = coreY + Math.sin(t * 1.2) * 0.3 * S; wire.position.y = inner.position.y = by;
    orbitA.rotation.set(Math.PI / 2 + Math.sin(t * 0.5) * 0.5, t * 0.4, 0); orbitB.rotation.set(Math.PI / 2 + Math.cos(t * 0.4) * 0.6, -t * 0.3, 0.4);
  });
  // cables + data packets
  const cableMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.55) });
  const packetGeo = new THREE.BoxGeometry(0.22 * S, 0.22 * S, 0.22 * S);
  for (const [i, top] of rackTops.entries()) {
    const mid = top.clone().lerp(core.clone().setY(coreY), 0.5); mid.y = coreY + 2.5 * S;
    const curve = new THREE.QuadraticBezierCurve3(top, mid, new THREE.Vector3(0, coreY, 0));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.035 * S, 5), cableMat));
    for (let p = 0; p < 2; p++) {
      const pk = new THREE.Mesh(packetGeo, p ? neonHot : new THREE.MeshBasicMaterial({ color: new THREE.Color(0x7affd2).multiplyScalar(2), toneMapped: false }));
      group.add(pk); const off = rand(), dir = (i + p) % 2 ? 1 : -1;
      ticks.push((t) => { let u = (off + t * 0.22) % 1; if (dir < 0) u = 1 - u; curve.getPoint(u, pk.position); pk.rotation.set(t * 2, t * 3, 0); });
    }
  }
  // two floating code holograms facing the arrival path
  for (const s of [-1, 1]) {
    const code = codeTexture(color);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(4.2 * S, 3.4 * S), holoMat(code.tex, 0.95));
    panel.position.set(s * 5.2 * S, floorY(s * 5.2 * S, 2 * S) + 3.4 * S, 2 * S); panel.rotation.y = -s * 0.55; group.add(panel);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(4.2 * S, 3.4 * S)), new THREE.LineBasicMaterial({ color })); panel.add(edge);
    const y0 = panel.position.y;
    ticks.push((t, dt) => { code.tex.offset.y -= dt * 0.035 * (s > 0 ? 1 : 1.3); panel.position.y = y0 + Math.sin(t * 0.9 + s) * 0.15 * S; });
  }
}

// ---------------------------------------------------------------------------
//  02 · Marketing y performance — conversion funnel + broadcast mast
// ---------------------------------------------------------------------------
function metricCard(label, sub, color, up) {
  return canvasTex(512, 256, (c, w, h) => {
    rrect(c, 6, 6, w - 12, h - 12, 28); c.fillStyle = 'rgba(16,8,30,0.85)'; c.fill(); c.lineWidth = 4; c.strokeStyle = css(color); c.stroke();
    c.fillStyle = '#ffffff'; c.font = '64px Anton'; c.textBaseline = 'top'; c.fillText(label, 34, 30);
    c.fillStyle = 'rgba(255,255,255,.7)'; c.font = '500 24px Inter'; c.fillText(sub, 36, 112);
    c.strokeStyle = css(color); c.lineWidth = 7; c.lineJoin = 'round'; c.beginPath();
    const pts = up ? [0.1, 0.25, 0.2, 0.45, 0.5, 0.75, 0.95] : [0.95, 0.8, 0.85, 0.55, 0.5, 0.3, 0.15];
    pts.forEach((v, i) => { const x = 36 + i * 72, y = 226 - v * 66; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
    c.fillStyle = css(color); c.font = '700 54px Inter'; c.fillText(up ? '↑' : '↓', w - 80, 34);
  });
}
function marketing({ group, S, color, neon, neonHot, place, floorY, block }) {
  const base = floorY(0, 0);
  // sculpture: a blown-glass conversion funnel on a black plinth, leads flowing down to the sale
  place(cyl, darkMat, 0, base + 0.35 * S, 0, 1.6 * S, 0.7 * S, 1.6 * S);
  place(new THREE.TorusGeometry(1.6 * S, 0.022 * S, 6, 96), neon, 0, base + 0.71 * S, 0).rotation.x = Math.PI / 2;
  block(0, 0, 1.8 * S);
  const fr = (u) => (0.32 + 3.4 * u * u) * S, H = 5.6 * S, y0 = base + 1.0 * S;
  const prof = []; for (let k = 0; k <= 24; k++) { const u = k / 24; prof.push(new THREE.Vector2(fr(u), u * H)); }
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xf2f4ff, roughness: 0.06, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.4 });
  const funnel = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), glassM); funnel.position.y = y0; funnel.renderOrder = 3; group.add(funnel);
  for (const u of [0.35, 0.7, 1]) { const t = place(new THREE.TorusGeometry(fr(u), (u === 1 ? 0.05 : 0.028) * S, 8, 96), alloy, 0, y0 + u * H, 0); t.rotation.x = Math.PI / 2; t.castShadow = false; }
  place(cyl, alloy, 0, y0 - 0.15 * S, 0, 0.36 * S, 0.3 * S, 0.36 * S);
  const goal = place(ball, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 0.9, roughness: 0.2 }), 0, base + 0.95 * S, 0, 0.3 * S, 0.3 * S, 0.3 * S);
  const N = 70, leads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.08 * S, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), N);
  leads.frustumCulled = false; group.add(leads);
  const m4 = new THREE.Matrix4(), cA = new THREE.Color(0xf4f2ee), cB = new THREE.Color(color).multiplyScalar(1.6), cc = new THREE.Color(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  for (let i = 0; i < N; i++) leads.setColorAt(i, cA);
  ticks.push((t) => {
    for (let i = 0; i < N; i++) {
      const u = 1 - ((i / N + t * 0.06) % 1), a = i * 2.39996 + (1 - u) * 7, rad = fr(u) * 0.86;
      pos.set(Math.cos(a) * rad, y0 + u * H, Math.sin(a) * rad); sc.setScalar(0.6 + u * 0.6);
      m4.compose(pos, q, sc); leads.setMatrixAt(i, m4); leads.setColorAt(i, cc.copy(cA).lerp(cB, 1 - u));
    }
    leads.instanceMatrix.needsUpdate = true; leads.instanceColor.needsUpdate = true;
    goal.material.emissiveIntensity = 0.7 + Math.max(0, Math.sin(t * 3)) * 0.5;
  });
  // the metrics that matter, on slim floor-standing displays around the back of the stand
  const cards = [['CTR', 'clics que llegan', true], ['CPA', 'coste por cliente', false], ['ROAS', 'retorno de inversión', true], ['CONVERSIÓN', 'visitas → ventas', true]];
  cards.forEach(([label, sub, up], i) => {
    const a = -Math.PI + 0.45 + i * (Math.PI - 0.9) / 3, x = Math.cos(a) * 6.4 * S, z = Math.sin(a) * 6.4 * S, y = floorY(x, z);
    const tot = new THREE.Group(); tot.position.set(x, y, z); tot.rotation.y = Math.atan2(-x, 6 * S - z); group.add(tot);
    place(boxUp, darkMat, 0, 0, 0, 0.9 * S, 0.12 * S, 0.5 * S, tot);
    place(boxUp, alloy, 0, 0, 0, 0.12 * S, 2.1 * S, 0.12 * S, tot);
    const scr = framedScreen(tot, 3.2 * S, 1.6 * S, screenMat(metricCard(label, sub, color, up).tex), { depth: 0.1 * S, frame: darkMat, back: false });
    scr.position.y = 2.9 * S;
    block(x, z, 0.7 * S);
  });
}

// ---------------------------------------------------------------------------
//  03 · Comunidad y contenido — amphitheatre, giant phone feed, live reactions
// ---------------------------------------------------------------------------
function feedTexture(color) {
  return canvasTex(512, 1536, (c, w, h) => {
    c.fillStyle = '#0f0b1c'; c.fillRect(0, 0, w, h);
    const hues = ['#7c3cff', '#ff698a', '#67deff', '#ffca8a', '#7affd2', '#b299ff'];
    for (let p = 0; p < 4; p++) {
      const y = p * 384;
      c.fillStyle = hues[p % 6]; c.beginPath(); c.arc(44, y + 40, 22, 0, 7); c.fill();
      c.fillStyle = '#ffffff'; c.font = '600 24px Inter'; c.textBaseline = 'middle'; c.fillText(['@tu.marca', '@comunidad', '@tu.marca', '@clientes'][p], 80, y + 34);
      c.fillStyle = 'rgba(255,255,255,.45)'; c.font = '400 18px Inter'; c.fillText(['¿Qué te gustaría ver?', 'Encuesta abierta', 'Detrás de cámaras', 'Respondemos todo'][p], 80, y + 60);
      const g = c.createLinearGradient(0, y + 80, w, y + 300); g.addColorStop(0, hues[(p + 1) % 6]); g.addColorStop(1, hues[(p + 3) % 6]);
      c.fillStyle = g; rrect(c, 20, y + 84, w - 40, 210, 18); c.fill();
      c.fillStyle = 'rgba(255,255,255,.9)'; c.font = '56px Anton'; c.textAlign = 'center'; c.fillText(['¿A o B?', '72 % SÍ', 'BACKSTAGE', 'PREGÚNTANOS'][p], w / 2, y + 190); c.textAlign = 'left';
      c.fillStyle = '#ff5f8f'; c.font = '30px Inter'; c.fillText('♥', 26, y + 332); c.fillStyle = '#ffffff'; c.fillText('💬', 74, y + 332);
      c.fillStyle = 'rgba(255,255,255,.3)'; rrect(c, 132, y + 322, 200, 14, 7); c.fill();
    }
  }, { repeatY: 0.5 });
}
function reactionTexture(kind, color) {
  return canvasTex(128, 128, (c, w) => {
    c.translate(w / 2, w / 2);
    if (kind === 'heart') {
      c.fillStyle = '#ff5f8f'; c.beginPath(); c.moveTo(0, 38);
      c.bezierCurveTo(-58, -4, -34, -52, 0, -22); c.bezierCurveTo(34, -52, 58, -4, 0, 38); c.fill();
    } else if (kind === 'chat') {
      c.fillStyle = '#ffffff'; rrect(c, -50, -38, 100, 66, 22); c.fill();
      c.beginPath(); c.moveTo(-22, 26); c.lineTo(-34, 48); c.lineTo(0, 26); c.fill();
      c.fillStyle = css(color); for (const x of [-22, 0, 22]) { c.beginPath(); c.arc(x, -5, 7, 0, 7); c.fill(); }
    } else {
      c.fillStyle = css(color); c.beginPath(); c.arc(0, 0, 50, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.font = '700 60px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(kind === 'plus' ? '+1' : '@', 0, 4);
    }
  });
}
function community({ isl, group, S, color, neon, neonHot, place, floorY, block }) {
  const base = floorY(0, 0);
  // stepped seating (lathe) wrapped around the back half
  const steps = [[3.9, 0], [3.9, 0.5], [5.1, 0.5], [5.1, 1.0], [6.3, 1.0], [6.3, 1.5], [7.4, 1.5], [7.4, 0]].map(([x, y]) => new THREE.Vector2(x * S, y * S));
  const phi0 = Math.PI / 2 + 0.3, phiL = Math.PI - 0.6;
  const seats = place(new THREE.LatheGeometry(steps, 64, phi0, phiL), new THREE.MeshStandardMaterial({ color: 0x2a2b31, metalness: 0.5, roughness: 0.45, side: THREE.DoubleSide }), 0, base, 0);
  // neon lips on each step (lathe φ is measured from +Z toward +X; torus arcs start on +X)
  for (const [rad, y] of [[3.9, 0.5], [5.1, 1.0], [6.3, 1.5]]) arcTorus(rad * S, 0.015 * S, phi0 - Math.PI / 2, phiL, neon, group, base + y * S + 0.03);
  for (let a = phi0 + 0.15; a < phi0 + phiL; a += 0.42) block(Math.sin(a) * 5.6 * S, Math.cos(a) * 5.6 * S, 1.3 * S);
  // upholstered cushions on the steps; real visitors sit here (main.js reads isl.seats)
  const cushion = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0x2a2b31), 0.55), roughness: 0.95, ...pbrMaps('velour_velvet', 6, 1, ['nor', 'rough']) });
  for (const [r0, r1, y] of [[3.95, 4.9, 0.5], [5.15, 6.1, 1.0], [6.35, 7.3, 1.5]]) {
    const c = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(r0 * S, 0), new THREE.Vector2(r0 * S, 0.1 * S), new THREE.Vector2(r1 * S, 0.1 * S), new THREE.Vector2(r1 * S, 0)], 64, phi0 + 0.05, phiL - 0.1), cushion);
    c.position.y = base + y * S; c.receiveShadow = true; group.add(c);
  }
  group.updateMatrixWorld(true);
  isl.seats = [];
  for (const [tier, n] of [[0, 4], [1, 3]]) for (let k = 0; k < n; k++) {
    const a = phi0 + 0.35 + (k + rand() * 0.4) * (phiL - 0.7) / n, rad = (4.45 + tier * 1.2) * S;
    const p = group.localToWorld(new THREE.Vector3(Math.sin(a) * rad, base + (0.6 + tier * 0.5) * S - 0.45, Math.cos(a) * rad));
    isl.seats.push(p);
  }
  // stage + giant rotating phone
  place(cyl, alloy, 0, base + 0.2 * S, 0, 2.4 * S, 0.4 * S, 2.4 * S);
  place(new THREE.TorusGeometry(2.4 * S, 0.025 * S, 6, 64), neon, 0, base + 0.42 * S, 0).rotation.x = Math.PI / 2;
  block(0, 0, 2.5 * S);
  const phone = new THREE.Group(); phone.position.set(0, base + 3.6 * S, 0); group.add(phone);
  const feed = feedTexture(color);
  const body = framedScreen(phone, 2.7 * S, 5.0 * S, screenMat(feed.tex), { depth: 0.3 * S, frame: darkMat });
  body.children[0].scale.set(2.95 * S, 5.4 * S, 0.3 * S);
  place(box, neon, 0, 2.62 * S, 0, 0.9 * S, 0.08 * S, 0.34 * S, phone);
  ticks.push((t, dt) => { phone.rotation.y = Math.sin(t * 0.25) * 1.1; phone.position.y = base + (3.6 + Math.sin(t * 0.9) * 0.15) * S; feed.tex.offset.y -= dt * 0.04; });
}

// ---------------------------------------------------------------------------
//  04 · Diseño corporativo — Bézier pen sculpture, brand boards, swatch fan
// ---------------------------------------------------------------------------
function brandBoard(kind, color) {
  return canvasTex(512, 640, (c, w, h) => {
    c.fillStyle = '#f3eff8'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#100b1c'; c.font = '600 22px Inter'; c.textBaseline = 'top';
    c.fillText({ palette: 'PALETA', type: 'TIPOGRAFÍA', logo: 'LOGOTIPO' }[kind], 36, 32);
    c.fillStyle = 'rgba(16,11,28,.45)'; c.font = '400 18px Inter'; c.fillText('Sistema visual · v1.0', 36, 62);
    if (kind === 'palette') {
      const sw = [['#7C3CFF', 'Violeta'], ['#100B1C', 'Noche'], ['#F3EFF8', 'Niebla'], ['#FF698A', 'Coral'], ['#67DEFF', 'Cielo']];
      sw.forEach(([hex, name], i) => {
        const y = 110 + i * 100; c.fillStyle = hex; c.fillRect(36, y, w - 72, 84);
        if (hex === '#F3EFF8') { c.strokeStyle = 'rgba(16,11,28,.2)'; c.lineWidth = 2; c.strokeRect(36, y, w - 72, 84); }
        c.fillStyle = i === 1 || i === 0 ? '#fff' : '#100b1c'; c.font = '600 22px Inter'; c.fillText(name, 56, y + 18); c.font = '400 18px Inter'; c.fillText(hex, 56, y + 48);
      });
    } else if (kind === 'type') {
      c.fillStyle = '#7c3cff'; c.font = '300px Anton'; c.fillText('Aa', 30, 70);
      c.fillStyle = '#100b1c'; c.font = '44px Anton'; c.fillText('ANTON · TITULARES', 36, 430);
      c.font = '600 28px Inter'; c.fillText('Inter · Texto y UI', 36, 496);
      c.fillStyle = 'rgba(16,11,28,.55)'; c.font = '400 20px Inter'; c.fillText('ABCDEFGHIJKLMNÑOPQRSTUVWXYZ', 36, 548); c.fillText('abcdefghijklmnñopqrstuvwxyz 0123456789', 36, 578);
    } else {
      c.strokeStyle = 'rgba(124,60,255,.35)'; c.lineWidth = 2;
      for (const rad of [70, 120, 170]) { c.beginPath(); c.arc(w / 2, 320, rad, 0, 7); c.stroke(); }
      for (let x = 56; x < w; x += 50) { c.beginPath(); c.moveTo(x, 120); c.lineTo(x, 520); c.stroke(); }
      c.fillStyle = '#100b1c'; c.font = '150px Anton'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('OR-K', w / 2, 324);
      c.fillStyle = '#7c3cff'; c.fillRect(w / 2 - 110, 420, 220, 10);
      c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = 'rgba(16,11,28,.55)'; c.font = '400 18px Inter'; c.fillText('Área de respeto = altura de la “O”', 36, 570);
    }
  });
}
function design({ group, S, color, neon, neonHot, place, floorY, block }) {
  const base = floorY(0, 0);
  // plinth
  place(new THREE.CylinderGeometry(1.8 * S, 2.1 * S, 0.6 * S, 6), alloy, 0, base + 0.3 * S, 0);
  place(new THREE.TorusGeometry(1.95 * S, 0.02 * S, 6, 6), neon, 0, base + 0.62 * S, 0).rotation.x = Math.PI / 2;
  block(0, 0, 2.1 * S);
  // on the plinth: the brand's identity manual, open, under a glass vitrine
  const vit = new THREE.Mesh(new THREE.BoxGeometry(2.6 * S, 1.5 * S, 2.6 * S), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.16, depthWrite: false, envMapIntensity: 1.4 }));
  vit.position.y = base + 1.35 * S; vit.renderOrder = 3; group.add(vit);
  const manual = new THREE.Group(); manual.position.set(0, base + 0.68 * S, 0); group.add(manual);
  ['palette', 'logo'].forEach((kind, i) => {
    const pg = new THREE.Mesh(new THREE.PlaneGeometry(1.1 * S, 1.4 * S), screenMat(brandBoard(kind, color).tex, 0.9));
    pg.rotation.set(-Math.PI / 2, 0, 0); pg.rotation.y = 0; pg.position.set((i ? 0.56 : -0.56) * S, 0.06 * S + i * 0.005, 0); pg.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), (i ? -0.12 : 0.12)); manual.add(pg);
  });
  place(boxUp, whiteMat, 0, 0, 0, 2.3 * S, 0.06 * S, 1.5 * S, manual);
  // brand boards on easels behind
  ['palette', 'type', 'logo'].forEach((kind, i) => {
    const a = Math.PI + 0.65 + i * (Math.PI - 1.3) / 2, x = Math.cos(a) * 7.4 * S, z = Math.sin(a) * 7.4 * S, y = floorY(x, z);
    const easel = new THREE.Group(); easel.position.set(x, y, z); easel.rotation.y = Math.atan2(-x, -z); group.add(easel);
    for (const sx of [-1, 1]) place(cyl, alloy, sx * 1.4 * S, 1.6 * S, -0.2 * S, 0.07 * S, 3.2 * S, 0.07 * S, easel);
    const board = framedScreen(easel, 3.6 * S, 4.5 * S, screenMat(brandBoard(kind, color).tex, 0.74), { depth: 0.12 * S, frame: darkMat, back: false });
    board.position.set(0, 3.6 * S, 0); board.rotation.x = -0.08;
    place(box, neon, 0, 1.3 * S, 0, 3.8 * S, 0.06 * S, 0.1 * S, easel);
    block(x, z, 1.6 * S);
  });
  // a real swatch book on a stand, fanning open slowly: the O R-K palette, each blade a white card with a colour chip
  const fx = 5.6 * S, fz = 3.6 * S, fy = floorY(fx, fz);
  place(cyl, alloy, fx, fy + 0.6 * S, fz, 0.06 * S, 1.2 * S, 0.06 * S);
  place(cyl, darkMat, fx, fy + 0.02 * S, fz, 0.5 * S, 0.04 * S, 0.5 * S);
  const fan = new THREE.Group(); fan.position.set(fx, fy + 1.2 * S, fz); fan.rotation.y = -0.6; group.add(fan);
  const blades = [], chips = [0x7c3cff, 0x9371ff, 0x15111f, 0xf3eff8, 0xff698a, 0xffca8a, 0x67deff, 0x7affd2, 0x2a2c33];
  chips.forEach((hex, i) => {
    const b = new THREE.Group(); b.position.z = i * 0.025 * S; fan.add(b);
    place(boxUp, whiteMat, 0, 0, 0, 0.5 * S, 2.6 * S, 0.02 * S, b);
    place(boxUp, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5 }), 0, 1.5 * S, 0.012 * S, 0.44 * S, 1.0 * S, 0.01 * S, b);
    blades.push(b);
  });
  block(fx, fz, 0.7 * S);
  ticks.push((t) => { const spread = 0.08 + (Math.sin(t * 0.4) * 0.5 + 0.5) * 0.1; blades.forEach((b, i) => { b.rotation.z = (i - 4) * spread; }); });
}

// ---------------------------------------------------------------------------
//  05 · Plataformas web — tower of live browser windows + giant cursor
// ---------------------------------------------------------------------------
function browserTexture(kind, color) {
  return canvasTex(512, 340, (c, w, h) => {
    c.fillStyle = '#f7f5fb'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e4dff0'; c.fillRect(0, 0, w, 34);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(18 + i * 18, 17, 6, 0, 7); c.fill(); });
    c.fillStyle = '#fff'; rrect(c, 80, 8, 340, 18, 9); c.fill(); c.fillStyle = '#8a84a0'; c.font = '400 12px Inter'; c.textBaseline = 'middle'; c.fillText('tumarca.com/' + kind, 92, 17);
    const ac = css(color);
    c.fillStyle = '#100b1c'; c.font = '600 14px Inter'; c.fillText('TU MARCA', 20, 56); c.fillStyle = '#8a84a0'; c.font = '400 12px Inter'; c.fillText('Inicio   Catálogo   Contacto', 300, 56);
    if (kind === 'inicio') {
      c.fillStyle = '#100b1c'; c.font = '44px Anton'; c.textBaseline = 'top'; c.fillText('VENDE MÁS,', 20, 88); c.fillText('SIN FRICCIÓN.', 20, 138);
      c.fillStyle = ac; rrect(c, 20, 210, 140, 40, 20); c.fill(); c.fillStyle = '#fff'; c.font = '600 15px Inter'; c.textBaseline = 'middle'; c.fillText('Comenzar →', 44, 230);
      const g = c.createLinearGradient(300, 80, 500, 300); g.addColorStop(0, ac); g.addColorStop(1, '#7c3cff'); c.fillStyle = g; rrect(c, 300, 84, 192, 236, 18); c.fill();
    } else if (kind === 'catalogo') {
      c.strokeStyle = ac; c.lineWidth = 2; rrect(c, 20, 76, 472, 34, 17); c.stroke(); c.fillStyle = '#8a84a0'; c.fillText('🔍  Buscar por talla, color, precio…', 34, 93);
      ['Talla M', 'Azul', '< $50', 'En stock'].forEach((f, i) => { c.fillStyle = i < 2 ? ac : '#e4dff0'; rrect(c, 20 + i * 98, 122, 88, 24, 12); c.fill(); c.fillStyle = i < 2 ? '#fff' : '#4c4668'; c.font = '600 12px Inter'; c.fillText(f, 32 + i * 98, 134); });
      for (let i = 0; i < 4; i++) { c.fillStyle = ['#ddd3ff', '#ffd7e0', '#d4f6ff', '#ffe9cc'][i]; rrect(c, 20 + i * 120, 160, 108, 120, 10); c.fill(); c.fillStyle = '#100b1c'; c.fillRect(20 + i * 120, 290, 70, 8); c.fillStyle = ac; c.fillRect(20 + i * 120, 306, 40, 8); }
    } else if (kind === 'producto') {
      c.fillStyle = '#ddd3ff'; rrect(c, 20, 76, 220, 248, 14); c.fill();
      c.fillStyle = '#100b1c'; c.font = '30px Anton'; c.textBaseline = 'top'; c.fillText('PRODUCTO 01', 260, 84);
      c.fillStyle = '#8a84a0'; for (let i = 0; i < 4; i++) c.fillRect(260, 132 + i * 18, 200 - i * 30, 8);
      c.fillStyle = '#100b1c'; c.font = '700 28px Inter'; c.fillText('$ 49', 260, 220);
      c.fillStyle = ac; rrect(c, 260, 268, 220, 44, 22); c.fill(); c.fillStyle = '#fff'; c.font = '600 16px Inter'; c.textBaseline = 'middle'; c.fillText('Añadir al carrito', 304, 290);
    } else if (kind === 'checkout') {
      c.fillStyle = '#100b1c'; c.font = '30px Anton'; c.textBaseline = 'top'; c.fillText('PAGO SEGURO', 20, 80);
      for (let i = 0; i < 3; i++) { c.strokeStyle = '#cfc8e0'; c.lineWidth = 2; rrect(c, 20, 128 + i * 50, 300, 36, 8); c.stroke(); }
      c.fillStyle = ac; rrect(c, 20, 284, 300, 40, 20); c.fill(); c.fillStyle = '#fff'; c.font = '600 16px Inter'; c.textBaseline = 'middle'; c.fillText('Pagar ahora', 124, 304);
      c.fillStyle = '#efeaf8'; rrect(c, 340, 128, 152, 196, 12); c.fill(); c.fillStyle = '#100b1c'; c.font = '600 14px Inter'; c.fillText('Resumen', 356, 150);
    } else {
      c.fillStyle = '#100b1c'; c.fillRect(0, 34, 110, h - 34);
      for (let i = 0; i < 5; i++) { c.fillStyle = i === 1 ? ac : '#3a3355'; c.fillRect(16, 64 + i * 30, 76, 10); }
      for (let i = 0; i < 3; i++) { c.fillStyle = '#efeaf8'; rrect(c, 126 + i * 126, 76, 114, 70, 10); c.fill(); c.fillStyle = '#100b1c'; c.font = '600 22px Inter'; c.textBaseline = 'top'; c.fillText(['1.2k', '86%', '4.8★'][i], 138 + i * 126, 92); }
      c.strokeStyle = ac; c.lineWidth = 4; c.beginPath(); [0.2, 0.35, 0.3, 0.55, 0.5, 0.75, 0.9].forEach((v, i) => { const x = 130 + i * 60, y = 320 - v * 150; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
    }
  });
}
function web({ group, S, color, neon, neonHot, glass, place, floorY, block }) {
  const base = floorY(0, 0), H = 15 * S;
  place(cyl, alloy, 0, base + H / 2, 0, 0.2 * S, H, 0.2 * S);
  for (let y = 3 * S; y < H; y += 3 * S) place(new THREE.TorusGeometry(0.24 * S, 0.02 * S, 6, 24), neon, 0, base + y, 0).rotation.x = Math.PI / 2;
  place(cyl, darkMat, 0, base + 0.3 * S, 0, 1.4 * S, 0.6 * S, 1.4 * S);
  place(new THREE.TorusGeometry(1.4 * S, 0.02 * S, 6, 64), neon, 0, base + 0.61 * S, 0).rotation.x = Math.PI / 2;
  block(0, 0, 1.5 * S);
  // helix of browser windows
  const helix = new THREE.Group(); helix.position.y = base; group.add(helix);
  const kinds = ['inicio', 'catalogo', 'producto', 'checkout', 'panel', 'catalogo', 'inicio'];
  const backend = codeTexture(color);  // front-end on the face, back-end on the reverse
  const backMat = holoMat(backend.tex, 0.9);
  ticks.push((t, dt) => { backend.tex.offset.y -= dt * 0.03; });
  kinds.forEach((kind, i) => {
    const a = i * 0.95, y = (3.6 + i * 1.65) * S;
    const holder = new THREE.Group(); holder.position.set(Math.sin(a) * 3.1 * S, y, Math.cos(a) * 3.1 * S); holder.rotation.y = a; helix.add(holder);
    framedScreen(holder, 3.3 * S, 2.2 * S, screenMat(browserTexture(kind, color).tex, 0.78), { depth: 0.1 * S, frame: darkMat, back: false });
    const rev = new THREE.Mesh(new THREE.PlaneGeometry(3.3 * S, 2.2 * S), backMat); rev.rotation.y = Math.PI; rev.position.z = -0.07 * S; holder.add(rev);
    rodBetween(new THREE.Vector3(0, 0, -0.06 * S), new THREE.Vector3(0, 0, -2.9 * S), 0.025 * S, alloy, holder);
  });
  ticks.push((t) => { helix.rotation.y = t * 0.12; });
  // device bar: the same site on laptop, tablet and phone (responsive by design)
  const cx = 4.4 * S, cz = 3.2 * S, cy = floorY(cx, cz), bar = new THREE.Group(); bar.position.set(cx, cy, cz); bar.rotation.y = Math.atan2(-cx, 7 * S - cz) + Math.PI; group.add(bar);
  place(boxUp, whiteMat, 0, 0, 0, 3.8 * S, 1.0 * S, 1.2 * S, bar);
  place(box, darkMat, 0, 1.02 * S, 0, 3.9 * S, 0.04 * S, 1.3 * S, bar);
  place(box, neon, 0, 0.12 * S, 0.61 * S, 3.6 * S, 0.02 * S, 0.02 * S, bar);
  const dev = (w, h, kind, x, tilt, y0) => { const g = framedScreen(bar, w * S, h * S, screenMat(browserTexture(kind, color).tex, 0.85), { depth: 0.05 * S, frame: darkMat, back: false }); g.position.set(x * S, (1.05 + y0 + h / 2) * S, 0); g.rotation.x = -tilt; g.rotation.y = Math.PI; return g; };
  place(box, alloy, -1.0 * S, 1.06 * S, 0.1 * S, 1.5 * S, 0.04 * S, 1.0 * S, bar);       // laptop deck
  dev(1.45, 0.92, 'inicio', -1.0, 0.25, 0.02).position.z = -0.38 * S;
  dev(0.8, 1.1, 'catalogo', 0.45, 0.2, 0.08);
  dev(0.42, 0.82, 'producto', 1.35, 0.15, 0.06);
  block(cx, cz, 1.6 * S);
}
function analytics({ group, S, color, neon, neonHot, place, floorY, block }) {
  const base = floorY(0, 0);
  // chart plinth with grid
  const grid = canvasTex(512, 256, (c, w, h) => { c.fillStyle = '#120d22'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(122,255,210,.35)'; c.lineWidth = 2; for (let x = 0; x <= w; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y <= h; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } });
  const plate = place(box, [alloy, alloy, new THREE.MeshStandardMaterial({ map: grid.tex, emissive: 0xffffff, emissiveMap: grid.tex, emissiveIntensity: 0.15, metalness: 0.4, roughness: 0.4 }), alloy, alloy, alloy], 0, base + 0.25 * S, -0.6 * S, 10 * S, 0.5 * S, 4.4 * S);
  for (let x = -4; x <= 4; x += 2) block(x * S, -0.6 * S, 1.6 * S);
  const bars = [], heights = [2.2, 3.4, 2.8, 4.6, 5.2, 6.8];
  heights.forEach((h, i) => {
    const c = new THREE.Color(color).lerp(new THREE.Color(BRAND), 1 - i / 5);
    const bar = place(boxUp, new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: 0.1, roughness: 0.35, clearcoat: 1, transparent: true, opacity: 0.72 }), (i - 2.5) * 1.5 * S, base + 0.5 * S, -0.6 * S, 1.0 * S, h * S, 1.0 * S);
    const cap = place(box, neon, bar.position.x, 0, -0.6 * S, 1.02 * S, 0.035 * S, 1.02 * S); cap.castShadow = false;
    bars.push({ bar, cap, h, ph: i * 0.7 });
  });
  // trend line floating above
  const pts = heights.map((h, i) => new THREE.Vector3((i - 2.5) * 1.5 * S, base + (h + 2.6) * S, -2.9 * S));
  const line = new THREE.CatmullRomCurve3(pts);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(line, 80, 0.035 * S, 8), neon));
  const nodes = pts.map(p => { const n = place(ball, whiteMat, p.x, p.y, p.z, 0.12 * S, 0.12 * S, 0.12 * S); n.material = new THREE.MeshBasicMaterial({ color: 0xffffff }); return n; });
  const runner = place(ball, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.4), toneMapped: false }), 0, 0, 0, 0.16 * S, 0.16 * S, 0.16 * S);
  ticks.push((t) => {
    for (const b of bars) { const k = 0.8 + Math.sin(t * 0.8 + b.ph) * 0.2; b.bar.scale.y = b.h * S * k; b.cap.position.y = base + 0.5 * S + b.h * S * k; }
    line.getPoint((t * 0.12) % 1, runner.position);
    nodes.forEach((n, i) => n.scale.setScalar(0.12 * S * (1 + Math.max(0, Math.sin(t * 2 - i)) * 0.3)));
  });
  // donut chart
  const dx = 6.4 * S, dz = 2.2 * S, dy = floorY(dx, dz);
  place(cyl, alloy, dx, dy + 1.4 * S, dz, 0.12 * S, 2.8 * S, 0.12 * S); block(dx, dz, 0.6 * S);
  const donut = new THREE.Group(); donut.position.set(dx, dy + 4.6 * S, dz); group.add(donut);
  let start = 0;
  [[0.42, color], [0.26, BRAND], [0.2, 0xff698a], [0.12, 0xffca8a]].forEach(([share, col]) => {
    const arc = share * Math.PI * 2 - 0.06;
    const seg = new THREE.Mesh(new THREE.TorusGeometry(1.6 * S, 0.22 * S, 16, 64, arc), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.06, metalness: 0.1, roughness: 0.45 }));
    seg.rotation.z = start; start += share * Math.PI * 2; seg.castShadow = true; donut.add(seg);
  });
  ticks.push((t) => { donut.rotation.y = t * 0.3; });
  // dashboard wall with ticking KPIs
  const kpis = [['Ventas', 1284, '', 0.6], ['Conversión', 3.4, '%', 0.02], ['Retención', 86, '%', 0.3], ['Coste por cliente', 18.2, '$', 0.08]];
  const dash = canvasTex(1024, 576, (c, w, h, t) => {
    c.fillStyle = '#0f0b1c'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffffff'; c.font = '46px Anton'; c.textBaseline = 'top'; c.fillText('TABLERO DE KPIs', 40, 34);
    c.fillStyle = css(color); c.font = '500 22px Inter'; c.fillText('● Una sola fuente · definiciones compartidas', 40, 96);
    kpis.forEach(([name, v, unit, wob], i) => {
      const x = 40 + (i % 2) * 482, y = 150 + Math.floor(i / 2) * 206, val = v + Math.sin(t * 0.7 + i * 2) * v * wob * 0.1;
      c.fillStyle = '#1b1530'; rrect(c, x, y, 462, 186, 18); c.fill();
      c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '500 22px Inter'; c.fillText(name, x + 24, y + 22);
      c.fillStyle = '#ffffff'; c.font = '64px Anton';
      const txt = unit === '$' ? '$' + val.toFixed(1) : unit === '%' ? val.toFixed(1) + '%' : Math.round(val).toLocaleString('es');
      c.fillText(txt, x + 24, y + 58);
      c.strokeStyle = i === 3 ? '#ff698a' : css(color); c.lineWidth = 4; c.beginPath();
      for (let k = 0; k < 12; k++) { const sx = x + 260 + k * 16, sy = y + 120 - (Math.sin(k * 0.8 + t * 0.5 + i) * 0.4 + (i === 3 ? -k : k) * 0.05 + 0.5) * 60; k ? c.lineTo(sx, sy) : c.moveTo(sx, sy); }
      c.stroke();
    });
  });
  const wx = 0, wz = -6.6 * S, wy = floorY(wx, wz);
  const wall = framedScreen(group, 9 * S, 5.06 * S, screenMat(dash.tex), { depth: 0.25 * S, frame: darkMat, back: false });
  wall.position.set(wx, wy + 5 * S, wz);
  for (const sx of [-1, 1]) place(cyl, alloy, sx * 3.5 * S, wy + 1.25 * S, wz, 0.15 * S, 2.5 * S, 0.15 * S);
  block(-3.5 * S, wz, 0.6 * S); block(3.5 * S, wz, 0.6 * S);
  let acc = 0; ticks.push((t, dt) => { acc += dt; if (acc > 0.25) { acc = 0; dash.redraw(t); } });
}

// ---------------------------------------------------------------------------
//  07 · Producción audiovisual — film set, crane camera, morphing screen
// ---------------------------------------------------------------------------
function studio({ group, S, color, neon, neonHot, place, floorY, block }) {
  const base = floorY(0, 0);
  // big screen that morphs between 16:9 and 9:16 deliverables
  const W = 640, H = 640;
  let shape = { w: 8, h: 4.5, label: '16:9 · LANDING' };
  const video = canvasTex(W, H, (c, w, h, t) => {
    const sx = w / shape.w, sy = h / shape.h;  // pixels per world unit, keeps circles round
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, `hsl(${280 + Math.sin(t * 0.3) * 30},70%,45%)`); g.addColorStop(0.65, `hsl(${330 + Math.sin(t * 0.25) * 20},80%,62%)`); g.addColorStop(1, '#1b0f2c');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffd59a'; c.beginPath(); c.ellipse(w / 2, h * 0.62, 1.1 * sx, 1.1 * sy, 0, 0, 7); c.fill();
    c.fillStyle = '#2a1540'; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 16) c.lineTo(x, h * 0.72 + Math.sin(x * 0.02 + t * 0.4) * 18 + Math.sin(x * 0.051) * 26); c.lineTo(w, h); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 4; const m = 22;
    for (const [x, y, dx, dy] of [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]]) { c.beginPath(); c.moveTo(x, y + dy * 40); c.lineTo(x, y); c.lineTo(x + dx * 40, y); c.stroke(); }
    if (Math.sin(t * 4) > 0) { c.fillStyle = '#ff3a4a'; c.beginPath(); c.arc(50, 56, 11, 0, 7); c.fill(); }
    c.fillStyle = '#fff'; c.font = '600 26px Inter'; c.textBaseline = 'middle'; c.fillText('REC', 70, 57);
    const tc = Math.floor(t * 24); c.fillText(`00:${String(Math.floor(tc / 1440) % 60).padStart(2, '0')}:${String(Math.floor(tc / 24) % 60).padStart(2, '0')}:${String(tc % 24).padStart(2, '0')}`, w - 210, 57);
    c.fillStyle = 'rgba(16,8,30,.7)'; rrect(c, 28, h - 82, 300, 48, 24); c.fill(); c.fillStyle = '#fff'; c.font = '30px Anton'; c.fillText(shape.label, 48, h - 57);
  });
  const sx0 = 0, sz0 = -6.8 * S, sy0 = floorY(sx0, sz0);
  const scr = new THREE.Group(); scr.position.set(sx0, sy0 + 5.4 * S, sz0); group.add(scr);
  const frame = place(box, darkMat, 0, 0, -0.1 * S, 1, 1, 0.2 * S, scr);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), screenMat(video.tex)); plane.position.z = 0.02 * S; scr.add(plane);
  for (const s of [-1, 1]) place(cyl, alloy, s * 3 * S, sy0 + 1.2 * S, sz0, 0.16 * S, 2.4 * S, 0.16 * S);
  block(-3 * S, sz0, 0.6 * S); block(3 * S, sz0, 0.6 * S);
  let acc = 0, morph = 0;
  ticks.push((t, dt) => {
    const vertical = Math.floor(t / 7) % 2 === 1; morph += ((vertical ? 1 : 0) - morph) * Math.min(1, dt * 3);
    const w = THREE.MathUtils.lerp(8, 3.4, morph), h = THREE.MathUtils.lerp(4.5, 6.0, morph);
    shape = { w, h, label: vertical ? '9:16 · REELS' : '16:9 · LANDING' };
    plane.scale.set(w * S, h * S, 1); frame.scale.set((w + 0.3) * S, (h + 0.3) * S, 0.2 * S);
    acc += dt; if (acc > 0.1) { acc = 0; video.redraw(t); }
  });
  // camera crane
  const kx = 4.4 * S, kz = 1.6 * S, ky = floorY(kx, kz);
  place(cyl, darkMat, kx, ky + 0.3 * S, kz, 1.1 * S, 0.6 * S, 1.1 * S);
  place(cyl, alloy, kx, ky + 2 * S, kz, 0.2 * S, 3.4 * S, 0.2 * S);
  block(kx, kz, 1.2 * S);
  const arm = new THREE.Group(); arm.position.set(kx, ky + 3.7 * S, kz); group.add(arm);
  const tilt = new THREE.Group(); arm.add(tilt);
  place(box, alloy, -1.2 * S, 0, 0, 6.4 * S, 0.24 * S, 0.24 * S, tilt);
  place(box, darkMat, 1.7 * S, 0, 0, 0.8 * S, 0.8 * S, 0.8 * S, tilt);
  const cam = new THREE.Group(); cam.position.set(-4.4 * S, -0.5 * S, 0); tilt.add(cam);
  place(box, darkMat, 0, 0, 0, 1.0 * S, 0.8 * S, 1.3 * S, cam);
  const lens = place(cyl, alloy, 0, 0, 0.9 * S, 0.3 * S, 0.6 * S, 0.3 * S, cam); lens.rotation.x = Math.PI / 2;
  place(new THREE.CylinderGeometry(0.42, 0.3, 0.3, 4), darkMat, 0, 0, 1.3 * S, S, S, S, cam).rotation.set(Math.PI / 2, Math.PI / 4, 0);
  const tally = place(ball, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.2, 0.25), toneMapped: false }), 0, 0.5 * S, 0.5 * S, 0.1 * S, 0.1 * S, 0.1 * S, cam);
  for (const s of [-1, 1]) { const reel = place(cyl, alloy, 0, 0.75 * S, s * 0.35 * S, 0.38 * S, 0.1 * S, 0.38 * S, cam); reel.rotation.x = Math.PI / 2; ticks.push((t) => { reel.rotation.y = t * 2; }); }
  const target = new THREE.Vector3(), wp = new THREE.Vector3();
  ticks.push((t) => {
    arm.rotation.y = 0.9 + Math.sin(t * 0.25) * 0.6; tilt.rotation.z = Math.sin(t * 0.33) * 0.25;
    scr.getWorldPosition(target); cam.getWorldPosition(wp); cam.lookAt(target);
    tally.visible = Math.sin(t * 5) > -0.2;
  });
  // softbox lights
  for (const [lx, lz] of [[-5.2 * S, -1.6 * S], [5.6 * S, -3.8 * S]]) {
    const ly = floorY(lx, lz);
    for (let i = 0; i < 3; i++) { const a = i * 2.09; rodBetween(new THREE.Vector3(lx + Math.cos(a) * 0.7 * S, ly, lz + Math.sin(a) * 0.7 * S), new THREE.Vector3(lx, ly + 1.2 * S, lz), 0.04 * S, alloy, group); }
    place(cyl, alloy, lx, ly + 2.4 * S, lz, 0.06 * S, 2.6 * S, 0.06 * S);
    const head = new THREE.Group(); head.position.set(lx, ly + 3.9 * S, lz); group.add(head); head.lookAt(group.localToWorld(new THREE.Vector3(0, base + 2 * S, 0)));
    const sb = place(new THREE.CylinderGeometry(1.3, 0.55, 1.2, 4, 1, true), darkMat, 0, 0, -0.1 * S, S, S, S, head); sb.rotation.set(Math.PI / 2, Math.PI / 4, 0);
    const diff = place(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 1.2, 1.3), toneMapped: false }), 0, 0, 0.5 * S, S, S, S, head);
    diff.rotation.z = 0;
    block(lx, lz, 0.9 * S);
  }
  // clapperboard
  const slate = canvasTex(512, 384, (c, w, h) => {
    c.fillStyle = '#111018'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3;
    c.strokeRect(14, 14, w - 28, h - 28); c.beginPath(); c.moveTo(14, 140); c.lineTo(w - 14, 140); c.moveTo(w / 2, 140); c.lineTo(w / 2, 260); c.moveTo(14, 260); c.lineTo(w - 14, 260); c.stroke();
    c.fillStyle = '#fff'; c.font = '60px Anton'; c.textBaseline = 'middle'; c.fillText('O R-K FILMS', 34, 80);
    c.font = '500 20px Inter'; c.fillText('ESCENA', 34, 168); c.fillText('TOMA', w / 2 + 20, 168); c.font = '52px Anton'; c.fillText('01', 34, 220); c.fillText('03', w / 2 + 20, 220);
    c.font = '500 22px Inter'; c.fillText('Lanzamiento · multiformato', 34, 312);
  });
  const stripes = canvasTex(256, 32, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#111018' : '#f3eff8'; c.beginPath(); c.moveTo(i * 32, h); c.lineTo(i * 32 + 16, 0); c.lineTo(i * 32 + 48, 0); c.lineTo(i * 32 + 32, h); c.fill(); } });
  const bx = -4.2 * S, bz = 3.2 * S, by = floorY(bx, bz);
  const clap = new THREE.Group(); clap.position.set(bx, by, bz); clap.rotation.set(0, 0.5, 0); group.add(clap);
  const board = place(box, [darkMat, darkMat, darkMat, darkMat, new THREE.MeshStandardMaterial({ map: slate.tex, roughness: 0.5 }), darkMat], 0, 1.4 * S, 0, 3.2 * S, 2.4 * S, 0.18 * S, clap); board.rotation.x = -0.2;
  const stripeMat = new THREE.MeshStandardMaterial({ map: stripes.tex, roughness: 0.4 });
  place(box, [darkMat, darkMat, darkMat, darkMat, stripeMat, darkMat], 0, 2.82 * S, -0.28 * S, 3.2 * S, 0.4 * S, 0.18 * S, clap).rotation.x = -0.2;
  const hinge = new THREE.Group(); hinge.position.set(-1.6 * S, 3.08 * S, -0.33 * S); hinge.rotation.x = -0.2; clap.add(hinge);
  const stick = place(box, [darkMat, darkMat, darkMat, darkMat, stripeMat, darkMat], 1.6 * S, 0.2 * S, 0, 3.2 * S, 0.4 * S, 0.18 * S, hinge);
  block(bx, bz, 1.4 * S);
  ticks.push((t) => { const c = t % 3.5; hinge.rotation.z = c < 2.6 ? Math.min(0.55, c * 0.6) : Math.max(0, 0.55 - (c - 2.6) * 6); });
}

// ---------------------------------------------------------------------------
//  08 · Branding e identidad — positioning light refracted into every touchpoint
// ---------------------------------------------------------------------------
function touchpoint(label, icon, col) {
  return canvasTex(256, 320, (c, w, h) => {
    c.fillStyle = 'rgba(16,8,30,.9)'; rrect(c, 4, 4, w - 8, h - 8, 22); c.fill(); c.strokeStyle = col; c.lineWidth = 5; c.stroke();
    c.fillStyle = col; c.font = '120px Anton'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(icon, w / 2, 130);
    c.fillStyle = '#fff'; c.font = '34px Anton'; c.fillText(label, w / 2, 262);
  });
}
function branding({ isl, group, S, color, neon, neonHot, place, floorY, block }) {
  const base = floorY(0, 0), cy = base + 5.6 * S;
  // positioning orb on the left emits the core idea
  const ox = -8.2 * S, oy0 = floorY(ox, 0);
  place(new THREE.CylinderGeometry(0.9 * S, 1.2 * S, 2.6 * S, 6), alloy, ox, oy0 + 1.3 * S, 0); block(ox, 0, 1.3 * S);
  const idea = place(ball, new THREE.MeshPhysicalMaterial({ color: 0xf4f2ee, emissive: 0xfff6ee, emissiveIntensity: 0.35, roughness: 0.15, clearcoat: 1 }), ox, oy0 + 3.6 * S, 0, 0.55 * S, 0.55 * S, 0.55 * S);
  const halo = place(new THREE.TorusGeometry(1.1 * S, 0.02 * S, 6, 64), alloy, ox, oy0 + 3.6 * S, 0);
  const tag = canvasTex(512, 96, (c, w, h) => { c.fillStyle = '#fff'; c.font = '54px Anton'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('POSICIONAMIENTO', w / 2, h / 2); });
  const tagM = new THREE.Mesh(new THREE.PlaneGeometry(4 * S, 0.75 * S), new THREE.MeshBasicMaterial({ map: tag.tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  tagM.position.set(ox, oy0 + 5.1 * S, 0); group.add(tagM); billboard(tagM);
  // incoming white beam
  const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 1.08, 1.12), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  rodBetween(new THREE.Vector3(ox, oy0 + 3.6 * S, 0), new THREE.Vector3(0, cy, 0), 0.1 * S, beamMat, group);
  // the hologram: the O of the O R-K logo in glass, catching the idea and refracting it into the touchpoints
  const prism = new THREE.Group(); prism.position.set(0, cy, 0); group.add(prism);
  new SVGLoader().load('/assets/brand/ork-simbolo-blanco.svg', (data) => {
    const W = 191.76, H = 226.75, D = 46, scl = 5.2 * S / H, inner = new THREE.Group();
    inner.scale.setScalar(scl); inner.rotation.x = Math.PI; inner.position.set(-W / 2 * scl, H / 2 * scl, D / 2 * scl); prism.add(inner);
    const glassO = new THREE.MeshPhysicalMaterial({ color: 0xf4f0ff, emissive: color, emissiveIntensity: 0.22, roughness: 0.05, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.55, envMapIntensity: 1.5 });
    const edgeO = new THREE.LineBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.8), toneMapped: false, transparent: true, opacity: 0.55 });
    for (const p of data.paths) for (const sh of SVGLoader.createShapes(p)) {
      const geo = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: true, bevelThickness: 5, bevelSize: 3, bevelSegments: 3, curveSegments: 24 });
      const m = new THREE.Mesh(geo, glassO); m.renderOrder = 3; inner.add(m);
      inner.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 35), edgeO));
    }
  });
  place(new THREE.CylinderGeometry(1.4 * S, 1.8 * S, 1 * S, 6), alloy, 0, base + 0.5 * S, 0); block(0, 0, 1.9 * S);
  place(new THREE.TorusGeometry(1.6 * S, 0.02 * S, 6, 6), neon, 0, base + 1.02 * S, 0).rotation.x = Math.PI / 2;
  // refracted rays land on six touchpoints
  const TPS = [['LOGO', '◎'], ['WEB', '⌘'], ['EMPAQUE', '▣'], ['REDES', '#'], ['SEÑALÉTICA', '➜'], ['PAPELERÍA', '✉']];
  const rays = [];
  TPS.forEach(([label, icon], i) => {
    const hue = i / TPS.length * 0.8, col = new THREE.Color().setHSL(hue, 0.9, 0.6);
    const a = -0.95 + i * (1.9 / (TPS.length - 1)), px = Math.cos(a) * 9 * S, pz = Math.sin(a) * 9 * S, py = floorY(px, pz);
    place(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), darkMat, px, py, pz, 0.5 * S, 2.6 * S, 0.5 * S); block(px, pz, 0.8 * S);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2 * S, 2.5 * S), new THREE.MeshBasicMaterial({ map: touchpoint(label, icon, '#' + col.getHexString()).tex, transparent: true, side: THREE.DoubleSide }));
    card.position.set(px, py + 4 * S, pz); card.lookAt(group.localToWorld(new THREE.Vector3(0, py + 4 * S, 0))); group.add(card);
    const rayMat = new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2.2), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const ray = rodBetween(new THREE.Vector3(1.2 * S, cy, 0), new THREE.Vector3(px, py + 4 * S, pz), 0.07 * S, rayMat, group);
    rays.push({ ray, ph: i });
  });
  ticks.push((t) => {
    prism.rotation.y = Math.sin(t * 0.3) * 0.9; prism.position.y = cy + Math.sin(t * 0.8) * 0.2 * S;
    idea.scale.setScalar(0.55 * S * (1 + Math.sin(t * 2) * 0.04)); halo.rotation.set(t * 0.6, t * 0.4, 0);
    rays.forEach(r => { r.ray.material.opacity = 0.45 + Math.sin(t * 2.5 + r.ph) * 0.25; });
  });
}

// ---------------------------------------------------------------------------
//  Base Nova — the orca dock (keeps the nests the dragons module expects)
// ---------------------------------------------------------------------------
function dock({ isl, group, S, color, neon, neonHot, glass, place, floorY }) {
  for (const x of [-8, 0, 8]) {
    place(pillar, alloy, x, 0.2, 0, 3.5, 0.5, 3.5);
    place(pillar, glass, x, 0.49, 0, 2.6, 0.14, 2.6);
    const ringM = place(new THREE.TorusGeometry(2.9, 0.06, 6, 48), neonHot, x, 0.6, 0); ringM.rotation.x = Math.PI / 2;
    ticks.push((t) => ringM.scale.setScalar(1 + Math.sin(t * 2 + x) * 0.05));
  }
  // nests are in island space; the group is rotated, so map the local X offsets through it
  isl.nests = [-8, 0, 8].map(x => group.localToWorld(new THREE.Vector3(x, 0.6, 0)));
  // landing beacons
  for (const s of [-1, 1]) {
    const x = s * 11 * S, z = -4 * S, y = floorY(x, z);
    place(cyl, alloy, x, y + 2.5 * S, z, 0.18 * S, 5 * S, 0.18 * S);
    const lamp = place(orb, neonHot, x, y + 5.2 * S, z, 0.4 * S, 0.4 * S, 0.4 * S);
    ticks.push((t) => { lamp.visible = Math.sin(t * 3 + s) > -0.3; });
  }
}

// ---------------------------------------------------------------------------
//  customer-service desk at every island entrance (the agent NPC is spawned in main.js)
// ---------------------------------------------------------------------------
function reception({ isl, group, S, color, neon, neonHot, place, floorY, block }, serviceName) {
  const dx = 2.7 * S, dz = isl.R * 0.56, y = floorY(dx, dz);
  const desk = new THREE.Group(); desk.position.set(dx, y, dz); group.add(desk);
  const front = canvasTex(512, 200, (c, w, h) => {
    c.fillStyle = '#120c22'; c.fillRect(0, 0, w, h);
    c.fillStyle = css(color); c.fillRect(0, 0, w, 10);
    c.fillStyle = '#ffffff'; c.font = '46px Anton'; c.textBaseline = 'top'; c.fillText('ATENCIÓN AL CLIENTE', 28, 30);
    c.fillStyle = css(color); c.font = '600 26px Inter'; c.fillText(serviceName, 30, 104);
    c.fillStyle = 'rgba(255,255,255,.55)'; c.font = '400 20px Inter'; c.fillText('Habla conmigo · te explico el servicio', 30, 148);
  });
  // counter: body with branded front, light top, neon kick strip
  place(box, [darkMat, darkMat, darkMat, darkMat, new THREE.MeshStandardMaterial({ map: front.tex, emissive: 0xffffff, emissiveMap: front.tex, emissiveIntensity: 0.18, roughness: 0.5 }), darkMat],
    0, 0.24, 0, 2.4, 0.48, 0.62, desk);
  place(box, whiteMat, 0, 0.52, -0.05, 2.6, 0.08, 0.82, desk);
  place(box, neonHot, 0, 0.05, 0.32, 2.4, 0.05, 0.02, desk).castShadow = false;
  // monitor facing the agent, small bell facing the visitor
  const mon = new THREE.Group(); mon.position.set(-0.95, 0.56, -0.2); mon.rotation.y = Math.PI - 0.5; desk.add(mon);
  place(box, darkMat, 0, 0.3, 0, 0.62, 0.4, 0.04, mon);
  place(new THREE.PlaneGeometry(0.56, 0.34), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.9) }), 0, 0.3, 0.025, 1, 1, 1, mon);
  place(cyl, alloy, 0, 0.06, 0, 0.03, 0.12, 0.03, mon);
  place(new THREE.SphereGeometry(0.09, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), goldMat, 0.85, 0.56, 0.12, 1, 1, 1, desk);
  // "?" help sign floating above the desk
  const help = canvasTex(256, 256, (c, w) => {
    c.fillStyle = css(color); c.beginPath(); c.arc(w / 2, w / 2, 118, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.font = '170px Anton'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', w / 2, w / 2 + 8);
  });
  const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: help.tex, transparent: true, depthWrite: false }));
  sign.scale.setScalar(0.6); sign.position.set(0, 1.85, -0.75); desk.add(sign);
  ticks.push((t) => { sign.position.y = 1.85 + Math.sin(t * 2.2) * 0.08; });
  block(dx, dz, 1.25);
  group.updateMatrixWorld(true);
  isl.agent = { pos: desk.localToWorld(new THREE.Vector3(0, 0, -0.75)), heading: group.rotation.y };
  const vp = desk.localToWorld(new THREE.Vector3(0.25, 0.56, 0.05)); requestProp('vase', vp.x, vp.y, vp.z, rand() * 6, 0.9);
  const sp = desk.localToWorld(new THREE.Vector3(-0.35, 0.56, 0.1)); requestProp('succulent', sp.x, sp.y, sp.z, rand() * 6, 1.3);
}


// ---------------------------------------------------------------------------
//  Understand island (GLB): violet veins, hanging crystals, light-falls
// ---------------------------------------------------------------------------
export function decorateCentral(islaMesh, scale) {
  const VIOLET = 0x9371ff;
  islaMesh.material.color.set(0x4a3d63); islaMesh.material.metalness = 0.4; islaMesh.material.roughness = 0.62;
  veinMaterial(islaMesh.material, VIOLET, scale * 1.7, -1.0);
  islaMesh.material.needsUpdate = true;
  islaMesh.updateMatrixWorld(true);
  const pos = islaMesh.geometry.attributes.position, nor = islaMesh.geometry.attributes.normal;
  const crystalMat = new THREE.MeshStandardMaterial({ color: VIOLET, emissive: VIOLET, emissiveIntensity: 1.2, roughness: 0.15, metalness: 0.2, flatShading: true });
  const nm = new THREE.Matrix3().getNormalMatrix(islaMesh.matrixWorld), p = new THREE.Vector3(), n = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0);
  let placed = 0;
  for (let tries = 0; tries < 4000 && placed < 22; tries++) {
    const i = Math.floor(rand() * pos.count);
    if (pos.getY(i) > -1.4 || nor.getY(i) > -0.15) continue;
    p.fromBufferAttribute(pos, i).applyMatrix4(islaMesh.matrixWorld);
    n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
    const dir = n.clone().lerp(down, 0.55).normalize(), sc = rr(0.45, 1.0) * (placed < 3 ? 1.7 : 1);
    const m = new THREE.Mesh(BT.shard, crystalMat);
    m.position.copy(p).addScaledVector(n, -0.15); m.quaternion.setFromUnitVectors(down, dir); m.scale.set(sc * 0.6, sc * rr(0.9, 1.5), sc * 0.6);
    scene.add(m); placed++;
  }
  const g = new THREE.Group(); scene.add(g);
  const bridgeAngles = ISLANDS.filter(i => !i.outer).map(i => Math.atan2(i.c.z, i.c.x));
  const open = (a) => bridgeAngles.every(b => Math.abs(((a - b) + Math.PI * 3) % (Math.PI * 2) - Math.PI) > 0.45);
  let falls = 0;
  for (let k = 0; k < 40 && falls < 3; k++) {
    const a = rand() * 6.283; if (!open(a)) continue;
    const r = 4.95 * scale, x = Math.cos(a) * r, z = Math.sin(a) * r, y = groundAt(x * 0.9, z * 0.9);
    if (y === null) continue;
    const holder = new THREE.Group(); holder.position.y = y - 0.3; g.add(holder); holder.updateMatrixWorld(true);
    lightFall(holder, VIOLET, x, z, rr(1.6, 2.2), 22);
    falls++;
  }
}

// ---------------------------------------------------------------------------
//  light pulses travelling along every bridge rope
// ---------------------------------------------------------------------------
export function buildBridgeLights() {
  const geo = new THREE.SphereGeometry(0.09, 10, 8);
  for (const br of BRIDGES) {
    if (!br.ropes) continue;
    const from = br.center ? 0x9371ff : (districts[br.isl.link]?.color ?? 0x9371ff);
    const to = districts[br.isl.id]?.color ?? 0xd9c5ff;
    const n = Math.max(2, Math.round(br.len / 9));
    br.ropes.forEach((curve, side) => {
      for (let i = 0; i < n; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
        const orb = new THREE.Mesh(geo, mat); scene.add(orb);
        const off = i / n + side * 0.5 / n, dir = side ? -1 : 1, cA = new THREE.Color(from).multiplyScalar(2.6), cB = new THREE.Color(to).multiplyScalar(2.6);
        ticks.push((t) => {
          let u = ((off + t * 0.06 * dir) % 1 + 1) % 1;
          curve.getPoint(u, orb.position);
          mat.color.copy(cA).lerp(cB, u);
          orb.scale.setScalar(0.8 + Math.sin(t * 6 + i) * 0.25);
        });
      }
    });
  }
}

// ---------------------------------------------------------------------------
//  sky set pieces: a ringed planet and a moon far beyond the archipelago
// ---------------------------------------------------------------------------
export function buildSkyDecor() {
  const planetMat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.time, uSun: { value: new THREE.Vector3(-0.95, 0.35, 0.2).normalize() } }, fog: false,
    vertexShader: 'varying vec3 vN; varying vec3 vP; varying vec3 vV; void main(){ vN = normalize(normal); vP = position; vec4 w = modelMatrix * vec4(position, 1.0); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uTime; uniform vec3 uSun; varying vec3 vN; varying vec3 vP; varying vec3 vV;
      void main(){
        float lat = vN.y; float bands = sin(lat * 22.0 + sin(vN.x * 5.0 + uTime * 0.02) * 1.6) * 0.5 + 0.5;
        float fine = sin(lat * 70.0 + vN.z * 3.0) * 0.5 + 0.5;
        vec3 c = mix(vec3(0.42, 0.25, 0.78), vec3(0.98, 0.62, 0.82), bands);
        c = mix(c, vec3(0.99, 0.86, 0.75), smoothstep(0.75, 1.0, fine) * 0.35);
        float light = clamp(dot(vN, uSun) * 0.9 + 0.25, 0.08, 1.0);
        float rim = pow(clamp(1.0 - dot(vN, vV), 0.0, 1.0), 3.0);
        gl_FragColor = vec4(c * light + vec3(0.75, 0.55, 1.0) * rim * 0.9, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(150, 64, 32), planetMat);
  planet.position.set(560, -150, -960); planet.scale.setScalar(1.45); planet.rotation.z = 0.35; scene.add(planet);
  const ringMat = new THREE.ShaderMaterial({
    fog: false, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vP;
      void main(){ float r = length(vP); float t = (r - 190.0) / 150.0;
        float bands = 0.55 + 0.45 * sin(t * 60.0) * sin(t * 17.0 + 1.3);
        float a = smoothstep(0.0, 0.06, t) * smoothstep(1.0, 0.85, t) * (0.35 + bands * 0.5) * (1.0 - smoothstep(0.42, 0.47, t) * smoothstep(0.53, 0.48, t));
        vec3 c = mix(vec3(0.95, 0.8, 1.0), vec3(1.0, 0.7, 0.85), t);
        gl_FragColor = vec4(c, a * 0.75);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(190, 340, 128, 1), ringMat);
  ring.position.copy(planet.position); ring.scale.setScalar(1.45); ring.rotation.set(-1.25, 0.25, 0.4); scene.add(ring);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(42, 40, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 1.1, 1.25), fog: false, toneMapped: false }));
  moon.position.set(-760, 190, -760); scene.add(moon);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (c, w) => { const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(230,215,255,.9)'); g.addColorStop(0.3, 'rgba(200,170,255,.35)'); g.addColorStop(1, 'rgba(160,120,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); }).tex, fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.setScalar(260); glow.position.copy(moon.position); scene.add(glow);
  ticks.push((t) => { planet.rotation.y = t * 0.01; });
}

// ---------------------------------------------------------------------------
//  O R-K logo floating over the Understand island
// ---------------------------------------------------------------------------
export const logo = { hits: [], pulse: 0 };
export function buildLogo(y0 = 0) {
  const VIOLET = 0x7c3cff;
  const base = new THREE.Group(); base.position.y = y0; scene.add(base);
  const hot = new THREE.MeshBasicMaterial({ color: new THREE.Color(VIOLET).multiplyScalar(2.4), toneMapped: false });
  const soft = new THREE.MeshBasicMaterial({ color: 0xd9c5ff });
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.06, 6, 96), hot); r1.rotation.x = Math.PI / 2; r1.position.y = 0.35; base.add(r1);
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.035, 6, 96), soft); r2.position.y = 0.6; base.add(r2);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.05, 6, 128), hot); halo.position.y = 6.4; base.add(halo);
  const lift = new THREE.Mesh(beamGeo, beamMaterial(VIOLET, 0.16)); lift.scale.set(2.6, 7, 2.6); lift.position.y = 0.3; base.add(lift);
  motes(base, 0xb89cff, 3.2, 9, 120);

  const holder = new THREE.Group(); holder.position.y = y0 + 6.4; scene.add(holder);
  const cap = new THREE.MeshPhysicalMaterial({ color: 0xf3eff8, emissive: 0xe9e1d6, emissiveIntensity: 0.22, roughness: 0.22, clearcoat: 1, metalness: 0.05 });
  const side = new THREE.MeshStandardMaterial({ color: VIOLET, emissive: VIOLET, emissiveIntensity: 0.7, metalness: 0.5, roughness: 0.3 });
  new SVGLoader().load('/assets/brand/ork-logo-papel.svg', (data) => {
    const W = 796, H = 226.75, D = 40, s = 10 / W;
    const inner = new THREE.Group(); inner.scale.setScalar(s); inner.rotation.x = Math.PI;  // SVG y points down
    inner.position.set(-W / 2 * s, H / 2 * s, D / 2 * s);
    for (const p of data.paths) for (const sh of SVGLoader.createShapes(p)) {
      const geo = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: true, bevelThickness: 5, bevelSize: 3, bevelSegments: 3, curveSegments: 18 });
      const m = new THREE.Mesh(geo, [cap, side]); m.castShadow = true; inner.add(m); logo.hits.push(m);
    }
    holder.add(inner);
  });
  const look = new THREE.Vector3();
  ticks.push((t, dt) => {
    logo.pulse = Math.max(0, logo.pulse - dt * 1.5);
    holder.position.y = y0 + 6.4 + Math.sin(t * 0.9) * 0.3;
    look.set(camera.position.x, holder.position.y, camera.position.z);
    holder.lookAt(look); holder.rotateY(Math.sin(t * 0.5) * 0.18);
    holder.scale.setScalar(1 + logo.pulse * 0.12);
    side.emissiveIntensity = 0.7 + logo.pulse * 1.6;
    r2.rotation.set(Math.PI / 2 + Math.sin(t * 0.7) * 0.35, t * 0.4, 0);
    halo.rotation.set(Math.PI / 2 + Math.sin(t * 0.3) * 0.2, 0, t * 0.1);
    halo.position.y = holder.position.y - y0;
  });
}

// ---------------------------------------------------------------------------
//  service challenge console (HUD panel)
// ---------------------------------------------------------------------------
export function createServiceConsole({ navigate, getProgress, onComplete }) {
  const panel = document.querySelector('#serviceConsole');
  const title = panel.querySelector('h2');
  const brief = panel.querySelector('#serviceBrief');
  const question = panel.querySelector('#serviceQuestion');
  const options = panel.querySelector('#serviceOptions');
  const feedback = panel.querySelector('#serviceFeedback');
  const select = document.querySelector('#serviceSelect');
  const progress = document.querySelector('#serviceProgress');
  const completed = new Set();
  const updateProgress = () => { progress.textContent = String(completed.size + Number(getProgress())); };
  const open = (id) => {
    const service = districts[id];
    if (!service?.brief) return;
    select.value = id;
    title.textContent = service.name;
    brief.textContent = service.brief;
    question.textContent = service.question;
    feedback.textContent = completed.has(id) ? service.result : '';
    options.replaceChildren(...service.options.map((label, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.onclick = () => {
        if (i !== service.answer) {
          feedback.textContent = 'Esa decisión deja el problema abierto. Prueba la otra opción.';
          return;
        }
        if (!completed.has(id)) {
          completed.add(id);
          updateProgress();
          onComplete();
        }
        feedback.textContent = service.result;
      };
      return button;
    }));
    panel.hidden = false;
  };
  for (const [id, { name, brief }] of Object.entries(districts)) {
    if (brief) select.add(new Option(name, id));
  }
  select.onchange = () => { if (select.value) navigate(select.value); };
  panel.querySelector('#closeService').onclick = () => {
    panel.hidden = true;
    select.focus();
  };
  return {
    open,
    updateProgress,
    snapshot: () => [...completed],
    restore: (ids) => {
      if (!Array.isArray(ids)) return;
      for (const id of ids) if (Object.hasOwn(districts, id) && districts[id].brief) completed.add(id);
      updateProgress();
    },
    close: () => { panel.hidden = true; select.value = ''; },
  };
}
