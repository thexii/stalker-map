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

declare const L: any;
declare var markWidth: number;

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [HeaderComponent, TranslateModule],
  templateUrl: './map.component.html',
  styleUrls: [
    './map.component.inventory.base.scss',
    './map.component.inventory.items.scss',
    './map.component.inventory.quest.scss',
    './map.component.inventory.artefacts.scss',
    './map.component.inventory.weapon.scss',
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
      console.log('remove');
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
        zoom: 1,
        minZoom: gameConfig.minZoom,
        maxZoom: gameConfig.maxZoom,
        crs: L.CRS.Simple,
        markerZoomAnimation: !0,
        zoomAnimation: !0,
        zoomControl: !1,
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

    this.canvasLayer = new L.MarkersCanvas();
    this.canvasLayer.addTo(this.map);

    this.map.redraw = () => {
        this.canvasLayer.redraw();
    };

    this.map.on('zoomend', () => {
        markWidth = 3 * Math.pow(2, this.map.getZoom());
        document.documentElement.style.setProperty(
            `--map-mark-width`,
`${markWidth}px`);
    });

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
        this.map.redraw();
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

    for (let markType of stuffTypes) {
      let stuffsAtLocation = this.gamedata.stuffs.filter(
        (u: { typeId: number }) => u.typeId == markType.id
      );

      if (stuffsAtLocation.length > 0) {
        let geoMarks: any = {};
        geoMarks.type = 'FeatureCollection';
        geoMarks.features = [];

        for (let stuffModel of stuffsAtLocation) {
          let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == stuffModel.locationId) as Location;

          let markerX: number = 0.5 - location.xShift + stuffModel.x / location.widthInMeters;
          let markerY: number = 0.5 - location.yShift + stuffModel.z / location.heightInMeters;

          let dx: number = location.x2 - location.x1;
          let dy: number = location.y1 - location.y2;

          let stuff = L.marker([location.y2 + markerY * dy, location.x1 + markerX * dx], {
            icon: markType.icon,
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
                console.log(bugged);
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
          stuff.bindPopup((p: any) => this.createStashPopup(p)).openPopup(),
            geoMarks.features.push(stuff);
        }

        this.addToCanvas(geoMarks, markType);
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

    let geoMarks: any = {};
    geoMarks.type = 'FeatureCollection';
    geoMarks.features = [];

    for (let lootBox of this.gamedata.lootBoxes) {
      let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == lootBox.locationId) as Location;

      let markerX: number = 0.5 - location.xShift + lootBox.x / location.widthInMeters;
      let markerY: number = 0.5 - location.yShift + lootBox.z / location.heightInMeters;

      let dx: number = location.x2 - location.x1;
      let dy: number = location.y1 - location.y2;

      let lootBoxMarker = L.marker([location.y2 + markerY * dy, location.x1 + markerX * dx], {
        icon: lootBoxType.icon,
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
        geoMarks.features.push(lootBoxMarker);
    }

    this.addToCanvas(geoMarks, lootBoxType);
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
        let geoMarks: any = {};
        geoMarks.type = 'FeatureCollection';
        geoMarks.features = [];

        for (let mark of marks) {
          let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == mark.locationId) as Location;

          let markerX: number = 0.5 - location.xShift + mark.x / location.widthInMeters;
          let markerY: number = 0.5 - location.yShift + mark.y / location.heightInMeters;

          let dx: number = location.x2 - location.x1;
          let dy: number = location.y1 - location.y2;

          let marker = L.marker([location.y2 + markerY * dy, location.x1 + markerX * dx], {
            icon: markType.icon,
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
          geoMarks.features.push(marker);
        }

        this.addToCanvas(geoMarks, markType);
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

    let anomalies: any = {};
    let anomaliesNoArt: any = {};

    anomalies.type = 'FeatureCollection';
    anomaliesNoArt.type = 'FeatureCollection';

    anomalies.features = [];
    anomaliesNoArt.features = [];

    for (let zone of this.gamedata.anomalyZones) {
      let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == zone.locationId) as Location;

      let markerX: number = 0.5 - location.xShift + zone.x / location.widthInMeters;
      let markerY: number = 0.5 - location.yShift + zone.y / location.heightInMeters;

      let dx: number = location.x2 - location.x1;
      let dy: number = location.y1 - location.y2;

      const defaultType: string = 'anomaly-zone';

      let canvasMarker;
      if (
        zone.anomaliySpawnSections != null &&
        zone.anomaliySpawnSections.length > 0
      ) {
        canvasMarker = L.marker([location.y2 + markerY * dy, location.x1 + markerX * dx], {
          icon: anomalyZoneIcon.icon,
        });
      } else {
        canvasMarker = L.marker([location.y2 + markerY * dy, location.x1 + markerX * dx], {
          icon: anomalyZoneNoArtIcon.icon,
        });
      }

      canvasMarker.properties = {};
      canvasMarker.properties.name = zone.name ? zone.name : defaultType;
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

        anomalies.features.push(canvasMarker);

        let location = this.locations.locations.find(
          (x: { id: any }) => x.id == zone.locationId
        );
        if (location) {
          canvasMarker.properties.locationUniqueName = location.uniqueName;
          canvasMarker.properties.locationName = location.name;
        }
      } else {
        anomaliesNoArt.features.push(canvasMarker);
        canvasMarker.properties.ableToSearch = false;
      }

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
      this.addToCanvas(anomalies, anomalyZoneIcon);

      if (anomaliesNoArt.features.length > 0) {
        this.addToCanvas(anomaliesNoArt, anomalyZoneNoArtIcon);
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

    let traders: any = {};
    traders.type = 'FeatureCollection';
    traders.features = [];

    for (let trader of this.gamedata.traders) {
      let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == trader.locationId) as Location;

      let markerX: number = 0.5 - location.xShift + trader.x / location.widthInMeters;
      let markerY: number = 0.5 - location.yShift + trader.y / location.heightInMeters;

      let dx: number = location.x2 - location.x1;
      let dy: number = location.y1 - location.y2;

      let canvasMarker = L.marker([location.y2 + markerY * dy, location.x1 + markerX * dx], {
        icon: traderIcon.icon,
      });

      canvasMarker.properties = {};
      canvasMarker.properties.traderConfig = trader;
      canvasMarker.properties.name = trader.profile.name;
      canvasMarker.properties.typeUniqueName = traderIcon.uniqueName;
      traders.features.push(canvasMarker);
      canvasMarker.properties.ableToSearch = false;
      canvasMarker.feature = {};
      canvasMarker.feature.properties = {};
      this.createProperty(
        canvasMarker.feature.properties,
        'search',
        [trader.profile.name + '.name'],
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
          { maxWidth: 1400 }
        )
        .openPopup();
    }

    this.addToCanvas(traders, traderIcon);
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

    let stalkers: any = {};
    stalkers.type = 'FeatureCollection';
    stalkers.features = [];

    for (let stalker of this.gamedata.stalkers) {
      let location: Location = this.gamedata.locations.find((x: { id: any; }) => x.id == stalker.locationId) as Location;

      let markerX: number = 0.5 - location.xShift + stalker.x / location.widthInMeters;
      let markerY: number = 0.5 - location.yShift + stalker.y / location.heightInMeters;

      let dx: number = location.x2 - location.x1;
      let dy: number = location.y1 - location.y2;

      let canvasMarker = L.marker([location.y2 + markerY * dy, location.x1 + markerX * dx], {
        icon: stalker.alive ? (stalker.hasUniqueItem ? stalkerIconQuestItem.icon : stalkerIcon.icon) : stalkerIconDead.icon,
      });

      canvasMarker.properties = {};
      canvasMarker.properties.stalker = stalker;
      canvasMarker.properties.name = stalker.profile.name;
      canvasMarker.properties.typeUniqueName = stalkerIcon.uniqueName;
      stalkers.features.push(canvasMarker);
      canvasMarker.properties.ableToSearch = false;
      canvasMarker.feature = {};
      canvasMarker.feature.properties = {};
      this.createProperty(
        canvasMarker.feature.properties,
        'search',
        [stalker.profile.name],
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

    this.addToCanvas(stalkers, stalkerIcon);
  }

  private addToCanvas(geoMarks: any, markType: any) {
    let marksLayer = L.geoJSON(geoMarks);
    marksLayer.ableToSearch = markType.ableToSearch ?? false;
    marksLayer.isShowing = false;
    marksLayer.markers = geoMarks.features;
    marksLayer.name = markType.uniqueName;
    this.layers[markType.name] = marksLayer;

    marksLayer.hide = (layer: { isShowing: boolean; markers: any }) => {
      if (layer.isShowing) {
        this.canvasLayer.removeMarkers(layer.markers);

        layer.isShowing = false;
      }
    };

    marksLayer.show = (layer: { isShowing: boolean; markers: any }) => {
      if (!layer.isShowing && layer.markers?.length > 0) {
        this.canvasLayer.addMarkers(layer.markers);

        layer.isShowing = true;
      }
    };

    marksLayer.show(marksLayer);
  }

  private createAnomalyZoneTooltip(zone: {
    properties: { name: any; description: any };
    description: any;
  }) {
    let html = `<div class="header-tip"><p class="p-header">${
      zone.properties.name != null
        ? this.translate.instant(zone.properties.name)
        : this.translate.instant('anomaly-zone')
    }</p></div>`;
    if (zone.description) {
      html += `<div class="tooltip-text"><p>${zone.properties.description}</p></div>`;
    }

    return html;
  }

  private createeAnomalyZonePopup(zone: any) {
    const analytics = getAnalytics();
    logEvent(analytics, 'open-anomaly-zone-popup', {
      type: zone.properties.typeUniqueName,
      location: zone.properties.locationUniqueName,
      coordinates: `${zone._latlng.lat} ${zone._latlng.lng}`,
      game: this.game,
      language: this.translate.currentLang,
    });

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
