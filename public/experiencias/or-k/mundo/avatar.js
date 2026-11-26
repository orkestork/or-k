// Avatar maker: pick a body, outfit colour, gear, O R-K extras and a name, with a live 3D preview.
import * as THREE from 'three';
import { instantiate, play, HEADS } from './models.js';
import { dress } from './outfits.js?v=5';
// clothing styles for the visitor's avatar
export const STYLES = {
  casual:    ['Casual', { skin: 0xf3c4a0, hair: 0x5e3f28, jacket: 0x33445e, shirt: 0xf1efe9, tie: 0xf1efe9, forearm: 0x33445e, pants: 0x283246, shoes: 0xf1f1ef, belt: 0x5a3a26 }],
  ejecutivo: ['Ejecutivo', { skin: 0xf3c4a0, hair: 0x5e3f28, jacket: 0x2a2c33, shirt: 0xf3f1ed, tie: 0x7c3cff, forearm: 0x2a2c33, pants: 0x2a2c33, shoes: 0x141519, belt: 0x141519 }],
  creativo:  ['Creativo', { skin: 0xf3c4a0, hair: 0x5e3f28, jacket: 0x5b3fa8, shirt: 0x1c1d21, tie: 0x1c1d21, forearm: 0x5b3fa8, pants: 0x1c1d21, shoes: 0xf1f1ef, belt: 0x1a1a1d }],
};

export const BODIES = {
  Knight:      { label: 'Caballero',   cls: 'guerrero',   hat: 'Knight_Helmet',  cape: 'Knight_Cape',    items: [['Espada y escudo', ['1H_Sword', 'Round_Shield']], ['Espadón', ['2H_Sword']], ['Manos libres', []]] },
  Mage:        { label: 'Maga',        cls: 'mago',       hat: 'Mage_Hat',       cape: 'Mage_Cape',      items: [['Bastón', ['2H_Staff']], ['Varita y libro', ['1H_Wand', 'Spellbook_open']], ['Manos libres', []]] },
  Barbarian:   { label: 'Bárbaro',     cls: 'bestia',     hat: 'Barbarian_Hat',  cape: 'Barbarian_Cape', items: [['Hacha gigante', ['2H_Axe']], ['Hacha y escudo', ['1H_Axe', 'Barbarian_Round_Shield']], ['Jarra', ['Mug']]] },
  Rogue:       { label: 'Pícara',      cls: 'explorador', hat: null,             cape: 'Rogue_Cape',     items: [['Dagas', ['Knife', 'Knife_Offhand']], ['Ballesta', ['1H_Crossbow']], ['Manos libres', []]] },
  RogueHooded: { label: 'Encapuchado', cls: 'explorador', hat: null,             cape: 'Rogue_Cape',     items: [['Dagas', ['Knife', 'Knife_Offhand']], ['Ballesta', ['1H_Crossbow']], ['Manos libres', []]] },
};
const ACC = {
  Knight: ['1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', '1H_Sword', '2H_Sword', 'Knight_Helmet', 'Knight_Cape'],
  Barbarian: ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', '2H_Axe', 'Mug', 'Barbarian_Hat', 'Barbarian_Cape'],
  Mage: ['Spellbook', 'Spellbook_open', '1H_Wand', '2H_Staff', 'Mage_Hat', 'Mage_Cape'],
  Rogue: ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable', 'Rogue_Cape'],
};
ACC.RogueHooded = ACC.Rogue;
export const COLORS = [['Original', null], ['Violeta', 0xb79cff], ['Coral', 0xff9aa8], ['Cielo', 0x9fe3ff], ['Menta', 0xa8f0c8], ['Sol', 0xffd88a], ['Rosa', 0xffb3e0], ['Noche', 0x77729a]];
const EXTRAS = [['Ninguno', 'none'], ['Audífonos O R-K', 'headset'], ['Gafas', 'glasses'], ['Gorra O R-K', 'cap']];
const NAMES = ['Nova', 'Orca', 'Luma', 'Kai', 'Vega', 'Rumi', 'Iris', 'Teo'];
export const defaultLook = () => ({ body: 'Knight', color: 0xb79cff, hat: false, cape: true, item: 0, extra: 'headset', ...headDefaults('Knight'), name: NAMES[Math.floor(Math.random() * NAMES.length)] });
export const isAvatarLook = (look) => !!(look && BODIES[look.body]);
// the maker keeps it simple: a man or a woman, each a fixed, polished look
export const PRESETS = {
  hombre: { body: 'Knight', color: 0xb79cff, hat: false, cape: true, item: 2, extra: 'headset', face: 'Knight', hair: 'Knight', hairColor: 0xe4c08f, beard: false },
  mujer:  { body: 'Rogue',  color: 0xb79cff, hat: false, cape: true, item: 2, extra: 'headset', face: 'Rogue',  hair: 'Rogue',  hairColor: 0xa9583a, beard: false },
};

// ---------- modular heads: face + hairstyle + hair colour + beard ----------
export const FACES = [['Cara 1', 'Knight'], ['Cara 2', 'Mage'], ['Cara 3', 'Rogue'], ['Cara 4', 'Bald'], ['Capucha', 'Hooded']];
export const HAIRS = [['Corto', 'Knight'], ['Bob', 'Mage'], ['Largo', 'Rogue'], ['Coleta', 'Ponytail'], ['Moño', 'Bun'], ['Afro', 'Afro'], ['Puntas', 'Spiky'], ['Rapado', 'Buzz'], ['Calvo', 'none']];
export const HAIR_COLORS = [['Negro', 0x2a2226], ['Castaño', 0x6b4128], ['Cobrizo', 0xa9583a], ['Rubio', 0xe4c08f], ['Canoso', 0xc9c5c2], ['Violeta', 0x9a6bff], ['Rosa', 0xf08fbf], ['Azul', 0x5aa8ff]];
const DEFAULT_HEAD = { Knight: ['Knight', 'Knight', 0xe4c08f], Mage: ['Mage', 'Mage', 0x2a2226], Barbarian: ['Bald', 'none', 0x8a7c74], Rogue: ['Rogue', 'Rogue', 0xa9583a], RogueHooded: ['Hooded', 'none', 0x6b4128] };
export function headDefaults(body) { const [face, hair, hairColor] = DEFAULT_HEAD[body] ?? DEFAULT_HEAD.Knight; return { face, hair, hairColor, beard: body === 'Barbarian' }; }
const hairMats = new Map();
const hairMat = (hex) => { if (!hairMats.has(hex)) hairMats.set(hex, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.75, flatShading: true })); return hairMats.get(hex); };
function attachPiece(m, name, material) {
  const src = HEADS.scene?.getObjectByName(name); if (!src) return null;
  const mesh0 = src.isSkinnedMesh ? src : src.getObjectByProperty('isSkinnedMesh', true); if (!mesh0) return null;
  let ref = null; m.inner.traverse(o => { if (!ref && o.isSkinnedMesh && /_Head/.test(o.name)) ref = o; });
  if (!ref) return null;
  const bones = {}; m.inner.traverse(o => { if (o.isBone) bones[o.name] = o; });
  const skel = new THREE.Skeleton(mesh0.skeleton.bones.map(b => bones[b.name]), mesh0.skeleton.boneInverses);
  const mesh = new THREE.SkinnedMesh(mesh0.geometry, material ?? mesh0.material);
  mesh.name = 'Piece_' + name; mesh.castShadow = true; mesh.frustumCulled = false;
  mesh.position.copy(ref.position); mesh.quaternion.copy(ref.quaternion); mesh.scale.copy(ref.scale);
  ref.parent.add(mesh); mesh.bind(skel, ref.bindMatrix);
  return mesh;
}
function applyHead(m, look, hatOn) {
  if (!HEADS.scene || !look.face) return;
  m.inner.traverse(o => { if (o.isSkinnedMesh && /_Head/.test(o.name)) o.visible = false; });
  const hm = hairMat(look.hairColor ?? 0x6b4128);
  if (look.face === 'Hooded') { attachPiece(m, 'Head_Hooded'); return; }
  attachPiece(m, 'Face_' + look.face);
  if (look.face === 'Bald') attachPiece(m, 'Brows', hm);
  if (look.beard) attachPiece(m, 'Beard', hm);
  // hats and the O R-K cap cover the crown: only styles that fall below them stay visible
  const covered = hatOn || look.extra === 'cap', flowsBelow = ['Rogue', 'Mage', 'Ponytail'].includes(look.hair);
  if (look.hair && look.hair !== 'none' && (!covered || flowsBelow)) attachPiece(m, 'Hair_' + look.hair, hm);
}

// ---------- accessories built on the head bone ----------
const headOf = (m) => { let h = null; m.root.traverse(o => { if (!h && o.isBone && o.name === 'head') h = o; }); return h; };
export function addHeadset(model, color) {
  const head = headOf(model); if (!head) return;
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1426, roughness: 0.4, metalness: 0.4 });
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.8), toneMapped: false });
  const set = new THREE.Group(); set.position.y = 0.62; head.add(set);
  set.add(new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.05, 6, 24, Math.PI), dark));
  for (const sx of [-1, 1]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 16), dark); cup.rotation.z = Math.PI / 2; cup.position.set(sx * 0.68, -0.02, 0); set.add(cup);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 6, 16), glow); ring.rotation.y = Math.PI / 2; ring.position.set(sx * 0.75, -0.02, 0); set.add(ring);
  }
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.62, 6), dark); boom.rotation.x = Math.PI / 2 - 0.35; boom.position.set(-0.6, -0.2, 0.28); set.add(boom);
  const mic = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), glow); mic.position.set(-0.6, -0.31, 0.58); set.add(mic);
}
function addGlasses(model) {
  const head = headOf(model); if (!head) return;
  const frame = new THREE.MeshStandardMaterial({ color: 0x15101f, roughness: 0.3, metalness: 0.6 });
  const lens = new THREE.MeshStandardMaterial({ color: 0x7c3cff, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.55, emissive: 0x7c3cff, emissiveIntensity: 0.25 });
  const g = new THREE.Group(); g.position.set(0, 0.5, 0.58); head.add(g);
  for (const sx of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 8, 24), frame); rim.position.x = sx * 0.24; g.add(rim);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), lens); glass.position.set(sx * 0.24, 0, 0.005); g.add(glass);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.55), frame); arm.position.set(sx * 0.42, 0.02, -0.27); g.add(arm);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.035), frame); bridge.position.y = 0.04; g.add(bridge);
}
function addCap(model) {
  const head = headOf(model); if (!head) return;
  const cloth = new THREE.MeshStandardMaterial({ color: 0x7c3cff, roughness: 0.7 });
  const g = new THREE.Group(); g.position.set(0, 0.56, 0.02); head.add(g);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.66, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), cloth); dome.scale.y = 0.82; g.add(dome);
  const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.05, 24, 1, false, -Math.PI / 2, Math.PI), cloth); visor.position.set(0, 0.02, 0.42); visor.scale.z = 1.1; g.add(visor);
  const badge = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.035, 8, 20), new THREE.MeshBasicMaterial({ color: 0xffffff })); badge.position.set(0, 0.28, 0.6); badge.rotation.x = -0.45; g.add(badge);
  const btn = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); btn.position.y = 0.54; g.add(btn);
}
function nameTag(model, name) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 112;
  const c = cv.getContext('2d');
  c.font = '600 54px Inter, sans-serif'; const w = Math.min(500, c.measureText(name).width + 70);
  c.fillStyle = 'rgba(16,11,28,.78)'; c.beginPath(); c.roundRect((512 - w) / 2, 10, w, 92, 46); c.fill();
  c.strokeStyle = '#a984ff'; c.lineWidth = 4; c.stroke();
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(name, 256, 58);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(1.5, 0.33, 1); s.position.y = (model.h ?? 1.3) + 0.55; s.renderOrder = 10; model.root.add(s);
}

export function buildAvatar(look, { scale = 1.05, tag = true } = {}) {
  const B = BODIES[look.body] ?? BODIES.Knight;
  const show = [...(B.items[look.item] ?? B.items[0])[1]];
  if (look.hat && B.hat && look.extra !== 'cap') show.push(B.hat);
  const m = instantiate(look.body, { hide: ACC[look.body], show, scale });
  dress(m, look.body, (STYLES[look.style] ?? STYLES.casual)[1]);
  applyHead(m, look, show.includes(B.hat));
  if (look.extra === 'headset') addHeadset(m, 0x9371ff);
  if (look.extra === 'glasses') addGlasses(m);
  if (look.extra === 'cap') addCap(m);
  if (tag && look.name) nameTag(m, look.name);
  return m;
}

// ---------- the maker UI ----------
const STYLE = { guerrero: 'Guerrero · Escudo con clic derecho', mago: 'Mago · Ataca a distancia y congela', bestia: 'Bestia · Mucha vida y modo furia', explorador: 'Explorador · Rápido y ágil, guardia con clic derecho' };
export function showAvatarMaker(current, onDone, { onSkip } = {}) {
  document.exitPointerLock?.();
  const startGender = current?.gender === 'mujer' ? 'mujer' : 'hombre';
  const look = { ...PRESETS[startGender], gender: startGender, name: current?.name || defaultLook().name };
  const el = document.createElement('div'); el.id = 'avatarMaker'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Crea tu avatar');
  el.innerHTML = `<div class="am">
    <div class="amPreview"><canvas></canvas><p>Arrastra para girar</p></div>
    <div class="amPanel">
      <h2>Crea tu avatar</h2><p class="sub">Así te verán en el Pabellón O R-K.</p>
      <label class="amName">Tu nombre<input maxlength="18" autocomplete="off" placeholder="¿Cómo te llamas?"></label>
      <section><h3>Elige tu personaje</h3><div data-k="gender"></div><p class="amStyle"></p></section>
      <section><h3>Tu estilo</h3><div data-k="style"></div></section>
      <div class="amActions">${onSkip ? '<button type="button" class="ghost" data-act="skip">Solo mirar</button>' : '<button type="button" class="ghost" data-act="cancel">Cancelar</button>'}<button type="button" class="go" data-act="go">Entrar al pabellón →</button></div>
    </div></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const $ = (s) => el.querySelector(s);
  const nameInput = $('.amName input'); nameInput.value = look.name;
  nameInput.addEventListener('keydown', (e) => e.stopPropagation());
  nameInput.oninput = () => { look.name = nameInput.value.trim(); };

  // live preview
  const canvas = $('canvas'), r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace; r.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffe8f6, 0x3a2058, 2.4));
  const key = new THREE.DirectionalLight(0xfff0e0, 3.2); key.position.set(2, 3, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9a7cff, 3); rim.position.set(-3, 2, -3); scene.add(rim);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.08, 48), new THREE.MeshStandardMaterial({ color: 0x241a3d, roughness: 0.4, metalness: 0.5 })); disc.position.y = -0.04; scene.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.93, 0.02, 6, 64), new THREE.MeshBasicMaterial({ color: 0xb89cff })); ring.rotation.x = Math.PI / 2; scene.add(ring);
  const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 50); cam.position.set(0, 1.2, 5.3); cam.lookAt(0, 0.7, 0);
  let model = null, spin = 0.5, drag = null, alive = true;
  const rebuild = () => {
    if (model) { scene.remove(model.root); model.mixer.stopAllAction(); }
    model = buildAvatar(look, { scale: 1, tag: false }); play(model, 'idle', 0); scene.add(model.root);
  };
  const resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (w && h) { r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); } };
  const clock = new THREE.Clock();
  const loop = () => { if (!alive) return; const dt = clock.getDelta(); if (drag === null) spin += dt * 0.4; if (model) { model.root.rotation.y = spin; model.mixer.update(dt); } resize(); r.render(scene, cam); requestAnimationFrame(loop); };
  canvas.onpointerdown = (e) => { drag = e.clientX; canvas.setPointerCapture(e.pointerId); };
  canvas.onpointermove = (e) => { if (drag !== null) { spin += (e.clientX - drag) * 0.012; drag = e.clientX; } };
  canvas.onpointerup = canvas.onpointercancel = () => { drag = null; };

  // option chips
  const chips = (key, options, isOn, onPick) => {
    const box = $(`[data-k="${key}"]`); const sw = key === 'color' || key === 'hairColor'; if (!sw) box.classList.add('chips');
    box.replaceChildren(...options.map(([label, value], i) => {
      const b = document.createElement('button'); b.type = 'button';
      if (sw) { b.className = 'sw'; b.title = label; b.setAttribute('aria-label', label); b.style.background = value === null ? 'linear-gradient(135deg,#f3eff8 50%,#c9c2d6 50%)' : '#' + new THREE.Color(value).getHexString(); }
      else b.textContent = label;
      b.setAttribute('aria-pressed', String(isOn(value, i)));
      b.onclick = () => { onPick(value, i); render(); };
      return b;
    }));
  };
  const render = () => {
    chips('gender', [['Hombre', 'hombre'], ['Mujer', 'mujer']], v => v === look.gender, v => { Object.assign(look, PRESETS[v], { gender: v, style: look.style }); });
    chips('style', Object.entries(STYLES).map(([k, [label]]) => [label, k]), v => v === (look.style ?? 'casual'), v => { look.style = v; });
    $('.amStyle').textContent = 'Estilo de juego: ' + STYLE[BODIES[look.body].cls];
    rebuild();
  };
  render(); loop();

  const close = () => { alive = false; el.classList.remove('show'); setTimeout(() => { el.remove(); r.dispose(); r.forceContextLoss?.(); }, 350); };
  $('[data-act="go"]').onclick = () => { look.name = (look.name || 'Visitante').slice(0, 18); close(); onDone({ ...look }); };
  el.querySelector('[data-act="skip"]')?.addEventListener('click', () => { close(); onSkip(); });
  el.querySelector('[data-act="cancel"]')?.addEventListener('click', () => close());
  el.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !onSkip) close(); });
  setTimeout(() => nameInput.focus(), 400);
}
