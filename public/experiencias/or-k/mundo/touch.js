// Touch controls for phones/tablets: left joystick, right-side drag to look, action buttons.
import * as THREE from 'three';
import { P, TOUCH, attack, jump, toggleMount, skillPress, skillRelease } from './player.js';

export const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
let H = { interact: () => {}, potion: () => {} };
export function touchHooks(h) { Object.assign(H, h); }

export function buildTouch() {
  if (!isTouch) return;
  TOUCH.on = true;
  const ui = document.createElement('div'); ui.id = 'touchUI';
  ui.innerHTML = `<div id="joy"><div id="knob"></div></div>
    <div id="tbtns">
      <button data-a="attack" class="big">⚔️</button><button data-a="jump">⤒</button>
      <button data-a="talk">💬</button><button data-a="mount">🐉</button><button data-a="potion">🧪</button><button data-a="block">🛡️</button>
    </div>`;
  document.body.appendChild(ui);
  const joy = ui.querySelector('#joy'), knob = ui.querySelector('#knob');
  let joyId = null, joyC = { x: 0, y: 0 }, lookId = null, last = { x: 0, y: 0 };
  const R = 55;
  addEventListener('touchstart', (e) => {
    if (!P.active) return;
    for (const t of e.changedTouches) {
      if (t.target.closest && t.target.closest('#tbtns, #hud, #shop, .label')) continue;
      if (t.clientX < innerWidth * 0.45 && joyId === null) {
        joyId = t.identifier; joyC = { x: t.clientX, y: t.clientY };
        joy.style.left = (t.clientX - 60) + 'px'; joy.style.top = (t.clientY - 60) + 'px'; joy.classList.add('on');
      } else if (lookId === null) { lookId = t.identifier; last = { x: t.clientX, y: t.clientY }; }
    }
  }, { passive: true });
  addEventListener('touchmove', (e) => {
    if (!P.active) return;
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) {
        let dx = t.clientX - joyC.x, dy = t.clientY - joyC.y; const l = Math.hypot(dx, dy);
        if (l > R) { dx *= R / l; dy *= R / l; }
        knob.style.transform = `translate(${dx}px, ${dy}px)`; TOUCH.jx = dx / R; TOUCH.jy = dy / R;
      } else if (t.identifier === lookId) {
        const mx = t.clientX - last.x, my = t.clientY - last.y; last = { x: t.clientX, y: t.clientY };
        P.yaw -= mx * 0.006;
        if (P.mode === 'ride') P.flyPitch = THREE.MathUtils.clamp(P.flyPitch - my * 0.005, -0.9, 0.9);
        else P.pitch = THREE.MathUtils.clamp(P.pitch + my * 0.005, -0.3, 1.25);
      }
    }
    e.preventDefault();
  }, { passive: false });
  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) { joyId = null; TOUCH.jx = TOUCH.jy = 0; knob.style.transform = ''; joy.classList.remove('on'); }
      if (t.identifier === lookId) lookId = null;
    }
  };
  addEventListener('touchend', end); addEventListener('touchcancel', end);
  ui.querySelectorAll('#tbtns button').forEach(b => {
    const a = b.dataset.a;
    b.addEventListener('touchstart', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (a === 'attack') { if (P.mode === 'ride') P.firing = true; else attack(); }
      if (a === 'jump') jump();
      if (a === 'talk') H.interact(P.pos);
      if (a === 'mount') toggleMount();
      if (a === 'potion') H.potion();
      if (a === 'block') skillPress();
    }, { passive: false });
    b.addEventListener('touchend', (e) => { e.preventDefault(); if (a === 'attack') P.firing = false; if (a === 'block') skillRelease(); }, { passive: false });
  });
}
export function showTouch(on) { const ui = document.getElementById('touchUI'); if (ui) ui.style.display = on ? 'block' : 'none'; }
