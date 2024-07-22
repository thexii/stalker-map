import { NgClass, NgFor, NgIf, NgStyle } from "@angular/common";
import { Component, ComponentFactoryResolver, Input, ViewChild, ViewContainerRef } from "@angular/core";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { StalkerProfileComponent } from "../stalker-profile/stalker-profile.component";
import { Map } from '../../models/map.model';
import { Location } from '../../models/location.model';
import { StuffModel } from "../../models/stuff";
import { Item } from "../../models/item.model";
import { Point } from "../../models/point.model";
import { StuffComponent } from "../stuff/stuff.component";
import { StalkerComponent } from "../stalker/stalker.component";
import { MapConfig } from "../../models/gamedata/map-config";
import { LootBoxClusterComponent } from "../loot-box-cluster/loot-box-cluster.component";
import { LootBox } from "../../models/loot-box/loot-box-section.model";
import { LootBoxConfig } from "../../models/loot-box/loot-box-config.model";
import { UndergroundLevelsConfig } from "../../models/underground-levels-config.model";
import { MarkerToSearch } from "../../models/marker-to-search.model";
import { MapComponent } from "../map/map.component";
import { AnomalySpawnSection } from "../../models/anomaly-zone";
import { AnomalyZoneComponent } from "../anomaly-zone/anomaly-zone.component";

declare const L: any;
declare var markWidthUnderground: number;

@Component({
    selector: 'app-underground',
    standalone: true,
    templateUrl: './underground.component.html',
    styleUrl: './underground.component.scss',
    imports: [NgFor, NgIf, TranslateModule, NgClass, NgStyle, StalkerProfileComponent]
})

export class UndergroundComponent {
    @ViewChild('dynamicComponents', { read: ViewContainerRef })
    container: ViewContainerRef;

    @Input() public location: Location;
    @Input() public gamedata: Map;
    @Input() public items: Item[];
    @Input() public game: string;
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

    constructor(
        private translate: TranslateService,
        private resolver: ComponentFactoryResolver) { }

    public setLayer(newLyaer: string): void {
      if (this.selectedLevel == newLyaer) {
        return;
      }

      console.log(newLyaer);

      this.currentLevelImageOverlay.remove();
      this.selectedLevel = newLyaer;

      this.addLocation();
    }

    public goToMarker(): void {
      let layer = Object.values(this.layers).find(x => x.name == this.markerToSearch.type);

      if (layer) {
        console.log(layer)
        console.log(this.markerToSearch)
        let sLat = this.markerToSearch.lat + this.zShift;
        let sLng = this.markerToSearch.lng + this.xShift;

        for (let marker of Object.values(layer._layers) as any[]) {
          if (marker._latlng.lat == sLat && marker._latlng.lng == sLng) {
            console.log(marker);

            this.fireSearchedMarker(marker);

            break;
          }
        }
      }
    }

    private async ngOnInit(): Promise<void> {
        console.log(this.location)
        let minZoom = 1;
        let maxZoom = 3;
        let zoom = 1.5;

        let canvasRenderer =
        L.Canvas.extend({
          _updateSvgMarker: function (layer: any) {
            if (!this._drawing || layer._empty() || layer.doNotRender) {
              return;
            }

            try {
              this._ctx.drawImage(
                layer.options.icon._image,
                layer._point.x - layer.options.icon.shiftX * markWidthUnderground,
                layer._point.y - layer.options.icon.shiftY * markWidthUnderground,
                layer.options.icon.options.iconSizeInit[0] * markWidthUnderground,
                layer.options.icon.options.iconSizeInit[1] * markWidthUnderground);
            }
            catch (ex) {
              console.log(layer);
              console.log(ex);
            }
          }
        })

        this.canvasRenderer = new canvasRenderer();

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
            this.markWidthFactor = 6;
            minZoom = 0;
            maxZoom = 2;
            zoom = 1;
            break;
          }
          case "labx8": {
            this.xShift = 121.657;
            this.zShift = -44.509;
            break;
          }
          case "l10u_bunker": {
            this.xShift = 83;
            this.zShift = 99.25;
            break;
          }
          case "l12u_control_monolith": {
            this.xShift = 50;
            this.zShift = 49.625;
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

        let bounds = [
            [0, 0],
            [this.location.heightInMeters, this.location.widthInMeters],
        ];

        markWidthUnderground = this.markWidthFactor * Math.pow(2, this.map.getZoom());

        this.map.on('zoomend', () => {
          console.log("this.map.on('zoomend')");
          markWidthUnderground = this.markWidthFactor * Math.pow(2, this.map.getZoom());
          document.documentElement.style.setProperty(
              `--map-mark-width-underground`,
    `${markWidthUnderground}px`);
      });

        let printClickCoordinates = true;

        if (printClickCoordinates) {
            let tempMap = this.map;

            this.map.on('click', function (ev: any) {
              var latlng = tempMap.mouseEventToLatLng(ev.originalEvent);
              console.log(`[${latlng.lat}, ${latlng.lng}]`);
            });
        }

        this.undergroundConfig = this.mapConfig.undergroundLevelsConfig?.find( x => x.name == this.location.uniqueName) as UndergroundLevelsConfig;

        if (this.undergroundConfig == null) {
          this.selectedLevel = `map_${this.location.uniqueName}`;
        }
        else {
          this.selectedLevel = this.undergroundConfig.baseLevel;
        }

        this.addLocation();

        this.addMarks();

        this.addStuffs();

        this.addLootBoxes();

        this.addAnomalyZones();

        this.addStalkers();

        this.addLevelChangers();

        let layersToHide = [];

        if (
            this.mapConfig.markersConfig != null &&
            this.mapConfig.markersConfig.length > 0 &&
            this.layers != null) {
            let allLayers = Object.values(this.layers);
            let newLayers: any = {};
            for (let config of this.mapConfig.markersConfig) {
                if (allLayers.some((y) => y.name == config.uniqueName)) {
                    let currentLayer = allLayers.filter(
                            (D) => D.name == config.uniqueName)[0];
                    newLayers[this.translate.instant(config.uniqueName)] = currentLayer;

                    if (!config.isShow) {
                        layersToHide.push(currentLayer);
                    }
                    else {
                      currentLayer.addTo(this.map);
                    }
                }
            }

            this.layers = newLayers;
        }

        let layerControl = L.control.layers(null, this.layers)
        layerControl.isUnderground = true;
        layerControl.searchName = "underground";
        layerControl.addTo(this.map);

        if (this.markerToSearch) {
          this.goToMarker();
        }
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
              icon: markType.icon,
              renderer: this.canvasRenderer
            });

            marker.properties = {};
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

    private addStuffs() {
        let stuffTypes = this.mapComponent.getStuffTypes();

        this.gamedata.stuffs = this.gamedata.stuffs.sort(
          (c: StuffModel, l: StuffModel) => c.typeId - l.typeId
        );

        let ignoredNames: string[] = ['stuff_at_location'];

        let buggedStrings = [];

        for (let markType of stuffTypes) {
          let stuffsAtLocation = this.gamedata.stuffs.filter(
            (u: StuffModel) => u.locationId == this.location.id && u.typeId == markType.id
          );

          if (stuffsAtLocation.length > 0) {
            let markers: any[] = [];

            for (let stuffModel of stuffsAtLocation) {
              let stuff = new this.mapComponent.svgMarker([stuffModel.z + this.zShift, stuffModel.x + this.xShift], {
                icon: markType.icon,
                renderer: this.canvasRenderer
              });

              stuff.properties = {};
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
                  } ));
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

              stuff.bindTooltip((p: any) => this.createStuffTooltip(p), {
                sticky: true,
                className: 'map-tooltip',
                offset: new Point(0, 50),
              });
              stuff.bindPopup((p: any) => this.createStashPopup(p)),
              markers.push(stuff)
            }

            this.addLayerToMap(L.layerGroup(markers), markType.uniqueName, markType.ableToSearch);
          }
        }
      }

    private addStalkers() {
      let stalkerIcon, stalkerIconDead, stalkerIconQuestItem;
      [stalkerIcon, stalkerIconDead, stalkerIconQuestItem]= this.mapComponent.getStalkersIcon();

      let markers: any[] = [];

      for (let stalker of this.gamedata.stalkers.filter(x => x.locationId == this.location.id)) {
        let canvasMarker = new this.mapComponent.svgMarker([stalker.z + this.zShift, stalker.x + this.xShift], {
          icon: stalker.alive ? (stalker.hasUniqueItem ? stalkerIconQuestItem.icon : stalkerIcon.icon) : stalkerIconDead.icon,
          renderer: this.canvasRenderer
        });

        canvasMarker.properties = {};
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
              this.createStalkerPopup(stalker),
            { maxWidth: 500 }
          )
          .openPopup();
      }

      if (markers.length > 0) {
        this.addLayerToMap(L.layerGroup(markers), stalkerIcon.uniqueName, stalkerIcon.ableToSearch);
      }
    }

    private addLootBoxes() {
      let lootBoxType = this.mapComponent.getLootBoxIcon();

      let markers: any[] = [];

      for (let lootBox of this.gamedata.lootBoxes.filter(x => x.locationId == this.location.id)) {
        let lootBoxMarker = new this.mapComponent.svgMarker([lootBox.z + this.zShift, lootBox.x + this.xShift], {
          icon: lootBoxType.icon,
          renderer: this.canvasRenderer
        });

        //stuffModel.z + this.zShift, stuffModel.x + this.xShift

        lootBoxMarker.properties = {};
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
              (y: { uniqueName: string } ) => y.uniqueName
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
        lootBoxMarker.bindPopup((p: any) => this.createLootBoxPopup(p)).openPopup(),
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
          markerIcon = levelChangerDirection.find(x => x.name == levelChanger.direction)?.icon;

          if (!markerIcon) {
              markerIcon = levelChangerIcon.icon;
          }
        }

        let canvasMarker = new this.mapComponent.svgMarker([levelChanger.z + this.zShift, levelChanger.x + this.xShift], {
          icon: markerIcon,
          renderer: this.canvasRenderer
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

      console.log(markers)
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

        if (
          zone.anomaliySpawnSections != null &&
          zone.anomaliySpawnSections.length > 0
        ) {
          canvasMarker = new this.mapComponent.svgMarker([zone.z + this.zShift, zone.x + this.xShift], {
            icon: anomalyZoneIcon.icon,
            renderer: this.canvasRenderer
          });
        } else {
          canvasMarker = new this.mapComponent.svgMarker([zone.z + this.zShift, zone.x + this.xShift], {
            icon: anomalyZoneNoArtIcon.icon,
            renderer: this.canvasRenderer
          });
        }

        canvasMarker.properties = {};
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
            return this.createAnomalyZoneTooltip(zone);
          },
          { sticky: true, className: 'map-tooltip', offset: new Point(0, 50) }
        );
        canvasMarker
          .bindPopup((zone: any) => this.createeAnomalyZonePopup(zone), {
            maxWidth: 400,
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

    private createStuffTooltip(stuff: any) {
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

    private createStashPopup(stash: any) {
      stash.getPopup().on('remove', function () {
        stash.getPopup().off('remove');
        componentRef.destroy();
      });

      const factory = this.resolver.resolveComponentFactory(StuffComponent);

      const componentRef = this.container.createComponent(factory);
      componentRef.instance.stuff = stash.properties.stuff;
      componentRef.instance.game = this.game;
      componentRef.instance.allItems = this.items;
      componentRef.instance.stuffType = stash.properties.typeUniqueName;

      return componentRef.location.nativeElement;
    }

    private createStalkerPopup(stalkerMarker: any) {
      stalkerMarker.getPopup().on('remove', function () {
        stalkerMarker.getPopup().off('remove');
        componentRef.destroy();
      });

      const factory = this.resolver.resolveComponentFactory(StalkerComponent);

      const componentRef = this.container.createComponent(factory);
      componentRef.instance.stalker = stalkerMarker.properties.stalker;
      componentRef.instance.game = this.game;
      componentRef.instance.allItems = this.items;
      componentRef.instance.rankSetting = this.mapConfig.rankSetting;

      return componentRef.location.nativeElement;
    }

    private createLootBoxPopup(lootBox: any) {
      lootBox.getPopup().on('remove', function () {
        lootBox.getPopup().off('remove');
        componentRef.destroy();
      });

      const factory = this.resolver.resolveComponentFactory(LootBoxClusterComponent);

      const componentRef = this.container.createComponent(factory);
      componentRef.instance.cluster = lootBox.properties.lootBox;
      componentRef.instance.game = this.game;
      componentRef.instance.allItems = this.items;

      let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == lootBox.properties.lootBox.locationId) as Location;
      let lootBoxLocationConfig = this.lootBoxConfig.locations.find(x => x.name == location.uniqueName);

      componentRef.instance.lootBoxConfigs = this.lootBoxConfig.boxes;
      componentRef.instance.lootBoxLocationConfig = lootBoxLocationConfig as LootBox;

      return componentRef.location.nativeElement;
    }

    private createAnomalyZoneTooltip(zone: {
      properties: { name: any; description: any };
      description: any;
    }) {
      let html = `<div class="header-tip"><p class="p-header">${this.translate.instant(zone.properties.name)}</p></div>`;
      if (zone.description) {
        html += `<div class="tooltip-text"><p>${zone.properties.description}</p></div>`;
      }

      return html;
    }

    private createeAnomalyZonePopup(zone: any) {
      zone.getPopup().on('remove', function () {
        zone.getPopup().off('remove');
        componentRef.destroy();
      });

      const factory = this.resolver.resolveComponentFactory(AnomalyZoneComponent);

      const componentRef = this.container.createComponent(factory);
      componentRef.instance.anomalZone = zone.properties.zoneModel;
      componentRef.instance.game = this.game;
      componentRef.instance.allItems = this.items;

      return componentRef.location.nativeElement;
    }

    private addLayerToMap(layer: any, name: any, ableToSearch: boolean = false) {
      console.log(name, ableToSearch);
      layer.ableToSearch = ableToSearch;
      layer.isShowing = false;
      layer.name = name;
      layer.isUnderground = true;
      this.layers[name] = layer;
      let mapComponent = this;
      let layers = mapComponent.layers;

      layer.hide = (layer: { isShowing: boolean; markers: any }) => {
        if (layer.isShowing) {
          layer.isShowing = false;
        }
      };

      layer.show = (layer: { isShowing: boolean; _layers: any }) => {
        if (!layer.isShowing && Object.keys(layer._layers).length > 0) {
          layer.isShowing = true;
        }
      };

      layer.show(layer);
    }

    private async ngOnDestroy(): Promise<void> {
      if (this.map) {
        this.map.remove();
        this.map = null;
      }
    }
}
