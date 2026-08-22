// ==========================================
// START DES NEUEN SEMESTERS
// ==========================================

const semesterStart =
    new Date("2026-10-05T00:00:00");


// ==========================================
// COUNTDOWN
// ==========================================

function semesterTimer() {

    const jetzt = new Date();

    const differenz =
        semesterStart - jetzt;

    const element =
        document.getElementById("semester-countdown");


    // Wenn das Semester bereits begonnen hat

    if (differenz <= 0) {

        element.innerHTML =
            "Das neue Semester hat begonnen!";

        return;
    }


    // Zeit berechnen

    const tage = Math.floor(
        differenz /
        (1000 * 60 * 60 * 24)
    );

    const stunden = Math.floor(
        (differenz /
        (1000 * 60 * 60)) % 24
    );

    const minuten = Math.floor(
        (differenz /
        (1000 * 60)) % 60
    );

    const sekunden = Math.floor(
        (differenz /
        1000) % 60
    );


    // Anzeige

    element.innerHTML =
        tage + " Tage " +
        stunden + " Std. " +
        minuten + " Min. " +
        sekunden + " Sek.";
}


// Timer sofort starten

semesterTimer();


// Jede Sekunde aktualisieren

setInterval(semesterTimer, 1000);
