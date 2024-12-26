import { Marker } from './../../models/hoc/map-hoc';
import {
  Component,
  ComponentFactoryResolver,
  HostListener,
  ViewChild,
  ViewContainerRef,
  ViewEncapsulation,
} from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Title, Meta } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';
import { MapService } from '../../services/map.service';
import { Item } from '../../models/item.model';
import { MapConfig } from '../../models/gamedata/map-config';
import { MapHoc } from '../../models/hoc/map-hoc';
import { Point } from '../../models/point.model';
import { HocStuffComponent } from '../stuff/hoc-stuff/hoc-stuff.component';
import { ArtefactSpawnerPopupComponent } from './artefact-spawner-popup/artefact-spawner-popup.component';
import { getAnalytics, logEvent } from 'firebase/analytics';

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

  constructor(
    protected translate: TranslateService,
    protected route: ActivatedRoute,
    protected resolver: ComponentFactoryResolver,
    protected titleService: Title,
    protected mapService: MapService,
    protected meta: Meta,
    protected deviceService: DeviceDetectorService
  ) {}
  showHideAll($event: Event) {
    throw new Error('Method not implemented.');
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

  private loadMap(gameData: MapHoc, gameConfig: MapConfig): void {
    this.gamedata = gameData;
    this.mapConfig = gameConfig;

    this.gamedata.widthInMeters = gameConfig.mapBounds[1][1] - gameConfig.mapBounds[0][1];
    this.gamedata.heightInMeters = gameConfig.mapBounds[1][0] - gameConfig.mapBounds[0][0];

    console.log(this.gamedata);

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

    let scaleFactor = width / this.gamedata.widthInMeters;
    console.log(scaleFactor);

    let customCrs = L.extend({}, L.CRS.Simple, {
      transformation: new L.Transformation(scaleFactor, 0, -scaleFactor, 0),
      //infinite: false
    });

    this.map = L.map('map', {
      center: [height / 2, width / 2],
      zoom: gameConfig.startZoom,
      minZoom: gameConfig.minZoom,
      maxZoom: gameConfig.maxZoom,
      crs: customCrs,
      markerZoomAnimation: !0,
      zoomAnimation: !0,
      zoomControl: !1,
    });

    L.TileLayer.CustomCoords = L.TileLayer.extend({
        createTile: function (coords: any) {
            const tile = document.createElement('div');
            tile.style.outline = '1px solid green';
            tile.style.fontWeight = 'bold';
            tile.style.fontSize = '14pt';
            tile.style.color = 'white';
            tile.innerHTML = [coords.z, coords.x, coords.y].join('/');
            return tile;
          },
    });

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

        L.marker([gameConfig.mapBounds[0][0], gameConfig.mapBounds[0][1]]).addTo(this.map);
        L.marker([gameConfig.mapBounds[1][0], gameConfig.mapBounds[1][1]]).addTo(this.map);

      new L.TileLayer.CustomCoords(`/assets/images/maps/hoc/tiles/{z}/{y}/{x}.jpg`, {
        minZoom: gameConfig.minZoom,
        maxZoom: gameConfig.maxZoom,
        bounds: b,
        //tileSize: 256
      }).addTo(this.map);

      /*L.imageOverlay(
        `/assets/images/maps/hoc/${gameConfig.globalMapFileName}`,
        b
      ).addTo(this.map);*/
    }

    this.svgMarker = this.setCanvasMarkers();

    if (this.gamedata.markers && this.gamedata.markers.length > 0) {
      this.addMarkers();
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

    if (
      this.gamedata.artefactSpawners &&
      this.gamedata.artefactSpawners.length > 0
    ) {
      this.addArtefactSpawners();
    }

    const analytics = getAnalytics();
    logEvent(analytics, 'open-map', {
      game: 'hoc',
      language: this.translate.currentLang,
    });

    let ruler: any = null;
    if (gameConfig.rulerEnabled) {
      ruler = this.mapService.addRuler(this.map, 1, 8000);
    }

    document.documentElement.style.setProperty(
      '--inventory-cell-size',
      `${130}px`
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
      this.layerContoller = L.control.customLayers(
        null,
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
    this.layerContoller = L.control.customLayers(
      null,
      Object.fromEntries(layersToControl),
      { overlaysListTop: this.overlaysListTop }
    );
    this.layerContoller.addTo(this.map);
    this.createSearchController();
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


    this.map.on('zoomend', () => {
      console.log(this.map.getZoom());
  });
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

        if (this.options.overlaysListTop) {
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

    L.control.customLayers = function (
      baseLayers: any,
      overlays: any,
      options: any
    ) {
      return new L.Control.CustomLayers(baseLayers, overlays, options);
    };
  }

  private addMarkers(): void {
    let markerImages = [
      {
        name: 'EMarkerType::Location',
        icon: new this.svgIcon({
          iconUrl:
            '/assets/images/s2/Markers/T_LocationOrigin_NotActive_Shadow.png',
          iconAnchor: [0, 0],
        }),
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
        name: 'EMarkerType::Hub',
        icon: new this.svgIcon({
          iconUrl:
            '/assets/images/s2/Markers/Texture_Camp_NotActive_General_Shadow.png',
          iconAnchor: [0, 0],
        }),
      },
    ];
    let markerTypes: string[] = [];
    let markerLayers: any[] = [];
    let circleMarkers: any[] = [];

    for (let data of this.gamedata.markers) {
      let icon = markerImages.find((x: any) => x.name == data.type);

      let marker = new this.svgMarker(
        [data.z, data.x],
        { renderer: this.canvasRenderer, icon: icon, radius: 40 }
      );
      marker.name = data.title;
      marker.description = data.description;
      marker.feature = {};
      marker.feature.properties = {};

      if (!markerTypes.includes(data.type)) {
        markerTypes.push(data.type);
      }

      let dataToSearch: string[] = [];

      if (data.title) {
        dataToSearch.push(data.title);
      }

      if (data.description) {
        dataToSearch.push(data.description);
      }

      if (dataToSearch.length > 0) {
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

      markerLayers.push(marker);
    }

    if (markerLayers.length > 0) {
      this.addLayerToMap(L.layerGroup(markerLayers), 'sub-location', true);
    }

    if (circleMarkers.length > 0) {
      this.addLayerToMap(L.layerGroup(circleMarkers), 'circles', false);
    }

    console.log(markerTypes);
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
        { renderer: this.canvasRenderer, icon: icon, radius: 20 }
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
        iconUrl: '/assets/images/svg/marks/stuff.svg',
        iconAnchor: [0, 0],
      }),
      keepMapSize: true,
      radius: 2.5,
    };

    let markers = [];

    for (let data of this.gamedata.stuffs) {
      let marker = new this.svgMarker(
        [data.z, data.x],
        { renderer: this.canvasRenderer, icon: stuffIcon }
      ).addTo(this.map);
      marker.name = 'stuff_at_location';
      marker.data = data;
      marker.feature = {};
      marker.feature.properties = {};

      let localesToFind: string[] = [marker.name, markers.length.toString()];

      if (data.items && data.items.length > 0) {
        let itemsToFind: any[] = [];

        data.items.forEach((element: any) => {
          let item = this.items.find((y) => y.uniqueName == element.uniqueName);

          if (item) {
            itemsToFind.push(item?.localeName);
            itemsToFind.push(`synonyms.${item?.uniqueName}`);
          }
        });

        localesToFind.push(...itemsToFind);
      }

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
          this.createStashPopup(
            p,
            this.container,
            this.game,
            this.items,
            false
          ),
        { minWidth: 912 }
      );

      markers.push(marker);
    }

    if (markers.length > 0) {
      this.addLayerToMap(L.layerGroup(markers), 'stuff', true);
    }
  }

  public addStashes(): void {
    let stuffIcon = {
      icon: new this.svgIcon({
        iconUrl: '/assets/images/svg/marks/stash.svg',
        iconAnchor: [0, 0],
      }),
      keepMapSize: true,
      radius: 3,
    };

    let richStuffIcon = {
      icon: new this.svgIcon({
        iconUrl: '/assets/images/svg/marks/highlight-stahs.svg',
        iconAnchor: [0, 0],
      }),
      keepMapSize: true,
      radius: 3,
    };

    let markers = [];

    for (let data of this.gamedata.stashes) {
      let isRich = false;

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

      let marker = new this.svgMarker(
        [data.z, data.x],
        {
          renderer: this.canvasRenderer,
          icon: isRich ? richStuffIcon : stuffIcon,
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

      //marker.bindPopup((p: any) => this.createStashPopup(p, this.container, this.game, this.items, false), { minWidth: 912 });

      markers.push(marker);
    }

    if (markers.length > 0) {
      this.addLayerToMap(L.layerGroup(markers), 'stash', true);
    }
  }

  public addArtefactSpawners(): void {
    let stuffIcon = {
      icon: new this.svgIcon({
        iconUrl: '/assets/images/svg/marks/anomaly.svg',
        iconAnchor: [0, 0],
      }),
      keepMapSize: true,
      radius: 5,
    };

    let markers = [];

    for (let data of this.gamedata.artefactSpawners) {
      let marker = new this.svgMarker(
        [data.z, data.x],
        { renderer: this.canvasRenderer, icon: stuffIcon }
      ).addTo(this.map);
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
        { minWidth: 910, maxWidth: 928 }
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

    const factory = this.resolver.resolveComponentFactory(
      ArtefactSpawnerPopupComponent
    );

    const componentRef = this.container.createComponent(factory);
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

    const factory = this.resolver.resolveComponentFactory(HocStuffComponent);

    const componentRef = container.createComponent(factory);
    componentRef.instance.stuff = stash.data;
    componentRef.instance.game = game;
    componentRef.instance.allItems = allItems;
    componentRef.instance.stuffType = 'stuff';
    componentRef.instance.isUnderground = isUnderground;

    return componentRef.location.nativeElement;
  }

  private setCanvasMarkers(): any {
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

          if (layer.options.icon.keepMapSize) {
            if (layer.options.zoom != layer._map._zoom) {
              layer.options.zoom = layer._map._zoom;
              layer._radius =
                layer.options.icon.radius * Math.pow(2, layer.options.zoom);
            }
          }

          width = height = layer._radius * 2;
          x = layer._point.x - layer._radius;
          y = layer._point.y - layer._radius;

          /*if (layer.options.dontKeepMapSize) {*/
          /*}
          else {
            if (layer.options.zoom != this._zoom) {
              layer._radius = (markWidth / 2) * layer.options.icon.options.iconSizeInit[0];
              layer.options.zoom = this._zoom;
            }

            x = layer._point.x - layer.options.icon.shiftX * markWidth;
            y = layer._point.y - layer.options.icon.shiftY * markWidth;
            width = layer.options.icon.options.iconSizeInit[0] * markWidth;
            height = layer.options.icon.options.iconSizeInit[1] * markWidth;
          }*/

          this._ctx.drawImage(
            layer.options.icon.icon._image,
            x,
            y,
            width,
            height
          );
        } catch (ex) {
          console.log(layer);
          console.log(ex);
        }
      },
    });

    this.canvasRenderer = L.canvas();

    this.svgIcon = L.Icon.extend({
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
        this._image.src = options.iconUrl;
      },
    });

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
    });
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
