function timer() {

    const jetzt = new Date();

    // ==========================================
    // BEREITS GESCHRIEBENE KLAUSUREN
    // ==========================================

    const elektromVertraeglichkeit =
        new Date("2026-07-21T14:00:00");

    const regelungstechnik2 =
        new Date("2026-07-23T11:00:00");

    const digitaltechnik =
        new Date("2026-07-27T12:00:00");


    // ==========================================
    // KOMMENDE KLAUSUREN
    // ==========================================

    const antrieb =
        new Date("2026-09-21T09:00:00");

    const nachrichtentechnik =
        new Date("2026-09-24T13:30:00");


    // ==========================================
    // TIMER DER GESCHRIEBENEN KLAUSUREN
    // ==========================================

    berechneVergangenTimer(
        elektromVertraeglichkeit,
        "timer-elektrom"
    );

    berechneVergangenTimer(
        regelungstechnik2,
        "timer-regelung"
    );

    berechneVergangenTimer(
        digitaltechnik,
        "timer-digital"
    );


    // ==========================================
    // TIMER DER KOMMENDEN KLAUSUREN
    // ==========================================

    berechneTimer(
        antrieb,
        "timer-antrieb"
    );

    berechneTimer(
        nachrichtentechnik,
        "timer-nachrichtentechnik"
    );
}


// ==========================================
// COUNTDOWN BIS ZUR KLAUSUR
// ==========================================

function berechneTimer(ziel, elementID) {

    const jetzt = new Date();

    const differenz = ziel - jetzt;

    const element =
        document.getElementById(elementID);


    if (differenz <= 0) {

        element.innerHTML =
            "Die Klausur hat begonnen!";

        return;
    }


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


    element.innerHTML =
        tage + " Tage " +
        stunden + " Std. " +
        minuten + " Min. " +
        sekunden + " Sek.";
}


// ==========================================
// TIMER SEIT DER KLAUSUR
// ==========================================

function berechneVergangenTimer(
    start,
    elementID
) {

    const jetzt = new Date();

    const differenz =
        jetzt - start;

    const element =
        document.getElementById(elementID);


    if (differenz < 0) {

        element.innerHTML =
            "Noch nicht geschrieben";

        return;
    }


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


    element.innerHTML =
        "vor " +
        tage + " Tage " +
        stunden + " Std. " +
        minuten + " Min. " +
        sekunden + " Sek.";
}


// ==========================================
// TIMER STARTEN
// ==========================================

timer();


// Jede Sekunde aktualisieren
setInterval(timer, 1000);
