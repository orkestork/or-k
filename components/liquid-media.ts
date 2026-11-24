import * as THREE from "three";

/**
 * Liquid WebGL surface for a single image/video card (same language as the reel):
 * violet duotone at rest, wavy spring-driven edges that react to scroll speed,
 * and on hover a wavy circle of real colour opens from the cursor with ripples.
 */
const vertexShader = /* glsl */ `
  uniform vec2 uViewport;
  uniform vec4 uRect;
  uniform float uBend;
  uniform float uWave;
  uniform float uTime;
  uniform float uSeed;
  varying vec2 vUv;
  varying vec2 vSize;
  const float PI = 3.141592653589793;
  void main() {
    vUv = uv;
    vec2 size = uRect.zw - uRect.xy;
    vSize = size;
    float px = mix(uRect.x, uRect.z, uv.x);
    float py = mix(uRect.w, uRect.y, uv.y);
    float sx = (uv.x - .5) * 2.;
    float sy = (uv.y - .5) * 2.;
    px += sin(uv.y * PI) * sx * uBend * .5;
    py -= sin(uv.x * PI) * sy * uBend;
    py -= sin(uv.x * PI * 2.2 - uTime * 2. + uSeed) * uWave * sy;
    px += sin(uv.y * PI * 1.7 + uTime * 1.6 + uSeed) * uWave * .4 * sx;
    gl_Position = vec4(px / uViewport.x * 2. - 1., 1. - py / uViewport.y * 2., 0., 1.);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uMapAspect;
  uniform float uRadius;
  uniform float uHover;
  uniform float uReveal;
  uniform float uEnergy;
  uniform float uTime;
  uniform vec2 uMouse;
  varying vec2 vUv;
  varying vec2 vSize;

  float roundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r;
  }
  vec3 duotone(vec3 c) {
    float l = dot(c, vec3(.299, .587, .114));
    vec3 dark = vec3(.11, .05, .22);
    vec3 mid = vec3(.486, .235, 1.);
    vec3 light = vec3(.93, .89, 1.);
    return l < .5 ? mix(dark, mid, l * 2.) : mix(mid, light, l * 2. - 1.);
  }

  void main() {
    float d = roundedBox((vUv - .5) * vSize, vSize * .5, uRadius);
    float alpha = 1. - smoothstep(-1., 1., d);
    if (alpha <= 0.) discard;

    float planeAspect = vSize.x / max(vSize.y, 1.);
    vec2 ratio = vec2(min(planeAspect / uMapAspect, 1.), min(uMapAspect / planeAspect, 1.));
    vec2 uv = vUv * ratio + (1. - ratio) * .5;
    uv = (uv - .5) / (1.08 + uHover * .04) + .5;

    // Ripples around the cursor.
    vec2 p = vUv * vSize;
    vec2 m = uMouse * vSize;
    float dist = distance(p, m);
    vec2 dir = normalize(p - m + 1e-4);
    float ripple = sin(dist * .045 - uTime * 6.) * exp(-dist * .006) * uHover;
    uv += dir * ripple * .005;

    vec2 shift = vec2(uEnergy * .0025 + uHover * .0012, 0.);
    vec3 col;
    col.r = texture2D(uMap, uv + shift).r;
    col.g = texture2D(uMap, uv).g;
    col.b = texture2D(uMap, uv - shift).b;

    // Wavy circle of colour opening from the cursor.
    float angle = atan(p.y - m.y, p.x - m.x);
    float radius = uHover * length(vSize) * 1.05;
    float wobble = sin(angle * 5. + uTime * 3.) * 14. + sin(angle * 9. - uTime * 2.) * 7.;
    float inside = 1. - smoothstep(radius - 40., radius + 4., dist + wobble);
    float colourMix = max(inside, uReveal);

    vec3 tone = duotone(col);
    vec3 outCol = mix(tone, col, colourMix);
    // Glowing rim on the reveal edge.
    float rim = smoothstep(40., 0., abs(dist + wobble - radius)) * uHover * (1. - uReveal);
    outCol += vec3(.55, .35, 1.) * rim * .35;

    gl_FragColor = vec4(outCol, alpha);
  }
`;

export type LiquidMedia = {
  frame: (dt: number, scrollVelocity: number) => void;
  setHover: (on: boolean, x?: number, y?: number) => void;
  setMouse: (x: number, y: number) => void;
  setReveal: (value: number) => void;
  /** Draw the plane at a custom rect (px, relative to the canvas) instead of the padded full canvas. */
  setRect: (x0: number, y0: number, x1: number, y1: number, radius?: number) => void;
  resize: () => void;
  dispose: () => void;
};

export function createLiquidMedia(options: {
  canvas: HTMLCanvasElement;
  image: HTMLImageElement;
  video?: HTMLVideoElement | null;
  pad: number;
  seed: number;
}): LiquidMedia {
  const { canvas, image, video, pad, seed } = options;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();

  const imageTexture = new THREE.Texture(image);
  imageTexture.colorSpace = THREE.SRGBColorSpace;
  const markImage = () => {
    if (!image.naturalWidth) return;
    imageTexture.needsUpdate = true;
    if (uniforms.uMap.value === imageTexture) uniforms.uMapAspect.value = image.naturalWidth / image.naturalHeight;
  };
  const videoTexture = video ? new THREE.VideoTexture(video) : null;
  if (videoTexture) videoTexture.colorSpace = THREE.SRGBColorSpace;

  const uniforms = {
    uMap: { value: imageTexture as THREE.Texture },
    uMapAspect: { value: 4 / 3 },
    uViewport: { value: new THREE.Vector2(1, 1) },
    uRect: { value: new THREE.Vector4() },
    uBend: { value: 0 },
    uWave: { value: 0 },
    uTime: { value: seed * 10 },
    uSeed: { value: seed * 6.28 },
    uRadius: { value: 18 },
    uHover: { value: 0 },
    uReveal: { value: 0 },
    uEnergy: { value: 0 },
    uMouse: { value: new THREE.Vector2(.5, .5) },
  };
  if (image.complete) markImage(); else image.addEventListener("load", markImage, { once: true });

  const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true });
  const geometry = new THREE.PlaneGeometry(1, 1, 48, 48);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  let width = 1, height = 1;
  const resize = () => {
    // Layout size (ignores transforms such as a slide scaling while it moves).
    width = Math.max(1, canvas.clientWidth);
    height = Math.max(1, canvas.clientHeight);
    renderer.setSize(width, height, false);
    uniforms.uViewport.value.set(width, height);
  };
  resize();

  let hoverTarget = 0, hover = 0, hoverVel = 0;
  let bend = 0, bendVel = 0;
  let reveal = 0, revealTarget = 0;
  let energy = 0;
  let customRect: [number, number, number, number] | null = null;
  let baseRadius = 18;
  const mouse = new THREE.Vector2(.5, .5);
  const mouseTarget = new THREE.Vector2(.5, .5);

  return {
    frame(dt, scrollVelocity) {
      uniforms.uTime.value += dt;
      // Hover spring (slightly elastic).
      hoverVel += ((hoverTarget - hover) * 90 - hoverVel * 13) * dt;
      hover = Math.max(0, hover + hoverVel * dt);
      // Edge bend follows scroll speed with an under-damped spring -> liquid wobble.
      const bendTarget = THREE.MathUtils.clamp(scrollVelocity * .3, -16, 16);
      bendVel += ((bendTarget - bend) * 120 - bendVel * 9) * dt;
      bend += bendVel * dt;
      reveal += (revealTarget - reveal) * Math.min(1, dt * 4);
      energy += (Math.min(1, Math.abs(scrollVelocity) / 40) - energy) * Math.min(1, dt * 6);
      mouse.lerp(mouseTarget, Math.min(1, dt * 10));

      const useVideo = !!video && !video.paused && video.readyState >= 2 && video.videoWidth > 0;
      if (useVideo && videoTexture && uniforms.uMap.value !== videoTexture) {
        uniforms.uMap.value = videoTexture;
        uniforms.uMapAspect.value = video!.videoWidth / video!.videoHeight;
      } else if (!useVideo && uniforms.uMap.value !== imageTexture) {
        uniforms.uMap.value = imageTexture;
        if (image.naturalWidth) uniforms.uMapAspect.value = image.naturalWidth / image.naturalHeight;
      }

      if (customRect) uniforms.uRect.value.set(...customRect);
      else uniforms.uRect.value.set(pad, pad, width - pad, height - pad);
      uniforms.uBend.value = bend;
      uniforms.uWave.value = 1.2 + energy * 6 + hover * 2;
      uniforms.uHover.value = Math.min(1.2, hover);
      uniforms.uReveal.value = reveal;
      uniforms.uEnergy.value = energy;
      uniforms.uRadius.value = baseRadius + hover * 10;
      uniforms.uMouse.value.copy(mouse);
      renderer.render(scene, camera);
    },
    setHover(on, x, y) {
      hoverTarget = on ? 1 : 0;
      if (on && x !== undefined && y !== undefined) { mouse.set(x, y); mouseTarget.set(x, y); }
    },
    setMouse(x, y) { mouseTarget.set(x, y); },
    setReveal(value) { revealTarget = value; },
    setRect(x0, y0, x1, y1, radius) {
      customRect = [x0, y0, x1, y1];
      if (radius !== undefined) baseRadius = radius;
    },
    resize,
    dispose() {
      geometry.dispose();
      material.dispose();
      imageTexture.dispose();
      videoTexture?.dispose();
      renderer.dispose();
    },
  };
}
