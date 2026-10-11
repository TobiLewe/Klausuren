// ==========================================
/* Countdown für die Fristenkarten.
   Die Termine in fristen.html sind derzeit nur Platzhalter. */
// ==========================================

function aktualisiereFristen() {
    const jetzt = new Date();
    const heute = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate());

    document.querySelectorAll(".frist-karte[data-date]").forEach((karte) => {
        const datum = karte.dataset.date;
        const fristDatum = new Date(`${datum}T00:00:00`);
        const countdown = karte.querySelector(".frist-countdown");

        if (!countdown || Number.isNaN(fristDatum.getTime())) {
            return;
        }

        const tageDifferenz = Math.round((fristDatum.getTime() - heute.getTime()) / 86400000);

        countdown.classList.remove("abgelaufen", "heute");

        if (tageDifferenz < 0) {
            const tageZuSpaet = Math.abs(tageDifferenz);
            countdown.textContent = tageZuSpaet === 1
                ? "Seit 1 Tag abgelaufen"
                : `Seit ${tageZuSpaet} Tagen abgelaufen`;
            countdown.classList.add("abgelaufen");
        } else if (tageDifferenz === 0) {
            countdown.textContent = "Frist endet heute";
            countdown.classList.add("heute");
        } else if (tageDifferenz === 1) {
            countdown.textContent = "Noch 1 Tag";
        } else {
            countdown.textContent = `Noch ${tageDifferenz} Tage`;
        }
    });
}

aktualisiereFristen();
