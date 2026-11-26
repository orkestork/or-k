// Autosave in localStorage: stats, equipment, quests, crystals, chests and the pet dragon.
const KEY = 'ork-archipielago-v1';
let providers = null;
export function saveSetup(p) { providers = p; }      // { snapshot(): object, restore(obj) }
export function saveGame() {
  if (!providers || !providers.snapshot) return;
  try { localStorage.setItem(KEY, JSON.stringify({ v: 1, t: Date.now(), ...providers.snapshot() })); } catch (e) { /* private mode / quota */ }
}
export function loadGame() {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}
export function resetGame() { try { localStorage.removeItem(KEY); } catch (e) { } }
