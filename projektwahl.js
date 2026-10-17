(() => {
    'use strict';

    const client = window.studiumSupabaseClient;
    const loginPanel = document.getElementById('wahl-anmeldung');
    const loginForm = document.getElementById('wahl-login-form');
    const loginPassword = document.getElementById('wahl-login-passwort');
    const loginButton = document.getElementById('wahl-login-button');
    const loginStatus = document.getElementById('wahl-login-status');
    const votingArea = document.getElementById('wahl-bereich');
    const logoutButton = document.getElementById('wahl-abmelden');
    const progress = document.getElementById('wahl-fortschritt');
    const statusHint = document.getElementById('wahl-status-hinweis');
    const voteForm = document.getElementById('wahl-form');
    const projectList = document.getElementById('wahl-projektliste');
    const codeInput = document.getElementById('wahl-code');
    const voteButton = document.getElementById('wahl-absenden');
    const voteStatus = document.getElementById('wahl-form-status');
    const ratingCounter = document.getElementById('wahl-bewertungszaehler');
    const resultArea = document.getElementById('wahl-ergebnisbereich');
    const winnerText = document.getElementById('wahl-gewinner');
    const resultList = document.getElementById('wahl-ergebnisse');

    const TOTAL = 6;
    let accessPassword = '';
    let ideas = [];
    let ratings = new Map();
    let loading = false;
    let submitting = false;
    let hasVotedThisSession = false;

    const el = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = text;
        return node;
    };

    function setMessage(node, message, isError = false) {
        node.textContent = message;
        node.classList.toggle('fehler', isError);
        node.classList.toggle('wahl-form-fehler', isError);
    }

    function loggedOut(message = '') {
        accessPassword = '';
        ideas = [];
        ratings = new Map();
        loading = false;
        submitting = false;
        hasVotedThisSession = false;
        loginPanel.hidden = false;
        votingArea.hidden = true;
        loginForm.reset();
        voteForm.reset();
        voteForm.hidden = true;
        resultArea.hidden = true;
        projectList.replaceChildren();
        resultList.replaceChildren();
        progress.textContent = 'Wahlstatus wird geladen …';
        statusHint.textContent = '';
        voteStatus.textContent = '';
        loginButton.disabled = false;
        loginButton.textContent = 'Zur Projektwahl';
        voteButton.disabled = false;
        voteButton.textContent = 'Stimme verbindlich abgeben';
        setMessage(loginStatus, message, Boolean(message));
    }

    async function fetchIdeas(password) {
        return client.rpc('get_projektideen', { p_password: password });
    }

    async function fetchStatus(password) {
        return client.rpc('get_projektwahl_status', { p_password: password });
    }

    function currentCount() {
        return ideas.filter(idea => ratings.has(Number(idea.id))).length;
    }

    function updateRatingCounter() {
        ratingCounter.textContent = `${currentCount()} von ${ideas.length} bewertet`;
    }

    function setVotingHint(status) {
        if (!status) return;
        progress.textContent = `Wahlfortschritt: ${status.votes_cast} von ${status.eligible_voters ?? TOTAL} Stimmen abgegeben`;

        if (Number(status.idea_count) !== TOTAL) {
            setMessage(statusHint, `Die Abstimmung wird freigeschaltet, sobald alle sechs Projektideen eingetragen sind. Aktuell sind ${status.idea_count} von sechs vorhanden.`);
        } else if (Number(status.eligible_voters) !== TOTAL) {
            setMessage(statusHint, 'Die Wahlcodes sind noch nicht eingerichtet. Die Person, die die Wahl organisiert, muss das SQL-Skript „projektwahl-codes-einrichten.sql“ einmal in Supabase ausführen.', true);
        } else if (status.results_released) {
            setMessage(statusHint, 'Alle sechs Mitglieder haben abgestimmt. Die Endergebnisse sind veröffentlicht.');
        } else if (hasVotedThisSession) {
            setMessage(statusHint, 'Deine Stimme wurde gespeichert. Die Punktestände bleiben geheim, bis alle sechs Mitglieder abgestimmt haben.');
        } else {
            setMessage(statusHint, 'Bewerte alle sechs Projekte einschließlich deiner eigenen Idee. Die Einzelbewertungen und Punktestände bleiben bis zum Ende geheim.');
        }
    }

    function renderRatingCards() {
        projectList.replaceChildren();
        ratings = new Map();

        ideas.forEach((idea, index) => {
            const card = el('article', 'wahl-projektkarte');
            card.append(
                el('h3', '', idea.title),
                el('p', 'wahl-projekt-meta', `Projekt ${index + 1} · eingereicht von ${idea.person_name}`),
                el('p', 'wahl-projektbeschreibung', idea.description)
            );

            const label = el('span', 'wahl-punkte-label', 'Deine Punkte:');
            const points = el('div', 'wahl-punkte');
            points.setAttribute('role', 'group');
            points.setAttribute('aria-label', `Punkte für ${idea.title}`);
            for (let score = 0; score <= 5; score += 1) {
                const button = el('button', '', String(score));
                button.type = 'button';
                button.dataset.score = String(score);
                button.setAttribute('aria-pressed', 'false');
                button.setAttribute('aria-label', `${score} Punkte für ${idea.title}`);
                button.addEventListener('click', () => {
                    if (submitting || hasVotedThisSession) return;
                    ratings.set(Number(idea.id), score);
                    for (const sibling of points.querySelectorAll('button')) {
                        const selected = Number(sibling.dataset.score) === score;
                        sibling.setAttribute('aria-pressed', String(selected));
                    }
                    updateRatingCounter();
                    updateVoteButton();
                });
                points.append(button);
            }
            card.append(label, points);
            projectList.append(card);
        });
        updateRatingCounter();
        updateVoteButton();
    }

    function updateVoteButton() {
        const allRated = ideas.length === TOTAL && currentCount() === TOTAL;
        voteButton.disabled = !allRated || submitting || hasVotedThisSession;
        voteButton.textContent = submitting ? 'Stimme wird gespeichert …' : hasVotedThisSession ? 'Stimme bereits abgegeben' : 'Stimme verbindlich abgeben';
        for (const field of voteForm.querySelectorAll('input')) {
            field.disabled = submitting || hasVotedThisSession;
        }
        for (const button of projectList.querySelectorAll('button')) {
            button.disabled = submitting || hasVotedThisSession;
        }
    }

    function renderResults(status) {
        resultArea.hidden = true;
        resultList.replaceChildren();
        if (!status || !status.results_released || !Array.isArray(status.results)) return;

        const results = status.results.slice().sort((a, b) => Number(b.points) - Number(a.points) || Number(a.slot_number) - Number(b.slot_number));
        const topPoints = results.length ? Number(results[0].points) : 0;
        const winners = results.filter(result => Number(result.points) === topPoints);
        if (winners.length === 1) {
            setMessage(winnerText, `Gewonnen hat „${winners[0].title}“ mit ${topPoints} von 30 Punkten.`);
        } else {
            setMessage(winnerText, `Gleichstand: ${winners.map(result => `„${result.title}“`).join(' und ')} teilen sich mit jeweils ${topPoints} Punkten den ersten Platz.`);
        }

        let previousPoints = null;
        let currentRank = 0;
        results.forEach((result, index) => {
            if (previousPoints === null || Number(result.points) !== previousPoints) currentRank = index + 1;
            previousPoints = Number(result.points);
            const item = el('li', 'wahl-ergebnis');
            if (Number(result.points) === topPoints) item.classList.add('wahl-ergebnis-sieger');
            item.append(
                el('span', 'wahl-rang', `${currentRank}. Platz`)
            );
            const text = el('div', 'wahl-ergebnis-text');
            text.append(
                el('span', 'wahl-ergebnis-titel', result.title),
                el('span', 'wahl-ergebnis-person', `Von ${result.person_name}`)
            );
            item.append(text, el('span', 'wahl-ergebnis-punkte', `${result.points} / 30 Punkte`));
            resultList.append(item);
        });
        resultArea.hidden = false;
        voteForm.hidden = true;
    }

    async function refreshStatus(quiet = false) {
        if (!client || !accessPassword || loading || submitting) return;
        const { data, error } = await fetchStatus(accessPassword);
        if (error) {
            if (!quiet) setMessage(statusHint, 'Der Wahlstatus konnte nicht geladen werden. Prüfe, ob das aktualisierte SQL ausgeführt wurde.', true);
            if (String(error.message || '').toLowerCase().includes('passwort')) {
                loggedOut('Das Gruppenpasswort ist nicht mehr gültig. Bitte melde dich erneut an.');
            }
            return;
        }
        setVotingHint(data);
        renderResults(data);
        if (!data.results_released && !hasVotedThisSession && Number(data.idea_count) === TOTAL && Number(data.eligible_voters) === TOTAL) {
            voteForm.hidden = false;
        }
        if (data.results_released) {
            voteForm.hidden = true;
            hasVotedThisSession = true;
        }
        updateVoteButton();
    }

    loginForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (!client || loading) {
            setMessage(loginStatus, 'Supabase ist nicht verfügbar. Prüfe supabase-config.js und lade die Seite erneut.', true);
            return;
        }
        const password = String(new FormData(loginForm).get('password') || '');
        if (!password) {
            setMessage(loginStatus, 'Bitte gib das Gruppenpasswort ein.', true);
            return;
        }
        loading = true;
        loginButton.disabled = true;
        loginButton.textContent = 'Wird geprüft …';
        setMessage(loginStatus, 'Gruppenpasswort wird geprüft …');

        const [{ data: ideasData, error: ideasError }, { data: statusData, error: statusError }] = await Promise.all([
            fetchIdeas(password),
            fetchStatus(password)
        ]);
        loading = false;
        loginButton.disabled = false;
        loginButton.textContent = 'Zur Projektwahl';

        if (ideasError || statusError) {
            const error = ideasError || statusError;
            const message = String(error.message || '').toLowerCase();
            loginPassword.value = '';
            if (message.includes('passwort')) setMessage(loginStatus, 'Das Gruppenpasswort ist falsch oder noch nicht eingerichtet.', true);
            else if (error.code === 'PGRST202' || error.code === '42883') setMessage(loginStatus, 'Die Wahlfunktionen fehlen. Führe das aktualisierte database-setup.sql in Supabase aus.', true);
            else setMessage(loginStatus, 'Die Prüfung ist fehlgeschlagen. Prüfe die Datenbankkonfiguration in Supabase.', true);
            return;
        }

        accessPassword = password;
        ideas = Array.isArray(ideasData) ? ideasData : [];
        loginForm.reset();
        loginPanel.hidden = true;
        votingArea.hidden = false;
        setMessage(loginStatus, '');
        renderRatingCards();
        setVotingHint(statusData);
        renderResults(statusData);
        if (Number(statusData.idea_count) === TOTAL && Number(statusData.eligible_voters) === TOTAL && !statusData.results_released) {
            voteForm.hidden = false;
        }
        updateVoteButton();
    });

    voteForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (!client || !accessPassword || submitting || hasVotedThisSession) return;
        if (ideas.length !== TOTAL || currentCount() !== TOTAL) {
            setMessage(voteStatus, 'Bitte vergib für jedes der sechs Projekte 0 bis 5 Punkte.', true);
            return;
        }
        const code = String(new FormData(voteForm).get('vote_code') || '').trim();
        if (code.length < 20) {
            setMessage(voteStatus, 'Bitte gib deinen persönlichen Wahlcode vollständig ein.', true);
            return;
        }
        const scores = ideas.map(idea => ({ project_id: Number(idea.id), points: Number(ratings.get(Number(idea.id))) }));

        submitting = true;
        voteForm.setAttribute('aria-busy', 'true');
        setMessage(voteStatus, 'Deine Stimme wird verbindlich gespeichert …');
        updateVoteButton();
        const { data, error } = await client.rpc('submit_projektwahl_stimme', {
            p_password: accessPassword,
            p_vote_code: code,
            p_scores: scores
        });
        submitting = false;
        voteForm.removeAttribute('aria-busy');

        if (error) {
            const message = String(error.message || '').toLowerCase();
            if (message.includes('passwort')) {
                loggedOut('Die Passwortprüfung ist fehlgeschlagen. Bitte melde dich erneut an.');
                return;
            }
            if (message.includes('wahlcode')) setMessage(voteStatus, 'Der Wahlcode ist ungültig oder wurde bereits verwendet. Jeder Code darf nur einmal abstimmen.', true);
            else if (message.includes('sechs projektideen') || message.includes('projektliste')) setMessage(voteStatus, 'Die Wahl ist noch nicht bereit oder die Projektliste wurde geändert. Lade die Seite neu und prüfe die sechs Projektideen.', true);
            else if (message.includes('wahlcodes')) setMessage(voteStatus, 'Die sechs Wahlcodes wurden noch nicht korrekt eingerichtet.', true);
            else if (error.code === 'PGRST202' || error.code === '42883') setMessage(voteStatus, 'Die Wahlfunktion fehlt. Führe das aktualisierte database-setup.sql aus.', true);
            else setMessage(voteStatus, 'Die Stimme konnte nicht gespeichert werden. Prüfe deine Bewertungen und versuche es erneut.', true);
            updateVoteButton();
            return;
        }

        hasVotedThisSession = true;
        codeInput.value = '';
        setMessage(voteStatus, 'Deine Stimme wurde verbindlich abgegeben. Du kannst sie nicht erneut ändern.');
        updateVoteButton();
        await refreshStatus(true);
        if (!data?.results_released) {
            setMessage(voteStatus, 'Deine Stimme ist gespeichert. Die Ergebnisse werden erst nach Eingang aller sechs Stimmen angezeigt.');
        }
    });

    logoutButton.addEventListener('click', () => {
        loggedOut('Der Wahlbereich wurde gesperrt. Beim nächsten Öffnen musst du das Gruppenpasswort erneut eingeben.');
    });

    if (!client) {
        loginButton.disabled = true;
        setMessage(loginStatus, 'Die Supabase-Konfiguration konnte nicht geladen werden. Prüfe supabase-config.js.', true);
    }

    loggedOut();
    window.addEventListener('pagehide', () => {
        accessPassword = '';
        ideas = [];
        ratings.clear();
        votingArea.hidden = true;
        loginPanel.hidden = false;
        loginForm.reset();
        voteForm.reset();
        projectList.replaceChildren();
        resultList.replaceChildren();
    });

    window.setInterval(() => {
        if (accessPassword && !loading && !submitting) refreshStatus(true);
    }, 20000);
})();
