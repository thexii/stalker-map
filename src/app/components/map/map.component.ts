import {
  Component,
  ComponentFactoryResolver,
  HostListener,
  ViewEncapsulation,
  ViewContainerRef,
  ViewChild,
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

  private readonly avaliableGames: string[] = [
    'shoc',
    'cs',
    'cop',
    's2_2011',
    'hoc',
  ];
  private readonly defaultGame: string = 'shoc';

  private gamedata: Map;
  private map: any;
  private locations: any;
  private canvasLayer: any;
  private layers: any[] = [];
  private items: Item[];
  private lootBoxConfig: LootBoxConfig;
  private mapConfig: MapConfig;
  private svgMarker: any;
  private canvasRenderer: any;// = L.canvas();

  constructor(
    private translate: TranslateService,
    private route: ActivatedRoute,
    private resolver: ComponentFactoryResolver
  ) {
    let urlGame: string = this.route.snapshot.paramMap.get('game') as string;

    if (this.avaliableGames.includes(urlGame)) {
      this.game = urlGame;
    } else {
      this.game = this.defaultGame;
    }
  }

  public showHideAll(n: any = null) {
    let i = Object.values(this.layers);
    if (n.target.checked) {
      for (let o of i) {
        this.map.addLayer(o);
        o.show(o);
      }
    } else {
      for (let o of i) {
        this.map.removeLayer(o);
        o.hide(o);
      }
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
      await this.addScript('/assets/libs/leaflet/plugins/rbush.js');
      await this.addScript(
        '/assets/libs/leaflet/plugins/leaflet-markers-canvas.js'
      );
      await this.addScript(
        '/assets/libs/leaflet/plugins/search/leaflet-search.js'
      );
      await this.addScript(
        '/assets/libs/leaflet/plugins/search/leaflet-search-geocoder.js'
      );
      await this.addScript(
        '/assets/libs/leaflet/plugins/ruler/leaflet-ruler.js'
      );
      await this.addScript(
        '/assets/libs/leaflet/plugins/leaflet.geometryutil.js'
      );
      await this.addScript(
        '/assets/libs/leaflet/plugins/arrow/leaflet-arrowheads.js'
      );
      await this.addScript(
        '/assets/libs/leaflet/plugins/leaflet.rotatedMarker.js'
      );
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
      this.loadLootBoxConfig()
    ]);

    this.translate.onLangChange.subscribe((i) => {
      this.loadLocales(i.lang);
    });

    fetch(`/assets/data/${this.game}/map.json`)
      .then((response) => response.json())
      .then((gamedata: Map) => {
        fetch(`/assets/data/${this.game}_config.json`)
          .then((response) => response.json())
          .then((gameConfig: MapConfig) => {
            this.loadMap(gamedata, gameConfig);
          });
      });

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
  }

  private async loadItems(): Promise<void> {
    await fetch(`/assets/data/${this.game}/items.json`)
      .then((response) => response.json())
      .then((items: Item[]) => {
        if (items) {
          this.items = items;
        }
      });
  }

  private async loadLootBoxConfig(): Promise<void> {
    if (this.game != 'cop') {
      await fetch(`/assets/data/${this.game}/lootBoxConfig.json`)
        .then((response) => response.json())
        .then((config: LootBoxConfig) => {
          if (config) {
            this.lootBoxConfig = config;
          }
          console.log(config);
        });
    }
  }

  private async loadLocales(language: string): Promise<void> {
    await fetch(`/assets/data/${this.game}/${this.translate.currentLang}.json`)
      .then((response) => response.json())
      .then((locales: any) => {
        if (locales) {
          this.translate.setTranslation(language, locales, true);
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
    console.log(gameData);

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

    let bounds = [
        [0, 0],
        [this.gamedata.heightInPixels, this.gamedata.widthInPixels],
    ];
    L.imageOverlay(
`/assets/images/maps/${this.gamedata.uniqueName}/${gameConfig.globalMapFileName}`,
        bounds).addTo(this.map);
    this.map.fitBounds(bounds);

    markWidth = Math.exp(1.3615 + 0.6117 * this.map.getZoom());
    document.documentElement.style.setProperty(
        `--map-mark-width`,
`${markWidth}px`);

    this.map.setMaxBounds(bounds);

    this.map.on('zoomend', () => {
        markWidth = 3 * Math.pow(2, this.map.getZoom());
        document.documentElement.style.setProperty(
            `--map-mark-width`,
`${markWidth}px`);
    });

    this.svgMarker = this.setCanvasMarkers();

    if (this.gamedata.locations && this.gamedata.locations.length > 0) {
        this.addLocations();
        let marks = '';

        for (let location of this.gamedata.locations) {
            if (
                this.translate.instant(location.uniqueName) == location.uniqueName) {
                marks += `"${location.uniqueName}",`;
            }
        }

        if (marks) {
            console.error(marks);
        }
    }

    if (this.gamedata.marks && this.gamedata.marks.length > 0) {
        this.addMarks();
        let marks = '';
        for (let mark of this.gamedata.marks) {
            if (mark.name && this.translate.instant(mark.name) == mark.name) {
                marks += `"${mark.name}",`;
            }
            if (
                mark.description &&
                this.translate.instant(mark.description) == mark.description) {
                marks += `"${mark.description}",`;
            }
        }

        if (marks) {
            console.error(marks);
        }
    }

    if (this.gamedata.stuffs && this.gamedata.stuffs.length > 0) {
        this.addStuffs();
        let marks = '';

        for (let stuff of this.gamedata.stuffs) {
            if (stuff.name) {
                if (this.translate.instant(stuff.name) == stuff.name) {
                    marks += `"${stuff.name}",`;
                }

                if (stuff.description) {
                    if (this.translate.instant(stuff.description) == stuff.description) {
                        marks += `"${stuff.description}",`;
                    }
                }
            }
        }

        if (marks) {
            console.error(marks);
        }
    }

    if (this.gamedata.lootBoxes && this.gamedata.lootBoxes.length > 0) {
        this.addLootBoxes();
    }

    if (this.gamedata.anomalyZones && this.gamedata.anomalyZones.length > 0) {
        this.addAnomalyZones();
    }

    if (this.gamedata.traders && this.gamedata.traders.length > 0) {
        this.addTraders();
    }

    if (this.gamedata.traders && this.gamedata.traders.length > 0) {
        this.addStalkers();
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

    let layersToHide = [];

    if (
        gameConfig.markersConfig != null &&
        gameConfig.markersConfig.length > 0 &&
        this.layers != null) {
        let allLayers = Object.values(this.layers);
        let newLayers: any = {};
        for (let config of gameConfig.markersConfig) {
            if (allLayers.some((y) => y.name == config.uniqueName)) {
                let currentLayer = allLayers.filter(
                        (D) => D.name == config.uniqueName)[0];
                newLayers[this.translate.instant(config.uniqueName)] = currentLayer;

                if (!config.isShow) {
                    layersToHide.push(currentLayer);
                }
            }
        }

        this.layers = newLayers;
    }

    let layerControl = L.control.layers(null, this.layers).addTo(this.map);

    this.map.on('drag', () => {
        this.map.panInsideBounds(bounds, {
            animate: false
        });
    });

    let searchLayers = L.featureGroup(Object.values(this.layers));
    let translate = this.translate;

    let printClickCoordinates = false;

    if (printClickCoordinates) {
        let tempMap = this.map;

        this.map.on('click', function (ev: any) {
          var latlng = tempMap.mouseEventToLatLng(ev.originalEvent);
          console.log(`[${latlng.lat}, ${latlng.lng}]`);
        });
    }

    let searchContoller = L.control.search({
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

    if (gameConfig.rulerEnabled) {
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
                factor: gameConfig.lengthFactor, //  from km to nm
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

        L.control.ruler(options).addTo(this.map);
    }

    searchContoller.on(
        'search:locationfound',
        function (e: {
            layer: {
                openPopup: () => void
            }
        }) {
        e.layer.openPopup();
    });

    this.map.addControl(searchContoller);

    L.control
    .zoom({
        position: 'bottomright',
    })
    .addTo(this.map);

    let carousel = document.getElementById('layers-control')as HTMLElement;

    carousel.addEventListener('wheel', function (e) {
        if (e.deltaY > 0)
            carousel.scrollLeft += 100;
        else
            carousel.scrollLeft -= 100;
    });

    if (layersToHide.length > 0) {
        for (let h of layersToHide) {
            this.map.removeLayer(h);
            h.hide(h);
        }
    }

    const analytics = getAnalytics();
    logEvent(analytics, 'open-map', {
        game: this.gamedata.uniqueName,
        language: this.translate.currentLang,
    });

    this.route.queryParams.subscribe((h: any) => {
        if (h.lat != null && h.lng != null) {
            if (
                (this.map.flyTo([h.lat, h.lng], this.map.getMaxZoom(), {
                        animate: !0,
                        duration: 0.3,
                    }),
                    h.type)) {
                let m = this.layers[this.translate.instant(h.type)].markers.find(
                        (y: {
                            _latlng: {
                                lat: number;
                                lng: number
                            }
                        }) =>
                        Math.abs(y._latlng.lat - h.lat) < 1 &&
                        Math.abs(y._latlng.lng - h.lng) < 1);
                if (m) {
                    m.fireEvent('click');

                    logEvent(analytics, 'open-map-queryParams', {
                        game: this.gamedata.uniqueName,
                        language: this.translate.currentLang,
                        markType: h.type,
                        coordinates: `${h.lat} ${h.lng}`,
                    });

                    return;
                }
            }
        } else
            this.map.setView([
                    this.gamedata.heightInPixels / 2,
                    this.gamedata.widthInPixels / 2,
                ]);
    });
  }

  private setCanvasMarkers(): any {
    let imagesCahce: {src: string, image: any, width: number, height: number, widthShift: number, heightShift: number}[] = [];
    L.Canvas.include({
      _updateSvgMarker: function (layer: any) {
        if (!this._drawing || layer._empty()) {
          return;
        }

        this._ctx.drawImage(
            layer.properties.image,
            layer._point.x - layer.options.icon.options.iconSizeInit[0] / 2 * markWidth,
            layer._point.y - layer.options.icon.options.iconSizeInit[1] / 2 * markWidth,
            layer.options.icon.options.iconSizeInit[0] * markWidth,
            layer.options.icon.options.iconSizeInit[1] * markWidth);
      }
    })

    this.canvasRenderer = L.canvas();

    return L.CircleMarker.extend(
      {
        _updatePath: function() {
          this._renderer._updateSvgMarker(this);
        }
      }
    )
  }

  private addLocations() {
    let locationsOnMap = [];
    for (let location of this.gamedata.locations) {

      if (location.isUnderground) {
        continue;
      }

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

  private addStuffs() {
    let stuffTypes = [
      {
        id: 0,
        ableToSearch: !0,
        itemableToSearch: !0,
        name: this.translate.instant('stash'),
        uniqueName: 'stash',
        icon: L.icon({
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
        icon: L.icon({
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
        icon: L.icon({
          iconSizeInit: [1, 1],
          className: 'mark-container stalker-mark',
          animate: !1,
          iconUrl: '/assets/images/svg/marks/stuff.svg',
          iconAnchor: [0, 0],
        }),
      },
    ];

    this.gamedata.stuffs = this.gamedata.stuffs.sort(
      (c: StuffModel, l: StuffModel) => c.typeId - l.typeId
    );

    let ignoredNames: string[] = ['stuff_at_location'];

    let buggedStrings = [];

    for (let markType of stuffTypes) {
      let stuffsAtLocation = this.gamedata.stuffs.filter(
        (u: { typeId: number }) => u.typeId == markType.id
      );

      if (stuffsAtLocation.length > 0) {
        let markers: any = [];
        let markerImage = new Image();
        markerImage.src = markType.icon.options.iconUrl;

        for (let stuffModel of stuffsAtLocation) {
          let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == stuffModel.locationId) as Location;

          if (location.isUnderground) {
            continue;
          }

          let markerX: number = 0.5 - location.xShift + stuffModel.x / location.widthInMeters;
          let markerY: number = 0.5 - location.yShift + stuffModel.z / location.heightInMeters;

          let dx: number = location.x2 - location.x1;
          let dy: number = location.y1 - location.y2;

          let stuff = new this.svgMarker([location.y2 + markerY * dy, location.x1 + markerX * dx], {
            icon: markType.icon,
            renderer: this.canvasRenderer,
            radius: markType.icon.options.iconSizeInit[0] * 10
          });

          stuff.properties = {};
          stuff.properties.stuff = stuffModel;
          stuff.properties.markType = markType.name;
          stuff.properties.typeUniqueName = markType.uniqueName;
          stuff.properties.ableToSearch = markType.ableToSearch;
          stuff.properties.image = markerImage;

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

            this.createProperty(
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

          markers.push(stuff);
        }

        this.addLayerToMap(L.layerGroup(markers), markType.uniqueName, markType.ableToSearch);
      }
    }
  }

  private addLootBoxes() {
    let lootBoxType =
    {
      id: 2,
      ableToSearch: false,
      itemableToSearch: false,
      name: this.translate.instant('destroyable-box'),
      uniqueName: 'destroyable-box',
      icon: L.icon({
        iconSizeInit: [1, 1],
        className: 'mark-container stalker-mark',
        animate: !1,
        iconUrl: '/assets/images/svg/marks/items.svg',
        iconAnchor: [0, 0],
      }),
    };

    let markers: any[] = [];
    let markerImage = new Image();
    markerImage.src = lootBoxType.icon.options.iconUrl;

    for (let lootBox of this.gamedata.lootBoxes) {
      let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == lootBox.locationId) as Location;

      if (location.isUnderground) {
        continue;
      }

      let markerX: number = 0.5 - location.xShift + lootBox.x / location.widthInMeters;
      let markerY: number = 0.5 - location.yShift + lootBox.z / location.heightInMeters;

      let dx: number = location.x2 - location.x1;
      let dy: number = location.y1 - location.y2;

      let lootBoxMarker = new this.svgMarker([location.y2 + markerY * dy, location.x1 + markerX * dx], {
        icon: lootBoxType.icon,
        renderer: this.canvasRenderer
      });

      lootBoxMarker.properties = {};
      lootBoxMarker.properties.lootBox = lootBox;
      lootBoxMarker.properties.name = lootBoxType.name;
      lootBoxMarker.properties.typeUniqueName = lootBoxType.uniqueName;
      lootBoxMarker.properties.ableToSearch = lootBoxType.ableToSearch;
      lootBoxMarker.properties.image = markerImage;

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
      lootBoxMarker.bindPopup((p: any) => this.createLootBoxPopup(p)).openPopup(),
        markers.push(lootBoxMarker);
    }

    this.addLayerToMap(L.layerGroup(markers), lootBoxType.uniqueName, lootBoxType.ableToSearch);
  }

  private addMarks() {
    let markTypes = [
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
        icon: L.icon({
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
        icon: L.icon({
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
        icon: L.icon({
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
        icon: L.icon({
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
        icon: L.icon({
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
        icon: L.icon({
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
        icon: L.icon({
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
        icon: L.icon({
          iconSizeInit: [1.5, 1.5],
          className: 'mark-container stalker-mark-1.5',
          animate: !1,
          iconUrl: '/assets/images/svg/marks/mines.svg',
          iconAnchor: [0, 0],
        }),
      },
    ];

    this.gamedata.marks = this.gamedata.marks.sort(
      (c: { typeId: number }, l: { typeId: number }) => c.typeId - l.typeId
    );

    for (let markType of markTypes) {
      let marks = this.gamedata.marks.filter(
        (u: { typeId: number }) => u.typeId == markType.id
      );

      if (marks.length > 0) {
        let markers = [];
        let markerImage = new Image();
        markerImage.src = markType.icon.options.iconUrl;

        for (let mark of marks) {
          let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == mark.locationId) as Location;

          if (location.isUnderground) {
            continue;
          }

          let markerX: number = 0.5 - location.xShift + mark.x / location.widthInMeters;
          let markerY: number = 0.5 - location.yShift + mark.z / location.heightInMeters;

          let dx: number = location.x2 - location.x1;
          let dy: number = location.y1 - location.y2;

          let marker = new this.svgMarker([location.y2 + markerY * dy, location.x1 + markerX * dx], {
            icon: markType.icon,
            renderer: this.canvasRenderer
          });

          marker.properties = {};
          marker.properties.name = mark.name ? mark.name : markType.markName;
          marker.properties.description = mark.description;
          marker.properties.markType = markType.name;
          marker.properties.typeUniqueName = markType.uniqueName;
          marker.properties.ableToSearch = markType.ableToSearch;
          marker.properties.image = markerImage;

          marker.addTo(this.map);
          markers.push(marker);

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

            let location = this.locations.locations.find(
              (y: { id: any }) => y.id == mark.locationId
            );
            marker.properties.locationUniqueName = location.uniqueName;
            marker.properties.locationName = location.name;
          }

          marker.bindTooltip(
            (marker: any) => this.translate.instant(marker.properties.name),
            {
              sticky: true,
              className: 'map-tooltip',
              offset: [0, 50],
            }
          );

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

  private addAnomalyZones() {
    let anomalyZoneIcon = {
      name: this.translate.instant('anomaly-zone'),
      uniqueName: 'anomaly-zone',
      cssClass: 'anomaly-zone',
      ableToSearch: true,
      icon: L.icon({
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
      icon: L.icon({
        iconSize: [12.5, 12.5],
        className: 'mark-container stalker-mark',
        animate: false,
        iconUrl: '/assets/images/svg/marks/anomaly_noart.svg',
        iconSizeInit: [1, 1],
        iconAnchor: [0, 0],
      }),
    };

    let anomalies: any[] = [];
    let anomaliesNoArt: any[] = [];
    let artefactWays: any[] = [];

    let markerImage = new Image();
    markerImage.src = anomalyZoneIcon.icon.options.iconUrl;

    let markerImageNoArt = new Image();
    markerImageNoArt.src = anomalyZoneNoArtIcon.icon.options.iconUrl;

    for (let zone of this.gamedata.anomalyZones) {
      let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == zone.locationId) as Location;

      if (location.isUnderground) {
        continue;
      }

      let markerX: number = 0.5 - location.xShift + zone.x / location.widthInMeters;
      let markerY: number = 0.5 - location.yShift + zone.z / location.heightInMeters;

      let dx: number = location.x2 - location.x1;
      let dy: number = location.y1 - location.y2;

      const defaultType: string = 'anomaly-zone';

      let canvasMarker;

      if (
        zone.anomaliySpawnSections != null &&
        zone.anomaliySpawnSections.length > 0
      ) {
        canvasMarker = new this.svgMarker([location.y2 + markerY * dy, location.x1 + markerX * dx], {
          icon: anomalyZoneIcon.icon,
          renderer: this.canvasRenderer
        });

        canvasMarker.properties = {};
        canvasMarker.properties.image = markerImage;
      } else {
        canvasMarker = new this.svgMarker([location.y2 + markerY * dy, location.x1 + markerX * dx], {
          icon: anomalyZoneNoArtIcon.icon,
          renderer: this.canvasRenderer
        });

        canvasMarker.properties = {};
        canvasMarker.properties.image = markerImageNoArt;
      }

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
            searchFields.push(art);
          }
        }

        canvasMarker.feature = {
          properties: { search: searchFields.join(', ') },
        };
        this.createProperty(
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
                artefactWays.push(L.polyline(latlngs, {color: 'green', weight: 2}));
            }
        }

        anomalies.push(canvasMarker);

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
          maxWidth: 400,
        })
        .openPopup();
    }

    try {
      this.addLayerToMap(L.layerGroup(anomalies), anomalyZoneIcon.uniqueName);

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
      icon: L.icon({
        iconSize: [4, 4],
        className: 'mark-container stalker-mark-2',
        animate: false,
        iconUrl: '/assets/images/svg/marks/trader.svg',
        iconSizeInit: [2, 2],
        iconAnchor: [0, 0],
      }),
    };

    let medicIcon = L.icon({
      iconSize: [4, 4],
      className: 'mark-container stalker-mark-1.5',
      animate: false,
      iconUrl: '/assets/images/svg/marks/medic.svg',
      iconSizeInit: [1.5, 1.5],
      iconAnchor: [0, 0],
    })

    let markers: any[] = [];

    let markerImage = new Image();
    markerImage.src = traderIcon.icon.options.iconUrl;

    let markerImageMedic = new Image();
    markerImageMedic.src = medicIcon.options.iconUrl;

    for (let trader of this.gamedata.traders) {
      let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == trader.locationId) as Location;

      if (location.isUnderground) {
        continue;
      }

      let markerX: number = 0.5 - location.xShift + trader.x / location.widthInMeters;
      let markerY: number = 0.5 - location.yShift + trader.z / location.heightInMeters;

      let dx: number = location.x2 - location.x1;
      let dy: number = location.y1 - location.y2;

      let canvasMarker =  new this.svgMarker([location.y2 + markerY * dy, location.x1 + markerX * dx], {
        icon: trader.isMedic ? medicIcon : traderIcon.icon,
        renderer: this.canvasRenderer
      });

      canvasMarker.properties = {};
      canvasMarker.properties.traderConfig = trader;
      canvasMarker.properties.name = trader.profile.name;
      canvasMarker.properties.typeUniqueName = traderIcon.uniqueName;
      canvasMarker.properties.image = trader.isMedic ? markerImageMedic : markerImage;

      markers.push(canvasMarker);
      canvasMarker.properties.ableToSearch = false;
      canvasMarker.feature = {};
      canvasMarker.feature.properties = {};
      this.createProperty(
        canvasMarker.feature.properties,
        'search',
        [trader.profile.name],
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

    this.addLayerToMap(L.layerGroup(markers), traderIcon.uniqueName);
  }

  private addStalkers() {
    let stalkerIcon = {
      name: this.translate.instant('stalkers-layer'),
      uniqueName: 'stalkers',
      cssClass: 'stalkers',
      ableToSearch: true,
      icon: L.icon({
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
      icon: L.icon({
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
      icon: L.icon({
        iconSize: [4, 4],
        className: 'mark-container stalker-mark-1.5',
        animate: false,
        iconUrl: '/assets/images/svg/marks/character_quest.svg',
        iconSizeInit: [1, 1],
        iconAnchor: [0, 0],
      }),
    };

    let markers: any[] = [];

    let markerImage = new Image();
    markerImage.src = stalkerIcon.icon.options.iconUrl;

    let markerImageDead = new Image();
    markerImageDead.src = stalkerIconDead.icon.options.iconUrl;

    let markerImageQuestItem = new Image();
    markerImageQuestItem.src = stalkerIconQuestItem.icon.options.iconUrl;

    for (let stalker of this.gamedata.stalkers) {
      let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == stalker.locationId) as Location;

      if (location.isUnderground) {
        continue;
      }

      let markerX: number = 0.5 - location.xShift + stalker.x / location.widthInMeters;
      let markerY: number = 0.5 - location.yShift + stalker.z / location.heightInMeters;

      let dx: number = location.x2 - location.x1;
      let dy: number = location.y1 - location.y2;

      let canvasMarker =  new this.svgMarker([location.y2 + markerY * dy, location.x1 + markerX * dx], {
        icon: stalker.alive ? (stalker.hasUniqueItem ? stalkerIconQuestItem.icon : stalkerIcon.icon) : stalkerIconDead.icon,
        renderer: this.canvasRenderer
      });

      canvasMarker.properties = {};
      canvasMarker.properties.stalker = stalker;
      canvasMarker.properties.name = stalker.profile.name;
      canvasMarker.properties.typeUniqueName = stalkerIcon.uniqueName;
      canvasMarker.properties.image = stalker.alive ? (stalker.hasUniqueItem ? markerImageQuestItem : markerImage) : markerImageDead;

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


    this.addLayerToMap(L.layerGroup(markers), stalkerIcon.uniqueName);
  }

  private addSmartTerrains(isClearSky: boolean = false) {
    let smartTerrainIcon = {
      name: this.translate.instant('smart-terrains'),
      uniqueName: 'smart-terrains',
      cssClass: 'smart-terrain',
      ableToSearch: true,
      icon: L.icon({
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

      let markerX: number = 0.5 - location.xShift + smart.x / location.widthInMeters;
      let markerY: number = 0.5 - location.yShift + smart.z / location.heightInMeters;

      let dx: number = location.x2 - location.x1;
      let dy: number = location.y1 - location.y2;

      let icon: any = null;
      let imageMarker = null;

      switch (smart.simType) {
        case "default" : {
          if (smart.isMutantLair || smart.respawnSector == 'monster') {
            icon = L.icon({
              iconSize: [4, 4],
              className: 'mark-container stalker-mark-2',
              animate: false,
              iconUrl: '/assets/images/svg/marks/smart_terrain_default.svg',
              iconSizeInit: [1.75, 1.75],
              iconAnchor: [0, 0],
            });

            imageMarker = images.find(x => x.name == 'monsters')?.image

            if (!imageMarker) {
                let newImage =
                    {
                        name: 'monsters',
                        image: new Image()
                    };

                newImage.image.src = icon.options.iconUrl
                imageMarker = newImage.image;
                images.push(newImage);
            }
          }
          else {
            icon = L.icon({
              iconSize: [4, 4],
              className: 'mark-container stalker-mark-2',
              animate: false,
              iconUrl: '/assets/images/svg/marks/smart_terrain_default.svg',
              iconSizeInit: [1.75, 1.75],
              iconAnchor: [0, 0],
            });

            imageMarker = images.find(x => x.name == smart.simType)?.image

            if (!imageMarker) {
                let newImage =
                    {
                        name: smart.simType,
                        image: new Image()
                    };

                newImage.image.src = icon.options.iconUrl
                imageMarker = newImage.image;
                images.push(newImage);
            }
          }

          break;
        }

        case "territory" : {
          icon = L.icon({
            iconSize: [4, 4],
            className: 'mark-container stalker-mark-2',
            animate: false,
            iconUrl: '/assets/images/svg/marks/smart_terrain_territory.svg',
            iconSizeInit: [2, 2],
            iconAnchor: [0, 0],
          });

          imageMarker = images.find(x => x.name == smart.simType)?.image

          if (!imageMarker) {
              let newImage =
                  {
                      name: smart.simType,
                      image: new Image()
                  };

                newImage.image.src = icon.options.iconUrl
                imageMarker = newImage.image;
                images.push(newImage);
          }
          break;
        }

        case "resource" : {
          icon = L.icon({
            iconSize: [4, 4],
            className: 'mark-container stalker-mark-2',
            animate: false,
            iconUrl: '/assets/images/svg/marks/smart_terrain_resource.svg',
            iconSizeInit: [2, 2],
            iconAnchor: [0, 0],
          });

          imageMarker = images.find(x => x.name == smart.simType)?.image

          if (!imageMarker) {
              let newImage =
                  {
                      name: smart.simType,
                      image: new Image()
                  };

                newImage.image.src = icon.options.iconUrl
              imageMarker = newImage.image;
              images.push(newImage);
          }
          break;
        }

        case "base" : {
          switch (smart.respawnSector) {
            case 'dolg': {
              icon = L.icon({
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
              icon = L.icon({
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
              icon = L.icon({
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
              icon = L.icon({
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
                icon = L.icon({
                  iconSize: [4, 4],
                  className: 'mark-container stalker-mark-2',
                  animate: false,
                  iconUrl: '/assets/images/svg/factions/freedom.svg',
                  iconSizeInit: [2, 2],
                  iconAnchor: [0, 0],
                })
              }
              else if (location.uniqueName == "marsh") {
                icon = L.icon({
                  iconSize: [4, 4],
                  className: 'mark-container stalker-mark-2',
                  animate: false,
                  iconUrl: '/assets/images/svg/factions/clear-sky.svg',
                  iconSizeInit: [2, 2],
                  iconAnchor: [0, 0],
                })
              }
              else {
                icon = L.icon({
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

          imageMarker = images.find(x => x.name == icon.options.iconUrl)?.image

          if (!imageMarker) {
              let newImage =
                  {
                      name: icon.options.iconUrl,
                      image: new Image()
                  };

                  newImage.image.src = icon.options.iconUrl
              imageMarker = newImage.image;
              images.push(newImage);
          }
          break;
        }
      }

      let canvasMarker = new this.svgMarker([location.y2 + markerY * dy, location.x1 + markerX * dx], {
        icon: icon,
        renderer: this.canvasRenderer
      });

      canvasMarker.properties = {};
      canvasMarker.properties.smart = smart;
      canvasMarker.properties.name = smart.localeName;
      canvasMarker.properties.typeUniqueName = smart.simType;
      canvasMarker.properties.image = imageMarker;
      markers.push(canvasMarker);

      canvasMarker.properties.ableToSearch = false;
      canvasMarker.feature = {};
      canvasMarker.feature.properties = {};

      let propertiesToSearch: string[] = [smart.localeName];

      this.createProperty(
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

                let targetX: number = 0.5 - targetLocation.xShift + targetSmart.x / targetLocation.widthInMeters;
                let targetY: number = 0.5 - targetLocation.yShift + targetSmart.z / targetLocation.heightInMeters;

                let tdx: number = targetLocation.x2 - targetLocation.x1;
                let tdy: number = targetLocation.y1 - targetLocation.y2;
                let latlngs: any[] = [];

                latlngs.push([location.y2       + markerY * dy, location.x1       + markerX * dx]);
                latlngs.push([targetLocation.y2 + targetY * tdy, targetLocation.x1 + targetX * tdx]);

                let color = 'blue';

                if (targetSmart.targets?.includes(smart.name)) {
                  color = 'red';
                }

                if (targetSmart.targets?.includes(smart.name) && handledSmartTerrains.includes(target)) {
                  continue;
                }

                if (smart.name == "mil_smart_terrain_2_2" && targetSmart.name == "red_smart_terrain_3_1") {
                  latlngs = [];
                  latlngs.push([location.y2       + markerY * dy, location.x1       + markerX * dx]);

                  latlngs.push([1091.7000007629395, 433.02499997615814]);
                  latlngs.push([1194.9500007629395, 428.27499997615814]);
                  latlngs.push([1259.900001525879, 389.7999999523163]);
                  latlngs.push([1261.650001525879, 277.7999999523163]);
                  latlngs.push([1246.150001525879, 271.0499999523163]);
                  latlngs.push([1236.900001525879, 274.2999999523163]);
                  latlngs.push([1230.900001525879, 260.0499999523163]);

                  latlngs.push([targetLocation.y2 + targetY * tdy, targetLocation.x1 + targetX * tdx]);
                }

                var polyline = L.polyline(latlngs, {color: color, weight: 2, dashArray: notSameLocation ? '20, 20' : null});

                if (color == 'blue') {
                  polyline.arrowheads({size: '20px', fill: true, proportionalToTotal: false})
                }

                smartTerrainPaths.push(polyline);
              }
          }

          handledSmartTerrains.push(smart.name);
      }

      canvasMarker.properties.locationUniqueName = location.uniqueName;

      canvasMarker.bindTooltip(
        (marker: any) =>
          `${this.translate.instant(smart.localeName)} (${smart.name})`,
        {
          sticky: true,
          className: 'map-tooltip',
          offset: [0, 50],
        }
      );
    }

    this.addLayerToMap(L.layerGroup(markers), smartTerrainIcon.uniqueName);
    this.addLayerToMap(L.layerGroup(smartTerrainPaths), 'smart-paths');
  }

  private addMonsterLairs() {
    let monstersIcon = {
      name: this.translate.instant('mutants'),
      uniqueName: 'monsters',
      cssClass: 'monsters',
      ableToSearch: true,
      icon: L.icon({
        iconSize: [4, 4],
        className: 'mark-container stalker-mark-2',
        animate: false,
        iconUrl: '/assets/images/svg/marks/monsters.svg',
        iconSizeInit: [2, 2],
        iconAnchor: [0, 0],
      }),
    };

    let markers: any[] = [];
    let markerImage = new Image();
    markerImage.src = monstersIcon.icon.options.iconUrl;

    for (let lair of this.gamedata.monsterLairs) {
      let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == lair.locationId) as Location;

      if (location.isUnderground) {
        continue;
      }

      let markerX: number = 0.5 - location.xShift + lair.x / location.widthInMeters;
      let markerY: number = 0.5 - location.yShift + lair.z / location.heightInMeters;

      let dx: number = location.x2 - location.x1;
      let dy: number = location.y1 - location.y2;

      let canvasMarker =  new this.svgMarker([location.y2 + markerY * dy, location.x1 + markerX * dx], {
        icon: monstersIcon.icon,
        renderer: this.canvasRenderer
      });

      canvasMarker.properties = {};
      canvasMarker.properties.lair = lair;
      canvasMarker.properties.name = 'mutants-lair';
      canvasMarker.properties.typeUniqueName = 'monsters';
      canvasMarker.properties.image = markerImage;

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

      canvasMarker
        .bindPopup(
          (stalker: any) =>
            this.createStalkerPopup(stalker),
          { maxWidth: 500 }
        )
        .openPopup();
    }

    this.addLayerToMap(L.layerGroup(markers), monstersIcon.uniqueName);
  }

  private addLevelChangers() {
    let levelChangerIcon = {
      name: this.translate.instant('level-changers'),
      uniqueName: 'level-changers',
      cssClass: 'level-changers',
      ableToSearch: true,
      icon: L.icon({
        iconSize: [4, 4],
        className: 'mark-container stalker-mark-2',
        animate: false,
        iconUrl: '/assets/images/svg/marks/level_changer.svg',
        iconSizeInit: [2, 2],
        iconAnchor: [0, 0],
      }),
    };
    let undergroundDoorIcon = L.icon({
      iconSize: [4, 4],
      className: 'mark-container stalker-mark-2',
      animate: false,
      iconUrl: '/assets/images/svg/marks/underground.svg',
      iconSizeInit: [2, 2],
      iconAnchor: [0, 0],
    });

    let rostokIcon = L.icon({
      iconSize: [4, 4],
      className: 'mark-container stalker-mark-2',
      animate: false,
      iconUrl: '/assets/images/svg/marks/level_changer_rostok.svg',
      iconSizeInit: [2, 2],
      iconAnchor: [0, 0],
    });

    let markers: any[] = [];

    let markerImage = new Image();
    markerImage.src = levelChangerIcon.icon.options.iconUrl;


    for (let levelChanger of this.gamedata.levelChangers) {
      let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == levelChanger.locationId) as Location;
      let destLocation: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == levelChanger.destinationLocationId) as Location;

      let markerX: number = 0.5 - location.xShift + levelChanger.x / location.widthInMeters;
      let markerY: number = 0.5 - location.yShift + levelChanger.z / location.heightInMeters;

      let dx: number = location.x2 - location.x1;
      let dy: number = location.y1 - location.y2;

      let canvasMarker = new this.svgMarker([location.y2 + markerY * dy, location.x1 + markerX * dx], {
        icon: levelChangerIcon.icon,
        renderer: this.canvasRenderer
      });

      if (!destLocation.isUnderground) {
        //canvasMarker.setRotationAngle(levelChanger.azimut);
      }

      canvasMarker.properties = {};
      canvasMarker.properties.levelChanger = levelChanger;
      canvasMarker.properties.name = levelChanger.locale ? levelChanger.locale : 'level-changer';
      canvasMarker.properties.typeUniqueName = 'level-changers';
      canvasMarker.properties.image = markerImage;

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

      if (destLocation.isUnderground) {

        canvasMarker
          .bindPopup(
            (stalker: any) =>
              this.createUndergroundMapPopup(stalker),
            { maxWidth: 500 }
          )
          .openPopup();
      }
    }

    this.addLayerToMap(L.layerGroup(markers), levelChangerIcon.uniqueName);
  }

  private addLayerToMap(layer: any, name: any, ableToSearch: boolean = false) {
    layer.ableToSearch = ableToSearch;
    layer.isShowing = false;
    layer.name = name;
    this.layers[name] = layer;

    layer.hide = (layer: { isShowing: boolean; markers: any }) => {
      if (layer.isShowing) {
        //this.canvasLayer.removeMarkers(layer.markers);

        layer.isShowing = false;
      }
    };

    layer.show = (layer: { isShowing: boolean; _layers: any }) => {
      if (!layer.isShowing && layer._layers?.length > 0) {
        //this.canvasLayer.addMarkers(layer.markers);

        layer.isShowing = true;
      }
    };

    layer.show(layer);
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
    levelChanger.getPopup().on('remove', function () {
      levelChanger.getPopup().off('remove');
      componentRef.destroy();
    });

    const factory = this.resolver.resolveComponentFactory(UndergroundComponent);

    const componentRef = this.container.createComponent(factory);
    componentRef.instance.gamedata = this.gamedata;
    componentRef.instance.location = this.gamedata.locations.find(x => x.id == levelChanger.properties.levelChanger.destinationLocationId) as Location;
    componentRef.instance.items = this.items;
    componentRef.instance.game = this.game;
    componentRef.instance.parentLocation = levelChanger.properties.parentLocation;
    componentRef.instance.mapConfig = this.mapConfig;
    componentRef.instance.lootBoxConfig = this.lootBoxConfig;

    return componentRef.location.nativeElement;
  }

  private async addScript(scriptUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = scriptUrl;
      document.body.appendChild(script);
      script.onload = () => {
        console.log(`${scriptUrl} is loaded.`);
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
        console.log(`${styleUrl} is loaded.`);
        resolve();
      };
    });
  }
}
