(() => {
  const semesterStart = new Date("2026-10-05T00:00:00");
  const excelFileName = "Stundenplan.xlsx";

  // ==========================================================
  // SUPABASE – ZENTRALER ÖFFENTLICHER SPEICHER
  // Jeder darf die gemeinsamen Ansichten ansehen, speichern,
  // ändern und löschen. Der Publishable Key ist für Browser-
  // Code vorgesehen; die Rechte werden über Supabase/RLS
  // gesteuert.
  // ==========================================================
  const SUPABASE_URL = "https://taborotlsgsgghrwhdga.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_TGk8R6DLn81v_WVMuGXP2w_mednCgaY";
  const supabaseClient = window.supabase?.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    : null;

  const SAVED_VIEWS_TABLE = "gespeicherte_ansichten";
  const typInfo = {
    P: { label: "Praktikum", className: "typ-p" },
    V: { label: "Vorlesung", className: "typ-v" },
    Ü: { label: "Übung", className: "typ-u" },
    S: { label: "Seminar", className: "typ-s" }
  };

  function semesterTimer() {
    const el = document.getElementById("semester-countdown");
    if (!el) return;
    const diff = semesterStart - new Date();
    if (diff <= 0) {
      el.textContent = "Das neue Semester hat begonnen!";
      el.classList.add("begonnen");
      return;
    }
    el.classList.remove("begonnen");
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff / 3600000) % 24);
    const m = Math.floor((diff / 60000) % 60);
    const s = Math.floor((diff / 1000) % 60);
    el.innerHTML = `<span>${d}<small>Tage</small></span><span>${String(h).padStart(2,"0")}<small>Std.</small></span><span>${String(m).padStart(2,"0")}<small>Min.</small></span><span>${String(s).padStart(2,"0")}<small>Sek.</small></span>`;
  }

  function esc(v) {
    return String(v ?? "")
      .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
      .replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }

  function clean(v) { return String(v ?? "").replace(/\r\n/g,"\n").replace(/\r/g,"\n").trim(); }
  function isTime(v) { return /^\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}$/.test(clean(v)); }

  function normalizeModuleName(name) {
    const n = clean(name);
    const lower = n.toLocaleLowerCase("de-DE");

    // Kleine Vereinheitlichungen aus dem offiziellen Stundenplan,
    // damit Vorlesung, Übung und Praktikum desselben Moduls gemeinsam gefiltert werden.
    if (lower.includes("algorithmen") && lower.includes("datenstrukt")) {
      return "Algorithmen und Datenstrukturen";
    }

    return n;
  }

  function parseCourse(raw) {
    raw = clean(raw);
    if (!raw) return null;
    const m = raw.match(/^(.+?)\s+\((P|V|Ü|S),\s*([^)]*)\)\s*·\s*Raum:\s*(.+)$/s);
    if (!m) return {code:"",name:raw,type:"",group:"",room:""};
    const left = m[1].trim();
    const p = left.indexOf(" ");
    return {
      code: p > 0 ? left.slice(0,p) : left,
      name: p > 0 ? left.slice(p+1) : "",
      type: m[2], group: m[3].trim(), room: m[4].trim()
    };
  }

  function card(raw) {
    const c = parseCourse(raw);
    if (!c) return "";
    const info = typInfo[c.type] || {label:c.type || "Kurs", className:"typ-default"};
    const pg = c.group ? `<span class="kurs-gruppe">${esc(c.group.replace("PG","").trim())} PG</span>` : "";
    const room = c.room ? `<span class="kurs-raum">Raum ${esc(c.room)}</span>` : "";
    const moduleName = normalizeModuleName(c.name);
    return `<article class="kurskarte ${info.className}" data-modul="${esc(moduleName)}">
      <div class="kurs-topline"><span class="kurs-code">${esc(c.code)}</span>${c.type ? `<span class="kurs-typ">${esc(info.label)}</span>` : ""}</div>
      <div class="kurs-name">${esc(c.name)}</div>
      <div class="kurs-meta">${pg}${room}</div>
    </article>`;
  }

  function collectModulesFromDom() {
    const modules = new Set();
    document.querySelectorAll(".kurskarte").forEach(cardEl => {
      const nameEl = cardEl.querySelector(".kurs-name");
      const moduleName = normalizeModuleName(cardEl.dataset.modul || nameEl?.textContent || "");
      if (moduleName) {
        cardEl.dataset.modul = moduleName;
        modules.add(moduleName);
      }
    });
    return [...modules].sort((a, b) => a.localeCompare(b, "de-DE"));
  }

  const MAX_SELECTED_MODULES = 6;
  let selectedModules = [];

  async function getSavedViews() {
    if (!supabaseClient) {
      console.error("Supabase ist nicht verfügbar.");
      return [];
    }

    const { data, error } = await supabaseClient
      .from(SAVED_VIEWS_TABLE)
      .select("id, name, module, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Fehler beim Laden der gespeicherten Ansichten:", error);
      return [];
    }

    return (data || []).map(view => ({
      id: view.id,
      name: clean(view.name),
      modules: Array.isArray(view.module) ? view.module.map(clean).filter(Boolean) : []
    }));
  }

  function updateModuleFilterButton() {
    const label = document.getElementById("modul-filter-label");
    const count = document.getElementById("modul-filter-count");
    const reset = document.getElementById("modul-filter-reset");
    const options = document.querySelectorAll("#modul-filter-options input[type='checkbox']");

    if (label) {
      if (selectedModules.length === 0) label.textContent = "Alle Module";
      else if (selectedModules.length === 1) label.textContent = selectedModules[0];
      else label.textContent = `${selectedModules.length} Module ausgewählt`;
    }

    if (count) count.textContent = `${selectedModules.length}/${MAX_SELECTED_MODULES} ausgewählt`;
    if (reset) reset.disabled = selectedModules.length === 0;

    options.forEach(input => {
      input.disabled = selectedModules.length >= MAX_SELECTED_MODULES && !input.checked;
      input.closest("label")?.classList.toggle("deaktiviert", input.disabled);
    });

    const saveButton = document.getElementById("ansicht-speichern");
    if (saveButton) saveButton.disabled = selectedModules.length === 0;
  }

  function closeModuleFilter() {
    const menu = document.getElementById("modul-filter-menu");
    const toggle = document.getElementById("modul-filter-toggle");
    if (!menu || !toggle) return;
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.classList.remove("offen");
  }

  function closeSavedViews() {
    const menu = document.getElementById("ansichten-menu");
    const toggle = document.getElementById("ansichten-toggle");
    if (!menu || !toggle) return;
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.classList.remove("offen");
  }

  async function renderSavedViews() {
    const list = document.getElementById("ansichten-list");
    const count = document.getElementById("ansichten-count");
    if (!list) return;

    list.innerHTML = `<div class="ansichten-empty">Lade gespeicherte Ansichten …</div>`;
    const views = await getSavedViews();
    if (count) count.textContent = String(views.length);

    list.innerHTML = views.length
      ? views.map(view => {
          const modules = view.modules.map(m => clean(m)).filter(Boolean).slice(0, MAX_SELECTED_MODULES);
          const summary = modules.length === 1 ? modules[0] : `${modules.length} Module`;
          return `
            <div class="ansicht-item">
              <button type="button" class="ansicht-laden" data-view-id="${esc(view.id)}" title="Ansicht laden">
                <span class="ansicht-icon" aria-hidden="true">✓</span>
                <span class="ansicht-info">
                  <strong>${esc(view.name)}</strong>
                  <small>${esc(summary)}</small>
                </span>
              </button>
              <button type="button" class="ansicht-loeschen" data-view-id="${esc(view.id)}" title="Ansicht löschen" aria-label="Ansicht ${esc(view.name)} löschen">×</button>
            </div>`;
        }).join("")
      : `<div class="ansichten-empty">Noch keine Ansichten gespeichert.</div>`;
  }

  async function saveCurrentView() {
    if (!selectedModules.length || !supabaseClient) return;

    const name = window.prompt("Name für diese Ansicht:", "Meine Ansicht");
    if (name === null) return;

    const trimmed = clean(name).slice(0, 50);
    if (!trimmed) return;

    const saveButton = document.getElementById("ansicht-speichern");
    if (saveButton) saveButton.disabled = true;

    try {
      const { data: existing, error: findError } = await supabaseClient
        .from(SAVED_VIEWS_TABLE)
        .select("id")
        .eq("name", trimmed)
        .order("created_at", { ascending: true })
        .limit(1);

      if (findError) throw findError;

      if (existing && existing.length) {
        const { error: updateError } = await supabaseClient
          .from(SAVED_VIEWS_TABLE)
          .update({ module: [...selectedModules].slice(0, MAX_SELECTED_MODULES) })
          .eq("id", existing[0].id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabaseClient
          .from(SAVED_VIEWS_TABLE)
          .insert({
            name: trimmed,
            module: [...selectedModules].slice(0, MAX_SELECTED_MODULES)
          });
        if (insertError) throw insertError;
      }

      await renderSavedViews();
    } catch (error) {
      console.error("Fehler beim Speichern der Ansicht:", error);
      window.alert("Die Ansicht konnte nicht gespeichert werden. Bitte prüfe die Supabase-Einstellungen.");
    } finally {
      updateModuleFilterButton();
    }
  }

  async function loadSavedView(id) {
    if (!supabaseClient) return;

    const { data: view, error } = await supabaseClient
      .from(SAVED_VIEWS_TABLE)
      .select("id, name, module")
      .eq("id", id)
      .maybeSingle();

    if (error || !view) {
      console.error("Fehler beim Laden der Ansicht:", error);
      return;
    }

    const available = collectModulesFromDom();
    const modules = (Array.isArray(view.module) ? view.module : [])
      .map(clean)
      .filter(module => available.includes(module))
      .slice(0, MAX_SELECTED_MODULES);

    selectedModules = modules;
    populateModuleFilter();
    closeSavedViews();
  }

  async function deleteSavedView(id) {
    if (!supabaseClient) return;

    const confirmed = window.confirm("Diese gespeicherte Ansicht wirklich löschen? Sie wird für alle Besucher gelöscht.");
    if (!confirmed) return;

    const { error } = await supabaseClient
      .from(SAVED_VIEWS_TABLE)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Fehler beim Löschen der Ansicht:", error);
      window.alert("Die Ansicht konnte nicht gelöscht werden.");
      return;
    }

    await renderSavedViews();
  }

  function populateModuleFilter() {
    const optionsWrap = document.getElementById("modul-filter-options");
    if (!optionsWrap) return;

    const modules = collectModulesFromDom();
    selectedModules = selectedModules.filter(module => modules.includes(module)).slice(0, MAX_SELECTED_MODULES);

    optionsWrap.innerHTML = modules.length
      ? modules.map((module, index) => `
          <button type="button" class="modul-option" data-modul-value="${esc(module)}" aria-pressed="${selectedModules.includes(module) ? "true" : "false"}">
            <span class="modul-check" aria-hidden="true"></span>
            <span class="modul-option-text">${esc(module)}</span>
          </button>
        `).join("")
      : `<div class="modul-option-empty">Keine Module gefunden</div>`;

    optionsWrap.querySelectorAll(".modul-option[data-modul-value]").forEach(option => {
      // Kein natives Focus-Scrolling innerhalb der Liste: Die geöffnete
      // Auswahlansicht darf beim Anklicken niemals nachspringen.
      option.addEventListener("mousedown", event => event.preventDefault());
      option.addEventListener("click", event => {
        event.preventDefault();
        const value = clean(option.dataset.modulValue);
        const optionsScroll = optionsWrap.scrollTop;

        if (!selectedModules.includes(value)) {
          if (selectedModules.length >= MAX_SELECTED_MODULES) return;
          selectedModules.push(value);
          option.setAttribute("aria-pressed", "true");
        } else {
          selectedModules = selectedModules.filter(module => module !== value);
          option.setAttribute("aria-pressed", "false");
        }

        applyModuleFilter(selectedModules);

        // Browser-Reflow durch die veränderte Tabelle darf die Modulliste
        // weder scrollen noch deren sichtbaren Ausschnitt verändern.
        requestAnimationFrame(() => {
          optionsWrap.scrollTop = optionsScroll;
        });
      });
    });

    updateModuleFilterButton();
    applyModuleFilter(selectedModules);
  }

  function applyModuleFilter(modules) {
    const selected = (Array.isArray(modules) ? modules : [])
      .map(clean)
      .filter(Boolean)
      .slice(0, MAX_SELECTED_MODULES);

    document.querySelectorAll(".stundenplan tbody td").forEach(cell => {
      const cards = [...cell.querySelectorAll(".kurskarte")];
      if (!cards.length) {
        cell.classList.add("leer");
        return;
      }

      let visibleCount = 0;
      cards.forEach(cardEl => {
        const cardModule = normalizeModuleName(cardEl.dataset.modul || cardEl.querySelector(".kurs-name")?.textContent || "");
        const matches = selected.length === 0 || selected.includes(cardModule);
        cardEl.hidden = !matches;
        if (matches) visibleCount += 1;
      });

      cell.classList.toggle("leer", visibleCount === 0);
    });

    selectedModules = selected;
    updateModuleFilterButton();
  }

  function initModuleFilter() {
    const toggle = document.getElementById("modul-filter-toggle");
    const menu = document.getElementById("modul-filter-menu");
    const reset = document.getElementById("modul-filter-reset");
    const wrapper = document.querySelector(".modul-select");
    const optionsWrap = document.getElementById("modul-filter-options");
    if (!toggle || !menu || !wrapper) return;

    toggle.addEventListener("click", event => {
      event.stopPropagation();
      closeSavedViews();
      const open = menu.hidden;
      menu.hidden = !open;
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.classList.toggle("offen", open);
      if (open && optionsWrap) {
        optionsWrap.scrollTop = 0;
      }
    });

    reset?.addEventListener("click", event => {
      event.stopPropagation();
      const menuScroll = optionsWrap ? optionsWrap.scrollTop : 0;
      selectedModules = [];
      optionsWrap?.querySelectorAll(".modul-option[aria-pressed='true']").forEach(option => option.setAttribute("aria-pressed", "false"));
      applyModuleFilter([]);
      requestAnimationFrame(() => {
        if (optionsWrap) optionsWrap.scrollTop = menuScroll;
      });
    });

    menu.addEventListener("click", event => event.stopPropagation());
  }

  function initSavedViews() {
    const toggle = document.getElementById("ansichten-toggle");
    const menu = document.getElementById("ansichten-menu");
    const save = document.getElementById("ansicht-speichern");
    const list = document.getElementById("ansichten-list");
    if (!toggle || !menu || !save || !list) return;

    toggle.addEventListener("click", event => {
      event.stopPropagation();
      closeModuleFilter();
      const open = menu.hidden;
      menu.hidden = !open;
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.classList.toggle("offen", open);
      if (open) renderSavedViews();
    });

    save.addEventListener("click", event => {
      event.stopPropagation();
      saveCurrentView();
    });

    list.addEventListener("click", event => {
      event.stopPropagation();
      const loadButton = event.target.closest(".ansicht-laden");
      const deleteButton = event.target.closest(".ansicht-loeschen");
      if (loadButton) loadSavedView(Number(loadButton.dataset.viewId));
      if (deleteButton) deleteSavedView(Number(deleteButton.dataset.viewId));
    });

    menu.addEventListener("click", event => event.stopPropagation());
    renderSavedViews();
  }

  document.addEventListener("click", () => {
    closeModuleFilter();
    closeSavedViews();
  });

  function parseWorkbook(workbook) {
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {header:1, defval:"", raw:false, blankrows:true});
    const headerIndex = rows.findIndex(r => clean(r[0]).toLowerCase()==="zeit" && clean(r[1]).toLowerCase()==="montag");
    if (headerIndex < 0) throw new Error('Keine Kopfzeile "Zeit | Montag | Dienstag | Mittwoch | Donnerstag | Freitag" gefunden.');
    const header = rows[headerIndex].slice(0,6).map(clean);
    const days = header.slice(1,6);
    const planRows = [];
    let title = clean(rows[0]?.[0]) || "Stundenplan";
    let subtitle = clean(rows[1]?.[0]);
    let legendText = "", sourceText = "";
    for (let i=headerIndex+1; i<rows.length; i++) {
      const r = rows[i] || [];
      const first = clean(r[0]);
      if (!first) continue;
      if (first.toLowerCase().startsWith("legende:")) { legendText=first; continue; }
      if (first.toLowerCase().startsWith("quelle:")) { sourceText=first; continue; }
      if (!isTime(first)) continue;
      planRows.push({time:first, cells:days.map((_,j)=>clean(r[j+1]))});
    }
    if (!planRows.length) throw new Error("Keine Zeitzeilen gefunden.");
    return {title,subtitle,days,rows:planRows,legend:legendText,source:sourceText};
  }

  function render(plan) {
    const titleEl = document.getElementById("plan-title");
    if (titleEl) titleEl.textContent = plan.title;
    const head = document.getElementById("stundenplan-head");
    head.innerHTML = `<tr><th scope="col" class="zeitkopf">Zeit</th>${plan.days.map(d=>`<th scope="col">${esc(d)}</th>`).join("")}</tr>`;
    document.getElementById("stundenplan-body").innerHTML = plan.rows.map(r => `<tr>
      <th scope="row" class="uhrzeit">${esc(r.time)}</th>
      ${r.cells.map(c=>c ? `<td>${c.split(/\n\s*\n+/).map(card).join("")}</td>` : '<td class="leer"></td>').join("")}
    </tr>`).join("");
    populateModuleFilter();
  }

  async function autoLoadExcel() {
    const status = document.getElementById("excel-status");
    if (!status) return;

    if (typeof XLSX === "undefined") {
      status.textContent = "Excel-Bibliothek nicht verfügbar – die vorhandene Stundenplanansicht bleibt sichtbar.";
      status.className = "excel-status-line warning";
      return;
    }

    try {
      const url = new URL(excelFileName, document.baseURI);
      url.searchParams.set("v", Date.now());
      const response = await fetch(url.href, {cache:"no-store"});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const workbook = XLSX.read(await response.arrayBuffer(), {type:"array"});
      render(parseWorkbook(workbook));
      status.textContent = "✓ Stundenplan.xlsx erfolgreich geladen";
      status.className = "excel-status-line success";
    } catch (err) {
      console.warn("Excel-Abgleich:", err);
      status.textContent = "Hinweis: Stundenplan.xlsx konnte gerade nicht geladen werden – die vorhandene Ansicht bleibt sichtbar.";
      status.className = "excel-status-line warning";
    }
  }

  // ==========================================================
  // TOUCH-ZOOM FÜR TABLET / HANDY
  // Kein sichtbares Bedienelement auf Desktop oder Webansicht.
  // Zwei-Finger-Pinch direkt auf der Tabelle skaliert die Ansicht.
  // ==========================================================
  function initTouchZoom() {
    const target = document.querySelector(".stundenplan-zoom-target");
    const container = document.querySelector(".tabelle-container");
    if (!target || !container) return;

    let scale = 1;
    let startDistance = 0;
    let startScale = 1;
    let pinching = false;
    let baseWidth = 0;
    let baseHeight = 0;

    const isTouchDevice = () => window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;

    function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

    function refreshSize() {
      const table = target.querySelector(".stundenplan");
      if (!table) return;
      baseWidth = table.getBoundingClientRect().width / scale;
      baseHeight = table.getBoundingClientRect().height / scale;
      target.style.width = `${baseWidth * scale}px`;
      target.style.height = `${baseHeight * scale}px`;
      target.style.transform = `scale(${scale})`;
      target.style.transformOrigin = "top left";
    }

    function distance(a, b) {
      const dx = a.clientX - b.clientX;
      const dy = a.clientY - b.clientY;
      return Math.hypot(dx, dy);
    }

    function applyScale(nextScale, centerX, centerY) {
      const oldScale = scale;
      scale = clamp(nextScale, 0.5, 1);
      if (Math.abs(scale - oldScale) < 0.001) return;

      // Halte beim Pinch ungefähr denselben Punkt unter den Fingern.
      const rect = container.getBoundingClientRect();
      const xRatio = (centerX - rect.left + container.scrollLeft) / Math.max(1, baseWidth * oldScale);
      const yRatio = (centerY - rect.top + container.scrollTop) / Math.max(1, baseHeight * oldScale);

      refreshSize();

      container.scrollLeft = Math.max(0, xRatio * baseWidth * scale - (centerX - rect.left));
      container.scrollTop = Math.max(0, yRatio * baseHeight * scale - (centerY - rect.top));
    }

    // Erst nach dem Layout messen, damit Excel-Inhalte und Fallbacktabelle gleichermaßen funktionieren.
    requestAnimationFrame(() => {
      if (!isTouchDevice()) return;
      baseWidth = target.querySelector(".stundenplan")?.getBoundingClientRect().width || 0;
      baseHeight = target.querySelector(".stundenplan")?.getBoundingClientRect().height || 0;
      target.style.transformOrigin = "top left";
      target.style.willChange = "transform";
      refreshSize();
    });

    container.addEventListener("touchstart", (event) => {
      if (!isTouchDevice() || event.touches.length !== 2) return;
      pinching = true;
      startDistance = distance(event.touches[0], event.touches[1]);
      startScale = scale;
    }, { passive: true });

    container.addEventListener("touchmove", (event) => {
      if (!pinching || event.touches.length !== 2 || !startDistance) return;
      event.preventDefault();
      const currentDistance = distance(event.touches[0], event.touches[1]);
      const factor = currentDistance / startDistance;
      const nextScale = startScale * factor;
      const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
      applyScale(nextScale, centerX, centerY);
    }, { passive: false });

    container.addEventListener("touchend", (event) => {
      if (event.touches.length < 2) {
        pinching = false;
        startDistance = 0;
      }
    }, { passive: true });

    window.addEventListener("resize", () => {
      if (!isTouchDevice()) return;
      requestAnimationFrame(refreshSize);
    });

    // Nach dem Excel-Rendering wird die Größe noch einmal sauber ermittelt.
    setTimeout(() => {
      if (!isTouchDevice()) return;
      baseWidth = target.querySelector(".stundenplan")?.getBoundingClientRect().width / scale || baseWidth;
      baseHeight = target.querySelector(".stundenplan")?.getBoundingClientRect().height / scale || baseHeight;
      refreshSize();
    }, 500);
  }

  semesterTimer();
  setInterval(semesterTimer,1000);
  window.addEventListener("load", () => {
    initModuleFilter();
    initSavedViews();
    initTouchZoom();
    populateModuleFilter();
    autoLoadExcel();
  });
})();
