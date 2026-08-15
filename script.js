function timer() {

    const jetzt = new Date();

    const antrieb = new Date("2026-09-21T09:00:00");
    const nachrichtentechnik = new Date("2026-09-24T13:30:00");

    berechneTimer(antrieb, "timer-antrieb");
    berechneTimer(nachrichtentechnik, "timer-nachrichtentechnik");
}


function berechneTimer(ziel, elementID) {

    const jetzt = new Date();
    const differenz = ziel - jetzt;

    const element = document.getElementById(elementID);

    if (differenz <= 0) {
        element.innerHTML = "Die Klausur hat begonnen!";
        return;
    }

    const tage = Math.floor(differenz / (1000 * 60 * 60 * 24));
    const stunden = Math.floor(
        (differenz / (1000 * 60 * 60)) % 24
    );
    const minuten = Math.floor(
        (differenz / (1000 * 60)) % 60
    );
    const sekunden = Math.floor(
        (differenz / 1000) % 60
    );

    element.innerHTML =
        tage + " Tage " +
        stunden + " Std. " +
        minuten + " Min. " +
        sekunden + " Sek.";
}


timer();

setInterval(timer, 1000);