// ==========================================
// NEUES SEMESTER – EXCEL-IMPORT + TIMER
// ==========================================

const semesterStart = new Date("2026-10-05T00:00:00");

const typInfo = {
    P: { label: "Praktikum", className: "typ-p" },
    V: { label: "Vorlesung", className: "typ-v" },
    Ü: { label: "Übung", className: "typ-u" },
    S: { label: "Seminar", className: "typ-s" }
};

const fileInput = document.getElementById("excel-file");
const uploadStatus = document.getElementById("upload-status");
const uploadError = document.getElementById("upload-error");
const stundenplanBereich = document.getElementById("stundenplan-bereich");
const emptyState = document.getElementById("empty-state");

function semesterTimer() {
    const jetzt = new Date();
    const differenz = semesterStart - jetzt;
    const element = document.getElementById("semester-countdown");

    if (!element) return;

    if (differenz <= 0) {
        element.textContent = "Das neue Semester hat begonnen!";
        element.classList.add("begonnen");
        return;
    }

    element.classList.remove("begonnen");

    const tage = Math.floor(differenz / (1000 * 60 * 60 * 24));
    const stunden = Math.floor((differenz / (1000 * 60 * 60)) % 24);
    const minuten = Math.floor((differenz / (1000 * 60)) % 60);
    const sekunden = Math.floor((differenz / 1000) % 60);

    element.innerHTML = `
        <span>${tage}<small>Tage</small></span>
        <span>${String(stunden).padStart(2, "0")}<small>Std.</small></span>
        <span>${String(minuten).padStart(2, "0")}<small>Min.</small></span>
        <span>${String(sekunden).padStart(2, "0")}<small>Sek.</small></span>
    `;
}

function cleanCell(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

function isTimeValue(value) {
    const text = cleanCell(value);
    return /^\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}$/.test(text);
}

function findHeaderRow(rows) {
    return rows.findIndex(row => {
        if (!Array.isArray(row) || row.length < 2) return false;
        return cleanCell(row[0]).toLowerCase() === "zeit" &&
            cleanCell(row[1]).toLowerCase() === "montag";
    });
}

function normalizeTime(value) {
    return cleanCell(value).replace(/\s*[–-]\s*/g, "–");
}

function parseWorkbook(workbook) {
    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error("Die Excel-Datei enthält kein Tabellenblatt.");
    }

    // Das erste Tabellenblatt wird als Wochenplan verwendet.
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        raw: false,
        blankrows: true
    });

    if (!rows.length) {
        throw new Error("Das erste Tabellenblatt ist leer.");
    }

    const headerIndex = findHeaderRow(rows);
    if (headerIndex === -1) {
        throw new Error(
            'Die Tabelle konnte nicht erkannt werden. Es wird eine Zeile mit "Zeit | Montag | Dienstag | Mittwoch | Donnerstag | Freitag" erwartet.'
        );
    }

    const header = rows[headerIndex].slice(0, 6).map(cleanCell);
    const days = header.slice(1, 6);

    if (days.length !== 5 || days.some(day => !day)) {
        throw new Error("Die Wochentage Montag bis Freitag konnten nicht vollständig erkannt werden.");
    }

    const title = cleanCell(rows[0]?.[0]) || "Stundenplan";
    const subtitle = cleanCell(rows[1]?.[0]);
    const rowsOut = [];
    let legend = "";
    let source = "";

    for (let i = headerIndex + 1; i < rows.length; i++) {
        const row = rows[i] || [];
        const first = cleanCell(row[0]);

        if (!first) continue;

        if (first.toLowerCase().startsWith("legende:")) {
            legend = first;
            continue;
        }

        if (first.toLowerCase().startsWith("quelle:")) {
            source = first;
            continue;
        }

        // Nur Zeitzeilen gehören zum eigentlichen Stundenplan.
        if (!isTimeValue(first)) continue;

        rowsOut.push({
            time: normalizeTime(first),
            cells: days.map((_, dayIndex) => cleanCell(row[dayIndex + 1]))
        });
    }

    if (!rowsOut.length) {
        throw new Error("Es wurden keine Zeitzeilen im Stundenplan gefunden.");
    }

    return {
        title,
        subtitle,
        days,
        rows: rowsOut,
        legend,
        source
    };
}

function parseCourse(raw) {
    if (!raw.trim()) return null;

    // Erwartetes Format:
    // Code Kursname (Typ, PG) · Raum: Raumname
    const match = raw.match(/^(.+?)\s+\((P|V|Ü|S),\s*([^)]*)\)\s*·\s*Raum:\s*(.+)$/s);

    if (!match) {
        return {
            code: "",
            name: raw.trim(),
            type: "",
            group: "",
            room: ""
        };
    }

    const left = match[1].trim();
    const firstSpace = left.indexOf(" ");

    return {
        code: firstSpace > 0 ? left.slice(0, firstSpace) : left,
        name: firstSpace > 0 ? left.slice(firstSpace + 1) : "",
        type: match[2],
        group: match[3].trim(),
        room: match[4].trim()
    };
}

function createCourseCard(raw) {
    const course = parseCourse(raw);
    if (!course) return "";

    const info = typInfo[course.type] || {
        label: course.type || "Kurs",
        className: "typ-default"
    };

    return `
        <article class="kurskarte ${info.className}">
            <div class="kurs-topline">
                <span class="kurs-code">${escapeHtml(course.code)}</span>
                ${course.type ? `<span class="kurs-typ">${escapeHtml(info.label)}</span>` : ""}
            </div>
            <div class="kurs-name">${escapeHtml(course.name)}</div>
            <div class="kurs-meta">
                ${course.group ? `<span class="kurs-gruppe">${escapeHtml(course.group)}</span>` : ""}
                ${course.room ? `<span class="kurs-raum">▣ ${escapeHtml(course.room)}</span>` : ""}
            </div>
        </article>`;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderLegende(defaultLegend = "") {
    const legende = document.getElementById("legende");
    const footerNote = document.getElementById("footer-note");
    if (!legende) return;

    const entries = [
        ["P", "Praktikum"],
        ["V", "Vorlesung"],
        ["Ü", "Übung"],
        ["S", "Seminar"]
    ];

    legende.innerHTML = entries.map(([short, label]) => `
        <span class="legend-item ${typInfo[short].className}">
            <span class="legend-dot"></span>${short} = ${label}
        </span>
    `).join("");

    if (footerNote) {
        footerNote.textContent = defaultLegend || "Legende: P = Praktikum · V = Vorlesung · Ü = Übung · S = Seminar";
    }
}

function renderStundenplan(plan) {
    const head = document.getElementById("stundenplan-head");
    const body = document.getElementById("stundenplan-body");
    if (!head || !body) return;

    head.innerHTML = `
        <tr>
            <th scope="col" class="zeitkopf">Zeit</th>
            ${plan.days.map(day => `<th scope="col">${escapeHtml(day)}</th>`).join("")}
        </tr>`;

    body.innerHTML = plan.rows.map(row => {
        const cells = row.cells.map((cell, cellIndex) => {
            if (!cell) {
                return `<td class="leer" aria-label="Keine Veranstaltung"></td>`;
            }

            const courses = cell
                .split(/\n\s*\n+/)
                .map(createCourseCard)
                .filter(Boolean)
                .join("");

            return `<td data-day="${escapeHtml(plan.days[cellIndex])}">${courses}</td>`;
        }).join("");

        return `
            <tr>
                <th scope="row" class="uhrzeit">${escapeHtml(row.time)}</th>
                ${cells}
            </tr>`;
    }).join("");
}

function showPlan(plan, fileName) {
    const title = document.getElementById("plan-title");
    const subtitle = document.getElementById("plan-subtitle");
    const kicker = document.getElementById("plan-kicker");
    const source = document.getElementById("footer-source");

    if (title) title.textContent = plan.title;
    if (subtitle) subtitle.textContent = plan.subtitle || "";
    if (kicker) kicker.textContent = `${plan.rows.length} Zeitzeilen · ${plan.days.join(" · ")}`;

    renderLegende(plan.legend);
    renderStundenplan(plan);

    if (source) {
        source.textContent = plan.source || `Geladen aus: ${fileName}`;
    }

    stundenplanBereich.hidden = false;
    emptyState.hidden = true;
}

function showError(message) {
    uploadError.textContent = message;
    uploadError.hidden = false;
    stundenplanBereich.hidden = true;
    emptyState.hidden = false;
    emptyState.querySelector("h2").textContent = "Excel-Datei konnte nicht geladen werden";
    emptyState.querySelector("p").textContent = "Prüfe das Tabellenformat oder wähle eine andere Datei aus.";
}

function clearError() {
    uploadError.textContent = "";
    uploadError.hidden = true;
    emptyState.querySelector("h2").textContent = "Dein Stundenplan wartet";
    emptyState.querySelector("p").textContent = "Lade oben deine Excel-Datei hoch, damit hier automatisch der komplette Wochenplan erscheint.";
}

async function loadExcelFile(file) {
    clearError();

    if (!file) return;

    if (typeof XLSX === "undefined") {
        showError("Die Excel-Bibliothek konnte nicht geladen werden. Prüfe deine Internetverbindung oder binde SheetJS lokal ein.");
        return;
    }

    uploadStatus.textContent = `Lese „${file.name}“ …`;
    uploadStatus.classList.add("loading");

    try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const plan = parseWorkbook(workbook);

        showPlan(plan, file.name);
        uploadStatus.textContent = `✓ „${file.name}“ erfolgreich geladen`;
        uploadStatus.classList.remove("loading");
        uploadStatus.classList.add("success");
    } catch (error) {
        uploadStatus.textContent = `Fehler beim Laden: ${file.name}`;
        uploadStatus.classList.remove("loading");
        uploadStatus.classList.remove("success");
        showError(error instanceof Error ? error.message : "Die Excel-Datei konnte nicht verarbeitet werden.");
    }
}

if (fileInput) {
    fileInput.addEventListener("change", event => {
        const file = event.target.files?.[0];
        loadExcelFile(file);
    });
}

semesterTimer();
setInterval(semesterTimer, 1000);
