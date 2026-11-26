// Procedural textures painted on canvases at startup (no downloads): colour + normal maps.
import * as THREE from 'three';

// small deterministic value noise for painting
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// tileable fbm: sample on a torus-ish by wrapping lattice period
function fbm(x, y, oct = 4, period = 8) {
  let s = 0, a = 0.5, f = 1;
  for (let o = 0; o < oct; o++) {
    const p = period * f;
    const px = ((x * f) % p + p) % p, py = ((y * f) % p + p) % p;
    // wrap: blend the lattice at the period boundary
    const xi = Math.floor(px), yi = Math.floor(py), xf = px - xi, yf = py - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const H = (i, j) => hash(((i % p) + p) % p + o * 17, ((j % p) + p) % p + o * 31);
    const A = H(xi, yi), B = H(xi + 1, yi), C = H(xi, yi + 1), D = H(xi + 1, yi + 1);
    s += a * (A + (B - A) * u + (C - A) * v + (A - B - C + D) * u * v);
    a *= 0.5; f *= 2;
  }
  return s;
}

function canvas(n) { const c = document.createElement('canvas'); c.width = c.height = n; return c; }
function fromHeight(h, n, fn) { // fn(u,v) -> [r,g,b] 0..255, h(u,v) -> height 0..1
  const c = canvas(n), ctx = c.getContext('2d'), img = ctx.createImageData(n, n);
  const H = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = x / n, v = y / n, i = y * n + x;
    H[i] = h(u, v); const [r, g, b] = fn(u, v, H[i]);
    img.data.set([r, g, b, 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
  return { c, H };
}
function normalCanvas(H, n, strength = 2) {
  const c = canvas(n), ctx = c.getContext('2d'), img = ctx.createImageData(n, n);
  const at = (x, y) => H[((y + n) % n) * n + ((x + n) % n)];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength;
    const len = Math.hypot(dx, dy, 1);
    img.data.set([(-dx / len * 0.5 + 0.5) * 255, (dy / len * 0.5 + 0.5) * 255, (1 / len * 0.5 + 0.5) * 255, 255], (y * n + x) * 4);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
function tex(c, srgb = true, rep = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8; t.needsUpdate = true;
  return t;
}
const clamp255 = (v) => Math.max(0, Math.min(255, v));
const gray = (v, tint = [1, 1, 1]) => [clamp255(v * 255 * tint[0]), clamp255(v * 255 * tint[1]), clamp255(v * 255 * tint[2])];

export const TEX = {};
export function buildTextures() {
  // ---- grass (tinted by vertex colour) ----
  {
    const n = 256;
    const { c, H } = fromHeight((u, v) => fbm(u * 8, v * 8, 5, 8), n, (u, v, h) => gray(0.72 + h * 0.38, [0.96, 1.0, 0.92]));
    const ctx = c.getContext('2d');
    for (let k = 0; k < 2600; k++) { // little blades
      const x = Math.random() * n, y = Math.random() * n, l = 3 + Math.random() * 6, a = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
      const L = 0.65 + Math.random() * 0.5;
      ctx.strokeStyle = `rgba(${235 * L | 0},${255 * L | 0},${215 * L | 0},0.55)`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
    }
    TEX.grass = tex(c); TEX.grassN = tex(normalCanvas(H, n, 3), false);
  }
  // ---- rock strata ----
  {
    const n = 512;
    const h = (u, v) => { const w = fbm(u * 4, v * 4, 4, 4); return 0.5 + 0.5 * Math.sin((v * 10 + w * 2.2) * Math.PI * 2) * 0.55 + fbm(u * 16, v * 16, 3, 16) * 0.45 - 0.25; };
    const { c, H } = fromHeight(h, n, (u, v, hh) => {
      const band = Math.floor((v * 10 + fbm(u * 4, v * 4, 3, 4) * 2.2)) % 3;
      const base = [[1.0, 0.86, 0.74], [0.86, 0.72, 0.66], [0.95, 0.8, 0.7]][(band + 3) % 3];
      return gray(0.55 + hh * 0.5, base);
    });
    TEX.rock = tex(c); TEX.rockN = tex(normalCanvas(H, n, 5), false);
  }
  // ---- wood planks ----
  {
    const n = 256;
    const h = (u, v) => { const plank = Math.floor(v * 4); const gap = (v * 4) % 1 < 0.05 ? 0 : 1; return gap * (0.55 + 0.45 * fbm(u * 2 + plank * 3, v * 40, 3, 2) * Math.sin(u * 60 + fbm(u * 3, v * 3 + plank, 2, 3) * 8) ** 2); };
    const { c, H } = fromHeight(h, n, (u, v, hh) => gray(0.45 + hh * 0.55, [1.0, 0.82, 0.62]));
    TEX.wood = tex(c); TEX.woodN = tex(normalCanvas(H, n, 4), false);
  }
  // ---- roof tiles ----
  {
    const n = 256;
    const h = (u, v) => {
      const row = Math.floor(v * 8), fx = (u * 8 + (row % 2) * 0.5) % 1, fy = (v * 8) % 1;
      const scallop = Math.sqrt(Math.max(0, 1 - ((fx - 0.5) * 2) ** 2)) * 0.35;
      return Math.max(0, Math.min(1, (1 - fy) * 0.8 + scallop - 0.1)) * (0.85 + fbm(u * 16, v * 16, 2, 16) * 0.3);
    };
    const { c, H } = fromHeight(h, n, (u, v, hh) => gray(0.5 + hh * 0.55));
    TEX.roof = tex(c); TEX.roofN = tex(normalCanvas(H, n, 6), false);
  }
  // ---- stone bricks ----
  {
    const n = 256;
    const h = (u, v) => {
      const row = Math.floor(v * 6), fx = (u * 4 + (row % 2) * 0.5) % 1, fy = (v * 6) % 1;
      const m = Math.min(fx, 1 - fx) * 4, mm = Math.min(fy, 1 - fy) * 6;
      const mortar = Math.min(1, Math.min(m, mm) * 3);
      return mortar * (0.7 + fbm(u * 12, v * 12, 3, 12) * 0.3);
    };
    const { c, H } = fromHeight(h, n, (u, v, hh) => { const row = Math.floor(v * 6), col = Math.floor(u * 4 + (row % 2) * 0.5); const t = 0.85 + hash(row, col) * 0.25; return gray((0.35 + hh * 0.65) * t, [0.96, 0.94, 1.0]); });
    TEX.brick = tex(c); TEX.brickN = tex(normalCanvas(H, n, 6), false);
  }
  // ---- plaster ----
  {
    const n = 128;
    const { c, H } = fromHeight((u, v) => fbm(u * 8, v * 8, 4, 8), n, (u, v, h) => gray(0.86 + h * 0.18));
    TEX.plaster = tex(c); TEX.plasterN = tex(normalCanvas(H, n, 1.5), false);
  }
  // ---- bark ----
  {
    const n = 128;
    const { c, H } = fromHeight((u, v) => fbm(u * 16, v * 2, 4, 16) * 0.6 + Math.abs(Math.sin(u * 40 + fbm(u * 4, v * 4, 2, 4) * 6)) * 0.4, n, (u, v, h) => gray(0.5 + h * 0.5, [1, 0.85, 0.72]));
    TEX.bark = tex(c); TEX.barkN = tex(normalCanvas(H, n, 4), false);
  }
  // ---- wool / fur (fluffy speckle) ----
  {
    const n = 128;
    const { c, H } = fromHeight((u, v) => fbm(u * 16, v * 16, 4, 16), n, (u, v, h) => gray(0.8 + h * 0.25));
    TEX.wool = tex(c); TEX.woolN = tex(normalCanvas(H, n, 5), false);
  }
  // ---- soft cloud puff sprite ----
  {
    const n = 128, c = canvas(n), ctx = c.getContext('2d');
    for (let k = 0; k < 14; k++) {
      const x = n * (0.3 + Math.random() * 0.4), y = n * (0.35 + Math.random() * 0.3), r = n * (0.15 + Math.random() * 0.2);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, n, n);
    }
    TEX.puff = tex(c); TEX.puff.wrapS = TEX.puff.wrapT = THREE.ClampToEdgeWrapping;
  }
  // ---- soil furrows ----
  {
    const n = 128;
    const { c, H } = fromHeight((u, v) => 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * 6) * 0.7 + fbm(u * 8, v * 8, 3, 8) * 0.3, n, (u, v, h) => gray(0.3 + h * 0.4, [1, 0.75, 0.55]));
    TEX.soil = tex(c); TEX.soilN = tex(normalCanvas(H, n, 6), false);
  }
  return TEX;
}

// a textured standard material (repeat sets UV scale)
export function texMat(name, opts = {}, rep = 1) {
  const map = TEX[name].clone(), normal = TEX[name + 'N']?.clone();
  map.repeat.set(rep, rep); map.needsUpdate = true;
  if (normal) { normal.repeat.set(rep, rep); normal.needsUpdate = true; }
  return new THREE.MeshStandardMaterial({ map, normalMap: normal ?? null, roughness: 0.9, ...opts });
}
