(() => {
    'use strict';

    // Die Wahl wird über die Projektseite geöffnet. Bei direktem Seitenaufruf
    // erklären wir den richtigen Einstieg, statt zur Gruppenpasswortmaske umzuleiten.
    const VOTE_NAVIGATION_KEY = 'studiumProjektwahlNavigationErlaubt';
    let enteredFromProject = false;
    try {
        enteredFromProject = sessionStorage.getItem(VOTE_NAVIGATION_KEY) === '1';
        sessionStorage.removeItem(VOTE_NAVIGATION_KEY);
    } catch (_) {
        enteredFromProject = false;
    }
    if (!enteredFromProject) {
        const loginPanelForGate = document.getElementById('wahl-anmeldung');
        const gatePanel = document.getElementById('wahl-start-hinweis');
        if (loginPanelForGate) loginPanelForGate.hidden = true;
        if (gatePanel) gatePanel.hidden = false;
        return;
    }

    const client = window.studiumSupabaseClient;
    const loginPanel = document.getElementById('wahl-anmeldung');
    const loginForm = document.getElementById('wahl-login-form');
    const loginCodeInput = document.getElementById('wahl-login-code');
    const loginButton = document.getElementById('wahl-login-button');
    const loginStatus = document.getElementById('wahl-login-status');
    const votingArea = document.getElementById('wahl-bereich');
    const progress = document.getElementById('wahl-fortschritt');
    const statusHint = document.getElementById('wahl-status-hinweis');
    const voteForm = document.getElementById('wahl-form');
    const projectList = document.getElementById('wahl-projektliste');
    const voteButton = document.getElementById('wahl-absenden');
    const voteStatus = document.getElementById('wahl-form-status');
    const ratingCounter = document.getElementById('wahl-bewertungszaehler');
    const resultArea = document.getElementById('wahl-ergebnisbereich');
    const winnerText = document.getElementById('wahl-gewinner');
    const resultList = document.getElementById('wahl-ergebnisse');

    const TOTAL = 6;
    let accessCode = '';
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
        accessCode = '';
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

    async function fetchStatus(code) {
        return client.rpc('get_projektwahl_status', { p_vote_code: code });
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
        } else if (status.code_used || hasVotedThisSession) {
            setMessage(statusHint, 'Dieser Wahlcode wurde bereits verwendet. Deine Stimme kann nicht erneut abgegeben werden. Die Ergebnisse bleiben geheim, bis alle sechs Stimmen eingegangen sind.');
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
                el('p', 'wahl-projekt-meta', `Projekt ${idea.slot_number || index + 1} · eingereicht von ${idea.person_name}`),
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
            item.append(el('span', 'wahl-rang', `${currentRank}. Platz`));
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

    function statusIdeasChanged(newIdeas) {
        return JSON.stringify((newIdeas || []).map(idea => ({
            id: Number(idea.id),
            slot_number: Number(idea.slot_number),
            person_name: idea.person_name,
            title: idea.title,
            description: idea.description
        }))) !== JSON.stringify(ideas.map(idea => ({
            id: Number(idea.id),
            slot_number: Number(idea.slot_number),
            person_name: idea.person_name,
            title: idea.title,
            description: idea.description
        })));
    }

    async function refreshStatus(quiet = false) {
        if (!client || !accessCode || loading || submitting) return;
        const { data, error } = await fetchStatus(accessCode);
        if (error) {
            if (!quiet) setMessage(statusHint, 'Der Wahlstatus konnte nicht geladen werden. Prüfe, ob das aktualisierte SQL ausgeführt wurde.', true);
            return;
        }

        if (Array.isArray(data.ideas) && statusIdeasChanged(data.ideas)) {
            ideas = data.ideas;
            renderRatingCards();
        }
        hasVotedThisSession = Boolean(data.code_used || hasVotedThisSession);
        setVotingHint(data);
        renderResults(data);
        voteForm.hidden = !(
            !data.results_released &&
            !data.code_used &&
            !hasVotedThisSession &&
            Number(data.idea_count) === TOTAL &&
            Number(data.eligible_voters) === TOTAL
        );
        if (data.code_used && !data.results_released) {
            voteForm.hidden = true;
            updateVoteButton();
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
        const code = String(new FormData(loginForm).get('vote_code') || '').trim();
        if (code.length < 20) {
            setMessage(loginStatus, 'Bitte gib dein vollständiges Wahlpasswort ein.', true);
            return;
        }

        loading = true;
        loginButton.disabled = true;
        loginButton.textContent = 'Wird geprüft …';
        setMessage(loginStatus, 'Wahlpasswort wird geprüft …');

        const { data: statusData, error } = await fetchStatus(code);
        loading = false;
        loginButton.disabled = false;
        loginButton.textContent = 'Zur Projektwahl';

        if (error) {
            const message = String(error.message || '').toLowerCase();
            loginCodeInput.value = '';
            if (message.includes('wahlpasswort') || message.includes('wahlcode')) {
                setMessage(loginStatus, 'Das Wahlpasswort ist ungültig. Prüfe, ob du den persönlichen Einmalcode korrekt eingegeben hast.', true);
            } else if (message.includes('wahlcodes')) {
                setMessage(loginStatus, 'Die sechs Wahlcodes wurden noch nicht eingerichtet. Die Wahlorganisation muss „projektwahl-codes-einrichten.sql“ einmal in Supabase ausführen.', true);
            } else if (error.code === 'PGRST202' || error.code === '42883') {
                setMessage(loginStatus, 'Die Wahlfunktionen fehlen. Führe die Datei „projektwahl-nur-wahlpasswort.sql“ in Supabase aus.', true);
            } else {
                setMessage(loginStatus, 'Die Prüfung ist fehlgeschlagen. Prüfe die Datenbankkonfiguration in Supabase und versuche es erneut.', true);
            }
            return;
        }

        accessCode = code;
        ideas = Array.isArray(statusData.ideas) ? statusData.ideas : [];
        hasVotedThisSession = Boolean(statusData.code_used);
        loginForm.reset();
        loginPanel.hidden = true;
        votingArea.hidden = false;
        setMessage(loginStatus, '');
        renderRatingCards();
        setVotingHint(statusData);
        renderResults(statusData);
        voteForm.hidden = !(
            !statusData.results_released &&
            !statusData.code_used &&
            Number(statusData.idea_count) === TOTAL &&
            Number(statusData.eligible_voters) === TOTAL
        );
        if (statusData.code_used && !statusData.results_released) {
            setMessage(voteStatus, 'Dieser Wahlcode wurde bereits verwendet. Eine zweite Stimmabgabe ist nicht möglich.');
        }
        updateVoteButton();
    });

    voteForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (!client || !accessCode || submitting || hasVotedThisSession) return;
        if (ideas.length !== TOTAL || currentCount() !== TOTAL) {
            setMessage(voteStatus, 'Bitte vergib für jedes der sechs Projekte 0 bis 5 Punkte.', true);
            return;
        }

        const scores = ideas.map(idea => ({ project_id: Number(idea.id), points: Number(ratings.get(Number(idea.id))) }));
        submitting = true;
        voteForm.setAttribute('aria-busy', 'true');
        setMessage(voteStatus, 'Deine Stimme wird verbindlich gespeichert …');
        updateVoteButton();

        const { data, error } = await client.rpc('submit_projektwahl_stimme', {
            p_vote_code: accessCode,
            p_scores: scores
        });
        submitting = false;
        voteForm.removeAttribute('aria-busy');

        if (error) {
            const message = String(error.message || '').toLowerCase();
            if (message.includes('wahlpasswort') || message.includes('wahlcode')) {
                if (message.includes('bereits verwendet')) {
                    hasVotedThisSession = true;
                    voteForm.hidden = true;
                    setMessage(voteStatus, 'Dieser Wahlcode wurde bereits verwendet. Eine zweite Stimmabgabe ist nicht möglich.', true);
                    await refreshStatus(true);
                } else {
                    setMessage(voteStatus, 'Das Wahlpasswort ist ungültig. Lade die Seite neu und prüfe deinen persönlichen Einmalcode.', true);
                }
            } else if (message.includes('sechs projektideen') || message.includes('projektliste')) {
                setMessage(voteStatus, 'Die Wahl ist noch nicht bereit oder die Projektliste wurde geändert. Lade die Seite neu und prüfe die sechs Projektideen.', true);
            } else if (message.includes('wahlcodes')) {
                setMessage(voteStatus, 'Die sechs Wahlcodes wurden noch nicht korrekt eingerichtet.', true);
            } else if (error.code === 'PGRST202' || error.code === '42883') {
                setMessage(voteStatus, 'Die Wahlfunktion fehlt. Führe „projektwahl-nur-wahlpasswort.sql“ in Supabase aus.', true);
            } else {
                setMessage(voteStatus, 'Die Stimme konnte nicht gespeichert werden. Prüfe deine Bewertungen und versuche es erneut.', true);
            }
            updateVoteButton();
            return;
        }

        hasVotedThisSession = true;
        voteForm.hidden = true;
        setMessage(voteStatus, 'Deine Stimme wurde verbindlich abgegeben. Du kannst sie nicht erneut ändern.');
        updateVoteButton();
        await refreshStatus(true);
        if (!data?.results_released) {
            setMessage(voteStatus, 'Deine Stimme ist gespeichert. Die Ergebnisse werden erst nach Eingang aller sechs Stimmen angezeigt.');
        }
    });

    if (!client) {
        loginButton.disabled = true;
        setMessage(loginStatus, 'Die Supabase-Konfiguration konnte nicht geladen werden. Prüfe supabase-config.js.', true);
    }

    loggedOut();
    window.addEventListener('pagehide', () => {
        accessCode = '';
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
        if (accessCode && !loading && !submitting) refreshStatus(true);
    }, 20000);
})();
