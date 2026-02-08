import { MapComponent } from './../components/map/map.component';
import { Injectable, ViewContainerRef } from "@angular/core";
import { HiddenMarker } from "../models/hidden-marker.model";
import { StuffComponent } from '../components/stuff/stuff.component';
import { Item } from '../models/item.model';
import { LootBoxClusterComponent } from '../components/loot-box-cluster/loot-box-cluster.component';
import { LootBox } from '../models/loot-box/loot-box-section.model';
import { LootBoxConfig } from '../models/loot-box/loot-box-config.model';
import { Location } from '../models/location.model';
import { AnomalyZoneComponent } from '../components/anomaly-zone/anomaly-zone.component';
import { TraderComponent } from '../components/trader/trader.component';
import { TraderModel } from '../models/trader';
import { TraderSectionsConfig } from '../models/trader/trader-sections-config.model';
import { MapConfig } from '../models/gamedata/map-config';
import { StalkerComponent } from '../components/stalker/stalker.component';
import { Mechanic } from '../models/mechanic.model';
import { MechanicComponent } from '../components/mechanic/mechanic.component';
import { ItemUpgrade, UpgradeProperty } from '../models/upgrades/upgrades';
import { TranslateService } from '@ngx-translate/core';
import { Game } from '../models/game.model';

declare const L: any;

@Injectable({
    providedIn: 'root'
})

export class MapService {
    private hiddenMarksLocalStorageKey: string = 'hidden-markers';
    private hiddenMarksCache: HiddenMarker[];
    private mapComponent: MapComponent;

    constructor(
        private translate: TranslateService) {

    }

    public async initLeaflit(): Promise<void> {
        if (typeof L === 'undefined') {
            await this.addScript('/assets/libs/leaflet/index.js');
            await this.addScript('/assets/libs/leaflet/leaflet.js');
            await this.addScript('/assets/libs/leaflet/plugins/search/leaflet-search.js');

            await Promise.all([
                this.addScript(
                    '/assets/libs/leaflet/plugins/search/leaflet-search-geocoder.js'
                ),
                this.addScript(
                    '/assets/libs/leaflet/plugins/ruler/leaflet-ruler.js'
                ),
                this.addScript(
                    '/assets/libs/leaflet/plugins/leaflet.geometryutil.js'
                ),
                this.addScript(
                    '/assets/libs/leaflet/plugins/arrow/leaflet-arrowheads.js'
                )
            ]);
            console.log('Leaflet is loaded');
        }

        await Promise.all([
            this.addStyle('/assets/libs/leaflet/leaflet.css'),
            this.addStyle('/assets/libs/leaflet/plugins/search/leaflet-search.css'),
            this.addStyle(
                '/assets/libs/leaflet/plugins/search/leaflet-search.mobile.css'
            ),
            this.addStyle('/assets/libs/leaflet/plugins/ruler/leaflet-ruler.css')
        ]);
    }

    public async addScript(scriptUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            let script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = scriptUrl;
            document.body.appendChild(script);

            script.onload = () => {
                resolve();
            }

            script.onerror = () => {
                console.error(`Can not load ${scriptUrl}.`);
                resolve();
            };
        });
    }

    public async addStyle(styleUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            let style = document.createElement('link');
            style.rel = 'stylesheet';
            style.href = styleUrl;
            document.body.appendChild(style);

            style.onload = () => {
                resolve();
            }

            style.onerror = () => {
                console.error(`Can not load ${styleUrl}.`);
                resolve();
            };
        });
    }

    public setMapComponent(mapComponent: MapComponent): void {
        this.mapComponent = mapComponent;
    }

    public createStashPopup(stash: any, container: ViewContainerRef, game: Game, allItems: Item[], isUnderground: boolean) {
        stash.getPopup().on('remove', function () {
            stash.getPopup().off('remove');
            componentRef.destroy();
        });

        const componentRef = container.createComponent(StuffComponent);
        componentRef.instance.stuff = stash.properties.stuff;
        componentRef.instance.game = game;
        componentRef.instance.allItems = allItems;
        componentRef.instance.stuffType = stash.properties.typeUniqueName;
        componentRef.instance.isUnderground = isUnderground;

        return componentRef.location.nativeElement;
    }

    public createLootBoxPopup(lootBox: any, container: ViewContainerRef, game: Game, allItems: Item[], locations: Location[], lootBoxConfig: LootBoxConfig, isUnderground: boolean) {
        lootBox.getPopup().on('remove', function () {
            lootBox.getPopup().off('remove');
            componentRef.destroy();
        });

        const componentRef = container.createComponent(LootBoxClusterComponent);
        componentRef.instance.cluster = lootBox.properties.lootBox;
        componentRef.instance.game = game;
        componentRef.instance.allItems = allItems;

        let location: Location = locations.find(x => x.id == lootBox.properties.lootBox.locationId) as Location;
        let lootBoxLocationConfig = lootBoxConfig.locations.find(x => x.name == location.uniqueName);

        componentRef.instance.lootBoxConfigs = lootBoxConfig.boxes;
        componentRef.instance.lootBoxLocationConfig = lootBoxLocationConfig as LootBox;
        componentRef.instance.isUnderground = isUnderground;

        return componentRef.location.nativeElement;
    }

    public createeAnomalyZonePopup(zone: any, container: ViewContainerRef, game: Game, allItems: Item[], isUnderground: boolean) {
        zone.getPopup().on('remove', function () {
            zone.getPopup().off('remove');
            componentRef.destroy();
        });

        const componentRef = container.createComponent(AnomalyZoneComponent);
        componentRef.instance.anomalZone = zone.properties.zoneModel;
        componentRef.instance.game = game;
        componentRef.instance.allItems = allItems;
        componentRef.instance.isUnderground = isUnderground;

        return componentRef.location.nativeElement;
    }

    public createTraderPopup(traderMarker: any, traders: TraderModel[], marker: any, container: ViewContainerRef, game: Game, allItems: Item[], mapConfig: MapConfig) {
        let trader: TraderModel = traderMarker.properties.traderConfig;

        marker.getPopup().on('remove', function () {
            marker.getPopup().off('remove');
            componentRef.destroy();
        });

        const componentRef = container.createComponent(TraderComponent);
        componentRef.instance.trader = trader;
        componentRef.instance.allTraders = traders;
        componentRef.instance.game = game;
        componentRef.instance.allItems = allItems;
        componentRef.instance.rankSetting = mapConfig.rankSetting;
        componentRef.instance.relationType = mapConfig.traderRelationType;
        componentRef.instance.actor = mapConfig.actor;
        componentRef.instance.traderConfigs = mapConfig.traderConfigs;
        componentRef.instance.traderConfig = mapConfig.traderConfigs?.find(x => x.trader == trader.profile.name) as TraderSectionsConfig;

        return componentRef.location.nativeElement;
    }

    public createStalkerPopup(stalkerMarker: any, container: ViewContainerRef, game: Game, allItems: Item[], mapConfig: MapConfig, isUnderground: boolean) {
        stalkerMarker.getPopup().on('remove', function () {
            stalkerMarker.getPopup().off('remove');
            componentRef.destroy();
        });

        const componentRef = container.createComponent(StalkerComponent);
        componentRef.instance.stalker = stalkerMarker.properties.stalker;
        componentRef.instance.game = game;
        componentRef.instance.allItems = allItems;
        componentRef.instance.rankSetting = mapConfig.rankSetting;
        componentRef.instance.isUnderground = isUnderground;

        return componentRef.location.nativeElement;
    }

    public setCellSize(value: number | string, game: string): void {
        document.documentElement.style.setProperty(
            '--inventory-cell-size',
            `${value}px`
        );
    }

    public createMechanicPopup(mechanicMarker: any, container: ViewContainerRef, game: Game, allItems: Item[], mapConfig: MapConfig, upgrades: ItemUpgrade[], upgradeProperties: UpgradeProperty[]) {
        let mechanic: Mechanic = mechanicMarker.properties.mechanic;

        mechanicMarker.getPopup().on('remove', function () {
            mechanicMarker.getPopup().off('remove');
            componentRef.destroy();
        });

        const componentRef = container.createComponent(MechanicComponent);
        componentRef.instance.mechanic = mechanic;
        componentRef.instance.game = game;
        componentRef.instance.allItems = allItems;
        componentRef.instance.rankSetting = mapConfig.rankSetting;
        componentRef.instance.relationType = mapConfig.traderRelationType;
        componentRef.instance.actor = mapConfig.actor;
        componentRef.instance.upgrades = upgrades;
        componentRef.instance.upgradeProperties = upgradeProperties;

        return componentRef.location.nativeElement;
    }

    public createStuffTooltip(stuff: any) {
        let html = `<div class="header-tip"><p class="p-header">${this.translate.instant(
            stuff.properties.stuff.name
        )}</p></div>`;
        if (stuff.description) {
            html += `<div class="tooltip-text"><p>${this.translate.instant(
                stuff.properties.stuff.description
            )}</p></div>`;
        }

        return html;
    }

    public addRuler(map: any, pixelsInGameUnit: number, lengthFactor: number): any {
        let ruler;

        var options = {
            position: 'topright', // Leaflet control position option
            circleMarker: {
                // Leaflet circle marker options for points used in this plugin
                color: 'red',
                radius: 2,
            },
            lineStyle: {
                // Leaflet polyline options for lines used in this plugin
                color: 'red',
                dashArray: '1,6',
            },
            lengthUnit: {
                factor: 1, //  from km to nm
                display: this.translate.instant('meterShort'),
                decimal: 2,
                label: this.translate.instant('length'),
            },
            angleUnit: {
                display: '&deg;', // This is the display value will be shown on the screen. Example: 'Gradian'
                decimal: 2, // Bearing result will be fixed to this value.
                factor: null, // This option is required to customize angle unit. Specify solid angle value for angle unit. Example: 400 (for gradian).
                label: this.translate.instant('azimuth'),
            },
        };

        ruler = L.control.ruler(options);

        return ruler;
    }

    public createAnomalyZoneTooltip(zone: any) {
        let html = `<div class="header-tip"><p class="p-header">${this.translate.instant(zone.properties.name)}</p></div>`;
        if (zone.description) {
            html += `<div class="tooltip-text"><p>${zone.properties.description}</p></div>`;
        }

        return html;
    }

    public isMarkHidden(marker: HiddenMarker): boolean {
        return this.getAllHiddenMarkers().some(x => {
            return x.lat == marker.lat &&
                x.lng == marker.lng &&
                x.layerName == marker.layerName
        });
    }

    public hideMark(markerToHide: HiddenMarker): void {
        let hiddenMarkers: HiddenMarker[] = this.getAllHiddenMarkers();
        hiddenMarkers.push(markerToHide);

        this.setHiddenMarkers(hiddenMarkers);

        this.mapComponent.hideMarker(markerToHide);
    }

    public unhideMark(marker: HiddenMarker): void {
        let hiddenMarkers: HiddenMarker[] = this.getAllHiddenMarkers();

        hiddenMarkers = hiddenMarkers.filter((x: HiddenMarker) => {
            if (x.layerName != marker.layerName) {
                return true;
            }

            if (x.lat != marker.lat) {
                return true;
            }

            if (x.lng != marker.lng) {
                return true;
            }

            return false;
        });

        this.setHiddenMarkers(hiddenMarkers);
        this.mapComponent.unhideMarker(marker);
    }

    public getAllHiddenMarkers(): HiddenMarker[] {
        if (this.hiddenMarksCache) {
            return this.hiddenMarksCache;
        }
        else {
            let allHiddenMarkers = localStorage.getItem(this.hiddenMarksLocalStorageKey);

            if (allHiddenMarkers) {
                this.hiddenMarksCache = JSON.parse(allHiddenMarkers);

                if (this.hiddenMarksCache) {
                    this.hiddenMarksCache = this.hiddenMarksCache.filter(x => x.game == this.mapComponent.game.uniqueName);
                }

                return this.hiddenMarksCache;
            }
        }

        return [];
    }

    public getCanvasIconConstructor(): any {
        return L.Icon.extend({
            setOptions(obj: any, options: any) {
                if (!Object.hasOwn(obj, 'options')) {
                    obj.options = obj.options ? Object.create(obj.options) : {};
                }
                for (const i in options) {
                    if (Object.hasOwn(options, i)) {
                        obj.options[i] = options[i];
                    }
                }
                return obj.options;
            },

            initialize(options: any) {
                this.setOptions(this, options);
                this._image = new Image();

                if (this.options.imageFactor == null) {
                    this.options.imageFactor = 1;
                }

                if (options.color) {
                    fetch(options.iconUrl).then((response) => {
                        if (response.ok) {
                            response.text().then((svg: string) => {
                                svg = svg.replace(/#FFFFFF/gm, options.color)
                                const svgBlob = new Blob([svg], { type: "image/svg+xml" });
                                this._image.src = URL.createObjectURL(svgBlob);
                            });
                        }
                    });
                }
                else {
                    this._image.src = options.iconUrl;
                }
            },

            // Метод для прив'язки до маркера та карти
            bindToLayer(layer: any) {
                if (layer.options.icon.keepMapSize) {
                    this._setupZoomListener(layer);
                    this._recalculateRadius(layer._map._zoom, layer.options.radius);
                }
                else {
                    this._calculatedRadius = layer.options.radius
                }

                layer._radius = this._calculatedRadius * layer._map.scaleFactor;
                layer._radius2 = layer._radius * 2;
                layer._drawRadius = layer._radius2 * this.options.imageFactor;
                layer._drawRadiusHalf = layer._radius * this.options.imageFactor;
            },

            // Встановлення слухача зуму
            _setupZoomListener(layer: any) {
                if (this._zoomHandler) {
                    this.markers.push(layer);
                    return; // Вже підписані
                }

                this.markers = [layer];

                this._zoomHandler = () => {
                    if (this.markers[0]._map) {
                        this._recalculateRadius(this.markers[0]._map._zoom, this.markers[0].options.radius);
                        let radius = this._calculatedRadius * this.markers[0]._map.scaleFactor;

                        for (let i = 0; i < this.markers.length; i++) {
                            this.markers[i]._radius = radius;
                            this.markers[i]._radius2 = radius * 2;
                            this.markers[i]._drawRadius = this.markers[i]._radius2 * this.options.imageFactor;
                            this.markers[i]._drawRadiusHalf = this.markers[i]._radius * this.options.imageFactor;
                        }
                    }
                };

                this.markers[0]._map.on('zoomend', this._zoomHandler);
            },

            // Перерахунок радіусу
            _recalculateRadius(zoom: number, radius: number) {
                if (this._currentZoom === zoom) {
                    return; // Нічого не змінилось
                }

                this._currentZoom = zoom;
                this._calculatedRadius = radius * Math.pow(2, zoom);
            },

            // Отримання поточного радіусу (без перерахунку)
            getRadius(): number {
                return this._calculatedRadius ?? this.options.radius;
            },

            // Розрахунок параметрів для малювання
            calculateDrawParameters(point: any, radius: number) {
                const size = radius * 2;
                return {
                    x: point.x - radius,
                    y: point.y - radius,
                    width: size,
                    height: size
                };
            },

            // Очищення при видаленні
            unbindFromLayer() {
                if (this._zoomHandler && this._layer && this._layer._map) {
                    this._layer._map.off('zoomend', this._zoomHandler);
                    this._zoomHandler = null;
                }
                this._layer = null;
            }
        });
    }

    public getCanvasMarkerConstructor(): any {
        return L.CircleMarker.extend({
            _updatePath: function () {
                this._renderer._updateSvgMarker(this);
            },

            setOpacity: function (opacity: number) {
                this.setStyle({
                    opacity: opacity,
                    fillOpacity: opacity,
                });
            },

            onAdd: function (map: any) {
                L.CircleMarker.prototype.onAdd.call(this, map);

                if (this.options.icon && this.options.icon.icon) {
                    this.options.icon.icon.bindToLayer(this);
                }

                return this;
            },

            onRemove: function (map: any) {
                if (this.options.icon && this.options.icon.icon) {
                    this.options.icon.icon.unbindFromLayer();
                }

                return L.CircleMarker.prototype.onRemove.call(this, map);
            }
        });
    }

    public getCanvasRenderer(): any {
        L.Canvas.include({
            _updateSvgMarker: function (layer: any) {
                if (!this._drawing || layer._empty() || layer.doNotRender) {
                    return;
                }

                try {
                    this._ctx.globalAlpha = layer.options.opacity;
                    let x = 0,
                        y = 0,
                        width = 0,
                        height = 0;

                    /*if (layer.options.icon.keepMapSize) {
                        if (layer.options.zoom != layer._map._zoom) {
                            layer.options.zoom = layer._map._zoom;
                            layer._radius =
                                layer.options.icon.radius * Math.pow(2, layer.options.zoom);
                        }
                    }*/

                    x = layer._point.x - layer._drawRadiusHalf;
                    y = layer._point.y - layer._drawRadiusHalf;

                    this._ctx.drawImage(
                        layer.options.icon.icon._image,
                        x,
                        y,
                        layer._drawRadius,
                        layer._drawRadius
                    );

                } catch (ex) {
                    console.log(layer);
                    console.log(ex);
                }
            },
        });

        return L.canvas();
    }

    public createCustomLayersControl(): void {
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
                    return nameA < nameB ? -1 : (nameB < nameA ? 1 : 0);
                }
            },

            _initLayout: function () {
                L.Control.Layers.prototype._initLayout.call(this);

                if (!this.isUnderground && this.options.overlaysListTop) {
                    this._overlaysListTop = document.getElementById(this.options.overlaysListTop);
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
                if (!this._container) { return this; }

                this._baseLayersList.replaceChildren();
                this._overlaysList.replaceChildren();
                if (!this.isUnderground && this.options.overlaysListTop) {
                    this._overlaysListTop.replaceChildren();
                }

                this._layerControlInputs = [];
                this._layerControlInputsTop = [];
                let baseLayersPresent, overlaysPresent, i, obj, baseLayersCount = 0;

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

                this._separator.style.display = overlaysPresent && baseLayersPresent ? '' : 'none';

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
                    input = this._createRadioElement(`leaflet-base-layers_${L.Util.stamp(this)}`, checked);
                    inputTop = this._createRadioElement(`leaflet-base-layers_${L.Util.stamp(this)}`, checked);
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
                }
                else {
                    layerId = L.Util.stamp(obj.layer);
                }

                const subHeaderPanel = document.createElement('div');
                const subHeaderCheckbox = document.createElement('label');
                const subHeaderSpan = document.createElement('span');
                const subHeaderSpanName = document.createElement('span');
                const labelInsideCheck = document.createElement('label');
                subHeaderSpanName.innerHTML = `${obj.name}`;

                subHeaderPanel.classList.add('sub-header-item');
                subHeaderPanel.classList.add('left-arc');
                subHeaderPanel.classList.add('right-arc');
                subHeaderCheckbox.classList.add('sub-header-checkbox');

                subHeaderPanel.appendChild(subHeaderCheckbox);
                subHeaderCheckbox.appendChild(subHeaderSpan);
                subHeaderSpan.appendChild(inputTop);
                subHeaderSpan.appendChild(labelInsideCheck);
                subHeaderSpan.appendChild(subHeaderSpanName);

                input.id = `layer-${layerId}`;
                inputTop.id = `layer-top-${layerId}`;
                labelInsideCheck.setAttribute('for', inputTop.id);

                if (!obj.layer.isUnderground && this.options.overlaysListTop  && obj.layer.addToTop !== false) {
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

                const container = obj.overlay ? this._overlaysList : this._baseLayersList;
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
                }
                else {
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

        L.control.customLayers = function (baseLayers: any, overlays: any, options: any) {
            return new L.Control.CustomLayers(baseLayers, overlays, options);
        }
    }

    public createCarousel(container: string): void {
        let carousel = document.getElementById(container) as HTMLElement;

        if (carousel.scrollWidth > carousel.clientWidth) {
            let arrows: any = document.getElementsByClassName('sub-header-panel-scroll');

            for (let arrow of arrows) {
                arrow.style.display = 'block';
            }

            arrows[0].addEventListener('click', function (e: any) {
                carousel.scrollLeft -= 100
            });

            arrows[1].addEventListener('click', function (e: any) {
                carousel.scrollLeft += 100
            });
        }

        carousel.addEventListener('wheel', function (e) {
            if (e.deltaY > 0)
                carousel.scrollLeft += 100;
            else
                carousel.scrollLeft -= 100;
        });
    }

    public getShapeTypes(): any[] {
        return [
            {
                type: 100,
                stroke: '#00ff00',
                fill: '#00ff001e',
                name: 'acidic',
            },
            {
                type: 101,
                stroke: '#0099ff',
                fill: '#0099ff1e',
                name: 'psychic',
            },
            {
                type: 102,
                stroke: '#fbff00',
                fill: '#fbff001e',
                name: 'radioactive',
            },
            {
                type: 103,
                stroke: '#ff8400',
                fill: '#ff84001e',
                name: 'thermal',
            }
        ]
    }

    private setHiddenMarkers(markers: HiddenMarker[]): void {
        this.hiddenMarksCache = markers;
        localStorage.setItem(this.hiddenMarksLocalStorageKey, JSON.stringify(markers));
    }
}
