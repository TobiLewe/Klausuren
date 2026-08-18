// ==========================================
// AKTUELLER MODUS
// ==========================================

// "tage" oder "wochen"
let modus = "tage";


// ==========================================
// TIMER
// ==========================================

function timer() {

    // Bereits geschriebene Klausuren
    const elektromVertraeglichkeit =
        new Date("2026-07-21T14:00:00");

    const regelungstechnik2 =
        new Date("2026-07-23T11:00:00");

    const digitaltechnik =
        new Date("2026-07-27T12:00:00");


    // Kommende Klausuren
    const antrieb =
        new Date("2026-09-21T09:00:00");

    const nachrichtentechnik =
        new Date("2026-09-24T13:30:00");


    // Vergangene Klausuren
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


    // Kommende Klausuren
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
// TIMER BIS ZUR KLAUSUR
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
        formatiereZeit(
            tage,
            stunden,
            minuten,
            sekunden
        );
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
        formatiereZeit(
            tage,
            stunden,
            minuten,
            sekunden
        );
}


// ==========================================
// ZEIT FORMATIEREN
// ==========================================

function formatiereZeit(
    tage,
    stunden,
    minuten,
    sekunden
) {

    // ------------------------------
    // TAGE-MODUS
    // ------------------------------

    if (modus === "tage") {

        return (
            tage + " Tage " +
            stunden + " Std. " +
            minuten + " Min. " +
            sekunden + " Sek."
        );
    }


    // ------------------------------
    // WOCHEN-MODUS
    // ------------------------------

    const wochen =
        Math.floor(tage / 7);

    const restTage =
        tage % 7;


    let text = "";


    if (wochen === 1) {
        text += "1 Woche ";
    }
    else {
        text += wochen + " Wochen ";
    }


    if (restTage === 1) {
        text += "1 Tag ";
    }
    else {
        text += restTage + " Tage ";
    }


    text +=
        stunden + " Std. " +
        minuten + " Min. " +
        sekunden + " Sek.";


    return text;
}


// ==========================================
// MODUS WECHSELN
// ==========================================

function setModus(neuerModus) {

    modus = neuerModus;


    const tageButton =
        document.getElementById("tage-button");

    const wochenButton =
        document.getElementById("wochen-button");


    // Aktiven Button markieren

    if (modus === "tage") {

        tageButton.classList.add("aktiv");
        wochenButton.classList.remove("aktiv");

    }
    else {

        wochenButton.classList.add("aktiv");
        tageButton.classList.remove("aktiv");

    }


    // Timer sofort neu berechnen
    timer();
}


// ==========================================
// START
// ==========================================

timer();


// Jede Sekunde aktualisieren
setInterval(timer, 1000);
