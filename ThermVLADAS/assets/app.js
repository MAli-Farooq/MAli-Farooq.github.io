/* ThermVLADAS project page: interactivity. No dependencies. Data: window.TVLM_DATA, window.TVLM_CASES. */
(function () {
  "use strict";
  const D = window.TVLM_DATA, CASES = window.TVLM_CASES;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const NS = "http://www.w3.org/2000/svg";
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
  };
  const DS_LABEL = { lynred: "LYNRED (unseen)", c3i: "C3I", flir: "FLIR ADAS" };
  const DS_NOTE = {
    lynred: "LYNRED unseen sequences: 311 frames (203 day, 108 night), 1,188 counting/presence questions, human-box counts for person and car.",
    c3i: "C3I (NUIG): 300 frames (day, evening, night; roadside and vehicle-mounted), 1,800 questions for person, car and pole. Unseen by every model.",
    flir: "FLIR ADAS v2 test videos: 300 frames (night fog, night rain, day, dawn), 1,200 questions for person and car. The detector was trained on FLIR, on other videos.",
  };
  const SERIES = [
    { key: "base", label: "Zero-shot (16-bit)", color: "--s-base" },
    { key: "qlora", label: "QLoRA (4-bit)", color: "--s-qlora" },
    { key: "dual", label: "Dual: YOLO + QLoRA VLM", color: "--s-dual" },
  ];
  const METRICS = [
    { key: "top1", label: "Top-1", unit: "%", max: 100, axis: "Top-1 accuracy (%)" },
    { key: "count", label: "Counting", unit: "%", max: 100, axis: "Counting accuracy (%)" },
    { key: "presence", label: "Presence", unit: "%", max: 100, axis: "Presence accuracy (%)" },
    { key: "mae", label: "Count MAE", unit: "", max: null, axis: "Count MAE (objects per image, lower is better)" },
  ];

  /* ------------------------------------------------------------ theme + nav */
  const root = document.documentElement;
  const saved = store.get("tvlm-theme");
  if (saved === "light" || saved === "dark") root.dataset.theme = saved;
  $("#themeToggle").addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
    store.set("tvlm-theme", root.dataset.theme);
    renderAll();
  });
  const menuBtn = $("#menuBtn"), links = $("#navLinks");
  menuBtn.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  $$("#navLinks a").forEach((a) => a.addEventListener("click", () => { links.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) $$("#navLinks a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("section[id]").forEach((s) => io.observe(s));
  }

  /* ------------------------------------------------------------ hero counters + heat background */
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function animateCount(el) {
    const target = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || "0", 10);
    const sep = !!el.dataset.sep, suffix = el.dataset.suffix || "";
    const fmt = (v) => (sep ? Math.round(v).toLocaleString("en-US") : v.toFixed(dec)) + suffix;
    if (reduce) { el.textContent = fmt(target); return; }
    const t0 = performance.now(), dur = 1300;
    (function step(t) {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(target * e);
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  $$(".stat-num").forEach(animateCount);

  (function heat() {
    const cv = $("#heatCanvas"); if (!cv || !cv.getContext) return;
    const ctx = cv.getContext("2d");
    const blobs = Array.from({ length: 7 }, (_, i) => ({ x: Math.random(), y: Math.random(), r: 0.18 + Math.random() * 0.22,
      vx: (Math.random() - 0.5) * 0.00025, vy: (Math.random() - 0.5) * 0.0002, h: i }));
    const stops = [["rgba(252,255,164,", 0], ["rgba(249,142,9,", 0.25], ["rgba(188,55,84,", 0.55], ["rgba(87,16,110,", 0.8]];
    function size() { cv.width = cv.clientWidth * devicePixelRatio; cv.height = cv.clientHeight * devicePixelRatio; }
    function draw() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.globalCompositeOperation = "lighter";
      for (const b of blobs) {
        const x = b.x * cv.width, y = b.y * cv.height, r = b.r * Math.max(cv.width, cv.height);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        stops.forEach(([c, s]) => g.addColorStop(s, c + (0.55 - s * 0.6).toFixed(2) + ")"));
        g.addColorStop(1, "rgba(0,0,4,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        if (!reduce) { b.x += b.vx; b.y += b.vy; if (b.x < -0.1 || b.x > 1.1) b.vx *= -1; if (b.y < -0.1 || b.y > 1.1) b.vy *= -1; }
      }
      ctx.globalCompositeOperation = "source-over";
      if (!reduce) requestAnimationFrame(draw);
    }
    size(); window.addEventListener("resize", size); draw();
  })();

  /* ------------------------------------------------------------ interactive logo */
  (function logo() {
    const box = $("#heroLogo"); if (!box) return;
    const svg = $(".logo-svg", box), blob = $(".lg-blob", svg), hint = $("#logoHint");
    const MAPS = [
      ["Inferno", ["#fcffa4", "#f98e09", "#bc3754", "#57106e", "#000004"]],
      ["White-hot", ["#ffffff", "#d6d6d6", "#8a8a8a", "#3a3a3a", "#000000"]],
      ["Black-hot", ["#000000", "#3a3a3a", "#8a8a8a", "#d6d6d6", "#ffffff"]],
      ["Ironbow", ["#fffbe0", "#ffd02a", "#f2621b", "#a1137e", "#14045c"]],
    ];
    let mi = 0;
    const home = [122, 118];
    const setBlob = (x, y) => { blob.setAttribute("cx", x.toFixed(1)); blob.setAttribute("cy", y.toFixed(1)); };
    // the heat follows the pointer anywhere in the hero, limited to the lens
    $(".hero").addEventListener("pointermove", (e) => {
      const r = svg.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      const d = Math.hypot(dx, dy), k = Math.min(1, 0.55 / Math.max(d, 1e-6));
      setBlob(100 + dx * k * 80, 100 + dy * k * 80);
      box.classList.toggle("active", d < 0.75);
    });
    $(".hero").addEventListener("pointerleave", () => { setBlob(...home); box.classList.remove("active"); });
    const cycle = () => {
      mi = (mi + 1) % MAPS.length;
      const [name, cols] = MAPS[mi];
      cols.forEach((c, i) => $(".lg-s" + i, svg).setAttribute("stop-color", c));
      hint.textContent = name + " \u00b7 click to change";
    };
    svg.addEventListener("click", cycle);
    svg.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cycle(); } });
  })();

  /* ------------------------------------------------------------ tooltip */
  const tip = $("#tooltip");
  function showTip(html, ev) {
    tip.innerHTML = html; tip.hidden = false;
    const pad = 14, w = tip.offsetWidth, h = tip.offsetHeight;
    let x = ev.clientX + pad, y = ev.clientY - h - pad;
    if (x + w > innerWidth - 8) x = ev.clientX - w - pad;
    if (y < 8) y = ev.clientY + pad;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  const hideTip = () => { tip.hidden = true; };

  /* ------------------------------------------------------------ grouped bar chart (SVG) */
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function niceMax(v) {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  }
  /** opts: {cats, series:[{key,label,color}], value(cat,key), max, unit, axis, ref:{value,label}, tip(cat,s,v)} */
  function barChart(container, opts) {
    container.innerHTML = "";
    const W = Math.max(320, Math.round(container.clientWidth || 960)), H = opts.height || 360;
    const m = { l: 54, r: opts.ref && opts.ref.value != null ? 112 : 18, t: 18, b: 52 };
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": opts.axis }, container);
    const vals = [];
    opts.cats.forEach((c) => opts.series.forEach((s) => { const v = opts.value(c, s.key); if (v != null) vals.push(v); }));
    if (opts.ref && opts.ref.value != null) vals.push(opts.ref.value);
    const max = opts.max || niceMax(Math.max(...vals, 0) * 1.12);
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const y = (v) => m.t + ih - (v / max) * ih;
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const v = (max / ticks) * i, yy = y(v);
      el("line", { x1: m.l, x2: W - m.r, y1: yy, y2: yy, class: "gridline" }, svg);
      const t = el("text", { x: m.l - 8, y: yy + 4, "text-anchor": "end", class: "tick" }, svg);
      t.textContent = (max <= 5 ? v.toFixed(1) : Math.round(v)) + (opts.unit === "%" ? "" : "");
    }
    const yl = el("text", { x: 14, y: m.t + ih / 2, transform: `rotate(-90 14 ${m.t + ih / 2})`, "text-anchor": "middle", class: "axis-label" }, svg);
    yl.textContent = opts.axis;
    const band = iw / opts.cats.length, ns = opts.series.length;
    const bw = Math.min(38, (band * 0.72 - (ns - 1) * 2) / ns);
    const groupW = ns * bw + (ns - 1) * 2;
    opts.cats.forEach((c, ci) => {
      const gx = m.l + ci * band + (band - groupW) / 2;
      opts.series.forEach((s, si) => {
        const v = opts.value(c, s.key);
        if (v == null) return;
        const x = gx + si * (bw + 2), top = y(v), base = y(0), h = Math.max(base - top, 0.5), r = Math.min(4, h, bw / 2);
        const d = `M${x},${base} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + bw - r},${top} Q${x + bw},${top} ${x + bw},${top + r} L${x + bw},${base} Z`;
        el("path", { d, fill: css(s.color), class: "bar" }, svg);
        const hit = el("rect", { x: x - 1, y: Math.min(top, base - 26), width: bw + 2, height: Math.max(h, 26), class: "hit", tabindex: 0,
          "aria-label": `${c}, ${s.label}: ${v}${opts.unit}` }, svg);
        const html = opts.tip ? opts.tip(c, s, v) : `<b>${esc(c)}</b><div class="tt-row"><span class="swatch" style="background:${css(s.color)}"></span>${esc(s.label)}: ${v}${opts.unit}</div>`;
        hit.addEventListener("mousemove", (ev) => showTip(html, ev));
        hit.addEventListener("mouseleave", hideTip);
        hit.addEventListener("focus", () => { const r2 = hit.getBoundingClientRect(); showTip(html, { clientX: r2.right, clientY: r2.top }); });
        hit.addEventListener("blur", hideTip);
      });
      const cl = el("text", { x: m.l + ci * band + band / 2, y: H - m.b + 22, "text-anchor": "middle", class: "cat-label" }, svg);
      cl.textContent = band < 92 ? c.replace("-Vision", "").replace(/-(\d+B)$/, " $1").split(" ")[0] : c;
    });
    el("line", { x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), stroke: css("--muted"), "stroke-width": 1 }, svg);
    if (opts.ref && opts.ref.value != null) {
      const ry = y(opts.ref.value);
      el("line", { x1: m.l, x2: W - m.r, y1: ry, y2: ry, class: "ref" }, svg);
      const rl = el("text", { x: W - m.r + 8, y: ry + 4, "text-anchor": "start", class: "ref-label" }, svg);
      rl.textContent = opts.ref.label;
    }
  }
  function legend(container, series, toggles, onChange, extra) {
    container.innerHTML = "";
    series.forEach((s) => {
      const lab = document.createElement("label");
      if (toggles) {
        const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = toggles[s.key] !== false;
        cb.addEventListener("change", () => { toggles[s.key] = cb.checked; onChange(); });
        lab.appendChild(cb);
      }
      lab.insertAdjacentHTML("beforeend", `<span class="swatch" style="background:${css(s.color)}"></span>${esc(s.label)}`);
      container.appendChild(lab);
    });
    if (extra) container.insertAdjacentHTML("beforeend", `<span><span class="swatch dash"></span> ${esc(extra)}</span>`);
  }
  function seg(container, items, current, onPick) {
    container.innerHTML = "";
    items.forEach(([key, label]) => {
      const b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "tab"); b.textContent = label;
      b.setAttribute("aria-selected", String(key === current));
      b.addEventListener("click", () => { onPick(key); $$("button", container).forEach((x) => x.setAttribute("aria-selected", String(x === b))); });
      container.appendChild(b);
    });
  }

  /* ------------------------------------------------------------ results explorer */
  const state = { ds: store.get("tvlm-ds") || "lynred", metric: "top1", table: false, show: { base: true, qlora: true, dual: true },
    bias: "lynred", weather: "qlora" };
  if (!D.datasets[state.ds]) state.ds = "lynred";
  function renderResults() {
    const ds = D.datasets[state.ds], met = METRICS.find((x) => x.key === state.metric);
    const series = SERIES.filter((s) => state.show[s.key]);
    $("#dsNote").textContent = DS_NOTE[state.ds];
    const refVal = ds.yolo[met.key];
    legend($("#resLegend"), SERIES, state.show, renderResults, `YOLO only: ${refVal}${met.unit}`);
    barChart($("#resChart"), {
      cats: D.models, series, unit: met.unit, axis: met.axis, max: met.max,
      value: (c, k) => (ds.models[c][k] ? ds.models[c][k][met.key] : null),
      ref: { value: refVal, label: `YOLO ${refVal}${met.unit}` },
      tip: (c, s, v) => {
        const r = ds.models[c][s.key];
        const ci = met.key === "top1" && r.lo != null ? ` <span class="muted">[${r.lo}, ${r.hi}]</span>` : "";
        return `<b>${esc(c)} &middot; ${esc(DS_LABEL[state.ds])}</b><div class="tt-row"><span class="swatch" style="background:${css(s.color)}"></span>${esc(s.label)}: ${v}${met.unit}${ci}</div>`;
      },
    });
    const t = $("#resTable");
    t.hidden = !state.table;
    if (state.table) {
      let h = `<table class="data"><thead><tr><th>Backbone</th>${SERIES.map((s) => `<th>${esc(s.label)}</th>`).join("")}</tr></thead><tbody>`;
      D.models.forEach((c) => {
        h += `<tr><td>${esc(c)}</td>` + SERIES.map((s) => `<td>${ds.models[c][s.key][met.key] ?? "&ndash;"}${met.unit}</td>`).join("") + "</tr>";
      });
      h += `<tr><td>YOLO only</td><td colspan="3">${refVal}${met.unit}</td></tr></tbody></table>`;
      t.innerHTML = h;
    }
  }
  seg($("#dsSeg"), Object.entries(DS_LABEL), state.ds, (k) => { state.ds = k; store.set("tvlm-ds", k); renderResults(); });
  seg($("#metricSeg"), METRICS.map((x) => [x.key, x.label]), state.metric, (k) => { state.metric = k; renderResults(); });
  $("#tableBtn").addEventListener("click", (e) => { state.table = !state.table; e.currentTarget.setAttribute("aria-pressed", String(state.table)); renderResults(); });

  /* ------------------------------------------------------------ findings cards */
  function findingCards() {
    const L = D.datasets.lynred, F = D.datasets.flir, C = D.datasets.c3i;
    const bestDual = Math.max(...D.models.map((m) => L.models[m].dual.top1));
    const bestQ = Math.max(...D.models.map((m) => L.models[m].qlora.top1));
    const gains = D.models.map((m) => +(L.models[m].qlora.top1 - L.models[m].base.top1).toFixed(1));
    const gt3 = Math.max(...["c3i", "flir"].flatMap((d) => D.models.map((m) => D.datasets[d].models[m].qlora.gt3)));
    const lost = Object.entries(D.grounding).filter(([k, v]) => !k.includes("Qwen3") && v <= 5).length;
    const cards = [
      { k: "Dual pathway", big: `${bestDual}%`, p: `Top-1 on unseen LYNRED sequences, vs ${bestQ}% for the best adapted VLM and ${L.yolo.top1}% for the detector alone. Better than the adapted VLM on all 15 backbone/dataset pairs.` },
      { k: "Thermal adaptation", big: `+${Math.max(...gains)} pts`, p: `Largest QLoRA gain on LYNRED (Qwen2.5-VL-7B); significant for 4 of 5 backbones. Unusable answers fall from up to 41.5% to 0%.` },
      { k: "Efficiency", big: `${L.models["Qwen3-VL-4B"].qlora.vram} GB`, p: `GPU memory of the best adapted model, Qwen3-VL-4B, which matches or beats the 7–12B backbones.` },
      { k: "Honest negative", neg: true, big: `${gt3}%`, p: `Best accuracy of any adapted VLM on questions with three or more objects (C3I, FLIR). Caption-derived training counts teach small numbers.` },
      { k: "Honest negative", neg: true, big: `${F.yolo.top1}%`, p: `On FLIR test videos, the detector's own sensor, the detector alone beats every dual pathway: deferring undetected classes to the VLM hurts there.` },
      { k: "Grounding loss", neg: true, big: `${lost} of 5`, p: `Backbones that stop producing bounding boxes after fine-tuning. Only Qwen3-VL-4B keeps it; its ensemble reaches ${D.ensemble_best}% (n.s. vs YOLO + fallback).` },
    ];
    $("#findingCards").innerHTML = cards.map((c) =>
      `<article class="card${c.neg ? " neg" : ""}"><span class="kicker">${esc(c.k)}</span><span class="big">${esc(c.big)}</span><p>${esc(c.p)}</p></article>`).join("");
    void C;
  }

  /* ------------------------------------------------------------ counting bias, grounding, weather */
  function renderBias() {
    const ds = D.datasets[state.bias];
    const ser = [{ key: "le2", label: "True count ≤ 2", color: "--s-base" }, { key: "gt3", label: "True count ≥ 3", color: "--s-qlora" }];
    legend($("#biasLegend"), ser);
    barChart($("#biasChart"), { cats: D.models, series: ser, unit: "%", max: 100, axis: "QLoRA counting accuracy (%)", height: 300,
      value: (c, k) => ds.models[c].qlora[k] });
  }
  seg($("#biasSeg"), Object.entries(DS_LABEL), state.bias, (k) => { state.bias = k; renderBias(); });

  function renderGround() {
    const order = ["Gemma-3-4B", "Qwen3-VL-4B (corrected)", "Qwen2.5-VL-7B", "Llama-3.2-11B", "Pixtral-12B"];
    const ser = [{ key: "v", label: "Frames with boxes", color: "--s-dual" }];
    barChart($("#groundChart"), { cats: order.map((k) => k.replace(" (corrected)", "")), series: ser, unit: "%", max: 100, height: 300,
      axis: "Frames with boxes (%)", value: (c) => { const k = order.find((o) => o.startsWith(c)); return D.grounding[k] ?? D.grounding[c] ?? null; },
      tip: (c, s, v) => `<b>${esc(c)} (QLoRA)</b><div class="tt-row">${v}% of frames with boxes${c === "Qwen3-VL-4B" ? " (coordinates read on the 0–1000 grid)" : ""}</div>` });
  }

  function renderWeather() {
    const W = D.weather;
    const groups = {
      qlora: D.models.map((m) => [m, `${m} QLoRA`]),
      dual: D.models.map((m) => [m, `YOLO + ${m} (dual)`]),
      base: D.models.map((m) => [m, `${m} Base`]),
    }[state.weather];
    const cats = [["YOLO only", "YOLO only"], ...groups];
    const ser = [{ key: "fog", label: "Night + fog", color: "--s-base" }, { key: "rain", label: "Night + rain", color: "--s-qlora" }];
    legend($("#weatherLegend"), ser);
    barChart($("#weatherChart"), { cats: cats.map((c) => c[0]), series: ser, unit: "%", max: 100, height: 300, axis: "Top-1 accuracy (%)",
      value: (c, k) => { const row = cats.find((x) => x[0] === c); return W[row[1]] ? W[row[1]][k] : null; } });
  }
  seg($("#weatherSeg"), [["qlora", "QLoRA VLMs"], ["dual", "Dual pathway"], ["base", "Zero-shot VLMs"]], state.weather, (k) => { state.weather = k; renderWeather(); });

  /* ------------------------------------------------------------ pipeline diagram */
  const NODES = [
    { id: "frame", x: 20, y: 148, t: "Thermal frame", s: "+ user question", info: "An 8-bit LWIR frame from an uncooled microbolometer, plus a question in natural language: counting, presence, JSON counts, or open-ended." },
    { id: "det", x: 250, y: 40, t: "YOLOv8n detector", s: "fine-tuned on FLIR", info: "Fast, precise thermal detector for person, bicycle, car and dog (confidence 0.40, NMS 0.50). Precision 80–90% across datasets; recall varies with the domain." },
    { id: "vlm", x: 250, y: 256, t: "QLoRA-adapted VLM", s: "4-bit base + LoRA r=8", info: "Gemma-3-4B, Qwen3-VL-4B, Qwen2.5-VL-7B, Llama-3.2-11B-Vision or Pixtral-12B, adapted to LWIR with one identical recipe on captions plus counting, presence and JSON questions." },
    { id: "fuse", x: 500, y: 40, t: "Box fusion", s: "class-normalized NMS", info: "Detector boxes and optional VLM grounding boxes are mapped to canonical classes and de-duplicated by class-wise IoU suppression (0.50). Fusion happens on output boxes, not inside a network." },
    { id: "route", x: 500, y: 256, t: "Question router", s: "deterministic", info: "Counting, presence and JSON questions about a detected class are answered from the detections. Everything else, including classes the detector did not find, goes to the adapted VLM." },
    { id: "ans", x: 790, y: 148, t: "Grounded answer", s: "numbers match the boxes", info: "Numbers shown to the user always equal the boxes on screen; the VLM adds description and reasoning. Evaluated on 4,188 human-annotated questions across three datasets." },
  ];
  const EDGES = [["frame", "det"], ["frame", "vlm"], ["det", "fuse"], ["vlm", "fuse", "grounding (optional)"], ["fuse", "route", "detections"], ["vlm", "route", "fallback answers"], ["route", "ans"]];
  function renderPipeline() {
    const svg = $("#pipeline"); svg.innerHTML = "";
    svg.setAttribute("viewBox", "0 0 1000 340");
    const defs = el("defs", {}, svg);
    const mk = el("marker", { id: "arrow", viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" }, defs);
    el("path", { d: "M0,0 L10,5 L0,10 z", fill: css("--muted") }, mk);
    const P = { frame: [20, 137], det: [250, 30], vlm: [250, 244], fuse: [500, 30], route: [500, 244], ans: [790, 137] };
    const Wn = 180, Hn = 66;
    const edges = [
      { d: "M200,170 C228,170 222,63 250,63" },
      { d: "M200,170 C228,170 222,277 250,277" },
      { d: "M430,63 L500,63" },
      { d: "M430,250 L540,96", dash: true, label: "grounding (optional)", lx: 452, ly: 160, anchor: "end" },
      { d: "M600,96 L600,244", label: "detections", lx: 610, ly: 176, anchor: "start" },
      { d: "M430,287 L500,287", label: "fallback", lx: 465, ly: 318, anchor: "middle" },
      { d: "M680,277 C735,277 735,170 790,170" },
    ];
    edges.forEach((e) => {
      el("path", Object.assign({ d: e.d, class: "pipe-edge flow" }, e.dash ? { "stroke-dasharray": "4 6" } : {}), svg);
      if (e.label) { const t = el("text", { x: e.lx, y: e.ly, class: "tick", "text-anchor": e.anchor }, svg); t.textContent = e.label; }
    });
    NODES.forEach((n) => {
      const [x, y] = P[n.id];
      const g = el("g", { class: "pipe-node", tabindex: 0, role: "button", "aria-label": n.t }, svg);
      el("rect", { x, y, width: Wn, height: Hn, rx: 12 }, g);
      const t1 = el("text", { x: x + Wn / 2, y: y + 28, "text-anchor": "middle" }, g); t1.textContent = n.t;
      const t2 = el("text", { x: x + Wn / 2, y: y + 48, "text-anchor": "middle", class: "sub" }, g); t2.textContent = n.s;
      const pick = () => { $$(".pipe-node", svg).forEach((q) => q.classList.remove("on")); g.classList.add("on");
        $("#pipeInfo").innerHTML = `<h3>${esc(n.t)}</h3><p>${esc(n.info)}</p>`; };
      g.addEventListener("click", pick); g.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); pick(); } });
      if (n.id === "route") pick();
    });
  }

  /* ------------------------------------------------------------ cases + lightbox */
  let caseDs = "lynred", lbIndex = 0;
  const caseLabel = (s) => s.replace("Llama-11B", "Llama-11B").replace(" grounded", "");
  function caseCaption(c) {
    const rows = Object.entries(c.score).map(([s, [k, n]]) => `${caseLabel(s)} ${k}/${n}`).join(" · ");
    return `${DS_LABEL[caseDs]} · case ${c.case} · ${c.condition} · ${c.frame}<br><span style="opacity:.8">Correct answers: ${esc(rows)}</span>`;
  }
  function renderCases() {
    const list = CASES[caseDs];
    $("#caseGrid").innerHTML = list.map((c, i) => {
      const y = c.score["YOLO grounded"], q = c.score["Qwen3-4B QLoRA"];
      return `<button class="case" data-i="${i}" aria-label="Open case ${c.case}, ${esc(c.condition)}">
        <div class="thumb" style="background-image:url('${c.img}')"></div>
        <div class="meta"><b>Case ${c.case} · ${esc(c.condition)}</b>
        ${y ? `<span class="pill">YOLO ${y[0]}/${y[1]}</span>` : ""}${q ? `<span class="pill">Qwen3-VL-4B QLoRA ${q[0]}/${q[1]}</span>` : ""}</div></button>`;
    }).join("");
    $$(".case", $("#caseGrid")).forEach((b) => b.addEventListener("click", () => openLb(+b.dataset.i)));
  }
  seg($("#caseSeg"), Object.entries(DS_LABEL), caseDs, (k) => { caseDs = k; renderCases(); });
  const lb = $("#lightbox");
  let lastFocus = null;
  function openLb(i, src, cap) {
    lastFocus = document.activeElement;
    if (src) { lbIndex = -1; $("#lbImg").src = src; $("#lbCap").innerHTML = cap || ""; }
    else { lbIndex = i; const c = CASES[caseDs][i]; $("#lbImg").src = c.img; $("#lbImg").alt = `Case ${c.case}`; $("#lbCap").innerHTML = caseCaption(c); }
    $("#lbPrev").hidden = $("#lbNext").hidden = lbIndex < 0;
    lb.hidden = false; $("#lbClose").focus();
  }
  function closeLb() { lb.hidden = true; if (lastFocus) lastFocus.focus(); }
  function stepLb(d) { if (lbIndex < 0) return; const n = CASES[caseDs].length; openLb((lbIndex + d + n) % n); }
  $("#lbClose").addEventListener("click", closeLb);
  $("#lbPrev").addEventListener("click", () => stepLb(-1));
  $("#lbNext").addEventListener("click", () => stepLb(1));
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
  document.addEventListener("keydown", (e) => {
    if (lb.hidden) return;
    if (e.key === "Escape") closeLb(); else if (e.key === "ArrowRight") stepLb(1); else if (e.key === "ArrowLeft") stepLb(-1);
  });
  document.addEventListener("click", (e) => {
    const img = e.target.closest("img[data-zoom]");
    if (img) openLb(-1, img.src, esc(img.alt || ""));
  });

  /* ------------------------------------------------------------ studio tour */
  const TOUR = [
    { t: "Find objects", s: "YOLO, VLM grounding or ensemble", img: "images/studio/overview.jpg",
      cap: "Settings, input frame and detections with class, ID and confidence; per-class counts (4 people, 1 car, 1 bicycle in 0.1 s)." },
    { t: "Inspect", s: "objects, heatmaps, histograms", img: "images/studio/tabs.jpg",
      cap: "(a) per-object intensity table with CSV export, (b) object inspector, (c) scene heatmap and per-class intensity, (d) question answering." },
    { t: "Ensemble", s: "YOLO + Qwen3-VL-4B grounding", img: "images/studio/ensemble.jpg",
      cap: "The ensemble adds a pedestrian and a pole (a class the detector lacks), at the cost of the VLM's generation time." },
    { t: "Low visibility", s: "FLIR, night with fog", img: "images/studio/flir_fog.jpg",
      cap: "Pedestrian and car found through fog; both counting questions answered from the detections in 0.0 s, matching the human labels." },
    { t: "Grounding check", s: "which VLMs still draw boxes", img: "images/studio/grounding_case.jpg",
      cap: "Human boxes (green), YOLO (red) and each fine-tuned VLM's boxes (blue): only Qwen3-VL-4B still localizes objects." },
  ];
  function renderTour() {
    const tabs = $("#tourTabs"); tabs.innerHTML = "";
    TOUR.forEach((x, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(i === 0));
      b.innerHTML = `${esc(x.t)}<span>${esc(x.s)}</span>`;
      b.addEventListener("click", () => {
        $$("button", tabs).forEach((y) => y.setAttribute("aria-selected", String(y === b)));
        $("#tourImg").src = x.img; $("#tourImg").alt = x.cap; $("#tourCap").textContent = x.cap;
      });
      tabs.appendChild(b);
    });
    $("#tourImg").alt = TOUR[0].cap; $("#tourCap").textContent = TOUR[0].cap;
  }

  /* ------------------------------------------------------------ bibtex */
  $("#copyBib").addEventListener("click", async (e) => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText($("#bibtex").textContent); b.textContent = "Copied"; }
    catch (err) { b.textContent = "Select and copy"; }
    setTimeout(() => { b.textContent = "Copy"; }, 1600);
  });

  /* ------------------------------------------------------------ render */
  function renderAll() { renderResults(); renderBias(); renderGround(); renderWeather(); renderPipeline(); }
  findingCards(); renderCases(); renderTour(); renderAll();
  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(renderAll, 150); });
})();
