# Table Prettifier

Obsidian-Plugin zum Einfärben von **Zellen, Zeilen und Spalten** in Markdown-Tabellen – per Rechtsklick-Menü, Befehl/Tastenkürzel oder direkt im Quelltext.

## Benutzung

### Rechtsklick-Menü

Rechtsklick auf eine Tabellenzelle → **Zelle färben**, **Zeile färben** oder **Spalte färben** → Farbe wählen.
**Tabellenfarben entfernen** löscht alle Farben der Tabelle.

### Befehle und Tastenkürzel

In der Befehlspalette nach „Table Prettifier“ suchen. Unter *Einstellungen → Tastenkürzel* lässt sich jedem Befehl ein Shortcut zuweisen:

| Befehl | Wirkung |
| --- | --- |
| `Zelle färben…` / `Zeile färben…` / `Spalte färben…` | Öffnet die Farbauswahl (tippen, Enter) |
| `Zelle: Rot`, `Zeile: Blau`, … | Färbt direkt mit dieser Farbe (auch für eigene Farben) |
| `Zelle: Eigene Farbe…`, … | Öffnet den Color Picker |
| `Zelle: Farbe entfernen`, … | Entfernt die jeweilige Farbe |
| `Alle Farben dieser Tabelle entfernen` | Entfernt alle Marker der Tabelle |

Befehle funktionieren in Live Preview (Cursor in einer Zelle) und im Source-Modus.

### Syntax

Das Plugin setzt unsichtbare Marker in den Quelltext – man kann sie auch von Hand schreiben:

```markdown
| Name <span class="col-blue"></span> | Wert |
| ----------------------------------- | ---- |
| Beta <span class="row-red"></span>  | 2 <span class="cell-green"></span> |
```

- `cell-<farbe>` – nur diese Zelle
- `row-<farbe>` – ganze Zeile
- `col-<farbe>` – ganze Spalte (Marker in der Kopfzeile)

Priorität: Zelle > Zeile > Spalte.
Standardfarben: `red`, `orange`, `yellow`, `green`, `cyan`, `blue`, `purple`, `pink`, `gray`. Eigene Farben bekommen eine ID aus ihrem Namen (z. B. „Erledigt“ → `cell-erledigt`); die Marker jeder Farbe stehen in den Einstellungen.

## Farben anpassen

Unter *Einstellungen → Table Prettifier*:

- **Light & Dark Mode** – jede Farbe hat einen eigenen Wert für den hellen und den dunklen Modus, dazu je eine eigene Deckkraft. Die Vorschau zeigt beide Varianten.
- **Paletten** – Vorlagen *Theme (Standard)*, *Pastell*, *Kräftig* und *Farbenblind-freundlich (Okabe-Ito)*. Alle nutzen dieselben IDs, ein Palettenwechsel färbt also bestehende Tabellen um, ohne den Markdown-Text zu ändern. Eigene Farben bleiben erhalten.
- **Color Picker** – jede Farbe per Picker ändern, umbenennen, sortieren oder löschen; „Farbe hinzufügen“ legt neue an.
- **Eigene Farbe direkt in der Tabelle** – im Rechtsklick-Menü bzw. in der Farbauswahl „Eigene Farbe…“ wählen: Farbe picken, benennen, anwenden. Sie wird dabei in der Palette gespeichert.

**Abstand über Tabellen** (Live Preview): Obsidian erkennt Tabellen nur mit einer Leerzeile davor und fügt sie beim Schreiben automatisch ein. Die Zeile bleibt im Markdown immer erhalten; per Dropdown wählst du, wie es aussieht:

| Option | Wirkung |
| --- | --- |
| Eine Leerzeile | Leerzeile sichtbar, ohne zusätzlichen Platz darüber; Spalten-Griffe an der Oberkante der Kopfzeile |
| Kein Abstand *(Standard)* | Tabelle beginnt direkt unter dem Text, wie ein Callout; Spalten-Griffe an der Oberkante der Kopfzeile |
| Wie unten | Leerzeile ausgeblendet, darüber so viel Platz wie unter der Tabelle (für die Ziehgriffe) |
| Custom | Leerzeile ausgeblendet, Abstand per Regler in Pixeln (0–64 px) |

Die Farben der Palette *Theme* folgen dem aktiven Obsidian-Theme, bis man sie im Picker ändert.
Eigene Farben sind in den Plugin-Einstellungen des Vaults gespeichert – in einem anderen Vault wirken ihre Marker erst, wenn dort eine Farbe mit derselben ID existiert.

## Installation

### Manuell

1. Beim neuesten [Release](../../releases/latest) die Dateien `main.js`, `manifest.json` und `styles.css` herunterladen.
2. Im Vault den Ordner `.obsidian/plugins/table-colors/` anlegen und die drei Dateien hineinlegen. Der Ordner muss so heißen wie die Plugin-ID `table-colors` (der Name stammt aus der Zeit vor der Umbenennung und bleibt aus Kompatibilitätsgründen).
3. Obsidian neu laden und unter *Einstellungen → Community-Plugins* „Table Prettifier“ aktivieren.

### Mit BRAT

Im Plugin [BRAT](https://github.com/TfTHacker/obsidian42-brat) „Add Beta plugin“ wählen und die URL dieses Repos eintragen.

## Entwicklung

Voraussetzung: Node.js ≥ 22.18.

```bash
npm install
npm run dev     # baut main.js und beobachtet Änderungen
npm test        # Tests (Tabellenlogik, CSS, Paletten)
npm run build   # Produktions-Build
```

Für die Entwicklung den Repo-Ordner per Symlink als Plugin in einen Test-Vault legen:

```bash
ln -s "$PWD" /pfad/zum/vault/.obsidian/plugins/table-colors
```

Paletten stehen in `src/palettes.ts`, das Farb-CSS erzeugt `src/styles.ts` zur Laufzeit; `styles.css` enthält nur statische UI-Styles.

### Release

```bash
npm version patch   # erhöht Version in package.json, manifest.json, versions.json
git push --follow-tags
```

Der Tag löst die GitHub Action aus, die `main.js`, `manifest.json` und `styles.css` an ein neues Release hängt.
Hinweis: Damit `npm version` Tags ohne `v`-Präfix erzeugt (wie Obsidian es erwartet), ist in `.npmrc` `tag-version-prefix=""` gesetzt.

## Lizenz

MIT
