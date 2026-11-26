'use strict';
const $ = id => document.getElementById(id);
const prm = Object.assign({}, Sim.DEFAULTS);

const GROUPS = [
  ['Cone shape and weakness', true, [
    ['bulge', 'Outward bulge (mm)', 0, 0.25, 0.005], ['loss', 'Thickness loss (mm)', 0, 0.22, 0.005],
    ['weak', 'Stiffness loss (fraction)', 0, 0.7, 0.01], ['coneX', 'Cone centre x (mm)', -2, 2, 0.1],
    ['coneY', 'Cone centre y (mm)', -2, 2, 0.1], ['coneSigma', 'Cone width σ (mm)', 0.4, 1.8, 0.05]]],
  ['Pressure, material, optics', false, [
    ['iop', 'Eye pressure (mmHg)', 8, 30, 1], ['E0', 'Reference modulus (MPa)', 0.1, 1.5, 0.05],
    ['pupil', 'Pupil diameter (mm)', 2, 6, 0.25]]],
  ['Repair pattern', true, [
    ['budget', 'Stiffness budget (uniform-equivalent)', 0, 0.8, 0.01, 'budget'],
    ['footSigma', 'Cone-centred footprint σ (mm)', 0.4, 2.5, 0.05],
    ['cap', 'Maximum local added factor', 0.2, 3, 0.1]]],
  ['Protein delivery (mode B)', false, [
    ['dose', 'Applied dose (relative)', 0.1, 5, 0.1, 'delivery'], ['permLog', 'Surface permeability, log10 cm/s', -8, -4, 0.1, 'delivery'],
    ['diff', 'Stromal diffusivity (µm²/s)', 1, 60, 1, 'delivery'], ['kon', 'Binding rate (1/h)', 0, 2, 0.05, 'delivery'],
    ['koff', 'Unbinding rate (1/h)', 0.005, 0.5, 0.005, 'delivery'], ['kcl', 'Loss of activity (1/h)', 0, 0.2, 0.005, 'delivery'],
    ['contact', 'Reservoir contact time (h)', 0.25, 12, 0.25, 'delivery'], ['resHalf', 'Reservoir half-life (h)', 0.5, 12, 0.5, 'delivery'],
    ['observe', 'Observation window (h)', 6, 72, 2, 'delivery'], ['placeErr', 'Placement error (mm)', 0, 1.5, 0.05, 'delivery'],
    ['emax', 'Assumed maximum added factor', 0, 2, 0.05, 'delivery'], ['u50', 'Exposure for half response', 0.02, 1, 0.01, 'delivery']]]
];
const SCEN = [
  { key: 'healthy', name: 'Healthy reference', color: 'var(--muted)', dash: '2 3' },
  { key: 'none', name: 'Untreated', color: 'var(--ink)', dash: '' },
  { key: 'uni', name: 'Uniform', color: 'var(--uni)', dash: '' },
  { key: 'cone', name: 'Cone-centred', color: 'var(--cone)', dash: '7 3' },
  { key: 'opt', name: 'Optimised', color: 'var(--opt)', dash: '3 2' }
];
let state = null, timer = null, job = 0;

function buildControls() {
  $('sliders').innerHTML = GROUPS.map(([title, open, items]) => `<details ${open ? 'open' : ''}><summary>${title}</summary>` +
    items.map(([k, label, lo, hi, st]) => `<label for="s_${k}">${label}<output id="o_${k}"></output></label><input type="range" id="s_${k}" min="${lo}" max="${hi}" step="${st}">`).join('') + '</details>').join('');
  for (const [, , items] of GROUPS) for (const [k] of items) $('s_' + k).addEventListener('input', e => { prm[k] = +e.target.value; syncControls(); schedule(); });
  for (const k of ['mode', 'correction']) $(k).addEventListener('change', e => { prm[k] = e.target.value; syncControls(); schedule(); });
  $('reset').onclick = () => { Object.assign(prm, Sim.DEFAULTS); syncControls(); schedule(); };
  $('mild').onclick = () => { Object.assign(prm, Sim.DEFAULTS, { bulge: 0.025, loss: 0.03, weak: 0.15, budget: 0.04 }); syncControls(); schedule(); };
  $('uncert').onclick = runUncertainty;
  $('csv').onclick = downloadCsv;
}
function syncControls() {
  for (const [, , items] of GROUPS) for (const [k, , , , , only] of items) {
    $('s_' + k).value = prm[k]; $('o_' + k).textContent = prm[k];
    $('s_' + k).disabled = !!only && only !== prm.mode;
  }
  $('mode').value = prm.mode; $('correction').value = prm.correction;
}
function schedule() {
  job++; clearTimeout(timer); $('status').textContent = 'Updating…';
  $('uncert').disabled = $('csv').disabled = true;
  timer = setTimeout(run, 250);
}

function run() {
  const mine = job, p = Object.assign({}, prm);
  const cornea = Sim.buildCornea(p), tr = Sim.transport(p);
  const res = {
    healthy: Sim.healthyReference(cornea, p),
    none: Sim.evaluate(cornea, null, p, tr),
    uni: Sim.evaluate(cornea, { uniform: true }, p, tr),
    cone: Sim.evaluate(cornea, { x: p.coneX, y: p.coneY, sigma: p.footSigma }, p, tr)
  };
  state = { p, cornea, tr, res };
  $('status').textContent = 'Searching for the optimised footprint…';
  render();
  setTimeout(() => {
    if (mine !== job) return;
    const best = Sim.optimise(cornea, p, tr);
    res.opt = Sim.evaluate(cornea, best.foot, p, tr);
    state.best = best; render();
    const ok = Object.values(res).every(r => r.converged !== false);
    $('status').textContent = ok ? 'Up to date.' : 'Warning: a mechanics solve did not converge.';
    $('uncert').disabled = $('csv').disabled = false;
  }, 30);
}

const shown = () => SCEN.filter(s => state.res[s.key]);
const fmt = (v, d) => Number.isFinite(v) ? v.toFixed(d) : '–';
function maxHeight(r) {
  const c = state.cornea, g = c.g; let m = 0;
  for (const k of g.active) if (Math.hypot(g.x[k], g.y[k]) <= Sim.R_OPT) m = Math.max(m, (r.front[k] - c.zH[k]) * 1000);
  return m;
}
function rows() {
  return shown().map(s => {
    const r = state.res[s.key], o = r.optics;
    return { s, rms: o.rms, mtf: o.mtfArea, spot: o.spot, bulge: maxHeight(r),
      peak: r.dS ? Math.max(...r.dS) : 0, on: r.info && r.info.onTarget, used: r.info && r.info.delivered };
  });
}

function render() {
  const delivery = state.p.mode === 'delivery', data = rows();
  $('results').innerHTML = `<tr><th>Scenario</th><th>Higher-order RMS error (µm)</th><th>MTF area, 0–30 c/deg (% of limit)</th><th>Spot radius (arcmin)</th><th>Max outward difference (µm)</th><th>Peak added factor</th>${delivery ? '<th>Exposure on target (%)</th>' : '<th>Budget delivered (%)</th>'}</tr>` +
    data.map(d => `<tr><td><span class="key" style="background:${d.s.color}"></span>${d.s.name}</td><td>${fmt(d.rms, 2)}</td><td>${fmt(d.mtf, 1)}</td><td>${fmt(d.spot, 1)}</td><td>${fmt(d.bulge, 0)}</td><td>${d.s.key === 'healthy' || d.s.key === 'none' ? '–' : fmt(d.peak, 2)}</td><td>${d.on !== undefined ? fmt(100 * d.on, 0) : d.used !== undefined ? fmt(100 * d.used, 0) : '–'}</td></tr>`).join('');
  const b = state.res.opt && state.best.foot;
  $('optNote').textContent = (delivery ? 'Mode B: every pattern applies the same total protein. ' : 'Mode A: every pattern has the same thickness-weighted added stiffness, unless the local maximum limits it. ') +
    (b ? `Optimised footprint (lowest RMS error): x ${fmt(b.x, 2)} mm, y ${fmt(b.y, 2)} mm, σ ${fmt(b.sigma, 2)} mm.` : 'Optimising…') +
    ' The healthy reference is error-free by definition at 15 mmHg.' +
    (!delivery && state.p.budget > 0 && data.some(d => d.used !== undefined && d.used < 0.995) ? ' Warning: the local maximum stops at least one pattern from using the full budget, so that comparison is not matched. Lower the budget or raise the maximum.' : '');
  $('uncertTable').innerHTML = '';
  drawEye(); drawMaps(); drawBlur(); drawCharts();
}

/* ---------- 3D eye ---------- */
let eye = null, eyeScenario = 'none';
const VIEWS = { front: [0, 0, 1.7, false], angle: [0.5, 0.12, 1, false], side: [-1.5708, 0, 1.9, false], section: [-1.5708, 0, 1.9, true] };
function setView(name) {
  const [yaw, pitch, zoom, cut] = VIEWS[name];
  Object.assign(eye.view, { yaw, pitch, zoom, cut });
  for (const b of document.querySelectorAll('[data-view]')) b.setAttribute('aria-pressed', b.dataset.view === name);
  drawEye();
}
function initEye() {
  try { eye = Eye3D.create($('eye')); } catch (e) { console.error(e); }
  if (!eye) { $('eyeCard').innerHTML = '<h2>3D human eye</h2><p class="sub">This browser could not start 3D graphics (WebGL). The rest of the simulator still works.</p>'; return; }
  $('eyeScen').innerHTML = SCEN.map(s => `<button data-scen="${s.key}"><span class="key" style="background:${s.color}"></span>${s.name}</button>`).join('');
  $('eyeScen').onclick = e => { const b = e.target.closest('[data-scen]'); if (b) { eyeScenario = b.dataset.scen; drawEye(); } };
  for (const b of document.querySelectorAll('[data-view]')) b.onclick = () => setView(b.dataset.view);
  $('eyeHeat').onchange = e => { eye.view.heat = e.target.checked; drawEye(); };
  $('eyeRings').onchange = e => { eye.view.rings = e.target.checked; drawEye(); };
  $('eyeMag').oninput = drawEye;
  setView('angle');
}
function drawEye() {
  if (!eye) return;
  const magnify = +$('eyeMag').value; $('eyeMagOut').textContent = magnify + '×' + (magnify === 1 ? ' (true shape)' : '');
  if (!state) return;
  const { cornea: c, p, res } = state;
  const key = res[eyeScenario] ? eyeScenario : 'none', s = SCEN.find(q => q.key === key);
  for (const b of $('eyeScen').children) { b.disabled = !res[b.dataset.scen]; b.setAttribute('aria-pressed', b.dataset.scen === key); }
  let devMax = 20;
  for (const k of c.g.active) devMax = Math.max(devMax, Math.abs(res.none.front[k] - c.zH[k]) * 1000);
  eye.update({ g: c.g, front: res[key].front, thick: key === 'healthy' ? c.tH : c.tK, zH: c.zH, magnify, pupil: p.pupil, cutX: Math.max(-3, Math.min(3, p.coneX)), devMax });
  $('eyeLabel').textContent = `${s.name}\nShape difference shown at ${magnify}×`;
  $('eyeNote').textContent = (eye.view.cut ? 'Cut through the cone centre. Blue lines: front and back of the cornea. Dashed yellow: healthy front surface. ' : '') +
    (eye.view.heat ? `Red is further out than healthy, blue further in; full colour at ${devMax.toFixed(0)} µm. ` : '') +
    (eye.view.rings ? 'Rings are a visual aid like a Placido disc, computed from the magnified surface; they are not a topography measurement. ' : '') +
    'Globe, iris and lens are generic anatomy.';
}

/* ---------- maps ---------- */
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const dark = () => matchMedia('(prefers-color-scheme: dark)').matches;
function ramp(stops, t) {
  const z = Math.max(0, Math.min(1, t)) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(z));
  return mix(hex(stops[i]), hex(stops[i + 1]), z - i);
}
const divStops = () => ['#104281', '#3987e5', dark() ? '#383835' : '#f0efec', '#e34948', '#7f1d1d'];
const seqStops = () => dark() ? ['#262625', '#184f95', '#3987e5', '#9ec5f4'] : ['#f0efec', '#9ec5f4', '#2a78d6', '#0d366b'];

function mapFigure(host, name, value, stops, lo, hi, marks, unit, digits) {
  const N = 200, fig = document.createElement('figure');
  fig.innerHTML = `<figcaption>${name}</figcaption>`;
  const cv = document.createElement('canvas'); cv.width = cv.height = N; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', name);
  const ctx = cv.getContext('2d'), img = ctx.createImageData(N, N), W = 2 * Sim.R_OPT;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = ((i + 0.5) / N - 0.5) * W, y = (0.5 - (j + 0.5) / N) * W;
    if (Math.hypot(x, y) > Sim.R_OPT) continue;
    img.data.set([...ramp(stops, (value(x, y) - lo) / (hi - lo)), 255], 4 * (j * N + i));
  }
  ctx.putImageData(img, 0, 0);
  const px = x => (x / W + 0.5) * N, py = y => (0.5 - y / W) * N;
  ctx.strokeStyle = getComputedStyle(document.body).color; ctx.lineWidth = 1.2;
  if (marks.cone) { ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(px(marks.cone.x), py(marks.cone.y), marks.cone.r / W * N, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  if (marks.cross) { const a = px(marks.cross.x), c = py(marks.cross.y); ctx.beginPath(); ctx.moveTo(a - 6, c); ctx.lineTo(a + 6, c); ctx.moveTo(a, c - 6); ctx.lineTo(a, c + 6); ctx.stroke(); }
  cv.onmousemove = e => {
    const r = cv.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width - 0.5) * W, y = (0.5 - (e.clientY - r.top) / r.height) * W;
    if (Math.hypot(x, y) > Sim.R_OPT) return hideTip();
    showTip(e, `${name}<br>x ${x.toFixed(1)}, y ${y.toFixed(1)} mm<br><strong>${value(x, y).toFixed(digits)} ${unit}</strong>`);
  };
  cv.onmouseleave = hideTip;
  fig.appendChild(cv); host.appendChild(fig);
}
function scaleBar(el, stops, lo, hi) { el.innerHTML = `<span>${lo}</span><span class="bar" style="background:linear-gradient(90deg,${stops.join(',')})"></span><span>${hi}</span>`; }

function drawMaps() {
  const { cornea: c, p } = state, g = c.g;
  const cone = { x: p.coneX, y: p.coneY, r: p.coneSigma * Math.sqrt(2 * Math.LN2) };
  const diffs = shown().filter(s => s.key !== 'healthy').map(s => {
    const f = new Float64Array(g.n * g.n);
    for (const k of g.ring) f[k] = (state.res[s.key].front[k] - c.zH[k]) * 1000;
    return { s, f };
  });
  let peak = 20;
  for (const d of diffs) for (const k of g.active) if (Math.hypot(g.x[k], g.y[k]) <= Sim.R_OPT) peak = Math.max(peak, Math.abs(d.f[k]));
  const lim = Math.ceil(peak / 10) * 10;
  $('heightMaps').innerHTML = '';
  for (const d of diffs) mapFigure($('heightMaps'), d.s.name, (x, y) => Sim.interp(g, d.f, x, y), divStops(), -lim, lim, { cone }, 'µm', 0);
  scaleBar($('heightScale'), divStops(), -lim + ' µm', '+' + lim + ' µm');
  const treated = shown().filter(s => ['uni', 'cone', 'opt'].includes(s.key));
  let hi = 0.1; for (const s of treated) for (const v of state.res[s.key].dS) hi = Math.max(hi, v);
  hi = Math.ceil(hi * 10) / 10;
  $('stiffMaps').innerHTML = '';
  for (const s of treated) {
    const r = state.res[s.key];
    mapFigure($('stiffMaps'), s.name, (x, y) => Sim.interp(g, r.dS, x, y), seqStops(), 0, hi, { cone, cross: r.foot.uniform ? null : r.foot }, '', 2);
  }
  scaleBar($('stiffScale'), seqStops(), '0', hi.toFixed(1));
}

/* ---------- blurred letter ---------- */
function drawBlur() {
  const N = 160, FIELD = 120, LETTER = 50, perPx = FIELD / N, u = LETTER / 5;
  const isInk = (x, y) => { const a = x + LETTER / 2, b = y + LETTER / 2; if (a < 0 || b < 0 || a >= LETTER || b >= LETTER) return 0; return a < u || Math.floor(b / u) % 2 === 0 ? 1 : 0; };
  const src = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    let s = 0; for (const di of [0.25, 0.75]) for (const dj of [0.25, 0.75]) s += isInk((i + di - N / 2) * perPx, (j + dj - N / 2) * perPx);
    src[j * N + i] = s / 4;
  }
  $('blur').innerHTML = '';
  for (const s of shown()) {
    const o = state.res[s.key].optics, psf = new Map(), step = Math.max(1, Math.floor(o.tx.length / 900));
    let n = 0;
    for (let k = 0; k < o.tx.length; k += step, n++) {
      const dx = Math.round(o.tx[k] * Sim.ARCMIN_PER_MRAD / perPx), dy = Math.round(-o.ty[k] * Sim.ARCMIN_PER_MRAD / perPx), key = dx + ',' + dy;
      psf.set(key, (psf.get(key) || 0) + 1);
    }
    const out = new Float32Array(N * N);
    for (const [key, count] of psf) {
      const [dx, dy] = key.split(',').map(Number), w = count / n;
      for (let j = Math.max(0, dy); j < Math.min(N, N + dy); j++) for (let i = Math.max(0, dx); i < Math.min(N, N + dx); i++) out[j * N + i] += w * src[(j - dy) * N + i - dx];
    }
    const fig = document.createElement('figure'); fig.innerHTML = `<figcaption>${s.name}</figcaption>`;
    const cv = document.createElement('canvas'); cv.width = cv.height = N; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Blurred letter E, ' + s.name);
    const ctx = cv.getContext('2d'), img = ctx.createImageData(N, N);
    for (let k = 0; k < N * N; k++) { const v = Math.round(255 * (1 - Math.min(1, out[k]))); img.data.set([v, v, v, 255], 4 * k); }
    ctx.putImageData(img, 0, 0); fig.appendChild(cv); $('blur').appendChild(fig);
  }
  $('blurNote').textContent = `Letter E, ${LETTER} arcmin tall (about 20/200), from the same rays as the MTF. Geometric blur only: no scatter, diffraction or neural processing. It is not a measure of visual acuity.`;
}

/* ---------- charts ---------- */
const tip = () => $('tip');
function showTip(e, html) { const t = tip(); t.innerHTML = html; t.style.display = 'block'; t.style.left = Math.min(e.clientX + 14, innerWidth - t.offsetWidth - 6) + 'px'; t.style.top = e.clientY + 14 + 'px'; }
function hideTip() { tip().style.display = 'none'; }
function niceTicks(lo, hi) {
  const raw = (hi - lo) / 5, mag = Math.pow(10, Math.floor(Math.log10(raw))), step = [1, 2, 5, 10].map(m => m * mag).find(s => s >= raw);
  const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-6; v += step) out.push(+v.toPrecision(10)); return out;
}
function lineChart(el, x, series, xlabel, ylabel) {
  const W = 480, H = 260, L = 52, Rr = 12, T = 8, B = 38;
  const all = series.flatMap(s => s.y), x0 = x[0], x1 = x[x.length - 1];
  let lo = Math.min(0, ...all), hi = Math.max(...all); if (hi - lo < 1e-9) hi = lo + 1; hi += (hi - lo) * 0.05;
  const sx = v => L + (v - x0) / (x1 - x0) * (W - L - Rr), sy = v => T + (hi - v) / (hi - lo) * (H - T - B);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${ylabel} against ${xlabel}">`;
  for (const t of niceTicks(lo, hi)) s += `<line x1="${L}" x2="${W - Rr}" y1="${sy(t)}" y2="${sy(t)}" stroke="var(--grid)"/><text x="${L - 6}" y="${sy(t) + 4}" text-anchor="end">${t}</text>`;
  for (const t of niceTicks(x0, x1)) s += `<text x="${sx(t)}" y="${H - B + 16}" text-anchor="middle">${t}</text>`;
  s += `<line x1="${L}" x2="${W - Rr}" y1="${H - B}" y2="${H - B}" stroke="var(--axis)"/><text x="${(L + W) / 2}" y="${H - 6}" text-anchor="middle">${xlabel}</text><text transform="translate(12 ${(H - B) / 2}) rotate(-90)" text-anchor="middle">${ylabel}</text>`;
  for (const q of series) s += `<polyline fill="none" stroke="${q.color}" stroke-width="2" stroke-dasharray="${q.dash || ''}" points="${q.y.map((v, i) => sx(x[i]) + ',' + sy(v)).join(' ')}"/>`;
  s += `<line class="cross" y1="${T}" y2="${H - B}" stroke="var(--axis)" visibility="hidden"/></svg>`;
  el.innerHTML = (series.length > 1 ? '<div class="legend">' + series.map(q => `<span><svg width="22" height="6" style="display:inline;width:22px;vertical-align:middle"><line x1="0" x2="22" y1="3" y2="3" stroke="${q.color}" stroke-width="2" stroke-dasharray="${q.dash || ''}"/></svg> ${q.name}</span>`).join('') + '</div>' : '') + s;
  const svg = el.querySelector('svg[viewBox]'), cross = svg.querySelector('.cross');
  svg.onmousemove = e => {
    const r = svg.getBoundingClientRect(), v = x0 + ((e.clientX - r.left) / r.width * W - L) / (W - L - Rr) * (x1 - x0);
    let i = 0; for (let k = 1; k < x.length; k++) if (Math.abs(x[k] - v) < Math.abs(x[i] - v)) i = k;
    cross.setAttribute('x1', sx(x[i])); cross.setAttribute('x2', sx(x[i])); cross.setAttribute('visibility', 'visible');
    showTip(e, `${xlabel}: ${+x[i].toFixed(2)}<br>` + series.map(q => `${q.name}: <strong>${+q.y[i].toPrecision(3)}</strong>`).join('<br>'));
  };
  svg.onmouseleave = () => { hideTip(); cross.setAttribute('visibility', 'hidden'); };
}
function drawCharts() {
  const { cornea: c, p, res, tr } = state, h = res.healthy.optics;
  lineChart($('mtfChart'), h.freq, shown().map(s => ({ name: s.name, color: s.color, dash: s.dash, y: res[s.key].optics.mtf })), 'Spatial frequency (cycles/degree)', 'Contrast transfer');
  const xs = []; for (let x = -4; x <= 4.001; x += 0.1) xs.push(+x.toFixed(2));
  const yc = Math.max(-3.9, Math.min(3.9, p.coneY)), xin = xs.filter(x => Math.hypot(x, yc) <= 4);
  lineChart($('secChart'), xin, shown().filter(s => s.key !== 'healthy').map(s => {
    const f = res[s.key].front;
    return { name: s.name, color: s.color, dash: s.dash, y: xin.map(x => (Sim.interp(c.g, f, x, yc) - Sim.interp(c.g, c.zH, x, yc)) * 1000) };
  }), 'x (mm)', 'Height difference (µm)');
  lineChart($('timeChart'), tr.times, [{ name: 'Retained protein', color: 'var(--uni)', y: tr.series }], 'Time (h)', 'Relative amount');
  lineChart($('depthChart'), tr.depth, [{ name: 'Free + bound', color: 'var(--uni)', y: tr.total }, { name: 'Bound', color: 'var(--cone)', dash: '7 3', y: tr.bound }], 'Depth (µm)', 'Relative concentration');
}

/* ---------- uncertainty and export ---------- */
function rng(seed) { return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function runUncertainty() {
  const mine = job, base = state.p, foot = state.best.foot, rand = rng(20261126), SAMPLES = 60;
  const keys = ['none', 'uni', 'cone', 'opt'], acc = Object.fromEntries(keys.map(k => [k, { rms: [], gain: [] }]));
  $('uncert').disabled = true;
  let i = 0;
  const range = (lo, hi) => lo + (hi - lo) * rand();
  (function step() {
    if (mine !== job) return;
    const p = Object.assign({}, base);
    p.E0 *= range(0.6, 1.4); p.weak = Math.min(0.75, p.weak * range(0.7, 1.3));
    if (p.mode === 'budget') p.budget *= range(0.5, 1.5);
    else {
      p.emax *= range(0.25, 1.5); p.u50 *= Math.pow(10, range(-0.3, 0.3)); p.diff *= range(0.5, 1.5);
      p.permLog += range(-0.5, 0.5); p.kon *= range(0.5, 1.5); p.kcl *= range(0.5, 1.5);
    }
    const dx = range(-1, 1) * p.placeErr, dy = range(-1, 1) * p.placeErr;
    const c = Sim.buildCornea(p), tr = Sim.transport(p);
    const feet = { none: null, uni: { uniform: true }, cone: { x: p.coneX + dx, y: p.coneY + dy, sigma: p.footSigma }, opt: { x: foot.x + dx, y: foot.y + dy, sigma: foot.sigma } };
    // placement is sampled explicitly here, so remove the expected-blur term
    p.placeErr = 0;
    let untreated = 0;
    for (const k of keys) {
      const r = Sim.evaluate(c, feet[k], p, tr, { mtf: false, tol: 1e-6 }).optics.rms;
      if (k === 'none') untreated = r;
      acc[k].rms.push(r); acc[k].gain.push(100 * (untreated - r) / (untreated || 1));
    }
    $('status').textContent = `Uncertainty sample ${++i} of ${SAMPLES}…`;
    if (i < SAMPLES) return setTimeout(step, 0);
    const q = (a, f) => { const s = [...a].sort((x, y) => x - y), z = f * (s.length - 1), l = Math.floor(z); return s[l] + (s[Math.ceil(z)] - s[l]) * (z - l); };
    const span = a => `${q(a, 0.5).toFixed(1)} (${q(a, 0.05).toFixed(1)} to ${q(a, 0.95).toFixed(1)})`;
    $('uncertTable').innerHTML = '<tr><th>Median (5th to 95th percentile)</th><th>RMS error (µm)</th><th>Reduction vs untreated (%)</th><th>Samples improved</th></tr>' +
      SCEN.filter(s => keys.includes(s.key)).map(s => `<tr><td>${s.name}</td><td>${span(acc[s.key].rms)}</td><td>${s.key === 'none' ? '–' : span(acc[s.key].gain)}</td><td>${s.key === 'none' ? '–' : acc[s.key].gain.filter(v => v > 0).length + ' / ' + SAMPLES}</td></tr>`).join('');
    $('status').textContent = 'Uncertainty run complete (assumed ranges, fixed random seed).';
    $('uncert').disabled = false;
  })();
}
function downloadCsv() {
  const lines = ['Illustrative simulation: assumed parameters; not patient data or evidence of efficacy',
    'scenario,rms_um,mtf_area_percent,spot_arcmin,max_outward_um,peak_added_factor'];
  for (const d of rows()) lines.push([d.s.name, d.rms, d.mtf, d.spot, d.bulge, d.peak].join(','));
  lines.push('', 'parameter,value');
  for (const [k, v] of Object.entries(state.p)) lines.push(k + ',' + v);
  const f = state.best.foot; lines.push(`optimised_x,${f.x}`, `optimised_y,${f.y}`, `optimised_sigma,${f.sigma}`);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  a.download = 'keratoconus_simulation_results.csv'; a.click(); URL.revokeObjectURL(a.href);
}

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => state && render());
buildControls(); syncControls(); initEye(); schedule();
