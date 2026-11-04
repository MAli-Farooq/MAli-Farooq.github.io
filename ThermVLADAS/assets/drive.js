/* ThermVLADAS drive simulation. Illustrative only: the road scene is procedural and the
   detector / VLM behaviour is emulated from measured properties (conf >= 0.40, no pole class in
   the detector, recall falls for small and low-contrast objects, VLM is the slow path).
   Intensities are relative 8-bit values, never temperatures. No dependencies. */
(function () {
  "use strict";
  const cv = document.getElementById("driveCanvas");
  if (!cv || !cv.getContext) return;
  const ctx = cv.getContext("2d");
  const $ = (s) => document.querySelector(s);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ------------------------------------------------------------ colour maps (intensity -> colour) */
  function lut(stops) {
    const out = [];
    for (let i = 0; i < 256; i++) {
      const t = (i / 255) * (stops.length - 1), k = Math.min(stops.length - 2, Math.floor(t)), f = t - k;
      out.push("rgb(" + stops[k].map((v, j) => Math.round(v + (stops[k + 1][j] - v) * f)).join(",") + ")");
    }
    return out;
  }
  const PAL = {
    inferno: lut([[0, 0, 4], [40, 11, 84], [101, 21, 110], [159, 42, 99], [212, 72, 66], [245, 125, 21], [250, 193, 39], [252, 255, 164]]),
    white: lut([[0, 0, 0], [255, 255, 255]]),
  };
  const CLS = {
    person: { color: "#1baf7a", label: "person" },
    car: { color: "#eb6834", label: "car" },
    pole: { color: "#3987e5", label: "pole" },
  };

  /* ------------------------------------------------------------ conditions */
  const COND = {
    night: { label: "night, clear", sky: 8, ground: 20, road: 50, line: 84, fog: 0, fogI: 0, range: 75, person: 218, car: 92, hot: 236, pole: 52, lamp: 175, tree: 36 },
    fog: { label: "night, fog", sky: 74, ground: 64, road: 70, line: 82, fog: 0.03, fogI: 78, range: 42, person: 205, car: 96, hot: 228, pole: 60, lamp: 150, tree: 50 },
    rain: { label: "night, rain", sky: 20, ground: 42, road: 54, line: 66, fog: 0.012, fogI: 48, range: 55, person: 182, car: 88, hot: 214, pole: 50, lamp: 140, tree: 40, rain: true },
    day: { label: "day", sky: 58, ground: 118, road: 152, line: 128, fog: 0, fogI: 0, range: 80, person: 190, car: 140, hot: 232, pole: 150, lamp: 150, tree: 92 },
  };
  const FINDER = { yolo: "YOLO detector", ens: "Ensemble: YOLO + VLM grounding" };

  /* ------------------------------------------------------------ state */
  const S = {
    run: !reduce, cond: "night", pal: "inferno", finder: "yolo", boxes: true, kmh: 50,
    camX: 1.75, steerIn: 0, steerVis: 0, dist: 0, t: 0, objs: [], nextId: 1, sel: null,
    spawn: { pole: 0, tree: 0, person: 8, onc: 30, lead: 0 },
    spark: [], sparkT: 0, hudT: 0,
    vlm: { phase: "idle", t0: 0, next: 1.5, text: "", shown: 0, seen: new Set(), pending: null },
    log: [], visible: true,
  };
  const C = () => COND[S.cond];
  const VLM_GEN = 6.0, VLM_GAP = 3.0; // simulated seconds (x4 compressed against ~25 s measured)

  /* ------------------------------------------------------------ world */
  function addObj(o) { o.id = S.nextId++; o.j = rnd(-1, 1); o.phase = rnd(0, 6.28); o.cs = 0; S.objs.push(o); return o; }
  function spawn(dt, v) {
    const ds = v * dt, sp = S.spawn;
    sp.pole -= ds; sp.tree -= ds; sp.person -= ds; sp.onc -= ds;
    if (sp.pole <= 0) { sp.pole = 32; sp.side = -(sp.side || 1); addObj({ cls: "pole", x: 5.7 * sp.side, z: 150, vx: 0, vz: 0, w: 0.28, h: 7.5 }); }
    if (sp.tree <= 0) { sp.tree = rnd(6, 14); addObj({ cls: "tree", x: (Math.random() < 0.5 ? -1 : 1) * rnd(7.5, 13), z: 150, vx: 0, vz: 0, w: rnd(2.5, 4), h: rnd(5, 9) }); }
    if (sp.person <= 0) {
      sp.person = rnd(14, 34);
      const side = Math.random() < 0.6 ? 1 : -1, cross = Math.random() < 0.3;
      addObj({ cls: "person", x: side * rnd(4.3, 5.2), z: 125, vx: cross ? -side * rnd(1.1, 1.5) : 0, vz: cross ? 0 : rnd(-1.4, 1.4), w: 0.55, h: rnd(1.6, 1.85), cross, waitZ: cross ? rnd(28, 55) : 0 });
    }
    if (sp.onc <= 0) { sp.onc = rnd(45, 110); addObj({ cls: "car", x: -1.75, z: 150, vx: 0, vz: -rnd(10, 15), w: 1.85, h: 1.5, onc: true }); }
    sp.lead -= dt;
    if (sp.lead <= 0 && !S.objs.some((o) => o.lead)) { sp.lead = rnd(6, 16); addObj({ cls: "car", x: 1.75, z: 140, vx: 0, vz: v * 0.7, w: 1.85, h: 1.5, lead: true, gap: rnd(24, 45), life: rnd(14, 30) }); }
  }
  function step(dt) {
    const v = S.kmh / 3.6;
    S.t += dt; S.dist += v * dt;
    // steering: hold to steer, gentle lane keeping back to the right lane on release
    S.camX = clamp(S.camX + S.steerIn * 2.4 * dt, -2.6, 2.6);
    if (!S.steerIn) S.camX += (1.75 - S.camX) * Math.min(1, dt * 0.35);
    S.steerVis += (S.steerIn * 70 - S.steerVis) * Math.min(1, dt * 8);
    spawn(dt, v);
    for (const o of S.objs) {
      if (o.lead) {
        o.life -= dt;
        o.vz = o.life > 0 ? v + clamp((o.gap - o.z) * 0.25, -6, 6) : v + 7;
      }
      if (o.cross && o.z < o.waitZ) o.x += o.vx * dt; // start crossing when the car approaches
      if (o.cls === "person" && o.cross && Math.abs(o.x) > 5.4 && o.z < o.waitZ - 5) o.vx = 0;
      o.z += (o.vz - v) * dt;
      o.phase += dt * (o.cls === "person" ? 6 : 0);
    }
    S.objs = S.objs.filter((o) => o.z > 1.6 && o.z < 165);
    if (S.sel && !S.objs.includes(S.sel)) S.sel = null;
  }

  /* ------------------------------------------------------------ projection + rendering */
  let W = 960, H = 540, DPR = 1, f = 500, hor = 220;
  const camH = 1.3;
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth || 960; H = Math.round(W * 9 / 16);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    f = H * 0.95; hor = H * 0.40;
  }
  const P = (x, z) => [W / 2 + (x - S.camX) * f / z, hor + camH * f / z, f / z];
  function obsI(I, z) { const c = C(); if (!c.fog) return I; const e = Math.exp(-c.fog * z); return I * e + c.fogI * (1 - e); }
  const col = (I) => PAL[S.pal][clamp(Math.round(I), 0, 255)];

  let noise = null;
  function makeNoise() {
    noise = document.createElement("canvas"); noise.width = noise.height = 128;
    const n = noise.getContext("2d"), img = n.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) { const g = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = g; img.data[i + 3] = 255; }
    n.putImageData(img, 0, 0);
  }

  function quad(xa, xb, z0, z1, I) {
    const a = P(xa, z0), b = P(xb, z0), c = P(xb, z1), d = P(xa, z1);
    ctx.fillStyle = col(obsI(I, (z0 + z1) / 2));
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.fill();
  }
  function drawGround() {
    const c = C();
    const sky = ctx.createLinearGradient(0, 0, 0, hor);
    sky.addColorStop(0, col(c.sky * 0.7)); sky.addColorStop(1, col(c.fog ? c.fogI : c.sky + 6));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hor + 1);
    ctx.fillStyle = col(obsI(c.ground, 150)); ctx.fillRect(0, hor, W, H - hor);
    // ground and road in depth slices so fog attenuates with distance
    const zs = [150, 90, 60, 40, 28, 20, 14, 10, 7, 5, 3.5, 2.4, 1.6];
    for (let i = 0; i < zs.length - 1; i++) {
      const z0 = zs[i], z1 = zs[i + 1];
      quad(-60, 60, z0, z1, c.ground);
      quad(-6.2, 6.2, z0, z1, c.ground + 10); // sidewalks
      quad(-3.6, 3.6, z0, z1, c.road);
      quad(-3.6, -3.45, z0, z1, c.line); quad(3.45, 3.6, z0, z1, c.line);
    }
    const off = S.dist % 9;
    for (let k = 0; k < 17; k++) { const z0 = 2 + k * 9 - off; if (z0 + 3 > 1.7 && z0 < 150) quad(-0.07, 0.07, Math.max(1.7, z0 + 3), Math.max(1.7, z0), c.line); }
  }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function drawObj(o) {
    const c = C(), [sx, sy, s] = P(o.x, o.z), w = o.w * s, h = o.h * s;
    if (sx + w < -50 || sx - w > W + 50) return null;
    let I;
    if (o.cls === "tree") {
      I = obsI(c.tree + o.j * 6, o.z);
      ctx.fillStyle = col(I); ctx.fillRect(sx - w * 0.06, sy - h * 0.45, w * 0.12, h * 0.45);
      ctx.beginPath(); ctx.ellipse(sx, sy - h * 0.62, w / 2, h * 0.38, 0, 0, 6.29); ctx.fill();
      return null;
    }
    if (o.cls === "pole") {
      I = obsI(c.pole + o.j * 5, o.z);
      ctx.fillStyle = col(I); ctx.fillRect(sx - w / 2, sy - h, w, h);
      const arm = (o.x > 0 ? -1 : 1) * 1.4 * s;
      ctx.fillRect(Math.min(sx, sx + arm), sy - h, Math.abs(arm), w * 0.6);
      ctx.fillStyle = col(obsI(c.lamp, o.z)); ctx.fillRect(sx + arm - w * 0.6, sy - h, w * 1.2, w * 0.9);
      return { o, x0: sx - w * 0.8, y0: sy - h - w * 0.2, x1: sx + w * 0.8, y1: sy, I: c.pole + o.j * 5, Imax: c.lamp, s };
    }
    if (o.cls === "person") {
      I = obsI(c.person + o.j * 8, o.z);
      const sw = Math.sin(o.phase) * (o.vx || o.vz ? 0.35 : 0.05) * w;
      ctx.strokeStyle = col(I); ctx.lineCap = "round"; ctx.lineWidth = Math.max(1, w * 0.28);
      ctx.beginPath(); ctx.moveTo(sx, sy - h * 0.47); ctx.lineTo(sx - sw, sy); ctx.moveTo(sx, sy - h * 0.47); ctx.lineTo(sx + sw, sy); ctx.stroke();
      ctx.fillStyle = col(I); rr(sx - w * 0.32, sy - h * 0.82, w * 0.64, h * 0.4, w * 0.2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(sx - w * 0.3, sy - h * 0.78); ctx.lineTo(sx - w * 0.45 - sw * 0.5, sy - h * 0.5);
      ctx.moveTo(sx + w * 0.3, sy - h * 0.78); ctx.lineTo(sx + w * 0.45 + sw * 0.5, sy - h * 0.5); ctx.lineWidth = Math.max(1, w * 0.18); ctx.stroke();
      ctx.fillStyle = col(obsI(c.person + 16 + o.j * 6, o.z)); ctx.beginPath(); ctx.arc(sx, sy - h * 0.9, w * 0.2, 0, 6.29); ctx.fill();
      return { o, x0: sx - w * 0.55, y0: sy - h * 1.02, x1: sx + w * 0.55, y1: sy + 1, I: c.person + o.j * 8, Imax: c.person + 18 + o.j * 6, s };
    }
    // car (rear view for the lead car, front view for oncoming traffic)
    I = obsI(c.car + o.j * 8, o.z);
    ctx.fillStyle = col(I); rr(sx - w / 2, sy - h * 0.62, w, h * 0.55, w * 0.06); ctx.fill();
    rr(sx - w * 0.36, sy - h, w * 0.72, h * 0.42, w * 0.08); ctx.fill();
    ctx.fillStyle = col(obsI(c.car - 22, o.z)); rr(sx - w * 0.3, sy - h * 0.93, w * 0.6, h * 0.28, w * 0.04); ctx.fill();
    const hot = col(obsI(c.hot + o.j * 6, o.z));
    ctx.fillStyle = col(obsI(c.hot - 30, o.z));
    ctx.fillRect(sx - w * 0.47, sy - h * 0.12, w * 0.2, h * 0.14); ctx.fillRect(sx + w * 0.27, sy - h * 0.12, w * 0.2, h * 0.14); // tyres
    ctx.fillStyle = hot;
    if (o.onc) ctx.fillRect(sx - w * 0.3, sy - h * 0.5, w * 0.6, h * 0.12); // engine / grille
    else ctx.fillRect(sx + w * 0.22, sy - h * 0.16, w * 0.1, h * 0.07);    // exhaust
    return { o, x0: sx - w * 0.52, y0: sy - h * 1.02, x1: sx + w * 0.52, y1: sy + 2, I: c.car + o.j * 8, Imax: c.hot + o.j * 6, s };
  }
  function drawRain() {
    ctx.strokeStyle = "rgba(200,200,220,.18)"; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < 120; i++) { const x = Math.random() * W, y = Math.random() * H; ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 14); }
    ctx.stroke();
  }
  function drawHood() {
    const c = C();
    ctx.fillStyle = col(Math.min(255, c.road * 0.55 + 22)); // own bonnet, slightly warm
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H * 0.95); ctx.quadraticCurveTo(W / 2, H * 0.84, W, H * 0.95); ctx.lineTo(W, H); ctx.fill();
  }

  /* ------------------------------------------------------------ detection emulation */
  let dets = [];
  function detect(items) {
    const c = C(), out = [];
    for (const it of items) {
      if (!it) continue;
      const o = it.o, pxH = it.y1 - it.y0;
      const contrast = Math.abs(obsI(it.I, o.z) - obsI(c.road, o.z));
      let conf = 0.18 + 0.5 * clamp(pxH / 80, 0, 1) + 0.32 * clamp(contrast / 110, 0, 1) + o.j * 0.04;
      if (o.z > c.range) conf *= 0.6;
      o.cs = o.cs ? o.cs * 0.85 + conf * 0.15 : conf;
      const onScreen = it.x1 > 0 && it.x0 < W && it.y1 > 0;
      let found = onScreen && o.cs >= 0.40;
      let src = "det";
      if (o.cls === "pole") { found = found && S.finder === "ens" && S.vlm.seen.has(o.id); src = "vlm"; }
      if (found) out.push(Object.assign({}, it, { conf: Math.min(0.97, o.cs), src }));
    }
    return out;
  }
  const where = (o) => { const d = o.x - S.camX; return d < -1.3 ? "left" : d > 1.3 ? "right" : "ahead"; };
  const band = (o) => (o.z < 15 ? "near" : o.z < 40 ? "mid" : "far");
  const inPath = (d) => Math.abs(d.o.x - S.camX) < 1.4 && d.o.z < 28;

  function drawBoxes() {
    ctx.font = "600 11px Inter, system-ui, sans-serif"; ctx.textBaseline = "bottom";
    for (const d of dets) {
      const k = CLS[d.o.cls], sel = S.sel === d.o;
      ctx.strokeStyle = k.color; ctx.lineWidth = sel ? 3 : 1.6;
      ctx.setLineDash(d.src === "vlm" ? [5, 4] : []);
      ctx.strokeRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0);
      ctx.setLineDash([]);
      const lab = `#${d.o.id} ${k.label} ${d.src === "vlm" ? "VLM" : d.conf.toFixed(2)}`;
      const tw = ctx.measureText(lab).width + 8;
      if (d.x1 - d.x0 > 14 || sel) {
        ctx.fillStyle = k.color; ctx.fillRect(d.x0, d.y0 - 15, tw, 15);
        ctx.fillStyle = "#fff"; ctx.fillText(lab, d.x0 + 4, d.y0 - 2);
      }
    }
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    drawGround();
    const order = S.objs.slice().sort((a, b) => b.z - a.z);
    const items = order.map(drawObj).filter(Boolean);
    if (C().rain) drawRain();
    if (noise) { ctx.globalAlpha = 0.05; ctx.drawImage(noise, -Math.random() * 64, -Math.random() * 64, W + 128, H + 128); ctx.globalAlpha = 1; }
    drawHood();
    dets = detect(items);
    if (S.boxes) drawBoxes();
    $("#drvWheel").style.transform = `rotate(${S.steerVis.toFixed(1)}deg)`;
  }

  /* ------------------------------------------------------------ VLM pathway (slow, time-compressed) */
  function countBy(list) { const n = { person: 0, car: 0, pole: 0 }; list.forEach((d) => { n[d.o.cls]++; }); return n; }
  const plural = (n, a, b) => `${n === 0 ? "no" : n} ${n === 1 ? a : b}`;
  function describe() {
    // the VLM "sees" the whole frame, including poles the detector cannot box
    const c = C(), vis = S.objs.filter((o) => o.cls !== "tree" && o.z < c.range * 0.9 && Math.abs(P(o.x, o.z)[0] - W / 2) < W * 0.6);
    const ppl = vis.filter((o) => o.cls === "person"), cars = vis.filter((o) => o.cls === "car"), poles = vis.filter((o) => o.cls === "pole");
    const parts = [];
    const sky = { night: "A night-time thermal view", fog: "A foggy night-time thermal view with reduced contrast in the distance", rain: "A rainy night-time thermal view", day: "A daytime thermal view with sun-warmed asphalt" }[S.cond];
    parts.push(`${sky} of a two-lane road.`);
    const crossing = ppl.filter((o) => o.cross && Math.abs(o.x) < 3.6);
    if (ppl.length) {
      const sides = [...new Set(ppl.map((o) => (o.x < 0 ? "left" : "right")))];
      parts.push(`${ppl.length === 1 ? "One pedestrian is" : `${ppl.length} pedestrians are`} visible as warm figures on the ${sides.join(" and ")} side${sides.length > 1 ? "s" : ""}${crossing.length ? `, ${crossing.length === 1 ? "one" : crossing.length} crossing the road ahead` : ""}.`);
    } else parts.push("No pedestrians are visible.");
    const lead = cars.find((o) => o.lead), onc = cars.filter((o) => o.onc);
    if (lead) parts.push(`A car drives ahead in the same lane, its tyres and exhaust brighter than the body.`);
    if (onc.length) parts.push(`${onc.length === 1 ? "An oncoming vehicle approaches" : `${onc.length} oncoming vehicles approach`} in the opposite lane.`);
    if (poles.length) parts.push(`Street poles line the roadside.`);
    if (crossing.length) parts.push("Attention: a pedestrian is entering the road.");
    return { text: parts.join(" "), poles: new Set(poles.map((o) => o.id)) };
  }
  function vlmTick(dt) {
    const V = S.vlm;
    if (V.phase === "idle") {
      V.next -= dt;
      if (V.next <= 0) { V.phase = "gen"; V.t0 = 0; V.pending = describe(); $("#drvVlm").classList.add("busy"); $("#drvVlm").textContent = "VLM is generating a description of the current frame…"; }
    } else if (V.phase === "gen") {
      V.t0 += dt;
      $("#drvVlmBar").style.width = Math.min(100, (V.t0 / VLM_GEN) * 100).toFixed(1) + "%";
      if (V.t0 >= VLM_GEN) {
        V.phase = "type"; V.text = V.pending.text; V.shown = 0; V.seen = V.pending.poles;
        $("#drvVlm").classList.remove("busy");
        if (V.ask) { pushLog(V.ask, V.text, "vlm", `${(VLM_GEN * 4).toFixed(0)} s*`); V.ask = null; }
      }
    } else if (V.phase === "type") {
      V.shown = Math.min(V.text.length, V.shown + dt * 90);
      $("#drvVlm").textContent = V.text.slice(0, Math.floor(V.shown));
      if (V.shown >= V.text.length) { V.phase = "idle"; V.next = VLM_GAP; $("#drvVlmBar").style.width = "0%"; }
    }
  }

  /* ------------------------------------------------------------ HUD */
  function setAlert() {
    const a = $("#drvAlert");
    const ped = dets.filter((d) => d.o.cls === "person" && inPath(d));
    const car = dets.filter((d) => d.o.cls === "car" && inPath(d) && d.o.z < 18);
    const pedNear = dets.filter((d) => d.o.cls === "person" && d.o.z < 30);
    let cls = "", ico = "&#10003;", txt = "Road clear";
    if (ped.length) { cls = "crit"; ico = "!!"; txt = "Pedestrian in path"; }
    else if (car.length) { cls = "warn"; ico = "!"; txt = "Vehicle close ahead"; }
    else if (pedNear.length) { cls = "warn"; ico = "!"; txt = `${plural(pedNear.length, "pedestrian", "pedestrians")} near the road`; }
    a.className = "drv-alert " + cls;
    a.innerHTML = `<span class="ico" aria-hidden="true">${ico}</span>${esc(txt)}`;
  }
  function renderHud() {
    const n = countBy(dets);
    $("#drvCounts").innerHTML = ["person", "car", "pole"].map((k) =>
      `<div style="--c:${CLS[k].color}"><b>${k === "pole" && S.finder === "yolo" ? "&ndash;" : n[k]}</b><span>${k === "pole" && S.finder === "yolo" ? "no pole class" : CLS[k].label + (n[k] === 1 ? "" : "s")}</span></div>`).join("");
    const rows = dets.slice().sort((a, b) => a.o.z - b.o.z).slice(0, 7);
    $("#drvRows").innerHTML = rows.length ? rows.map((d) =>
      `<tr data-id="${d.o.id}" class="${S.sel === d.o ? "sel" : ""}"><td>#${d.o.id}</td><td><span class="sw" style="--c:${CLS[d.o.cls].color}"></span>${d.o.cls}</td><td>${where(d.o)}</td><td>${band(d.o)}</td><td>${Math.round(obsI(d.I, d.o.z))}/${Math.round(obsI(d.Imax, d.o.z))}</td></tr>`).join("")
      : `<tr class="empty"><td colspan="5">No detections</td></tr>`;
    setAlert(); renderInspect();
  }
  function renderInspect() {
    const box = $("#drvInspect"), d = dets.find((x) => x.o === S.sel);
    if (!S.sel) { box.innerHTML = "Click a box in the view or a row in the feed."; return; }
    if (!d) { box.innerHTML = `#${S.sel.id} ${esc(S.sel.cls)}: not detected in this frame.`; return; }
    const m = Math.round(obsI(d.I, d.o.z)), mx = Math.round(obsI(d.Imax, d.o.z)), bg = Math.round(obsI(C().road, d.o.z));
    box.innerHTML = `<dl><dt>Object</dt><dd>#${d.o.id} ${esc(d.o.cls)} (${d.src === "vlm" ? "VLM grounding" : "detector, conf " + d.conf.toFixed(2)})</dd>
      <dt>Position</dt><dd>${where(d.o)}, ${band(d.o)} range</dd><dt>Box</dt><dd>${Math.round(d.x1 - d.x0)} &times; ${Math.round(d.y1 - d.y0)} px</dd>
      <dt>Intensity</dt><dd>mean ${m}, max ${mx}, road ${bg}</dd><dt>Contrast</dt><dd>${m - bg >= 0 ? "+" : ""}${m - bg} vs road</dd></dl>
      <div class="bar" aria-hidden="true"><i style="left:${(m / 255 * 100).toFixed(1)}%"></i></div><span class="hud-note">Marker: mean intensity on the 0&ndash;255 scale.</span>`;
  }
  const spark = $("#drvSpark"), sctx = spark.getContext("2d");
  function renderSpark() {
    const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
    const w = spark.clientWidth, h = 90, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (spark.width !== Math.round(w * dpr)) { spark.width = Math.round(w * dpr); spark.height = h * dpr; }
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0); sctx.clearRect(0, 0, w, h);
    sctx.strokeStyle = css("--grid"); sctx.lineWidth = 1;
    [0, 128, 255].forEach((v) => { const y = 6 + (1 - v / 255) * (h - 12); sctx.beginPath(); sctx.moveTo(0, y); sctx.lineTo(w, y); sctx.stroke(); });
    sctx.fillStyle = css("--muted"); sctx.font = "10px Inter, system-ui"; sctx.fillText("255", 4, 14); sctx.fillText("0", 4, h - 8);
    const N = 100;
    [["hot", "--s-qlora"], ["mean", "--s-base"]].forEach(([k, c]) => {
      sctx.strokeStyle = css(c); sctx.lineWidth = 2; sctx.beginPath();
      S.spark.forEach((p, i) => { const x = w - (S.spark.length - 1 - i) * (w / (N - 1)), y = 6 + (1 - p[k] / 255) * (h - 12); i ? sctx.lineTo(x, y) : sctx.moveTo(x, y); });
      sctx.stroke();
    });
  }

  /* ------------------------------------------------------------ ask the co-pilot (dual pathway routing) */
  function pushLog(q, a, src, t) {
    S.log.unshift({ q, a, src, t }); S.log = S.log.slice(0, 4);
    $("#drvLog").innerHTML = S.log.map((x) => `<li><span class="q">${esc(x.q)}</span><span class="src ${x.src}">${x.src === "det" ? "from detections" : "VLM"} &middot; ${esc(x.t)}</span>${esc(x.a)}</li>`).join("");
  }
  const QUESTIONS = [
    ["How many people?", () => { const n = countBy(dets).person; return ["det", `${plural(n, "person", "people")} detected.`.replace(/^no/, "No")]; }],
    ["Car ahead?", () => { const c = dets.filter((d) => d.o.cls === "car" && where(d.o) === "ahead"); return ["det", c.length ? `Yes: ${plural(c.length, "car", "cars")} ahead (${band(c[0].o)} range).` : "No car detected ahead."]; }],
    ["Anyone in my path?", () => { const p = dets.filter((d) => d.o.cls === "person" && inPath(d)); return ["det", p.length ? `Yes: ${plural(p.length, "pedestrian", "pedestrians")} in the path ahead.` : "No pedestrian detected in the path."]; }],
    ["Any poles?", () => S.finder === "ens" ? ["det", `${plural(countBy(dets).pole, "pole", "poles")} found (VLM grounding, fused).`.replace(/^no/, "No")] : ["vlm", null]],
    ["Describe the scene", () => ["vlm", null]],
  ];
  function ask(q, fn) {
    const [src, ans] = fn();
    if (src === "det") { pushLog(q, ans, "det", "0.0 s"); return; }
    // routed to the VLM: restart its cycle on the current frame
    S.vlm.ask = q + (q === "Any poles?" ? " (detector has no pole class: routed to VLM)" : "");
    S.vlm.phase = "idle"; S.vlm.next = 0; S.vlm.text = "";
    if (!S.run) toggleRun();
  }
  QUESTIONS.forEach(([q, fn]) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "btn small"; b.textContent = q;
    b.addEventListener("click", () => ask(q, fn)); $("#drvAsk").appendChild(b);
  });

  /* ------------------------------------------------------------ controls */
  function seg(id, items, cur, onPick) {
    const box = $(id);
    items.forEach(([k, l]) => {
      const b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "tab"); b.textContent = l;
      b.setAttribute("aria-selected", String(k === cur));
      b.addEventListener("click", () => { onPick(k); [...box.children].forEach((x) => x.setAttribute("aria-selected", String(x === b))); if (!S.run) { frame(); renderHud(); } });
      box.appendChild(b);
    });
  }
  seg("#drvCond", [["night", "Night"], ["fog", "Fog"], ["rain", "Rain"], ["day", "Day"]], S.cond, (k) => { S.cond = k; $("#drvCondLabel").textContent = COND[k].label; });
  seg("#drvFinder", [["yolo", "YOLO"], ["ens", "Ensemble"]], S.finder, (k) => { S.finder = k; $("#drvFinderLabel").textContent = FINDER[k]; });
  seg("#drvPal", [["inferno", "Inferno"], ["white", "White-hot"]], S.pal, (k) => { S.pal = k; });
  function toggleRun() {
    S.run = !S.run; const b = $("#drvPlay");
    b.textContent = S.run ? "Pause" : "Play"; b.setAttribute("aria-pressed", String(S.run));
    if (S.run) { last = performance.now(); requestAnimationFrame(loop); }
  }
  $("#drvPlay").addEventListener("click", toggleRun);
  if (!S.run) { $("#drvPlay").textContent = "Play"; $("#drvPlay").setAttribute("aria-pressed", "false"); }
  $("#drvSpeed").addEventListener("input", (e) => { S.kmh = +e.target.value; $("#drvSpeedOut").textContent = S.kmh + " km/h"; $("#drvKmh").textContent = S.kmh; });
  $("#drvBoxes").addEventListener("change", (e) => { S.boxes = e.target.checked; if (!S.run) frame(); });
  const hold = (btn, dir) => {
    const on = (e) => { e.preventDefault(); S.steerIn = dir; }, off = () => { if (S.steerIn === dir) S.steerIn = 0; };
    btn.addEventListener("pointerdown", on); ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => btn.addEventListener(ev, off));
  };
  hold($("#drvLeft"), -1); hold($("#drvRight"), 1);
  cv.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") { S.steerIn = -1; e.preventDefault(); }
    else if (e.key === "ArrowRight" || e.key === "d") { S.steerIn = 1; e.preventDefault(); }
    else if (e.key === " ") { toggleRun(); e.preventDefault(); }
  });
  cv.addEventListener("keyup", (e) => { if (["ArrowLeft", "ArrowRight", "a", "d"].includes(e.key)) S.steerIn = 0; });
  cv.addEventListener("blur", () => { S.steerIn = 0; });
  cv.addEventListener("click", (e) => {
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
    const hit = dets.filter((d) => x >= d.x0 && x <= d.x1 && y >= d.y0 - 15 && y <= d.y1).sort((a, b) => (a.x1 - a.x0) * (a.y1 - a.y0) - (b.x1 - b.x0) * (b.y1 - b.y0))[0];
    S.sel = hit ? hit.o : null; renderHud(); if (!S.run) frame();
  });
  $("#drvRows").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-id]"); if (!tr) return;
    S.sel = S.objs.find((o) => o.id === +tr.dataset.id) || null; renderHud(); if (!S.run) frame();
  });

  /* ------------------------------------------------------------ loop */
  let last = performance.now();
  function loop(now) {
    if (!S.run) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (S.visible) {
      step(dt); frame(); vlmTick(dt);
      S.hudT -= dt; S.sparkT -= dt;
      if (S.hudT <= 0) { S.hudT = 0.2; renderHud(); }
      if (S.sparkT <= 0) {
        S.sparkT = 0.2;
        const hot = dets.reduce((m, d) => Math.max(m, obsI(d.Imax, d.o.z)), 0);
        const c = C(), mean = 0.45 * obsI(c.ground, 40) + 0.35 * c.road + 0.2 * (c.fog ? c.fogI : c.sky);
        S.spark.push({ hot: hot || mean, mean }); if (S.spark.length > 100) S.spark.shift();
        renderSpark();
      }
    }
    requestAnimationFrame(loop);
  }
  if ("IntersectionObserver" in window) new IntersectionObserver((es) => { S.visible = es[0].isIntersecting; last = performance.now(); }).observe(cv);
  resize(); makeNoise();
  // warm up the world so the first frame already has traffic
  for (let i = 0; i < 300; i++) step(0.05);
  S.t = 0; frame(); renderHud(); renderSpark();
  window.addEventListener("resize", () => { resize(); if (!S.run) frame(); renderSpark(); });
  if (S.run) requestAnimationFrame(loop);
})();
