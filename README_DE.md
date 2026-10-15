# Studium – dynamische Version (ohne Anmeldung)

## Was sich geändert hat

- **Fristen** werden aus `public.fristen` in Supabase geladen. Die drei vorhandenen Fristen wurden als Startdaten in `database-setup.sql` übernommen.
- **Klausuren** werden aus `public.klausuren` geladen, automatisch in vergangene und kommende Termine sortiert und mit Tage-/Wochenanzeige dargestellt. Es wurden absichtlich keine Klausur-Platzhaltertermine erfunden.
- **Projekt** ist eine neue Seite für die Sechsergruppe. Jede Einreichung enthält Name, Titel, Beschreibung und optional Angaben zur Umsetzung. Die ersten sechs Einreichungen belegen jeweils einen festen Platz und werden für alle Besucher angezeigt. Die Liste aktualisiert sich automatisch alle 20 Sekunden.
- **Stundenplan** mit Excel-Import, Modulfilter und PDF-Export bleibt erhalten.
- Gemeinsame gespeicherte Stundenplanansichten bleiben öffentlich lesbar. Neu gespeicherte Ansichten werden lokal im Browser gespeichert. Das öffentliche Frontend kann gemeinsame Datenbankansichten nicht mehr ändern oder löschen.
- Die öffentlichen Seiten erfordern keine Anmeldung. `fristen`, `klausuren` und gemeinsame gespeicherte Stundenplanansichten sind über die Browser-API nur lesbar. Bei `projektideen` sind zusätzlich Einreichungen erlaubt; Änderungen und Löschungen sind gesperrt.

## Einrichten

1. Sichere dein bisheriges GitHub-Repository.
2. Öffne dein bestehendes Supabase-Projekt und gehe zu **SQL Editor**.
3. Öffne die aktuelle `database-setup.sql`, kopiere den gesamten Inhalt in eine neue SQL-Abfrage und führe sie aus. Wenn du das frühere Skript bereits ausgeführt hast, führe jetzt diese aktualisierte Version aus. Sie löscht keine vorhandenen Fristen, Klausuren oder gespeicherten Stundenplanansichten; sie richtet die Berechtigungen neu ein und erstellt `projektideen`.
4. Lade alle Dateien aus diesem Ordner in das Hauptverzeichnis deines GitHub-Repositories hoch und ersetze die gleichnamigen Dateien.
5. Committe die Änderungen und öffne die veröffentlichte Website neu (bei Bedarf `Strg + F5`).

`supabase-config.js` enthält die URL und den Publishable-Key des bestehenden Projekts. Ein Publishable-Key ist im Browser öffentlich sichtbar; er darf deshalb nur zusammen mit den unten eingerichteten Datenbankberechtigungen verwendet werden. Keine Service-Role- oder Secret-Keys in die Website eintragen.

## Fristen verwalten

Nach Ausführung des SQL-Skripts: Supabase → **Table Editor** → `fristen`.

Felder:
- `title`: Titel der Frist
- `description`: Beschreibung
- `category`: Kennzeichnung rechts oben, z. B. `Abgabe` oder `Anmeldung`
- `start_date`: optionaler Beginn einer Anmelde-/Fristspanne (Format `YYYY-MM-DD`)
- `due_date`: Ende der Frist (Format `YYYY-MM-DD`); steuert den Countdown
- `sort_order`: optionale Reihenfolge bei gleichem Datum

Die drei bisher in `fristen.html` eingetragenen Termine werden automatisch in die Tabelle übernommen, wenn das SQL-Skript ausgeführt wird.

## Klausuren verwalten

Supabase → **Table Editor** → `klausuren` → **Insert row**.

Felder:
- `title`: Modul/Klausurname (Pflicht)
- `description`: optionale Notiz
- `exam_date`: Klausurdatum (Pflicht, `YYYY-MM-DD`)
- `exam_time`: optionale Uhrzeit, z. B. `09:00`
- `location`: optionaler Raum/Ort
- `sort_order`: optionale Reihenfolge bei gleichem Datum
- `id` und `created_at`: automatisch erzeugt

Die Klausuren erscheinen dann automatisch auf der Website, in der Vergangen-/Kommend-Spalte passend zum Datum.

## Projektideen verwalten

Die Seite `projekt.html` schreibt in die Tabelle `projektideen`. Die ersten sechs Einreichungen belegen die Plätze 1 bis 6. Ein Eintrag enthält:

- `slot_number`: automatisch gewählter Platz 1–6
- `person_name`: Name der Person
- `title`: Titel der Projektidee
- `description`: Beschreibung
- `implementation`: optionale Umsetzungsidee oder benötigte Mittel
- `id` und `created_at`: automatisch erzeugt

Die öffentliche Website darf Projektideen lesen und neue Einträge hinzufügen, aber keine bestehenden Einträge ändern oder löschen. Korrekturen oder das Entfernen eines Eintrags erfolgen im Supabase Table Editor unter `projektideen`. Wegen der eindeutigen Platznummer können höchstens sechs Einträge gespeichert werden.

**Wichtig bei einer Website ohne Anmeldung:** Supabase kann nicht sicher prüfen, ob eine Einreichung wirklich von einer der sechs Gruppenpersonen stammt. Jeder Besucher der öffentlichen Website könnte versuchen, einen freien Platz zu belegen. Für eine geschlossene Gruppe mit geschütztem Zugang wäre eine Anmeldung oder ein echtes Zugangsverfahren nötig.

## Was ohne Anmeldung absichtlich nicht möglich ist

Besucher können Fristen und Klausuren ansehen, aber nicht über die öffentliche Website verändern. Änderungen erfolgen zunächst im Supabase-Dashboard. Projektideen können öffentlich eingereicht, jedoch nicht öffentlich bearbeitet oder gelöscht werden. Die bisher global gespeicherten Ansichten sind ebenfalls nur lesbar; neue Ansichten, die ein Besucher speichert, gelten nur in dessen Browser. Ein geschützter Verwaltungsbereich kann später ergänzt werden.
