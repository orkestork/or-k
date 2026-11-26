// Shop & equipment: Don Bartolo sells gear; equipment changes stats and how the hero looks.
import * as THREE from 'three';
import { STATS } from './combat.js';
import { CLASSES } from './classes.js';

export const EQUIP = { weapon: 'basica', armor: false, shield: false, boots: false, potions: 1 };
export const ITEMS = [
  { id: 'pocion',   name: 'Poción de vida',     icon: '🧪', price: 30,  desc: 'Recupera 60% de vida. Tecla R para beber.' },
  { id: 'acero',    name: 'Arma de acero',      icon: '🗡️', price: 150, desc: '+12 de daño en cada ataque (espada, bastón o hacha).' },
  { id: 'armadura', name: 'Armadura reforzada', icon: '🛡️', price: 220, desc: 'Recibes 30% menos daño. Brilla en dorado.' },
  { id: 'escudo',   name: 'Escudo de dragón',   icon: '🐲', price: 180, desc: '+25 de vida máxima. El guerrero bloquea casi todo el daño.' },
  { id: 'botas',    name: 'Botas veloces',      icon: '👢', price: 140, desc: 'Corres un 30% más rápido.' },
];
const WEAPONS = { basica: 0, acero: 12, cristal: 28 };
let hooks = { toast: () => {}, sound: () => {}, onChange: () => {} };
export function shopHooks(h) { Object.assign(hooks, h); }

export function owned(id) {
  if (id === 'acero') return EQUIP.weapon === 'acero' || EQUIP.weapon === 'cristal';
  if (id === 'armadura') return EQUIP.armor; if (id === 'escudo') return EQUIP.shield; if (id === 'botas') return EQUIP.boots;
  return false;
}
export function applyEquipment(P) {
  STATS.dmgBonus = WEAPONS[EQUIP.weapon] ?? 0;
  STATS.armor = EQUIP.armor ? 0.3 : 0;
  STATS.block = EQUIP.shield ? 0.08 : 0.25;
  STATS.speed = EQUIP.boots ? 1.3 : 1;
  const m = P?.m; if (!m) return;
  const get = (n) => m.inner.getObjectByName(n);
  const C = CLASSES[P.cls || 'guerrero'];
  const sword = get(C.weapon), round = get('Round_Shield'), spike = get('Spike_Shield');
  if (round && spike && (round.visible || spike.visible || round.userData.had)) { round.userData.had = true; round.visible = !EQUIP.shield; spike.visible = EQUIP.shield; }
  if (sword) {
    sword.traverse(c => { if (!c.isMesh) return; if (!c.userData.orig) { c.userData.orig = c.material; c.material = c.material.clone(); }
      const mm = c.material; mm.color.copy(c.userData.orig.color); mm.emissive.setRGB(0, 0, 0);
      if (EQUIP.weapon === 'acero') { mm.color.multiply(new THREE.Color(0.75, 0.85, 1.1)); mm.metalness = 0.9; mm.roughness = 0.2; }
      if (EQUIP.weapon === 'cristal') { mm.color.set(0x8ff0ff); mm.emissive.set(0x2ad0ff); mm.emissiveIntensity = 2.2; } });
  }
  for (const part of C.parts) {
    const o = get(part); if (!o) continue;
    o.traverse(c => { if (!c.isMesh) return; if (!c.userData.orig) { c.userData.orig = c.material; c.material = c.material.clone(); }
      c.material.color.copy(c.userData.orig.color); if (EQUIP.armor) c.material.color.multiply(new THREE.Color(1.15, 0.95, 0.55)); c.material.metalness = EQUIP.armor ? 0.6 : c.userData.orig.metalness; });
  }
}
export function drinkPotion() {
  if (EQUIP.potions <= 0) { hooks.toast('No te quedan pociones (cómpralas a Don Bartolo)'); return false; }
  if (STATS.hp >= STATS.maxHp) { hooks.toast('Ya tienes la vida llena'); return false; }
  EQUIP.potions--; STATS.hp = Math.min(STATS.maxHp, STATS.hp + STATS.maxHp * 0.6);
  hooks.toast(`🧪 ¡Glup! +vida (te quedan ${EQUIP.potions})`); hooks.sound('potion'); hooks.onChange(); return true;
}

// ---------- shop window ----------
const el = document.createElement('div'); el.id = 'shop'; document.body.appendChild(el);
export const shopOpen = () => el.classList.contains('show');
function render() {
  el.innerHTML = `<div class="box"><div class="head"><h3>🏪 Tienda de Don Bartolo</h3><span class="g">🪙 ${STATS.gold}</span><button class="x">✕</button></div>
    <div class="items">${ITEMS.map(it => {
      const have = owned(it.id), poor = STATS.gold < it.price;
      return `<div class="it ${have ? 'have' : ''}"><div class="ic">${it.icon}</div><div class="tx"><b>${it.name}</b><small>${it.desc}</small>${it.id === 'pocion' ? `<small>Tienes: ${EQUIP.potions}</small>` : ''}</div>
        <button data-id="${it.id}" ${have || poor ? 'disabled' : ''}>${have ? 'Equipado' : '🪙 ' + it.price}</button></div>`;
    }).join('')}</div><p class="foot">¡Todo lo que compras se equipa al instante!</p></div>`;
  el.querySelector('.x').onclick = closeShop;
  el.querySelectorAll('button[data-id]').forEach(b => b.onclick = () => buy(b.dataset.id));
}
function buy(id) {
  const it = ITEMS.find(i => i.id === id); if (!it || STATS.gold < it.price || owned(id)) return;
  STATS.gold -= it.price;
  if (id === 'pocion') EQUIP.potions++;
  if (id === 'acero' && EQUIP.weapon === 'basica') EQUIP.weapon = 'acero';
  if (id === 'armadura') EQUIP.armor = true;
  if (id === 'escudo') { EQUIP.shield = true; STATS.maxHp += 25; STATS.hp += 25; }
  if (id === 'botas') EQUIP.boots = true;
  hooks.sound('buy'); hooks.toast(`Compraste: ${it.name}`); hooks.onChange(); render();
}
export function openShop() { document.exitPointerLock?.(); render(); el.classList.add('show'); }
export function closeShop() { el.classList.remove('show'); }
addEventListener('keydown', (e) => { if (e.code === 'Escape' && shopOpen()) closeShop(); });
