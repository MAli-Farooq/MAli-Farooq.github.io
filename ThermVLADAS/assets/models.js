/* ThermVLADAS model cards: Hugging Face links + copyable loading code. Numbers from final-test-results. */
(function () {
  "use strict";
  const grid = document.getElementById("modelGrid");
  if (!grid) return;
  const HF = "https://huggingface.co/MAli-Farooq/";
  const MODELS = [
    { repo: "ThermVLADAS-Qwen3-VL-4B-QLoRA", name: "Qwen3-VL-4B", kind: "vlm", size: "75 MB", top1: 55.6, dual: 61.3, badge: "Recommended",
      text: "Best adapted model on unseen LYNRED and the only one that keeps box grounding, so it also works as a VLM object finder in the ensemble." },
    { repo: "ThermVLADAS-Qwen2.5-VL-7B-QLoRA", name: "Qwen2.5-VL-7B", kind: "vlm", size: "102 MB", top1: 52.3, dual: 60.1,
      text: "Largest gain over its zero-shot base (+17.5 points Top-1); partial box grounding." },
    { repo: "ThermVLADAS-Gemma-3-4B-QLoRA", name: "Gemma-3-4B", kind: "vlm", size: "101 MB", top1: 54.0, dual: 61.3,
      text: "Compact 4B model with strong presence accuracy (82.2 %); ties for the best dual-pathway score." },
    { repo: "ThermVLADAS-Pixtral-12B-QLoRA", name: "Pixtral-12B", kind: "vlm", size: "143 MB", top1: 53.5, dual: 60.5,
      text: "Largest backbone in the release; +10.6 points Top-1 over its zero-shot base." },
    { repo: "ThermVLADAS-YOLOv8n-Thermal", name: "YOLOv8n thermal detector", kind: "det", size: "6 MB", badge: "Dual pathway",
      text: "Classes person, bicycle, car and dog. Answers count and presence questions in about 0.1 s; precision 82–90 %, recall 36–40 % on LYNRED." },
    { repo: null, name: "Llama-3.2-11B-Vision", kind: "vlm", size: "130 MB", top1: 50.6, dual: 60.0, badge: "Not released",
      text: "Evaluated in the paper, not released because of the Llama 3.2 licence terms for the EU. Reproducible with the training notebook." },
  ];
  const vlmCode = (r) => `from unsloth import FastVisionModel
from PIL import Image

model, tok = FastVisionModel.from_pretrained("MAli-Farooq/${r}", load_in_4bit=True)
FastVisionModel.for_inference(model)

img = Image.open("thermal_frame.png").convert("RGB")
msgs = [{"role": "user", "content": [{"type": "image"},
         {"type": "text", "text": "How many people are visible in this thermal image?"}]}]
inputs = tok(img, tok.apply_chat_template(msgs, add_generation_prompt=True),
             add_special_tokens=False, return_tensors="pt").to("cuda")
out = model.generate(**inputs, max_new_tokens=64, do_sample=False)
print(tok.decode(out[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True))`;
  const detCode = (r) => `from huggingface_hub import hf_hub_download
from ultralytics import YOLO

weights = hf_hub_download("MAli-Farooq/${r}", "flir_yolov8n_finetuned.pt")
model = YOLO(weights)
result = model.predict("thermal_frame.png", conf=0.40, iou=0.50)[0]
print({model.names[int(c)]: int((result.boxes.cls == c).sum()) for c in result.boxes.cls.unique()})`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const code = document.getElementById("mcCode"), title = document.getElementById("mcName");

  function select(m, card) {
    grid.querySelectorAll(".model-card").forEach((c) => c.classList.toggle("on", c === card));
    title.textContent = m.repo;
    code.textContent = m.kind === "det" ? detCode(m.repo) : vlmCode(m.repo);
  }

  MODELS.forEach((m, i) => {
    const card = document.createElement("article");
    card.className = "model-card" + (m.repo ? "" : " off");
    const stats = m.kind === "vlm"
      ? `<div class="model-stats"><div><b>${m.top1.toFixed(1)}%</b><span>Top-1, adapter</span></div><div><b>${m.dual.toFixed(1)}%</b><span>Top-1, dual</span></div><div><b>${esc(m.size)}</b><span>download</span></div></div>`
      : `<div class="model-stats"><div><b>50.9%</b><span>Top-1, alone</span></div><div><b>0.1&nbsp;s</b><span>per frame</span></div><div><b>${esc(m.size)}</b><span>download</span></div></div>`;
    const actions = m.repo
      ? `<a class="btn small primary" href="${HF}${m.repo}" target="_blank" rel="noopener">Hugging Face <span aria-hidden="true">&#8599;</span></a><button class="btn small" type="button" data-code>Show code</button>`
      : `<a class="btn small" href="https://github.com/MAli-Farooq/ThermVLADAS" target="_blank" rel="noopener">Train it yourself <span aria-hidden="true">&#8599;</span></a>`;
    card.innerHTML = `<div class="model-top">${m.badge ? `<span class="tag">${esc(m.badge)}</span>` : ""}<span class="model-kind">${m.kind === "det" ? "Detector" : "QLoRA adapter"}</span></div>
      <h3>${esc(m.name)}</h3><p>${esc(m.text)}</p>${stats}<div class="model-actions">${actions}</div>`;
    const btn = card.querySelector("[data-code]");
    if (btn) btn.addEventListener("click", () => { select(m, card); document.querySelector(".model-code").scrollIntoView({ behavior: "smooth", block: "nearest" }); });
    grid.appendChild(card);
    if (i === 0) select(m, card);
  });

  document.getElementById("mcCopy").addEventListener("click", async (e) => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText(code.textContent); b.textContent = "Copied"; }
    catch (err) { b.textContent = "Select and copy"; }
    setTimeout(() => { b.textContent = "Copy"; }, 1600);
  });
})();
