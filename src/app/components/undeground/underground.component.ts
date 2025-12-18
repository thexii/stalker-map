import { NgClass } from "@angular/common";
import { Component, Input, ViewChild, ViewContainerRef } from "@angular/core";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { Map } from '../../models/map.model';
import { Location } from '../../models/location.model';
import { StuffModel } from "../../models/stuff";
import { Item } from "../../models/item.model";
import { Point } from "../../models/point.model";
import { MapConfig } from "../../models/gamedata/map-config";
import { LootBoxConfig } from "../../models/loot-box/loot-box-config.model";
import { UndergroundLevelsConfig } from "../../models/underground-levels-config.model";
import { MarkerToSearch } from "../../models/marker-to-search.model";
import { MapComponent } from "../map/map.component";
import { HiddenMarker } from "../../models/hidden-marker.model";
import { MapService } from "../../services/map.service";

declare const L: any;
declare var markWidthUnderground: number;

@Component({
    selector: 'app-underground',
    standalone: true,
    templateUrl: './underground.component.html',
    styleUrl: './underground.component.scss',
    imports: [TranslateModule, NgClass]
})

export class UndergroundComponent {
    @ViewChild('dynamicComponents', { read: ViewContainerRef })
    container: ViewContainerRef;

    @Input() public location: Location;
    @Input() public gamedata: Map;
    @Input() public items: Item[];
    @Input() public game: { gameStyle: string, uniqueName: string };
    @Input() public mapConfig: MapConfig;
    @Input() public lootBoxConfig: LootBoxConfig;
    @Input() public markerToSearch: MarkerToSearch;
    @Input() public mapComponent: MapComponent;

    private map: any;
    private canvasLayer: any;

    private layers: any[] = [];
    private xShift: number = 0;
    private zShift: number = 0;
    private markWidthFactor: number = 3;
    private canvasRenderer: any;

    public undergroundConfig: UndergroundLevelsConfig;
    public selectedLevel: string;
    public currentLevelImageOverlay: any;
    protected layerContoller: any;

    constructor(
        private translate: TranslateService,
        private mapService: MapService) { }

    public test(event: any): void {
        this.setLayer(event.target.value);
    }

    public setLayer(newLyaer: string): void {
        if (this.selectedLevel == newLyaer) {
            return;
        }

        this.currentLevelImageOverlay.remove();
        this.selectedLevel = newLyaer;

        this.addLocation();
    }

    public goToMarker(): void {
        let layer = this.layers.find(x => x.name == this.markerToSearch.type);

        if (layer) {
            let sLat = this.markerToSearch.lat + this.zShift;
            let sLng = this.markerToSearch.lng + this.xShift;

            for (let marker of Object.values(layer._layers) as any[]) {
                if (marker._latlng.lat == sLat && marker._latlng.lng == sLng) {

                    this.fireSearchedMarker(marker);

                    break;
                }
            }
        }
    }

    public hideMarker(markerToHide: HiddenMarker): void {
        let marker: any;

        let hiddenLayer: any = this.layers.find(x => x.name == MapComponent.hiddenLayerName);
        let markerLayer: any = this.layers.find(x => x.name == markerToHide.layerName);

        let under = this;

        markerLayer.eachLayer(function (layer: any) {
            if (layer.properties.coordinates.lat == markerToHide.lat && layer.properties.coordinates.lng == markerToHide.lng) {
                marker = layer;
            }
        });

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

    public unhideMarker(markerToShow: HiddenMarker): void {
        let marker: any;

        let hiddenLayer: any = this.layers.find(x => x.name == MapComponent.hiddenLayerName);
        let markerLayer: any = this.layers.find(x => x.name == markerToShow.layerName);

        let under = this;

        hiddenLayer.eachLayer(function (layer: any) {
            if (layer.properties.coordinates.lat == markerToShow.lat && layer.properties.coordinates.lng == markerToShow.lng) {
                marker = layer;
            }
        });

        if (marker) {
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
        else {
            console.error('Cant find marker to show!')
        }
    }

    private async ngOnInit(): Promise<void> {
        let minZoom = 1;
        let maxZoom = 3;
        let zoom = 1.5;
        let scaleFactor = 1.5;

        this.canvasRenderer = this.mapService.getCanvasRenderer();

        switch (this.location.uniqueName) {
            case "l03u_agr_underground": {
                this.xShift = 136.842;
                this.zShift = 147.089;
                break;
            }
            case "l08u_brainlab": {
                this.xShift = 146.401;
                this.zShift = 41.508;
                break;
            }
            case "l04u_labx18": {
                this.xShift = 51.046;
                this.zShift = 37.991;
                break;
            }
            case "agroprom_underground": {
                this.xShift = 16.294;
                this.zShift = 220.231;
                break;
            }
            case "jupiter_underground": {
                this.xShift = 391.152;
                this.zShift = 264.704;
                minZoom = 0;
                maxZoom = 2;
                zoom = 1;
                scaleFactor = 4;
                break;
            }
            case "labx8": {
                this.xShift = 121.657;
                this.zShift = -44.509;
                break;
            }
            case "l10u_bunker": {
                this.xShift = 67.5;
                this.zShift = 89.6;
                break;
            }
            case "l12u_control_monolith": {
                this.xShift = 43.796768;
                this.zShift = 44.2057;
                break;
            }
            case "l12u_sarcofag": {
                this.xShift = 34.9166755676;
                this.zShift = 43.0416660309;
                break;
            }
        }

        this.map = L.map('underground-map', {
            center: [this.location.heightInMeters / 2, this.location.widthInMeters / 2],
            zoom: zoom,
            minZoom: minZoom,
            maxZoom: maxZoom,
            crs: L.CRS.Simple,
            markerZoomAnimation: !0,
            zoomAnimation: !0,
            zoomControl: !1
        });

        this.map.scaleFactor = scaleFactor;

        let bounds = [
            [0, 0],
            [this.location.heightInMeters, this.location.widthInMeters],
        ];

        markWidthUnderground = this.markWidthFactor * Math.pow(2, this.map.getZoom());

        this.map.on('zoomend', () => {
            markWidthUnderground = this.markWidthFactor * Math.pow(2, this.map.getZoom());
            document.documentElement.style.setProperty(
                `--map-mark-width-underground`,
                `${markWidthUnderground}px`);
        });

        let printClickCoordinates = true;

        if (printClickCoordinates) {
            let tempMap = this.map;

            /*this.map.on('click', function (ev: any) {
              var latlng = tempMap.mouseEventToLatLng(ev.originalEvent);
              console.log(`[${latlng.lat}, ${latlng.lng}]`);
            });*/
        }

        this.undergroundConfig = this.mapConfig.undergroundLevelsConfig?.find(x => x.name == this.location.uniqueName) as UndergroundLevelsConfig;

        if (this.undergroundConfig == null) {
            this.selectedLevel = `map_${this.location.uniqueName}`;
        }
        else {
            this.selectedLevel = this.undergroundConfig.baseLevel;
        }

        let markersToHide: any[] = [];

        this.addLocation();

        this.addMarks();

        let hiddenstuffs = this.addStuffs();

        if (hiddenstuffs.length > 0) {
            markersToHide.push(...hiddenstuffs);
        }

        this.addLootBoxes();

        this.addAnomalyZones();

        this.addStalkers();

        this.addHiddenMarkers(markersToHide);

        if (
            this.mapConfig.markersConfig != null &&
            this.mapConfig.markersConfig.length > 0 &&
            this.layers.length > 0) {
            let newLayers: any[] = [];
            for (let config of this.mapConfig.markersConfig) {
                if (this.layers.some((y) => y.name == config.uniqueName)) {
                    let currentLayer = this.layers.filter(
                        (D) => D.name == config.uniqueName)[0];
                    newLayers.push(currentLayer);

                    if (config.isShowByDefault) {
                        currentLayer.addTo(this.map);
                    }
                }
            }

            this.layers = newLayers;
        }

        let layersToControl = this.layers.map(x => [this.translate.instant(x.name), x]);
        this.layerContoller = L.control.customLayers(null, Object.fromEntries(layersToControl));
        this.layerContoller.searchName = "underground";
        this.layerContoller.isUnderground = true;
        this.layerContoller.addTo(this.map)

        if (this.markerToSearch) {
            this.goToMarker();
        }

        let ruler = this.addRuler();

        this.translate.onLangChange.subscribe(i => {
            let layersToControl = this.layers.map(x => [this.translate.instant(x.name), x]);

            this.layerContoller.remove();
            let addRuler = false;

            if (ruler) {
                ruler.remove();
                addRuler = true;
            }

            this.layerContoller = L.control.customLayers(null, Object.fromEntries(layersToControl));
            this.layerContoller.searchName = "layerControl";
            this.layerContoller.isUnderground = true;
            this.layerContoller.addTo(this.map)

            if (addRuler) {
                ruler = this.addRuler();
            }

            //this.createSearchController();
        });
    }



    private addRuler(): any {
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
        ruler.addTo(this.map);

        return ruler;
    }

    private fireSearchedMarker(marker: any): void {
        setTimeout(() => {
            if (this.container == null) {
                this.fireSearchedMarker(marker);
            }
            else {
                marker.openPopup();
            }
        }, 250);
    }

    private addLocation() {
        let locationImage = `/assets/images/maps/${this.gamedata.uniqueName}/${this.selectedLevel}.png`;

        let locationBounds = [
            [0, 0],
            [this.location.heightInMeters, this.location.widthInMeters],
        ];

        this.currentLevelImageOverlay = L.imageOverlay(locationImage, locationBounds, {
            interactive: !0,
            className: 'location-on-map',
        });

        this.currentLevelImageOverlay.addTo(this.map);
    }

    private setLevelOverlay(): void {

    }

    private addMarks() {
        let markTypes = this.mapComponent.getMarkTypes();

        this.gamedata.marks = this.gamedata.marks.sort(
            (c: { typeId: number }, l: { typeId: number }) => c.typeId - l.typeId
        );
        for (let markType of markTypes) {
            let marks = this.gamedata.marks.filter(
                (u: any) => u.locationId == this.location.id && u.typeId == markType.id
            );

            if (marks.length > 0) {
                let markers: any[] = [];

                for (let mark of marks.filter(x => x.locationId == this.location.id)) {
                    let marker = new this.mapComponent.svgMarker([mark.z + this.zShift, mark.x + this.xShift], {
                        icon: markType,
                        renderer: this.canvasRenderer,
                        radius: markType.radius
                    });

                    marker.properties = {};
                    marker.properties.coordinates = { lat: mark.z, lng: mark.x };
                    marker.properties.name = mark.name ? mark.name : markType.markName;
                    marker.properties.description = mark.description;
                    marker.properties.markType = markType.name;
                    marker.properties.typeUniqueName = markType.uniqueName;
                    marker.properties.ableToSearch = markType.ableToSearch;

                    if (marker.properties.ableToSearch) {
                        let p = [];

                        p.push(marker.properties.name);

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

                        this.createProperty(
                            marker.feature.properties,
                            'search',
                            p,
                            this.translate
                        );

                        marker.properties.locationUniqueName = this.location.uniqueName;
                    }

                    marker.bindTooltip(
                        (marker: any) => this.translate.instant(marker.properties.name),
                        {
                            sticky: true,
                            className: 'map-tooltip',
                            offset: [0, 50],
                        }
                    );
                    markers.push(marker);
                }

                this.addLayerToMap(L.layerGroup(markers), markType.uniqueName, markType.ableToSearch);
            }
        }
    }

    private addStuffs(): any[] {
        let stuffTypes = this.mapComponent.getStuffTypes();
        let markersToHide: any[] = [];

        this.gamedata.stuffs = this.gamedata.stuffs.sort(
            (c: StuffModel, l: StuffModel) => c.typeId - l.typeId
        );

        let ignoredNames: string[] = ['stuff_at_location'];

        let buggedStrings = [];

        for (let markType of stuffTypes) {
            let hiddenMarkers = this.mapService.getAllHiddenMarkers().filter(x => x.layerName == markType.uniqueName);
            let stuffsAtLocation = this.gamedata.stuffs.filter(
                (u: StuffModel) => u.locationId == this.location.id && u.typeId == markType.id
            );

            if (stuffsAtLocation.length > 0) {
                let markers: any[] = [];

                for (let stuffModel of stuffsAtLocation) {
                    let stuff = new this.mapComponent.svgMarker([stuffModel.z + this.zShift, stuffModel.x + this.xShift], {
                        icon: markType,
                        renderer: this.canvasRenderer,
                        radius: markType.radius
                    });

                    stuff.properties = {};
                    stuff.properties.coordinates = { lat: stuffModel.z, lng: stuffModel.x };
                    stuff.properties.stuff = stuffModel;
                    stuff.properties.markType = markType.name;
                    stuff.properties.typeUniqueName = markType.uniqueName;
                    stuff.properties.ableToSearch = markType.ableToSearch;

                    if (stuff.properties.ableToSearch) {
                        let localesToFind = [];

                        if (stuff.properties.stuff.name && !ignoredNames.includes(stuff.properties.stuff.name)) {
                            localesToFind.push(stuff.properties.stuff.name);
                        }

                        if (stuff.properties.description) {
                            localesToFind.push(stuff.properties.stuff.description);
                        }

                        if (stuff.properties.stuff.items?.length > 0) {
                            localesToFind.push(...stuff.properties.stuff.items.map((x: { uniqueName: string; }) => {
                                return this.items.find(y => y.uniqueName == x.uniqueName)?.localeName;
                            }));
                        }

                        stuff.feature = {};
                        stuff.feature.properties = {};

                        if (localesToFind.length > 0) {
                            let bugged = localesToFind.filter(x => this.translate.instant(x) == x)

                            if (bugged.length > 0) {
                                buggedStrings.push(...bugged);
                            }
                        }
                    }

                    stuff.bindTooltip((p: any) => this.mapService.createStuffTooltip(p), {
                        sticky: true,
                        className: 'map-tooltip',
                        offset: new Point(0, 50),
                    });
                    stuff.bindPopup((p: any) => this.mapService.createStashPopup(p, this.container, this.game, this.items, true));

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

        return markersToHide;
    }

    private addStalkers() {
        let stalkerIcon, stalkerIconDead, stalkerIconQuestItem;
        [stalkerIcon, stalkerIconDead, stalkerIconQuestItem] = this.mapComponent.getStalkersIcon();

        let markers: any[] = [];

        for (let stalker of this.gamedata.stalkers.filter(x => x.locationId == this.location.id)) {
            let icon = stalker.alive ? (stalker.hasUniqueItem ? stalkerIconQuestItem : stalkerIcon) : stalkerIconDead;

            let canvasMarker = new this.mapComponent.svgMarker([stalker.z + this.zShift, stalker.x + this.xShift], {
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

            let propertiesToSearch: string[] = [stalker.profile.name];

            if (stalker.hasUniqueItem) {
                for (let inv of stalker.inventoryItems) {
                    let item = this.items.find(y => y.uniqueName == inv.uniqueName) as Item;
                    propertiesToSearch.push(item.localeName);
                }
            }

            this.createProperty(
                canvasMarker.feature.properties,
                'search',
                propertiesToSearch,
                this.translate
            );

            canvasMarker.bindTooltip(
                (marker: any) =>
                    this.translate.instant(marker.properties.stalker.profile.name),
                {
                    sticky: true,
                    className: 'map-tooltip',
                    offset: [0, 50],
                }
            );

            canvasMarker
                .bindPopup(
                    (stalker: any) =>
                        this.mapService.createStalkerPopup(stalker, this.container, this.game, this.items, this.mapConfig, true),
                    { maxWidth: 500 }
                )
                .openPopup();
        }

        if (markers.length > 0) {
            this.addLayerToMap(L.layerGroup(markers), stalkerIcon.uniqueName, stalkerIcon.ableToSearch);
        }
    }

    private addHiddenMarkers(markersToHide: any[]): void {
        let hiddenLayer = L.layerGroup(markersToHide);

        hiddenLayer.onAdd = function (map: any) {
            L.LayerGroup.prototype.onAdd.call(this, map);

            this.eachLayer(function (layer: any) {
                layer.setOpacity(0.5);
            });
        }

        this.addLayerToMap(hiddenLayer, MapComponent.hiddenLayerName);
    }

    private addLootBoxes() {
        let lootBoxType = this.mapComponent.getLootBoxIcon();

        let markers: any[] = [];

        for (let lootBox of this.gamedata.lootBoxes.filter(x => x.locationId == this.location.id)) {
            let lootBoxMarker = new this.mapComponent.svgMarker([lootBox.z + this.zShift, lootBox.x + this.xShift], {
                icon: lootBoxType,
                renderer: this.canvasRenderer,
                radius: lootBoxType.radius
            });

            //stuffModel.z + this.zShift, stuffModel.x + this.xShift

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

                lootBoxMarker.feature = {
                    properties: {
                        search: p.join(', '),
                    },
                };

                this.createProperty(
                    lootBoxMarker.feature.properties,
                    'search',
                    p,
                    this.translate
                );
            }

            lootBoxMarker.bindTooltip(
                (lootBoxMarker: any) => this.translate.instant(lootBoxMarker.properties.name),
                {
                    sticky: true,
                    className: 'map-tooltip',
                    offset: [0, 50],
                }
            );
            lootBoxMarker.bindPopup((p: any) => this.mapService.createLootBoxPopup(p, this.container, this.game, this.items, this.gamedata.locations, this.lootBoxConfig, true), {
                minWidth: 300,
            }).openPopup(),
                markers.push(lootBoxMarker);
        }

        if (markers.length > 0) {
            this.addLayerToMap(L.layerGroup(markers), lootBoxType.uniqueName, lootBoxType.ableToSearch);
        }
    }

    private addLevelChangers() {
        let levelChangerIcon, undergroundDoorIcon, rostokIcon, levelChangerDirection: any[];
        [levelChangerIcon, undergroundDoorIcon, rostokIcon, levelChangerDirection] = this.mapComponent.getLevelChangerIcons();

        let markers: any[] = [];

        for (let levelChanger of this.gamedata.levelChangers.filter(x => x.locationId == this.location.id)) {
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

            let canvasMarker = new this.mapComponent.svgMarker([levelChanger.z + this.zShift, levelChanger.x + this.xShift], {
                icon: markerIcon,
                renderer: this.canvasRenderer,
                radius: markerIcon.radius
            });

            canvasMarker.properties = {};
            canvasMarker.properties.levelChanger = levelChanger;
            canvasMarker.properties.name = levelChanger.locale ? levelChanger.locale : 'level-changer';
            canvasMarker.properties.typeUniqueName = 'level-changers';

            markers.push(canvasMarker);
            canvasMarker.properties.ableToSearch = false;
            canvasMarker.feature = {};
            canvasMarker.feature.properties = {};
            canvasMarker.isUnderground = true;

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
        }

        this.addLayerToMap(L.layerGroup(markers), levelChangerIcon.uniqueName);
    }

    private addAnomalyZones(): void {
        let anomalyZoneIcon, anomalyZoneNoArtIcon;
        [anomalyZoneIcon, anomalyZoneNoArtIcon] = this.mapComponent.getAnomaliesIcons();

        let anomalies: any[] = [];
        let anomaliesNoArt: any[] = [];
        let artefactWays: any[] = [];

        for (let zone of this.gamedata.anomalyZones.filter(x => x.locationId == this.location.id)) {

            const defaultType: string = 'anomaly-zone';

            let canvasMarker;

            let hasArtefacts = zone.anomaliySpawnSections != null && zone.anomaliySpawnSections.length > 0;
            let icon = hasArtefacts ? anomalyZoneIcon : anomalyZoneNoArtIcon;

            canvasMarker = new this.mapComponent.svgMarker([zone.z + this.zShift, zone.x + this.xShift], {
                icon: icon,
                renderer: this.canvasRenderer,
                radius: icon.radius
            });

            canvasMarker.properties = {};
            canvasMarker.properties.coordinates = { lat: zone.z, lng: zone.x };
            canvasMarker.properties.zoneModel = zone;

            if (
                zone.anomaliySpawnSections != null &&
                zone.anomaliySpawnSections.length > 0
            ) {
                canvasMarker.properties.anomaliySpawnSections =
                    zone.anomaliySpawnSections;
                canvasMarker.properties.markType = anomalyZoneIcon.cssClass;
                canvasMarker.properties.ableToSearch = true;
                canvasMarker.properties.typeUniqueName = defaultType;
                canvasMarker.properties.name = zone.name ? zone.name : defaultType;

                anomalies.push(canvasMarker);

                if (location) {
                    canvasMarker.properties.locationUniqueName = this.location.uniqueName;
                    canvasMarker.properties.locationName = this.location.uniqueName;
                }
            } else {
                anomaliesNoArt.push(canvasMarker);
                canvasMarker.properties.ableToSearch = false;
                canvasMarker.properties.name = zone.name ? zone.name : 'st_name_anomal_zone';
            }

            canvasMarker.properties.zoneModel.name = canvasMarker.properties.name;

            canvasMarker.bindTooltip(
                (zone: any) => {
                    return this.mapService.createAnomalyZoneTooltip(zone);
                },
                { sticky: true, className: 'map-tooltip', offset: new Point(0, 50) }
            );
            canvasMarker
                .bindPopup((zone: any) => this.mapService.createeAnomalyZonePopup(zone, this.container, this.game, this.items, true), {
                    minWidth: 300,
                })
                .openPopup();
        }

        try {
            if (anomalies.length > 0) {
                this.addLayerToMap(L.layerGroup(anomalies), anomalyZoneIcon.uniqueName);
            }

            if (anomaliesNoArt.length > 0) {
                this.addLayerToMap(L.layerGroup(anomaliesNoArt), anomalyZoneNoArtIcon.uniqueName);
            }

            if (artefactWays.length > 0) {
                this.addLayerToMap(L.layerGroup(artefactWays), 'artefact-ways');
            }
        } catch (e) {
            console.log(e);
        }
    }

    private createProperty(
        object: any,
        propertyName: string,
        array: string[],
        translate: TranslateService
    ): void {
        Object.defineProperty(object, propertyName, {
            get: function () {
                try {
                    return this.array.map((x: string) => translate.instant(x)).join(', ');
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

    private addLayerToMap(layer: any, name: any, ableToSearch: boolean = false) {
        layer.ableToSearch = ableToSearch;
        layer.name = name;
        layer.isUnderground = true;
        this.layers.push(layer);
    }

    private async ngOnDestroy(): Promise<void> {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }
}
