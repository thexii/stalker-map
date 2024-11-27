import { MapComponent } from './../components/map/map.component';
import { ComponentFactoryResolver, Injectable, ViewContainerRef } from "@angular/core";
import { HiddenMarker } from "../models/hidden-marker.model";
import { HocStuffComponent } from '../components/stuff/hoc-stuff/hoc-stuff.component';
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

declare const L: any;

@Injectable({
    providedIn: 'root'
  })

export class MapService {
  private hiddenMarksLocalStorageKey: string = 'hidden-markers';
  private hiddenMarksCache: HiddenMarker[];
  private mapComponent: MapComponent;

  constructor(
    private resolver: ComponentFactoryResolver,
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

  public createStashPopup(stash: any, container: ViewContainerRef, game: string, allItems: Item[], isUnderground: boolean) {
    stash.getPopup().on('remove', function () {
      stash.getPopup().off('remove');
      componentRef.destroy();
    });

    const factory = this.resolver.resolveComponentFactory(StuffComponent);

    const componentRef = container.createComponent(factory);
    componentRef.instance.stuff = stash.properties.stuff;
    componentRef.instance.game = game;
    componentRef.instance.allItems = allItems;
    componentRef.instance.stuffType = stash.properties.typeUniqueName;
    componentRef.instance.isUnderground = isUnderground;

    return componentRef.location.nativeElement;
  }

  public createLootBoxPopup(lootBox: any, container: ViewContainerRef, game: string, allItems: Item[], locations: Location[], lootBoxConfig: LootBoxConfig, isUnderground: boolean) {
    lootBox.getPopup().on('remove', function () {
      lootBox.getPopup().off('remove');
      componentRef.destroy();
    });

    const factory = this.resolver.resolveComponentFactory(LootBoxClusterComponent);

    const componentRef = container.createComponent(factory);
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

  public createeAnomalyZonePopup(zone: any, container: ViewContainerRef, game: string, allItems: Item[], isUnderground: boolean) {
    zone.getPopup().on('remove', function () {
      zone.getPopup().off('remove');
      componentRef.destroy();
    });

    const factory = this.resolver.resolveComponentFactory(AnomalyZoneComponent);

    const componentRef = container.createComponent(factory);
    componentRef.instance.anomalZone = zone.properties.zoneModel;
    componentRef.instance.game = game;
    componentRef.instance.allItems = allItems;
    componentRef.instance.isUnderground = isUnderground;

    return componentRef.location.nativeElement;
  }

  public createTraderPopup(traderMarker: any, traders: TraderModel[], marker: any, container: ViewContainerRef, game: string, allItems: Item[], mapConfig: MapConfig) {
    let trader: TraderModel = traderMarker.properties.traderConfig;

    marker.getPopup().on('remove', function () {
      marker.getPopup().off('remove');
      componentRef.destroy();
    });

    const factory = this.resolver.resolveComponentFactory(TraderComponent);

    const componentRef = container.createComponent(factory);
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

  public createStalkerPopup(stalkerMarker: any, container: ViewContainerRef, game: string, allItems: Item[], mapConfig: MapConfig, isUnderground: boolean) {
    stalkerMarker.getPopup().on('remove', function () {
      stalkerMarker.getPopup().off('remove');
      componentRef.destroy();
    });

    const factory = this.resolver.resolveComponentFactory(StalkerComponent);

    const componentRef = container.createComponent(factory);
    componentRef.instance.stalker = stalkerMarker.properties.stalker;
    componentRef.instance.game = game;
    componentRef.instance.allItems = allItems;
    componentRef.instance.rankSetting = mapConfig.rankSetting;
    componentRef.instance.isUnderground = isUnderground;

    return componentRef.location.nativeElement;
  }

  public createMechanicPopup(mechanicMarker: any, container: ViewContainerRef, game: string, allItems: Item[], mapConfig: MapConfig, upgrades: ItemUpgrade[], upgradeProperties: UpgradeProperty[]) {
    let mechanic: Mechanic = mechanicMarker.properties.mechanic;

    mechanicMarker.getPopup().on('remove', function () {
      mechanicMarker.getPopup().off('remove');
      componentRef.destroy();
    });

    const factory = this.resolver.resolveComponentFactory(MechanicComponent);

    const componentRef = container.createComponent(factory);
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
            factor: pixelsInGameUnit == 1 ? lengthFactor : 1 / pixelsInGameUnit, //  from km to nm
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
    ruler.addTo(map);

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
          this.hiddenMarksCache = this.hiddenMarksCache.filter(x => x.game == this.mapComponent.game);
        }

        return this.hiddenMarksCache;
      }
    }

    return [];
  }

  private setHiddenMarkers(markers: HiddenMarker[]): void {
    this.hiddenMarksCache = markers;
    localStorage.setItem(this.hiddenMarksLocalStorageKey, JSON.stringify(markers));
  }
}
