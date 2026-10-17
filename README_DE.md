# Studium – dynamische Website mit Projektbereich und gemeinsamem Passwort

## Funktionen

- **Fristen** werden aus `public.fristen` in Supabase geladen. Die bisherigen drei Fristen sind im SQL als Startdaten enthalten.
- **Klausuren** werden aus `public.klausuren` geladen, automatisch in vergangene und kommende Termine sortiert und mit Tage-/Wochenanzeige dargestellt.
- **Projekt** verwendet ein gemeinsames Gruppenpasswort für alle sechs Personen. Es gibt keine E-Mail-Konten und keine öffentliche Registrierung.
- **Projektwahl** lässt sechs Mitglieder jedes der sechs Projekte mit 0 bis 5 Punkten bewerten. Ein persönlicher Einmalcode erlaubt genau eine vollständige Stimmabgabe. Einzelbewertungen bleiben verborgen; Gesamtpunkte werden erst nach allen sechs Stimmen freigegeben.
- Das Passwort muss bei jedem neuen Öffnen der Seite erneut eingegeben werden. Es wird nur im Arbeitsspeicher gehalten, nicht in `localStorage`, `sessionStorage` oder einem Cookie.
- Das Passwort steht nicht in HTML oder JavaScript. Supabase prüft es serverseitig und speichert nur einen bcrypt-Hash in einem nicht öffentlichen Schema.
- Projektideen können nicht direkt über die Tabellen-API gelesen oder geschrieben werden. Lesen und Einreichen erfolgen über RPC-Funktionen, die das Passwort prüfen. Plätze werden unter einer Datenbanksperre vergeben.
- Weil alle dasselbe Passwort nutzen, kann die Datenbank nicht zuverlässig beweisen, welche Person einen Namen eingetragen hat. Der Name wird daher im Formular angegeben; pro bereits verwendetem Namen wird eine weitere Idee blockiert, dies ersetzt aber keine persönliche Anmeldung.
- **Stundenplan** mit Excel-Import, Modulfilter und PDF-Export bleibt erhalten. Gemeinsame gespeicherte Ansichten bleiben lesbar; Schreiben über die öffentliche Browser-API ist gesperrt.

## Einrichtung – bitte in dieser Reihenfolge

### 1. SQL-Grundkonfiguration ausführen

1. Öffne das bestehende Projekt im [Supabase-Dashboard](https://supabase.com/dashboard).
2. Gehe zu **SQL Editor** und öffne eine neue Abfrage.
3. Öffne `database-setup.sql`, kopiere den gesamten Inhalt hinein und klicke auf **Run**.
4. Prüfe, ob die Abfrage ohne Fehlermeldung beendet wurde.

Das Skript richtet bzw. aktualisiert `fristen`, `klausuren`, `projektideen` und die passwortgeschützten Funktionen. Es löscht keine vorhandenen Projektideen. Bereits vorhandene Testeinträge behalten ihre Plätze. Prüfe nach dem SQL-Lauf unter **Table Editor → projektideen**, ob du Testeinträge behalten möchtest oder sicher nicht mehr benötigte Einträge entfernen willst.

### 2. Gemeinsames Passwort einrichten

1. Öffne `projekt-passwort-einrichten.sql` nur, um den Befehl mit dem Platzhalter zu sehen.
2. Kopiere die Zeile `select studium_private.set_project_password('HIER_EUER_PASSWORT_EINTRAGEN');` in eine **neue Abfrage** im Supabase SQL Editor.
3. Ersetze den Platzhalter direkt im SQL Editor durch euer gemeinsames Passwort und klicke auf **Run**. Mindestens 10 Zeichen sind erforderlich; 12 oder mehr Zeichen sind empfehlenswert. Maximal sind 72 UTF-8-Bytes möglich. Die erwartete Rückgabe ist eine Zeile mit `set_project_password` und leerem Wert.
4. **Wichtig:** Schreibe das echte Passwort nicht in eine lokale Datei, lade es nicht auf GitHub hoch und speichere die geänderte Abfrage nicht als gemeinsame Query. In der bereitgestellten Datei steht absichtlich nur ein Platzhalter.

Das Passwort wird serverseitig mit bcrypt gehasht. Wenn du es später ändern möchtest, führe denselben Befehl erneut mit dem neuen Passwort aus. Verwende eine ausreichend lange Passphrase, die nicht bei anderen Konten zum Einsatz kommt.

### 3. Website auf GitHub Pages aktualisieren

1. Entpacke das komplette Website-ZIP.
2. Kopiere den **Inhalt** des Ordners `studium-dynamisch` direkt in das Hauptverzeichnis deines bestehenden GitHub-Repositories, dort wo auch `index.html` liegt.
3. Ersetze gleichnamige Dateien.
4. Committe und pushe die Änderungen.
5. Öffne `https://tobilewe.de/projekt.html` in einem neuen Tab. Gib das gemeinsame Passwort ein.
6. Teste anschließend, ob die Projektideen geladen werden und ob eine Testidee gespeichert werden kann.

Die anderen Seiten bleiben öffentlich. Beim erneuten Öffnen der Projektseite muss das Passwort wieder eingegeben werden. Der Button **Sperren** blendet den Projektbereich aus und entfernt das Passwort aus dem JavaScript-Arbeitsspeicher.

## Sicherheit und Grenzen

- `supabase-config.js` enthält die Projekt-URL und den **Publishable Key**. Dieser Schlüssel ist für den Browser gedacht und kein Secret. Niemals Service-Role- oder Secret-Keys in HTML/JavaScript eintragen.
- Das Gruppenpasswort ist nicht im Website-Quellcode enthalten. Supabase vergleicht die Eingabe serverseitig mit einem bcrypt-Hash. Direkte Tabellen-Lese- und Schreibrechte für Browser-Rollen sind entzogen; die Website verwendet passwortgeprüfte Funktionen.
- Ein gemeinsames Passwort bleibt ein geteilter Zugang: Jeder, der es kennt, kann die Projektideen ansehen und Einreichungen vornehmen. Ohne individuelle Konten lässt sich nicht sicher feststellen, wer hinter einem frei eingegebenen Namen steckt. Teile das Passwort daher nur mit eurer Gruppe.
- Nach einem erfolgreichen Seitenaufruf bleibt das Passwort nur im Arbeitsspeicher der aktuell geöffneten Seite. Ein Neuladen, erneutes Öffnen oder Sperren verlangt eine neue Eingabe.
- Die Website kann bestehende Projektideen derzeit nicht bearbeiten oder löschen. Korrekturen oder das Entfernen eines Testeintrags erfolgen im Supabase Table Editor.
- Wenn das SQL mit einer Fehlermeldung abbricht, führe nicht das alte Skript erneut aus. Sichere die vollständige Fehlermeldung und prüfe den gemeldeten Schritt.

## Fristen verwalten

Nach Ausführung des SQL-Skripts: Supabase → **Table Editor** → `fristen`.

- `title`: Titel der Frist
- `description`: Beschreibung
- `category`: Kennzeichnung, z. B. `Abgabe` oder `Anmeldung`
- `start_date`: optionaler Beginn (`YYYY-MM-DD`)
- `due_date`: Ende der Frist (`YYYY-MM-DD`)
- `sort_order`: optionale Reihenfolge

## Klausuren verwalten

Supabase → **Table Editor** → `klausuren` → **Insert row**.

- `title`: Modul/Klausurname
- `description`: optionale Notiz
- `exam_date`: Klausurdatum (`YYYY-MM-DD`)
- `exam_time`: optionale Uhrzeit, z. B. `09:00`
- `location`: optionaler Raum/Ort
- `sort_order`: optionale Reihenfolge
- `id` und `created_at`: automatisch erzeugt


## Projektwahl einrichten

Die Wahl wird über `projektwahl.html` geöffnet. Sie setzt voraus, dass die sechs Projektideen vollständig eingetragen sind.

1. Führe zuerst das aktualisierte `database-setup.sql` im Supabase SQL Editor aus. Das Skript legt die Wahlfunktionen und privaten Tabellen an, ohne vorhandene Projektideen zu löschen.
2. **Erst wenn alle sechs Ideen endgültig feststehen**, öffne `projektwahl-codes-einrichten.sql` im SQL Editor und führe `select * from studium_private.reset_project_vote_codes();` aus. Supabase gibt sechs zufällige Codes zurück.
3. Verteile jeden der sechs Codes einzeln und vertraulich an genau ein Gruppenmitglied. Die Codes werden nur gehasht gespeichert und können später nicht erneut aus der Datenbank ausgelesen werden.
4. Lade die aktualisierten Website-Dateien aus dem ZIP in das Hauptverzeichnis des GitHub-Repositories und pushe die Änderung.
5. Die Mitglieder öffnen `projektwahl.html`, geben das Gruppenpasswort ein, bewerten jedes der sechs Projekte von 0 bis 5 Punkten und geben ihren Einmalcode ein. Die Stimme ist verbindlich.

**Ergebnisse:** Die Website zeigt nur den Fortschritt „x von 6 Stimmen“. Einzelbewertungen und Zwischenergebnisse werden vom Datenbank-Endpunkt nicht ausgegeben. Erst wenn alle sechs Einmalcodes verwendet wurden, erscheinen die Gesamtpunkte (maximal 30 pro Projekt) und der Gewinner. Bei Punktgleichstand teilen sich Projekte den ersten Rang.

**Wahl zurücksetzen:** Führe `select * from studium_private.reset_project_vote_codes();` erneut nur dann aus, wenn du die Wahl bewusst vollständig neu starten möchtest. Das erzeugt sechs neue Codes, macht die alten Codes ungültig und löscht alle bis dahin gespeicherten Wahlstimmen. Speichere die zurückgegebenen Codes nicht in GitHub oder in einer öffentlich zugänglichen Datei.

Die sechs Wahlcodes sind zusätzliche individuelle Berechtigungen neben dem gemeinsamen Gruppenpasswort. Die Datenbank verknüpft einen verbrauchten Code nicht direkt mit dem anonymen Stimmzettel. Wer das Gruppenpasswort und einen unbenutzten Code kennt, kann abstimmen; deshalb verteile die Codes jeweils einzeln.

## Projektideen verwalten

Die Tabelle `projektideen` enthält die Projektplätze, Namen, Titel, Beschreibungen und Zeitstempel. Eine ältere Datenbankspalte `implementation` bleibt aus Kompatibilitätsgründen bestehen, wird vom Formular aber nicht mehr angeboten. Der freie Platz wird über `submit_projektidee` mit einer transaktionsgebundenen Sperre vergeben. Die Funktionen `get_projektideen` und `submit_projektidee` prüfen vor jedem Aufruf das gemeinsame Passwort serverseitig.
