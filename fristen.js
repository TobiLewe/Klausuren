(() => {
    "use strict";

    const TABLE = "fristen";
    const DAY_MS = 24 * 60 * 60 * 1000;

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

    function countdownText(dueDate) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const days = Math.round((dueDate.getTime() - today.getTime()) / DAY_MS);
        if (days < 0) {
            const late = Math.abs(days);
            return { text: late === 1 ? "Seit 1 Tag abgelaufen" : `Seit ${late} Tagen abgelaufen`, className: "abgelaufen" };
        }
        if (days === 0) return { text: "Frist endet heute", className: "heute" };
        if (days === 1) return { text: "Noch 1 Tag", className: "" };
        return { text: `Noch ${days} Tage`, className: "" };
    }

    function renderCard(item) {
        const dueDate = parseDate(item.due_date);
        if (!dueDate || !item.title) return "";
        const startDate = item.start_date ? parseDate(item.start_date) : null;
        const shownDate = startDate
            ? `${formatDate(startDate)} bis ${formatDate(dueDate)}`
            : formatDate(dueDate);
        const countdown = countdownText(dueDate);
        const category = item.category || "Frist";
        const description = item.description || "";

        return `<article class="frist-karte">
            <div class="frist-kopf">
                <span class="platzhalter-markierung">${escapeHtml(category)}</span>
            </div>
            <h2>${escapeHtml(item.title)}</h2>
            <p class="frist-beschreibung">${escapeHtml(description)}</p>
            <div class="frist-fuss">
                <div class="frist-datum-block">
                    <span>Fristdatum</span>
                    <strong>${escapeHtml(shownDate)}</strong>
                </div>
                <p class="frist-countdown ${escapeHtml(countdown.className)}" aria-live="polite">${escapeHtml(countdown.text)}</p>
            </div>
        </article>`;
    }

    async function loadFristen() {
        const list = document.getElementById("fristen-liste");
        const status = document.getElementById("fristen-status");
        if (!list || !status) return;

        if (!window.studiumSupabaseClient) {
            status.textContent = "Die Datenbankverbindung konnte nicht initialisiert werden. Bitte prüfe die Supabase-Konfiguration.";
            return;
        }

        const { data, error } = await window.studiumSupabaseClient
            .from(TABLE)
            .select("id, title, description, category, start_date, due_date, sort_order")
            .order("due_date", { ascending: true })
            .order("sort_order", { ascending: true });

        if (error) {
            console.error("Fristen konnten nicht geladen werden:", error);
            status.textContent = "Fristen konnten nicht aus der Datenbank geladen werden. Prüfe, ob database-setup.sql in Supabase ausgeführt wurde.";
            return;
        }

        const cards = (Array.isArray(data) ? data : []).map(renderCard).filter(Boolean);
        list.innerHTML = cards.join("");
        if (cards.length === 0) {
            status.textContent = "Aktuell sind keine Fristen eingetragen.";
            return;
        }
        status.hidden = true;
    }

    loadFristen();
})();
