import { Lair, LairCluster } from './../../models/hoc/map-hoc';
import {
    Component,
    HostListener,
    isDevMode,
    ViewChild,
    ViewContainerRef,
    ViewEncapsulation,
} from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Title, Meta } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { MapService } from '../../services/map.service';
import { Item } from '../../models/item.model';
import { MapConfig } from '../../models/gamedata/map-config';
import { MapHoc } from '../../models/hoc/map-hoc';
import { Point } from '../../models/point.model';
import { HocStuffComponent } from '../stuff/hoc-stuff/hoc-stuff.component';
import { ArtefactSpawnerPopupComponent } from './artefact-spawner-popup/artefact-spawner-popup.component';
import { getAnalytics, logEvent } from 'firebase/analytics';
import { HocStashComponent } from '../hoc-stash/hoc-stash.component';
import { Game } from '../../models/game.model';
import { GuideComponent } from './guide-component/guide-component';
import { TraderComponent } from './trader.component/trader.component';

declare const L: any;
declare var markWidth: number;

@Component({
    selector: 'app-map-hoc',
    standalone: true,
    imports: [HeaderComponent, TranslateModule],
    templateUrl: './map-hoc.component.html',
    styleUrl: './map-hoc.component.scss',
    encapsulation: ViewEncapsulation.None,
})
export class MapHocComponent {
    @ViewChild('dynamicComponents', { read: ViewContainerRef })
    container: ViewContainerRef;

    private items: Item[];
    private readonly game: string = 'hoc';
    private gamedata: MapHoc;
    private mapConfig: MapConfig;
    private map: any;

    private svgMarker: any;
    private canvasRenderer: any;
    private svgIcon: any;
    private allLayers: any = [];
    private searchContoller: any;
    protected overlaysListTop: string = 'layers-control';
    private layerContoller: any;

    private richClasses: string[] = [
        'EItemType::Artifact',
        'EAttachType::Scope',
        'EAttachType::Silencer',
        'EAttachType::Magazine',
        'EAttachType::Grip',
        'EAttachType::GrenadeLauncher',
        'EAttachType::Shotgun',
        'EItemType::Armor',
        //"EConsumableType::Food",
        //"EConsumableType::Medicine",
        //"EConsumableType::Guitar",
        //"EItemType::Detector",
        //"EGrenadeType::RGD5",
        //"EGrenadeType::F1",
        //"EItemType::Other",
        "QuestItem",
        "Blueprint",
        "KeyItem"];

    constructor(
        protected translate: TranslateService,
        protected route: ActivatedRoute,
        protected titleService: Title,
        protected mapService: MapService,
        protected meta: Meta
    ) { }
    showHideAll($event: any = null) {
        if ($event.target.checked) {
            for (let o of this.allLayers) {
                this.map.addLayer(o);
            }
        } else {
            for (let o of this.allLayers) {
                this.map.removeLayer(o);
            }
        }
    }

    private async ngOnInit(): Promise<void> {
        await this.mapService.initLeaflit();

        await Promise.all([
            this.loadLocales(this.translate.currentLang),
            this.loadItems(),
            //this.loadLootBoxConfig(),
            //this.loadUpgrades(),
            //this.loadUpgradeProperties()
        ]);

        this.translate.onLangChange.subscribe((i) => {
            this.loadLocales(i.lang);
        });

        fetch(`/assets/data/${this.game}/map.json`).then((response) => {
            if (response.ok) {
                response.json().then((gamedata: MapHoc) => {
                    fetch(`/assets/data/${this.game}_config.json`)
                        .then((response) => response.json())
                        .then((gameConfig: MapConfig) => {
                            this.loadMap(gamedata, gameConfig);
                        });
                });
            }
        });
    }

    private configureSeo(): void {
        this.meta.addTag({
            name: 'description',
            content: `Interactive maps for the S.T.A.L.K.E.R. series`,
        });
        this.meta.addTag({
            name: 'keywords',
            content: `Stalker 2 map, Heart Of Chornobyl map, S2 map, Heart of Chernobyl map, s.t.a.l.k.e.r. map, interactive map, Call of Pripyat map, Clear Sky map, Shadow of Chornobyl map, Shadow of Chernobyl map, shoc map, cs map, cop map, hoc map, s2 map`,
        });

        this.titleService.setTitle(
            this.translate.instant(`${this.game}MapPageTitle`)
        );
    }

    private scaleFactor: number = 1;

    private loadMap(gameData: MapHoc, gameConfig: MapConfig): void {
        this.gamedata = gameData;
        this.mapConfig = gameConfig;

        this.gamedata.widthInMeters = gameConfig.mapBounds[1][1] - gameConfig.mapBounds[0][1];
        this.gamedata.heightInMeters = gameConfig.mapBounds[1][0] - gameConfig.mapBounds[0][0];

        let bounds = [[0, 0]];

        let width = 0;
        let height = 0;

        let wrapper = document.getElementById('map-wrapper');

        if (window.screen.width > this.gamedata.widthInMeters) {
            width = this.gamedata.widthInMeters;
            height = this.gamedata.heightInMeters;
        } else {
            width = window.screen.width;

            if (wrapper) {
                width -= wrapper.offsetLeft * 2;
            }

            height =
                (this.gamedata.heightInMeters / this.gamedata.widthInMeters) * width;
        }

        bounds.push([height, width]);

        if (wrapper) {
            let body = document.body,
                html = document.documentElement;

            let height = Math.max(
                body.scrollHeight,
                body.offsetHeight,
                html.clientHeight,
                html.scrollHeight,
                html.offsetHeight
            );

            let wrapperHeight = height - wrapper.offsetTop - 10;
            document.documentElement.style.setProperty(
                '--wrapper-height',
                `${wrapperHeight}px`
            );
        }

        this.scaleFactor = width / this.gamedata.widthInMeters;

        let maxZoom = gameConfig.maxZoom;

        let currentPixelsInMeter = Math.pow(2, maxZoom) * this.scaleFactor * window.devicePixelRatio;

        if (currentPixelsInMeter < gameConfig.minPixelsPerMeter) {
            let neededlogValue = gameConfig.minPixelsPerMeter / (this.scaleFactor * window.devicePixelRatio);
            let correctZoom = Math.ceil(Math.log(neededlogValue) / Math.log(2));
            maxZoom = correctZoom;
        }

        let customCrs = L.extend({}, L.CRS.Simple, {
            transformation: new L.Transformation(this.scaleFactor, 0, this.scaleFactor, 0),
        });

        let center = [0, 0];

        if (gameConfig.mapBounds != null) {
            center = [(gameConfig.mapBounds[1][0] - gameConfig.mapBounds[0][0]) / 2, (gameConfig.mapBounds[1][1] - gameConfig.mapBounds[0][1]) / 2]
        }

        this.map = L.map('map', {
            center: center,
            zoom: gameConfig.startZoom,
            minZoom: gameConfig.minZoom,
            maxZoom: maxZoom,
            crs: customCrs,
            markerZoomAnimation: !0,
            zoomAnimation: !0,
            zoomControl: !1,
        });

        this.map.scaleFactor = this.scaleFactor;

        this.map.attributionControl.addAttribution('&copy; <a href="https://stalker-map.online">stalker-map.online</a>');
        this.map.attributionControl.addAttribution('<a href="https://github.com/joric">Tile maps by joric</a>');

        let baseLayers = [];

        if (gameConfig.globalMapFileName && gameConfig.mapBounds) {
            let b = [
                [
                    gameConfig.mapBounds[0][0],
                    gameConfig.mapBounds[0][1]
                ],
                [
                    gameConfig.mapBounds[1][0],
                    gameConfig.mapBounds[1][1]
                ],
            ];

            let baseTilesInRow: number = 2;
            let zoomOffset: number = 2;
            let tileSize: number = width / Math.pow(baseTilesInRow, zoomOffset);

            let rawGameMap = L.tileLayer('https://joric.github.io/stalker2_tileset/extras/wb/{z}/{x}/{y}.jpg',
                {
                    tileSize: tileSize,
                    zoomOffset: zoomOffset,
                    minZoom: gameConfig.minZoom,
                    maxZoom: maxZoom,
                    maxNativeZoom: 3,
                    noWrap: true
                })

            let inGameMap = L.tileLayer('https://joric.github.io/stalker2_tileset/tiles/{z}/{x}/{y}.jpg',
                {
                    tileSize: tileSize,
                    zoomOffset: zoomOffset,
                    minZoom: gameConfig.minZoom,
                    maxZoom: maxZoom,
                    maxNativeZoom: 4,
                    noWrap: true
                })

            inGameMap.ableToSearch = false;
            inGameMap.addToTop = false;
            rawGameMap.ableToSearch = false;
            rawGameMap.addToTop = false;


            rawGameMap.name = 'raw-map-label';
            inGameMap.name = 'in-game-map-label';

            inGameMap.addTo(this.map);

            baseLayers.push(inGameMap);
            baseLayers.push(rawGameMap);
        }

        this.canvasRenderer = this.mapService.getCanvasRenderer();
        this.svgIcon = this.mapService.getCanvasIconConstructor();
        this.svgMarker = this.mapService.getCanvasMarkerConstructor();

        if (this.gamedata.markers && this.gamedata.markers.length > 0) {
            this.addMarkers();
        }

        if (this.gamedata.lairs?.length > 0) {
            this.addLairs();
        }

        if (this.gamedata.anomalyFields && this.gamedata.anomalyFields.length > 0) {
            this.addAnomalyFields();
        }

        if (this.gamedata.stuffs && this.gamedata.stuffs.length > 0) {
            this.addStuffs();
        }

        if (this.gamedata.stashes && this.gamedata.stashes.length > 0) {
            this.addStashes();
        }

        if (this.gamedata.traders && this.gamedata.traders.length > 0) {
            this.addTraders();
        }

        if (this.gamedata.guides && this.gamedata.guides.length > 0) {
            this.addGuides();
        }

        if (
            this.gamedata.artefactSpawners &&
            this.gamedata.artefactSpawners.length > 0
        ) {
            this.addArtefactSpawners();
        }

        if (!isDevMode()) {
            const analytics = getAnalytics();
            logEvent(analytics, 'open-map', {
                game: 'hoc',
                language: this.translate.currentLang,
            });
        }

        let ruler: any = null;
        if (gameConfig.rulerEnabled) {
            ruler = this.mapService.addRuler(this.map, 1, 8000);
        }

        let cellSize = 130;

        document.documentElement.style.setProperty(
            '--inventory-cell-size',
            `${cellSize}px`
        );

        document.documentElement.style.setProperty(
            '--initial-inventory-cell-size',
            `${cellSize}px`
        );

        document.documentElement.style.setProperty(
            '--item-width-in-cell',
            `36`
        );

        document.documentElement.style.setProperty(
            '--attachment-width-in-cell',
            `55`
        );

        let tempMap = this.map;
        let component = this;
        this.map.on('click', function (ev: any) {
            var latlng = tempMap.mouseEventToLatLng(ev.originalEvent);

            if (ev.originalEvent.shiftKey && ev.originalEvent.altKey) {
                console.log(latlng);
            } else if (ev.originalEvent.ctrlKey && ev.originalEvent.shiftKey) {
                let coors = '';

                coors += `\"x\": ${latlng.lng},\n`;
                coors += `\t\t\t\"y\": 0,\n`;
                coors += `\t\t\t\"z\": ${latlng.lat},`;

                console.log(coors);
            }

            //if (e.ctrlKey) {/*ctrl is down*/}
            //if (e.metaKey) {/*cmd is down*/}
        });

        this.createCustomLayersControl();
        this.createCellSizeChangerControl();

        let layersToLayerController: any = [];

        if (
            gameConfig.markersConfig != null &&
            gameConfig.markersConfig.length > 0 &&
            this.allLayers.length > 0
        ) {
            let newLayers: any[] = [];
            for (let config of gameConfig.markersConfig) {
                if (this.allLayers.some((y: any) => y.name == config.uniqueName)) {
                    let currentLayer: any = this.allLayers.find(
                        (D: any) => D.name == config.uniqueName
                    );

                    if (currentLayer) {
                        newLayers.push(currentLayer);

                        if (config.isShowByDefault) {
                            currentLayer.addTo(this.map);
                        }
                    }
                }
            }

            layersToLayerController = newLayers;
        }

        this.translate.onLangChange.subscribe((i) => {
            this.layerContoller.remove();

            let addRuler = false;

            if (ruler) {
                ruler.remove();
                addRuler = true;
            }

            let layersToControl = layersToLayerController.map((x: any) => [
                this.translate.instant(x.name),
                x,
            ]);

            let baseLayersControl = baseLayers.map((x: any) => [
                this.translate.instant(x.name), x
            ]);

            this.layerContoller = L.control.customLayers(
                Object.fromEntries(baseLayersControl),
                Object.fromEntries(layersToControl),
                { overlaysListTop: this.overlaysListTop }
            );
            this.layerContoller.searchName = 'layerControl';
            this.layerContoller.isUnderground = false;
            this.layerContoller.addTo(this.map);

            if (addRuler) {
                ruler = this.mapService.addRuler(this.map, 1, 8000);
            }

            this.createSearchController();
        });

        let layersToControl = layersToLayerController.map((x: any) => [
            this.translate.instant(x.name),
            x,
        ]);

        let baseLayersControl = baseLayers.map((x: any) => [
            this.translate.instant(x.name), x
        ]);

        this.layerContoller = L.control.customLayers(
            Object.fromEntries(baseLayersControl),
            Object.fromEntries(layersToControl),
            { overlaysListTop: this.overlaysListTop }
        );
        this.layerContoller.addTo(this.map);
        this.createSearchController();

        let carousel = document.getElementById(this.overlaysListTop) as HTMLElement;

        carousel.addEventListener('wheel', function (e) {
            if (e.deltaY > 0)
                carousel.scrollLeft += 100;
            else
                carousel.scrollLeft -= 100;
        });
    }

    private createSearchController(): void {
        if (this.searchContoller) {
            this.searchContoller.remove();
        }

        let searchLayers = this.reorderSearchingLayers(this.allLayers);
        let translate = this.translate;

        this.searchContoller = L.control.search({
            layer: searchLayers,
            initial: false,
            propertyName: 'search',
            delayType: 0,
            collapsed: false,
            autoCollapseTime: 10000,
            textPlaceholder: this.translate.instant('search'),
            buildTip: function (text: string, val: any) {
                try {
                    let translated = translate.instant(val.layer.name);
                    let type = '';
                    let location = '';

                    return (
                        '<a href="#"><span class="stalker-search-item ' +
                        type +
                        '">' +
                        translated +
                        '</span></a>'
                    );
                } catch (ex) {
                    console.error(text, val, val.layer.properties);
                    throw ex;
                }
            },
        });

        this.searchContoller.on(
            'search:locationfound',
            function (e: {
                layer: {
                    openPopup: () => void;
                };
            }) {
                e.layer.openPopup();
            }
        );

        this.map.addControl(this.searchContoller);
        this.configureSeo();
    }

    private createCustomLayersControl(): void {
        L.Control.CustomLayers = L.Control.Layers.extend({
            // @section
            // @aka Control.Layers options
            options: {
                // @option collapsed: Boolean = true
                // If `true`, the control will be collapsed into an icon and expanded on mouse hover, touch, or keyboard activation.
                collapsed: true,
                position: 'topright',

                // @option autoZIndex: Boolean = true
                // If `true`, the control will assign zIndexes in increasing order to all of its layers so that the order is preserved when switching them on/off.
                autoZIndex: true,

                // @option hideSingleBase: Boolean = false
                // If `true`, the base layers in the control will be hidden when there is only one.
                hideSingleBase: false,

                // @option sortLayers: Boolean = false
                // Whether to sort the layers. When `false`, layers will keep the order
                // in which they were added to the control.
                sortLayers: false,
                overlaysListTop: null,

                // @option sortFunction: Function = *
                // A [compare function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)
                // that will be used for sorting the layers, when `sortLayers` is `true`.
                // The function receives both the `L.Layer` instances and their names, as in
                // `sortFunction(layerA, layerB, nameA, nameB)`.
                // By default, it sorts layers alphabetically by their name.
                sortFunction(layerA: any, layerB: any, nameA: any, nameB: any) {
                    return nameA < nameB ? -1 : nameB < nameA ? 1 : 0;
                },
            },

            _initLayout: function () {
                L.Control.Layers.prototype._initLayout.call(this);

                if (!this.isUnderground && this.options.overlaysListTop) {
                    this._overlaysListTop = document.getElementById(
                        this.options.overlaysListTop
                    );
                }
            },

            initialize: function (baseLayers: any, overlays: any, options: any) {
                L.Util.setOptions(this, options);

                this._layerControlInputs = [];
                this._layerControlInputsTop = [];
                this._layers = [];
                this._lastZIndex = 0;
                this._handlingClick = false;
                this._preventClick = false;

                for (const i in baseLayers) {
                    if (Object.hasOwn(baseLayers, i)) {
                        this._addLayer(baseLayers[i], i);
                    }
                }

                for (const i in overlays) {
                    if (Object.hasOwn(overlays, i)) {
                        this._addLayer(overlays[i], i, true);
                    }
                }
            },

            _update: function () {
                if (!this._container) {
                    return this;
                }

                this._baseLayersList.replaceChildren();
                this._overlaysList.replaceChildren();

                if (!this.isUnderground && this.options.overlaysListTop) {
                    this._overlaysListTop.replaceChildren();
                }

                this._layerControlInputs = [];
                this._layerControlInputsTop = [];
                let baseLayersPresent,
                    overlaysPresent,
                    i,
                    obj,
                    baseLayersCount = 0;

                for (i = 0; i < this._layers.length; i++) {
                    obj = this._layers[i];
                    this._addItem(obj);
                    overlaysPresent = overlaysPresent || obj.overlay;
                    baseLayersPresent = baseLayersPresent || !obj.overlay;
                    baseLayersCount += !obj.overlay ? 1 : 0;
                }

                // Hide base layers section if there's only one layer.
                if (this.options.hideSingleBase) {
                    baseLayersPresent = baseLayersPresent && baseLayersCount > 1;
                    this._baseLayersList.style.display = baseLayersPresent ? '' : 'none';
                }

                this._separator.style.display =
                    overlaysPresent && baseLayersPresent ? '' : 'none';

                return this;
            },

            _addItem: function (obj: any) {
                const label = document.createElement('label'),
                    checked = this._map.hasLayer(obj.layer),
                    labelTop = document.createElement('label');

                let input;
                let inputTop;

                if (obj.overlay) {
                    input = document.createElement('input');
                    input.type = 'checkbox';
                    input.className = 'leaflet-control-layers-selector';
                    input.defaultChecked = checked;

                    inputTop = document.createElement('input');
                    inputTop.type = 'checkbox';
                    inputTop.className = 'leaflet-control-layers-selector';
                    inputTop.defaultChecked = checked;
                } else {
                    input = this._createRadioElement(
                        `leaflet-base-layers_${L.Util.stamp(this)}`,
                        checked
                    );
                    inputTop = this._createRadioElement(
                        `leaflet-base-layers_${L.Util.stamp(this)}`,
                        checked
                    );
                }

                inputTop.hidden = true;

                this._layerControlInputs.push(input);

                if (this.options.overlaysListTop && obj.layer.addToTop !== false) {
                    this._layerControlInputsTop.push(inputTop);
                }
                input.layerId = L.Util.stamp(obj.layer);

                let layerId;

                if (this.options.overlaysListTop) {
                    layerId = this._overlaysListTop.childNodes.length;
                } else {
                    layerId = L.Util.stamp(obj.layer);
                }

                const subHeaderPanel = document.createElement('div');
                const subHeaderCheckbox = document.createElement('label');
                const subHeaderSpan = document.createElement('span');
                const subHeaderSpanName = document.createElement('span');
                const labelInsideCheck = document.createElement('label');
                subHeaderSpanName.innerHTML = `${obj.name}`;

                subHeaderPanel.classList.add('sub-header-panel');
                subHeaderCheckbox.classList.add('sub-header-checkbox');

                subHeaderPanel.appendChild(subHeaderCheckbox);
                subHeaderCheckbox.appendChild(subHeaderSpan);
                subHeaderSpan.appendChild(inputTop);
                subHeaderSpan.appendChild(labelInsideCheck);
                subHeaderSpan.appendChild(subHeaderSpanName);

                input.id = `layer-${layerId}`;
                inputTop.id = `layer-top-${layerId}`;
                labelInsideCheck.setAttribute('for', inputTop.id);

                if (!obj.layer.isUnderground && this.options.overlaysListTop && obj.layer.addToTop !== false) {
                    obj.layer.topId = this._overlaysListTop.childNodes.length;
                    this._overlaysListTop.appendChild(subHeaderPanel);
                }

                L.DomEvent.on(input, 'click', this._onInputClick, this);
                L.DomEvent.on(subHeaderCheckbox, 'click', this._onInputClickTop, this);

                const name = document.createElement('span');
                name.innerHTML = `${obj.name}`;
                name.classList.add('stalker-search-item', obj.layer.name);

                // Helps from preventing layer control flicker when checkboxes are disabled
                // https://github.com/Leaflet/Leaflet/issues/2771
                const holder = document.createElement('span');
                //const holderTop = document.createElement('span');

                //labelTop.appendChild(holderTop);
                label.appendChild(holder);

                //holderTop.appendChild(inputTop)
                holder.appendChild(input);

                //holderTop.appendChild(nameTop)
                holder.appendChild(name);

                const container = obj.overlay
                    ? this._overlaysList
                    : this._baseLayersList;
                container.appendChild(label);

                this._checkDisabledLayers();
                return label;
            },

            _onInputClick: function () {
                // expanding the control on mobile with a click can cause adding a layer - we don't want this
                if (this._preventClick) {
                    return;
                }

                const inputs = this._layerControlInputs,
                    inputsTop = this._layerControlInputsTop,
                    addedLayers = [],
                    removedLayers = [];
                let input, inputTop, layer;

                this._handlingClick = true;

                if (this.options.overlaysListTop) {
                    for (let i = inputs.length - 1; i >= 0; i--) {
                        input = inputs[i];
                        layer = this._getLayer(input.layerId).layer;

                        inputTop = inputsTop[layer.topId];

                        if (input.checked) {
                            if (layer.addToTop !== false) {
                                inputTop.checked = true;
                            }

                            addedLayers.push(layer);
                        } else if (!input.checked) {
                            if (layer.addToTop !== false) {
                                inputTop.checked = false;
                            }

                            removedLayers.push(layer);
                        }
                    }
                } else {
                    for (let i = inputs.length - 1; i >= 0; i--) {
                        input = inputs[i];
                        layer = this._getLayer(input.layerId).layer;

                        if (input.checked) {
                            addedLayers.push(layer);
                        } else if (!input.checked) {
                            removedLayers.push(layer);
                        }
                    }
                }

                this._onInputClickFinal(addedLayers, removedLayers);
            },

            _onInputClickTop: function () {
                // expanding the control on mobile with a click can cause adding a layer - we don't want this
                if (this._preventClick) {
                    return;
                }

                const inputs = this._layerControlInputs,
                    inputsTop = this._layerControlInputsTop,
                    addedLayers = [],
                    removedLayers = [];
                let input, inputTop, layer;

                this._handlingClick = true;

                for (let i = inputs.length - 1; i >= 0; i--) {
                    input = inputs[i];
                    layer = this._getLayer(input.layerId).layer;

                    if (layer.topId) {
                        inputTop = inputsTop[layer.topId];

                        if (inputTop.checked) {
                            input.checked = true;
                            addedLayers.push(layer);
                        } else if (!inputTop.checked) {
                            input.checked = false;
                            removedLayers.push(layer);
                        }
                    }
                }

                this._onInputClickFinal(addedLayers, removedLayers);
            },

            _onInputClickFinal(addedLayers: any, removedLayers: any) {
                // Bugfix issue 2318: Should remove all old layers before readding new ones
                for (let i = 0; i < removedLayers.length; i++) {
                    if (this._map.hasLayer(removedLayers[i])) {
                        this._map.removeLayer(removedLayers[i]);
                    }
                }
                for (let i = 0; i < addedLayers.length; i++) {
                    if (!this._map.hasLayer(addedLayers[i])) {
                        this._map.addLayer(addedLayers[i]);
                    }
                }

                this._handlingClick = false;
                this._refocusOnMap();
            },
        });

        L.control.customLayers = function (
            baseLayers: any,
            overlays: any,
            options: any
        ) {
            return new L.Control.CustomLayers(baseLayers, overlays, options);
        };
    }

    private createCellSizeChangerControl(): void {
        L.Control.Slider = L.Control.extend({
            options: {
                position: 'topleft'
            },

            onAdd: function (map: object) {
                // Створюємо основний контейнер
                const container = L.DomUtil.create('div', 'leaflet-control-slider-container');

                // Додаємо іконку/заголовок (щоб було на що наводити)
                const icon = L.DomUtil.create('div', 'slider-icon', container);
                icon.innerHTML = '📏';

                // Створюємо сам input
                const slider = L.DomUtil.create('input', 'inventory-cell-slider', container);
                slider.type = 'range';
                slider.min = '50';
                slider.max = '130';
                slider.value = '130';
                slider.step = '10';

                // Зупиняємо розповсюдження подій кліку та прокрутки на карту
                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.disableScrollPropagation(container);

                // Обробник події (у Angular тут буде виклик вашого методу setCellSize)
                L.DomEvent.on(slider, 'input', (e: any) => {
                    this.options.onChange(e.target.value);
                });

                return container;
            }
        });

        // Функція-конструктор для зручності
        L.control.slider = function (options: object) {
            return new L.Control.Slider(options);
        };

        L.control.slider({
            position: 'topright',
            onChange: (value: string) => {
                this.mapService.setCellSize(value, 'hoc'); // Ваш існуючий метод
            }
        }).addTo(this.map);
    }

    private addMarkers(): void {
        let markerImages: any[] = [
            {
                name: 'EMarkerType::Location',
                icon: new this.svgIcon({
                    iconUrl:
                        '/assets/images/s2/Markers/T_LocationOrigin_NotActive_Shadow.png',
                    iconAnchor: [0, 0],
                }),
                radius: 120
            },
            {
                name: 'EMarkerType::ArchAnomaly',
                icon: new this.svgIcon({
                    iconUrl:
                        '/assets/images/s2/Markers/Texture_Archianomaly_NotActive_General_Shadow.png',
                    iconAnchor: [0, 0],
                }),
            },
            {
                name: 'ESpawnType::Hub',
                icon: new this.svgIcon({
                    iconUrl:
                        '/assets/images/s2/Markers/Texture_Camp_NotActive_General_Shadow.png',
                    iconAnchor: [0, 0],
                }),
                isHub: true
            },
            {
                name: 'ESpawnType::LairSpawner',
                icon: new this.svgIcon({
                    iconUrl:
                        '/assets/images/svg/marks/smart_terrain_default.svg',
                    iconAnchor: [0, 0],
                }),
                isLair: true,
                keepMapSize: true,
                radius: 50
            },
            {
                name: 'ESpawnType::Shelter',
                icon: new this.svgIcon({
                    iconUrl:
                        '/assets/images/svg/marks/shelter.svg',
                    iconAnchor: [0, 0],
                }),
                isShalter: true,
                keepMapSize: true,
                radius: 10
            }
        ];

        let markerTypes: string[] = [];
        let markerLayers: any[] = [];
        let circleMarkers: any[] = [];
        let hubs: any[] = [];
        let shelters: any[] = [];
        let playerShelters: any[] = [];
        let index: number = 0;

        for (let data of this.gamedata.markers) {
            let icon = markerImages.find((x: any) => x.name == data.type);

            let marker = new this.svgMarker(
                [data.z, data.x],
                { renderer: this.canvasRenderer, icon: icon, radius: icon.radius }
            );

            marker.name = data.title;
            marker.description = data.description;
            marker.feature = {};
            marker.feature.properties = {};

            if (!markerTypes.includes(data.type)) {
                markerTypes.push(data.type);
            }

            let dataToSearch: string[] = [index.toString()];
            index++;

            if (data.title) {
                dataToSearch.push(data.title);
            }

            if (data.description) {
                dataToSearch.push(data.description);
            }

            if (dataToSearch.length > 0 && !(icon.isMutantLair || icon.isLair || icon.isShalter)) {
                this.createTranslatableProperty(
                    marker.feature.properties,
                    'search',
                    dataToSearch,
                    this.translate
                );
            } else {
                marker.feature.properties.search = '';
            }

            if (data.radius > 0) {
                let color = 'white';

                circleMarkers.push(
                    L.circle([data.z, data.x], {
                        radius: data.radius,
                        color: color,
                        weight: 2,
                    })
                );
            }

            marker.bindTooltip((p: any) => this.createTooltip(p), {
                sticky: true,
                className: 's2-tooltip',
                offset: new Point(0, 50),
            });

            if (icon.isHub) {
                hubs.push(marker);
                continue;
            }

            if (icon.isShalter) {
                if (data.title == 'Shelter' || data.title.includes('Player')) {
                    playerShelters.push(marker);
                }
                else {
                    shelters.push(marker);
                }
                continue;
            }

            markerLayers.push(marker);
        }

        if (markerLayers.length > 0) {
            this.addLayerToMap(L.layerGroup(markerLayers), 'sub-location', true);
        }

        if (circleMarkers.length > 0) {
            //this.addLayerToMap(L.layerGroup(circleMarkers), 'circles', false);
        }

        if (hubs.length > 0) {
            this.addLayerToMap(L.layerGroup(hubs), 'hubs', true);
        }

        if (shelters.length > 0) {
            this.addLayerToMap(L.layerGroup(shelters), 'botPlayerShelters', true);
        }

        if (playerShelters.length > 0) {
            this.addLayerToMap(L.layerGroup(playerShelters), 'shelters', true);
        }

        this.addGrid();

        console.log(markerTypes);
    }

    private addGrid(): void {
        let grid = [];

        let gridGap: number = 356;
        let width = Math.floor(this.gamedata.widthInMeters / gridGap) + 1;
        let height = Math.floor(this.gamedata.heightInMeters / gridGap) + 1;

        let xShift = 0;
        let yShift = 146;

        let heightStart = 3;

        let startHeight = heightStart * gridGap;
        let endHeight = height * gridGap;

        for (let i = 1; i < width; i++) {
            let x = i * gridGap + xShift;

            grid.push(L.polyline([[startHeight, x], [endHeight, x]], { color: 'white', weight: 1, opacity: 0.5 }));
        }

        for (let i = heightStart; i < height; i++) {
            let y = yShift + i * gridGap;

            grid.push(L.polyline([[y, 0], [y, this.gamedata.widthInMeters]], { color: 'white', weight: 1, opacity: 0.5 }));
        }

        let letters = ['А', 'Б', 'В', 'Г', 'Ґ', 'Д', 'Е', 'Є', 'Ж', 'З', 'И', 'І', 'Ї', 'Й', 'К', 'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т'];

        for (let x = 1; x < width; x++) {
            let letter = letters[x - 1];

            for (let y = heightStart; y < height - 1; y++) {
                const label = `${letter}${y - 2}`;

                const icon = L.divIcon({
                    className: 'grid-label',
                    html: label,
                    iconSize: [0, 0]
                });

                grid.push(L.marker([yShift + y * gridGap + 10, x * gridGap + xShift + 10], { icon }));
            }
        }

        this.addLayerToMap(L.layerGroup(grid), 'grid', true);
    }

    private addLairs(): void {
        let mutantLairs: any[] = [];
        let lairs: any[] = [];

        let unknownIcon =
        {
            name: 'EMarkerType::Unknown',
            icon: new this.svgIcon({
                iconUrl:
                    '/assets/images/svg/marks/pre-mark.svg',
                iconAnchor: [0, 0],
            }),
            keepMapSize: true,
            radius: 3
        };

        let campRadius: number = 7.5;

        let monsterLair =
        {
            name: 'ESpawnType::LairSpawner',
            icon: new this.svgIcon({
                iconUrl:
                    '/assets/images/svg/marks/monsters.svg',
                iconAnchor: [0, 0]
            }),
            isMutantLair: true,
            keepMapSize: true,
            radius: campRadius
        };

        let stalkerCamp =
        {
            name: 'ESpawnType::LairSpawner',
            icon: new this.svgIcon({
                iconUrl:
                    '/assets/images/svg/factions/stalkers.svg',
                iconAnchor: [0, 0]
            }),
            isLair: true,
            keepMapSize: true,
            radius: campRadius
        };

        let banditCamp =
        {
            name: 'ESpawnType::LairSpawner',
            icon: new this.svgIcon({
                iconUrl:
                    '/assets/images/svg/factions/bandits.svg',
                iconAnchor: [0, 0],
            }),
            isLair: true,
            keepMapSize: true,
            radius: campRadius
        };

        let vartaCamp =
        {
            name: 'ESpawnType::LairSpawner',
            icon: new this.svgIcon({
                iconUrl:
                    '/assets/images/svg/factions/varta.svg',
                iconAnchor: [0, 0],
            }),
            isLair: true,
            keepMapSize: true,
            radius: campRadius
        };

        let sparkCamp =
        {
            name: 'ESpawnType::LairSpawner',
            icon: new this.svgIcon({
                iconUrl:
                    '/assets/images/svg/factions/iskra.svg',
                iconAnchor: [0, 0],
            }),
            isLair: true,
            keepMapSize: true,
            radius: campRadius
        };

        let armyCamp =
        {
            name: 'ESpawnType::LairSpawner',
            icon: new this.svgIcon({
                iconUrl:
                    '/assets/images/svg/factions/msop.svg',
                iconAnchor: [0, 0],
            }),
            isLair: true,
            keepMapSize: true,
            radius: campRadius
        };

        let mercCamp =
        {
            name: 'ESpawnType::LairSpawner',
            icon: new this.svgIcon({
                iconUrl:
                    '/assets/images/svg/factions/mercs.svg',
                iconAnchor: [0, 0],
            }),
            isLair: true,
            keepMapSize: true,
            radius: campRadius
        };

        let monolithCamp =
        {
            name: 'ESpawnType::LairSpawner',
            icon: new this.svgIcon({
                iconUrl:
                    '/assets/images/svg/factions/monolith.svg',
                iconAnchor: [0, 0],
            }),
            isLair: true,
            keepMapSize: true,
            radius: campRadius
        };

        let freedomCamp =
        {
            name: 'ESpawnType::LairSpawner',
            icon: new this.svgIcon({
                iconUrl:
                    '/assets/images/svg/factions/freedom.svg',
                iconAnchor: [0, 0],
            }),
            isLair: true,
            keepMapSize: true,
            radius: campRadius
        };

        let dutyCamp =
        {
            name: 'ESpawnType::LairSpawner',
            icon: new this.svgIcon({
                iconUrl:
                    '/assets/images/svg/factions/duty.svg',
                iconAnchor: [0, 0],
            }),
            isLair: true,
            keepMapSize: true,
            radius: campRadius
        };

        let corpusCamp =
        {
            name: 'ESpawnType::LairSpawner',
            icon: new this.svgIcon({
                iconUrl:
                    '/assets/images/svg/factions/corpus.svg',
                iconAnchor: [0, 0],
            }),
            isLair: true,
            keepMapSize: true,
            radius: campRadius
        };

        let sciCamp =
        {
            name: 'ESpawnType::LairSpawner',
            icon: new this.svgIcon({
                iconUrl:
                    '/assets/images/svg/factions/scientists.svg',
                iconAnchor: [0, 0],
            }),
            isLair: true,
            keepMapSize: true,
            radius: campRadius
        };

        let zombieCamp =
        {
            name: 'ESpawnType::LairSpawner',
            icon: new this.svgIcon({
                iconUrl:
                    '/assets/images/svg/factions/zombie.svg',
                iconAnchor: [0, 0],
            }),
            isLair: true,
            keepMapSize: true,
            radius: campRadius
        };

        let noonCamp =
        {
            name: 'ESpawnType::LairSpawner',
            icon: new this.svgIcon({
                iconUrl:
                    '/assets/images/svg/factions/noon.svg',
                iconAnchor: [0, 0],
            }),
            isLair: true,
            keepMapSize: true,
            radius: campRadius
        };

        let index = 1;
        let counts: number[] = [0, 0, 0, 0, 0];

        let radius = 10;

        let mutants: string[] =
            [
                'Blinddog',
                'Flesh',
                'Boar',
                'Tushkan',
                'Deer',
                'Pseudodog',
                'Snork',
                'Bloodsucker',
                'Bayun',
                'Burer',
                'Poltergeist',
                'Chimera',
                'Controller',
                'Pseudogiant',
                'Rat'
            ]

        for (let data of this.gamedata.lairs) {
            if (data.lairs.length == 1) {
                let isMutant = mutants.includes(data.lairs[0].faction);
                let icon, title, desc, radius;
                let dataToSearch: string[] = [];

                if (isMutant) {
                    icon = monsterLair;
                    title = 'monster-lair';
                    desc = data.lairs[0].faction;
                    radius = campRadius;

                    dataToSearch.push(index.toString());
                    index++;

                    dataToSearch.push(title);
                    dataToSearch.push(desc);
                }
                else {
                    let icons = getIconAndFaction(data);
                    icon = icons[0].icon;
                    title = icons[0].title;
                    desc = icons[0].faction;
                    radius = icons[0].radius;
                }

                let marker = new this.svgMarker(
                    [data.z, data.x],
                    { renderer: this.canvasRenderer, icon: icon, radius: radius }
                );

                marker.name = title;
                marker.description = desc;
                marker.feature = {};
                marker.feature.properties = {};
                marker.feature.properties.model = data.lairs[0];

                if (dataToSearch.length > 0 && isMutant) {
                    this.createTranslatableProperty(
                        marker.feature.properties,
                        'search',
                        dataToSearch,
                        this.translate
                    );
                } else {
                    marker.feature.properties.search = '';
                }

                if (isMutant) {
                    mutantLairs.push(marker);
                }
                else {
                    lairs.push(marker);
                }

                marker.bindTooltip((p: any) => this.createLairTooltip(p), {
                    sticky: true,
                    className: 's2-tooltip',
                    offset: new Point(0, 50),
                });
            }
            else {
                let icons = getIconAndFaction(data);
                let shifts: number[][] = [];

                if (icons.length == 2) {
                    shifts.push([-radius, 0]);
                    shifts.push([radius, 0]);
                }
                else if (icons.length == 3) {
                    shifts.push([-radius * 1.5, 0]);
                    shifts.push([0, 0]);
                    shifts.push([radius * 1.5, 0]);
                }
                else if (icons.length == 4) {
                    shifts.push([-radius, -radius]);
                    shifts.push([radius, -radius]);
                    shifts.push([-radius, radius]);
                    shifts.push([radius, radius]);
                }
                else if (icons.length == 5) {
                    shifts.push([-radius / 3, -radius / 6]);
                    shifts.push([0, -radius / 6]);
                    shifts.push([radius / 3, -radius / 6]);
                    shifts.push([-radius / 6, radius / 6]);
                    shifts.push([radius / 6, radius / 6]);
                }

                for (let i = 0; i < icons.length; i++) {
                    let isMutant = mutants.includes(data.lairs[i].faction);
                    let marker = this.createMarker(data.x + shifts[i][0], data.z + shifts[i][1], icons[i], isMutant, index);

                    if (isMutant) {
                        mutantLairs.push(marker);
                    }
                    else {
                        lairs.push(marker);
                    }

                    index++;
                }

                counts[icons.length] += 1;
            }
        }

        if (lairs.length > 0) {
            this.addLayerToMap(L.layerGroup(lairs), 'stalker-respawn', true);
        }

        if (mutantLairs.length > 0) {
            this.addLayerToMap(L.layerGroup(mutantLairs), 'monster-lair', true);
        }

        function getIconAndFaction(data: LairCluster): { icon: any, faction: string, title: string, radius: number, model: Lair }[] {
            let title = 'stalker-respawn';

            let result = [];

            for (let lair of data.lairs) {
                let icon, desc;

                if (lair.faction.includes('Neutrals') || lair.faction.includes('Diggers') || lair.faction.includes('ShevchenkoStalkers')) {
                    icon = stalkerCamp;
                    desc = 'sid_misc_answer_faction_Neutrals';
                }
                else if (lair.faction.includes('Bandit')) {
                    icon = banditCamp;
                    desc = 'sid_misc_answer_faction_Bandit';
                }
                else if (lair.faction.includes('Varta')) {
                    icon = vartaCamp;
                    desc = 'sid_misc_answer_faction_Varta';
                }
                else if (lair.faction.includes('Spark')) {
                    icon = sparkCamp;
                    desc = 'sid_misc_answer_faction_Spark';
                }
                else if (lair.faction.includes('Militaries') || lair.faction.includes('MSOP')) {
                    icon = armyCamp;
                    desc = 'sid_misc_answer_faction_Militaries';
                }
                else if (lair.faction.includes('Mercenaries')) {
                    icon = mercCamp;
                    desc = 'sid_misc_answer_faction_Mercenaries';
                }
                else if (lair.faction.includes('Monolith')) {
                    icon = monolithCamp;
                    desc = 'sid_misc_answer_faction_Monolith';
                }
                else if (lair.faction.includes('Freedom')) {
                    icon = freedomCamp;
                    desc = 'sid_misc_answer_faction_Freedom';
                }
                else if (lair.faction.includes('Duty')) {
                    icon = dutyCamp;
                    desc = 'sid_misc_answer_faction_Duty';
                }
                else if (lair.faction.includes('Corpus')) {
                    icon = corpusCamp;
                    desc = 'sid_misc_answer_faction_Corpus';
                }
                else if (lair.faction.includes('Scientist')) {
                    icon = sciCamp;
                    desc = 'sid_misc_answer_faction_Scientist';
                }
                else if (lair.faction.includes('Zombie')) {
                    icon = zombieCamp;
                    title = 'zombie-lair'
                    desc = '';
                }
                else if (lair.faction.includes('Noon')) {
                    icon = noonCamp;
                    desc = 'sid_misc_answer_faction_Noon';
                }
                else if (mutants.includes(lair.faction)) {
                    icon = monsterLair;
                    title = 'monster-lair';
                    desc = lair.faction
                }
                else {
                    console.log(lair)
                    continue;
                }

                result.push({ icon: icon, faction: desc, title: title, radius: icon.radius, model: lair })
            }

            return result;
        }
    }

    private createMarker(x: number, y: number, markerData: any, isMutant: boolean, index: number): any {
        let dataToSearch: string[] = [];

        if (isMutant) {
            dataToSearch.push(index.toString());
            index++;

            dataToSearch.push(markerData.title);
            dataToSearch.push(markerData.desc);
        }

        let marker = new this.svgMarker(
            [y, x],
            { renderer: this.canvasRenderer, icon: markerData.icon }
        );

        marker.name = markerData.title;
        marker.description = markerData.faction;
        marker.feature = {};
        marker.feature.properties = {};
        marker.feature.properties.model = markerData.model;

        if (dataToSearch.length > 0 && isMutant) {
            this.createTranslatableProperty(
                marker.feature.properties,
                'search',
                dataToSearch,
                this.translate
            );
        } else {
            marker.feature.properties.search = '';
        }

        marker.bindTooltip((p: any) => this.createLairTooltip(p), {
            sticky: true,
            className: 's2-tooltip',
            offset: new Point(0, 50),
        });

        return marker;
    }

    private addAnomalyFields(): void {
        let markerImages = [
            {
                name: 'ESpawnType::PsyAnomaly',
                icon: new this.svgIcon({
                    iconUrl: 'assets/images/svg/marks/psi.svg',
                    iconAnchor: [0, 0],
                }),
            },
        ];

        let markers = [];

        for (let data of this.gamedata.anomalyFields) {
            let icon = markerImages.find((x: any) => x.name == data.type);

            let marker = new this.svgMarker(
                [data.z, data.x],
                { renderer: this.canvasRenderer, icon: icon, radius: 40 }
            );
            marker.name = this.translate.instant('psychic');

            markers.push(marker);
        }

        if (markers.length > 0) {
            this.addLayerToMap(L.layerGroup(markers), 'psychic', false);
        }
    }

    private addStuffs(): void {
        let stuffIcon = {
            icon: new this.svgIcon({
                iconUrl: '/assets/images/svg/marks/colored/items-low.svg',
                iconAnchor: [0, 0],
                color: "#ffffff"
            }),
            keepMapSize: true
        };
        let richStuffIcon = {
            icon: new this.svgIcon({
                iconUrl: '/assets/images/svg/marks/colored/items.svg',
                iconAnchor: [0, 0],
                color: "#ffffff"
            }),
            keepMapSize: true
        };

        let markers = [];
        let richMarkers = [];
        let radius = 4;

        for (let data of this.gamedata.stuffs) {
            let isRich = false;

            let localesToFind: string[] = [markers.length.toString()];
            let cost: number = 0;

            if (data.items && data.items.length > 0) {
                let itemsToFind: any[] = [];

                data.items.forEach((element: any) => {
                    let item = this.items.find((y) => y.uniqueName == element.uniqueName);

                    if (item) {
                        itemsToFind.push(item?.localeName);
                        itemsToFind.push(`synonyms.${item?.uniqueName}`);
                        cost += (item.price ?? 0) * (element.count ?? 0);

                        if (this.richClasses.includes(item.category)) {
                            isRich = true;
                        }
                    }
                });

                localesToFind.push(...itemsToFind);

                if (!isRich && cost > 10000) {
                    isRich = true;
                }
            }

            let marker = new this.svgMarker(
                [data.z, data.x],
                { renderer: this.canvasRenderer, icon: isRich ? richStuffIcon : stuffIcon, radius: radius }
            )

            marker.name = isRich ? 'rich_stuff_at_location' : 'stuff_at_location';
            marker.data = data;
            marker.feature = {};
            marker.feature.properties = {};

            if (localesToFind.length > 0) {
                this.createTranslatableProperty(
                    marker.feature.properties,
                    'search',
                    localesToFind,
                    this.translate
                );
            } else {
                marker.feature.properties.search = '';
            }

            marker.bindTooltip((p: any) => this.createTooltip(p), {
                sticky: true,
                className: 's2-tooltip',
                offset: new Point(0, 50),
            });

            marker.bindPopup(
                (p: any) =>
                    this.createStuffPopup(
                        p,
                        this.container,
                        this.game,
                        this.items,
                        false
                    ),
                { className: 'leaflet-popup-content-fit-content' }
            );

            if (isRich) {
                richMarkers.push(marker);
            }
            else {
                markers.push(marker);
            }
        }

        if (markers.length > 0) {
            this.addLayerToMap(L.layerGroup(markers), 'stuff', true);
        }

        if (richMarkers.length > 0) {
            this.addLayerToMap(L.layerGroup(richMarkers), 'rich-stuff', true);
        }
    }

    public addStashes(): void {
        let stuffIcon = {
            icon: new this.svgIcon({
                iconUrl: '/assets/images/svg/marks/colored/items-low.svg',
                iconAnchor: [0, 0],
                color: "#00df07"
            }),
            keepMapSize: true,
        };

        let notRandomIcon = {
            icon: new this.svgIcon({
                iconUrl: '/assets/images/svg/marks/colored/items.svg',
                iconAnchor: [0, 0],
                color: "#00df07"
            }),
            keepMapSize: true,
        };

        let richStuffIcon = {
            icon: new this.svgIcon({
                iconUrl: '/assets/images/svg/marks/colored/items.svg',
                iconAnchor: [0, 0],
                color: "#dd2a00"
            }),
            keepMapSize: true,
        };

        let deluxtuffIcon = {
            icon: new this.svgIcon({
                iconUrl: '/assets/images/svg/marks/colored/highlight-stahs.svg',
                iconAnchor: [0, 0],
                color: "#3E9EC6"
            }),
            keepMapSize: true,
        };

        let preOrderStuffIcon = {
            icon: new this.svgIcon({
                iconUrl: '/assets/images/svg/marks/colored/highlight-stahs.svg',
                iconAnchor: [0, 0],
                color: "#F8F22E"
            }),
            keepMapSize: true,
        };

        let UltimateStuffIcon = {
            icon: new this.svgIcon({
                iconUrl: '/assets/images/svg/marks/colored/highlight-stahs.svg',
                iconAnchor: [0, 0],
                color: "#ED6819"
            }),
            keepMapSize: true,
        };

        let markers = [];
        let richMarkers = [];
        let randomMarkers = [];
        let radius: number = 4;

        for (let data of this.gamedata.stashes) {
            let isRich = false;
            let isRandom = true;

            let localesToFind: string[] = [];

            if (data.itemGeneratorSettings?.length > 0) {
                for (let diff of data.itemGeneratorSettings) {
                    if (diff.itemGenerators?.length > 0) {
                        for (let generatorName of diff.itemGenerators) {
                            let generator = this.gamedata.stashGenerators.find(
                                (x) => x.name == generatorName
                            );

                            if (generator) {
                                for (let itemGen of generator.itemGenerators) {
                                    if (itemGen.possibleItems) {
                                        for (let possible of itemGen.possibleItems) {
                                            if (possible.chance == 1 && possible.name) {
                                                let item = this.items.find(
                                                    (x) => x.uniqueName == possible.name
                                                );

                                                if (item) {
                                                    localesToFind.push(item.localeName);
                                                    isRandom = false;

                                                    if (this.richClasses.includes(item.category)) {
                                                        isRich = true;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            let isDelux = false;
            let isUltimate = false;
            let isPreOrder = false;

            if (data.items?.length > 0) {
                for (let itemIn of data.items) {
                    let item = this.items.find(
                        (x) => x.uniqueName == itemIn.uniqueName
                    );

                    if (item) {
                        localesToFind.push(item.localeName);
                        isRandom = false;
                    }
                }

                isDelux = data.dlc == "Deluxe";
                isUltimate = data.dlc == "Ultimate";
                isPreOrder = data.dlc == "PreOrder"
            }

            let icon = null;

            if (isRich) {
                if (isDelux) {
                    icon = deluxtuffIcon;
                }
                else if (isPreOrder) {
                    icon = preOrderStuffIcon;
                }
                else if (isUltimate) {
                    icon = UltimateStuffIcon;
                }
                else {
                    icon = richStuffIcon;
                }
            }
            else {
                if (isRandom) {
                    icon = stuffIcon;
                }
                else {
                    icon = notRandomIcon
                }
            }

            let marker = new this.svgMarker(
                [data.z, data.x],
                {
                    renderer: this.canvasRenderer,
                    icon: icon,
                    radius: radius
                }
            );
            marker.name = 'stash';
            marker.description = data.clueVariablePrototypeSID;
            marker.data = data;
            marker.feature = {};
            marker.feature.properties = {};

            localesToFind.push(marker.name, markers.length.toString());

            /*if (data.items && data.items.length > 0) {
              let itemsToFind: any[] = [];
      
              data.items.forEach((element: any) => {
                let item = this.items.find(y => y.uniqueName == element.uniqueName);
      
                if (item) {
                  itemsToFind.push(item?.localeName);
                  itemsToFind.push(`synonyms.${item?.uniqueName}`);
                }
              });
      
              localesToFind.push(...itemsToFind);
            }*/

            if (localesToFind.length > 0) {
                this.createTranslatableProperty(
                    marker.feature.properties,
                    'search',
                    localesToFind,
                    this.translate
                );
            } else {
                marker.feature.properties.search = '';
            }

            marker.bindTooltip((p: any) => this.createTooltip(p), {
                sticky: true,
                className: 's2-tooltip',
                offset: new Point(0, 50),
            });

            if (!isRandom) {
                marker.bindPopup((p: any) => this.createStashPopup(p, this.container, this.game, this.items, false), { minWidth: 912, className: 'leaflet-popup-content-fit-content' });
            }

            if (isRich) {
                richMarkers.push(marker)
            }
            else {
                if (isRandom) {
                    randomMarkers.push(marker)
                }
                else {
                    markers.push(marker);
                }
            }
        }

        if (markers.length > 0) {
            this.addLayerToMap(L.layerGroup(markers), 'stash', true);
        }

        if (richMarkers.length > 0) {
            this.addLayerToMap(L.layerGroup(richMarkers), 'rich-stash', true);
        }

        if (randomMarkers.length > 0) {
            this.addLayerToMap(L.layerGroup(randomMarkers), 'random-stash', true);
        }
    }

    public addTraders(): void {
        let trader = {
            icon: new this.svgIcon({
                className: 'mark-container stalker-mark-1.5',
                animate: false,
                iconUrl: '/assets/images/svg/marks/trader.svg',
                iconAnchor: [0, 0],
            }),
            keepMapSize: true,
        };

        let medic = {
            icon: new this.svgIcon({
                className: 'mark-container stalker-mark-1.5',
                animate: false,
                iconUrl: '/assets/images/s2/Markers/Texture_Medecine_NotActive_General_Shadow.png',
                iconAnchor: [0, 0],
                imageFactor: 2
            }),
            keepMapSize: true,
        };

        let traders: any[] = [];
        let medics: any[] = [];
        let radius: number = 10;

        for (let data of this.gamedata.traders) {
            let icon = null;
            let array = [];

            if (data.marker == "Trader") {
                icon = trader;
                array = traders;
            }
            else if (data.marker == "Medic") {
                icon = medic;
                array = medics;
            }

            let marker = new this.svgMarker(
                [data.z, data.x],
                { renderer: this.canvasRenderer, icon: icon, radius: radius }
            );

            marker.data = data;
            marker.name = data.name;
            marker.feature = {};
            marker.feature.properties = {};

            let localesToFind: string[] = [];
            localesToFind.push(data.name);

            if (localesToFind.length > 0) {
                this.createTranslatableProperty(
                    marker.feature.properties,
                    'search',
                    localesToFind,
                    this.translate
                );
            } else {
                marker.feature.properties.search = '';
            }

            marker.bindTooltip((p: any) => this.createTooltip(p), {
                sticky: true,
                className: 's2-tooltip',
                offset: new Point(0, 50),
            });

            marker.bindPopup(
                (p: any) => this.createTraderPopup(p),
                { className: 'leaflet-popup-content-fit-content' }
            );

            array.push(marker);
        }

        if (traders.length > 0) {
            this.addLayerToMap(L.layerGroup(traders), 'traders', true);
        }

        if (medics.length > 0) {
            this.addLayerToMap(L.layerGroup(medics), 'medics', true);
        }
    }

    public addGuides(): void {
        let guider = {
            icon: new this.svgIcon({
                className: 'mark-container stalker-mark-1.5',
                animate: false,
                iconUrl: '/assets/images/svg/marks/character.svg',
                iconAnchor: [0, 0],
            }),
            keepMapSize: true,
        };

        let guiders: any[] = [];
        let radius: number = 10;

        for (let data of this.gamedata.guides) {
            let marker = new this.svgMarker(
                [data.z, data.x],
                { renderer: this.canvasRenderer, icon: guider, radius: radius }
            );

            marker.name = data.name;
            marker.data = data;
            marker.feature = {};
            marker.feature.properties = {};

            let localesToFind: string[] = [];
            localesToFind.push(data.name);

            if (localesToFind.length > 0) {
                this.createTranslatableProperty(
                    marker.feature.properties,
                    'search',
                    localesToFind,
                    this.translate
                );
            } else {
                marker.feature.properties.search = '';
            }

            marker.bindTooltip((p: any) => this.createTooltip(p), {
                sticky: true,
                className: 's2-tooltip',
                offset: new Point(0, 50),
            });

            marker.bindPopup(
                (p: any) => this.createGuidePopup(p),
                { className: 'leaflet-popup-content-fit-content' }
            );

            guiders.push(marker);
        }

        if (guiders.length > 0) {
            this.addLayerToMap(L.layerGroup(guiders), 'guides', true);
        }
    }

    public addArtefactSpawners(): void {
        let stuffIcon = {
            icon: new this.svgIcon({
                iconUrl: '/assets/images/svg/marks/anomaly.svg',
                iconAnchor: [0, 0],
            }),
            keepMapSize: true,
            radius: 2,
        };

        let markers = [];

        for (let data of this.gamedata.artefactSpawners) {
            let marker = new this.svgMarker(
                [data.z, data.x],
                { renderer: this.canvasRenderer, icon: stuffIcon }
            );

            marker.name = 'anomaly-zone';
            marker.data = data;
            marker.feature = {};
            marker.feature.properties = {};

            let dataToSearch: string[] = [data.spawner, markers.length.toString()];
            let config = this.gamedata.artefactSpawnerData.configs.find(
                (x) => x.name == data.spawner
            );

            if (config) {
                if (config.useListOfArtifacts) {
                    if (config.listOfArtifacts && config.listOfArtifacts.length > 0) {
                        for (let art of config.listOfArtifacts) {
                            let item = this.items.find((x) => x.uniqueName == art);

                            if (item) {
                                dataToSearch.push(item.localeName);
                            }
                        }
                    }
                } else {
                    let allArts = this.gamedata.artefactSpawnerData.artefacts;

                    if (
                        config.excludeRules &&
                        config.excludeRules.includes(
                            ArtefactSpawnerPopupComponent.excludeArchiArtifacts
                        )
                    ) {
                        allArts = allArts.filter(
                            (x) => x.archiartifactType == 'EArchiartifactType::None'
                        );
                    }

                    for (let art of allArts) {
                        let item = this.items.find((x) => x.uniqueName == art.name);

                        if (item) {
                            dataToSearch.push(item.localeName);
                        }
                    }
                }
            }

            if (dataToSearch.length > 0) {
                this.createTranslatableProperty(
                    marker.feature.properties,
                    'search',
                    dataToSearch,
                    this.translate
                );
            }

            marker.bindTooltip((p: any) => this.createTooltip(p), {
                sticky: true,
                className: 's2-tooltip',
                offset: new Point(0, 50),
            });

            marker.bindPopup(
                (p: any) => this.createArtefactSpawnerPopup(p, this.items),
                { minWidth: 910, maxWidth: 928, className: 'leaflet-popup-content-fit-content' }
            );

            markers.push(marker);
        }

        if (markers.length > 0) {
            this.addLayerToMap(L.layerGroup(markers), 'anomaly-zone', true);
        }
    }

    public createArtefactSpawnerPopup(marker: any, allItems: Item[]) {
        marker.getPopup().on('remove', function () {
            marker.getPopup().off('remove');
            componentRef.destroy();
        });

        const componentRef = this.container.createComponent(ArtefactSpawnerPopupComponent);
        componentRef.instance.artefactSpawner = marker.data;
        componentRef.instance.artefactSpawnerData =
            this.gamedata.artefactSpawnerData;
        componentRef.instance.items = this.items;
        /*componentRef.instance.anomalZone = zone.properties.zoneModel;
        componentRef.instance.game = game;
        componentRef.instance.allItems = allItems;
        componentRef.instance.isUnderground = isUnderground;*/

        return componentRef.location.nativeElement;
    }

    public createGuidePopup(marker: any) {
        marker.getPopup().on('remove', function () {
            marker.getPopup().off('remove');
            componentRef.destroy();
        });

        const componentRef = this.container.createComponent(GuideComponent);
        componentRef.instance.guide = marker.data;

        return componentRef.location.nativeElement;
    }

    public createTraderPopup(marker: any) {
        marker.getPopup().on('remove', function () {
            marker.getPopup().off('remove');
            componentRef.destroy();
        });

        const componentRef = this.container.createComponent(TraderComponent);
        componentRef.instance.trader = marker.data;
        componentRef.instance.allItems = this.items;
        componentRef.instance.tradeItemGenerators = this.gamedata.tradeItemGenerators;

        return componentRef.location.nativeElement;
    }

    public createStuffPopup(
        stash: any,
        container: ViewContainerRef,
        game: string,
        allItems: Item[],
        isUnderground: boolean
    ) {
        stash.getPopup().on('remove', function () {
            stash.getPopup().off('remove');
            componentRef.destroy();
        });

        const componentRef = container.createComponent(HocStuffComponent);
        componentRef.instance.stuff = stash.data;
        componentRef.instance.game = new Game();
        componentRef.instance.game.uniqueName = 'hoc';
        componentRef.instance.game.gameStyle = 'hoc';
        componentRef.instance.allItems = allItems;
        componentRef.instance.stuffType = 'stuff';
        componentRef.instance.isUnderground = isUnderground;

        return componentRef.location.nativeElement;
    }

    public createStashPopup(
        stash: any,
        container: ViewContainerRef,
        game: string,
        allItems: Item[],
        isUnderground: boolean
    ) {
        stash.getPopup().on('remove', function () {
            stash.getPopup().off('remove');
            componentRef.destroy();
        });

        const componentRef = container.createComponent(HocStashComponent);
        componentRef.instance.stash = stash.data;
        componentRef.instance.allItems = allItems;
        componentRef.instance.stashGenerators = this.gamedata.stashGenerators;
        componentRef.instance.stashPrototypes = this.gamedata.stashPrototypes;

        return componentRef.location.nativeElement;
    }

    public createTooltip(marker: any) {
        let html = `<div class="header-tip"><span class="header">${this.translate.instant(
            marker.name
        )}</span></div>`;
        if (marker.description) {
            html += `<div class="tooltip-text"><p>${this.translate.instant(
                marker.description
            )}</p></div>`;
        }

        return html;
    }

    public createLairTooltip(marker: any) {
        let html = `<div class="header-tip"><span class="header">${this.translate.instant(
            marker.name
        )}</span></div>`;

        html += `<div class="tooltip-text">`;

        if (marker.description) {
            html += `<p>${this.translate.instant(marker.description)}</p>`;
        }

        html += this.addPropety('type', marker.feature.properties.model.type);
        html += this.addPropety('minSpawnRank', marker.feature.properties.model.minSpawnRank);
        html += this.addPropety('maxSpawnRank', marker.feature.properties.model.maxSpawnRank);

        html += this.addPropety('canBeCaptured', marker.feature.properties.model.canBeCaptured);
        html += this.addPropety('canAttack', marker.feature.properties.model.canAttack);
        html += this.addPropety('canDefend', marker.feature.properties.model.canDefend);
        html += this.addPropety('activeLair', marker.feature.properties.model.activeLair);

        html += `</div>`;

        return html;
    }

    private addPropety(title: string, value: string): string {
        return `<p><span>${title}:</span>&#9;&#9;<span>${value}</span></p>`
    }

    private reorderSearchingLayers(layers: any): any {
        let newUndergroundLayer: any = {};
        let undergroundMarkers: any[] = [];
        let newLayers: any[] = [];

        for (let layer of layers) {
            if (this.map.hasLayer(layer)) {
                let markers: any[] = Object.values(layer._layers);
                newLayers.push(layer);
                /*if (markers[0] && markers[0].properties && markers[0].properties.typeUniqueName) {
                      undergroundMarkers.push(...this.undergroundMarkerToSearch.filter(x => x.properties.typeUniqueName == markers[0].properties.typeUniqueName));
                    }*/
            }
        }

        if (
            Object.values(layers).some(
                (x: any) => x.name == 'level-changers' && this.map.hasLayer(x)
            )
        ) {
            newUndergroundLayer = L.layerGroup(undergroundMarkers);
            newUndergroundLayer.ableToSearch = true;
            newUndergroundLayer.name = 'underground';
            newLayers.push(newUndergroundLayer);
        }
        return L.featureGroup(newLayers);
    }

    private createTranslatableProperty(
        object: any,
        propertyName: string,
        array: string[],
        translate: TranslateService
    ): void {
        Object.defineProperty(object, propertyName, {
            get: function () {
                try {
                    return this.array
                        .filter((x: any) => x != null)
                        .map((x: string) => translate.instant(x))
                        .join(', ');
                } catch (ex) {
                    console.error(this.array);
                    throw ex;
                }
            },
            set: function (array) {
                this.array = array;
            },
        });

        object[propertyName] = array;
    }

    private async loadItems(): Promise<void> {
        await fetch(`/assets/data/${this.game}/items.json`).then((response) => {
            if (response.ok) {
                response.json().then((items: Item[]) => {
                    if (items) {
                        this.items = items;

                        const uniqueTypes: string[] = Array.from(
                            new Set(
                                items.map(item => item.category)
                            )
                        );
                    }
                });
            }
        });
    }

    private addLayerToMap(layer: any, name: any, ableToSearch: boolean = false) {
        layer.ableToSearch = ableToSearch;
        layer.name = name;

        this.allLayers.push(layer);
    }

    @HostListener('window:resize', ['$event'])
    private onResize(event: any): void {
        let vh = event.target.outerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);

        let wrapper = document.getElementById('map-wrapper');

        if (wrapper) {
            let wrapperHeight = event.target.innerHeight - wrapper.offsetTop - 10;
            document.documentElement.style.setProperty(
                '--wrapper-height',
                `${wrapperHeight}px`
            );
        }
    }

    private async loadLocales(language: string): Promise<void> {
        await fetch(
            `/assets/data/${this.game}/${this.translate.currentLang}.json`
        ).then((response) => {
            if (response.ok) {
                response.json().then((locales: any) => {
                    if (locales) {
                        this.translate.setTranslation(language, locales, true);
                    }
                });
            }
        });

        fetch(`/assets/data/${this.game}/locale_import.json`).then((response) => {
            if (response.ok) {
                response.json().then((locales: any) => {
                    let games = Object.keys(locales);
                    if (games.length > 0) {
                        for (let game of games) {
                            let importLocales = locales[game].locales;

                            if (!(importLocales == null || importLocales.length == 0)) {
                                fetch(
                                    `/assets/data/${game}/${this.translate.currentLang}.json`
                                ).then((response) => {
                                    if (response.ok) {
                                        response.json().then((locales: any) => {
                                            if (locales) {
                                                let localesToInject: any = {};
                                                for (let locale of importLocales) {
                                                    if (locales[locale] != null) {
                                                        localesToInject[locale] = locales[locale];
                                                    }
                                                }

                                                this.translate.setTranslation(
                                                    language,
                                                    localesToInject,
                                                    true
                                                );
                                            }
                                        });
                                    }
                                });
                            }
                        }
                    }
                });
            }
        });
    }
}
