import {
  Component,
  ComponentFactoryResolver,
  HostListener,
  ViewEncapsulation,
  ViewContainerRef,
  ViewChild,
  Inject,
  Type,
} from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { Point } from '../../models/point.model';
import { getAnalytics, logEvent } from 'firebase/analytics';
import { TraderModel } from '../../models/trader/trader.model';
import { TraderComponent } from '../trader/trader.component';
import { StuffComponent } from '../stuff/stuff.component';
import { AnomalyZoneComponent } from '../anomaly-zone/anomaly-zone.component';
import { Item } from '../../models/item.model';
import { Map } from '../../models/map.model';
import { StuffModel } from '../../models/stuff';
import { Location } from '../../models/location.model';
import { LootBoxConfig } from '../../models/loot-box/loot-box-config.model';
import { LootBox } from '../../models/loot-box/loot-box-section.model';
import { LootBoxClusterComponent } from '../loot-box-cluster/loot-box-cluster.component';
import { AnomalySpawnSection } from '../../models/anomaly-zone';
import { StalkerComponent } from '../stalker/stalker.component';
import { MapConfig } from '../../models/gamedata/map-config';
import { TraderSectionsConfig } from '../../models/trader/trader-sections-config.model';
import { SmartTerrain } from '../../models/smart-terrain.model';
import { UndergroundComponent } from '../undeground/underground.component';
import { MarkerToSearch } from '../../models/marker-to-search.model';
import { Mechanic } from '../../models/mechanic.model';
import { MechanicComponent } from '../mechanic/mechanic.component';
import { ItemUpgrade, UpgradeProperty } from '../../models/upgrades/upgrades';
import { Meta, Title } from '@angular/platform-browser';
import { MapService } from '../../services/map.service';
import { HiddenMarker } from '../../models/hidden-marker.model';
import { CompareComponent } from '../compare/compare.component';

declare const L: any;
declare var markWidth: number;

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [HeaderComponent, TranslateModule],
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
  @ViewChild('dynamicComponents', { read: ViewContainerRef })
  container: ViewContainerRef;

  public readonly game: string;
  public svgMarker: any;
  public canvasRenderer: any;

  public static readonly avaliableGames: string[] = [
    'shoc',
    'cs',
    'cop',
    's2_2011',
    'hoc',
  ];
  public static readonly defaultGame: string = 'shoc';

  protected gamedata: Map;
  protected map: any;
  protected locations: any;
  protected canvasLayer: any;
  protected layers: any[] = [];
  protected items: Item[];
  protected lootBoxConfig: LootBoxConfig;
  protected upgrades: ItemUpgrade[];
  protected upgradeProperties: UpgradeProperty[];
  protected mapConfig: MapConfig;
  protected svgIcon: any;
  protected searchContoller: any;
  protected layerContoller: any;
  protected mapInitialized: boolean = false;
  protected markersToSearch: any[] = [];
  public undergroundMarkerToSearch: any[] = [];

  protected openedUndergroundPopup: {component: UndergroundComponent, levelChanger: any};
  protected openedComparePopup: any;
  protected overlaysListTop: string = 'layers-control';
  public static readonly hiddenLayerName: string = 'hidden-markers';
  protected readonly hiddenMarkerOpacity: number = .5;

  constructor(
    protected translate: TranslateService,
    protected route: ActivatedRoute,
    protected resolver: ComponentFactoryResolver,
    protected titleService:Title,
    protected mapService: MapService,
    protected meta: Meta) {
    let urlGame: string = this.route.snapshot.paramMap.get('game') as string;

    if (MapComponent.avaliableGames.includes(urlGame)) {
      this.game = urlGame;
    } else {
      this.game = MapComponent.defaultGame;
    }
  }

  public showHideAll(n: any = null) {
    if (n.target.checked) {
      for (let o of this.layers) {
        this.map.addLayer(o);
      }
    } else {
      for (let o of this.layers) {
        this.map.removeLayer(o);
      }
    }
  }

  public hideMarker(markerToHide: HiddenMarker): void {
    if (markerToHide.isUnderground) {
      this.openedUndergroundPopup.component.hideMarker(markerToHide);
    }
    else {
      let marker: any;

      let hiddenLayer: any = this.layers.find(x => x.name == MapComponent.hiddenLayerName);
      let markerLayer: any = this.layers.find(x => x.name == markerToHide.layerName);

      markerLayer.eachLayer(function(layer: any){
        if (layer._latlng.lat == markerToHide.lat && layer._latlng.lng == markerToHide.lng) {
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
  }

  public unhideMarker(markerShow: HiddenMarker): void {
    let marker: any;

    let hiddenLayer: any = this.layers.find(x => x.name == MapComponent.hiddenLayerName);
    let markerLayer: any = this.layers.find(x => x.name == markerShow.layerName);

    hiddenLayer.eachLayer(function(layer: any){
      if (layer._latlng.lat == markerShow.lat && layer._latlng.lng == markerShow.lng) {
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

  @HostListener('window:resize', ['$event'])
  private onResize(event: any) {
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
      this.addStyle('/assets/libs/leaflet/plugins/ruler/leaflet-ruler.css'),
      this.loadLocales(this.translate.currentLang),
      this.loadItems(),
      this.loadLootBoxConfig(),
      this.loadUpgrades(),
      this.loadUpgradeProperties()
    ]);

    this.translate.onLangChange.subscribe((i) => {
      this.loadLocales(i.lang);
    });

    fetch(`/assets/data/${this.game}/map.json`)
      .then((response) => {
        if (response.ok) {
          response.json()
          .then((gamedata: Map) => {
            fetch(`/assets/data/${this.game}_config.json`)
              .then((response) => response.json())
              .then((gameConfig: MapConfig) => {
                this.loadMap(gamedata, gameConfig);
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

    this.configureSeo();
  }

  private configureSeo(): void {
    this.meta.addTag({ name: 'description', content: `stalker ${this.translate.instant(`${this.game}MapPageTitle`)}, ${this.translate.instant(`${this.game}Short`)}`})
    this.titleService.setTitle(this.translate.instant(`${this.game}MapPageTitle`));
  }

  private async loadItems(): Promise<void> {
    await fetch(`/assets/data/${this.game}/items.json`)
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
    if (this.game != 'cop') {
      await fetch(`/assets/data/${this.game}/lootBoxConfig.json`)
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
    if (this.game != 'shoc') {
      await fetch(`/assets/data/${this.game}/upgrades.json`)
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
    if (this.game != 'shoc') {
      await fetch(`/assets/data/${this.game}/upgrade_properties.json`)
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
    await fetch(`/assets/data/${this.game}/${this.translate.currentLang}.json`)
      .then((response) => {
        if (response.ok) {
          response.json().then((locales: any) => {
            if (locales) {
              this.translate.setTranslation(language, locales, true);
            }
          });
        }
      })


      fetch(`/assets/data/${this.game}/locale_import.json`)
      .then((response) => {
        if (response.ok) {
          response.json().then((locales: any) => {
            let games = Object.keys(locales);
            if (games.length > 0) {
              for (let game of games) {
                let importLocales = locales[game].locales;

                if (!(importLocales == null || importLocales.length == 0)) {

                  fetch(`/assets/data/${game}/${this.translate.currentLang}.json`)
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
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private loadMap(gameData: Map, gameConfig: MapConfig): void {
    this.gamedata = gameData;
    this.mapConfig = gameConfig;

    this.map = L.map('map', {
        center: [gameData.heightInPixels / 2, gameData.widthInPixels / 2],
        zoom: 1.5,
        minZoom: gameConfig.minZoom,
        maxZoom: gameConfig.maxZoom,
        crs: L.CRS.Simple,
        markerZoomAnimation: !0,
        zoomAnimation: !0,
        zoomControl: !1
    });

    this.mapService.setMapComponent(this);

    this.createCustomLayersControl();

    this.createCompareControl();

    let bounds = [
        [0, 0],
        [this.gamedata.heightInPixels, this.gamedata.widthInPixels],
    ];
    L.imageOverlay(`/assets/images/maps/${this.gamedata.uniqueName}/${gameConfig.globalMapFileName}`, bounds).addTo(this.map);
    //this.map.fitBounds(bounds);

    markWidth = 3 * Math.pow(2, this.map.getZoom());
    document.documentElement.style.setProperty(
        `--map-mark-width`, `${markWidth}px`);

    this.map.setMaxBounds(bounds);

    this.map.on('zoomend', () => {
        markWidth = 3 * Math.pow(2, this.map.getZoom());
        document.documentElement.style.setProperty(
            `--map-mark-width`, `${markWidth}px`);
    });

    this.svgMarker = this.setCanvasMarkers();

    let markersToHide: any[] = [];

    if (this.gamedata.locations && this.gamedata.locations.length > 0) {
        this.addLocations();
    }

    if (this.gamedata.marks && this.gamedata.marks.length > 0) {
        this.addMarks();
    }

    if (this.gamedata.stuffs && this.gamedata.stuffs.length > 0) {
      let hiddenstuffs = this.addStuffs();

      if (hiddenstuffs.length > 0) {
        markersToHide.push(...hiddenstuffs);
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

                  if (config.isShow) {
                      currentLayer.addTo(this.map);
                  }
                }
            }
        }

        this.layers = newLayers;
    }

    let layersToControl = this.layers.map(x => [this.translate.instant(x.name), x]);
    this.layerContoller = L.control.customLayers(null, Object.fromEntries(layersToControl), {overlaysListTop: this.overlaysListTop});
    this.layerContoller.searchName = "layerControl";
    this.layerContoller.isUnderground = false;
    this.layerContoller.addTo(this.map)
    //L.control.compare({ position: 'topright' }).addTo(this.map);

    this.map.on('drag', () => {
        this.map.panInsideBounds(bounds, {
            animate: false
        });
    });

    this.map.attributionControl.addAttribution('&copy; <a href="https://stalker-map.online">stalker-map.online</a>');

    let printClickCoordinates = true;

    if (printClickCoordinates) {
        let tempMap = this.map;
        let coorsAll = '';

        this.map.on('click', function (ev: any) {
          var latlng = tempMap.mouseEventToLatLng(ev.originalEvent);
          //console.log(`[${latlng.lat}, ${latlng.lng}]`);
          //console.log(`[${latlng.lng}, ${latlng.lat}]`);

          let coors = '';
          coors+= `\"x\": ${latlng.lng},\n`;
          coors+= `\t\t\t\"y\": 0,\n`;
          coors+= `\t\t\t\"z\": ${latlng.lat},`;
          console.log(coors);
          /*
          "x": 561.02637,
          "y": -2.586868,
          "z": 797.3273,
          */
          //coorsAll += coors;
         //console.log(coorsAll)
        });
    }

    let ruler: any = null;

    if (gameConfig.rulerEnabled) {
      ruler = this.addRuler();
    }

    this.createSearchController();

    this.translate.onLangChange.subscribe(i=>{
      let layersToControl = this.layers.map(x => [this.translate.instant(x.name), x]);

      this.layerContoller.remove();
      let addRuler = false;

      if (ruler) {
        ruler.remove();
        addRuler = true;
      }

      this.layerContoller = L.control.customLayers(null, Object.fromEntries(layersToControl), {overlaysListTop: this.overlaysListTop});
      this.layerContoller.searchName = "layerControl";
      this.layerContoller.isUnderground = false;
      this.layerContoller.addTo(this.map)

      if (addRuler) {
        ruler = this.addRuler();
      }

      this.createSearchController();
    });

    L.control
    .zoom({
        position: 'bottomright',
    })
    .addTo(this.map);

    if (this.overlaysListTop) {
      let carousel = document.getElementById(this.overlaysListTop)as HTMLElement;

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

    const analytics = getAnalytics();
    logEvent(analytics, 'open-map', {
        game: this.gamedata.uniqueName,
        language: this.translate.currentLang,
    });

    this.route.queryParams.subscribe((h: any) => {
        if (h.lat != null && h.lng != null) {
          if (h.underground > 0) {
            let levelChangers = this.layers[this.translate.instant('level-changers')];
            let levelChanger: any = Object.values(levelChangers._layers).find((x: any) => x.properties.levelChanger.destinationLocationId == h.underground);

            if (levelChanger) {
              this.map.flyTo(levelChanger._latlng, this.map.getMaxZoom());

              levelChanger.properties.markerToSearch = {};
              levelChanger.properties.markerToSearch.lat = +h.lat;
              levelChanger.properties.markerToSearch.lng = +h.lng;
              levelChanger.properties.markerToSearch.type = h.type;

              levelChanger.openPopup();
            }
            else {
              console.error(`cant find underground mark! (${h.lat},${h.lng},${h.type},${h.underground})`);
            }
          }
          else {
            if (
                (this.map.flyTo([h.lat, h.lng], this.map.getMaxZoom(), {
                        animate: false,
                        duration: 0.3,
                    }),
                    h.type)) {
                      let layer = this.layers[this.translate.instant(h.type)];
                      let marker: any = Object.values(layer._layers).find(
                        (y: any) =>
                        Math.abs(y._latlng.lat - h.lat) < 1 &&
                        Math.abs(y._latlng.lng - h.lng) < 1);
                if (marker) {
                  marker.fireEvent('click');

                    logEvent(analytics, 'open-map-queryParams', {
                        game: this.gamedata.uniqueName,
                        language: this.translate.currentLang,
                        markType: h.type,
                        coordinates: `${h.lat} ${h.lng}`,
                    });

                    return;
                }
            }
          }
        } else
            this.map.setView([
                    this.gamedata.heightInPixels / 2,
                    this.gamedata.widthInPixels / 2,
                ]);
    });

    this.mapInitialized = true;
  }

  private createSearchController(): void {
    if (this.searchContoller) {
      this.searchContoller.remove();
    }

    let searchLayers = this.reorderSearchingLayers(this.layers);
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
                let type = val.layer.properties.typeUniqueName;
                let translated = translate.instant(val.layer.properties.name);
                let location = translate.instant(
                        val.layer.properties.locationUniqueName);
                return (
                    '<a href="#"><span class="stalker-search-item ' +
                    type +
                    '">' +
                    translated +
                    '</span> <b>(' +
                    location +
                    ')</b></a>');
            } catch (ex) {
                console.error(text, val, val.layer.properties);
                throw ex;
            }
        },
    });

    this.searchContoller._handleUndergroundMark = (loc: any, self: any) => {
      let location = loc.layer.undergroundLocation;

      let levelChangers = this.layers.find(x => x.name == 'level-changers');
      let levelChanger: any = Object.values(levelChangers._layers).find((x: any) => x.properties.destination == location.uniqueName);

      if (levelChanger) {
        self._moveToLocation(levelChanger._latlng, '', self._map)
        levelChanger.properties.markerToSearch = loc;
        let destinationLocation = this.gamedata.locations.find(x => x.id == levelChanger.properties.levelChanger.destinationLocationId) as Location;

        if (this.openedUndergroundPopup) {
          if (this.openedUndergroundPopup.component.location.id == destinationLocation.id) {
            if (levelChanger.properties.markerToSearch) {
              this.openedUndergroundPopup.component.markerToSearch = new MarkerToSearch();
              this.openedUndergroundPopup.component.markerToSearch.lat = levelChanger.properties.markerToSearch.lat;
              this.openedUndergroundPopup.component.markerToSearch.lng = levelChanger.properties.markerToSearch.lng;
              this.openedUndergroundPopup.component.markerToSearch.type = levelChanger.properties.markerToSearch.layer.properties.typeUniqueName;
              levelChanger.properties.markerToSearch = undefined;
              this.openedUndergroundPopup.component.goToMarker();
              return;
            }
          }
          else {
            this.openedUndergroundPopup.levelChanger.closePopup();

            levelChanger.openPopup();
          }
        }
        else {
          levelChanger.openPopup();
        }
      }
      else {
        console.error(`cant find level changer for ${location.uniqueName}`);
      }

      if (self.options.autoCollapse) { self.collapse() }
    }

    this.searchContoller.on(
        'search:locationfound',
        function (e: {
            layer: {
                openPopup: () => void
            }
        }) {
        e.layer.openPopup();
    });

    this.map.addControl(this.searchContoller);
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
                return nameA < nameB ? -1 : (nameB < nameA ? 1 : 0);
            }
        },

        _initLayout: function() {
            L.Control.Layers.prototype._initLayout.call(this);

            if (!this.isUnderground && this.options.overlaysListTop) {
                this._overlaysListTop = document.getElementById(this.options.overlaysListTop);
            }
        },

        initialize: function(baseLayers: any, overlays: any, options: any) {
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

        _update: function() {
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

        _addItem: function(obj: any) {
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

            if (this.options.overlaysListTop) {
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

            if (!obj.layer.isUnderground && this.options.overlaysListTop) {
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

        _onInputClick: function() {
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
                    inputTop = inputsTop[i];
                    layer = this._getLayer(input.layerId).layer;

                    if (input.checked) {
                        inputTop.checked = true;
                        addedLayers.push(layer);
                    } else if (!input.checked) {
                        inputTop.checked = false;
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

        _onInputClickTop: function() {
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
                inputTop = inputsTop[i];
                layer = this._getLayer(input.layerId).layer;

                if (inputTop.checked) {
                    input.checked = true;
                    addedLayers.push(layer);
                } else if (!inputTop.checked) {
                    input.checked = false;
                    removedLayers.push(layer);
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

    L.control.customLayers = function(baseLayers: any, overlays: any, options: any) {
        return new L.Control.CustomLayers(baseLayers, overlays, options);
    }
  }

  private createCompareControl(): void {
    let component = this;
    L.Control.Compare = L.Control.extend({
      onAdd: function(map: any) {
          var div = L.DomUtil.create('div');
          div.classList.add("compare-bottom");

          L.DomEvent.on(div, 'click', this._onInputClick, this);

          return div;
      },

      _onInputClick: function() {
        if (this.componentRef == null) {
          const factory = component.resolver.resolveComponentFactory(CompareComponent);
          this.componentRef = component.container.createComponent(factory);
          this.componentRef.instance.element = this.componentRef.location.nativeElement;

          document.body.appendChild(this.componentRef.location.nativeElement);
        }
        else {
          if (this.componentRef.location.nativeElement.style.display == 'none') {
            this.componentRef.location.nativeElement.style.display = 'block';
          }
          else {
            this.componentRef.location.nativeElement.style.display = 'none';
          }
        }
      },

      onRemove: function(map: any) {
          // Nothing to do here
      }
    });

    L.control.compare = function(opts: any) {
      return new L.Control.Compare(opts);
    }
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
            factor: this.mapConfig.lengthFactor, //  from km to nm
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

  private setCanvasMarkers(): any {
    L.Canvas.include({
      _updateSvgMarker: function (layer: any) {
        if (!this._drawing || layer._empty() || layer.doNotRender) {
          return;
        }

        try {
          this._ctx.globalAlpha = layer.options.opacity;
          if (layer.options.zoom != this._zoom) {
            layer._radius = (markWidth / 2) * layer.options.icon.options.iconSizeInit[0];
            layer.options.zoom = this._zoom;
          }

          this._ctx.drawImage(
            layer.options.icon._image,
            layer._point.x - layer.options.icon.shiftX * markWidth,
            layer._point.y - layer.options.icon.shiftY * markWidth,
            layer.options.icon.options.iconSizeInit[0] * markWidth,
            layer.options.icon.options.iconSizeInit[1] * markWidth);
        }
        catch (ex) {
          console.log(layer);
          console.log(ex);
        }
      }
    })

    this.canvasRenderer = L.canvas();

    this.svgIcon = L.Icon.extend(
        {
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
                this._image.src = options.iconUrl
                this.shiftX = options.iconSizeInit[0] / 2;
                this.shiftY = options.iconSizeInit[1] / 2;
            }
        }
    )

    return L.CircleMarker.extend(
      {
        _updatePath: function() {
          this._renderer._updateSvgMarker(this);
        },
        setOpacity: function(opacity: number) {
          this.setStyle({
              opacity: opacity,
              fillOpacity: opacity
          })
        }
      }
    )
  }

  private addLocations() {
    let locationsOnMap = [];

    for (let location of this.gamedata.locations) {
        let locationImage = `/assets/images/maps/${this.gamedata.uniqueName}/map_${location.uniqueName}.png`;
        let locationBounds = [
          [location.y1, location.x1],
          [location.y2, location.x2],
        ];
        let locationImageOverlay = L.imageOverlay(locationImage, locationBounds, {
          interactive: !0,
          className: 'location-on-map',
        });

        locationImageOverlay.name = location.uniqueName;
        locationImageOverlay.uniqueName = location.uniqueName;
        locationImageOverlay.id = location.id;
        locationsOnMap.push(locationImageOverlay);
    }

    this.locations = L.layerGroup(locationsOnMap);
    this.locations.locations = Object.values(locationsOnMap);
    this.locations.addTo(this.map);
  }

  private addStuffs(): any[] {
    let stuffTypes = this.getStuffTypes();
    let markersToHide: any[] = [];

    this.gamedata.stuffs = this.gamedata.stuffs.sort(
      (c: StuffModel, l: StuffModel) => c.typeId - l.typeId
    );

    let ignoredNames: string[] = ['stuff_at_location'];
    let index = 0;

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
                let stuff = new this.svgMarker([stuffModel.z, stuffModel.x], {renderer: this.canvasRenderer});

                stuff.properties = {};
                stuff.properties.stuff = stuffModel;
                stuff.properties.markType = markType.name;
                stuff.properties.typeUniqueName = markType.uniqueName;
                stuff.properties.ableToSearch = markType.ableToSearch;

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
            icon: markType.icon,
            renderer: this.canvasRenderer,
            radius: markType.icon.options.iconSizeInit[0] * 10
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

            localesToFind.push(index.toString());
            index++;

            localesToFind.push()

            this.createTranslatableProperty(
              stuff.feature.properties,
              'search',
              localesToFind,
              this.translate
            );

            let location = this.locations.locations.find(
              (y: { id: any }) => y.id == stuffModel.locationId
            );

            stuff.properties.locationUniqueName = location.uniqueName;
            stuff.properties.locationName = location.name;
            stuff.properties.name = stuff.properties.stuff.name;
          }

          stuff.bindTooltip((p: any) => this.createStuffTooltip(p), {
            sticky: true,
            className: 'map-tooltip',
            offset: new Point(0, 50),
          });
          stuff.bindPopup((p: any) => this.createStashPopup(p)).openPopup();

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

  private addLootBoxes() {
    let lootBoxType = this.getLootBoxIcon();

    let markers: any[] = [];
    let index =0;

    for (let lootBox of this.gamedata.lootBoxes) {
      let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == lootBox.locationId) as Location;

      if (location.isUnderground) {
        let lootBoxMarker = new this.svgMarker([lootBox.z, lootBox.x], {renderer: this.canvasRenderer});

        lootBoxMarker.properties = {};
        lootBoxMarker.properties.lootBox = lootBox;
        lootBoxMarker.properties.markType = lootBoxType.name;
        lootBoxMarker.properties.name = lootBoxType.name;
        lootBoxMarker.properties.typeUniqueName = lootBoxType.uniqueName;
        lootBoxMarker.properties.ableToSearch = lootBoxType.ableToSearch;

        let localesToFind: string[] = [];

        if (lootBox.lootBoxes?.length > 0) {
          for (let box of lootBox.lootBoxes) {
            let names = box.items?.map((x: { uniqueName: string; }) => {
              return this.items.find(y => y.uniqueName == x.uniqueName)?.localeName;
          } );

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
        icon: lootBoxType.icon,
        renderer: this.canvasRenderer
      });

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
      lootBoxMarker.bindPopup((p: any) => this.createLootBoxPopup(p), { minWidth: 300 }).openPopup(),
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

          let marker = new this.svgMarker([mark.z, mark.x], {
            icon: markType.icon,
            renderer: this.canvasRenderer
          });

          marker.properties = {};
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

      if (
        zone.anomaliySpawnSections != null &&
        zone.anomaliySpawnSections.length > 0
      ) {
        canvasMarker = new this.svgMarker([zone.z, zone.x], {
          icon: anomalyZoneIcon.icon,
          renderer: this.canvasRenderer
        });
      } else {
        canvasMarker = new this.svgMarker([zone.z, zone.x], {
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

        let searchFields = [];

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

        canvasMarker.feature = {};/* = {
          properties: { search: searchFields.join(', ') },
        };*/
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
                artefactWays.push(L.polyline(latlngs, {color: 'yellow', weight: 2}));
            }
        }

        if (hiddenMarkers.some(x => x.lat == zone.z && x.lng == zone.x)) {
          markersToHide.push(canvasMarker);
        }
        else {
          anomalies.push(canvasMarker);
        }

        let locationFromL = this.locations.locations.find(
          (x: { id: any }) => x.id == zone.locationId
        );
        if (location) {
          canvasMarker.properties.locationUniqueName = locationFromL.uniqueName;
          canvasMarker.properties.locationName = locationFromL.name;
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
          minWidth: 300,
        })
        .openPopup();
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

  private addTraders() {
    let traderIcon = {
      name: this.translate.instant('traders'),
      uniqueName: 'traders',
      cssClass: 'tradere',
      ableToSearch: true,
      icon: new this.svgIcon({
        iconSize: [4, 4],
        className: 'mark-container stalker-mark-2',
        animate: false,
        iconUrl: '/assets/images/svg/marks/trader.svg',
        iconSizeInit: [2, 2],
        iconAnchor: [0, 0],
      }),
    };

    let medicIcon = new this.svgIcon({
      iconSize: [4, 4],
      className: 'mark-container stalker-mark-1.5',
      animate: false,
      iconUrl: '/assets/images/svg/marks/medic.svg',
      iconSizeInit: [1.5, 1.5],
      iconAnchor: [0, 0],
    })

    medicIcon.uniqueName = 'medic';

    let markers: any[] = [];

    for (let trader of this.gamedata.traders) {
      let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == trader.locationId) as Location;

      if (location.isUnderground) {
        continue;
      }

      let canvasMarker =  new this.svgMarker([trader.z, trader.x], {
        icon: trader.isMedic ? medicIcon : traderIcon.icon,
        renderer: this.canvasRenderer
      });

      canvasMarker.properties = {};
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

      canvasMarker
        .bindPopup(
          (trader: any) =>
            this.createTraderPopup(trader, this.gamedata.traders, canvasMarker),
          { maxWidth: 2000 }
        )
        .openPopup();
    }

    this.addLayerToMap(L.layerGroup(markers), traderIcon.uniqueName, traderIcon.ableToSearch);
  }

  private addStalkers() {
    let stalkerIcon, stalkerIconDead, stalkerIconQuestItem;
    [stalkerIcon, stalkerIconDead, stalkerIconQuestItem]= this.getStalkersIcon();

    let markers: any[] = [];
    let index = 0;

    for (let stalker of this.gamedata.stalkers) {
      let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == stalker.locationId) as Location;

      if (location.isUnderground) {
        if (true) {
            let canvasMarker = new this.svgMarker([stalker.z, stalker.x], {renderer: this.canvasRenderer});

            canvasMarker.properties = {};
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

      let canvasMarker =  new this.svgMarker([stalker.z, stalker.x], {
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

      canvasMarker
        .bindPopup(
          (stalker: any) =>
            this.createStalkerPopup(stalker),
          { maxWidth: 500 }
        )
        .openPopup();
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
    };

    let markers: any[] = [];
    let index = 0;

    for (let mechanic of this.gamedata.mechanics) {
      let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == mechanic.locationId) as Location;

      let canvasMarker =  new this.svgMarker([mechanic.z, mechanic.x], {
        icon: mechanicIcon.icon,
        renderer: this.canvasRenderer
      });

      canvasMarker.properties = {};
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

      let minWidth = 1230;

      canvasMarker
        .bindPopup(
          (stalker: any) =>
            this.createMechanicPopup(stalker),
          { minWidth: minWidth }
        )
        .openPopup();
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
    };

    let markers: any[] = [];

    let images: any[] = [];

    let smartTerrainPaths: { name: string, image: any}[] = [];

    let handledSmartTerrains: string[] = [];

    for (let smart of this.gamedata.smartTerrains) {
      let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == smart.locationId) as Location;

      if (location.isUnderground) {
        continue;
      }

      let icon: any = null;

      switch (smart.simType) {
        case "default" : {
            icon = new this.svgIcon({
              iconSize: [4, 4],
              className: 'mark-container stalker-mark-2',
              animate: false,
              iconUrl: '/assets/images/svg/marks/smart_terrain_default.svg',
              iconSizeInit: [1.75, 1.75],
              iconAnchor: [0, 0],
            });

          break;
        }

        case "territory" : {
          icon = new this.svgIcon({
            iconSize: [4, 4],
            className: 'mark-container stalker-mark-2',
            animate: false,
            iconUrl: '/assets/images/svg/marks/smart_terrain_territory.svg',
            iconSizeInit: [2, 2],
            iconAnchor: [0, 0],
          });

          break;
        }

        case "resource" : {
          icon = new this.svgIcon({
            iconSize: [4, 4],
            className: 'mark-container stalker-mark-2',
            animate: false,
            iconUrl: '/assets/images/svg/marks/smart_terrain_resource.svg',
            iconSizeInit: [2, 2],
            iconAnchor: [0, 0],
          });

          break;
        }

        case "base" : {
          switch (smart.respawnSector) {
            case 'dolg': {
              icon = new this.svgIcon({
                iconSize: [4, 4],
                className: 'mark-container stalker-mark-3',
                animate: false,
                iconUrl: '/assets/images/svg/factions/duty.svg',
                iconSizeInit: [2, 2],
                iconAnchor: [0, 0],
              });
              break;
            }
            case 'stalker': {
              icon = new this.svgIcon({
                iconSize: [4, 4],
                className: 'mark-container stalker-mark-3',
                animate: false,
                iconUrl: '/assets/images/svg/factions/stalkers.svg',
                iconSizeInit: [2, 2],
                iconAnchor: [0, 0],
              });
              break;
            }
            case 'bandit': {
              icon = new this.svgIcon({
                iconSize: [4, 4],
                className: 'mark-container stalker-mark-3',
                animate: false,
                iconUrl: '/assets/images/svg/factions/bandits.svg',
                iconSizeInit: [2, 2],
                iconAnchor: [0, 0],
              });

              break;
            }
            case 'army': {
              icon = new this.svgIcon({
                iconSize: [4, 4],
                className: 'mark-container stalker-mark-3',
                animate: false,
                iconUrl: '/assets/images/svg/factions/military.svg',
                iconSizeInit: [2, 2],
                iconAnchor: [0, 0],
              });

              break;
            }
            default: {
              if (location.uniqueName == "darkvalley") {
                icon = new this.svgIcon({
                  iconSize: [4, 4],
                  className: 'mark-container stalker-mark-2',
                  animate: false,
                  iconUrl: '/assets/images/svg/factions/freedom.svg',
                  iconSizeInit: [2, 2],
                  iconAnchor: [0, 0],
                })
              }
              else if (location.uniqueName == "marsh") {
                icon = new this.svgIcon({
                  iconSize: [4, 4],
                  className: 'mark-container stalker-mark-2',
                  animate: false,
                  iconUrl: '/assets/images/svg/factions/clear-sky.svg',
                  iconSizeInit: [2, 2],
                  iconAnchor: [0, 0],
                })
              }
              else {
                icon = new this.svgIcon({
                  iconSize: [4, 4],
                  className: 'mark-container stalker-mark-2',
                  animate: false,
                  iconUrl: '/assets/images/svg/marks/monsters.svg',
                  iconSizeInit: [1, 1],
                  iconAnchor: [0, 0],
                })
              }
              break;
            }
          }

          break;
        }
      }

      let canvasMarker = new this.svgMarker([smart.z, smart.x], {
        icon: icon,
        renderer: this.canvasRenderer
      });

      canvasMarker.properties = {};
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

                var polyline = L.polyline(latlngs, {color: color, weight: 2, dashArray: notSameLocation ? '20, 20' : null});

                if (color == 'blue') {
                  polyline.arrowheads({size: '20px', fill: true, proportionalToTotal: false});
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
    };

    let markers: any[] = [];

    for (let lair of this.gamedata.monsterLairs) {
      let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == lair.locationId) as Location;

      if (location.isUnderground) {
        continue;
      }

      let canvasMarker =  new this.svgMarker([lair.z, lair.x], {
        icon: monstersIcon.icon,
        renderer: this.canvasRenderer
      });

      canvasMarker.properties = {};
      canvasMarker.properties.lair = lair;
      canvasMarker.properties.name = 'mutants-lair';
      canvasMarker.properties.typeUniqueName = 'monsters';

      markers.push(canvasMarker);
      canvasMarker.properties.ableToSearch = false;
      canvasMarker.feature = {};
      canvasMarker.feature.properties = {};

      /*let propertiesToSearch: string[] = [e];

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
      );*/

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

      /*canvasMarker
        .bindPopup(
          (stalker: any) =>
            this.createStalkerPopup(stalker),
          { maxWidth: 500 }
        )
        .openPopup();*/
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
        markerIcon = levelChangerDirection.find(x => x.name == levelChanger.direction)?.icon;

        if (!markerIcon) {
            markerIcon = levelChangerIcon.icon;
        }
      }

      let canvasMarker = new this.svgMarker([levelChanger.z, levelChanger.x], {
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

        canvasMarker
          .bindPopup(
            (stalker: any) =>
              this.createUndergroundMapPopup(stalker),
            {
              maxWidth: 500,
              closeOnClick: false,
              autoClose: false
            }
          )
          .openPopup();
      }
    }

    this.addLayerToMap(L.layerGroup(markers), levelChangerIcon.uniqueName);
  }

  private addHiddenMarkers(markersToHide: any[]): void {
    let hiddenLayer = L.layerGroup(markersToHide);

    hiddenLayer.onAdd = function(map: any) {
      L.LayerGroup.prototype.onAdd.call(this, map);

      this.eachLayer(function(layer: any) {
        layer.setOpacity(0.5);
      });
    }

    this.addLayerToMap(hiddenLayer, MapComponent.hiddenLayerName);
  }

  private addRoads() {
    let roads: any[] = [];

    for (let road of this.gamedata.roads) {
      var polyline = L.polyline(road.points.map(x =>
        {
          let geo: any = {};
          geo.lng = x.x;
          geo.lat = x.z;
          return geo;
        }), {color: 'grey', weight: 2});
      roads.push(polyline);
    }

    this.addLayerToMap(L.layerGroup(roads), 'roads');
  }

  private addLayerToMap(layer: any, name: any, ableToSearch: boolean = false) {
    layer.ableToSearch = ableToSearch;
    layer.name = name;

    this.layers.push(layer);
  }

  private reorderSearchingLayers(layers: any): any {
    this.markersToSearch = [];
    let newUndergroundLayer: any = {};
    let undergroundMarkers: any[] = [];
    let newLayers: any[] = [];

    for (let layer of layers) {
        if (this.map.hasLayer(layer)) {
            let markers: any[] = Object.values(layer._layers);
            newLayers.push(layer);
            if (markers[0] && markers[0].properties && markers[0].properties.typeUniqueName) {
              undergroundMarkers.push(...this.undergroundMarkerToSearch.filter(x => x.properties.typeUniqueName == markers[0].properties.typeUniqueName));
            }
        }
    }

    if (Object.values(layers).some((x: any) => x.name == "level-changers" && this.map.hasLayer(x))) {
      newUndergroundLayer = L.layerGroup(undergroundMarkers);
      newUndergroundLayer.ableToSearch = true;
      newUndergroundLayer.name = 'underground';
      newLayers.push(newUndergroundLayer);
    }
    return L.featureGroup(newLayers);
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

  private createTraderPopup(traderMarker: any, traders: any[], marker: any) {
    let trader: TraderModel = traderMarker.properties.traderConfig;

    marker.getPopup().on('remove', function () {
      marker.getPopup().off('remove');
      componentRef.destroy();
    });

    const factory = this.resolver.resolveComponentFactory(TraderComponent);

    const componentRef = this.container.createComponent(factory);
    componentRef.instance.trader = trader;
    componentRef.instance.allTraders = traders as TraderModel[];
    componentRef.instance.game = this.game;
    componentRef.instance.allItems = this.items;
    componentRef.instance.rankSetting = this.mapConfig.rankSetting;
    componentRef.instance.relationType = this.mapConfig.traderRelationType;
    componentRef.instance.actor = this.mapConfig.actor;
    componentRef.instance.traderConfigs = this.mapConfig.traderConfigs;
    componentRef.instance.traderConfig = this.mapConfig.traderConfigs?.find(x => x.trader == trader.profile.name) as TraderSectionsConfig;

    return componentRef.location.nativeElement;
  }

  private createMechanicPopup(mechanicMarker: any) {
    let mechanic: Mechanic = mechanicMarker.properties.mechanic;

    mechanicMarker.getPopup().on('remove', function () {
      mechanicMarker.getPopup().off('remove');
      componentRef.destroy();
    });

    const factory = this.resolver.resolveComponentFactory(MechanicComponent);

    const componentRef = this.container.createComponent(factory);
    componentRef.instance.mechanic = mechanic;
    componentRef.instance.game = this.game;
    componentRef.instance.allItems = this.items;
    componentRef.instance.rankSetting = this.mapConfig.rankSetting;
    componentRef.instance.relationType = this.mapConfig.traderRelationType;
    componentRef.instance.actor = this.mapConfig.actor;
    componentRef.instance.upgrades = this.upgrades;
    componentRef.instance.upgradeProperties = this.upgradeProperties;

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

  private createUndergroundMapPopup(levelChanger: any) {
    let destinationLocation = this.gamedata.locations.find(x => x.id == levelChanger.properties.levelChanger.destinationLocationId) as Location;

    if (this.openedUndergroundPopup) {
      if (this.openedUndergroundPopup.component.location.id == destinationLocation.id) {
        if (levelChanger.properties.markerToSearch) {
          this.openedUndergroundPopup.component.markerToSearch = new MarkerToSearch();
          this.openedUndergroundPopup.component.markerToSearch.lat = levelChanger.properties.markerToSearch.lat;
          this.openedUndergroundPopup.component.markerToSearch.lng = levelChanger.properties.markerToSearch.lng;
          this.openedUndergroundPopup.component.markerToSearch.type = levelChanger.properties.markerToSearch.type ? levelChanger.properties.markerToSearch.type : levelChanger.properties.markerToSearch.layer.properties.typeUniqueName;
          levelChanger.properties.markerToSearch = undefined;
          this.openedUndergroundPopup.component.goToMarker();
          return;
        }
        else {
          let popup = this.openedUndergroundPopup.levelChanger.getPopup();

          popup.setLatLng(levelChanger._latlng);
          return;
          /*this.openedUndergroundPopup.levelChanger.closePopup();

          levelChanger.openPopup();*/
        }
      }
      else {
        this.openedUndergroundPopup.levelChanger.fire('remove');
      }
    }

    let mapComponent = this;
    levelChanger.getPopup().on('remove', function () {
      levelChanger.getPopup().off('remove');
      componentRef.instance.mapComponent.openedUndergroundPopup = null as unknown as {component: UndergroundComponent, levelChanger: any};
      componentRef.destroy();
    });

    const factory = this.resolver.resolveComponentFactory(UndergroundComponent);

    const componentRef = this.container.createComponent(factory);
    componentRef.instance.gamedata = this.gamedata;
    componentRef.instance.location = destinationLocation;
    componentRef.instance.items = this.items;
    componentRef.instance.game = this.game;
    componentRef.instance.mapConfig = this.mapConfig;
    componentRef.instance.lootBoxConfig = this.lootBoxConfig;
    componentRef.instance.mapComponent = this;

    if (levelChanger.properties.markerToSearch) {
      componentRef.instance.markerToSearch = new MarkerToSearch();
      componentRef.instance.markerToSearch.lat = levelChanger.properties.markerToSearch.lat;
      componentRef.instance.markerToSearch.lng = levelChanger.properties.markerToSearch.lng;
      componentRef.instance.markerToSearch.type = levelChanger.properties.markerToSearch.type ? levelChanger.properties.markerToSearch.type : levelChanger.properties.markerToSearch.layer.properties.typeUniqueName;
      levelChanger.properties.markerToSearch = undefined;
    }

    this.openedUndergroundPopup = {component: componentRef.instance, levelChanger: levelChanger};

    return componentRef.location.nativeElement;
  }

  private async addScript(scriptUrl: string): Promise<void> {
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

  private async addStyle(styleUrl: string): Promise<void> {
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
    };
    let undergroundDoorIcon = new this.svgIcon({
      iconSize: [4, 4],
      className: 'mark-container stalker-mark-2',
      animate: false,
      iconUrl: '/assets/images/svg/marks/level_changers/underground_2.svg',
      iconSizeInit: [1.5, 1.5],
      iconAnchor: [0, 0],
    });

    let rostokIcon = new this.svgIcon({
      iconSize: [4, 4],
      className: 'mark-container stalker-mark-2',
      animate: false,
      iconUrl: '/assets/images/svg/marks/level_changers/level_changer_rostok.svg',
      iconSizeInit: [4, 2],
      iconAnchor: [0, 0],
    });

    let levelChangerDirection: {name: string, icon: any}[] = [];

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
                  })
            }
        )
    }

    return [levelChangerIcon, undergroundDoorIcon, rostokIcon, levelChangerDirection];
  }
}
