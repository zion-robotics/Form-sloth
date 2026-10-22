const OLLAMA_URL = "http://127.0.0.1:11434/api/chat";
const MODEL = "gemma3:1b";

const SYSTEM = "You complete web forms for the person described in PROFILE. " +
  "Answer the form question in first person, in plain natural English, in 2 to 4 sentences unless the question clearly needs more or less. " +
  "Use only facts that appear in PROFILE. If PROFILE does not contain enough to answer honestly, reply with exactly SKIP. " +
  "Do not invent achievements, dates, numbers or names. Output only the answer text, with no quotes, no preamble, and no em dashes.";

// Questions worth sending to the model, and fields that should never be drafted.
const QUESTION_LIKE = /\?|describe|explain|why|what|how|tell|share|briefly|idea|interest|experience|achievement|goal/i;
const NEVER_DRAFT = /address|street|postal|zip|province|date|sign|captcha|password/i;

let pending = []; // unknown text fields from the last fill: { frameId, id, label, kind }

document.getElementById("profile").addEventListener("click", () => chrome.runtime.openOptionsPage());

// ---- Injected into the page: must be fully self-contained ----
function fillPage(bank) {
  const norm = s => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const BLOCKED_TYPES = ["password", "hidden", "file", "checkbox", "radio", "submit", "button", "image", "reset"];
  const SENSITIVE = /password|passcode|card number|cvv|cvc|ssn|social security|passport|national id|\bnin\b|\bbvn\b|\bpin\b|\botp\b/;

  function labelFor(el) {
    const parts = [];
    if (el.id) {
      const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (l) parts.push(l.innerText);
    }
    const wrap = el.closest("label");
    if (wrap) parts.push(wrap.innerText);
    parts.push(el.getAttribute("aria-label") || "");
    const lb = el.getAttribute("aria-labelledby");
    if (lb) lb.split(" ").forEach(id => { const n = document.getElementById(id); if (n) parts.push(n.innerText); });
    const item = el.closest('[role="listitem"]');
    if (item) { const h = item.querySelector('[role="heading"]'); if (h) parts.push(h.innerText); }
    parts.push(el.placeholder || "", el.name || "");
    return parts.join(" ");
  }

  function bestEntry(label) {
    let best = null, bestLen = 0;
    for (const entry of bank) {
      for (const phrase of entry.match) {
        const p = norm(phrase);
        if (p.length > bestLen && new RegExp("\\b" + esc(p) + "s?\\b").test(label)) { best = entry; bestLen = p.length; }
      }
    }
    return best;
  }

  function setVal(el, v) {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype
      : el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.style.outline = "2px solid #7c9a5e";
  }

  const result = { filled: [], needAnswer: [], unknown: [] };
  let n = 0;
  function markUnknown(el, shortLabel) {
    n += 1;
    el.setAttribute("data-fs-id", String(n));
    result.unknown.push({ id: n, label: shortLabel, kind: el.tagName === "TEXTAREA" ? "textarea" : el.tagName === "SELECT" ? "select" : "input" });
  }

  document.querySelectorAll("input, textarea, select").forEach(el => {
    if (el.tagName === "INPUT" && BLOCKED_TYPES.includes(el.type)) return;
    if (!el.getClientRects().length || el.disabled || el.readOnly) return;
    const raw = labelFor(el);
    const label = norm(raw);
    if (!label || SENSITIVE.test(label) || SENSITIVE.test(norm(el.autocomplete))) return;
    if (el.tagName !== "SELECT" && el.value.trim() !== "") return; // never overwrite what is already there

    const shortLabel = (raw.split("\n").map(s => s.trim()).filter(Boolean)[0] || label).slice(0, 160);
    const entry = bestEntry(label);
    if (!entry) { markUnknown(el, shortLabel); return; }
    if (!entry.answer) { result.needAnswer.push(entry.label); return; }

    if (el.tagName === "SELECT") {
      const a = norm(entry.answer);
      const opt = [...el.options].find(o => { const t = norm(o.text); return t && (t.includes(a) || a.includes(t)); });
      if (!opt) { markUnknown(el, shortLabel); return; }
      setVal(el, opt.value);
    } else {
      setVal(el, entry.answer);
    }
    result.filled.push(entry.label);
  });
  return result;
}

// ---- Injected into the page: writes the model's drafts into tagged fields ----
function applyAnswers(items) {
  let done = 0;
  items.forEach(it => {
    const el = document.querySelector('[data-fs-id="' + it.id + '"]');
    if (!el || (el.value || "").trim() !== "") return;
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, it.text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.style.outline = "2px dashed #d08a2e"; // dashed orange = drafted by the model, please review
    done += 1;
  });
  return done;
}

async function askGemma(question, profile) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 180000);
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        options: { temperature: 0.3 },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: "PROFILE:\n" + profile + "\n\nFORM QUESTION:\n" + question }
        ]
      })
    });
    if (res.status === 403) throw new Error("Ollama blocked the extension. Set OLLAMA_ORIGINS to chrome-extension://* and restart Ollama.");
    if (res.status === 404) throw new Error("Model not found. Run: ollama pull " + MODEL);
    if (!res.ok) throw new Error("Ollama returned status " + res.status);
    const data = await res.json();
    return ((data.message && data.message.content) || "").trim();
  } catch (err) {
    if (err.name === "AbortError") throw new Error("The model took too long to answer.");
    if (err instanceof TypeError) throw new Error("Cannot reach Ollama. Is the Ollama app running?");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

document.getElementById("fill").addEventListener("click", async () => {
  const out = document.getElementById("out");
  const status = document.getElementById("status");
  const draftBtn = document.getElementById("draft");
  draftBtn.hidden = true;
  status.textContent = "";
  out.textContent = "Working...";
  const { bank: saved } = await chrome.storage.local.get("bank");
  const bank = mergeBank(saved);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    const frames = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: fillPage,
      args: [bank]
    });
    const all = { filled: [], needAnswer: [], unknown: [] };
    pending = [];
    frames.forEach(f => {
      if (!f.result) return;
      all.filled.push(...f.result.filled);
      all.needAnswer.push(...f.result.needAnswer);
      f.result.unknown.forEach(u => {
        all.unknown.push(u.label);
        if (u.kind !== "select" && QUESTION_LIKE.test(u.label) && !NEVER_DRAFT.test(u.label)) {
          pending.push({ ...u, frameId: f.frameId });
        }
      });
    });
    const uniq = a => [...new Set(a)];
    let html = `<b>Filled ${all.filled.length} field(s).</b>`;
    if (all.needAnswer.length) html += `<br>Add these to your profile:<ul>${uniq(all.needAnswer).map(x => `<li>${x}</li>`).join("")}</ul>`;
    if (all.unknown.length) html += `<br>Not in the bank yet:<ul>${uniq(all.unknown).map(x => `<li>${x}</li>`).join("")}</ul>`;
    out.innerHTML = html;
    if (pending.length) {
      draftBtn.textContent = `Draft ${pending.length} question(s) with Gemma`;
      draftBtn.hidden = false;
    }
  } catch (err) {
    out.textContent = "Cannot run on this page (browser pages and the Web Store are blocked).";
  }
});

document.getElementById("draft").addEventListener("click", async () => {
  const status = document.getElementById("status");
  const draftBtn = document.getElementById("draft");
  const { bank: saved } = await chrome.storage.local.get("bank");
  const profile = mergeBank(saved).filter(e => e.answer).map(e => e.label + ": " + e.answer).join("\n");
  if (!profile) { status.textContent = "Your profile is empty. Add some answers first."; return; }

  draftBtn.disabled = true;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const byFrame = {};
  let skipped = 0;
  try {
    for (let i = 0; i < pending.length; i++) {
      const q = pending[i];
      status.textContent = `Drafting ${i + 1} of ${pending.length}. Keep this popup open.`;
      const text = await askGemma(q.label, profile);
      if (!text || /^skip\b/i.test(text)) { skipped += 1; continue; }
      (byFrame[q.frameId] = byFrame[q.frameId] || []).push({ id: q.id, text });
    }
    let applied = 0;
    for (const frameId of Object.keys(byFrame)) {
      const r = await chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [Number(frameId)] },
        func: applyAnswers,
        args: [byFrame[frameId]]
      });
      applied += (r[0] && r[0].result) || 0;
    }
    status.textContent = `Drafted ${applied} answer(s)` + (skipped ? `, skipped ${skipped} the profile could not answer.` : ".") +
      " Review the dashed orange fields before you submit.";
    draftBtn.hidden = true;
  } catch (err) {
    status.textContent = err.message;
  } finally {
    draftBtn.disabled = false;
  }
});