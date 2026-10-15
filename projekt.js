(() => {
    'use strict';

    const client = window.studiumSupabaseClient;
    const loginPanel = document.getElementById('projekt-anmeldung');
    const loginForm = document.getElementById('projekt-login-form');
    const loginPassword = document.getElementById('projekt-login-passwort');
    const loginButton = document.getElementById('projekt-login-button');
    const loginStatus = document.getElementById('projekt-login-status');
    const projectArea = document.getElementById('projekt-bereich');
    const signOutButton = document.getElementById('projekt-abmelden');
    const form = document.getElementById('projekt-formular');
    const submitButton = document.getElementById('projekt-absenden');
    const list = document.getElementById('projektideen-liste');
    const formStatus = document.getElementById('projekt-form-status');
    const slotsStatus = document.getElementById('projekt-plaetze-status');
    const fullStatus = document.getElementById('projekt-eigene-idee-status');

    const TOTAL_SLOTS = 6;
    let currentIdeas = [];
    let accessPassword = '';
    let isSaving = false;
    let isLoading = false;

    const el = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = text;
        return node;
    };

    function setLoginStatus(message, isError = false) {
        loginStatus.textContent = message;
        loginStatus.classList.toggle('fehler', isError);
    }

    function setFormStatus(message, isError = false) {
        formStatus.textContent = message;
        formStatus.classList.toggle('fehler', isError);
    }

    function setLoggedOut(message = '') {
        accessPassword = '';
        currentIdeas = [];
        isSaving = false;
        isLoading = false;
        projectArea.hidden = true;
        loginPanel.hidden = false;
        loginForm.reset();
        form.reset();
        formStatus.textContent = '';
        fullStatus.textContent = '';
        fullStatus.hidden = true;
        submitButton.disabled = false;
        for (const field of form.querySelectorAll('input, textarea')) field.disabled = false;
        loginButton.disabled = false;
        loginButton.textContent = 'Projektseite öffnen';
        setLoginStatus(message, Boolean(message));
        list.replaceChildren();
    }

    function setLoadingState(loading) {
        isLoading = loading;
        loginButton.disabled = loading;
        loginButton.textContent = loading ? 'Wird geprüft …' : 'Projektseite öffnen';
    }

    function updateFormState() {
        const filledSlots = new Set(currentIdeas.map(idea => Number(idea.slot_number)));
        const remaining = Math.max(0, TOTAL_SLOTS - filledSlots.size);
        slotsStatus.textContent = `${remaining} von ${TOTAL_SLOTS} Plätzen frei`;
        const full = remaining <= 0;

        form.hidden = full;
        fullStatus.hidden = !full;
        fullStatus.textContent = full
            ? 'Alle sechs Plätze sind bereits belegt. Neue Einreichungen sind nicht möglich.'
            : '';

        submitButton.disabled = full || isSaving || isLoading;
        submitButton.textContent = full
            ? 'Alle Plätze belegt'
            : isSaving
                ? 'Wird gespeichert …'
                : 'Idee speichern';

        for (const field of form.querySelectorAll('input, textarea')) {
            field.disabled = full || isSaving || isLoading;
        }
    }

    function renderIdeas() {
        list.replaceChildren();
        const ideasBySlot = new Map(currentIdeas.map(idea => [Number(idea.slot_number), idea]));

        for (let slot = 1; slot <= TOTAL_SLOTS; slot += 1) {
            const idea = ideasBySlot.get(slot);
            if (!idea) {
                const card = el('article', 'projekt-idee-leer');
                card.append(
                    el('strong', '', `Platz ${slot}`),
                    el('span', '', 'Noch keine Idee eingetragen.')
                );
                list.append(card);
                continue;
            }

            const card = el('article', 'projekt-idee-karte');
            const header = el('div', 'projekt-idee-kopf');
            header.append(
                el('span', 'projekt-platz', `PLATZ ${slot}`),
                el('span', 'projekt-idee-status', 'Eingereicht')
            );
            card.append(
                header,
                el('h3', '', idea.title),
                el('p', 'projekt-idee-person', `Von ${idea.person_name}`),
                el('p', 'projekt-idee-beschreibung', idea.description)
            );

            list.append(card);
        }
        updateFormState();
    }

    async function fetchIdeas(password) {
        return client.rpc('get_projektideen', { p_password: password });
    }

    async function loadIdeas(quiet = false) {
        if (!client || !accessPassword || isLoading || isSaving) return;

        const { data, error } = await fetchIdeas(accessPassword);
        if (error) {
            if (!quiet) {
                list.replaceChildren();
                list.append(el('p', 'projekt-ladehinweis', 'Die Projektideen konnten nicht geladen werden.'));
                setFormStatus('Die Datenbankabfrage ist fehlgeschlagen. Prüfe die SQL-Konfiguration und ob das Gruppenpasswort noch gültig ist.', true);
            }
            if (String(error.message || '').toLowerCase().includes('passwort')) {
                setLoggedOut('Die Passwortprüfung ist fehlgeschlagen. Bitte gib das Gruppenpasswort erneut ein.');
            }
            return;
        }

        currentIdeas = Array.isArray(data) ? data : [];
        renderIdeas();
        if (!quiet) {
            if (currentIdeas.length === 0) {
                setFormStatus('Noch ist keine Idee eingetragen. Du kannst den ersten Vorschlag einreichen.');
            } else if (currentIdeas.length < TOTAL_SLOTS) {
                setFormStatus('Die Projektideen werden gemeinsam angezeigt. Bitte tragt möglichst jeweils nur eine Idee pro Person ein.');
            } else {
                setFormStatus('Alle sechs Projektplätze sind belegt.');
            }
        }
    }

    loginForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (!client || isLoading) {
            setLoginStatus('Die Verbindung zu Supabase ist nicht verfügbar. Bitte prüfe die Konfiguration und lade die Seite erneut.', true);
            return;
        }

        const password = String(new FormData(loginForm).get('password') || '');
        if (!password) {
            setLoginStatus('Bitte das Gruppenpasswort eingeben.', true);
            return;
        }

        setLoadingState(true);
        setLoginStatus('Passwort wird geprüft …');
        const { data, error } = await fetchIdeas(password);
        setLoadingState(false);

        if (error) {
            const message = String(error.message || '');
            loginPassword.value = '';
            if (message.toLowerCase().includes('noch nicht eingerichtet')) {
                setLoginStatus('Das Gruppenpasswort wurde in Supabase noch nicht eingerichtet. Folge der README-Anleitung.', true);
            } else if (message.toLowerCase().includes('passwort')) {
                setLoginStatus('Das Gruppenpasswort ist falsch. Bitte versuche es erneut.', true);
            } else if (error.code === 'PGRST202' || error.code === '42883') {
                setLoginStatus('Die Datenbankfunktionen fehlen. Führe das aktualisierte database-setup.sql in Supabase aus.', true);
            } else {
                setLoginStatus('Die Prüfung ist fehlgeschlagen. Kontrolliere das SQL-Skript in Supabase und versuche es erneut.', true);
            }
            return;
        }

        // Passwort nur im Arbeitsspeicher halten; kein localStorage, sessionStorage oder Cookie.
        accessPassword = password;
        currentIdeas = Array.isArray(data) ? data : [];
        loginForm.reset();
        loginPanel.hidden = true;
        projectArea.hidden = false;
        setLoginStatus('');
        renderIdeas();
        if (currentIdeas.length === 0) {
            setFormStatus('Noch ist keine Idee eingetragen. Du kannst den ersten Vorschlag einreichen.');
        } else if (currentIdeas.length < TOTAL_SLOTS) {
            setFormStatus('Die Projektideen werden gemeinsam angezeigt.');
        } else {
            setFormStatus('Alle sechs Projektplätze sind belegt.');
        }
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!client || !accessPassword || isSaving || isLoading) return;

        const formData = new FormData(form);
        const personName = String(formData.get('person_name') || '').trim();
        const title = String(formData.get('title') || '').trim();
        const description = String(formData.get('description') || '').trim();

        if (!personName || !title || !description) {
            setFormStatus('Bitte fülle deinen Namen, den Titel und die Beschreibung aus.', true);
            return;
        }
        if (currentIdeas.length >= TOTAL_SLOTS) {
            setFormStatus('Alle sechs Plätze sind bereits belegt.', true);
            updateFormState();
            return;
        }

        isSaving = true;
        updateFormState();
        setFormStatus('Deine Idee wird geprüft und gespeichert …');

        const { data, error } = await client.rpc('submit_projektidee', {
            p_password: accessPassword,
            p_person_name: personName,
            p_title: title,
            p_description: description
        });
        isSaving = false;

        if (error) {
            const message = String(error.message || '');
            await loadIdeas(true);
            if (message.toLowerCase().includes('bereits eine idee') || message.toLowerCase().includes('dieser name')) {
                setFormStatus('Für diesen Namen wurde bereits eine Idee eingetragen. Bitte prüfe die bestehende Liste.', true);
            } else if (message.toLowerCase().includes('alle sechs plätze')) {
                setFormStatus('Inzwischen sind alle sechs Plätze belegt. Die Liste wurde aktualisiert.', true);
            } else if (message.toLowerCase().includes('passwort')) {
                setLoggedOut('Die Passwortprüfung ist fehlgeschlagen. Bitte gib das Gruppenpasswort erneut ein.');
            } else if (error.code === 'PGRST202' || error.code === '42883') {
                setFormStatus('Die Datenbankfunktionen fehlen. Führe das aktualisierte database-setup.sql in Supabase aus.', true);
            } else {
                setFormStatus('Die Idee konnte nicht gespeichert werden. Bitte prüfe deine Eingaben und versuche es erneut.', true);
            }
            updateFormState();
            return;
        }

        const inserted = Array.isArray(data) ? data[0] : data;
        form.reset();
        await loadIdeas(true);
        renderIdeas();
        setFormStatus(`Deine Idee wurde auf Platz ${inserted?.slot_number || 'einem freien Platz'} gespeichert.`);
    });

    signOutButton.addEventListener('click', () => {
        setLoggedOut('Der Projektbereich wurde gesperrt. Beim nächsten Öffnen musst du das Gruppenpasswort erneut eingeben.');
    });

    if (!client) {
        loginButton.disabled = true;
        setLoginStatus('Die Supabase-Konfiguration konnte nicht geladen werden. Bitte prüfe supabase-config.js und die Verbindung.', true);
    }

    setLoggedOut();

    // Beim Verlassen der Seite Passwort und Inhalte aus dem sichtbaren Zustand entfernen.
    window.addEventListener('pagehide', () => {
        accessPassword = '';
        projectArea.hidden = true;
        loginPanel.hidden = false;
        currentIdeas = [];
        list.replaceChildren();
        form.reset();
        formStatus.textContent = '';
        fullStatus.textContent = '';
        fullStatus.hidden = true;
        loginForm.reset();
    });

    window.setInterval(() => {
        if (accessPassword && !isSaving && !isLoading) loadIdeas(true);
    }, 20000);
})();
