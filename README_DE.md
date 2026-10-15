# Studium – dynamische Version (ohne Anmeldung)

## Was sich geändert hat

- **Fristen** werden aus `public.fristen` in Supabase geladen. Die drei vorhandenen Fristen wurden als Startdaten in `database-setup.sql` übernommen.
- **Klausuren** werden aus `public.klausuren` geladen, automatisch in vergangene und kommende Termine sortiert und mit Tage-/Wochenanzeige dargestellt. Es wurden absichtlich keine Klausur-Platzhaltertermine erfunden.
- **Stundenplan** mit Excel-Import, Modulfilter und PDF-Export bleibt erhalten.
- Gemeinsame gespeicherte Stundenplanansichten bleiben öffentlich lesbar. Neu gespeicherte Ansichten werden lokal im Browser gespeichert. Das öffentliche Frontend kann gemeinsame Datenbankansichten nicht mehr ändern oder löschen.
- Für das Lesen gibt es keine Anmeldung. Die Tabellen sind über RLS öffentlich lesbar, aber über die anonyme Browser-API nicht beschreibbar.

## Einrichten

1. Sichere dein bisheriges GitHub-Repository.
2. Öffne dein bestehendes Supabase-Projekt und gehe zu **SQL Editor**.
3. Öffne `database-setup.sql`, kopiere den gesamten Inhalt in eine neue SQL-Abfrage und führe sie einmal aus.
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

## Was ohne Anmeldung absichtlich nicht möglich ist

Besucher können Fristen und Klausuren ansehen, aber nicht über die öffentliche Website verändern. Änderungen erfolgen zunächst im Supabase-Dashboard. Die bisher global gespeicherten Ansichten sind ebenfalls nur lesbar; neue Ansichten, die ein Besucher speichert, gelten nur in dessen Browser. Ein geschützter Verwaltungsbereich kann später ergänzt werden.
