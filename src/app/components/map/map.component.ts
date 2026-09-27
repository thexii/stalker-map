import {
    Component,
    ComponentRef,
    HostListener,
    ViewEncapsulation,
    ViewContainerRef,
    ViewChild,
    isDevMode,
    NgZone,
} from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { Point } from '../../models/point.model';
import { getAnalytics, logEvent } from 'firebase/analytics';
import { Item } from '../../models/item.model';
import { Map } from '../../models/map.model';
import { StuffModel } from '../../models/stuff';
import { Location } from '../../models/location.model';
import { LootBoxConfig } from '../../models/loot-box/loot-box-config.model';
import { AnomalySpawnSection } from '../../models/anomaly-zone';
import { MapConfig } from '../../models/gamedata/map-config';
import { SmartTerrain } from '../../models/smart-terrain.model';
import { UndergroundComponent } from '../undeground/underground.component';
import { MarkerToSearch } from '../../models/marker-to-search.model';
import { ItemUpgrade, UpgradeProperty } from '../../models/upgrades/upgrades';
import { DEFAULT_LANG } from '../../locale';
import { SeoService } from '../../services/seo.service';
import { ShareLinkService } from '../../services/share-link.service';
import { MapService } from '../../services/map.service';
import { HiddenMarker } from '../../models/hidden-marker.model';
import { Game } from '../../models/game.model';
import { BottomSheetWrapperComponent } from "../bottom-sheet-wrapper/bottom-sheet-wrapper.component";
import { MapSearchComponent } from '../map-search/map-search.component';
import { L, asLatLngBounds, asLatLngExpressions, asStalkerLayerGroup, createStalkerMap, findLayerMarker, hasLevelChangerProperties, pixelBounds, pixelCenter, StalkerCustomLayersControl, StalkerLayerGroup, StalkerLocationsLayer, StalkerMap, StalkerMarker } from '../../leaflet/leaflet-setup';

@Component({
    selector: 'app-map',
    standalone: true,
    imports: [HeaderComponent, TranslatePipe, BottomSheetWrapperComponent],
    templateUrl: './map.component.html',
    styleUrls: [
        './map.component.inventory.base.scss',
        './map.component.inventory.addons.scss',
        './map.component.inventory.hovers.scss',
        './map.component.scss',
    ],
    encapsulation: ViewEncapsulation.None,
})
export class MapComponent {
    @ViewChild('dynamicComponents', { read: ViewContainerRef }) container: ViewContainerRef;
    @ViewChild('bottomSheet') bottomSheet!: BottomSheetWrapperComponent;

    public readonly game: Game;

    public svgMarker: any;
    public canvasRenderer: any;

    public static readonly avaliableGames: { [key: string]: Game } = {
        'shoc': { gameStyle: 'shoc', uniqueName: 'shoc' },

        'cs': { gameStyle: 'cs', uniqueName: 'cs' },
        'cs_ee': { gameStyle: 'cs', uniqueName: 'cs_ee' },

        'cop': { gameStyle: 'cop', uniqueName: 'cop' },

        's2_2011': { gameStyle: 's2_2011', uniqueName: 's2_2011' }
    };

    public static readonly defaultGame: Game = { gameStyle: 'shoc', uniqueName: 'shoc' };

    public static readonly defaultCellSize: number[] = [
        50, 50, 50, 50, 130
    ];

    protected gamedata: Map;
    protected map!: StalkerMap;
    protected locations!: StalkerLocationsLayer;
    protected canvasLayer: L.Layer | null = null;
    protected layers: StalkerLayerGroup[] = [];
    protected items: Item[];
    protected lootBoxConfig: LootBoxConfig;
    protected upgrades: ItemUpgrade[];
    protected upgradeProperties: UpgradeProperty[];
    protected mapConfig: MapConfig;
    protected svgIcon: any;
    protected searchControl?: L.Control;
    protected searchComponentRef?: ComponentRef<MapSearchComponent>;
    protected layerContoller?: StalkerCustomLayersControl;
    protected mapInitialized: boolean = false;
    public undergroundMarkerToSearch: any[] = [];

    public openedUndergroundPopup: { component: UndergroundComponent, levelChanger: any };
    protected openedComparePopup: any;
    protected overlaysListTop: string = 'layers-control';
    public static readonly hiddenLayerName: string = 'hidden-markers';
    protected readonly hiddenMarkerOpacity: number = .5;

    public readonly maxWidthInPx: number = 3840;

    constructor(
        protected translate: TranslateService,
        protected route: ActivatedRoute,
        protected seo: SeoService,
        protected mapService: MapService,
        protected shareLinks: ShareLinkService,
        private ngZone: NgZone) {
        let urlGame: string = this.route.snapshot.paramMap.get('game') as string;

        if (MapComponent.avaliableGames[urlGame]) {
            this.game = MapComponent.avaliableGames[urlGame];
        } else {
            this.game = MapComponent.defaultGame;
        }

    }

    public showHideAll(n: any = null) {
        this.layerContoller?.setLayersVisible(this.layers, n.target.checked);
    }

    public hideMarker(markerToHide: HiddenMarker): void {
        if (markerToHide.isUnderground) {
            this.openedUndergroundPopup.component.hideMarker(markerToHide);
        }
        else {
            let marker: any;

            let hiddenLayer: any = this.layers.find(x => x.name == MapComponent.hiddenLayerName);
            let markerLayer: any = this.layers.find(x => x.name == markerToHide.layerName);

            markerLayer.eachLayer(function (layer: any) {
                if (layer.properties.coordinates.lat == markerToHide.lat && layer.properties.coordinates.lng == markerToHide.lng) {
                    marker = layer;
                }
            });

            if (marker) {
                markerLayer.removeLayer(marker);

                if (this.map.hasLayer(hiddenLayer)) {
                    hiddenLayer.addLayer(marker);
                    marker.setOpacity(0.5);
                }
                else {
                    hiddenLayer.addLayer(marker);
                    this.map.removeLayer(marker);
                }
            }
            else {
                console.error('Cant find marker to hide!')
            }
        }
    }

    public unhideMarker(markerShow: HiddenMarker): void {
        if (markerShow.isUnderground) {
            this.openedUndergroundPopup.component.unhideMarker(markerShow);
        }
        else {
            let marker: any;

            let hiddenLayer: any = this.layers.find(x => x.name == MapComponent.hiddenLayerName);
            let markerLayer: any = this.layers.find(x => x.name == markerShow.layerName);

            hiddenLayer.eachLayer(function (layer: any) {
                if (layer.properties.coordinates.lat == markerShow.lat && layer.properties.coordinates.lng == markerShow.lng) {
                    marker = layer;
                }
            });

            hiddenLayer.removeLayer(marker);

            if (this.map.hasLayer(markerLayer)) {
                markerLayer.addLayer(marker);
                marker.setOpacity(1);
            }
            else {
                markerLayer.addLayer(marker);
                this.map.removeLayer(marker);
            }
        }
    }

    @HostListener('window:resize', ['$event'])
    public onResize(event: any) {
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

    private async ngOnInit(): Promise<void> {
        const dialog: any = document.querySelector("#mobile-not-adaptive");
        //dialog.show(); // Opens a non-modal dialog
        if (dialog) {
            dialog.showModal(); // Opens a modal
        }

        await Promise.all([
            this.loadLocales(this.translate.currentLang() ?? DEFAULT_LANG),
            this.loadItems(),
            this.loadLootBoxConfig(),
            this.loadUpgrades(),
            this.loadUpgradeProperties()
        ]);

        this.translate.onLangChange.subscribe((i) => {
            this.loadLocales(i.lang);
        });

        fetch(`/assets/data/${this.game.uniqueName}/map.json`)
            .then((response) => {
                if (response.ok) {
                    response.json()
                        .then((gamedata: Map) => {
                            fetch(`/assets/data/${this.game.uniqueName}_config.json`)
                                .then((response) => response.json())
                                .then((gameConfig: MapConfig) => {
                                    this.loadMap(gamedata, gameConfig);
                                })
                                .catch((error) => {
                                    if (this.gamedata == null) {
                                        fetch(`/assets/data/${this.game.gameStyle}_config.json`)
                                            .then((response) => response.json())
                                            .then((gameConfig: MapConfig) => {
                                                this.loadMap(gamedata, gameConfig);
                                            })
                                    }
                                    else {
                                        console.error(error)
                                    }
                                });
                        });
                }
            })


        let body = document.body,
            html = document.documentElement;

        let height = Math.max(
            body.scrollHeight,
            body.offsetHeight,
            html.clientHeight,
            html.scrollHeight,
            html.offsetHeight
        );

        let wrapper = document.getElementById('map-wrapper');

        if (wrapper) {
            let wrapperHeight = height - wrapper.offsetTop - 10;
            document.documentElement.style.setProperty(
                '--wrapper-height',
                `${wrapperHeight}px`
            );
        }

        let cellSize = 50;

        document.documentElement.style.setProperty(
            '--inventory-cell-size',
            `${cellSize}px`
        );

        document.documentElement.style.setProperty(
            '--inventory-cell-size-texture-factor',
            `100%`
        );

        this.configureSeo();
    }

    private configureSeo(): void {
        this.seo.applyMapPage(this.game.uniqueName);
    }

    private async loadItems(): Promise<void> {
        await fetch(`/assets/data/${this.game.uniqueName}/items.json`)
            .then((response) => {
                if (response.ok) {
                    response.json()
                        .then((items: Item[]) => {
                            if (items) {
                                this.items = items;
                            }
                        });
                }
            })
    }

    private async loadLootBoxConfig(): Promise<void> {
        if (this.game.gameStyle != 'cop') {
            await fetch(`/assets/data/${this.game.uniqueName}/lootBoxConfig.json`)
                .then((response) => {
                    if (response.ok) {
                        response.json().then((config: LootBoxConfig) => {
                            if (config) {
                                this.lootBoxConfig = config;
                            }
                        })
                    }
                });
        }
    }

    private async loadUpgrades(): Promise<void> {
        if (this.game.gameStyle != 'shoc') {
            await fetch(`/assets/data/${this.game.uniqueName}/upgrades.json`)
                .then((response) => {
                    if (response.ok) {
                        response.json().then((config: ItemUpgrade[]) => {
                            if (config) {
                                this.upgrades = config;
                            }
                        })
                    }
                });
        }
    }

    private async loadUpgradeProperties(): Promise<void> {
        if (this.game.gameStyle != 'shoc') {
            await fetch(`/assets/data/${this.game.uniqueName}/upgrade_properties.json`)
                .then((response) => {
                    if (response.ok) {
                        response.json().then((config: UpgradeProperty[]) => {
                            if (config) {
                                this.upgradeProperties = config;
                            }
                        })
                    }
                });
        }
    }

    private async loadLocales(language: string): Promise<void> {
        await fetch(`/assets/data/${this.game.uniqueName}/${language}.json`)
            .then((response) => {
                if (response.ok) {
                    response.json().then((locales: any) => {
                        if (locales) {
                            this.translate.setTranslation(language, locales, true);
                        }
                    });
                }
            })


        fetch(`/assets/data/${this.game.uniqueName}/locale_import.json`)
            .then((response) => {
                if (response.ok) {
                    response.json().then((locales: any) => {
                        let games = Object.keys(locales);
                        if (games.length > 0) {
                            for (let game of games) {
                                let importLocales = locales[game].locales;

                                if (!(importLocales == null || importLocales.length == 0)) {

                                    fetch(`/assets/data/${game}/${language}.json`)
                                        .then((response) => {
                                            if (response.ok) {
                                                response.json().then((locales: any) => {
                                                    if (locales) {
                                                        let localesToInject: any = {};
                                                        for (let locale of importLocales) {
                                                            if (locales[locale] != null) {
                                                                localesToInject[locale] = locales[locale];
                                                            }
                                                        }

                                                        this.translate.setTranslation(language, localesToInject, true);
                                                    }
                                                });
                                            }
                                        })
                                }
                            }
                        }

                    });
                }
            });
    }

    private async ngOnDestroy(): Promise<void> {
        this.mapService.destroyComparePanel();
        this.map?.remove();
    }

    private loadMap(gameData: Map, gameConfig: MapConfig): void {
        if (NgZone.isInAngularZone()) {
            this.ngZone.runOutsideAngular(() => this.loadMap(gameData, gameConfig));
            return;
        }

        this.gamedata = gameData;
        this.mapConfig = gameConfig;

        let customCrs = L.extend({}, L.CRS.Simple, {
            transformation: new L.Transformation(gameConfig.kx ?? 1, 0, -1, 0),
        });

        this.map = createStalkerMap('map', {
            center: pixelCenter(gameData.heightInPixels, gameData.widthInPixels),
            zoom: gameConfig.startZoom,
            minZoom: gameConfig.minZoom,
            maxZoom: gameConfig.maxZoom,
            crs: customCrs,
            markerZoomAnimation: !0,
            zoomAnimation: !0,
            zoomControl: !1
        });
        this.map.filterStorageKey = `layers-${this.game.uniqueName}`;

        var transformation = this.map.options.crs!.transformation;
        console.log(transformation._a, transformation._b, transformation._c, transformation._d);

        this.map.scaleFactor = 1.5;

        this.map.attributionControl!.addAttribution('&copy; <a href="https://stalker-map.online">stalker-map.online</a>');

        this.mapService.setMapComponent(this);

        this.mapService.createCustomLayersControl();
        this.mapService.initComparePanel();

        const bounds = pixelBounds(this.gamedata.heightInPixels, this.gamedata.widthInPixels);

        L.imageOverlay(`https://thexii.github.io/stalker-map-tiles-storage/trilogy/${this.game.gameStyle}/${gameConfig.globalMapFileName}`, bounds).addTo(this.map);
        this.map.fitBounds(bounds);

        this.map.setMaxBounds(bounds);


        this.canvasRenderer = this.mapService.getCanvasRenderer();
        this.svgIcon = this.mapService.getCanvasIconConstructor();
        this.svgMarker = this.mapService.getCanvasMarkerConstructor();

        let markersToHide: any[] = [];
        let itemsTypes: string[] = [];

        if (this.gamedata.locations && this.gamedata.locations.length > 0) {
            this.addLocations();
        }

        if (this.gamedata.locationStrokes && this.gamedata.locationStrokes.length > 0) {
            //this.addLocationStrokes();
        }

        if (this.gamedata.marks && this.gamedata.marks.length > 0) {
            this.addMarks();
        }

        if (this.gamedata.shapes && this.gamedata.shapes.length > 0) {
            this.addShapes();
        }

        if (this.gamedata.stuffs && this.gamedata.stuffs.length > 0) {
            let [hiddenstuffs, itemsTypesStuff] = this.addStuffs();

            if (hiddenstuffs.length > 0) {
                markersToHide.push(...hiddenstuffs);
            }

            if (itemsTypesStuff.length > 0) {
                itemsTypes = itemsTypesStuff;
            }
        }

        if (this.gamedata.lootBoxes && this.gamedata.lootBoxes.length > 0) {
            this.addLootBoxes();
        }

        if (this.gamedata.anomalyZones && this.gamedata.anomalyZones.length > 0) {
            let hiddenAnomalies = this.addAnomalyZones();

            if (hiddenAnomalies.length > 0) {
                markersToHide.push(...hiddenAnomalies);
            }
        }

        if (this.gamedata.traders && this.gamedata.traders.length > 0) {
            this.addTraders();
        }

        if (this.gamedata.stalkers && this.gamedata.stalkers.length > 0) {
            this.addStalkers();
        }

        if (this.gamedata.mechanics && this.gamedata.mechanics.length > 0) {
            this.addMechanics();
        }

        if (this.gamedata.smartTerrains && this.gamedata.smartTerrains.length > 0) {
            this.addSmartTerrains(this.gamedata.id == 2);
        }

        if (this.gamedata.monsterLairs && this.gamedata.monsterLairs.length > 0) {
            this.addMonsterLairs();
        }

        if (this.gamedata.levelChangers && this.gamedata.levelChangers.length > 0) {
            this.addLevelChangers();
        }

        if (this.gamedata.roads && this.gamedata.roads.length > 0) {
            this.addRoads();
        }

        this.addHiddenMarkers(markersToHide);

        if (
            gameConfig.markersConfig != null &&
            gameConfig.markersConfig.length > 0 &&
            this.layers.length > 0) {
            let newLayers: any[] = [];
            for (let config of gameConfig.markersConfig) {
                if (this.layers.some((y: any) => y.name == config.uniqueName)) {
                    let currentLayer: any = this.layers.find(
                        (D: any) => D.name == config.uniqueName);

                    if (currentLayer) {
                        newLayers.push(currentLayer);

                        if (config.isShowByDefault) {
                            currentLayer.addTo(this.map);
                        }
                    }
                }
            }

            this.layers = newLayers;
        }

        let layersToControl = this.layers.map(x => [this.translate.instant(x.name), x]);
        const layerController = L.control.customLayers(null, Object.fromEntries(layersToControl), { overlaysListTop: this.overlaysListTop }) as StalkerCustomLayersControl;
        layerController.searchName = "layerControl";
        layerController.isUnderground = false;
        layerController.addTo(this.map);
        this.layerContoller = layerController;

        //L.control.stashFilter({ gameCategories: itemsTypes, categoriesConfig: this.mapConfig.itemsCategoriesSettings, layers: this.layers }).addTo(this.map);

        this.map.on('drag', () => {
            this.map.panInsideBounds(bounds, {
                animate: false
            });
        });

        let printClickCoordinates = true;

        if (printClickCoordinates) {
            let tempMap = this.map;
            let coorsAll = '';
            let component = this;

            this.map.on('click', function (ev: any) {
                var latlng = tempMap.mouseEventToLatLng(ev.originalEvent);

                if (ev.originalEvent.shiftKey && ev.originalEvent.altKey) {
                    console.log([latlng.lat, latlng.lng]);
                }
                else if (ev.originalEvent.ctrlKey && ev.originalEvent.shiftKey) {
                    let coors = '';

                    coors += `\"x\": ${latlng.lng},\n`;
                    coors += `\t\t\t\"y\": 0,\n`;
                    coors += `\t\t\t\"z\": ${latlng.lat},`;

                    console.log(coors);
                }

                //if (e.ctrlKey) {/*ctrl is down*/}
                //if (e.metaKey) {/*cmd is down*/}
            });
        }

        let ruler: any = null;

        if (gameConfig.rulerEnabled) {
            ruler = this.mapService.addRuler(this.map, this.mapConfig.lengthFactor ?? 1);
            ruler.addTo(this.map);
        }

        this.createSearchController();

        this.translate.onLangChange.subscribe(i => {
            let layersToControl = this.layers.map(x => [this.translate.instant(x.name), x]);

            this.layerContoller?.remove();
            let addRuler = false;

            if (ruler) {
                ruler.remove();
                addRuler = true;
            }

            const layerController = L.control.customLayers(null, Object.fromEntries(layersToControl), { overlaysListTop: this.overlaysListTop }) as StalkerCustomLayersControl;
            layerController.searchName = "layerControl";
            layerController.isUnderground = false;
            layerController.addTo(this.map);
            this.layerContoller = layerController;

            if (addRuler) {
                ruler = this.mapService.addRuler(this.map, this.mapConfig.lengthFactor ?? 1);
                ruler.addTo(this.map);
            }

            this.createSearchController();
        });

        L.control
            .zoom({
                position: 'bottomright',
            })
            .addTo(this.map);

        this.mapService.createCarousel(this.overlaysListTop);

        this.route.queryParams.subscribe((params) => {
            const link = this.shareLinks.parse(params);
            if (!link) {
                const boundsTuple = bounds as L.LatLngTuple[];
                this.map.setView(pixelCenter(boundsTuple[1][0], boundsTuple[1][1]));
                return;
            }

            if (link.underground) {
                const levelChangers = this.layers.find(x => x.name == 'level-changers');
                const levelChanger = this.shareLinks.findUndergroundEntrance(levelChangers, link.underground);

                if (levelChanger && hasLevelChangerProperties(levelChanger.properties)) {
                    this.map.flyTo(levelChanger.getLatLng(), this.map.getMaxZoom());

                    levelChanger.properties.markerToSearch = {
                        lat: link.lat,
                        lng: link.lng,
                        type: link.type,
                    };

                    levelChanger.fire('click');
                }
                else {
                    console.error(`cant find underground mark! (${link.lat},${link.lng},${link.type},${link.underground})`);
                }
                return;
            }

            const marker = this.shareLinks.findSurfaceMarker(this.layers, link);
            if (!marker) {
                return;
            }

            this.map.flyTo([link.lat, link.lng], this.map.getMaxZoom(), {
                animate: false,
                duration: 0.3,
            });

            marker.fireEvent('click');

            if (!isDevMode()) {
                const analytics = getAnalytics();
                logEvent(analytics, 'open-map-queryParams', {
                    game: this.gamedata.uniqueName,
                    language: this.translate.currentLang(),
                    markType: link.type,
                    coordinates: `${link.lat} ${link.lng}`,
                });
            }
        });

        this.mapInitialized = true;

        if (!isDevMode()) {
            const analytics = getAnalytics();
            logEvent(analytics, 'open-map', {
                game: this.gamedata.uniqueName,
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
    }

    private collectSearchableMarkers(): any[] {
        const markers: any[] = [];
        const undergroundMarkers: any[] = [];

        for (const layer of this.layers) {
            if (!this.map.hasLayer(layer) || !layer._layers) {
                continue;
            }

            const layerMarkers = Object.values(layer._layers);
            for (const marker of layerMarkers) {
                if (marker?.feature?.properties?.search) {
                    markers.push(marker);
                }
            }

            if (layerMarkers[0]?.properties?.typeUniqueName) {
                const typeUniqueName = layerMarkers[0].properties.typeUniqueName;
                undergroundMarkers.push(
                    ...this.undergroundMarkerToSearch.filter(
                        (x) =>
                            x.properties?.typeUniqueName == typeUniqueName
                            && x.feature?.properties?.search
                    )
                );
            }
        }

        if (this.layers.some((x) => x.name == 'level-changers' && this.map.hasLayer(x))) {
            markers.push(...undergroundMarkers);
        }

        return markers;
    }

    private onSearchResultSelected(marker: any): void {
        if (marker?.undergroundLocation) {
            this.handleUndergroundSearchMark(marker);
            return;
        }

        if (!marker?.getLatLng || !marker?.fire) {
            return;
        }

        this.map.setView(marker.getLatLng(), this.map.getMaxZoom());
        marker.fire('click');
    }

    private handleUndergroundSearchMark(marker: any): void {
        const location = marker.undergroundLocation;

        const levelChangers = this.layers.find((x) => x.name == 'level-changers');
        if (!levelChangers?._layers) {
            console.error(`cant find level changer for ${location.uniqueName}`);
            return;
        }

        const levelChanger = findLayerMarker(
            levelChangers,
            (m) => m.properties.destination == location.uniqueName
        );

        if (levelChanger && hasLevelChangerProperties(levelChanger.properties)) {
            const levelChangerProperties = levelChanger.properties;
            const latLng = marker.getLatLng();

            this.map.setView(levelChanger.getLatLng(), this.map.getMaxZoom());
            levelChangerProperties.markerToSearch = {
                lat: latLng.lat,
                lng: latLng.lng,
                layer: marker,
                type: marker.properties?.typeUniqueName,
            };

            const destinationLocation = this.gamedata.locations.find(
                (x) => x.id == levelChangerProperties.levelChanger.destinationLocationId
            ) as Location;

            if (this.openedUndergroundPopup) {
                if (this.openedUndergroundPopup.component.location.id == destinationLocation.id) {
                    const markerToSearch = levelChangerProperties.markerToSearch;
                    if (markerToSearch?.layer) {
                        this.openedUndergroundPopup.component.markerToSearch = new MarkerToSearch();
                        this.openedUndergroundPopup.component.markerToSearch.lat = markerToSearch.lat;
                        this.openedUndergroundPopup.component.markerToSearch.lng = markerToSearch.lng;
                        this.openedUndergroundPopup.component.markerToSearch.type =
                            markerToSearch.layer.properties.typeUniqueName ?? '';
                        levelChangerProperties.markerToSearch = undefined;
                        this.openedUndergroundPopup.component.goToMarker();
                        return;
                    }
                } else {
                    this.mapService.closeAllPopups();
                    levelChanger.fire('click');
                }
            } else {
                levelChanger.fire('click');
            }
        } else {
            console.error(`cant find level changer for ${location.uniqueName}`);
        }
    }

    private createStashFilter(): void {
        L.Control.StashFilter = L.Control.extend({
            options: {
                position: 'topright',
                collapsed: true,
                gameCategories: [],
                categoriesConfig: []
            },

            initialize: function (options: any) {
                L.setOptions(this, options);
                this.activeFilters = new Set();
                this._initializeFilters();
            },

            onAdd: function (map: any) {
                this._map = map;
                this._container = L.DomUtil.create('div', 'stash-filter-control leaflet-control-stash-filter');

                this._createControlContent();
                this._bindEvents();

                return this._container;
            },

            onRemove: function (map: any) {
                if (this.stashMarkers) {
                    map.removeLayer(this.stashMarkers);
                }
            },

            _initializeFilters: function () {
                const allCategories = new Set();

                for (let config of this.options.categoriesConfig) {
                    if (config.gameCategories.some((item: any) => this.options.gameCategories.includes(item))) {
                        allCategories.add(config)
                    }
                }

                console.log(allCategories);
                this.activeFilters = new Set(allCategories);
                this.allCategories = allCategories;
            },

            _createControlContent: function () {
                const header = L.DomUtil.create('div', 'stash-filter-header', this._container);
                header.innerHTML = `
              <span>Фільтри Тайників</span>
              <span class="toggle-arrow ${this.options.collapsed ? '' : 'expanded'}">▼</span>
          `;

                const content = L.DomUtil.create('div', 'stash-filter-content', this._container);
                if (this.options.collapsed) {
                    content.classList.add('collapsed');
                }

                const filterList = L.DomUtil.create('div', 'filter-list', content);
                this._filterList = filterList;

                const stats = L.DomUtil.create('div', 'stats-info', content);
                this._stats = stats;

                this._updateFilterList();
                //this._updateStats();

                // Обробник для згортання/розгортання
                L.DomEvent.on(header, 'click', this._toggleCollapse, this);
            },

            _bindEvents: function () {
                // Запобігаємо всплиттю подій карти
                L.DomEvent.disableClickPropagation(this._container);
                L.DomEvent.disableScrollPropagation(this._container);
            },

            _toggleCollapse: function () {
                const content = this._container.querySelector('.stash-filter-content');
                const arrow = this._container.querySelector('.toggle-arrow');

                content.classList.toggle('collapsed');
                arrow.classList.toggle('expanded');
            },

            _updateFilterList: function () {
                const allCategories = Array.from(this.activeFilters).sort();
                this._filterList.innerHTML = '';

                allCategories.forEach((category: any) => {
                    const filterItem = L.DomUtil.create('div', 'filter-item', this._filterList);

                    const checkbox = L.DomUtil.create('input', '', filterItem);
                    checkbox.type = 'checkbox';
                    checkbox.id = `filter-${category}`;
                    checkbox.checked = this.activeFilters.has(category);

                    const label = L.DomUtil.create('label', '', filterItem);
                    label.htmlFor = `filter-${category.name}`;
                    label.innerHTML = category.name;

                    // Додаємо обробник події
                    L.DomEvent.on(checkbox, 'change', () => {
                        this._toggleFilter(category);
                    });
                });
            },

            _toggleFilter: function (category: any) {
                if (this.activeFilters.has(category)) {
                    this.activeFilters.delete(category);
                } else {
                    this.activeFilters.add(category);
                }

                this.updateMap();
            },

            updateMap: function () {
                const filteringCategories = [...this.allCategories].map((item: { gameCategories: any; }) => item.gameCategories).flat();

                for (let layer of this.options.layers) {
                    if (this._map.hasLayer(layer) && layer._layers != null) {
                        let markers: any[] = Object.values(layer._layers);
                        for (let marker of markers) {
                            if (marker.properties && marker.properties.itemTypes && marker.properties.itemTypes.length > 0) {
                                const properties = marker.properties;

                                if (properties.itemTypes && Array.isArray(properties.itemTypes) && properties.itemTypes.length > 0) {
                                    if (!properties.itemTypes.some((x: string) => filteringCategories.includes(x))) {
                                        continue;
                                    }

                                    let hasActiveFilter = false;

                                    if (this.activeFilters.size > 0) {
                                        for (let filter of this.activeFilters) {
                                            if (properties.itemTypes.some((x: string) => filter.gameCategories.includes(x))) {
                                                hasActiveFilter = true;
                                                break;
                                            }
                                        }
                                    }
                                    else {
                                        hasActiveFilter = true;

                                        for (let filter of this.allCategories) {
                                            if (properties.itemTypes.some((x: string) => filter.gameCategories.includes(x))) {
                                                hasActiveFilter = false;
                                                break;
                                            }
                                        }
                                    }

                                    if (hasActiveFilter) {
                                        if (!this._map.hasLayer(marker)) {
                                            this._map.addLayer(marker);
                                        }
                                    } else {
                                        if (this._map.hasLayer(marker)) {
                                            this._map.removeLayer(marker);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                /*this._map.eachLayer((layer: any) => {
                    if (layer.properties && layer.properties.itemTypes && layer.properties.itemTypes.length > 0) {
                        const properties = layer.properties;
                        
                        if (properties.itemTypes && Array.isArray(properties.itemTypes) && properties.itemTypes.length > 0) {
                            let hasActiveFilter = false;
      
                            for (let filter of this.activeFilters) {
                              if (properties.itemTypes.some((x: string) => filter.gameCategories.includes(x))) {
                                hasActiveFilter = true;
                                break;
                              }
                            }
                            
                            if (hasActiveFilter) {
                                if (!this._map.hasLayer(layer)) {
                                    this._map.addLayer(layer);
                                }
                            } else {
                                if (this._map.hasLayer(layer)) {
                                    this._map.removeLayer(layer);
                                }
                            }
                        }
                    }
                });*/
            },
        } as any);

        // Фабричний метод для створення контролу
        L.control.stashFilter = function (options: any) {
            return new L.Control.StashFilter(options);
        };
    }

    private addLocations() {
        let locationsOnMap = [];

        for (let location of this.gamedata.locations) {
            let locationImage = '';

            if (location.image != null) {
                locationImage = `https://thexii.github.io/stalker-map-tiles-storage/trilogy/${this.game.gameStyle}/${location.image}`;
            }
            else {
                if (location.x1 == 0 && location.x2 == 0 && location.y1 == 0 && location.y2 == 0) {
                    continue;
                }

                locationImage = `https://thexii.github.io/stalker-map-tiles-storage/trilogy/${this.game.gameStyle}/map_${location.uniqueName}.webp`;
            }

            const locationBounds = asLatLngBounds([
                [location.y1, location.x1],
                [location.y2, location.x2]
            ]);
            let locationImageOverlay = L.imageOverlay(locationImage, locationBounds, {
                interactive: !0,
                className: 'location-on-map',
            });

            locationImageOverlay.name = location.uniqueName;
            locationImageOverlay.uniqueName = location.uniqueName;
            locationImageOverlay.id = location.id;
            locationsOnMap.push(locationImageOverlay);
        }

        this.locations = L.layerGroup(locationsOnMap) as StalkerLocationsLayer;
        this.locations.locations = Object.values(locationsOnMap);
        this.locations.addTo(this.map);
    }

    private addLocationStrokes() {
        for (let location of this.gamedata.locationStrokes) {
            var svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svgElement.setAttribute('xmlns', "http://www.w3.org/2000/svg");

            let minX = 1000000, minY = 1000000, maxX = 0, maxY = 0;

            for (let point of location.points) {
                if (point.z < minY) {
                    minY = point.z;
                }

                if (point.z > maxY) {
                    maxY = point.z;
                }

                if (point.x < minX) {
                    minX = point.x;
                }

                if (point.x > maxX) {
                    maxX = point.x;
                }
            }

            let dx = maxX - minX;
            let dy = maxY - minY;
            let box = [dx, dy];
            svgElement.setAttribute('viewBox', `0 0 ${box[0]} ${box[1]}`);
            let points = location.points.map(x => [x.x - minX, maxY - x.z].join(',')).join(' ');
            let firstPoint = [location.points[0].x - minX, maxY - location.points[0].z];
            points += `, ${firstPoint[0]},${firstPoint[1]}`

            svgElement.innerHTML = `<polyline fill="none" stroke="#e53c35" stroke-width="2" points="${points}" />`;
            var svgElementBounds = asLatLngBounds([[minY, minX], [maxY, maxX]]);
            L.svgOverlay(svgElement, svgElementBounds).addTo(this.map);
        }
    }

    private addStuffs(): any[] {
        let stuffTypes = this.getStuffTypes();
        let markersToHide: any[] = [];

        this.gamedata.stuffs = this.gamedata.stuffs.sort(
            (c: StuffModel, l: StuffModel) => c.typeId - l.typeId
        );

        let ignoredNames: string[] = ['stuff_at_location'];
        let index = 0;
        let itemsTypes: string[] = [];

        for (let markType of stuffTypes) {
            let hiddenMarkers = this.mapService.getAllHiddenMarkers().filter(x => x.layerName == markType.uniqueName);
            let stuffsAtLocation = this.gamedata.stuffs.filter(
                (u: { typeId: number }) => u.typeId == markType.id
            );

            if (stuffsAtLocation.length > 0) {
                let markers: any = [];

                for (let stuffModel of stuffsAtLocation) {
                    let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == stuffModel.locationId) as Location;

                    if (location.isUnderground) {
                        if (markType.ableToSearch) {
                            let stuff = new this.svgMarker([stuffModel.z, stuffModel.x], { renderer: this.canvasRenderer });

                            stuff.properties = {};
                            stuff.properties.stuff = stuffModel;
                            stuff.properties.coordinates = { lat: stuffModel.z, lng: stuffModel.x };
                            stuff.properties.markType = markType.name;
                            stuff.properties.typeUniqueName = markType.uniqueName;
                            stuff.properties.ableToSearch = markType.ableToSearch;
                            stuff.properties.itemTypes = [];

                            let localesToFind = [];

                            if (stuff.properties.stuff.name && !ignoredNames.includes(stuff.properties.stuff.name)) {
                                localesToFind.push(stuff.properties.stuff.name);
                            }

                            if (stuff.properties.description) {
                                localesToFind.push(stuff.properties.stuff.description);
                            }

                            if (stuff.properties.stuff.items?.length > 0) {
                                let itemsToFind: any[] = [];

                                stuff.properties.stuff.items.forEach((element: any) => {
                                    let item = this.items.find(y => y.uniqueName == element.uniqueName);

                                    if (item) {
                                        itemsToFind.push(item?.localeName);
                                        itemsToFind.push(`synonyms.${item?.uniqueName}`);

                                        if (item.category) {
                                            if (!itemsTypes.includes(item.category)) {
                                                itemsTypes.push(item.category);
                                            }

                                            if (!stuff.properties.itemTypes.includes(item.category)) {
                                                stuff.properties.itemTypes.push(item.category);
                                            }
                                        }
                                    }
                                });

                                localesToFind.push(...itemsToFind);
                            }

                            stuff.feature = {};
                            stuff.feature.properties = {};
                            stuff.doNotRender = true;
                            stuff.undergroundLocation = location;

                            localesToFind.push(index.toString());
                            index++;

                            localesToFind.push()

                            this.createTranslatableProperty(
                                stuff.feature.properties,
                                'search',
                                localesToFind,
                                this.translate
                            );

                            stuff.properties.locationUniqueName = location.uniqueName;
                            stuff.properties.locationName = location.uniqueName;
                            stuff.properties.name = stuff.properties.stuff.name;

                            this.undergroundMarkerToSearch.push(stuff);
                        }

                        continue;
                    }

                    let stuff = new this.svgMarker([stuffModel.z, stuffModel.x], {
                        icon: markType,
                        renderer: this.canvasRenderer,
                        radius: markType.radius
                    });

                    stuff.properties = {};
                    stuff.properties.stuff = stuffModel;
                    stuff.properties.coordinates = { lat: stuffModel.z, lng: stuffModel.x };
                    stuff.properties.markType = markType.name;
                    stuff.properties.typeUniqueName = markType.uniqueName;
                    stuff.properties.ableToSearch = markType.ableToSearch;
                    stuff.properties.itemTypes = [];

                    if (stuff.properties.ableToSearch) {
                        let localesToFind = [];

                        if (stuff.properties.stuff.name && !ignoredNames.includes(stuff.properties.stuff.name)) {
                            localesToFind.push(stuff.properties.stuff.name);
                        }

                        if (stuff.properties.description) {
                            localesToFind.push(stuff.properties.stuff.description);
                        }

                        if (stuff.properties.stuff.items?.length > 0 && this.items && this.items.length > 0) {
                            localesToFind.push(...stuff.properties.stuff.items.map((x: { uniqueName: string; category: string }) => {
                                let item = this.items.find(y => y.uniqueName == x.uniqueName);

                                if (item) {
                                    if (item.category) {
                                        if (!itemsTypes.includes(item.category)) {
                                            itemsTypes.push(item.category);
                                        }

                                        if (!stuff.properties.itemTypes.includes(item.category)) {
                                            stuff.properties.itemTypes.push(item.category);
                                        }
                                    }

                                    return this.items.find(y => y.uniqueName == x.uniqueName)?.localeName;
                                }

                                return null;
                            }));
                        }

                        stuff.feature = {};
                        stuff.feature.properties = {};

                        localesToFind.push(index.toString());
                        index++;

                        localesToFind.push()

                        this.createTranslatableProperty(
                            stuff.feature.properties,
                            'search',
                            localesToFind,
                            this.translate
                        );

                        stuff.properties.locationUniqueName = location.uniqueName;
                        stuff.properties.locationName = location.uniqueName;
                        stuff.properties.name = stuff.properties.stuff.name;
                    }

                    stuff.bindTooltip((p: any) => this.mapService.createStuffTooltip(p), {
                        sticky: true,
                        className: 'map-tooltip',
                        offset: new Point(0, 50),
                    });

                    stuff.on('click', (e: any) => this.mapService.onMarkerClick(e, this.map, this.container, this.bottomSheet, (container, isPopup)=> this.mapService.createStashContent(e.target, container, this.game, this.items, false, isPopup)));
        
                    if (hiddenMarkers.some(x => x.lat == stuffModel.z && x.lng == stuffModel.x)) {
                        markersToHide.push(stuff);
                    }
                    else {
                        markers.push(stuff);
                    }
                }

                this.addLayerToMap(L.layerGroup(markers), markType.uniqueName, markType.ableToSearch);
            }
        }

        return [markersToHide, itemsTypes];
    }

    private addLootBoxes() {
        let lootBoxType = this.getLootBoxIcon();

        let markers: any[] = [];
        let index = 0;

        for (let lootBox of this.gamedata.lootBoxes) {
            let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == lootBox.locationId) as Location;

            if (location.isUnderground) {
                let lootBoxMarker = new this.svgMarker([lootBox.z, lootBox.x], { renderer: this.canvasRenderer });

                lootBoxMarker.properties = {};
                lootBoxMarker.properties.lootBox = lootBox;
                lootBoxMarker.properties.coordinates = { lat: lootBox.z, lng: lootBox.x };
                lootBoxMarker.properties.markType = lootBoxType.name;
                lootBoxMarker.properties.name = lootBoxType.name;
                lootBoxMarker.properties.typeUniqueName = lootBoxType.uniqueName;
                lootBoxMarker.properties.ableToSearch = lootBoxType.ableToSearch;

                let localesToFind: string[] = [];

                if (lootBox.lootBoxes?.length > 0) {
                    for (let box of lootBox.lootBoxes) {
                        let names = box.items?.map((x: { uniqueName: string; }) => {
                            return this.items.find(y => y.uniqueName == x.uniqueName)?.localeName;
                        });

                        if (names.length > 0) {
                            localesToFind.push(...(names as string[]));
                        }
                    }
                }

                if (localesToFind.length == 0) {
                    continue;
                }

                lootBoxMarker.feature = {};
                lootBoxMarker.feature.properties = {};
                lootBoxMarker.doNotRender = true;
                lootBoxMarker.undergroundLocation = location;

                localesToFind.push(index.toString());
                index++;

                this.createTranslatableProperty(
                    lootBoxMarker.feature.properties,
                    'search',
                    localesToFind,
                    this.translate
                );

                lootBoxMarker.properties.locationUniqueName = location.uniqueName;
                lootBoxMarker.properties.locationName = location.uniqueName;
                //lootBoxMarker.properties.name = lootBoxMarker.properties.lootBox.name;

                this.undergroundMarkerToSearch.push(lootBoxMarker);

                continue;
            }

            let lootBoxMarker = new this.svgMarker([lootBox.z, lootBox.x], {
                icon: lootBoxType,
                renderer: this.canvasRenderer,
                radius: lootBoxType.radius
            });

            lootBoxMarker.properties = {};
            lootBoxMarker.properties.coordinates = { lat: lootBox.z, lng: lootBox.x };
            lootBoxMarker.properties.lootBox = lootBox;
            lootBoxMarker.properties.name = lootBoxType.name;
            lootBoxMarker.properties.typeUniqueName = lootBoxType.uniqueName;
            lootBoxMarker.properties.ableToSearch = lootBoxType.ableToSearch;

            if (lootBoxMarker.properties.ableToSearch) {
                let p = [];
                p.push(lootBoxMarker.properties.name);
                lootBoxMarker.properties.description && lootBoxMarker.properties.description !=
                    this.translate.instant('default-desription') &&
                    p.push(lootBoxMarker.properties.description);
                p.push(
                    ...lootBoxMarker.properties.lootBox.items.map(
                        (y: { uniqueName: string }) => y.uniqueName
                    )
                );

                p.push(index.toString());
                index++;

                lootBoxMarker.feature = {
                    properties: {
                        search: p.join(', '),
                    },
                };

                this.createTranslatableProperty(
                    lootBoxMarker.feature.properties,
                    'search',
                    p,
                    this.translate
                );

                lootBoxMarker.properties.locationUniqueName = location.uniqueName;
            }

            lootBoxMarker.bindTooltip(
                (lootBoxMarker: any) => this.translate.instant(lootBoxMarker.properties.name),
                {
                    sticky: true,
                    className: 'map-tooltip',
                    offset: [0, 50],
                }
            );

            lootBoxMarker.on('click', (e: any) => this.mapService.onMarkerClick(e, this.map, this.container, this.bottomSheet, (container, isPopup)=> this.mapService.createLootBoxContent(e.target, container, this.game, this.items, this.gamedata.locations, this.lootBoxConfig, false)));
            markers.push(lootBoxMarker);
        }

        this.addLayerToMap(L.layerGroup(markers), lootBoxType.uniqueName, lootBoxType.ableToSearch);
    }

    private addMarks() {
        let markTypes: any = this.getMarkTypes();

        this.gamedata.marks = this.gamedata.marks.sort(
            (c: { typeId: number }, l: { typeId: number }) => c.typeId - l.typeId
        );

        for (let markType of markTypes) {
            let marks = this.gamedata.marks.filter(
                (u: { typeId: number }) => u.typeId == markType.id
            );

            if (marks.length > 0) {
                let markers = [];

                for (let mark of marks) {
                    let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == mark.locationId) as Location;

                    if (location.isUnderground) {
                        continue;
                    }

                    let marker = null;

                    if (mark.radius > 0) {
                        let color: string = '#ffffffff'
                        marker = L.circle([mark.z, mark.x], { radius: mark.radius, color: color, weight: 2 });
                    }
                    else {
                        marker = new this.svgMarker([mark.z, mark.x], {
                            icon: markType,
                            renderer: this.canvasRenderer,
                            radius: markType.radius
                        });
                    }

                    marker.properties = {};
                    marker.properties.coordinates = { lat: mark.z, lng: mark.x };

                    marker.properties.name = mark.name ? mark.name : markType.markName;
                    marker.properties.description = mark.description;
                    marker.properties.markType = markType.name;
                    marker.properties.typeUniqueName = markType.uniqueName;
                    marker.properties.ableToSearch = markType.ableToSearch;

                    markers.push(marker);

                    if (marker.properties.ableToSearch) {
                        let p = [];

                        p.push(marker.properties.name);
                        p.push(markType.uniqueName);
                        p.push(location.uniqueName);

                        if (
                            marker.properties.description &&
                            marker.properties.description !=
                            this.translate.instant('default-desription')
                        ) {
                            p.push(marker.properties.description);
                        }

                        marker.feature = {
                            properties: {
                                search: p.join(', '),
                            },
                        };

                        this.createTranslatableProperty(
                            marker.feature.properties,
                            'search',
                            p,
                            this.translate
                        );

                        marker.properties.locationUniqueName = location.uniqueName;
                        marker.properties.locationName = location.uniqueName;
                    }

                    marker.bindTooltip(
                        (marker: any) => this.translate.instant(marker.properties.name),
                        {
                            sticky: true,
                            className: 'map-tooltip',
                            offset: [0, 50],
                        }
                    );
                }

                this.addLayerToMap(L.layerGroup(markers), markType.uniqueName, markType.ableToSearch);
            }
        }
    }

    private addShapes() {
        let shapeType = this.mapService.getShapeTypes();

        for (let shapeCollection of this.gamedata.shapes) {
            let type = shapeType.find(x => x.type == shapeCollection.type);

            if (type == null) {
                console.error(shapeCollection.type);
                continue;
            }

            let polygons = [];

            for (let shape of shapeCollection.polygons) {
                let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == shape.locationId) as Location;

                if (location.isUnderground) {
                    continue;
                }

                const coors: number[][] = Array.from({ length: Math.ceil(shape.coordinates.length / 2) }, (_, i) =>
                    shape.coordinates.slice(i * 2, i * 2 + 2)
                );

                let newCoors = coors.map(([x, z]) => [z, x]);

                let polygon = L.polygon(asLatLngExpressions(newCoors), {color: type.stroke, fill: type.fill, renderer: this.canvasRenderer, interactive: false});

                polygons.push(polygon);
            }

            for (let shape of shapeCollection.circles) {
                let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == shape.locationId) as Location;

                if (location.isUnderground) {
                    continue;
                }

                let circle = L.circle([shape.z, shape.x], {radius: shape.radius, color: type.stroke, fill: type.fill, renderer: this.canvasRenderer, interactive: false});
                
                polygons.push(circle);
            }
            
            if (polygons.length > 0) {
                this.addLayerToMap(L.layerGroup(polygons), type.name, false);
            }
        }
    }

    private addAnomalyZones(): any[] {
        let anomalyZoneIcon, anomalyZoneNoArtIcon;
        [anomalyZoneIcon, anomalyZoneNoArtIcon] = this.getAnomaliesIcons();

        let anomalies: any[] = [];
        let anomaliesNoArt: any[] = [];
        let artefactWays: any[] = [];

        const defaultType: string = 'anomaly-zone';

        let hiddenMarkers = this.mapService.getAllHiddenMarkers().filter(x => x.layerName == defaultType);

        let markersToHide: any[] = [];

        for (let zone of this.gamedata.anomalyZones) {
            let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == zone.locationId) as Location;

            if (location.isUnderground) {
                continue;
            }

            let dx: number = location.x2 - location.x1;
            let dy: number = location.y1 - location.y2;

            let canvasMarker;

            let hasArtefacts = zone.anomaliySpawnSections != null && zone.anomaliySpawnSections.length > 0;
            let icon = hasArtefacts ? anomalyZoneIcon : anomalyZoneNoArtIcon;

            canvasMarker = new this.svgMarker([zone.z, zone.x], {
                icon: icon,
                renderer: this.canvasRenderer,
                radius: icon.radius
            });

            canvasMarker.properties = {};
            canvasMarker.properties.zoneModel = zone;
            canvasMarker.properties.coordinates = { lat: zone.z, lng: zone.x };

            if (hasArtefacts) {
                canvasMarker.properties.anomaliySpawnSections =
                    zone.anomaliySpawnSections;
                canvasMarker.properties.markType = anomalyZoneIcon.cssClass;
                canvasMarker.properties.ableToSearch = true;
                canvasMarker.properties.typeUniqueName = defaultType;
                canvasMarker.properties.name = zone.name ? zone.name : defaultType;

                let searchFields = [anomalies.length.toString()];

                if (canvasMarker.properties.name != defaultType) {
                    searchFields.push(canvasMarker.properties.name);
                }

                if (
                    canvasMarker.properties.description &&
                    canvasMarker.properties.description !=
                    this.translate.instant('default-desription')
                ) {
                    searchFields.push(canvasMarker.properties.description);
                }

                let artefactsSections = zone.anomaliySpawnSections.map(
                    (item: AnomalySpawnSection) =>
                        item.anomalySpawnItems.map((ass) => ass.uniqueName)
                );

                for (let artefactsSection of artefactsSections) {
                    for (let art of artefactsSection) {
                        let item = this.items.find(x => x.uniqueName == art);

                        if (item) {
                            searchFields.push(item.localeName);
                        }
                    }
                }


                searchFields.push(anomalyZoneIcon.uniqueName);
                searchFields.push(location.uniqueName);

                canvasMarker.feature = {};
                canvasMarker.feature.properties = {};
                this.createTranslatableProperty(
                    canvasMarker.feature.properties,
                    'search',
                    searchFields,
                    this.translate
                );

                if (zone.artefactWays && zone.artefactWays.length > 0) {
                    for (let way of zone.artefactWays) {

                        let latlngs: any[] = [];//= way.points.map(x => [x.z, x.x]);

                        for (let point of way.points) {
                            let px = 0.5 - location.xShift + point.x / location.widthInMeters;
                            let py = 0.5 - location.yShift + point.z / location.heightInMeters;

                            latlngs.push(
                                [
                                    location.y2 + py * dy,
                                    location.x1 + px * dx
                                ]
                            )
                        }

                        latlngs.push(latlngs[0]);
                        artefactWays.push(L.polyline(latlngs, { color: 'yellow', weight: 2 }));
                    }
                }

                if (hiddenMarkers.some(x => x.lat == zone.z && x.lng == zone.x)) {
                    markersToHide.push(canvasMarker);
                }
                else {
                    anomalies.push(canvasMarker);
                }

                let locationFromL = this.locations.locations.find(
                    (x) => x.id == zone.locationId
                );
                if (locationFromL) {
                    canvasMarker.properties.locationUniqueName = locationFromL.uniqueName;
                    canvasMarker.properties.locationName = locationFromL.name;
                }
            } else {
                anomaliesNoArt.push(canvasMarker);
                canvasMarker.properties.ableToSearch = false;
                canvasMarker.properties.typeUniqueName = anomalyZoneNoArtIcon.uniqueName;
                canvasMarker.properties.name = zone.name ? zone.name : 'st_name_anomal_zone';
            }

            canvasMarker.properties.zoneModel.name = canvasMarker.properties.name;

            canvasMarker.bindTooltip(
                (zone: any) => {
                    return this.mapService.createAnomalyZoneTooltip(zone);
                },
                { sticky: true, className: 'map-tooltip', offset: new Point(0, 50) }
            );

            canvasMarker.on('click', (e: any) => this.mapService.onMarkerClick(e, this.map, this.container, this.bottomSheet, (container, isPopup)=> this.mapService.createAnomalyZoneContent(e.target, container, this.game, this.items, false)));
        }

        try {
            this.addLayerToMap(L.layerGroup(anomalies), anomalyZoneIcon.uniqueName, true);

            if (anomaliesNoArt.length > 0) {
                this.addLayerToMap(L.layerGroup(anomaliesNoArt), anomalyZoneNoArtIcon.uniqueName);
            }

            if (artefactWays.length > 0) {
                this.addLayerToMap(L.layerGroup(artefactWays), 'artefact-ways');
            }
        } catch (e) {
            console.log(e);
        }

        return markersToHide;
    }

    private createProperty(
        object: any,
        propertyName: string,
        value: any
    ): void {
        Object.defineProperty(object, propertyName, {
            get: function () {
                try {
                    return this.value;
                } catch (ex) {
                    console.error(this.value);
                    throw ex;
                }
            },
            set: function (value) {
                console.warn(value)
                this.value = value;
            },
        });

        object[propertyName] = value;
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
                    return this.array.filter((x: any) => x != null).map((x: string) => translate.instant(x)).join(', ');
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

    private addTraders() {
        let traderIcon = {
            name: this.translate.instant('traders'),
            uniqueName: 'traders',
            cssClass: 'tradere',
            ableToSearch: true,
            icon: new this.svgIcon({
                iconSize: [4, 4],
                animate: false,
                iconUrl: '/assets/images/svg/marks/trader.svg',
                iconSizeInit: [2, 2],
                iconAnchor: [0, 0],
            }),
            keepMapSize: true
        };

        let medicIcon = {
            uniqueName: 'medic',

            icon:  new this.svgIcon({
                iconSize: [4, 4],
                animate: false,
                iconUrl: '/assets/images/svg/marks/medic.svg',
                iconSizeInit: [1.5, 1.5],
                iconAnchor: [0, 0],
            }),
            keepMapSize: true
        }

        let markers: any[] = [];

        for (let trader of this.gamedata.traders) {
            let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == trader.locationId) as Location;

            if (location.isUnderground) {
                continue;
            }

            let canvasMarker = new this.svgMarker([trader.z, trader.x], {
                icon: trader.isMedic ? medicIcon : traderIcon,
                renderer: this.canvasRenderer,
                radius: trader.isMedic ? 1.5 : 2
            });

            canvasMarker.properties = {};
            canvasMarker.properties.coordinates = { lat: trader.z, lng: trader.x };
            canvasMarker.properties.traderConfig = trader;
            canvasMarker.properties.name = trader.profile.name;
            canvasMarker.properties.typeUniqueName = traderIcon.uniqueName;

            markers.push(canvasMarker);
            canvasMarker.properties.ableToSearch = false;
            canvasMarker.feature = {};
            canvasMarker.feature.properties = {};
            this.createTranslatableProperty(
                canvasMarker.feature.properties,
                'search',
                [trader.profile.name, trader.isMedic ? medicIcon.uniqueName : traderIcon.uniqueName],
                this.translate
            );

            canvasMarker.properties.locationUniqueName = location.uniqueName;

            canvasMarker.bindTooltip(
                (marker: any) =>
                    this.translate.instant(marker.properties.traderConfig.profile.name),
                {
                    sticky: true,
                    className: 'map-tooltip',
                    offset: [0, 50],
                }
            );

            canvasMarker.on('click', (e: any) => this.mapService.onMarkerClick(e, this.map, this.container, this.bottomSheet, (container, isPopup)=> this.mapService.createTraderContent(e.target, this.gamedata.traders, container, this.game, this.items, this.mapConfig, isPopup)));
        
        }

        this.addLayerToMap(L.layerGroup(markers), traderIcon.uniqueName, traderIcon.ableToSearch);
    }

    private addStalkers() {
        let stalkerIcon, stalkerIconDead, stalkerIconQuestItem;
        [stalkerIcon, stalkerIconDead, stalkerIconQuestItem] = this.getStalkersIcon();

        let markers: any[] = [];
        let index = 0;

        for (let stalker of this.gamedata.stalkers) {
            let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == stalker.locationId) as Location;

            if (location.isUnderground) {
                if (true) {
                    let canvasMarker = new this.svgMarker([stalker.z, stalker.x], { renderer: this.canvasRenderer });

                    canvasMarker.properties = {};
                    canvasMarker.properties.coordinates = { lat: stalker.z, lng: stalker.x };
                    canvasMarker.properties.stalker = stalker;
                    canvasMarker.properties.markType = stalkerIcon.name;
                    canvasMarker.properties.typeUniqueName = stalkerIcon.uniqueName;
                    canvasMarker.properties.ableToSearch = stalkerIcon.ableToSearch;

                    let propertiesToSearch: string[] = [stalker.profile.name, stalker.profile.faction];

                    if (stalker.hasUniqueItem) {
                        for (let inv of stalker.inventoryItems) {
                            let item = this.items.find(y => y.uniqueName == inv.uniqueName) as Item;
                            propertiesToSearch.push(item.localeName);
                        }
                    }

                    canvasMarker.feature = {};
                    canvasMarker.feature.properties = {};

                    this.createTranslatableProperty(
                        canvasMarker.feature.properties,
                        'search',
                        propertiesToSearch,
                        this.translate
                    );

                    canvasMarker.doNotRender = true;
                    canvasMarker.undergroundLocation = location;

                    canvasMarker.properties.locationUniqueName = location.uniqueName;
                    canvasMarker.properties.locationName = location.uniqueName;
                    canvasMarker.properties.name = stalker.profile.name;

                    this.undergroundMarkerToSearch.push(canvasMarker);
                }

                continue;
            }

            let icon = stalker.alive ? (stalker.hasUniqueItem ? stalkerIconQuestItem : stalkerIcon) : stalkerIconDead;

            let canvasMarker = new this.svgMarker([stalker.z, stalker.x], {
                icon: icon,
                renderer: this.canvasRenderer,
                radius: icon.radius
            });

            canvasMarker.properties = {};
            canvasMarker.properties.coordinates = { lat: stalker.z, lng: stalker.x };
            canvasMarker.properties.stalker = stalker;
            canvasMarker.properties.name = stalker.profile.name;
            canvasMarker.properties.typeUniqueName = stalkerIcon.uniqueName;

            markers.push(canvasMarker);
            canvasMarker.properties.ableToSearch = false;
            canvasMarker.feature = {};
            canvasMarker.feature.properties = {};

            let propertiesToSearch: string[] = [stalker.profile.name, stalker.profile.faction];

            if (stalker.hasUniqueItem) {
                for (let inv of stalker.inventoryItems) {
                    let item = this.items.find(y => y.uniqueName == inv.uniqueName) as Item;
                    propertiesToSearch.push(item.localeName);
                }
            }

            this.createTranslatableProperty(
                canvasMarker.feature.properties,
                'search',
                propertiesToSearch,
                this.translate
            );

            canvasMarker.properties.locationUniqueName = location.uniqueName;

            canvasMarker.bindTooltip(
                (marker: any) =>
                    this.translate.instant(marker.properties.stalker.profile.name),
                {
                    sticky: true,
                    className: 'map-tooltip',
                    offset: [0, 50],
                }
            );

            canvasMarker.on('click', (e: any) => this.mapService.onMarkerClick(e, this.map, this.container, this.bottomSheet, (container, isPopup)=> this.mapService.createStalkerContent(e.target, container, this.game, this.items, this.mapConfig, false, !isPopup)));
        }


        this.addLayerToMap(L.layerGroup(markers), stalkerIcon.uniqueName, stalkerIcon.ableToSearch);
    }

    private addMechanics() {
        let mechanicIcon = {
            name: this.translate.instant('mechanic'),
            uniqueName: 'mechanics',
            cssClass: 'mechanic',
            ableToSearch: true,
            icon: new this.svgIcon({
                iconSize: [4, 4],
                className: 'mark-container stalker-mark-2',
                animate: false,
                iconUrl: '/assets/images/svg/marks/tech.svg',
                iconSizeInit: [1.5, 1.5],
                iconAnchor: [0, 0],
            }),
            keepMapSize: true
        };

        let markers: any[] = [];
        let index = 0;

        for (let mechanic of this.gamedata.mechanics) {
            let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == mechanic.locationId) as Location;

            let canvasMarker = new this.svgMarker([mechanic.z, mechanic.x], {
                icon: mechanicIcon,
                renderer: this.canvasRenderer,
                radius: 1.5
            });

            canvasMarker.properties = {};
            canvasMarker.properties.coordinates = { lat: mechanic.z, lng: mechanic.x };
            canvasMarker.properties.mechanic = mechanic;
            canvasMarker.properties.name = mechanic.profile.name;
            canvasMarker.properties.typeUniqueName = mechanicIcon.uniqueName;

            markers.push(canvasMarker);
            canvasMarker.properties.ableToSearch = false;
            canvasMarker.feature = {};
            canvasMarker.feature.properties = {};

            let propertiesToSearch: string[] = [mechanic.profile.name, mechanicIcon.uniqueName];

            this.createTranslatableProperty(
                canvasMarker.feature.properties,
                'search',
                propertiesToSearch,
                this.translate
            );

            canvasMarker.properties.locationUniqueName = location.uniqueName;

            canvasMarker.bindTooltip(
                (marker: any) =>
                    this.translate.instant(marker.properties.mechanic.profile.name),
                {
                    sticky: true,
                    className: 'map-tooltip',
                    offset: [0, 50],
                }
            );
            
            canvasMarker.on('click', (e: any) => this.mapService.onMarkerClick(e, this.map, this.container, this.bottomSheet, (container, isPopup)=> this.mapService.createMechanicContent(e.target, container, this.game, this.items, this.mapConfig, this.upgrades, this.upgradeProperties)));
        }


        this.addLayerToMap(L.layerGroup(markers), mechanicIcon.uniqueName, mechanicIcon.ableToSearch);
    }

    private addSmartTerrains(isClearSky: boolean = false) {
        let smartTerrainIcon = {
            name: this.translate.instant('smart-terrains'),
            uniqueName: 'smart-terrains',
            cssClass: 'smart-terrain',
            ableToSearch: true,
            icon: new this.svgIcon({
                iconSize: [4, 4],
                className: 'mark-container stalker-mark-2',
                animate: false,
                iconUrl: '/assets/images/svg/marks/sub-location.svg',
                iconSizeInit: [1, 1],
                iconAnchor: [0, 0],
            }),
            radius: 2,
            keepMapSize: true
        };

        let markers: any[] = [];

        let smartTerrainPaths: L.Polyline[] = [];

        let handledSmartTerrains: string[] = [];

        let defaultIcon = {
            icon: new this.svgIcon({
                iconSize: [4, 4],
                className: 'mark-container stalker-mark-2',
                animate: false,
                iconUrl: '/assets/images/svg/marks/smart_terrain_default.svg',
                iconSizeInit: [1.75, 1.75],
                iconAnchor: [0, 0],
            }),
            radius: 2,
            keepMapSize: true
        }

        let territory = {
            icon: new this.svgIcon({
                iconSize: [4, 4],
                className: 'mark-container stalker-mark-2',
                animate: false,
                iconUrl: '/assets/images/svg/marks/smart_terrain_territory.svg',
                iconSizeInit: [2, 2],
                iconAnchor: [0, 0],
            }),
            radius: 2,
            keepMapSize: true
        };

        let resource = {
            icon: new this.svgIcon({
                iconSize: [4, 4],
                className: 'mark-container stalker-mark-2',
                animate: false,
                iconUrl: '/assets/images/svg/marks/smart_terrain_resource.svg',
                iconSizeInit: [2, 2],
                iconAnchor: [0, 0],
            }),
            radius: 2,
            keepMapSize: true
        }

        let monsters = {
            icon: new this.svgIcon({
                iconSize: [4, 4],
                className: 'mark-container stalker-mark-2',
                animate: false,
                iconUrl: '/assets/images/svg/marks/monsters.svg',
                iconSizeInit: [1, 1],
                iconAnchor: [0, 0],
            }),
            radius: 2,
            keepMapSize: true
        }

        for (let smart of this.gamedata.smartTerrains) {
            let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == smart.locationId) as Location;

            if (location.isUnderground) {
                continue;
            }

            let icon: any = null;

            switch (smart.simType) {
                case "default": {
                    icon = defaultIcon;

                    break;
                }

                case "territory": {
                    icon = territory;

                    break;
                }

                case "resource": {
                    icon = resource;

                    break;
                }

                case "base": {
                    switch (smart.respawnSector) {
                        case 'dolg': {
                            icon = {
                                icon: new this.svgIcon({
                                    iconSize: [4, 4],
                                    className: 'mark-container stalker-mark-3',
                                    animate: false,
                                    iconUrl: '/assets/images/svg/factions/duty.svg',
                                    iconSizeInit: [2, 2],
                                    iconAnchor: [0, 0],
                                }),
                                radius: 2,
                                keepMapSize: true
                            }
                            break;
                        }
                        case 'stalker': {
                            icon = {
                                icon: new this.svgIcon({
                                    iconSize: [4, 4],
                                    className: 'mark-container stalker-mark-3',
                                    animate: false,
                                    iconUrl: '/assets/images/svg/factions/stalkers.svg',
                                    iconSizeInit: [2, 2],
                                    iconAnchor: [0, 0],
                                }),
                                radius: 2,
                                keepMapSize: true
                            }
                            break;
                        }
                        case 'bandit': {
                            icon = {
                                icon: new this.svgIcon({
                                    iconSize: [4, 4],
                                    className: 'mark-container stalker-mark-3',
                                    animate: false,
                                    iconUrl: '/assets/images/svg/factions/bandits.svg',
                                    iconSizeInit: [2, 2],
                                    iconAnchor: [0, 0],
                                }),
                                radius: 2,
                                keepMapSize: true
                            }

                            break;
                        }
                        case 'army': {
                            icon = {
                                icon:  new this.svgIcon({
                                    iconSize: [4, 4],
                                    className: 'mark-container stalker-mark-3',
                                    animate: false,
                                    iconUrl: '/assets/images/svg/factions/military.svg',
                                    iconSizeInit: [2, 2],
                                    iconAnchor: [0, 0],
                                }),
                                radius: 2,
                                keepMapSize: true
                            }

                            break;
                        }
                        default: {
                            if (location.uniqueName == "darkvalley") {
                                icon = {
                                    icon:  new this.svgIcon({
                                        iconSize: [4, 4],
                                        className: 'mark-container stalker-mark-2',
                                        animate: false,
                                        iconUrl: '/assets/images/svg/factions/freedom.svg',
                                        iconSizeInit: [2, 2],
                                        iconAnchor: [0, 0],
                                    }),
                                    radius: 2,
                                    keepMapSize: true
                                }
                            }
                            else if (location.uniqueName == "marsh") {
                                icon = {
                                    icon: new this.svgIcon({
                                        iconSize: [4, 4],
                                        className: 'mark-container stalker-mark-2',
                                        animate: false,
                                        iconUrl: '/assets/images/svg/factions/clear-sky.svg',
                                        iconSizeInit: [2, 2],
                                        iconAnchor: [0, 0],
                                    }),
                                    radius: 2,
                                    keepMapSize: true
                                }
                            }
                            else {
                                icon = monsters
                            }
                            break;
                        }
                    }

                    break;
                }
            }

            let canvasMarker = new this.svgMarker([smart.z, smart.x], {
                icon: icon,
                renderer: this.canvasRenderer,
                radius: icon.radius
            });

            canvasMarker.properties = {};
            canvasMarker.properties.coordinates = { lat: smart.z, lng: smart.x };
            canvasMarker.properties.smart = smart;
            canvasMarker.properties.name = smart.localeName;
            canvasMarker.properties.typeUniqueName = smart.simType;
            markers.push(canvasMarker);

            canvasMarker.properties.ableToSearch = false;
            canvasMarker.feature = {};
            canvasMarker.feature.properties = {};

            let propertiesToSearch: string[] = [smart.localeName];

            this.createTranslatableProperty(
                canvasMarker.feature.properties,
                'search',
                propertiesToSearch,
                this.translate
            );

            if (smart.targets && smart.targets.length > 0) {
                for (let target of smart.targets) {
                    let targetSmart: SmartTerrain = this.gamedata.smartTerrains.find(x => x.name == target) as SmartTerrain;

                    if (target) {
                        let targetLocation: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == targetSmart.locationId) as Location;

                        let notSameLocation = location !== targetLocation;

                        if (targetLocation.isUnderground) {
                            continue;
                        }

                        let latlngs: any[] = [];

                        latlngs.push([smart.z, smart.x]);
                        latlngs.push([targetSmart.z, targetSmart.x]);

                        let color = 'blue';

                        if (targetSmart.targets?.includes(smart.name)) {
                            color = 'red';
                        }

                        if (targetSmart.targets?.includes(smart.name) && handledSmartTerrains.includes(target)) {
                            continue;
                        }

                        if (smart.name == "mil_smart_terrain_2_2" && targetSmart.name == "red_smart_terrain_3_1") {
                            latlngs = [];
                            latlngs.push([smart.z, smart.x]);

                            latlngs.push([1091.7000007629395, 433.02499997615814]);
                            latlngs.push([1194.9500007629395, 428.27499997615814]);
                            latlngs.push([1259.900001525879, 389.7999999523163]);
                            latlngs.push([1261.650001525879, 277.7999999523163]);
                            latlngs.push([1246.150001525879, 271.0499999523163]);
                            latlngs.push([1236.900001525879, 274.2999999523163]);
                            latlngs.push([1230.900001525879, 260.0499999523163]);

                            latlngs.push([targetSmart.z, targetSmart.x]);
                        }

                        var polyline = L.polyline(latlngs, { color: color, weight: 2, dashArray: notSameLocation ? '20, 20' : undefined });

                        if (color == 'blue') {
                            polyline.arrowheads({ size: '20px', fill: true, proportionalToTotal: false });
                            polyline.bringToFront();
                        }

                        smartTerrainPaths.push(polyline);
                    }
                }

                handledSmartTerrains.push(smart.name);
            }

            canvasMarker.properties.locationUniqueName = location.uniqueName;

            canvasMarker.bindTooltip(
                (marker: any) => {
                    return this.translate.instant(smart.localeName);
                },
                {
                    sticky: true,
                    className: 'map-tooltip',
                    offset: [0, 50],
                }
            );
        }

        this.addLayerToMap(L.layerGroup(smartTerrainPaths), 'smart-paths');
        this.addLayerToMap(L.layerGroup(markers), smartTerrainIcon.uniqueName, true);
    }

    private addMonsterLairs() {
        let monstersIcon = {
            name: this.translate.instant('mutants'),
            uniqueName: 'monsters',
            cssClass: 'monsters',
            ableToSearch: true,
            icon: new this.svgIcon({
                iconSize: [4, 4],
                className: 'mark-container stalker-mark-2',
                animate: false,
                iconUrl: '/assets/images/svg/marks/monsters.svg',
                iconSizeInit: [2, 2],
                iconAnchor: [0, 0],
            }),
            radius: 2,
            keepMapSize: true
        };

        let markers: any[] = [];

        for (let lair of this.gamedata.monsterLairs) {
            let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == lair.locationId) as Location;

            if (location.isUnderground) {
                continue;
            }

            let canvasMarker = new this.svgMarker([lair.z, lair.x], {
                icon: monstersIcon,
                renderer: this.canvasRenderer,
                radius: monstersIcon.radius
            });

            canvasMarker.properties = {};
            canvasMarker.properties.lair = lair;
            canvasMarker.properties.coordinates = { lat: lair.z, lng: lair.x };
            canvasMarker.properties.name = 'mutants-lair';
            canvasMarker.properties.typeUniqueName = 'monsters';

            markers.push(canvasMarker);
            canvasMarker.properties.ableToSearch = false;
            canvasMarker.feature = {};
            canvasMarker.feature.properties = {};

            canvasMarker.properties.locationUniqueName = location.uniqueName;

            canvasMarker.bindTooltip(
                (marker: any) =>
                    this.translate.instant(marker.properties.name),
                {
                    sticky: true,
                    className: 'map-tooltip',
                    offset: [0, 50],
                }
            );
        }

        this.addLayerToMap(L.layerGroup(markers), monstersIcon.uniqueName);
    }

    private addLevelChangers() {
        let levelChangerIcon, undergroundDoorIcon, rostokIcon, levelChangerDirection: any[];
        [levelChangerIcon, undergroundDoorIcon, rostokIcon, levelChangerDirection] = this.getLevelChangerIcons();

        let markers: any[] = [];

        for (let levelChanger of this.gamedata.levelChangers) {
            let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == levelChanger.locationId) as Location;

            if (location.isUnderground) {
                continue;
            }

            let destLocation: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == levelChanger.destinationLocationId) as Location;

            let markerIcon = null;

            if (destLocation.isUnderground) {
                markerIcon = undergroundDoorIcon;
            }
            else if (levelChanger.direction == "level_changer_rostok") {
                markerIcon = rostokIcon;
            }
            else {
                markerIcon = levelChangerDirection.find(x => x.name == levelChanger.direction);

                if (!markerIcon) {
                    markerIcon = levelChangerIcon;
                }
            }

            let canvasMarker = new this.svgMarker([levelChanger.z, levelChanger.x], {
                icon: markerIcon,
                renderer: this.canvasRenderer,
                radius: markerIcon.radius
            });

            canvasMarker.properties = {};
            canvasMarker.properties.coordinates = { lat: levelChanger.z, lng: levelChanger.x };
            canvasMarker.properties.levelChanger = levelChanger;
            canvasMarker.properties.name = levelChanger.locale ? levelChanger.locale : 'level-changer';
            canvasMarker.properties.typeUniqueName = 'level-changers';

            markers.push(canvasMarker);
            canvasMarker.properties.ableToSearch = false;
            canvasMarker.feature = {};
            canvasMarker.feature.properties = {};
            canvasMarker.isUnderground = true;

            canvasMarker.properties.locationUniqueName = location.uniqueName;
            canvasMarker.properties.destination = destLocation.uniqueName;

            canvasMarker.bindTooltip(
                (marker: any) =>
                    this.translate.instant(marker.properties.name),
                {
                    sticky: true,
                    className: 'map-tooltip',
                    offset: [0, 50],
                }
            );

            if (destLocation.isUnderground) {
                canvasMarker.on('click', (e: any) => this.handleUndergroundDoorClick(e));
            }
        }

        this.addLayerToMap(L.layerGroup(markers), levelChangerIcon.uniqueName);
    }

    private handleUndergroundDoorClick(e: any): void {
        if (!NgZone.isInAngularZone()) {
            this.ngZone.run(() => this.handleUndergroundDoorClick(e));
            return;
        }

        const marker = e.target;
        const destinationLocation = this.gamedata.locations.find(
            (x) => x.id == marker.properties.levelChanger.destinationLocationId
        ) as Location;

        if (this.openedUndergroundPopup?.component.location.id == destinationLocation.id) {
            if (marker.properties.markerToSearch) {
                this.openedUndergroundPopup.component.markerToSearch = new MarkerToSearch();
                this.openedUndergroundPopup.component.markerToSearch.lat = marker.properties.markerToSearch.lat;
                this.openedUndergroundPopup.component.markerToSearch.lng = marker.properties.markerToSearch.lng;
                this.openedUndergroundPopup.component.markerToSearch.type = marker.properties.markerToSearch.type
                    ? marker.properties.markerToSearch.type
                    : marker.properties.markerToSearch.layer.properties.typeUniqueName;
                marker.properties.markerToSearch = undefined;
                this.openedUndergroundPopup.component.goToMarker();
                return;
            }

            this.mapService.setActivePopupLatLng(marker.getLatLng());
            return;
        }

        this.mapService.onMarkerClick(
            e,
            this.map,
            this.container,
            this.bottomSheet,
            (container) => this.mapService.createUndergroundContent(
                marker,
                container,
                this,
                this.gamedata,
                this.items,
                this.game,
                this.mapConfig,
                this.lootBoxConfig
            ),
            {
                closeOnClick: false,
                autoClose: false,
            }
        );
    }

    private addHiddenMarkers(markersToHide: any[]): void {
        const hiddenLayer = L.layerGroup(markersToHide);

        (hiddenLayer as any).onAdd = function (map: any) {
            L.LayerGroup.prototype.onAdd.call(this, map);

            this.eachLayer(function (layer: any) {
                layer.setOpacity(0.5);
            });
        };

        this.addLayerToMap(hiddenLayer, MapComponent.hiddenLayerName);
    }

    private addRoads() {
        let roads: any[] = [];

        for (let road of this.gamedata.roads) {
            var polyline = L.polyline(road.points.map(x => {
                let geo: any = {};
                geo.lng = x.x;
                geo.lat = x.z;
                return geo;
            }), { color: 'grey', weight: 2, renderer: this.canvasRenderer, interactive: false });
            roads.push(polyline);
        }

        this.addLayerToMap(L.layerGroup(roads), 'roads');
    }

    private addLayerToMap(layer: L.LayerGroup, name: string, ableToSearch: boolean = false): void {
        const stalkerLayer = asStalkerLayerGroup(layer);
        stalkerLayer.ableToSearch = ableToSearch;
        stalkerLayer.name = name;

        this.layers.push(stalkerLayer);
    }

    public getMarkTypes(): any[] {
        return [
            {
                id: 0,
                ableToSearch: !0,
                name: 'none',
            },
            {
                id: 1,
                ableToSearch: !0,
                name: this.translate.instant('sub-location'),
                uniqueName: 'sub-location',
                markName: 'sub-location',
                icon: new this.svgIcon({
                    iconSizeInit: [4, 4],
                    className: 'mark-container stalker-mark-4',
                    animate: !1,
                    iconUrl: '/assets/images/svg/marks/sub-location.svg',
                    iconAnchor: [0, 0],
                }),
                radius: 4,
                keepMapSize: true
            },
            {
                id: 100,
                name: this.translate.instant('acidic'),
                uniqueName: 'acidic',
                markName: 'acidic',
                icon: new this.svgIcon({
                    iconSizeInit: [2, 2],
                    className: 'mark-container stalker-mark-2',
                    animate: !1,
                    iconUrl: '/assets/images/svg/marks/chemical.svg',
                    iconAnchor: [0, 0],
                }),
                radius: 1.5,
                keepMapSize: true
            },
            {
                id: 101,
                name: this.translate.instant('psychic'),
                uniqueName: 'psychic',
                markName: 'psychic',
                icon: new this.svgIcon({
                    iconSizeInit: [2, 2],
                    className: 'mark-container stalker-mark-2',
                    animate: !1,
                    iconUrl: '/assets/images/svg/marks/psi.svg',
                    iconAnchor: [0, 0],
                }),
                radius: 1.5,
                keepMapSize: true
            },
            {
                id: 102,
                name: this.translate.instant('radioactive'),
                uniqueName: 'radioactive',
                markName: 'st_name_radioactive_contamination',
                icon: new this.svgIcon({
                    iconSizeInit: [2, 2],
                    className: 'mark-container stalker-mark-2',
                    animate: !1,
                    iconUrl: '/assets/images/svg/marks/radiation.svg',
                    iconAnchor: [0, 0],
                }),
                radius: 1.5,
                keepMapSize: true
            },
            {
                id: 103,
                name: this.translate.instant('thermal'),
                uniqueName: 'thermal',
                markName: 'thermal_zone',
                icon: new this.svgIcon({
                    iconSizeInit: [2, 2],
                    className: 'mark-container stalker-mark-2',
                    animate: !1,
                    iconUrl: '/assets/images/svg/marks/fire.svg',
                    iconAnchor: [0, 0],
                }),
                radius: 1.5,
                keepMapSize: true
            },
            {
                id: 104,
                name: this.translate.instant('electro'),
                uniqueName: 'electro',
                markName: 'electro_zone',
                icon: new this.svgIcon({
                    iconSizeInit: [2, 2],
                    className: 'mark-container stalker-mark-2',
                    animate: !1,
                    iconUrl: '/assets/images/svg/marks/electro.svg',
                    iconAnchor: [0, 0],
                }),
                radius: 1.5,
                keepMapSize: true
            },
            {
                id: 200,
                name: this.translate.instant('teleport'),
                uniqueName: 'teleport',
                markName: 'st_name_teleport',
                icon: new this.svgIcon({
                    iconSizeInit: [2, 2],
                    className: 'mark-container stalker-mark-2',
                    animate: !1,
                    iconUrl: '/assets/images/svg/marks/portal.svg',
                    iconAnchor: [0, 0],
                }),
                radius: 1.5,
                keepMapSize: true
            },
            {
                id: 201,
                name: this.translate.instant('mines'),
                uniqueName: 'mines',
                markName: 'mines',
                icon: new this.svgIcon({
                    iconSizeInit: [1.5, 1.5],
                    className: 'mark-container stalker-mark-1.5',
                    animate: !1,
                    iconUrl: '/assets/images/svg/marks/mines.svg',
                    iconAnchor: [0, 0],
                }),
                radius: 1.5,
                keepMapSize: true
            },
        ];
    }

    public getStuffTypes(): any[] {
        return [
            {
                id: 0,
                ableToSearch: !0,
                itemableToSearch: !0,
                name: this.translate.instant('stash'),
                uniqueName: 'stash',
                icon: new this.svgIcon({
                    iconSizeInit: [1, 1],
                    className: 'mark-container stalker-mark',
                    animate: !1,
                    iconUrl: '/assets/images/svg/marks/stash.svg',
                    iconAnchor: [0, 0],
                }),
                keepMapSize: true,
                radius: 1
            },
            {
                id: 1,
                ableToSearch: !0,
                itemableToSearch: !0,
                name: this.translate.instant('quest'),
                uniqueName: 'quest',
                icon: new this.svgIcon({
                    iconSizeInit: [1, 1],
                    className: 'mark-container stalker-mark',
                    animate: !1,
                    iconUrl: '/assets/images/svg/marks/quest-item.svg',
                    iconAnchor: [0, 0],
                }),
                keepMapSize: true,
                radius: 1
            },
            {
                id: 3,
                ableToSearch: !0,
                itemableToSearch: !0,
                name: this.translate.instant('stuff'),
                uniqueName: 'stuff',
                icon: new this.svgIcon({
                    iconSizeInit: [1, 1],
                    className: 'mark-container stalker-mark',
                    animate: !1,
                    iconUrl: '/assets/images/svg/marks/stuff.svg',
                    iconAnchor: [0, 0],
                }),
                keepMapSize: true,
                radius: 1
            },
        ];
    }

    public getLootBoxIcon(): any {
        let icon =
        {
            id: 2,
            ableToSearch: false,
            itemableToSearch: false,
            name: this.translate.instant('destroyable-box'),
            uniqueName: 'destroyable-box',
            icon: new this.svgIcon({
                iconSizeInit: [1, 1],
                className: 'mark-container stalker-mark',
                animate: !1,
                iconUrl: '/assets/images/svg/marks/items.svg',
                iconAnchor: [0, 0],
            }),
            keepMapSize: true,
            radius: 1
        };

        return icon;
    }

    public getStalkersIcon(): any[] {
        let stalkerIcon = {
            name: this.translate.instant('stalkers-layer'),
            uniqueName: 'stalkers',
            cssClass: 'stalkers',
            ableToSearch: true,
            icon: new this.svgIcon({
                iconSize: [4, 4],
                className: 'mark-container stalker-mark-1.5',
                animate: false,
                iconUrl: '/assets/images/svg/marks/character.svg',
                iconSizeInit: [1, 1],
                iconAnchor: [0, 0],
            }),
            radius: 1.5,
            keepMapSize: true
        };

        let stalkerIconDead = {
            name: this.translate.instant('stalkers-layer'),
            uniqueName: 'stalkers',
            cssClass: 'stalkers',
            ableToSearch: true,
            icon: new this.svgIcon({
                iconSize: [4, 4],
                className: 'mark-container stalker-mark-1.5',
                animate: false,
                iconUrl: '/assets/images/svg/marks/character_dead.svg',
                iconSizeInit: [1, 1],
                iconAnchor: [0, 0],
            }),
            radius: 1.5,
            keepMapSize: true
        };

        let stalkerIconQuestItem = {
            name: this.translate.instant('stalkers-layer'),
            uniqueName: 'stalkers',
            cssClass: 'stalkers',
            ableToSearch: true,
            icon: new this.svgIcon({
                iconSize: [4, 4],
                className: 'mark-container stalker-mark-1.5',
                animate: false,
                iconUrl: '/assets/images/svg/marks/character_quest.svg',
                iconSizeInit: [1, 1],
                iconAnchor: [0, 0],
            }),
            radius: 1.5,
            keepMapSize: true
        };

        return [stalkerIcon, stalkerIconDead, stalkerIconQuestItem];
    }

    public getAnomaliesIcons(): any[] {

        let anomalyZoneIcon = {
            name: this.translate.instant('anomaly-zone'),
            uniqueName: 'anomaly-zone',
            cssClass: 'anomaly-zone',
            ableToSearch: true,
            icon: new this.svgIcon({
                iconSize: [4, 4],
                className: 'mark-container stalker-mark-2',
                animate: false,
                iconUrl: '/assets/images/svg/marks/anomaly.svg',
                iconSizeInit: [2, 2],
                iconAnchor: [0, 0],
            }),
            radius: 2,
            keepMapSize: true
        };

        let anomalyZoneNoArtIcon = {
            name: this.translate.instant('anomaly-zone-no-art'),
            uniqueName: 'anomaly-zone-no-art',
            icon: new this.svgIcon({
                iconSize: [12.5, 12.5],
                className: 'mark-container stalker-mark',
                animate: false,
                iconUrl: '/assets/images/svg/marks/anomaly_noart.svg',
                iconSizeInit: [1, 1],
                iconAnchor: [0, 0],
            }),
            radius: 1,
            keepMapSize: true
        };

        return [anomalyZoneIcon, anomalyZoneNoArtIcon];
    }

    public getLevelChangerIcons(): any[] {
        let levelChangerIcon = {
            name: this.translate.instant('level-changers'),
            uniqueName: 'level-changers',
            cssClass: 'level-changers',
            ableToSearch: true,
            icon: new this.svgIcon({
                iconSize: [4, 4],
                className: 'mark-container stalker-mark-2',
                animate: false,
                iconUrl: '/assets/images/svg/marks/level_changers/level_changer_up.svg',
                iconSizeInit: [2, 2],
                iconAnchor: [0, 0],
            }),
            radius: 2,
            keepMapSize: true
        };

        let undergroundDoorIcon = {
            name: this.translate.instant('level-changers'),
            uniqueName: 'level-changers',
            cssClass: 'level-changers',
            ableToSearch: true,
            icon: new this.svgIcon({
                iconSize: [4, 4],
                className: 'mark-container stalker-mark-2',
                animate: false,
                iconUrl: '/assets/images/svg/marks/level_changers/underground_2.svg',
                iconSizeInit: [1.5, 1.5],
                iconAnchor: [0, 0],
            }),
            radius: 2,
            keepMapSize: true
        }

        let rostokIcon = {
            name: this.translate.instant('level-changers'),
            uniqueName: 'level-changers',
            cssClass: 'level-changers',
            ableToSearch: true,
            icon: new this.svgIcon({
                iconSize: [4, 4],
                className: 'mark-container stalker-mark-2',
                animate: false,
                iconUrl: '/assets/images/svg/marks/level_changers/level_changer_rostok.svg',
                iconSizeInit: [4, 2],
                iconAnchor: [0, 0],
            }),
            radius: 2,
            keepMapSize: true
        } 

        let levelChangerDirection: { name: string, icon: any, radius: number, keepMapSize: boolean }[] = [];

        let directions: string[] =
            [
                "level_changer_down",
                "level_changer_down_left",
                "level_changer_down_right",
                "level_changer_left",
                "level_changer_left_up",
                "level_changer_right",
                "level_changer_up",
                "level_changer_up_right",
            ];

        for (let src of directions) {
            levelChangerDirection.push(
                {
                    name: src,
                    icon: new this.svgIcon({
                        iconSize: [4, 4],
                        className: 'mark-container stalker-mark-2',
                        animate: false,
                        iconUrl: `/assets/images/svg/marks/level_changers/${src}.svg`,
                        iconSizeInit: [2, 2],
                        iconAnchor: [0, 0],
                    }),
                    radius: 2,
                    keepMapSize: true
                }
            )
        }

        return [levelChangerIcon, undergroundDoorIcon, rostokIcon, levelChangerDirection];
    }
}
