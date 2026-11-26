// Character selection screen with live-rendered 3D portraits of each class.
import * as THREE from 'three';
import { CLASSES } from './classes.js';
import { instantiate, play } from './models.js';

const portraits = {};
function renderPortraits() {
  if (Object.keys(portraits).length) return;
  const W = 300, H = 380;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(W, H); r.setPixelRatio(1); r.toneMapping = THREE.ACESFilmicToneMapping;
  const s = new THREE.Scene();
  s.add(new THREE.HemisphereLight(0xffe0f0, 0x402050, 2.2));
  const key = new THREE.DirectionalLight(0xffd0a0, 3); key.position.set(2, 3, 4); s.add(key);
  const rim = new THREE.DirectionalLight(0x8090ff, 2.5); rim.position.set(-3, 2, -3); s.add(rim);
  const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 50); cam.position.set(0.9, 1.25, 3.6); cam.lookAt(0, 0.78, 0);
  for (const [id, c] of Object.entries(CLASSES)) {
    const ACC = { Knight: ['1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', '1H_Sword', '2H_Sword', 'Knight_Helmet', 'Knight_Cape'],
      Mage: ['Spellbook', 'Spellbook_open', '1H_Wand', '2H_Staff', 'Mage_Hat', 'Mage_Cape'],
      Barbarian: ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', '2H_Axe', 'Mug', 'Barbarian_Hat', 'Barbarian_Cape'] };
    const m = instantiate(c.model, { hide: ACC[c.model], show: c.show, scale: 1 });
    play(m, id === 'bestia' ? 'idle' : 'idle', 0);
    const clip = m.A.cheer && id === 'mago' ? 'cast' : 'idle'; play(m, clip, 0);
    m.mixer.update(0.6); m.root.rotation.y = 0.35;
    s.add(m.root); r.render(s, cam); portraits[id] = r.domElement.toDataURL('image/png'); s.remove(m.root);
  }
  r.dispose(); r.forceContextLoss?.();
}

export function showCharSelect(current, onPick) {
  renderPortraits();
  document.exitPointerLock?.();
  const el = document.createElement('div'); el.id = 'charSelect';
  el.innerHTML = `<div class="cs"><h2>Elige tu héroe</h2><p class="sub">Podrás cambiarlo después con el botón 👤</p>
    <div class="cards">${Object.entries(CLASSES).map(([id, c]) => `
      <div class="card ${current === id ? 'cur' : ''}" data-id="${id}">
        <div class="pic" style="background-image:url(${portraits[id]})"></div>
        <h3>${c.icon} ${c.name}</h3><p>${c.desc}</p>
        <div class="bars">${Object.entries(c.bars).map(([k, v]) => `<div><span>${k}</span><i><em style="width:${v * 100}%"></em></i></div>`).join('')}</div>
        <div class="skill"><b>${c.skill}</b> · ${c.skillDesc}</div>
        <button>Jugar como ${c.name}</button>
      </div>`).join('')}</div></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  el.querySelectorAll('.card').forEach(card => card.onclick = () => {
    el.classList.remove('show'); setTimeout(() => el.remove(), 350);
    onPick(card.dataset.id);
  });
}
