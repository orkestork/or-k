// Direct chat with the O R-K customer-service agents. Answers come from /api/agente;
// when the server has no AI key (or fails) the agent falls back to local answers.
const $ = (s) => document.querySelector(s);

import { think } from './brain.js?v=4';
const CHIPS = ['¿Qué hacen exactamente?', '¿Cómo es el proceso?', '¿Cuánto cuesta?', 'Tengo un negocio, ¿cómo me ayudan?'];

export function createChat({ onReply, onOpen, onClose, openChallenge, onListen }) {
  const panel = $('#chat'), log = $('#chatLog'), form = $('#chatForm'), input = $('#chatInput'), chips = $('#chatChips');
  const histories = {}, minds = {};
  let current = null, busy = false;

  const bubble = (role, text, cls = '') => {
    const p = document.createElement('p');
    p.className = `msg ${role} ${cls}`.trim(); p.textContent = text;
    log.appendChild(p); log.scrollTop = log.scrollHeight; return p;
  };
  const render = () => { log.replaceChildren(); for (const m of histories[current.id]) bubble(m.role, m.content); };

  async function send(text) {
    text = text.trim().slice(0, 400);
    if (!text || busy || !current) return;
    const { id } = current, history = histories[id];
    history.push({ role: 'user', content: text }); bubble('user', text);
    input.value = ''; busy = true; form.classList.add('busy');
    const typing = bubble('assistant', `${current.short} está escribiendo…`, 'typing');
    let reply = null;
    try {
      const res = await fetch('/api/agente', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent: id, messages: history.slice(-12) }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.reply) reply = data.reply;
    } catch { /* offline: use the local answer */ }
    reply ??= think(id, text, (minds[id] ??= {}));
    typing.remove();
    history.push({ role: 'assistant', content: reply });
    if (current?.id === id) bubble('assistant', reply);
    busy = false; form.classList.remove('busy'); input.focus();
    onReply?.(id, reply);
  }

  form.onsubmit = (e) => { e.preventDefault(); send(input.value); };

  // ---- talk with your voice (Web Speech API speech recognition) ----
  const mic = $('#chatMic'), SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isSafari = /^((?!chrome|android|crios|edg).)*safari/i.test(navigator.userAgent);
  let rec = null, listening = false, heard = '', micReady = false;
  const help = document.createElement('p'); help.id = 'chatMicHelp'; help.setAttribute('role', 'status'); help.hidden = true;
  form.after(help);
  const showHelp = (html) => { help.innerHTML = html; help.hidden = !html; };
  const HELP = {
    blocked: isSafari
      ? '🎤 El micrófono está bloqueado. En Safari ve a <b>Safari › Ajustes para este sitio web › Micrófono › Permitir</b>. Si sigue sin funcionar, revisa <b>Ajustes del Sistema › Privacidad y seguridad › Micrófono</b> y activa Safari.'
      : '🎤 El micrófono está bloqueado. Haz clic en el ícono <b>de la izquierda de la barra de direcciones</b> (🔒 o ⓘ) › <b>Micrófono › Permitir</b> y recarga. Si sigue igual, en el Mac abre <b>Ajustes del Sistema › Privacidad y seguridad › Micrófono</b> y activa tu navegador.',
    service: isSafari
      ? '🎤 Safari necesita el <b>Dictado</b> activado: <b>Ajustes del Sistema › Teclado › Dictado</b>. Mientras tanto, puedes escribirme.'
      : '🎤 El reconocimiento de voz no está disponible en este navegador ahora mismo. Prueba en Chrome o escríbeme.',
    nodevice: '🎤 No encuentro un micrófono conectado. Revisa que esté activo o escríbeme.',
    network: '🎤 El reconocimiento de voz necesita conexión a internet. Revísala o escríbeme.',
  };
  const setMic = (on) => { listening = on; mic.setAttribute('aria-pressed', String(on)); input.placeholder = on ? 'Te escucho… habla ahora' : 'Escribe o usa el 🎤…'; };
  // ask for the microphone explicitly first: this is what shows the browser's permission prompt
  async function ensureMic() {
    if (micReady || !navigator.mediaDevices?.getUserMedia) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop()); micReady = true; return true;
    } catch (err) {
      showHelp(err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError' ? HELP.nodevice : HELP.blocked);
      return false;
    }
  }
  if (SR && mic) {
    mic.hidden = false;
    rec = new SR(); rec.lang = 'es-CO'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      let interim = ''; heard = '';
      for (const r of e.results) { if (r.isFinal) heard += r[0].transcript; else interim += r[0].transcript; }
      input.value = (heard + interim).trim();
    };
    rec.onend = () => { const said = heard.trim() || input.value.trim(); const was = listening; setMic(false); if (was && said && !busy) send(said); heard = ''; };
    rec.onerror = (e) => {
      setMic(false);
      if (e.error === 'not-allowed') { micReady = false; showHelp(HELP.blocked); }
      else if (e.error === 'service-not-allowed') showHelp(HELP.service);
      else if (e.error === 'audio-capture') showHelp(HELP.nodevice);
      else if (e.error === 'network') showHelp(HELP.network);
      else if (e.error === 'no-speech') input.placeholder = 'No te escuché. Pulsa 🎤 e inténtalo de nuevo.';
    };
    mic.onclick = async () => {
      if (busy) return;
      if (listening) { rec.stop(); return; }
      if (!(await ensureMic())) return;
      showHelp(''); onListen?.(); input.value = ''; heard = '';
      try { rec.start(); setMic(true); } catch { setMic(false); }
    };
  }
  function open({ id, name, role, greeting, hasChallenge }) {
    current = { id, short: name.split(' ·')[0] };
    histories[id] ??= [{ role: 'assistant', content: greeting }];
    $('#chatName').textContent = name; $('#chatRole').textContent = role;
    $('#chatChallenge').hidden = !hasChallenge;
    render(); panel.hidden = false;
    document.exitPointerLock?.();
    setTimeout(() => input.focus(), 30);
    onOpen?.(id);
  }
  function close() {
    if (panel.hidden) return;
    panel.hidden = true; input.blur(); if (listening) rec?.abort();
    const id = current?.id; current = null; onClose?.(id);
  }
  return { open, close, isOpen: () => !panel.hidden };
}
