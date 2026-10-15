(() => {
  "use strict";

  const TABLE = "klausuren";
  const DAY_MS = 24 * 60 * 60 * 1000;
  let modus = "tage";
  let klausuren = [];

  const byId = (id) => document.getElementById(id);

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""))) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(date) {
    return date.toLocaleDateString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric"
    });
  }

  function todayAtMidnight() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function relativeText(dayDifference) {
    if (dayDifference === 0) return "Heute";
    const isPast = dayDifference < 0;
    const days = Math.abs(dayDifference);
    if (modus === "tage" || days < 7) {
      if (isPast) return days === 1 ? "Vor 1 Tag" : `Vor ${days} Tagen`;
      return days === 1 ? "Noch 1 Tag" : `Noch ${days} Tage`;
    }
    const weeks = Math.floor(days / 7);
    const remainder = days % 7;
    const weekText = weeks === 1 ? "1 Woche" : `${weeks} Wochen`;
    let duration = weekText;
    if (remainder) duration += remainder === 1 ? " und 1 Tag" : ` und ${remainder} Tage`;
    return isPast ? `Vor ${duration}` : `Noch ${duration}`;
  }

  function renderCard(item, date, dayDifference) {
    const details = [`Datum: ${formatDate(date)}`];
    if (item.exam_time) details.push(`Uhrzeit: ${String(item.exam_time)}`);
    if (item.location) details.push(`Ort: ${String(item.location)}`);
    const description = item.description
      ? `<p class="klausur-details">${escapeHtml(item.description)}</p>`
      : "";
    const isPast = dayDifference < 0;
    const countdownClass = isPast ? "klausur-countdown abgelaufen" : "klausur-countdown";

    return `<article class="klausur">
      <h2>${escapeHtml(item.title)}</h2>
      <p class="klausur-details">${details.map(escapeHtml).join("\n")}</p>
      ${description}
      <p class="${countdownClass}">${escapeHtml(relativeText(dayDifference))}</p>
    </article>`;
  }

  function render() {
    const pastWrap = byId("vergangene-klausuren");
    const upcomingWrap = byId("kommende-klausuren");
    const pastEmpty = byId("vergangene-leer");
    const upcomingEmpty = byId("kommende-leer");
    if (!pastWrap || !upcomingWrap) return;

    const today = todayAtMidnight();
    const valid = klausuren.map(item => ({ item, date: parseDate(item.exam_date) }))
      .filter(entry => entry.date)
      .sort((a, b) => a.date - b.date || Number(a.item.sort_order ?? 0) - Number(b.item.sort_order ?? 0));
    const past = [];
    const upcoming = [];

    for (const entry of valid) {
      const diff = Math.round((entry.date.getTime() - today.getTime()) / DAY_MS);
      const html = renderCard(entry.item, entry.date, diff);
      if (diff < 0) past.push({ html, time: entry.date.getTime() });
      else upcoming.push({ html, time: entry.date.getTime() });
    }

    pastWrap.innerHTML = past.sort((a, b) => b.time - a.time).map(x => x.html).join("");
    upcomingWrap.innerHTML = upcoming.sort((a, b) => a.time - b.time).map(x => x.html).join("");
    if (pastEmpty) pastEmpty.hidden = past.length > 0;
    if (upcomingEmpty) upcomingEmpty.hidden = upcoming.length > 0;
  }

  async function loadKlausuren() {
    const status = byId("klausuren-status");
    if (!window.studiumSupabaseClient) {
      if (status) {
        status.hidden = false;
        status.textContent = "Die Datenbankverbindung konnte nicht initialisiert werden. Bitte prüfe die Supabase-Konfiguration.";
      }
      render();
      return;
    }

    const { data, error } = await window.studiumSupabaseClient
      .from(TABLE)
      .select("id, title, description, exam_date, exam_time, location, sort_order")
      .order("exam_date", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Klausuren konnten nicht geladen werden:", error);
      if (status) {
        status.hidden = false;
        status.textContent = "Klausuren konnten nicht aus der Datenbank geladen werden. Prüfe, ob database-setup.sql in Supabase ausgeführt wurde.";
      }
      klausuren = [];
      render();
      return;
    }

    klausuren = Array.isArray(data) ? data : [];
    if (status) status.hidden = true;
    render();
  }

  byId("tage-button")?.addEventListener("click", () => {
    modus = "tage";
    byId("tage-button")?.classList.add("aktiv");
    byId("wochen-button")?.classList.remove("aktiv");
    byId("tage-button")?.setAttribute("aria-pressed", "true");
    byId("wochen-button")?.setAttribute("aria-pressed", "false");
    render();
  });

  byId("wochen-button")?.addEventListener("click", () => {
    modus = "wochen";
    byId("wochen-button")?.classList.add("aktiv");
    byId("tage-button")?.classList.remove("aktiv");
    byId("wochen-button")?.setAttribute("aria-pressed", "true");
    byId("tage-button")?.setAttribute("aria-pressed", "false");
    render();
  });

  loadKlausuren();
})();
