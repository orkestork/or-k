// Quests: givers with floating ! / ? markers, progress tracking, rewards and a quest log.
import * as THREE from 'three';
import { NPCS } from './npc.js';

export const QUESTS = [
  { id: 'cristales', giver: 'Guardiana Vega', title: 'Diagnóstico Understand', desc: 'Descubre tres señales en Understand: operación, datos y clientes.', type: 'crystal', need: 3, gold: 60, xp: 90,
    offer: 'Antes de proponer una solución, reúne tres señales distintas en los cristales de Understand.', done: 'Diagnóstico listo: hay que conectar la operación, los datos y la experiencia del cliente.' },
  { id: 'esqueletos', giver: 'Capitana Leona', title: 'Plaga de esqueletos', desc: 'Derrota 8 esqueletos en las Ruinas Sombrías (puente desde la Aldea Brisa).', type: 'kill', tag: 'skeleton', need: 8, gold: 180, xp: 260,
    offer: 'Los muertos se levantan en las Ruinas Sombrías. Cruza el puente del este y derrota a ocho esqueletos. ¡Clic para atacar!', done: '¡Impresionante! La aldea dormirá tranquila esta noche.' },
  { id: 'lobos', giver: 'Druida Olmo', title: 'Lobos de hielo', desc: 'Calma a 5 lobos de hielo en la Isla Helada (puente desde el Bosque Susurro).', type: 'kill', tag: 'icewolf', need: 5, gold: 140, xp: 220,
    offer: 'El frío ha enloquecido a los lobos de la Isla Helada. Calma a cinco de ellos antes de que bajen al bosque.', done: 'El bosque vuelve a susurrar en paz. Gracias.' },
  { id: 'jinete', giver: 'Domadora Ayla', title: 'Jinete del cielo', desc: 'Monta una orca en Base Orca (acércate y pulsa F).', type: 'mount', need: 1, gold: 120, xp: 200,
    offer: '¿Quieres volar? Las orcas guían a quienes exploran. Acércate a una y pulsa F para montarlo.', done: '¡Naciste para volar! Desde el lomo, haz clic para lanzar energía.' },
  { id: 'mazmorra', giver: 'Capitana Leona', title: 'Tesoro de la mazmorra', desc: 'Baja por la escalera junto al altar de las Ruinas y abre el cofre del fondo.', type: 'chest', need: 1, gold: 100, xp: 250, requires: 'esqueletos',
    offer: 'Bajo el altar de las Ruinas hay una escalera a una mazmorra. Dicen que guarda la Espada de Cristal… ¿te atreves?', done: '¡La Espada de Cristal! Ahora sí eres un héroe de verdad.' },
  { id: 'huevo', giver: 'Domadora Ayla', title: 'Un huevo de dragón', desc: 'Lleva el huevo al calor del cráter del Volcán Ígneo para que nazca.', type: 'reach', tag: 'crater', need: 1, gold: 80, xp: 220, requires: 'jinete',
    offer: 'Toma este huevo: necesita el calor de la lava para nacer. Llévalo al cráter del Volcán Ígneo y tendrás tu propio dragón.', done: '¡Chispa te adora! Te seguirá a todas partes y atacará a tus enemigos.' },
  { id: 'volcan', giver: 'Archimago Ciro', title: 'El Rey de Magma', desc: 'Derrota al Rey de Magma en el cráter del Volcán Ígneo.', type: 'kill', tag: 'boss', need: 1, gold: 600, xp: 800, requires: 'esqueletos',
    offer: 'Un rey de huesos y fuego despertó en el Volcán Ígneo. Sólo un héroe probado puede vencerlo. Sube de nivel antes de ir… o llega volando.', done: '¡Has salvado el archipiélago! Tu nombre brillará en las estrellas.' },
];
const state = {}; // id -> {status: 'available'|'active'|'ready'|'done', progress}
QUESTS.forEach(q => state[q.id] = { status: 'locked', progress: 0 });
let hooks = { reward: null, toast: null };
export function questHooks(h) { Object.assign(hooks, h); }

// ---------- markers above givers ----------
function markerSprite(ch, color) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.font = '900 104px Inter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = color; x.shadowBlur = 24; x.fillStyle = color; x.fillText(ch, 64, 70);
  x.shadowBlur = 0; x.lineWidth = 6; x.strokeStyle = '#3a2200'; x.strokeText(ch, 64, 70); x.fillText(ch, 64, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(0.8, 0.8, 1); s.renderOrder = 10; return s;
}
const markers = new Map();
function giverNpc(q) { return NPCS.find(n => n.name === q.giver); }
export function initQuests() {
  for (const q of QUESTS) {
    const n = giverNpc(q); if (!n) continue;
    const ex = markerSprite('!', '#ffd23a'), qu = markerSprite('?', '#ffd23a');
    n.root.add(ex, qu); ex.position.y = qu.position.y = (n.m.h ?? 1.3) + 0.75;
    markers.set(q.id, { ex, qu, npc: n });
    n.questGiver = true;
  }
  refreshAvailability(); render();
}
function refreshAvailability() {
  for (const q of QUESTS) {
    const s = state[q.id];
    if (s.status === 'locked' && (!q.requires || state[q.requires].status === 'done')) s.status = 'available';
  }
  for (const q of QUESTS) {
    const mk = markers.get(q.id); if (!mk) continue;
    const s = state[q.id].status;
    // a giver may have several quests: show the most relevant
    mk.ex.visible = s === 'available'; mk.qu.visible = s === 'ready';
  }
}
// called when the player talks to an NPC; returns a line to say (or null for normal chat)
export function questTalk(npc) {
  const qs = QUESTS.filter(q => q.giver === npc.name);
  for (const q of qs) {
    const s = state[q.id];
    if (s.status === 'ready') {
      s.status = 'done'; hooks.reward && hooks.reward(q); refreshAvailability(); render();
      return q.done + `  (+${q.gold} oro, +${q.xp} XP)`;
    }
  }
  for (const q of qs) {
    const s = state[q.id];
    if (s.status === 'available') {
      s.status = 'active'; s.progress = q.type === 'crystal' ? Math.min(q.need, hooks.crystals ? hooks.crystals() : 0) : 0;
      hooks.toast && hooks.toast(`📜 Nueva misión: ${q.title}`);
      check(q); refreshAvailability(); render();
      return q.offer;
    }
    if (s.status === 'active') return `¿Cómo va "${q.title}"? Llevas ${s.progress} de ${q.need}.`;
  }
  return null;
}
function check(q) {
  const s = state[q.id];
  if (s.status === 'active' && s.progress >= q.need) { s.status = 'ready'; hooks.toast && hooks.toast(`✅ ${q.title} completada: vuelve con ${q.giver}`); }
}
export function questEvent(type, tag) {
  for (const q of QUESTS) {
    const s = state[q.id]; if (s.status !== 'active' || q.type !== type || (q.tag && q.tag !== tag)) continue;
    s.progress = Math.min(q.need, s.progress + 1); check(q);
  }
  refreshAvailability(); render();
}
export function activeTargets() { return QUESTS.filter(q => state[q.id].status === 'active' || state[q.id].status === 'ready'); }

// ---------- quest log UI ----------
const log = document.createElement('div'); log.id = 'questLog'; document.body.appendChild(log);
export function render() {
  const rows = QUESTS.filter(q => ['active', 'ready'].includes(state[q.id].status)).map(q => {
    const s = state[q.id], pct = s.progress / q.need * 100;
    return `<div class="q ${s.status}"><b>${s.status === 'ready' ? '✅' : '📜'} ${q.title}</b><span>${s.status === 'ready' ? 'Vuelve con ' + q.giver : q.desc}</span>
      <i><em style="width:${pct}%"></em></i><small>${s.progress} / ${q.need}</small></div>`;
  });
  const avail = QUESTS.filter(q => state[q.id].status === 'available').map(q => q.giver);
  log.innerHTML = (rows.length ? rows.join('') : '') + (avail.length ? `<div class="hintq">Busca a quien tenga <b style="color:#ffd23a">!</b>: ${[...new Set(avail)].join(', ')}</div>` : '');
}
export function questMarkersTick(t) { const b = Math.sin(t * 3) * 0.1; for (const { ex, qu } of markers.values()) { ex.center.set(0.5, 0.5 - b); qu.center.set(0.5, 0.5 - b); } }

export function questSnapshot() { const o = {}; for (const id in state) o[id] = { ...state[id] }; return o; }
export function questRestore(o) { for (const id in o) if (state[id]) Object.assign(state[id], o[id]); refreshAvailability(); render(); }
export function questStatus(id) { return state[id]?.status; }
