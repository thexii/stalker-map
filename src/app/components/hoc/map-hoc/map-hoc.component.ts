import {
    Component,
    ComponentRef,
    HostListener,
    isDevMode,
    NgZone,
    ViewChild,
    ViewContainerRef,
    ViewEncapsulation,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DEFAULT_LANG } from '../../../locale';
import { SeoService } from '../../../services/seo.service';
import { ActivatedRoute } from '@angular/router';
import { getAnalytics, logEvent } from 'firebase/analytics';
import { HocStashComponent } from '../hoc-stash/hoc-stash.component';
import { Lair, LairCluster, MapHoc } from '../../../models/hoc/map-hoc';
import { MapConfig } from '../../../models/gamedata/map-config';
import { Item } from '../../../models/item.model';
import { HeaderComponent } from '../../header/header.component';
import { MapService } from '../../../services/map.service';
import { ShareLinkService } from '../../../services/share-link.service';
import { Point } from '../../../models/point.model';
import { ArtefactSpawnerPopupComponent } from '../artefact-spawner-popup/artefact-spawner-popup.component';
import { GuideComponent } from '../guide-component/guide-component';
import { TraderComponent } from '../trader.component/trader.component';
import { HocStuffComponent } from '../hoc-stuff/hoc-stuff.component';
import { Game } from '../../../models/game.model';
import { MapSearchComponent } from '../../map-search/map-search.component';
import { BottomSheetWrapperComponent } from '../../bottom-sheet-wrapper/bottom-sheet-wrapper.component';
import { L, createStalkerMap, pixelCenter, StalkerCustomLayersControl, StalkerLayerGroup, StalkerMap } from '../../../leaflet/leaflet-setup';
import {
    collectRichLootInfo,
    configureRichLootTags,
    getItemSearchKeys,
    getRichStashSubFilters,
    getRichStuffSubFilters,
    getRichTagSearchKeys,
    pickPresentRichSubFilters,
    RichLootSubFilterConfig,
} from '../../../models/hoc/rich-loot-tags';
import { HocRegion } from '../../../models/hoc/region.model';
import { HOC_LAYER_CONTROL_ICONS } from '../../../models/hoc/layer-control-icons';
import { refreshCanvasMarkerSize } from '../../../leaflet/canvas-markers';
import { hocAssetUrl } from '../../../utils/asset-url';

@Component({
    selector: 'app-map-hoc',
    standalone: true,
    imports: [HeaderComponent, TranslatePipe, BottomSheetWrapperComponent],
    templateUrl: './map-hoc.component.html',
    styleUrls: ['./map-hoc.component.scss', './map-hoc.layers.scss', '../../map/map.component.inventory.base.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class MapHocComponent {
    private static readonly rawMapLayerName = 'raw-map-label';
    private static readonly inGameBaseMapLayerName = 'in-game-base-map-label';
    private static readonly inGameMapLayerName = 'in-game-map-label';
    private static readonly diegeticMapLayerName = 'diegetic-map-label';
    private static readonly topoMapLayerName = 'topo-map-label';
    private static readonly joricTileMapAttribution = '<a href="https://github.com/joric/stalker2_tileset">Tile maps by joric</a>';
    private static readonly commandobyTileMapAttribution = '<a href="https://steamcommunity.com/sharedfiles/filedetails/?id=3564815639">Topographic by commandoby</a>';

    @ViewChild('dynamicComponents', { read: ViewContainerRef })
    container: ViewContainerRef;
    @ViewChild('bottomSheet') bottomSheet!: BottomSheetWrapperComponent;

    private items: Item[];
    private readonly game: string = 'hoc';
    private gamedata: MapHoc;
    private mapConfig: MapConfig;
    private map!: StalkerMap;

    private svgMarker: any;
    private canvasRenderer: any;
    private svgIcon: any;
    private allLayers: StalkerLayerGroup[] = [];
    private searchControl?: L.Control;
    private searchComponentRef?: ComponentRef<MapSearchComponent>;
    protected overlaysListTop: string = 'layers-control';
    private layerContoller?: StalkerCustomLayersControl;

    private cellSizeUniqueName: string = 'hoc-cell-size';
    private dlcFilterLocalStorageKey: string = 'hoc-dlc-filter';
    private richFiltersLocalStorageKey: string = 'hoc-rich-filters';
    private dlcMarkers: any[] = [];
    private dlcTypes: string[] = [];
    private enabledDlcs: Set<string> = new Set();
    private showOffMapContent = false;
    private regions: HocRegion[] = [];

    constructor(
        protected translate: TranslateService,
        protected route: ActivatedRoute,
        protected seo: SeoService,
        protected mapService: MapService,
        private shareLinks: ShareLinkService,
        private ngZone: NgZone
    ) { }
    
    showHideAll($event: any = null) {
        this.layerContoller?.setLayersVisible(this.allLayers, $event.target.checked);
    }

    private async ngOnInit(): Promise<void> {
        await Promise.all([
            this.loadLocales(this.translate.currentLang() ?? DEFAULT_LANG),
            this.loadItems(),
            //this.loadLootBoxConfig(),
            //this.loadUpgrades(),
            //this.loadUpgradeProperties()
        ]);

        this.translate.onLangChange.subscribe((i) => {
            this.loadLocales(i.lang);
        });

        fetch(hocAssetUrl(`/assets/data/${this.game}/map.json`)).then((response) => {
            if (response.ok) {
                response.json().then((gamedata: MapHoc) => {
                    Promise.all([
                        fetch(hocAssetUrl(`/assets/data/${this.game}_config.json`)).then((r) => r.json()),
                        fetch(hocAssetUrl(`/assets/data/${this.game}/regions.json`)).then((r) =>
                            r.ok ? r.json() : []
                        ),
                    ]).then(([gameConfig, regions]: [MapConfig, HocRegion[]]) => {
                        this.regions = regions ?? [];
                        this.loadMap(gamedata, gameConfig);
                    });
                });
            }
        });
    }

    private configureSeo(): void {
        this.seo.applyMapPage(this.game);
    }

    private scaleFactor: number = 1;

    private loadMap(gameData: MapHoc, gameConfig: MapConfig): void {
        if (NgZone.isInAngularZone()) {
            this.ngZone.runOutsideAngular(() => this.loadMap(gameData, gameConfig));
            return;
        }

        this.gamedata = gameData;
        this.mapConfig = gameConfig;
        configureRichLootTags(gameConfig);

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

        let center: L.LatLngExpression = [0, 0];

        if (gameConfig.mapBounds != null) {
            center = pixelCenter(
                gameConfig.mapBounds[1][0] - gameConfig.mapBounds[0][0],
                gameConfig.mapBounds[1][1] - gameConfig.mapBounds[0][1]
            );
        }

        this.map = createStalkerMap('map', {
            center: center,
            zoom: gameConfig.startZoom,
            minZoom: gameConfig.minZoom,
            maxZoom: maxZoom,
            crs: customCrs,
            markerZoomAnimation: !0,
            zoomAnimation: !0,
            zoomControl: !1,
        });
        this.map.filterStorageKey = `layers-${this.game}`;

        this.mapService.setHiddenMarkerHandlers(
            this.game,
            (marker) => this.hideMarker(marker),
            (marker) => this.unhideMarker(marker)
        );

        this.map.scaleFactor = this.scaleFactor;

        this.map.attributionControl!.addAttribution('&copy; <a href="https://stalker-map.online">stalker-map.online</a>');

        const syncBaseLayerAttribution = (layer: any): void => {
            this.map.attributionControl!.removeAttribution(MapHocComponent.joricTileMapAttribution);
            this.map.attributionControl!.removeAttribution(MapHocComponent.commandobyTileMapAttribution);

            if (layer?.attribution) {
                this.map.attributionControl!.addAttribution(layer.attribution);
            }
        };

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

            let dlc1Map = L.tileLayer('https://joric.github.io/stalker2_tileset/extras/dlc/{z}/{y}/{x}.webp',
                {
                    tileSize: tileSize,
                    zoomOffset: zoomOffset,
                    minZoom: gameConfig.minZoom,
                    maxZoom: maxZoom,
                    maxNativeZoom: 3,
                    noWrap: true
                })

            let diegeticMap = L.tileLayer('https://thexii.github.io/stalker-map-tiles-storage/game-asset/Mip_0{z}/tile_{y}_{x}.webp',
                {
                    tileSize: tileSize * 4,
                    zoomOffset: 0,
                    minZoom: 0,
                    maxZoom: 4,
                    maxNativeZoom: 3,
                    minNativeZoom: 3,
                    noWrap: true
                })

            let topoMap = L.tileLayer('https://thexii.github.io/stalker-map-tiles-storage/topographic/{z}/{x}_{y}.webp',
                {
                    tileSize: tileSize,
                    zoomOffset: 0,
                    minZoom: gameConfig.minZoom,
                    maxZoom: maxZoom,
                    maxNativeZoom: 3,
                    noWrap: true
                })

            inGameMap.ableToSearch = false;
            inGameMap.addToTop = false;

            rawGameMap.ableToSearch = false;
            rawGameMap.addToTop = false;
            
            diegeticMap.ableToSearch = false;
            diegeticMap.addToTop = false;

            dlc1Map.ableToSearch = false;
            dlc1Map.addToTop = false;

            topoMap.ableToSearch = false;
            topoMap.addToTop = false;

            rawGameMap.name = MapHocComponent.rawMapLayerName;
            inGameMap.name = MapHocComponent.inGameBaseMapLayerName;
            dlc1Map.name = MapHocComponent.inGameMapLayerName;
            diegeticMap.name = MapHocComponent.diegeticMapLayerName;
            topoMap.name = MapHocComponent.topoMapLayerName;

            (rawGameMap as any).attribution = MapHocComponent.joricTileMapAttribution;
            (inGameMap as any).attribution = MapHocComponent.joricTileMapAttribution;
            (dlc1Map as any).attribution = MapHocComponent.joricTileMapAttribution;
            (topoMap as any).attribution = MapHocComponent.commandobyTileMapAttribution;

            baseLayers.push(inGameMap);
            baseLayers.push(dlc1Map);
            baseLayers.push(rawGameMap);
            baseLayers.push(diegeticMap);
            baseLayers.push(topoMap);

            const storedBaseLayer = this.readStoredBaseLayer(baseLayers);
            const activeBaseLayer = storedBaseLayer ?? dlc1Map;
            activeBaseLayer.addTo(this.map);
            syncBaseLayerAttribution(activeBaseLayer);
            this.map.on('baselayerchange', (event: any) => {
                syncBaseLayerAttribution(event.layer);
            });
        }

        this.canvasRenderer = this.mapService.getCanvasRenderer();
        this.svgIcon = this.mapService.getCanvasIconConstructor();
        this.svgMarker = this.mapService.getCanvasMarkerConstructor();
        this.addLayerToMap(L.layerGroup(), 'hidden-markers', true);

        if (this.gamedata.markers && this.gamedata.markers.length > 0) {
            this.addMarkers();
        }

        if (this.gamedata.zones && this.gamedata.zones.length > 0) {
            this.addShapes();
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

        if (this.regions.length > 0) {
            this.addRegions();
        }

        let ruler: any = null;
        if (gameConfig.rulerEnabled) {
            ruler = this.mapService.addRuler(this.map, gameConfig.lengthFactor ?? 1);
        }

        let cellSizeInit = 130;
        let cellSizeValue = localStorage.getItem(this.cellSizeUniqueName);
        let cellSize = cellSizeInit;

        if (cellSizeValue) {
            cellSize = parseInt(cellSizeValue);
        }

        document.documentElement.style.setProperty(
            '--inventory-cell-size',
            `${cellSize}px`
        );

        document.documentElement.style.setProperty(
            '--initial-inventory-cell-size',
            `${cellSizeInit}px`
        );

        document.documentElement.style.setProperty(
            '--item-width-in-cell',
            this.gamedata.equipmentWidth.toString()
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

        this.dlcTypes = this.collectDlcTypes();
        this.enabledDlcs = this.loadEnabledDlcs();
        this.showOffMapContent = this.loadShowOffMapContent();
        this.applyDlcFilter();

        this.mapService.createCustomLayersControl();
        let cellSizeControl = this.createCellSizeChangerControl('Energetic_Limited', cellSize);
        let dlcFilterControl = this.shouldShowDlcFilterControl()
            ? this.createDlcFilterControl()
            : null;
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
            this.layerContoller?.remove();
            cellSizeControl.remove();
            dlcFilterControl?.remove();
            if (this.shouldShowDlcFilterControl()) {
                dlcFilterControl = this.createDlcFilterControl();
            }

            let addRuler = false;

            if (ruler) {
                ruler.remove();
                addRuler = true;
            }

            let layersToControl = layersToLayerController.map((x: any) => [
                this.translate.instant(x.name),
                x,
            ]);

            for (const layer of layersToLayerController) {
                if (layer.name === 'rich-stash') {
                    this.attachRichSubFilters(layer, getRichStashSubFilters());
                } else if (layer.name === 'rich-stuff') {
                    this.attachRichSubFilters(layer, getRichStuffSubFilters());
                }
            }

            let baseLayersControl = baseLayers.map((x: any) => [
                this.translate.instant(x.name), x
            ]);

            const layerController = L.control.customLayers(
                Object.fromEntries(baseLayersControl),
                Object.fromEntries(layersToControl),
                { overlaysListTop: this.overlaysListTop }
            ) as StalkerCustomLayersControl;
            layerController.searchName = 'layerControl';
            layerController.isUnderground = false;
            layerController.addTo(this.map);
            this.layerContoller = layerController;
            cellSizeControl.addTo(this.map);
            dlcFilterControl?.addTo(this.map);

            if (addRuler) {
                ruler = this.mapService.addRuler(this.map, gameConfig.lengthFactor ?? 1);
                ruler.addTo(this.map);
            }

            this.createSearchController();
        });

        let layersToControl = layersToLayerController.map((x: any) => [
            this.translate.instant(x.name),
            x,
        ]);

        for (const layer of layersToLayerController) {
            if (layer.name === 'rich-stash') {
                this.attachRichSubFilters(layer, getRichStashSubFilters());
            } else if (layer.name === 'rich-stuff') {
                this.attachRichSubFilters(layer, getRichStuffSubFilters());
            }
        }
        this.applyDlcFilter();

        let baseLayersControl = baseLayers.map((x: any) => [
            this.translate.instant(x.name), x
        ]);

        const layerController = L.control.customLayers(
            Object.fromEntries(baseLayersControl),
            Object.fromEntries(layersToControl),
            { overlaysListTop: this.overlaysListTop }
        ) as StalkerCustomLayersControl;

        layerController.addTo(this.map);
        this.layerContoller = layerController;
        cellSizeControl.addTo(this.map);
        dlcFilterControl?.addTo(this.map);
        ruler?.addTo(this.map);
        this.createSearchController();

        this.mapService.createCarousel(this.overlaysListTop);

        if (!isDevMode()) {
            const analytics = getAnalytics();
            logEvent(analytics, 'open-map', {
                game: 'hoc',
                language: this.translate.currentLang(),
            });
        }
    }

    private createSearchController(): void {
        if (!NgZone.isInAngularZone()) {
            this.ngZone.run(() => this.createSearchController());
            return;
        }

        if (this.searchControl) {
            this.searchControl.remove();
            this.searchControl = undefined;
        }

        if (this.searchComponentRef) {
            this.searchComponentRef.destroy();
            this.searchComponentRef = undefined;
        }

        const mapComponent = this;

        const SearchControl = L.Control.extend({
            options: {
                position: 'topleft',
            },

            onAdd: function () {
                const container = L.DomUtil.create('div', 'leaflet-control stalker-map-search-control');
                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.disableScrollPropagation(container);

                const componentRef = mapComponent.container.createComponent(MapSearchComponent);
                componentRef.instance.placeholder = mapComponent.translate.instant('search');
                componentRef.instance.showLocation = true;
                componentRef.instance.getMarkers = () => mapComponent.collectSearchableMarkers();
                componentRef.instance.resultSelected.subscribe((marker: any) => {
                    mapComponent.onSearchResultSelected(marker);
                });

                mapComponent.searchComponentRef = componentRef;
                container.appendChild(componentRef.location.nativeElement);
                return container;
            },

            onRemove: function () {
                if (mapComponent.searchComponentRef) {
                    mapComponent.searchComponentRef.destroy();
                    mapComponent.searchComponentRef = undefined;
                }
            },
        });

        this.searchControl = new SearchControl();
        this.searchControl.addTo(this.map);
        this.configureSeo();
        this.bindDeepLinks();
    }

    private stampShareMeta(marker: any, data: { x: number; z: number }, type: string): void {
        if (!marker.properties) {
            marker.properties = {};
        }
        marker.properties.coordinates = { lat: data.z, lng: data.x };
        marker.properties.typeUniqueName = type;
    }

    private bindDeepLinks(): void {
        this.route.queryParams.subscribe((params) => {
            const link = this.shareLinks.parse(params);
            if (!link) {
                return;
            }

            const marker = this.shareLinks.findSurfaceMarker(this.allLayers, link);
            if (!marker?.getLatLng || !marker?.fire) {
                return;
            }

            this.map.setView(marker.getLatLng(), this.map.getMaxZoom());
            marker.fire('click');

            if (!isDevMode()) {
                const analytics = getAnalytics();
                logEvent(analytics, 'open-map-queryParams', {
                    game: this.game,
                    language: this.translate.currentLang(),
                    markType: link.type,
                    coordinates: `${link.lat} ${link.lng}`,
                });
            }
        });
    }

    private collectSearchableMarkers(): any[] {
        const markers: any[] = [];

        for (const layer of this.allLayers) {
            if (!this.map.hasLayer(layer) || !layer._layers) {
                continue;
            }

            for (const marker of Object.values(layer._layers)) {
                if ((marker as any)?.feature?.properties?.search) {
                    markers.push(marker);
                }
            }
        }

        return markers;
    }

    private onSearchResultSelected(marker: any): void {
        if (!marker?.getLatLng || !marker?.fire) {
            return;
        }

        this.map.setView(marker.getLatLng(), this.map.getMaxZoom());
        marker.fire('click');
    }

    private normalizeDlc(dlc: string | null | undefined): string {
        if (!dlc || dlc === 'None') {
            return 'None';
        }

        return dlc;
    }

    private registerDlcMarker(marker: any, data: { dlc?: string | null; locationId?: number }): void {
        marker.dlc = this.normalizeDlc(data.dlc);
        marker.isOffMap = !((data.locationId ?? 0) > 0);
        this.dlcMarkers.push(marker);
    }

    public hideMarker(markerToHide: { lat: number; lng: number; layerName: string }): void {
        const markerLayer: any = this.allLayers.find((layer) => layer.name === markerToHide.layerName);
        const hiddenLayer: any = this.allLayers.find((layer) => layer.name === 'hidden-markers');
        if (!markerLayer) {
            return;
        }

        let marker: any;
        markerLayer.eachLayer((layer: any) => {
            if (layer.properties?.coordinates?.lat == markerToHide.lat &&
                layer.properties?.coordinates?.lng == markerToHide.lng) {
                marker = layer;
            }
        });

        if (!marker) {
            return;
        }

        const renderedSize = {
            radius: marker._radius,
            radius2: marker._radius2,
            drawRadius: marker._drawRadius,
            drawRadiusHalf: marker._drawRadiusHalf,
        };
        markerLayer.removeLayer(marker);
        marker.setOpacity?.(0.5);
        hiddenLayer?.addLayer(marker);
        if (marker._map) {
            marker._radius = renderedSize.radius;
            marker._radius2 = renderedSize.radius2;
            marker._drawRadius = renderedSize.drawRadius;
            marker._drawRadiusHalf = renderedSize.drawRadiusHalf;
            marker._renderer?._requestRedraw?.(marker);
        }
    }

    public unhideMarker(markerToShow: { lat: number; lng: number; layerName: string }): void {
        const markerLayer: any = this.allLayers.find((layer) => layer.name === markerToShow.layerName);
        const hiddenLayer: any = this.allLayers.find((layer) => layer.name === 'hidden-markers');
        if (!markerLayer) {
            return;
        }

        const marker = this.dlcMarkers.find((item) =>
            item.dlcLayer === markerLayer &&
            item.properties?.coordinates?.lat == markerToShow.lat &&
            item.properties?.coordinates?.lng == markerToShow.lng
        );

        if (marker) {
            hiddenLayer?.removeLayer(marker);
        }

        if (marker && this.isMarkerVisible(marker)) {
            markerLayer.addLayer(marker);
            marker.setOpacity?.(1);
            refreshCanvasMarkerSize(marker);
        }
    }

    private collectDlcTypes(): string[] {
        const types = new Set<string>();
        const order = ['None', 'PreOrder', 'Deluxe', 'Ultimate', 'DLC1'];

        for (const marker of this.dlcMarkers) {
            types.add(marker.dlc);
        }

        return Array.from(types).sort((a, b) => {
            const aIndex = order.indexOf(a);
            const bIndex = order.indexOf(b);

            if (aIndex !== -1 || bIndex !== -1) {
                return (aIndex === -1 ? order.length : aIndex) -
                    (bIndex === -1 ? order.length : bIndex);
            }

            return a.localeCompare(b);
        });
    }

    private hasOffMapMarkers(): boolean {
        return this.dlcMarkers.some((marker) => marker.isOffMap);
    }

    private shouldShowDlcFilterControl(): boolean {
        return this.dlcTypes.some((t) => t !== 'None') || this.hasOffMapMarkers();
    }

    private readDlcFilterStorage(): Record<string, boolean> | null {
        const stored = localStorage.getItem(this.dlcFilterLocalStorageKey);

        if (!stored) {
            return null;
        }

        try {
            return JSON.parse(stored) as Record<string, boolean>;
        } catch {
            return null;
        }
    }

    private loadEnabledDlcs(): Set<string> {
        const parsed = this.readDlcFilterStorage();

        if (parsed) {
            const enabled = this.dlcTypes.filter((dlc) => parsed[dlc] !== false);

            if (enabled.length > 0) {
                return new Set(enabled);
            }
        }

        return new Set(this.dlcTypes);
    }

    private loadShowOffMapContent(): boolean {
        const parsed = this.readDlcFilterStorage();

        return parsed?.['offMapContent'] === true;
    }

    private saveDlcFilterState(): void {
        const state: Record<string, boolean> = {};

        for (const dlc of this.dlcTypes) {
            state[dlc] = this.enabledDlcs.has(dlc);
        }

        state['offMapContent'] = this.showOffMapContent;

        localStorage.setItem(this.dlcFilterLocalStorageKey, JSON.stringify(state));
    }

    private readStoredBaseLayer(baseLayers: any[]): any | undefined {
        const stored = localStorage.getItem(this.map.filterStorageKey ?? '');
        if (!stored) {
            return undefined;
        }

        try {
            const states = JSON.parse(stored) as Record<string, boolean>;
            return baseLayers.find((layer) => states[layer.name] === true);
        } catch {
            return undefined;
        }
    }

    private applyDlcFilter(): void {
        this.applyMarkerVisibility();
    }

    private isMarkerVisible(marker: any): boolean {
        if (marker.properties?.coordinates && this.mapService.isMarkHidden({
            game: this.game,
            layerName: marker.dlcLayer?.name,
            lat: marker.properties.coordinates.lat,
            lng: marker.properties.coordinates.lng,
            isUnderground: false,
        })) {
            return false;
        }

        if (marker.dlc != null) {
            if (!this.enabledDlcs.has(marker.dlc)) {
                return false;
            }

            if (marker.isOffMap && !this.showOffMapContent) {
                return false;
            }
        }

        const layer = marker.dlcLayer;
        if (layer?._activeSubFilters instanceof Set) {
            const tags: string[] = marker.richTags ?? [];

            if (layer._activeSubFilters.size === 0) {
                return false;
            }

            if (!tags.some((tag) => layer._activeSubFilters.has(tag))) {
                return false;
            }
        }

        return true;
    }

    private applyMarkerVisibility(): void {
        for (const marker of this.dlcMarkers) {
            const layer = marker.dlcLayer;
            if (!layer) {
                continue;
            }

            const shouldShow = this.isMarkerVisible(marker);
            const isInLayer = layer.hasLayer(marker);

            if (shouldShow && !isInLayer) {
                layer.addLayer(marker);
            } else if (!shouldShow && isInLayer) {
                layer.removeLayer(marker);
            }
        }

        this.searchComponentRef?.instance.refreshResults();
    }

    private getLayerMarkers(layer: any): { richTags?: string[] }[] {
        const fromDlc = this.dlcMarkers.filter((marker) => marker.dlcLayer === layer);
        if (fromDlc.length > 0) {
            return fromDlc;
        }

        const markers: { richTags?: string[] }[] = [];

        if (typeof layer?.eachLayer === 'function') {
            layer.eachLayer((marker: any) => markers.push(marker));
        }

        return markers;
    }

    private getRichSubFilters(filters: RichLootSubFilterConfig[]) {
        return filters.map((filter) => ({
            id: filter.id,
            name: this.translate.instant(filter.nameKey),
        }));
    }

    private attachRichSubFilters(
        layer: any,
        allFilters: RichLootSubFilterConfig[]
    ): void {
        const filters = pickPresentRichSubFilters(
            allFilters,
            this.getLayerMarkers(layer)
        );

        layer.subFilters = this.getRichSubFilters(filters);
        layer._richSubFilterDefs = filters;

        const savedFilters = this.readRichFilters()[layer.name];

        if (savedFilters) {
            layer._activeSubFilters = new Set(
                filters
                    .map((filter) => filter.id)
                    .filter((id) => savedFilters.includes(id))
            );
        } else if (!layer._activeSubFilters) {
            layer._activeSubFilters = new Set(filters.map((filter) => filter.id));
        } else {
            // Drop tags that are not present in this dataset / layer.
            for (const id of [...layer._activeSubFilters]) {
                if (!filters.some((filter) => filter.id === id)) {
                    layer._activeSubFilters.delete(id);
                }
            }
        }

        layer.onSubFilterChange = () => {
            this.saveRichFilters();
            this.applyMarkerVisibility();
        };
    }

    private readRichFilters(): Record<string, string[]> {
        const stored = localStorage.getItem(this.richFiltersLocalStorageKey);

        if (!stored) {
            return {};
        }

        try {
            return JSON.parse(stored) as Record<string, string[]>;
        } catch {
            return {};
        }
    }

    private saveRichFilters(): void {
        const filters: Record<string, string[]> = {};

        for (const layer of this.allLayers) {
            if (layer.name === 'rich-stash' || layer.name === 'rich-stuff') {
                filters[layer.name] = [...((layer as any)._activeSubFilters ?? [])];
            }
        }

        localStorage.setItem(this.richFiltersLocalStorageKey, JSON.stringify(filters));
    }

    private getDlcLabel(dlc: string): string {
        const key = `dlc.${dlc}`;
        const translated = this.translate.instant(key);

        return translated !== key ? translated : dlc;
    }

    private createDlcFilterControl(): any {
        const translate = this.translate;
        const component = this;

        if (!L.Control.DlcFilter) {
            L.Control.DlcFilter = L.Control.extend({
                options: {
                    position: 'topright',
                },

                onAdd: function () {
                    const container = L.DomUtil.create('div', 'leaflet-control-dlc-filter-container');
                    const header = L.DomUtil.create('div', 'leaflet-control-dlc-filter-header', container);
                    const toggle = L.DomUtil.create('a', 'leaflet-control-dlc-filter-toggle', header);
                    toggle.title = translate.instant('dlcFilter');
                    toggle.innerHTML = 'DLC';
                    const content = L.DomUtil.create('div', 'leaflet-control-dlc-filter-content', header);
                    const showDlcTypes = component.dlcTypes.some((t) => t !== 'None');

                    if (showDlcTypes) {
                        for (const dlc of component.dlcTypes) {
                            const item = L.DomUtil.create('label', 'dlc-filter-item', content);
                            const checkbox = L.DomUtil.create('input', '', item) as HTMLInputElement;
                            checkbox.type = 'checkbox';
                            checkbox.checked = component.enabledDlcs.has(dlc);

                            const label = L.DomUtil.create('span', '', item);
                            label.innerHTML = component.getDlcLabel(dlc);

                            L.DomEvent.on(checkbox, 'change', (e: Event) => {
                                const target = e.target as HTMLInputElement;

                                if (target.checked) {
                                    component.enabledDlcs.add(dlc);
                                } else {
                                    component.enabledDlcs.delete(dlc);
                                }

                                component.saveDlcFilterState();
                                component.applyDlcFilter();
                            });
                        }
                    }

                    if (component.hasOffMapMarkers()) {
                        const offMapItem = L.DomUtil.create(
                            'label',
                            showDlcTypes ? 'dlc-filter-item dlc-filter-item--off-map' : 'dlc-filter-item',
                            content
                        );
                        const offMapCheckbox = L.DomUtil.create('input', '', offMapItem) as HTMLInputElement;
                        offMapCheckbox.type = 'checkbox';
                        offMapCheckbox.checked = component.showOffMapContent;

                        const offMapLabel = L.DomUtil.create('span', '', offMapItem);
                        offMapLabel.innerHTML = translate.instant('offMapContent');

                        L.DomEvent.on(offMapCheckbox, 'change', (e: Event) => {
                            const target = e.target as HTMLInputElement;
                            component.showOffMapContent = target.checked;
                            component.saveDlcFilterState();
                            component.applyDlcFilter();
                        });
                    }

                    L.DomEvent.disableClickPropagation(container);
                    L.DomEvent.disableScrollPropagation(container);

                    return container;
                },
            } as any);

            L.control.dlcFilter = function () {
                return new L.Control.DlcFilter();
            } as any;
        }

        return L.control.dlcFilter();
    }

    private createCellSizeChangerControl(uniqueName: string, cellSize: number): any {
        let items = this.items;
        L.Control.Slider = L.Control.extend({
            options: {
                position: 'topleft'
            },

            onAdd: function (map: object) {
                // Створюємо основний контейнер
                const container = L.DomUtil.create('div', 'leaflet-control-slider-container');

                const header = L.DomUtil.create('div', 'leaflet-control-slider-header', container);
                const contentContainer = L.DomUtil.create('div', 'leaflet-control-slider', header);
                const icon = L.DomUtil.create('a', 'leaflet-control-slider-container-toggle', header);

                // Створюємо сам input
                const slider = L.DomUtil.create('input', 'inventory-cell-slider', contentContainer);
                slider.type = 'range';
                slider.min = '50';
                slider.max = '130';
                slider.value = String(cellSize);
                slider.step = '10';

                let itemModel = items.find(x => x.uniqueName == uniqueName);

                if (itemModel) {
                    const inventoryContainer = L.DomUtil.create('div', 'leaflet-control-slider-inventory', container);
                    const inventory = L.DomUtil.create('div', 'inventory inventory-columns', inventoryContainer);
                    inventory.style.setProperty('--inventory-columns', String(itemModel.width));
                    const itemContainer = L.DomUtil.create('div', 'hoc inventory-item', inventory);
                    itemContainer.style.setProperty('--item-w', String(itemModel.width));
                    itemContainer.style.setProperty('--item-h', String(itemModel.height));
                    itemContainer.style.setProperty('--grid-x', String(itemModel.gridX));
                    itemContainer.style.setProperty('--grid-y', String(itemModel.gridY));
                    const item = L.DomUtil.create('div', 'hoc inventory-item-image', itemContainer);
                }
                

                // Зупиняємо розповсюдження подій кліку та прокрутки на карту
                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.disableScrollPropagation(container);

                // Обробник події (у Angular тут буде виклик вашого методу setCellSize)
                L.DomEvent.on(slider, 'input', (e: any) => {
                    this.options.onChange(e.target.value);
                });

                return container;
            }
        } as any);

        // Функція-конструктор для зручності
        L.control.slider = function (options: L.SliderControlOptions) {
            return new L.Control.Slider(options);
        } as any;

        return L.control.slider({
            position: 'topright',
            onChange: (value: string | number) => {
                this.mapService.setCellSize(String(value), 'hoc');
                localStorage.setItem(this.cellSizeUniqueName, String(value));
            }
        } as L.SliderControlOptions);
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
                radius: 10
            },
            {
                name: 'ESpawnType::Hub',
                icon: new this.svgIcon({
                    iconUrl:
                        '/assets/images/s2/Markers/Texture_Camp_NotActive_General_Shadow.png',
                    iconAnchor: [0, 0],
                }),
                isHub: true,
                radius: 100
            },
            {
                name: 'EMarkerType::Hub',
                icon: new this.svgIcon({
                    iconUrl:
                        '/assets/images/s2/Markers/Texture_Camp_NotActive_General_Shadow.png',
                    iconAnchor: [0, 0],
                }),
                isHub: true,
                radius: 100
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
                { renderer: this.canvasRenderer, icon: icon, radius: icon.isHub ? data.radius : icon.radius }
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

            this.registerDlcMarker(marker, data);

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

        //if (hubs.length > 0) {
        //    this.addLayerToMap(L.layerGroup(hubs), 'hubs', true);
        //}

        if (shelters.length > 0) {
            this.addLayerToMap(L.layerGroup(shelters), 'botPlayerShelters', true);
        }

        if (playerShelters.length > 0) {
            this.addLayerToMap(L.layerGroup(playerShelters), 'shelters', true);
        }

        this.addGrid();
    }

    private addShapes() {
        // 1. Індексуємо типи фігур у Map для пошуку за O(1)
        const shapeTypeMap = new Map(
            this.mapService.getShapeTypes().map(t => [t.type, t])
        );

        for (const shapeCollection of this.gamedata.zones) {
            const type = shapeTypeMap.get(shapeCollection.type);

            if (!type) {
                console.error(`Unknown shape type: ${shapeCollection.type}`);
                continue;
            }

            const layerFeatures: L.Layer[] = [];
            const isFillsNotNull = type.fills != null;

            // 2. Оптимізована обробка полігонів
            for (const shape of shapeCollection.polygons) {
                const rawCoords = shape.coordinates;
                const len = rawCoords.length;
                const newCoors: [number, number][] = [];

                // Крок 2, міняємо місцями X та Z (які стають Lat/Lng) за один прохід
                for (let i = 0; i < len; i += 2) {
                    newCoors.push([rawCoords[i + 1], rawCoords[i]]);
                }

                const fillColor = isFillsNotNull ? (type.fills[shape.effectId] ?? type.fill) : type.fill;

                const polygon = L.polygon(newCoors as L.LatLngExpression[], {
                    color: type.stroke,
                    fillColor: fillColor,
                    fill: !!fillColor,
                    renderer: this.canvasRenderer,
                    interactive: false,
                });

                layerFeatures.push(polygon);
            }

            // 3. Обробка кіл
            for (const shape of shapeCollection.circles) {
                const fillColor = isFillsNotNull ? (type.fills[shape.effectId] ?? type.fill) : type.fill;

                const circle = L.circle([shape.z, shape.x], {
                    radius: shape.radius,
                    color: type.stroke,
                    fillColor: fillColor,
                    fill: !!fillColor,
                    renderer: this.canvasRenderer,
                    interactive: false,
                });

                layerFeatures.push(circle);
            }

            if (layerFeatures.length > 0) {
                this.addLayerToMap(L.layerGroup(layerFeatures), type.name, false);
            }
        }
    }

    /** Region polygons from regions.json (UE cm → map meters via /100). */
    private addRegions(): void {
        const polygons: L.Layer[] = [];

        for (const region of this.regions) {
            const coords = region.geometry?.coordinates;
            if (!coords?.length) {
                continue;
            }

            // Extractor converts UE cm → meters with /100; Leaflet uses [z, x].
            const latLngs: L.LatLngExpression[] = coords.map((point) => {
                const x = point[0] / 100;
                const z = point[1] / 100;
                return [z, x];
            });

            const polygon: any = L.polygon(latLngs, {
                color: '#c9a227',
                weight: 2,
                opacity: 0.9,
                fillColor: '#c9a227',
                fillOpacity: 0.12,
                renderer: this.canvasRenderer,
            });

            polygon.name = region.region_title;
            polygon.description = region.region_description;
            polygon.feature = { properties: {} };
            polygon.properties = {
                locationUniqueName: region.region_title,
            };

            this.createTranslatableProperty(
                polygon.feature.properties,
                'search',
                [region.region_title, region.region_description].filter(Boolean),
                this.translate
            );

            polygon.bindTooltip(
                () => this.translate.instant(region.region_title),
                {
                    permanent: true,
                    direction: 'center',
                    className: 'region-label',
                    opacity: 1,
                    interactive: false,
                }
            );

            polygons.push(polygon);
        }

        if (polygons.length > 0) {
            const layer = L.layerGroup(polygons);
            this.addLayerToMap(layer, 'regions', true);

            const syncLabels = () => this.syncRegionLabels(layer);
            layer.on('add', syncLabels);
            this.map.on('zoomend', syncLabels);
            syncLabels();
        }
    }

    private syncRegionLabels(layer: any): void {
        if (!this.map?.hasLayer(layer)) {
            return;
        }

        const showLabels = this.map.getZoom() >= this.map.getMaxZoom();

        layer.eachLayer((polygon: any) => {
            if (typeof polygon.getTooltip !== 'function' || !polygon.getTooltip()) {
                return;
            }

            if (showLabels) {
                polygon.openTooltip();
            } else {
                polygon.closeTooltip();
            }
        });
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

            grid.push(L.polyline([[startHeight, x], [endHeight, x]], { color: 'white', weight: 1, opacity: 0.5, interactive: false, renderer: this.canvasRenderer }));
        }

        for (let i = heightStart; i < height; i++) {
            let y = yShift + i * gridGap;

            grid.push(L.polyline([[y, 0], [y, this.gamedata.widthInMeters]], { color: 'white', weight: 1, opacity: 0.5, interactive: false, renderer: this.canvasRenderer }));
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

                    if (!icons || icons.length == 0) {
                        continue;
                    }

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

                this.registerDlcMarker(marker, data);
            }
            else {
                let icons = getIconAndFaction(data);

                if (!icons || icons.length == 0) {
                    continue;
                }

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

                if (shifts.length == 0)
                {
                    continue;
                }

                for (let i = 0; i < icons.length; i++) {
                    let isMutant = mutants.includes(data.lairs[i].faction);
                    let marker = this.createMarker(data.x + shifts[i][0], data.z + shifts[i][1], icons[i], isMutant, index, data);

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

                if (!lair.faction) {
                    continue;
                }

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
                    continue;
                }

                result.push({ icon: icon, faction: desc, title: title, radius: icon.radius, model: lair })
            }

            return result;
        }
    }

    private createMarker(x: number, y: number, markerData: any, isMutant: boolean, index: number, locationData: { dlc?: string | null }): any {
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

        this.registerDlcMarker(marker, locationData);

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

            this.registerDlcMarker(marker, data);
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
        let artifactStuffIcon = {
            icon: new this.svgIcon({
                iconUrl: '/assets/images/svg/marks/colored/items.svg',
                iconAnchor: [0, 0],
                color: "#08fef8"
            }),
            keepMapSize: true
        };

        let markers = [];
        let richMarkers = [];
        let radius = 4;

        for (let data of this.gamedata.stuffs) {
            let localesToFind: string[] = [markers.length.toString()];
            let richItems: { item: Item; count?: number }[] = [];

            if (data.items && data.items.length > 0) {
                data.items.forEach((element: any) => {
                    let item = this.items.find((y) => y.uniqueName == element.uniqueName);

                    if (item) {
                        localesToFind.push(...getItemSearchKeys(item));
                        richItems.push({ item, count: element.count });
                    }
                });
            }

            const richInfo = collectRichLootInfo(richItems);
            const isRich = richInfo.isRich;
            const hasArtifact = richInfo.tags.includes('artifact');

            let marker = new this.svgMarker(
                [data.z, data.x],
                {
                    renderer: this.canvasRenderer,
                    icon: hasArtifact ? artifactStuffIcon : isRich ? richStuffIcon : stuffIcon,
                    radius: radius
                }
            )

            marker.name = isRich ? 'rich_stuff_at_location' : 'stuff_at_location';
            marker.data = data;
            marker.richTags = richInfo.tags;
            marker.feature = {};
            marker.feature.properties = {};
            marker.properties = {};
            marker.properties.richTags = richInfo.tags;
            localesToFind.push(...getRichTagSearchKeys(richInfo.tags));
            marker.properties.locationUniqueName = data.locationId > 0 ? this.gamedata.locations[data.locationId] : null;
            this.stampShareMeta(marker, data, isRich ? 'rich-stuff' : 'stuff');

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

            marker.on('click', (e: any) =>
                this.mapService.onMarkerClick(
                    e,
                    this.map,
                    this.container,
                    this.bottomSheet,
                    (container, isPopup) => this.createStuffContent(e.target, container)
                )
            );

            this.registerDlcMarker(marker, data);

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
            const richLayer = L.layerGroup(richMarkers);
            this.addLayerToMap(richLayer, 'rich-stuff', true);
            this.attachRichSubFilters(richLayer, getRichStuffSubFilters());
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

        let artifactStashIcon = {
            icon: new this.svgIcon({
                iconUrl: '/assets/images/svg/marks/colored/items.svg',
                iconAnchor: [0, 0],
                color: "#08fef8"
            }),
            keepMapSize: true,
        };

        let markers = [];
        let richMarkers = [];
        let randomMarkers = [];
        let radius: number = 4;

        for (let data of this.gamedata.stashes) {
            let isRandom = true;
            let localesToFind: string[] = [];
            let richItems: { item: Item; count?: number }[] = [];

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
                                                    localesToFind.push(...getItemSearchKeys(item));
                                                    isRandom = false;
                                                    richItems.push({
                                                        item,
                                                        count: 1,
                                                    });
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

            if (data.items?.length > 0) {
                for (let itemIn of data.items) {
                    let item = this.items.find(
                        (x) => x.uniqueName == itemIn.uniqueName
                    );

                    if (item) {
                        localesToFind.push(...getItemSearchKeys(item));
                        isRandom = false;
                        richItems.push({ item, count: itemIn.count });
                    }
                }
            }

            const richInfo = collectRichLootInfo(richItems);
            const isRich = richInfo.isRich;
            const hasArtifact = richInfo.tags.includes('artifact');

            let icon = null;

            if (hasArtifact) {
                icon = artifactStashIcon;
            }
            else if (isRich) {
                icon = richStuffIcon;
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
            marker.richTags = richInfo.tags;
            marker.feature = {};
            marker.feature.properties = {};
            marker.properties = {};
            marker.properties.richTags = richInfo.tags;
            marker.properties.locationUniqueName = data.locationId > 0 ? this.gamedata.locations[data.locationId] : null;
            this.stampShareMeta(
                marker,
                data,
                isRich ? 'rich-stash' : isRandom ? 'random-stash' : 'stash'
            );

            localesToFind.push(
                marker.name,
                markers.length.toString(),
                ...getRichTagSearchKeys(richInfo.tags)
            );

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
                marker.on('click', (e: any) =>
                    this.mapService.onMarkerClick(
                        e,
                        this.map,
                        this.container,
                        this.bottomSheet,
                        (container, isPopup) => this.createStashContent(e.target, container)
                    )
                );
            }

            this.registerDlcMarker(marker, data);

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
            const richLayer = L.layerGroup(richMarkers);
            this.addLayerToMap(richLayer, 'rich-stash', true);
            this.attachRichSubFilters(richLayer, getRichStashSubFilters());
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
                iconUrl: '/assets/images/s2/Markers/Texture_Trader_NotActive_General_Shadow.png',
                iconAnchor: [0, 0],
                imageFactor: 2
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
        let radius: number = 5;

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
            this.stampShareMeta(
                marker,
                data,
                data.marker == 'Medic' ? 'medics' : 'traders'
            );

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

            marker.on('click', (e: any) =>
                this.mapService.onMarkerClick(
                    e,
                    this.map,
                    this.container,
                    this.bottomSheet,
                    (container, isPopup) => this.createTraderContent(e.target, container)
                )
            );

            this.registerDlcMarker(marker, data);
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
                iconUrl: '/assets/images/s2/Markers/Texture_Guide_NotActive_General_Shadow.png',
                iconAnchor: [0, 0],
                imageFactor: 2
            }),
            keepMapSize: true,
        };

        let guiders: any[] = [];
        let radius: number = 5;

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

            marker.on('click', (e: any) =>
                this.mapService.onMarkerClick(
                    e,
                    this.map,
                    this.container,
                    this.bottomSheet,
                    (container, isPopup) => this.createGuideContent(e.target, container)
                )
            );

            this.registerDlcMarker(marker, data);
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
            this.stampShareMeta(marker, data, 'anomaly-zone');

            let dataToSearch: string[] = [data.spawner, markers.length.toString()];
            let config = this.gamedata.artefactSpawnerConfigs.find(
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
                    /*let allArts = this.items.artefacts;

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
                    }*/
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

            marker.on('click', (e: any) =>
                this.mapService.onMarkerClick(
                    e,
                    this.map,
                    this.container,
                    this.bottomSheet,
                    (container, isPopup) => this.createArtefactSpawnerContent(e.target, container)
                )
            );

            this.registerDlcMarker(marker, data);
            markers.push(marker);
        }

        if (markers.length > 0) {
            this.addLayerToMap(L.layerGroup(markers), 'anomaly-zone', true);
        }
    }

    public createArtefactSpawnerContent(
        marker: any,
        container: ViewContainerRef
    ): ComponentRef<ArtefactSpawnerPopupComponent> {
        const componentRef = container.createComponent(ArtefactSpawnerPopupComponent);
        componentRef.instance.artefactSpawner = marker.data;
        componentRef.instance.artefactSpawnerConfigs =
            this.gamedata.artefactSpawnerConfigs;
        componentRef.instance.items = this.items;
        componentRef.instance.shareUrl = this.shareLinks.forMarker(
            this.game,
            marker.data.z,
            marker.data.x,
            marker.properties?.typeUniqueName || 'anomaly-zone'
        );

        return componentRef;
    }

    public createGuideContent(
        marker: any,
        container: ViewContainerRef
    ): ComponentRef<GuideComponent> {
        const componentRef = container.createComponent(GuideComponent);
        componentRef.instance.guide = marker.data;

        return componentRef;
    }

    public createTraderContent(
        marker: any,
        container: ViewContainerRef
    ): ComponentRef<TraderComponent> {
        const componentRef = container.createComponent(TraderComponent);
        componentRef.instance.trader = marker.data;
        componentRef.instance.allItems = this.items;
        componentRef.instance.tradeItemGenerators = this.gamedata.tradeItemGenerators;
        componentRef.instance.shareUrl = this.shareLinks.forMarker(
            this.game,
            marker.data.z,
            marker.data.x,
            marker.properties?.typeUniqueName || 'traders'
        );

        return componentRef;
    }

    public createStuffContent(
        marker: any,
        container: ViewContainerRef
    ): ComponentRef<HocStuffComponent> {
        const componentRef = container.createComponent(HocStuffComponent);
        componentRef.instance.stuff = marker.data;
        componentRef.instance.game = new Game();
        componentRef.instance.game.uniqueName = 'hoc';
        componentRef.instance.game.gameStyle = 'hoc';
        componentRef.instance.allItems = this.items;
        componentRef.instance.stuffType = marker.properties?.typeUniqueName || 'stuff';
        componentRef.instance.isUnderground = false;
        componentRef.instance.shareUrl = this.shareLinks.forMarker(
            this.game,
            marker.data.z,
            marker.data.x,
            componentRef.instance.stuffType
        );

        return componentRef;
    }

    public createStashContent(
        marker: any,
        container: ViewContainerRef
    ): ComponentRef<HocStashComponent> {
        const componentRef = container.createComponent(HocStashComponent);
        componentRef.instance.stash = marker.data;
        componentRef.instance.stashType = marker.properties?.typeUniqueName || 'stash';
        componentRef.instance.allItems = this.items;
        componentRef.instance.stashGenerators = this.gamedata.stashGenerators;
        componentRef.instance.stashPrototypes = this.gamedata.stashPrototypes;
        componentRef.instance.shareUrl = this.shareLinks.forMarker(
            this.game,
            marker.data.z,
            marker.data.x,
            marker.properties?.typeUniqueName || 'stash'
        );

        return componentRef;
    }

    public createTooltip(marker: any) {
        let html = `<div class="header-tip"><span class="header">${this.translate.instant(marker.name)}</span></div>`;
        if (marker.description) {
            let trans = this.translate.instant(marker.description);

            if (trans != marker.description) {
                html += `<div class="tooltip-text"><p>${this.translate.instant(marker.description)}</p></div>`;
            }
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
        await fetch(hocAssetUrl(`/assets/data/${this.game}/items.json`)).then((response) => {
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

        const controlIcon = HOC_LAYER_CONTROL_ICONS[name];
        if (controlIcon) {
            layer.controlIcon = controlIcon.iconUrl;
            layer.controlIconColor = controlIcon.color;
            layer.controlIconScale = controlIcon.scale ?? 1;
        }

        if (typeof layer.eachLayer === 'function') {
            layer.eachLayer((marker: any) => {
                if (marker?.dlc != null) {
                    marker.dlcLayer = layer;

                    if (marker.properties?.coordinates && this.mapService.isMarkHidden({
                        game: this.game,
                        layerName: name,
                        lat: marker.properties.coordinates.lat,
                        lng: marker.properties.coordinates.lng,
                        isUnderground: false,
                    })) {
                        layer.removeLayer(marker);
                        marker.setOpacity?.(0.5);
                        const hiddenLayer = this.allLayers.find((item) => item.name === 'hidden-markers');
                        hiddenLayer?.addLayer(marker);
                    }
                }
            });
        }

        this.allLayers.push(layer);
    }

    @HostListener('window:resize', ['$event'])
    public onResize(event: any): void {
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
            hocAssetUrl(`/assets/data/${this.game}/${language}.json`)
        ).then((response) => {
            if (response.ok) {
                response.json().then((locales: any) => {
                    if (locales) {
                        this.translate.setTranslation(language, locales, true);
                    }
                });
            }
        });

        fetch(hocAssetUrl(`/assets/data/${this.game}/locale_import.json`)).then((response) => {
            if (response.ok) {
                response.json().then((locales: any) => {
                    let games = Object.keys(locales);
                    if (games.length > 0) {
                        for (let game of games) {
                            let importLocales = locales[game].locales;

                            if (!(importLocales == null || importLocales.length == 0)) {
                                fetch(
                                    hocAssetUrl(`/assets/data/${game}/${language}.json`)
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
