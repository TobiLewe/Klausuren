// ==========================================
// EINSTELLUNG
// ==========================================

let modus = "tage";


// ==========================================
// KLAUSURTERMINE
// ==========================================

// Bereits geschriebene Klausur

const elektromVertraeglichkeit =
    new Date("2026-07-21T14:00:00");


// ==========================================
// TIMER
// ==========================================

function timer() {

    berechneVergangenTimer(
        elektromVertraeglichkeit,
        "timer-elektrom"
    );

}


// ==========================================
// ZEIT SEIT DER KLAUSUR
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

    if (!element) {
        return;
    }


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


    // Alte Klassen entfernen

    element.classList.remove(
        "tage-modus",
        "wochen-modus"
    );


    // Aktuellen Modus setzen

    if (modus === "tage") {

        element.classList.add(
            "tage-modus"
        );

    } else {

        element.classList.add(
            "wochen-modus"
        );
    }


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

    // ======================================
    // TAGE-MODUS
    // ======================================

    if (modus === "tage") {

        return (
            tage + " Tage " +
            stunden + " Std. " +
            minuten + " Min. " +
            sekunden + " Sek."
        );
    }


    // ======================================
    // WOCHEN-MODUS
    // ======================================

    const wochen =
        Math.floor(tage / 7);

    const restTage =
        tage % 7;

    let text = "";


    if (wochen === 1) {

        text += "1 Woche ";

    } else {

        text += wochen + " Wochen ";
    }


    if (restTage === 1) {

        text += "1 Tag ";

    } else {

        text += restTage + " Tage ";
    }


    text +=
        stunden + " Std. " +
        minuten + " Min. " +
        sekunden + " Sek.";


    return text;
}


// ==========================================
// TAGE-BUTTON
// ==========================================

document
    .getElementById("tage-button")
    .addEventListener("click", function () {

        modus = "tage";


        document
            .getElementById("tage-button")
            .classList.add("aktiv");


        document
            .getElementById("wochen-button")
            .classList.remove("aktiv");


        timer();

    });


// ==========================================
// WOCHEN-BUTTON
// ==========================================

document
    .getElementById("wochen-button")
    .addEventListener("click", function () {

        modus = "wochen";


        document
            .getElementById("wochen-button")
            .classList.add("aktiv");


        document
            .getElementById("tage-button")
            .classList.remove("aktiv");


        timer();

    });


// ==========================================
// TIMER STARTEN
// ==========================================

timer();


// ==========================================
// JEDE SEKUNDE AKTUALISIEREN
// ==========================================

setInterval(
    timer,
    1000
);
