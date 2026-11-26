/* Reduced-order keratoconus repair model. Every value is an illustrative assumption.
   Units: mm, MPa, hours, unless a name says otherwise. No patient or laboratory data. */
(function (root) {
'use strict';

const R = 7.8, R_OPT = 4.0, R_MECH = 5.75, NU = 0.49;
const N_CORNEA = 1.376, N_AQUEOUS = 1.336, LAMBDA_MM = 0.55e-3;
const MMHG = 0.000133322, P_IMAGE = 15; // pressure (mmHg) at which shapes are prescribed
const ARCMIN_PER_MRAD = 3.43775, DEG_PER_MRAD = 0.0572958;

const DEFAULTS = {
  // cone (values from the proposal's Figures 1-3)
  coneX: 0.6, coneY: -0.7, coneSigma: 0.85, bulge: 0.20, loss: 0.14, weak: 0.45,
  // mechanics and optics
  E0: 0.3, iop: 15, pupil: 4, correction: 'spherocyl',
  // repair
  mode: 'budget', budget: 0.1, cap: 1.5, footSigma: 0.85,
  // transport
  dose: 1, permLog: -6, diff: 20, kon: 0.3, koff: 0.05, kcl: 0.02,
  contact: 2, resHalf: 4, observe: 24, placeErr: 0.3,
  emax: 1.0, u50: 0.2
};

function makeGrid(h) {
  const half = Math.ceil(R_MECH / h) + 2, n = 2 * half + 1;
  const x = new Float64Array(n * n), y = new Float64Array(n * n);
  const active = [], ring = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = j * n + i; x[k] = (i - half) * h; y[k] = (j - half) * h;
    const r = Math.hypot(x[k], y[k]);
    if (r < R_MECH - 1e-9) active.push(k);
    if (r < R_MECH + 1.01 * h && i > 0 && j > 0 && i < n - 1 && j < n - 1) ring.push(k);
  }
  return { h, n, half, x, y, active: Int32Array.from(active), ring: Int32Array.from(ring) };
}

const gauss = (x, y, cx, cy, s) => Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s));
const healthyFront = (x, y) => Math.sqrt(R * R - x * x - y * y) - R;
const healthyThick = (x, y) => 0.55 + 0.16 * (x * x + y * y) / 16;

/* Shallow-shell energy: D(lap w)^2 + N|grad w|^2 + k w^2 - 2pw, w = 0 outside R_MECH.
   Solved by Jacobi-preconditioned conjugate gradients. */
function solveShell(g, S, thick, E0, iop, guess, tol) {
  const { n, h, active, ring } = g, M = n * n;
  const p = iop * MMHG, T = p * R / 2, h2 = h * h, h4 = h2 * h2;
  const D = new Float64Array(M), K = new Float64Array(M), diag = new Float64Array(M);
  for (const k of ring) {
    const E = E0 * S[k], t = thick[k];
    D[k] = E * t * t * t / (12 * (1 - NU * NU));
    K[k] = 2 * E * t / ((1 - NU) * R * R);
  }
  for (const k of active)
    diag[k] = (16 * D[k] + D[k - 1] + D[k + 1] + D[k - n] + D[k + n]) / h4 + 4 * T / h2 + K[k];
  const lap = new Float64Array(M);
  function apply(v, out) {
    for (const k of ring) lap[k] = D[k] * (v[k - 1] + v[k + 1] + v[k - n] + v[k + n] - 4 * v[k]) / h2;
    for (const k of active)
      out[k] = (lap[k - 1] + lap[k + 1] + lap[k - n] + lap[k + n] - 4 * lap[k]) / h2
        + T * (4 * v[k] - v[k - 1] - v[k + 1] - v[k - n] - v[k + n]) / h2 + K[k] * v[k];
  }
  const w = new Float64Array(M);
  if (guess) for (const k of active) w[k] = guess[k];
  const r = new Float64Array(M), z = new Float64Array(M), d = new Float64Array(M), q = new Float64Array(M);
  apply(w, q);
  let rz = 0, bb = 0;
  for (const k of active) { r[k] = p - q[k]; z[k] = r[k] / diag[k]; d[k] = z[k]; rz += r[k] * z[k]; bb += p * p; }
  const stop = (tol || 1e-7) ** 2 * bb;
  let it = 0, rr = Infinity;
  for (; it < 4000 && rr > stop; it++) {
    apply(d, q);
    let dq = 0; for (const k of active) dq += d[k] * q[k];
    if (dq <= 0) break;
    const a = rz / dq; let rzNew = 0; rr = 0;
    for (const k of active) { w[k] += a * d[k]; r[k] -= a * q[k]; z[k] = r[k] / diag[k]; rzNew += r[k] * z[k]; rr += r[k] * r[k]; }
    const b = rzNew / rz; rz = rzNew;
    for (const k of active) d[k] = z[k] + b * d[k];
  }
  return { w, iterations: it, converged: rr <= stop || bb === 0 };
}

/* Healthy and affected corneas. The affected shape is prescribed at P_IMAGE; its
   unloaded offset follows from the same linear model (shape = image - w_image + w_new). */
function buildCornea(prm, h) {
  const g = makeGrid(h || 0.25), M = g.n * g.n;
  const c = { g, prm };
  for (const name of ['G', 'zH', 'zK', 'tH', 'tK', 'sH', 'sK']) c[name] = new Float64Array(M);
  for (const k of g.ring) {
    const x = g.x[k], y = g.y[k], G = gauss(x, y, prm.coneX, prm.coneY, prm.coneSigma);
    c.G[k] = G;
    c.zH[k] = healthyFront(x, y); c.tH[k] = healthyThick(x, y); c.sH[k] = 1;
    c.zK[k] = c.zH[k] + prm.bulge * G; c.tK[k] = c.tH[k] - prm.loss * G; c.sK[k] = 1 - prm.weak * G;
  }
  c.wH0 = solveShell(g, c.sH, c.tH, prm.E0, P_IMAGE).w;
  c.wK0 = solveShell(g, c.sK, c.tK, prm.E0, P_IMAGE).w;
  return c;
}

/* Depth transport through the stroma (implicit Euler), reservoir at the surface.
   c = free protein, b = matrix-bound, both relative to the initial reservoir. */
function transport(prm) {
  const L = 0.5, N = 25, dz = L / N, dt = 0.05;
  const D = prm.diff * 0.0036;                       // um^2/s -> mm^2/h
  const P = Math.pow(10, prm.permLog) * 36000;       // cm/s -> mm/h
  const Peff = 1 / (1 / P + dz / (2 * D));
  const c = new Float64Array(N), b = new Float64Array(N);
  const steps = Math.round(prm.observe / dt), times = [0], series = [0];
  const den = 1 + dt * (prm.koff + prm.kcl), beta = dt * prm.kon / den;
  const a = D * dt / (dz * dz);
  const cp = new Float64Array(N), dp = new Float64Array(N);
  let integral = 0;
  for (let s = 1; s <= steps; s++) {
    const t = s * dt, open = t <= prm.contact + 1e-9;
    const Cr = Math.pow(0.5, t / prm.resHalf), alpha = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      alpha[i] = b[i] / den;
      const lo = i > 0 ? -a : 0, up = i < N - 1 ? -a : 0;
      let dg = 1 - lo - up + dt * (prm.kon + prm.kcl) - dt * prm.koff * beta;
      let rhs = c[i] + dt * prm.koff * alpha[i];
      if (i === 0 && open) { dg += dt * Peff / dz; rhs += dt * Peff / dz * Cr; }
      const m = dg - lo * (i > 0 ? cp[i - 1] : 0);
      cp[i] = up / m; dp[i] = (rhs - lo * (i > 0 ? dp[i - 1] : 0)) / m;
    }
    for (let i = N - 1; i >= 0; i--) c[i] = dp[i] - (i < N - 1 ? cp[i] * c[i + 1] : 0);
    let mean = 0;
    for (let i = 0; i < N; i++) { b[i] = alpha[i] + beta * c[i]; mean += (c[i] + b[i]) / N; }
    integral += mean * dt;
    if (s % 4 === 0 || s === steps) { times.push(t); series.push(mean); }
  }
  const depth = [], total = [], bound = [];
  for (let i = 0; i < N; i++) { depth.push((i + 0.5) * dz * 1000); total.push(c[i] + b[i]); bound.push(b[i]); }
  return { times, series, depth, total, bound, meanExposure: integral / prm.observe };
}

/* A footprint is either {uniform:true} or a Gaussian {x,y,sigma}. */
const diskEdge = r => 0.5 * (1 - Math.tanh((r - R_OPT) / 0.15));

function stiffnessChange(cornea, foot, prm, tr) {
  const g = cornea.g, dS = new Float64Array(g.n * g.n), shape = new Float64Array(g.n * g.n);
  const dA = g.h * g.h;
  if (prm.mode === 'budget') {
    // matched integrated material change: integral(dS * t) equals the uniform value
    let num = 0, den = 0;
    for (const k of g.ring) {
      const x = g.x[k], y = g.y[k], disk = diskEdge(Math.hypot(x, y));
      shape[k] = foot.uniform ? disk : disk * gauss(x, y, foot.x, foot.y, foot.sigma);
      num += disk * cornea.tK[k] * dA; den += shape[k] * cornea.tK[k] * dA;
    }
    const amp = den > 0 ? prm.budget * num / den : 0;
    let used = 0;
    for (const k of g.ring) { dS[k] = Math.min(prm.cap, amp * shape[k]); used += dS[k] * cornea.tK[k] * dA; }
    return { dS, delivered: num > 0 ? used / (prm.budget * num || 1) : 0 };
  }
  // delivery-informed: matched total applied protein; exposure then saturating response
  const spread2 = 2 * prm.diff * 0.0036 * (prm.observe / 2) * 0.1 + prm.placeErr ** 2; // lateral diffusion damped x0.1 for binding
  let applied = 0, uniformApplied = 0;
  for (const k of g.ring) {
    const x = g.x[k], y = g.y[k], r = Math.hypot(x, y), disk = diskEdge(r);
    uniformApplied += disk * dA;
    applied += (foot.uniform ? disk : gauss(x, y, foot.x, foot.y, foot.sigma)) * dA;
    if (foot.uniform) shape[k] = disk;
    else {
      const s2 = foot.sigma ** 2 + spread2;
      shape[k] = foot.sigma ** 2 / s2 * Math.exp(-((x - foot.x) ** 2 + (y - foot.y) ** 2) / (2 * s2));
    }
  }
  const conc = prm.dose * uniformApplied / applied;
  let on = 0, all = 0;
  for (const k of g.ring) {
    const u = conc * shape[k] * tr.meanExposure;
    dS[k] = Math.min(prm.cap, prm.emax * u / (u + prm.u50));
    all += u * dA; if (cornea.G[k] >= 0.5) on += u * dA;
  }
  return { dS, delivered: 1, onTarget: all > 0 ? on / all : 0 };
}

function interp(g, f, x, y) {
  const fx = x / g.h + g.half, fy = y / g.h + g.half, i = Math.floor(fx), j = Math.floor(fy);
  const a = fx - i, b = fy - j, k = j * g.n + i;
  return (f[k] * (1 - a) + f[k + 1] * a) * (1 - b) + (f[k + g.n] * (1 - a) + f[k + g.n + 1] * a) * b;
}

function linearSolve(A, v) {
  const n = v.length;
  for (let c = 0; c < n; c++) for (let r = c + 1; r < n; r++) {
    const f = A[r][c] / A[c][c];
    for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
    v[r] -= f * v[c];
  }
  const out = new Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = v[r]; for (let k = r + 1; k < n; k++) s -= A[r][k] * out[k];
    out[r] = s / A[r][r];
  }
  return out;
}

/* Thin-element wavefront error against the healthy cornea imaged at P_IMAGE. */
function optics(cornea, front, thick, prm, withMtf, rays) {
  const g = cornea.g, W = new Float64Array(g.n * g.n);
  for (const k of g.ring) {
    const dFront = front[k] - cornea.zH[k];
    const dBack = (front[k] - thick[k]) - (cornea.zH[k] - cornea.tH[k]);
    W[k] = 1000 * ((N_CORNEA - 1) * dFront + (N_AQUEOUS - N_CORNEA) * dBack); // um
  }
  const Wx = new Float64Array(g.n * g.n), Wy = new Float64Array(g.n * g.n);
  for (const k of g.active) { Wx[k] = (W[k + 1] - W[k - 1]) / (2 * g.h); Wy[k] = (W[k + g.n] - W[k - g.n]) / (2 * g.h); }
  const rad = prm.pupil / 2, m = rays || 56, pts = [];
  for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) {
    const u = -1 + (2 * i + 1) / m, v = -1 + (2 * j + 1) / m;
    if (u * u + v * v <= 1) {
      const x = u * rad, y = v * rad;
      pts.push([u, v, interp(g, W, x, y), interp(g, Wx, x, y), interp(g, Wy, x, y)]);
    }
  }
  const nb = prm.correction === 'spherocyl' ? 6 : prm.correction === 'sphere' ? 4 : 3;
  const basis = (u, v) => [1, u, v, u * u + v * v, u * u - v * v, 2 * u * v];
  const A = Array.from({ length: nb }, () => new Array(nb).fill(0)), rhs = new Array(nb).fill(0);
  for (const q of pts) {
    const B = basis(q[0], q[1]);
    for (let a = 0; a < nb; a++) { rhs[a] += B[a] * q[2]; for (let b = 0; b < nb; b++) A[a][b] += B[a] * B[b]; }
  }
  const cf = linearSolve(A, rhs); while (cf.length < 6) cf.push(0);
  let ss = 0, spot = 0, mx = 0, my = 0;
  const tx = new Float64Array(pts.length), ty = new Float64Array(pts.length);
  pts.forEach((q, i) => {
    const [u, v] = q, B = basis(u, v);
    let fit = 0; for (let a = 0; a < 6; a++) fit += cf[a] * B[a];
    ss += (q[2] - fit) ** 2;
    tx[i] = q[3] - (cf[1] + 2 * cf[3] * u + 2 * cf[4] * u + 2 * cf[5] * v) / rad; // mrad
    ty[i] = q[4] - (cf[2] + 2 * cf[3] * v - 2 * cf[4] * v + 2 * cf[5] * u) / rad;
    mx += tx[i]; my += ty[i];
  });
  mx /= pts.length; my /= pts.length;
  for (let i = 0; i < pts.length; i++) { tx[i] -= mx; ty[i] -= my; spot += tx[i] ** 2 + ty[i] ** 2; }
  const out = { rms: Math.sqrt(ss / pts.length), spot: Math.sqrt(spot / pts.length) * ARCMIN_PER_MRAD, tx, ty };
  if (withMtf) {
    const fc = prm.pupil / LAMBDA_MM * Math.PI / 180; // diffraction cutoff, cycles/deg
    const freq = [], mtf = [], limit = [];
    for (let f = 0; f <= 30; f += 1) {
      const nu = Math.min(1, f / fc), dl = 2 / Math.PI * (Math.acos(nu) - nu * Math.sqrt(1 - nu * nu));
      let sum = 0;
      for (let o = 0; o < 4; o++) {
        const ca = Math.cos(o * Math.PI / 4), sa = Math.sin(o * Math.PI / 4);
        let re = 0, im = 0;
        for (let i = 0; i < pts.length; i++) {
          const ph = 2 * Math.PI * f * DEG_PER_MRAD * (tx[i] * ca + ty[i] * sa);
          re += Math.cos(ph); im += Math.sin(ph);
        }
        sum += Math.hypot(re, im) / pts.length / 4;
      }
      freq.push(f); mtf.push(sum * dl); limit.push(dl);
    }
    const area = v => v.reduce((s, x, i) => s + (i === 0 || i === v.length - 1 ? 0.5 : 1) * x, 0);
    out.freq = freq; out.mtf = mtf; out.limit = limit; out.mtfArea = 100 * area(mtf) / area(limit);
  }
  return out;
}

/* One repair scenario. foot = null means untreated. */
function evaluate(cornea, foot, prm, tr, opt) {
  opt = opt || {};
  const g = cornea.g;
  let dS = new Float64Array(g.n * g.n), info = {};
  if (foot) { info = stiffnessChange(cornea, foot, prm, tr); dS = info.dS; }
  const S = new Float64Array(g.n * g.n);
  for (const k of g.ring) S[k] = cornea.sK[k] + dS[k];
  const sol = solveShell(g, S, cornea.tK, prm.E0, prm.iop, opt.guess || cornea.wK0, opt.tol);
  const front = new Float64Array(g.n * g.n);
  for (const k of g.ring) front[k] = cornea.zK[k] - cornea.wK0[k] + sol.w[k];
  const o = optics(cornea, front, cornea.tK, prm, opt.mtf !== false, opt.rays);
  return { foot, dS, front, w: sol.w, converged: sol.converged, optics: o, info };
}

function healthyReference(cornea, prm) {
  const g = cornea.g;
  const sol = solveShell(g, cornea.sH, cornea.tH, prm.E0, prm.iop, cornea.wH0);
  const front = new Float64Array(g.n * g.n);
  for (const k of g.ring) front[k] = cornea.zH[k] - cornea.wH0[k] + sol.w[k];
  return { front, w: sol.w, optics: optics(cornea, front, cornea.tH, prm, true) };
}

/* Pattern search for the Gaussian footprint with the lowest residual RMS wavefront. */
function optimise(cornea, prm, tr) {
  let guess = cornea.wK0, count = 0;
  const score = f => {
    const e = evaluate(cornea, f, prm, tr, { mtf: false, tol: 1e-5, guess, rays: 32 });
    guess = e.w; count++;
    // mode A: a footprint that cannot deliver the full budget under the cap is not a matched comparison
    const short = prm.mode === 'budget' && prm.budget > 0 ? Math.max(0, 0.995 - e.info.delivered) : 0;
    return e.optics.rms + 1000 * short;
  };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const starts = [{ x: prm.coneX, y: prm.coneY, sigma: prm.footSigma }];
  for (const dx of [-1.5, 0, 1.5]) for (const dy of [-1.5, 0, 1.5]) for (const s of [0.6, 1.2, 2.2])
    starts.push({ x: clamp(prm.coneX + dx, -3, 3), y: clamp(prm.coneY + dy, -3, 3), sigma: s });
  let best = null, bestScore = Infinity;
  for (const f of starts) { const v = score(f); if (v < bestScore) { bestScore = v; best = f; } }
  let step = 0.6;
  while (step > 0.07) {
    let moved = false;
    for (const [key, d] of [['x', 1], ['x', -1], ['y', 1], ['y', -1], ['sigma', 1], ['sigma', -1]]) {
      const f = Object.assign({}, best);
      f[key] = key === 'sigma' ? clamp(f[key] + d * step, 0.4, 3.5) : clamp(f[key] + d * step, -3.5, 3.5);
      const v = score(f);
      if (v < bestScore - 1e-6) { bestScore = v; best = f; moved = true; }
    }
    if (!moved) step /= 2;
  }
  return { foot: best, rms: bestScore, evaluations: count };
}

const api = { DEFAULTS, R_OPT, R_MECH, P_IMAGE, ARCMIN_PER_MRAD, buildCornea, solveShell, transport, evaluate, healthyReference, optimise, interp };
root.Sim = api;
if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
