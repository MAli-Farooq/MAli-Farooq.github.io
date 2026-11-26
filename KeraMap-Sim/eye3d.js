/* Procedurally rendered anatomical eye (WebGL, no libraries). The corneal front surface
   follows the simulation; its difference from healthy is magnified by a stated factor.
   Globe, iris and lens are generic anatomy for context and take no part in the model. */
(function () {
'use strict';

const LIMBUS = 5.75, GLOBE = 12;
const healthy = r2 => Math.sqrt(7.8 * 7.8 - r2) - 7.8;
const Z_LIMBUS = healthy(LIMBUS * LIMBUS);
const Z_GLOBE = Z_LIMBUS - Math.sqrt(GLOBE * GLOBE - LIMBUS * LIMBUS);
const IRIS_Z = -3.25;

const VS = `
attribute vec3 pos; attribute vec3 nor; attribute float dev;
uniform mat3 rot; uniform vec2 scale; uniform float pivot;
varying vec3 vP; varying vec3 vN; varying vec3 vW; varying float vDev;
void main(){
  vP = pos; vN = rot * nor; vDev = dev;
  vec3 q = rot * (pos - vec3(0.0, 0.0, pivot)); vW = q;
  gl_Position = vec4(q.x * scale.x, q.y * scale.y, -q.z / 40.0, 1.0);
}`;

const FS = `
precision highp float;
varying vec3 vP; varying vec3 vN; varying vec3 vW; varying float vDev;
uniform int part; uniform float cut; uniform float cutX; uniform float pupil;
uniform float rings; uniform float heat; uniform float devMax; uniform vec3 flat_;

float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float noise(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }

void main(){
  if (cut > 0.5 && part != 5 && vP.x > cutX) discard;
  vec3 n = normalize(vN);
  vec3 key = normalize(vec3(-0.45, 0.55, 0.70));
  float r = length(vP.xy);

  if (part == 0) {                       // sclera
    if (!gl_FrontFacing) { vec3 c = vec3(0.42, 0.13, 0.10) * (0.75 + 0.5 * fbm(vP * 0.9)); gl_FragColor = vec4(c, 1.0); return; }
    vec3 base = mix(vec3(0.93, 0.90, 0.87), vec3(0.88, 0.76, 0.72), smoothstep(7.5, 12.0, r) * 0.7);
    vec3 w = vP * 0.42 + 2.2 * vec3(fbm(vP * 0.35), fbm(vP.yzx * 0.35), fbm(vP.zxy * 0.35));
    float v1 = pow(1.0 - abs(2.0 * noise(w * 1.7) - 1.0), 14.0);
    float v2 = pow(1.0 - abs(2.0 * noise(w * 4.1 + 7.0) - 1.0), 18.0);
    float amount = smoothstep(6.6, 11.5, r) + 0.35 * smoothstep(-8.0, -12.0, vP.z);
    base = mix(base, vec3(0.70, 0.26, 0.23), clamp((v1 * 0.50 + v2 * 0.25) * amount, 0.0, 0.6));
    base = mix(vec3(0.42, 0.43, 0.43), base, smoothstep(5.6, 6.7, r));
    float d = max(dot(n, key), 0.0), spec = pow(max(dot(reflect(-key, n), vec3(0,0,1)), 0.0), 40.0);
    gl_FragColor = vec4(base * (0.38 + 0.66 * d) + 0.18 * spec, 1.0); return;
  }
  if (part == 1) {                       // iris and pupil
    float a = atan(vP.y, vP.x), rp = pupil * 0.5;
    float t = clamp((r - rp) / (6.0 - rp), 0.0, 1.0);
    vec3 ring = vec3(cos(a), sin(a), 0.0);
    float fib = fbm(ring * 22.0 + vec3(0.0, 0.0, r * 1.1) + fbm(vP * 1.6));
    float fine = noise(ring * 70.0 + vec3(0.0, 0.0, r * 2.5));
    vec3 c = mix(vec3(0.55, 0.36, 0.12), vec3(0.20, 0.36, 0.40), smoothstep(0.12, 0.48, t + 0.25 * (fbm(vP * 1.3) - 0.5)));
    c *= 0.45 + 1.05 * fib + 0.25 * fine;
    c += vec3(0.20, 0.15, 0.07) * exp(-pow((t - 0.27) * 11.0, 2.0)) * fib;
    c *= 1.0 - 0.78 * smoothstep(0.78, 0.98, t);
    c *= 0.5 + 0.5 * smoothstep(0.0, 0.07, t);
    c = mix(vec3(0.012), c, smoothstep(rp - 0.07, rp + 0.07, r));
    gl_FragColor = vec4(c * (0.8 + 0.35 * max(dot(n, key), 0.0)), 1.0); return;
  }
  if (part == 2) {                       // lens
    float d = max(dot(n, key), 0.0);
    gl_FragColor = vec4(vec3(0.78, 0.74, 0.55) * (0.45 + 0.55 * d), 1.0); return;
  }
  if (part == 5) { gl_FragColor = vec4(flat_, 1.0); return; }   // section lines

  // cornea: transparent shell with reflections (premultiplied alpha)
  vec3 view = vec3(0, 0, 1);
  float facing = abs(dot(n, view));
  vec3 col = vec3(0.55, 0.70, 0.80) * 0.05; float alpha = 0.05 + 0.30 * pow(1.0 - facing, 2.5);
  col += vec3(0.65, 0.80, 0.90) * 0.30 * pow(1.0 - facing, 2.5);
  if (heat > 0.5) {
    float t = clamp(vDev / devMax, -1.0, 1.0);
    vec3 hc = t > 0.0 ? vec3(0.89, 0.19, 0.16) : vec3(0.16, 0.47, 0.84);
    float ha = 0.62 * smoothstep(0.03, 0.75, abs(t));
    col = col * (1.0 - ha) + hc * ha; alpha = alpha + ha * (1.0 - alpha);
  }
  if (rings > 0.5) {                     // Placido-style rings reflected about the viewing axis
    vec3 rd = reflect(-view, n);
    float ang = acos(clamp(rd.z, -1.0, 1.0));
    float band = smoothstep(0.35, 0.75, sin(ang * 36.0)) * step(0.09, ang) * (1.0 - smoothstep(1.0, 1.25, ang));
    col += vec3(0.92) * band * 0.6; alpha = max(alpha, band * 0.5);
  }
  vec3 rr = reflect(-view, n);
  float s1 = pow(max(dot(rr, key), 0.0), 220.0), s2 = pow(max(dot(rr, normalize(vec3(0.6, -0.15, 0.78))), 0.0), 600.0);
  col += vec3(1.0) * (s1 * 0.95 + s2 * 0.6); alpha = clamp(alpha + s1 * 0.8 + s2 * 0.5, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}`;

function cubic(g, f, x, y) {
  const fx = x / g.h + g.half, fy = y / g.h + g.half, i = Math.floor(fx), j = Math.floor(fy);
  const weights = t => [((-t + 2) * t - 1) * t / 2, ((3 * t - 5) * t * t + 2) / 2, ((-3 * t + 4) * t + 1) * t / 2, (t - 1) * t * t / 2];
  const wx = weights(fx - i), wy = weights(fy - j); let s = 0;
  for (let b = 0; b < 4; b++) for (let a = 0; a < 4; a++) s += wx[a] * wy[b] * f[(j + b - 1) * g.n + i + a - 1];
  return s;
}

/* mesh from a parametric surface p(u, v) -> {p, n, d} */
function surface(nu, nv, fn) {
  const data = [], idx = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const q = fn(i / nu, j / nv); data.push(...q.p, ...q.n, q.d || 0); }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  return { data: new Float32Array(data), idx: new Uint16Array(idx) };
}

function create(canvas) {
  const gl = canvas.getContext('webgl', { antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
  if (!gl) return null;
  const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const U = {}; for (const n of ['rot', 'scale', 'pivot', 'part', 'cut', 'cutX', 'pupil', 'rings', 'heat', 'devMax', 'flat_']) U[n] = gl.getUniformLocation(prog, n);
  const A = ['pos', 'nor', 'dev'].map(n => gl.getAttribLocation(prog, n));
  const upload = (mesh, into) => {
    const m = into || { v: gl.createBuffer(), i: gl.createBuffer() };
    gl.bindBuffer(gl.ARRAY_BUFFER, m.v); gl.bufferData(gl.ARRAY_BUFFER, mesh.data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.i); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.idx, gl.STATIC_DRAW);
    m.count = mesh.idx.length; return m;
  };

  const th0 = Math.asin(LIMBUS / GLOBE), TAU = 2 * Math.PI;
  const sclera = upload(surface(160, 100, (u, v) => {
    const a = u * TAU, t = th0 + v * (Math.PI - th0), n = [Math.sin(t) * Math.cos(a), Math.sin(t) * Math.sin(a), Math.cos(t)];
    return { p: [GLOBE * n[0], GLOBE * n[1], Z_GLOBE + GLOBE * n[2]], n };
  }));
  // winding: radial parameter increases outward, so front faces point towards +z / out of the globe
  const iris = upload(surface(160, 40, (u, v) => {
    const a = u * TAU, r = v * 6.15;
    return { p: [r * Math.cos(a), r * Math.sin(a), IRIS_Z - 0.35 * (r / 6.15) ** 2], n: [0.12 * (r / 6.15) * Math.cos(a), 0.12 * (r / 6.15) * Math.sin(a), 1] };
  }));
  const lens = upload(surface(80, 40, (u, v) => {
    const a = u * TAU, t = v * Math.PI, c = [Math.sin(t) * Math.cos(a), Math.sin(t) * Math.sin(a), Math.cos(t)];
    return { p: [4.5 * c[0], 4.5 * c[1], IRIS_Z - 2.4 + 1.9 * c[2]], n: [c[0] / 4.5, c[1] / 4.5, c[2] / 1.9] };
  }));
  const cornea = { v: gl.createBuffer(), i: gl.createBuffer() };
  const lines = [0, 1, 2].map(() => ({ v: gl.createBuffer(), i: gl.createBuffer() }));

  const view = { yaw: 0.5, pitch: 0.12, zoom: 1, cut: false, rings: false, heat: false };
  let scene = null;

  function update(s) {
    // s = { g, front, thick, zH, tH, magnify, pupil, cutX, devMax }
    scene = s;
    const dev = new Float64Array(s.g.n * s.g.n);
    for (const k of s.g.ring) dev[k] = s.front[k] - s.zH[k];
    const fade = r => Math.max(0, Math.min(1, (LIMBUS - r) / 0.6));
    const delta = (x, y) => { const r = Math.hypot(x, y); return r >= LIMBUS ? 0 : cubic(s.g, dev, x, y) * fade(r); };
    const height = (x, y) => healthy(x * x + y * y) + s.magnify * delta(x, y);
    upload(surface(180, 80, (u, v) => {
      const a = u * TAU, r = v * LIMBUS, x = r * Math.cos(a), y = r * Math.sin(a), e = 0.06;
      const zx = (height(x + e, y) - height(x - e, y)) / (2 * e), zy = (height(x, y + e) - height(x, y - e)) / (2 * e), len = Math.hypot(zx, zy, 1);
      return { p: [x, y, height(x, y)], n: [-zx / len, -zy / len, 1 / len], d: delta(x, y) * 1000 };
    }), cornea);
    // section ribbons in the plane x = cutX: front, back, and dashed healthy front
    const cx = s.cutX, ymax = Math.sqrt(LIMBUS * LIMBUS - cx * cx) - 0.02;
    const back = (x, y) => height(x, y) - (Math.hypot(x, y) < LIMBUS ? cubic(s.g, s.thick, x, y) : 0.88);
    [[height, 0.1, false], [back, 0.1, false], [(x, y) => healthy(x * x + y * y), 0.07, true]].forEach(([f, width, dashed], k) => {
      const data = [], idx = [], N = 120;
      for (let i = 0; i <= N; i++) {
        const y = -ymax + 2 * ymax * i / N, z = f(cx, y);
        data.push(cx + 0.02, y, z + width / 2, 1, 0, 0, 0, cx + 0.02, y, z - width / 2, 1, 0, 0, 0);
        if (i < N && (!dashed || i % 6 < 3)) { const a = 2 * i; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
      }
      upload({ data: new Float32Array(data), idx: new Uint16Array(idx) }, lines[k]);
    });
    draw();
  }

  function mesh(m, part) {
    gl.uniform1i(U.part, part);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.v);
    [[3, 0], [3, 12], [1, 24]].forEach(([size, off], i) => { gl.enableVertexAttribArray(A[i]); gl.vertexAttribPointer(A[i], size, gl.FLOAT, false, 28, off); });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.i);
    gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_SHORT, 0);
  }

  function draw() {
    if (!scene) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(canvas.clientWidth * dpr), H = Math.round(canvas.clientHeight * dpr);
    if (!W || !H) return;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    gl.viewport(0, 0, W, H); gl.clearColor(0.055, 0.06, 0.07, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const cy = Math.cos(view.yaw), sy = Math.sin(view.yaw), cp = Math.cos(view.pitch), sp = Math.sin(view.pitch);
    // column-major: Rx(pitch) * Ry(yaw)
    gl.uniformMatrix3fv(U.rot, false, [cy, sp * sy, -cp * sy, 0, cp, sp, sy, -sp * cy, cp * cy]);
    const half = 13.6 / view.zoom, aspect = W / H;
    gl.uniform2f(U.scale, 1 / (half * Math.max(1, aspect)), Math.min(1, aspect) / half);
    gl.uniform1f(U.pivot, view.zoom > 1.4 ? -3 : -9);
    gl.uniform1f(U.cut, view.cut ? 1 : 0); gl.uniform1f(U.cutX, scene.cutX); gl.uniform1f(U.pupil, scene.pupil);
    gl.uniform1f(U.rings, view.rings ? 1 : 0); gl.uniform1f(U.heat, view.heat ? 1 : 0); gl.uniform1f(U.devMax, scene.devMax);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    mesh(sclera, 0); mesh(iris, 1); mesh(lens, 2);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    mesh(cornea, 3);
    gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND); gl.depthMask(true);
    if (view.cut) {
      gl.disable(gl.DEPTH_TEST);
      [[0.35, 0.85, 1.0], [0.35, 0.85, 1.0], [1.0, 0.85, 0.3]].forEach((c, k) => { gl.uniform3fv(U.flat_, c); mesh(lines[k], 5); });
    }
  }

  let last = null;
  canvas.addEventListener('pointerdown', e => { last = [e.clientX, e.clientY]; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!last) return;
    view.yaw = Math.max(-1.75, Math.min(1.75, view.yaw + (e.clientX - last[0]) * 0.008));
    view.pitch = Math.max(-1.2, Math.min(1.2, view.pitch + (e.clientY - last[1]) * 0.008));
    last = [e.clientX, e.clientY]; draw();
  });
  canvas.addEventListener('pointerup', () => { last = null; });
  canvas.addEventListener('pointercancel', () => { last = null; });
  new ResizeObserver(draw).observe(canvas);

  return { view, update, draw };
}

window.Eye3D = { create };
})();
