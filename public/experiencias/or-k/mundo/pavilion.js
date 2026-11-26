// The O R-K pavilion: a big round hall floating above the cloud sea. Polished floor with light paths
// to every stand, a glazed wall with the entrance, a ribbed glass dome, hanging service banners and a
// curved LED wall playing the O R-K showreel. The dome hides itself when the camera is outside/above.
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { scene, camera, LOW, skyEnv } from './core.js';
import { HALL, ISLANDS, addObstacle } from './terrain.js';
import { requestProp, onProp, oakMaterial, pbrMaps } from './props.js?v=5';

const ENTRANCE = HALL.entrance;                           // world angle of the doors (faces the opening camera)
const toTheta = (phi) => Math.PI / 2 - phi;               // three's cylinder θ ↔ world angle atan2(z, x)

const fontsReady = document.fonts ? Promise.all([document.fonts.load('40px Anton'), document.fonts.load('600 20px Inter')]).catch(() => {}) : Promise.resolve();
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d'); draw(c, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  fontsReady.then(() => { c.clearRect(0, 0, w, h); draw(c, w, h); t.needsUpdate = true; });   // redraw once Anton/Inter are in
  return t;
}

function floorMaterial() {
  const angles = ISLANDS.map(i => Math.atan2(i.c.z, i.c.x));
  const m = new THREE.MeshStandardMaterial({ color: 0xeceef2, metalness: 0.04, roughness: 0.85, ...pbrMaps('marble_01', 60, 60) });
  m.normalScale.set(0.6, 0.6);
  // lightmap baked in Blender/Cycles (scripts/blender/bake_floor.py): sky, low sun, stand spots, neon bounce
  const bake = new THREE.TextureLoader().load('entorno/bake/floor_bake.jpg?v=2'); bake.colorSpace = THREE.NoColorSpace; bake.anisotropy = 4;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = { value: 0 }; sh.uniforms.uBake = { value: bake }; m.userData.u = sh.uniforms;
    sh.vertexShader = 'varying vec2 vF;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvF = vec2(position.x, -position.y);');
    sh.fragmentShader = `uniform float uTime; uniform sampler2D uBake; varying vec2 vF;
      const float ANG[8] = float[8](${angles.map(a => a.toFixed(4)).join(',')});
      float line(float x, float w) { float f = fwidth(x) * 1.5; return 1.0 - smoothstep(w, w + f, abs(x)); }
      ` + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float r = length(vF), a = atan(vF.y, vF.x);
      vec3 bk = texture2D(uBake, vec2(vF.x / ${(2 * HALL.R).toFixed(1)} + 0.5, -vF.y / ${(2 * HALL.R).toFixed(1)} + 0.5)).rgb * 2.0;
      bk = vec3(dot(bk, vec3(0.2126, 0.7152, 0.0722)));
      diffuseColor.rgb *= mix(vec3(1.0), bk, 0.85);
      // tiles
      vec2 g = fract(vF / 2.4) - 0.5; float tiles = 1.0 - smoothstep(0.47, 0.5, max(abs(g.x), abs(g.y)));
      // light paths from the lobby to each stand
      float path = 0.0, edge = 0.0;
      for (int i = 0; i < 8; i++) { float d = abs(r * sin(a - ANG[i])); float along = r * cos(a - ANG[i]);
        if (along > 8.5 && along < 27.0) { path = max(path, 1.0 - smoothstep(1.7, 1.8, d)); edge = max(edge, line(d - 1.75, 0.05)); } }
      float lobby = 1.0 - smoothstep(9.0, 9.1, r);
      float ringWalk = smoothstep(51.0, 51.1, r) * (1.0 - smoothstep(55.5, 55.6, r));
      // honed dark-stone runners with thin brass inlays (no neon: the light comes from the architecture)
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.36, 0.355, 0.35), max(path, ringWalk) * 0.9);
      float brass = max(edge, max(line(r - 9.0, 0.05), max(line(r - 51.0, 0.04), line(r - 55.6, 0.04))));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.58, 0.32), brass);
      totalEmissiveRadiance += vec3(1.0, 0.72, 0.42) * brass * 0.12;`);
  };
  m.customProgramCacheKey = () => 'orkhallfloor-baked';
  return m;
}

function domeCurve(t) { const k = t * Math.PI / 2; return { r: 8 + (HALL.R - 8) * Math.cos(k), y: HALL.wallH + (HALL.roofH - HALL.wallH) * Math.sin(k) }; }

export function buildPavilion({ districts }) {
  const R = HALL.R, root = new THREE.Group(); scene.add(root);
  const white = new THREE.MeshStandardMaterial({ color: 0xf1eee9, roughness: 0.9, metalness: 0.02, ...pbrMaps('white_stucco', 3, 3, ['nor', 'rough']) });
  white.normalScale.set(0.5, 0.5);
  const steel = new THREE.MeshStandardMaterial({ color: 0xcfcfd2, roughness: 0.32, metalness: 0.85 });
  const violetGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9371ff).multiplyScalar(2.2), toneMapped: false });

  // ---- floor + floating foundation ----
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 160), floorMaterial()); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor);
  // polished-floor reflections: a soft, Fresnel-weighted mirror laid just above the marble (desktop only)
  if (!LOW) {
    const mirror = new Reflector(new THREE.CircleGeometry(R - 0.4, 128), {
      textureWidth: Math.round(innerWidth * 0.5), textureHeight: Math.round(innerHeight * 0.5), multisample: 0, clipBias: 0.003,
      shader: {
        name: 'OrkFloorReflection',
        uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null } },
        vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
          void main(){ vUv = textureMatrix * vec4(position, 1.0); vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform sampler2D tDiffuse; varying vec4 vUv; varying vec3 vW;
          void main(){
            vec2 uv = vUv.xy / vUv.w, px = vec2(0.0035, 0.005);
            vec3 c = texture2D(tDiffuse, uv).rgb * 0.36;
            c += (texture2D(tDiffuse, uv + vec2(px.x, 0.0)).rgb + texture2D(tDiffuse, uv - vec2(px.x, 0.0)).rgb) * 0.16;
            c += (texture2D(tDiffuse, uv + vec2(0.0, px.y)).rgb + texture2D(tDiffuse, uv - vec2(0.0, px.y)).rgb) * 0.16;
            c = min(c, vec3(0.9));   // keep hot neon/LED reflections from blooming into flares
            float cosV = abs(normalize(cameraPosition - vW).y);
            float fres = 0.10 + 0.42 * pow(1.0 - cosV, 3.0);
            float edge = smoothstep(${(R - 0.4).toFixed(1)}, ${(R - 4).toFixed(1)}, length(vW.xz));
            gl_FragColor = vec4(c, fres * edge);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      },
    });
    mirror.material.transparent = true; mirror.material.depthWrite = false;
    mirror.rotation.x = -Math.PI / 2; mirror.position.y = 0.015; mirror.renderOrder = 0; mirror.userData.noAO = true; root.add(mirror);
  }
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(R + 1.2, R * 0.9, 3.2, 128), new THREE.MeshStandardMaterial({ color: 0x1b1c21, roughness: 0.5, metalness: 0.5 })); slab.position.y = -1.62; root.add(slab);
  const under = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.9, 5, 30, 96, 6), new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.7, metalness: 0.3, flatShading: true })); under.position.y = -3.2 - 15; root.add(under);
  for (const [y, rr] of [[-3.3, R * 0.9]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(rr + 0.15, 0.16, 6, 128), violetGlow); t.rotation.x = Math.PI / 2; t.position.y = y; root.add(t); }
  const edgeRing = new THREE.Mesh(new THREE.TorusGeometry(R + 1.2, 0.12, 6, 160), violetGlow); edgeRing.rotation.x = Math.PI / 2; edgeRing.position.y = 0.02; root.add(edgeRing);

  // ---- wall: solid skirt + glass band with mullions, leaving the entrance open ----
  const gap = 0.24, th0 = toTheta(ENTRANCE) + gap / 2, thL = Math.PI * 2 - gap;
  const woodTex = canvasTex(512, 256, (c, w, h) => {
    for (let x = 0; x < w; x += 16) { const k = 0.85 + Math.random() * 0.2; c.fillStyle = `rgb(${Math.round(196 * k)},${Math.round(150 * k)},${Math.round(108 * k)})`; c.fillRect(x, 0, 14, h); c.fillStyle = 'rgba(60,35,20,.55)'; c.fillRect(x + 14, 0, 2, h);
      for (let g = 0; g < 4; g++) { c.fillStyle = 'rgba(120,80,50,.15)'; c.fillRect(x + Math.random() * 12, 0, 1.5, h); } }
  });
  woodTex.wrapS = THREE.RepeatWrapping; woodTex.repeat.set(46, 1);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 3.2, 160, 1, true, th0, thL), oakMaterial(38, 1.2, { side: THREE.DoubleSide }));
  skirt.position.y = 1.6; skirt.receiveShadow = true; root.add(skirt);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(R, R, HALL.wallH - 3.2, 160, 1, true, th0, thL),
    new THREE.MeshStandardMaterial({ color: 0xdde5ee, metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
  glass.position.y = 3.2 + (HALL.wallH - 3.2) / 2; glass.renderOrder = 1; root.add(glass);
  skyEnv.then((env) => { glass.material.envMap = env; glass.material.envMapIntensity = 1.6; glass.material.needsUpdate = true; });
  const mullion = new THREE.BoxGeometry(0.32, HALL.wallH, 0.42), mull = new THREE.InstancedMesh(mullion, white, 40); let mi = 0; const m4 = new THREE.Matrix4();
  for (let i = 0; i < 40; i++) { const phi = i / 40 * Math.PI * 2; if (Math.abs(((phi - ENTRANCE) + Math.PI * 3) % (Math.PI * 2) - Math.PI) < gap / 2) continue; m4.makeRotationY(-phi).setPosition(Math.cos(phi) * R, HALL.wallH / 2, Math.sin(phi) * R); mull.setMatrixAt(mi++, m4); }
  mull.count = mi; mull.castShadow = true; root.add(mull);
  for (const y of [3.2, 7.1, HALL.wallH]) { const ringB = new THREE.Mesh(new THREE.TorusGeometry(R, 0.14, 6, 160), steel); ringB.rotation.x = Math.PI / 2; ringB.position.y = y; root.add(ringB); }
  // entrance portal
  const ex = Math.cos(ENTRANCE) * R, ez = Math.sin(ENTRANCE) * R, portal = new THREE.Group(); portal.position.set(ex, 0, ez); portal.lookAt(0, 0, 0); root.add(portal);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.8, 7.5, 0.8), white); p.position.set(s * 7.6, 3.75, 0); p.castShadow = true; portal.add(p); }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(16.4, 1.6, 0.9), white); lintel.position.y = 8.1; portal.add(lintel);
  const signTex = canvasTex(1024, 128, (c, w, h) => { c.fillStyle = '#111114'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '78px Anton'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PABELLÓN O R-K', w / 2, h / 2 + 4); c.fillStyle = '#7c3cff'; c.fillRect(0, h - 8, w, 8); });
  for (const s of [1, -1]) { const sign = new THREE.Mesh(new THREE.PlaneGeometry(15.6, 1.4), new THREE.MeshBasicMaterial({ map: signTex })); sign.position.set(0, 8.1, s * 0.47); if (s < 0) sign.rotation.y = Math.PI; portal.add(sign); }
  const doorGlow = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.08, 0.3), violetGlow); doorGlow.position.y = 7.25; portal.add(doorGlow);
  portal.updateMatrixWorld(true);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 1.1, 48), white); ped.position.set(0, 0.55, 7.5); ped.castShadow = ped.receiveShadow = true; portal.add(ped);
  const pedRing = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.05, 6, 48), violetGlow); pedRing.rotation.x = Math.PI / 2; pedRing.position.set(0, 1.12, 7.5); portal.add(pedRing);
  { const wp = portal.localToWorld(new THREE.Vector3(0, 1.1, 7.5)); requestProp('whale', wp.x, wp.y, wp.z, ENTRANCE + Math.PI / 2, 2.4); addObstacle(wp.x, wp.z, 1.7); }

  // ---- ribbed glass dome (cut away when the camera is outside) ----
  const roof = new THREE.Group(); root.add(roof);
  const ribPts = [], N = 24;
  for (let k = 0; k <= 20; k++) { const { r, y } = domeCurve(k / 20); ribPts.push([r, y]); }
  const ribMat = new THREE.MeshStandardMaterial({ color: 0xf1eef8, roughness: 0.3, metalness: 0.7 });
  for (let i = 0; i < N; i++) {
    const phi = i / N * Math.PI * 2, curve = new THREE.CatmullRomCurve3(ribPts.map(([r, y]) => new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r)));
    const rib = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.16, 6), ribMat); rib.castShadow = true; roof.add(rib);
  }
  for (const t of [0.35, 0.68, 1]) { const { r, y } = domeCurve(t); const ring = new THREE.Mesh(new THREE.TorusGeometry(r, t === 1 ? 0.3 : 0.14, 8, 128), t === 1 ? violetGlow : ribMat); ring.rotation.x = Math.PI / 2; ring.position.y = y; roof.add(ring); }
  const domeGlass = new THREE.Mesh(new THREE.LatheGeometry(ribPts.map(([r, y]) => new THREE.Vector2(r, y)), 96),
    new THREE.MeshStandardMaterial({ color: 0xdde5ee, metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }));
  domeGlass.renderOrder = 2; roof.add(domeGlass);
  skyEnv.then((env) => { domeGlass.material.envMap = env; domeGlass.material.envMapIntensity = 1.8; domeGlass.material.needsUpdate = true; });
  // spot lights along the ribs (just glowing discs, cheap)
  const spotG = new THREE.CircleGeometry(0.35, 16), spots = new THREE.InstancedMesh(spotG, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.4, 1.2), toneMapped: false, side: THREE.DoubleSide }), N * 2);
  let si = 0; const q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3();
  for (let i = 0; i < N; i++) for (const t of [0.22, 0.52]) { const phi = i / N * Math.PI * 2, { r, y } = domeCurve(t); pos.set(Math.cos(phi) * r, y - 0.25, Math.sin(phi) * r); q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)); spots.setMatrixAt(si++, m4.compose(pos, q, sc)); }
  roof.add(spots);

  // ---- hanging banners, one per service ----
  for (const isl of ISLANDS) {
    const d = districts[isl.id]; if (!d) continue;
    const col = '#' + new THREE.Color(d.color).getHexString();
    const tex = canvasTex(256, 768, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#101114'); g.addColorStop(1, '#1d1e24'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = col; c.fillRect(0, 0, w, 14); c.fillRect(0, h - 14, w, 14);
      c.save(); c.translate(w / 2 + 34, h - 60); c.rotate(-Math.PI / 2); c.fillStyle = '#fff'; c.textBaseline = 'middle';
      let fs = 92; c.font = `${fs}px Anton`; const label = d.name.toUpperCase(); while (c.measureText(label).width > h - 150 && fs > 40) { fs -= 4; c.font = `${fs}px Anton`; }
      c.fillText(label, 0, 0); c.restore();
      c.fillStyle = col; c.font = '600 26px Inter'; c.textAlign = 'center'; c.fillText('O R-K', w / 2 - 50, 60);
    });
    const phi = Math.atan2(isl.c.z, isl.c.x), r = 47, b = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 9.6), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.5, side: THREE.DoubleSide, roughness: 0.8 }));
    b.position.set(Math.cos(phi) * r, 15.5, Math.sin(phi) * r); b.lookAt(0, 15.5, 0); root.add(b);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 6), steel); rod.rotation.z = Math.PI / 2; rod.position.set(0, 4.85, 0); b.add(rod);
    for (const s of [-1, 1]) { const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 4, 4), steel); wire.position.set(s * 1.5, 6.85, 0); b.add(wire); }
  }

  // ---- curved LED wall with the showreel, opposite the entrance ----
  const video = document.createElement('video');
  Object.assign(video, { src: '/assets/ork-showreel.mp4', muted: true, loop: true, playsInline: true, crossOrigin: 'anonymous', preload: 'auto' });
  video.setAttribute('playsinline', ''); video.setAttribute('muted', '');
  const vtex = new THREE.VideoTexture(video); vtex.colorSpace = THREE.SRGBColorSpace; vtex.wrapS = THREE.RepeatWrapping; vtex.repeat.x = -1;
  const span = 0.42, back = ENTRANCE + Math.PI, screenR = R - 1.4;
  const screen = new THREE.Mesh(new THREE.CylinderGeometry(screenR, screenR, 8.4, 64, 1, true, toTheta(back) - span / 2, span), new THREE.MeshBasicMaterial({ map: vtex, side: THREE.BackSide, color: new THREE.Color(0.92, 0.92, 0.92) }));
  screen.position.y = 6.4; root.add(screen);
  const frame = new THREE.Mesh(new THREE.CylinderGeometry(screenR + 0.15, screenR + 0.15, 9, 64, 1, true, toTheta(back) - span / 2 - 0.01, span + 0.02), new THREE.MeshStandardMaterial({ color: 0x120d1e, roughness: 0.4, side: THREE.DoubleSide }));
  frame.position.y = 6.4; root.add(frame);
  const tryPlay = () => video.play().catch(() => {});
  tryPlay(); addEventListener('pointerdown', tryPlay, { once: true });

  // ---- gallery: real O R-K projects framed on the wall between stands ----
  const WORKS = [['Kliniu', '/assets/portfolio/kliniu-cover.webp'], ['GEU', '/assets/portfolio/geu-cover.webp'], ['Totalpars', '/assets/portfolio/totalpars-cover.webp'],
    ['Drokex', '/assets/portfolio/drokex-cover.webp'], ['4U Studio', '/assets/covers/4u.jpg'], ["L'Origine", '/assets/covers/lor.jpg']];
  const loader = new THREE.TextureLoader(), PW = 8.4, PH = 5;
  const gallerySpots = ISLANDS.map(i => Math.atan2(i.c.z, i.c.x) - Math.PI / 8)
    .filter(phi => Math.abs(((phi - ENTRANCE) + Math.PI * 3) % (Math.PI * 2) - Math.PI) > 0.4 && Math.abs(((phi - ENTRANCE - Math.PI) + Math.PI * 3) % (Math.PI * 2) - Math.PI) > 0.4);
  gallerySpots.slice(0, WORKS.length).forEach((phi, i) => {
    const [title, url] = WORKS[i], g = new THREE.Group(), rr = R - 0.9;
    g.position.set(Math.cos(phi) * rr, 0, Math.sin(phi) * rr); g.lookAt(0, 0, 0); root.add(g);
    const frameM = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.5, PH + 0.5, 0.25), new THREE.MeshStandardMaterial({ color: 0x131316, roughness: 0.4, metalness: 0.4 })); frameM.position.y = 6.6; g.add(frameM);
    const mat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    loader.load(url, (tex) => { tex.colorSpace = THREE.SRGBColorSpace; const a = tex.image.width / tex.image.height, want = PW / PH;
      if (a > want) { tex.repeat.set(want / a, 1); tex.offset.set((1 - want / a) / 2, 0); } else { tex.repeat.set(1, a / want); tex.offset.set(0, (1 - a / want) / 2); }
      mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true; });
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), mat); pic.position.set(0, 6.6, 0.14); g.add(pic);
    const plate = canvasTex(512, 96, (c, w, h) => { c.fillStyle = '#111114'; c.fillRect(0, 0, w, h); c.fillStyle = '#c79a5a'; c.fillRect(0, 0, 8, h); c.fillStyle = '#fff'; c.font = '44px Anton'; c.textBaseline = 'middle'; c.fillText(title.toUpperCase(), 28, 40); c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '20px Inter'; c.fillText('Proyecto O R-K · or-k.co/#trabajo', 30, 76); });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.8), new THREE.MeshBasicMaterial({ map: plate })); pl.position.set(-(PW / 2) + 2.1, 3.55, 0.14); g.add(pl);
    for (const k of [-1, 1]) { const pp = g.localToWorld(new THREE.Vector3(k * (PW / 2 + 1.3), 0, 1.1)); requestProp(k < 0 ? 'plantTall' : 'plant', pp.x, 0, pp.z, Math.random() * 6, 2); addObstacle(pp.x, pp.z, 0.5); }
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(PW * 0.8, 0.12, 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.6, 1.3), toneMapped: false })); lamp.position.set(0, 9.5, 0.5); g.add(lamp);
  });

  // ---- lobby: white plinth, pool of light, hanging halo and curved sofas ----
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.4, 0.3, 96), white); plinth.position.y = 0.15; plinth.receiveShadow = true; root.add(plinth);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(6.42, 6.42, 0.12, 96, 1, true), new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.5 })); band.position.y = 0.24; root.add(band);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(4.6, 64), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (c, w) => { const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,226,190,.16)'); g.addColorStop(0.55, 'rgba(255,214,170,.06)'); g.addColorStop(1, 'rgba(255,200,150,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.32; root.add(pool);
  const halo = new THREE.Group(); halo.position.y = 15.5; roof.add(halo);   // hides with the dome in the outside view
  halo.add(new THREE.Mesh(new THREE.TorusGeometry(9, 0.32, 12, 128), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.75, 1.6), toneMapped: false })));
  const halo2 = new THREE.Mesh(new THREE.TorusGeometry(7.6, 0.12, 8, 128), violetGlow); halo.add(halo2);
  halo.children.forEach(o => { o.rotation.x = Math.PI / 2; });
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4, wire = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, HALL.roofH - 15.5, 4), steel); wire.position.set(Math.cos(a) * 9, (HALL.roofH - 15.5) / 2, Math.sin(a) * 9); halo.add(wire); }
  // curved sofas between the light paths
  const sofaMat = new THREE.MeshStandardMaterial({ color: 0x3a393e, roughness: 1, ...pbrMaps('velour_velvet', 2.5, 2.5, ['nor', 'rough']) });
  const standAng = ISLANDS.map(i => Math.atan2(i.c.z, i.c.x));
  // modular sofas (Blender) laid along an arc between every pair of light paths, arms at both ends
  for (const a0 of standAng) {
    const mid = a0 + Math.PI / 8, step = 1.28 / 8.2;
    [-1, 0, 1].forEach((k) => {
      const a = mid + k * step, x = Math.cos(a) * 8.2, z = Math.sin(a) * 8.2;
      onProp(k === 0 ? 'sofaModule' : 'sofaArm', (o) => {
        o.traverse(c => { if (c.isMesh) { if (c.material.name === 'Fabric') c.material = sofaMat; c.castShadow = c.receiveShadow = true; } });
        o.position.set(x, 0.02, z); o.rotation.y = Math.atan2(-x, -z); if (k < 0) o.scale.x = -1; root.add(o);
      });
      addObstacle(x, z, 0.8);
    });
  }

  for (const a0 of ISLANDS.map(i => Math.atan2(i.c.z, i.c.x))) { const a = a0 + Math.PI / 8 + 0.3; requestProp('plant', Math.cos(a) * 10.2, 0, Math.sin(a) * 10.2, a, 1.5); }
  // ---- arrival plaza outside the doors ----
  const PL = HALL.plazaR, half = HALL.plazaHalf, plaza = new THREE.Group(); root.add(plaza);
  const stoneM = new THREE.MeshStandardMaterial({ color: 0xdedad3, roughness: 0.55, metalness: 0.05 });
  stoneM.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying vec3 vW;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'varying vec3 vW;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float r = length(vW.xz); vec2 g = fract(vec2(r / 2.2, atan(vW.z, vW.x) * r / 2.2)) - 0.5;
      diffuseColor.rgb *= 0.9 + 0.1 * (1.0 - smoothstep(0.46, 0.5, max(abs(g.x), abs(g.y))));
      float a = atan(vW.z, vW.x) - ${ENTRANCE.toFixed(4)}; float lat = abs(r * sin(a));
      float path = 1.0 - smoothstep(3.0, 3.1, lat); diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.4, path * 0.85);
      float br = 1.0 - smoothstep(0.0, 0.06, abs(lat - 3.05)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.58, 0.32), br);
      totalEmissiveRadiance += vec3(1.0, 0.72, 0.42) * br * 0.12;`);
  };
  stoneM.customProgramCacheKey = () => 'orkplaza';
  // laid flat with rotation.x = -π/2, a ring angle θ lands at world angle -θ
  const deckP = new THREE.Mesh(new THREE.RingGeometry(R - 0.5, PL, 64, 1, -(ENTRANCE + half), half * 2), stoneM); deckP.rotation.x = -Math.PI / 2; deckP.receiveShadow = true; plaza.add(deckP);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(PL, PL, 1.6, 64, 1, true, toTheta(ENTRANCE) - half, half * 2), new THREE.MeshStandardMaterial({ color: 0x1b1c21, roughness: 0.6, side: THREE.DoubleSide })); lip.position.y = -0.8; plaza.add(lip);
  const edgeGlow = new THREE.Mesh(new THREE.TorusGeometry(PL, 0.1, 6, 48, half * 2), violetGlow); edgeGlow.rotation.set(-Math.PI / 2, 0, -(ENTRANCE + half)); edgeGlow.position.y = 0.04; plaza.add(edgeGlow);
  for (const s2 of [-1, 1]) { const a = ENTRANCE + s2 * half, side = new THREE.Mesh(new THREE.BoxGeometry(PL - R + 0.5, 1.6, 0.4), new THREE.MeshStandardMaterial({ color: 0x1b1c21, roughness: 0.6 }));
    side.position.set(Math.cos(a) * (R + PL) / 2, -0.8, Math.sin(a) * (R + PL) / 2); side.rotation.y = -a; plaza.add(side); }
  const under2 = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.2, 1, 64, 1, false, toTheta(ENTRANCE) - half, half * 2), new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.7, flatShading: true }));
  under2.scale.set(PL, 12, PL); under2.position.y = -7.6; plaza.add(under2);
  // planters with real plants and light bollards along the path
  const dir = new THREE.Vector3(Math.cos(ENTRANCE), 0, Math.sin(ENTRANCE)), perp = new THREE.Vector3(-dir.z, 0, dir.x);
  const potM = new THREE.MeshStandardMaterial({ color: 0xece7f4, roughness: 0.5 });
  for (let k = 0; k < 4; k++) for (const s2 of [-1, 1]) {
    const d = R + 4.5 + k * 4.6, pp = dir.clone().multiplyScalar(d).addScaledVector(perp, s2 * 5.6);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.7, 0.9, 24), potM); pot.position.set(pp.x, 0.45, pp.z); pot.castShadow = pot.receiveShadow = true; plaza.add(pot);
    requestProp(k % 2 ? 'plant' : 'plantTall', pp.x, 0.82, pp.z, Math.random() * 6, 1.6); addObstacle(pp.x, pp.z, 0.95);
    const bp = dir.clone().multiplyScalar(d + 2.3).addScaledVector(perp, s2 * 3.6);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.9, 12), steel); post.position.set(bp.x, 0.45, bp.z); plaza.add(post);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 1.7, 1.3), toneMapped: false })); cap.position.set(bp.x, 0.95, bp.z); plaza.add(cap);
  }
  // giant O R-K letters at the far edge of the plaza
  new SVGLoader().load('/assets/brand/ork-logo-papel.svg', (data) => {
    const W = 796, H2 = 226.75, D = 70, scl = 19 / W, g = new THREE.Group();
    const face = new THREE.MeshStandardMaterial({ color: 0xf6f3fb, roughness: 0.35, metalness: 0.1, emissive: 0xffffff, emissiveIntensity: 0.06 });
    const sideM = new THREE.MeshStandardMaterial({ color: 0x7c3cff, roughness: 0.4, metalness: 0.3, emissive: 0x7c3cff, emissiveIntensity: 0.25 });
    const inner = new THREE.Group(); inner.scale.setScalar(scl); inner.rotation.x = Math.PI; inner.position.set(-W / 2 * scl, H2 * scl, D / 2 * scl); g.add(inner);
    for (const p of data.paths) for (const sh of SVGLoader.createShapes(p)) { const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: true, bevelThickness: 4, bevelSize: 3, bevelSegments: 2, curveSegments: 16 }), [face, sideM]); m.castShadow = true; inner.add(m); }
    const pos = dir.clone().multiplyScalar(PL - 4.5); g.position.set(pos.x, 0.25, pos.z);
    g.lookAt(pos.x + dir.x, 0.25, pos.z + dir.z); plaza.add(g);   // readable from outside, facing arriving visitors
    const plinthL = new THREE.Mesh(new THREE.BoxGeometry(21, 0.5, 4), white); plinthL.position.copy(g.position).setY(0.25); plinthL.rotation.y = -ENTRANCE - Math.PI / 2; plinthL.castShadow = plinthL.receiveShadow = true; plaza.add(plinthL);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(21, 0.06, 0.1), violetGlow); strip.position.copy(g.position).add(dir.clone().multiplyScalar(2.02)).setY(0.3); strip.rotation.y = -ENTRANCE - Math.PI / 2; plaza.add(strip);
    for (const k of [-1, 0, 1]) { const lp = g.position.clone().addScaledVector(perp, k * 7).addScaledVector(dir, 2.6); addObstacle(lp.x - dir.x * 2.6, lp.z - dir.z * 2.6, 3.4); }
  });

  // ---- warm interior light (one key light, cheap) ----
  const key = new THREE.PointLight(0xffd6ad, 90, 110, 1.4); key.position.set(0, 24, 0); root.add(key);
  const amb = new THREE.AmbientLight(0xfff4ea, 0.12); root.add(amb);

  return {
    entranceAngle: ENTRANCE, floor,
    update(t) {
      if (floor.material.userData.u) floor.material.userData.u.uTime.value = t;
      // cutaway: from outside/above the dome hides so you can see every stand
      const inside = Math.hypot(camera.position.x, camera.position.z) < R && camera.position.y < HALL.roofH;
      roof.visible = inside;
    },
  };
}
