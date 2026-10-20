document.getElementById("profile").addEventListener("click", () => chrome.runtime.openOptionsPage());

// This function is injected into the page, so it must be fully self-contained.
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
        if (p.length > bestLen && new RegExp("\\b" + esc(p) + "\\b").test(label)) { best = entry; bestLen = p.length; }
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
  document.querySelectorAll("input, textarea, select").forEach(el => {
    if (el.tagName === "INPUT" && BLOCKED_TYPES.includes(el.type)) return;
    if (!el.getClientRects().length || el.disabled || el.readOnly) return;
    const raw = labelFor(el);
    const label = norm(raw);
    if (!label || SENSITIVE.test(label) || SENSITIVE.test(norm(el.autocomplete))) return;
    if (el.tagName !== "SELECT" && el.value.trim() !== "") return; // never overwrite what is already there

    const shortLabel = (raw.split("\n").map(s => s.trim()).filter(Boolean)[0] || label).slice(0, 80);
    const entry = bestEntry(label);
    if (!entry) { result.unknown.push(shortLabel); return; }
    if (!entry.answer) { result.needAnswer.push(entry.label); return; }

    if (el.tagName === "SELECT") {
      const a = norm(entry.answer);
      const opt = [...el.options].find(o => { const t = norm(o.text); return t && (t.includes(a) || a.includes(t)); });
      if (!opt) { result.unknown.push(shortLabel); return; }
      setVal(el, opt.value);
    } else {
      setVal(el, entry.answer);
    }
    result.filled.push(entry.label);
  });
  return result;
}

document.getElementById("fill").addEventListener("click", async () => {
  const out = document.getElementById("out");
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
    frames.forEach(f => f.result && Object.keys(all).forEach(k => all[k].push(...f.result[k])));
    const uniq = a => [...new Set(a)];
    let html = `<b>Filled ${all.filled.length} field(s).</b>`;
    if (all.needAnswer.length) html += `<br>Add these to your profile:<ul>${uniq(all.needAnswer).map(x => `<li>${x}</li>`).join("")}</ul>`;
    if (all.unknown.length) html += `<br>Not in the bank yet:<ul>${uniq(all.unknown).map(x => `<li>${x}</li>`).join("")}</ul>`;
    out.innerHTML = html;
  } catch (err) {
    out.textContent = "Cannot run on this page (browser pages and the Web Store are blocked).";
  }
});
