(() => {
  "use strict";
  const data = window.ADHKAR_DATA || [];
  const $ = (id) => document.getElementById(id);
  const categoryGrid = $("categories"), select = $("category-select"), list = $("dhikr-list");
  let activeId = "general";
  let installPrompt = null;
  const counts = new Map();

  function localDateTime() {
    const now = new Date();
    $("clock").textContent = new Intl.DateTimeFormat("ar", {hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true}).format(now);
    $("date").textContent = new Intl.DateTimeFormat("ar", {weekday:"long",year:"numeric",month:"long",day:"numeric"}).format(now);
    const h = now.getHours();
    let id = "general", note = "يمكنك اختيار أي قسم في أي وقت.";
    if (h >= 4 && h < 11) { id = "morning"; note = "اقتراح صباحي بحسب ساعة جهازك، وليس حدًا شرعيًا قاطعًا."; }
    else if (h >= 16 && h < 20) { id = "evening"; note = "اقتراح مسائي بحسب ساعة جهازك، ويمكنك اختيار قسم آخر."; }
    else if (h >= 20 || h < 4) { id = "sleep"; note = "أذكار النوم لمن يستعد للنوم؛ الليل وحده لا يعني أنك تستعد للنوم."; }
    $("suggested").textContent = (data.find(x => x.id === id) || data[0]).title;
    $("suggestion-note").textContent = note;
    $("open-suggested").dataset.target = id;
  }
  function buildCategories() {
    categoryGrid.innerHTML = "";
    select.innerHTML = "";
    data.forEach(cat => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "category-card";
      button.dataset.id = cat.id;
      button.innerHTML = `<span class="category-icon" aria-hidden="true">${cat.icon}</span><strong>${cat.title}</strong><small>${cat.items.length} أذكار</small>`;
      button.addEventListener("click", () => showCategory(cat.id, true));
      categoryGrid.appendChild(button);
      const option = document.createElement("option");
      option.value = cat.id; option.textContent = cat.title;
      select.appendChild(option);
    });
    $("count-label").textContent = `${data.length} أقسام · مجموعة أولية`;
  }
  function showCategory(id, scroll) {
    const cat = data.find(x => x.id === id);
    if (!cat) return;
    activeId = id; select.value = id;
    $("section-title").textContent = cat.title;
    $("section-desc").textContent = cat.description;
    categoryGrid.querySelectorAll(".category-card").forEach(b => b.classList.toggle("active", b.dataset.id === id));
    list.innerHTML = "";
    cat.items.forEach((item, i) => {
      const key = `${cat.id}-${i}`;
      if (!counts.has(key)) counts.set(key, 0);
      const card = document.createElement("article");
      card.className = "dhikr-card";
      const top = document.createElement("div"); top.className = "dhikr-top";
      top.innerHTML = `<span class="dhikr-index">${i+1}</span><span class="kind">${item.kind}</span>`;
      const text = document.createElement("p"); text.className = "dhikr-text"; text.textContent = item.text;
      const source = document.createElement("div"); source.className = "source";
      source.innerHTML = `<strong>المصدر:</strong> ${escapeHtml(item.source)} <br><strong>عدد التكرار المقترح:</strong> ${item.count} ${item.count === 1 ? "مرة" : "مرات"}`;
      const progress = document.createElement("div"); progress.className = "progress";
      const bar = document.createElement("span"); progress.appendChild(bar);
      const actions = document.createElement("div"); actions.className = "card-actions";
      const copy = document.createElement("button"); copy.className = "small-btn"; copy.type = "button"; copy.textContent = "نسخ الذكر";
      copy.addEventListener("click", () => copyText(item.text));
      const reset = document.createElement("button"); reset.className = "small-btn"; reset.type = "button"; reset.textContent = "إعادة";
      const counter = document.createElement("div"); counter.className = "counter";
      const value = document.createElement("span"); value.className = "counter-value";
      const decrement = document.createElement("button"); decrement.className = "small-btn"; decrement.type = "button"; decrement.textContent = "−"; decrement.setAttribute("aria-label","إنقاص العدّاد");
      const increment = document.createElement("button"); increment.className = "count-btn"; increment.type = "button"; increment.textContent = "+";
      const done = document.createElement("span"); done.className = "done-label";
      function refresh() {
        const n = counts.get(key) || 0;
        value.textContent = `${n} / ${item.count}`;
        bar.style.width = `${Math.min(100, n / item.count * 100)}%`;
        done.textContent = n >= item.count ? "اكتمل ✓" : "";
        increment.disabled = n >= item.count;
        decrement.disabled = n <= 0;
      }
      increment.addEventListener("click", () => { counts.set(key, Math.min(item.count, (counts.get(key)||0)+1)); refresh(); if ((counts.get(key)||0) === item.count) { done.textContent = "اكتمل ✓"; } });
      decrement.addEventListener("click", () => { counts.set(key, Math.max(0, (counts.get(key)||0)-1)); refresh(); });
      reset.addEventListener("click", () => { counts.set(key, 0); refresh(); });
      counter.append(decrement, value, increment);
      actions.append(copy, reset, counter, done);
      card.append(top, text, source, progress, actions);
      list.appendChild(card);
      refresh();
    });
    if (scroll) $("reader").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const area = document.createElement("textarea"); area.value = text; area.style.position = "fixed"; area.style.opacity = "0";
        document.body.appendChild(area); area.select();
        const ok = document.execCommand("copy"); area.remove();
        if (!ok) throw new Error("copy failed");
      }
      toast("تم نسخ الذكر");
    } catch { toast("تعذّر النسخ تلقائيًا؛ اضغط مطولًا على النص لنسخه."); }
  }
  let toastTimer;
  function toast(message) {
    const el = $("toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }
  select.addEventListener("change", () => showCategory(select.value, false));
  $("open-suggested").addEventListener("click", e => showCategory(e.currentTarget.dataset.target, true));
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; $("install-btn").hidden = false; });
  $("install-btn").addEventListener("click", async () => {
    if (!installPrompt) { toast("للتثبيت، افتح قائمة المتصفح ثم اختر إضافة إلى الشاشة الرئيسية."); return; }
    installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $("install-btn").hidden = true;
  });
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
  }
  buildCategories(); localDateTime(); setInterval(localDateTime, 1000); showCategory("general", false);
})();