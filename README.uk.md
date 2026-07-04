# StalkerMap

[English](README.md)

Інтерактивні карти для серії **S.T.A.L.K.E.R.** — з маркерами локацій, луту, аномалій, торговців, механіків та іншими ігровими об'єктами. Дані витягнуті з ігрових файлів і відображаються на Leaflet-карті з пошуком, фільтрами шарів і багатомовним інтерфейсом.

Репозиторій: [github.com/thexii/stalker-map](https://github.com/thexii/stalker-map)

## Підтримувані ігри

| Гра | Маршрут | Опис |
| --- | --- | --- |
| Shadow of Chernobyl | `/map/shoc` | Повна карта Зони з підземеллями |
| Clear Sky | `/map/cs` | Карта Clear Sky (також `/map/cs_ee` для Enhanced Edition) |
| Call of Pripyat | `/map/cop` | Карта CoP |
| Heart of Chornobyl | `/map/hoc` | Окремий компонент з розширеними даними HoC: інвентар, екіпірування, торгівля, схованки |

На головній сторінці (`/`) — швидкий вибір між ShoC, CS і CoP.

## Можливості

- **Шари маркерів** — локації, схованки, квестові предмети, лут, аномалії, торговці, NPC, механіки, переходи між рівнями, зони небезпеки тощо (конфігурація для кожної гри в `src/assets/data/*_config.json`).
- **Пошук** — швидкий перехід до маркера за назвою.
- **Детальні попапи** — опис предметів, інвентар торговців, апгрейди механіків, ймовірності лут-боксів.
- **Підземелля** — окремі карти для underground-локацій (ShoC, CS, CoP).
- **Лінійка** — вимірювання відстаней на карті.
- **Посилання на маркер** — копіювання URL з координатами.
- **Локалізація** — інтерфейс: `ua`, `en`, `ru`, `pl`, `fr`, `de`, `esp`, `it`, `cz`, `chn`, `jpn`, `kor`, `ar`. Ігрові тексти — окремі JSON-файли для кожної гри.
- **Експорт** — `/export/map/:game/:lang` для статичного рендеру карти.

## Стек

- [Angular 21](https://angular.dev/) (standalone components)
- [Leaflet](https://leafletjs.com/) + власні плагіни (`leaflet-search`, `leaflet-ruler`, arrowheads)
- [@ngx-translate](https://github.com/ngx-translate/core) — i18n
- [Chart.js](https://www.chartjs.org/) — графіки торговців
- [Firebase Analytics](https://firebase.google.com/docs/analytics) — аналітика подій

## Розробка

### Вимоги

- Node.js 20+ (рекомендовано LTS)
- npm

### Запуск

```bash
npm install
npm start
```

Додаток буде доступний на [http://localhost:4200](http://localhost:4200).

### Збірка

```bash
npm run build
```

Артефакти потрапляють у `dist/stalker-map/`.

## Структура даних

```
src/assets/data/
├── shoc/          # Shadow of Chernobyl — map.json, items.json, локалізації
├── cs/            # Clear Sky
├── cop/           # Call of Pripyat
├── hoc/           # Heart of Chornobyl
├── shoc_config.json
├── cs_config.json
├── cop_config.json
└── hoc_config.json
```

- `map.json` — геометрія, маркери, NPC, аномалії, торговці та інші сутності карти.
- `items.json` — предмети з характеристиками.
- `*_config.json` — налаштування шарів, zoom, межі карти, список мов.
- `src/assets/i18n/` — переклади інтерфейсу.

## Маршрути

| Шлях | Компонент | Призначення |
| --- | --- | --- |
| `/` | MainComponent | Головна сторінка |
| `/map/:game` | MapComponent | Інтерактивна карта (`shoc`, `cs`, `cs_ee`, `cop`) |
| `/map/hoc` | MapHocComponent | Карта Heart of Chornobyl |
| `/map/content/:game` | MapContentComponent | Перегляд контенту (лут, схованки) |
| `/export/map/:game/:lang` | MapExportComponent | Експорт карти |

## Ліцензія

[MIT](LICENSE) © Olexiy Zelenskiy
