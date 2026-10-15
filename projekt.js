(() => {
    const client = window.studiumSupabaseClient;
    const form = document.getElementById('projekt-formular');
    const submitButton = document.getElementById('projekt-absenden');
    const list = document.getElementById('projektideen-liste');
    const formStatus = document.getElementById('projekt-form-status');
    const slotsStatus = document.getElementById('projekt-plaetze-status');

    const TOTAL_SLOTS = 6;
    let currentIdeas = [];
    let isSaving = false;

    const el = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = text;
        return node;
    };

    function setFormStatus(message, isError = false) {
        formStatus.textContent = message;
        formStatus.classList.toggle('fehler', isError);
    }

    function updateFormState() {
        const filledSlots = new Set(currentIdeas.map(idea => Number(idea.slot_number)));
        const remaining = TOTAL_SLOTS - filledSlots.size;
        slotsStatus.textContent = `${remaining} von ${TOTAL_SLOTS} Plätzen frei`;
        const full = remaining <= 0;
        submitButton.disabled = full || isSaving || !client;
        if (full) {
            submitButton.textContent = 'Alle Plätze belegt';
        } else {
            submitButton.textContent = isSaving ? 'Wird gespeichert …' : 'Idee speichern';
        }
        if (!client) {
            slotsStatus.textContent = 'Datenbankverbindung nicht verfügbar';
            setFormStatus('Die Datenbankverbindung konnte nicht hergestellt werden. Bitte lade die Seite neu oder prüfe die Supabase-Konfiguration.', true);
            submitButton.disabled = true;
        }
        for (const field of form.querySelectorAll('input, textarea')) {
            field.disabled = full || isSaving || !client;
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

            if (idea.implementation && idea.implementation.trim()) {
                const details = el('div', 'projekt-idee-umsetzung');
                details.append(
                    el('strong', '', 'Umsetzung und benötigte Mittel'),
                    el('span', '', idea.implementation)
                );
                card.append(details);
            }
            list.append(card);
        }
        updateFormState();
    }

    async function loadIdeas(quiet = false) {
        if (!client) {
            renderIdeas();
            return;
        }

        const { data, error } = await client
            .from('projektideen')
            .select('id, slot_number, person_name, title, description, implementation, created_at')
            .order('slot_number', { ascending: true });

        if (error) {
            if (quiet) return;
            list.replaceChildren();
            list.append(el('p', 'projekt-ladehinweis', 'Die Projektideen konnten nicht geladen werden. Prüfe, ob das aktualisierte database-setup.sql ausgeführt wurde.'));
            slotsStatus.textContent = 'Daten konnten nicht geladen werden';
            setFormStatus('Supabase meldet einen Fehler beim Laden. Bitte prüfe die Tabelle „projektideen“ und deren Leseberechtigung.', true);
            submitButton.disabled = true;
            return;
        }

        currentIdeas = Array.isArray(data) ? data : [];
        renderIdeas();
        if (!quiet && !isSaving) {
            if (currentIdeas.length === 0) {
                setFormStatus('Noch ist keine Idee eingetragen. Du kannst den ersten Vorschlag einreichen.');
            } else if (currentIdeas.length < TOTAL_SLOTS) {
                setFormStatus('Die Einträge werden für alle Besucher gemeinsam angezeigt.');
            } else {
                setFormStatus('Alle sechs Projektplätze sind belegt.');
            }
        }
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!client || isSaving) return;

        if (currentIdeas.length >= TOTAL_SLOTS) {
            setFormStatus('Alle sechs Plätze sind bereits belegt.', true);
            updateFormState();
            return;
        }

        const formData = new FormData(form);
        const personName = String(formData.get('person_name') || '').trim();
        const title = String(formData.get('title') || '').trim();
        const description = String(formData.get('description') || '').trim();
        const implementation = String(formData.get('implementation') || '').trim();

        if (!personName || !title || !description) {
            setFormStatus('Bitte fülle alle Pflichtfelder aus.', true);
            return;
        }

        const taken = new Set(currentIdeas.map(idea => Number(idea.slot_number)));
        let slot = 1;
        while (taken.has(slot) && slot <= TOTAL_SLOTS) slot += 1;
        if (slot > TOTAL_SLOTS) {
            await loadIdeas();
            setFormStatus('Inzwischen sind alle sechs Plätze belegt.', true);
            return;
        }

        isSaving = true;
        updateFormState();
        setFormStatus('Deine Idee wird gespeichert …');

        const { error } = await client.from('projektideen').insert({
            slot_number: slot,
            person_name: personName,
            title,
            description,
            implementation
        });

        isSaving = false;

        if (error) {
            await loadIdeas();
            if (error.code === '23505') {
                setFormStatus('Dieser Platz wurde gerade von jemand anderem belegt. Die Liste wurde aktualisiert. Bitte prüfe, ob noch ein Platz frei ist.', true);
            } else if (error.code === '42501' || error.code === 'PGRST301') {
                setFormStatus('Die Datenbank erlaubt noch keine Einreichung. Bitte führe das aktualisierte database-setup.sql in Supabase aus.', true);
            } else {
                setFormStatus(`Speichern fehlgeschlagen: ${error.message || 'Unbekannter Datenbankfehler'}`, true);
            }
            updateFormState();
            return;
        }

        form.reset();
        await loadIdeas();
        setFormStatus(`Deine Idee wurde auf Platz ${slot} gespeichert und ist jetzt für die Gruppe sichtbar.`);
    });

    loadIdeas();
    // Neue Einträge anderer Gruppenmitglieder automatisch nachladen.
    window.setInterval(() => loadIdeas(true), 20000);
})();
