let bank = [];
const fields = document.getElementById("fields");

chrome.storage.local.get("bank", ({ bank: saved }) => {
  bank = mergeBank(saved);
  bank.forEach((e, i) => {
    const wrap = document.createElement("div");
    const lab = document.createElement("label");
    lab.textContent = e.label;
    const input = document.createElement(e.long ? "textarea" : "input");
    input.value = e.answer || "";
    input.dataset.index = i;
    wrap.append(lab, input);
    fields.appendChild(wrap);
  });
});

document.getElementById("save").addEventListener("click", () => {
  fields.querySelectorAll("[data-index]").forEach(el => {
    bank[Number(el.dataset.index)].answer = el.value.trim();
  });
  chrome.storage.local.set({ bank }, () => {
    document.getElementById("status").textContent = "Saved";
    setTimeout(() => (document.getElementById("status").textContent = ""), 1500);
  });
});
