import * as THREE from "three";

/**
 * WebGL renderer for the showreel reveal. Draws the reel video on a finely
 * subdivided plane that morphs from a rounded card into the full viewport.
 * While it moves, the edges bend like a liquid wave (spring-driven), a ripple
 * runs across the image and the colour splits slightly. A violet duotone fades
 * out as the reel opens.
 */
export type ReelInsets = { top: number; right: number; bottom: number; left: number };

const vertexShader = /* glsl */ `
  uniform vec2 uViewport;
  uniform vec4 uRect;      // x0, y0, x1, y1 in px (y down)
  uniform float uBend;     // spring velocity -> edge bulge (px)
  uniform float uWave;     // travelling wave amplitude (px)
  uniform float uTime;
  uniform float uProgress;
  varying vec2 vUv;
  varying vec2 vSize;
  const float PI = 3.141592653589793;

  void main() {
    vUv = uv;
    vec2 size = uRect.zw - uRect.xy;
    vSize = size;
    float px = mix(uRect.x, uRect.z, uv.x);
    float py = mix(uRect.w, uRect.y, uv.y);

    // Edges bulge outwards (or suck in) proportionally to how fast the card is opening.
    float sx = (uv.x - .5) * 2.;
    float sy = (uv.y - .5) * 2.;
    px += sin(uv.y * PI) * sx * uBend * .55;
    py -= sin(uv.x * PI) * sy * uBend;

    // A wave that travels along the top and bottom edges.
    float travel = sin(uv.x * PI * 2.2 - uTime * 2.1 + uProgress * 9.) * uWave;
    py -= travel * sy;
    px += sin(uv.y * PI * 1.6 + uTime * 1.7) * uWave * .35 * sx;

    vec2 clip = vec2(px / uViewport.x * 2. - 1., 1. - py / uViewport.y * 2.);
    gl_Position = vec4(clip, 0., 1.);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uMapAspect;
  uniform float uProgress;
  uniform float uRadius;
  uniform float uEnergy;
  uniform float uTime;
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
    float k = 1. - uProgress;

    // Rounded corners (in px space).
    float d = roundedBox((vUv - .5) * vSize, vSize * .5, uRadius);
    float alpha = 1. - smoothstep(-1., 1., d);
    if (alpha <= 0.) discard;

    // object-fit: cover + a slow zoom-out as it opens.
    float planeAspect = vSize.x / max(vSize.y, 1.);
    vec2 ratio = vec2(min(planeAspect / uMapAspect, 1.), min(uMapAspect / planeAspect, 1.));
    vec2 uv = vUv * ratio + (1. - ratio) * .5;
    float zoom = 1.18 - uProgress * .18;
    uv = (uv - .5) / zoom + .5;

    // Liquid ripple from the centre, stronger while moving.
    vec2 fromCenter = vUv - .5;
    float dist = length(fromCenter);
    float ripple = sin(dist * 22. - uTime * 4.5) * (.004 + uEnergy * .018) * (1. - dist);
    uv += normalize(fromCenter + 1e-5) * ripple;

    // Chromatic split.
    vec2 shift = vec2(.0025 * k + uEnergy * .012, 0.);
    vec3 col;
    col.r = texture2D(uMap, uv + shift).r;
    col.g = texture2D(uMap, uv).g;
    col.b = texture2D(uMap, uv - shift).b;

    col = mix(col, duotone(col), smoothstep(0., 1., k * 1.25));
    // Soft light sweep across the card.
    col += vec3(.49, .24, 1.) * smoothstep(.25, 0., abs(vUv.x - fract(uTime * .08) * 1.6 + .3)) * .08 * k;

    gl_FragColor = vec4(col, alpha);
  }
`;

export function createReelWave(options: {
  canvas: HTMLCanvasElement;
  video: HTMLVideoElement;
  poster: string;
  getInsets: () => ReelInsets;
  getTarget: () => number;
  onFrame: (value: number) => void;
}) {
  const { canvas, video, poster, getInsets, getTarget, onFrame } = options;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const posterTexture = new THREE.TextureLoader().load(poster, (tex) => {
    if (!usingVideo && tex.image) uniforms.uMapAspect.value = tex.image.width / tex.image.height;
  });
  posterTexture.colorSpace = THREE.SRGBColorSpace;
  const videoTexture = new THREE.VideoTexture(video);
  videoTexture.colorSpace = THREE.SRGBColorSpace;
  let usingVideo = false;

  const uniforms = {
    uMap: { value: posterTexture as THREE.Texture },
    uMapAspect: { value: 16 / 9 },
    uViewport: { value: new THREE.Vector2(1, 1) },
    uRect: { value: new THREE.Vector4() },
    uBend: { value: 0 },
    uWave: { value: 0 },
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uRadius: { value: 28 },
    uEnergy: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true });
  const geometry = new THREE.PlaneGeometry(1, 1, 64, 64);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const useVideo = () => {
    if (usingVideo || video.readyState < 2 || !video.videoWidth) return;
    usingVideo = true;
    uniforms.uMap.value = videoTexture;
    uniforms.uMapAspect.value = video.videoWidth / video.videoHeight;
  };
  video.addEventListener("playing", useVideo);
  video.addEventListener("loadeddata", useVideo);

  let width = 1, height = 1;
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    uniforms.uViewport.value.set(width, height);
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  // Spring state for the opening value.
  let value = getTarget();
  let velocity = 0;
  let lastScroll = window.scrollY;
  let scrollEnergy = 0;
  let running = false;
  let frame = 0;
  const clock = new THREE.Clock();

  const tick = () => {
    frame = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 1 / 30);
    uniforms.uTime.value += dt;
    useVideo();

    const target = getTarget();
    // Under-damped spring -> slight elastic overshoot like a liquid surface.
    const accel = (target - value) * 170 - velocity * 17;
    velocity += accel * dt;
    value += velocity * dt;
    const shown = Math.min(1.02, Math.max(-0.02, value));
    const clamped = Math.min(1, Math.max(0, shown));

    const scrollDelta = window.scrollY - lastScroll;
    lastScroll = window.scrollY;
    scrollEnergy += (Math.min(1, Math.abs(scrollDelta) / 60) - scrollEnergy) * .12;

    const inset = getInsets();
    const k = 1 - clamped;
    // Overscan near full screen so the wavy edges never reveal the background.
    const over = 48 * Math.pow(clamped, 4);
    uniforms.uRect.value.set(inset.left * k * width - over, inset.top * k * height - over, width - inset.right * k * width + over, height - inset.bottom * k * height + over);
    uniforms.uProgress.value = clamped;
    uniforms.uRadius.value = 28 * k + 2;
    const openness = Math.sin(clamped * Math.PI); // 0 at rest, 1 mid-way
    uniforms.uBend.value = THREE.MathUtils.clamp(velocity * height * .09, -height * .14, height * .14);
    uniforms.uWave.value = (6 + openness * 26) * (.35 + scrollEnergy) * (clamped > .995 ? 0.15 : 1);
    uniforms.uEnergy.value = Math.min(1, Math.abs(velocity) * .9 + scrollEnergy * .8);

    onFrame(clamped);
    renderer.render(scene, camera);
  };

  return {
    start() { if (!running) { running = true; clock.getDelta(); frame = requestAnimationFrame(tick); } },
    stop() { running = false; cancelAnimationFrame(frame); },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      video.removeEventListener("playing", useVideo);
      video.removeEventListener("loadeddata", useVideo);
      geometry.dispose();
      material.dispose();
      posterTexture.dispose();
      videoTexture.dispose();
      renderer.dispose();
    },
  };
}
