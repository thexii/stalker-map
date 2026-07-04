# StalkerMap

[Українська](README.uk.md)

Interactive maps for the **S.T.A.L.K.E.R.** series — locations, loot, anomalies, traders, mechanics, and other in-game objects extracted from game data and rendered on a Leaflet map with search, layer filters, and a multilingual UI.

Repository: [github.com/thexii/stalker-map](https://github.com/thexii/stalker-map)

## Supported games

| Game | Route | Description |
| --- | --- | --- |
| Shadow of Chernobyl | `/map/shoc` | Full Zone map with underground levels |
| Clear Sky | `/map/cs` | Clear Sky map (also `/map/cs_ee` for Enhanced Edition) |
| Call of Pripyat | `/map/cop` | CoP map |
| Heart of Chornobyl | `/map/hoc` | Dedicated HoC component with inventory, equipment, trading, and stashes |

The home page (`/`) provides quick access to ShoC, CS, and CoP.

## Features

- **Marker layers** — locations, stashes, quest items, loot, anomalies, traders, NPCs, mechanics, level transitions, hazard zones, and more (per-game config in `src/assets/data/*_config.json`).
- **Search** — jump to a marker by name.
- **Detailed popups** — item descriptions, trader inventories, mechanic upgrades, loot box probabilities.
- **Underground maps** — separate maps for underground locations (ShoC, CS, CoP).
- **Ruler** — measure distances on the map.
- **Shareable links** — copy a URL with marker coordinates.
- **Localization** — UI languages: `ua`, `en`, `ru`, `pl`, `fr`, `de`, `esp`, `it`, `cz`, `chn`, `jpn`, `kor`, `ar`. In-game texts live in separate JSON files per game.
- **Export** — `/export/map/:game/:lang` for static map rendering.

## Tech stack

- [Angular 21](https://angular.dev/) (standalone components)
- [Leaflet](https://leafletjs.com/) + custom plugins (`leaflet-search`, `leaflet-ruler`, arrowheads)
- [@ngx-translate](https://github.com/ngx-translate/core) — i18n
- [Chart.js](https://www.chartjs.org/) — trader charts
- [Firebase Analytics](https://firebase.google.com/docs/analytics) — event analytics

## Development

### Requirements

- Node.js 20+ (LTS recommended)
- npm

### Run locally

```bash
npm install
npm start
```

The app will be available at [http://localhost:4200](http://localhost:4200).

### Build

```bash
npm run build
```

Output goes to `dist/stalker-map/`.

## Data layout

```
src/assets/data/
├── shoc/          # Shadow of Chernobyl — map.json, items.json, locales
├── cs/            # Clear Sky
├── cop/           # Call of Pripyat
├── hoc/           # Heart of Chornobyl
├── shoc_config.json
├── cs_config.json
├── cop_config.json
└── hoc_config.json
```

- `map.json` — geometry, markers, NPCs, anomalies, traders, and other map entities.
- `items.json` — items with stats.
- `*_config.json` — layer settings, zoom levels, map bounds, language list.
- `src/assets/i18n/` — UI translations.

## Routes

| Path | Component | Purpose |
| --- | --- | --- |
| `/` | MainComponent | Home page |
| `/map/:game` | MapComponent | Interactive map (`shoc`, `cs`, `cs_ee`, `cop`) |
| `/map/hoc` | MapHocComponent | Heart of Chornobyl map |
| `/map/content/:game` | MapContentComponent | Content browser (loot, stashes) |
| `/export/map/:game/:lang` | MapExportComponent | Map export |

## License

[MIT](LICENSE) © Olexiy Zelenskiy
