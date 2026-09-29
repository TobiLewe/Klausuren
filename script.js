// ==========================================
// EINSTELLUNG
// ==========================================

let modus = "tage";


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

    });
