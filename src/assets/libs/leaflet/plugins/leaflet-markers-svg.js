(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('leaflet')) :
  typeof define === 'function' && define.amd ? define(['leaflet'], factory) :
  (global = global || self, factory(global.L));
}(this, (function (L) { 'use strict';

  L = L && Object.prototype.hasOwnProperty.call(L, 'default') ? L['default'] : L;

  var markersSvgLayer = {
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    //
    // private: properties
    //
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    _map: null,
    _svgLayer: null,
    _context: null,

    // leaflet markers (used to getBounds)
    _markers: [],

    // icon images index
    _icons: {},

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    //
    // public: global
    //
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    addTo: function addTo(map) {
      map.addLayer(this);

      return this;
    },

    getBounds: function getBounds() {
      var bounds = new L.LatLngBounds();

      this._markers.forEach(function (marker) {
        bounds.extend(marker.getLatLng());
      });

      return bounds;
    },

    redraw: function redraw() {
      this._redraw(true);
    },

    clear: function clear() {
      this._markers = [];
      this._redraw(true);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    //
    // public: markers
    //
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    addMarker: function addMarker(marker) {
      var ref = this._addMarker(marker);
    },

    // add multiple markers (better for rBush performance)
    addMarkers: function addMarkers(markers) {
      var this$1 = this;

      var markerBoxes = [];
      var positionBoxes = [];

      let iconSize = markers[0].options.icon.options.iconSizeInit;
      markers[0].options.icon.options.iconSize = [iconSize[0] * markWidth, iconSize[1] * markWidth];
      let initIconAnchor = [markers[0].options.icon.options.iconSize[0] / 2, markers[0].options.icon.options.iconSize[1] / 2];

      markers.forEach(function (marker) {
        var ref = this$1._addMarker(marker, initIconAnchor);
        var markerBox = ref.markerBox;
        var positionBox = ref.positionBox;
        var isVisible = ref.isVisible;

        if (markerBox && isVisible) {
          markerBoxes.push(markerBox);
        }

        if (positionBox) {
          positionBoxes.push(positionBox);
        }
      });
    },

    removeMarker: function removeMarker(marker) {
      var latLng = marker.getLatLng();
      var isVisible = this._map.getBounds().contains(latLng);

      var positionBox = {
        minX: latLng.lng,
        minY: latLng.lat,
        maxX: latLng.lng,
        maxY: latLng.lat,
        marker: marker,
      };

      if (isVisible) {
        this._redraw(true);
      }
    },

    // remove multiple markers (better for rBush performance)
    removeMarkers: function removeMarkers(markers) {
      var this$1 = this;

      var hasChanged = false;

      markers.forEach(function (marker) {
        var latLng = marker.getLatLng();
        var isVisible = this$1._map.getBounds().contains(latLng);

        if (isVisible) {
          hasChanged = true;
        }
      });

      if (hasChanged) {
        this._redraw(true);
      }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    //
    // leaflet: default methods
    //
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    initialize: function initialize(options) {
      L.Util.setOptions(this, options);
    },

    // called by Leaflet on `map.addLayer`
    onAdd: function onAdd(map) {
      this._map = map;
      this._initCanvas();
      this.getPane().appendChild(this._svgLayer);

      map.on("moveend", this._reset, this);
      map.on("resize", this._reset, this);

      map.on("click", this._fire, this);
      map.on("mousemove", this._fire, this);

      if (map._zoomAnimated) {
        map.on("zoomanim", this._animateZoom, this);
      }
    },

    // called by Leaflet
    onRemove: function onRemove(map) {
      this.getPane().removeChild(this._svgLayer);

      map.off("click", this._fire, this);
      map.off("mousemove", this._fire, this);
      map.off("moveend", this._reset, this);
      map.off("resize", this._reset, this);

      if (map._zoomAnimated) {
        map.off("zoomanim", this._animateZoom, this);
      }
    },

    setOptions: function setOptions(options) {
      L.Util.setOptions(this, options);

      return this.redraw();
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    //
    // private: global methods
    //
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    _initCanvas: function _initCanvas() {
      var ref = this._map.getSize();
      var x = ref.x;
      var y = ref.y;
      var isAnimated = this._map.options.zoomAnimation && L.Browser.any3d;

      this._svgLayer = L.DomUtil.create(
        "svg"
      );

      L.DomUtil.addClass(
        this._svgLayer,
        ("leaflet-zoom-" + (isAnimated ? "animated" : "hide"))
      );
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    //
    // private: marker methods
    //
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    _addMarker: function _addMarker(marker, initIconAnchor) {
      if (marker.options.pane !== "markerPane" || !marker.options.icon) {
        console.error("This is not a marker", marker);

        return { markerBox: null, positionBox: null, isVisible: null };
      }

      // required for pop-up and tooltip
      marker._map = this._map;

      // add _leaflet_id property
      L.Util.stamp(marker);

      var latLng = marker.getLatLng();
      var isVisible = true//this._map.getBounds().contains(latLng);
      var ref = this._map.latLngToContainerPoint(latLng);
      var x = ref.x;
      var y = ref.y;
      var ref$1 = marker.options.icon.options;
      var iconSize = ref$1.iconSize;
      var iconAnchor = initIconAnchor ? initIconAnchor : ref$1.iconAnchor;

      var markerBox = {
        minX: x - iconAnchor[0],
        minY: y - iconAnchor[1],
        maxX: x + iconSize[0] - iconAnchor[0],
        maxY: y + iconSize[1] - iconAnchor[1],
        marker: marker,
      };

      var positionBox = {
        minX: latLng.lng,
        minY: latLng.lat,
        maxX: latLng.lng,
        maxY: latLng.lat,
        marker: marker,
      };

      if (true) {
        this._drawMarker(marker, { x: markerBox.minX, y: markerBox.minY });
      }

      this._markers.push(marker);

      return { markerBox: markerBox, positionBox: positionBox, isVisible: isVisible };
    },

    _drawMarker: function _drawMarker(marker, ref) {
      var this$1 = this;
      var x = ref.x;
      var y = ref.y;

      var ref$1 = marker.options.icon.options;
      var iconUrl = ref$1.iconUrl;

      if (marker.image) {
        this._drawImage(marker, { x: x, y: y });
      } else if (this._icons[iconUrl]) {
        marker.image = this._icons[iconUrl].image;

        if (this._icons[iconUrl].isLoaded) {
          this._drawImage(marker, { x: x, y: y });
        } else {
          this._icons[iconUrl].elements.push({ marker: marker, x: x, y: y });
        }
      } else {
        var image = new Image();
        image.src = iconUrl;
        marker.image = image;

        this._icons[iconUrl] = {
          image: image,
          isLoaded: false,
          elements: [{ marker: marker, x: x, y: y }],
        };

        image.onload = function () {
          this$1._icons[iconUrl].isLoaded = true;
          this$1._icons[iconUrl].elements.forEach(function (ref) {
            var marker = ref.marker;
            var x = ref.x;
            var y = ref.y;

            this$1._drawImage(marker, { x: x, y: y });
          });
        };
      }
    },

    _drawImage: function _drawImage(marker, ref) {
      var x = ref.x;
      var y = ref.y;

      var ref$1 = marker.options.icon.options;
      var rotationAngle = ref$1.rotationAngle;
      var iconAnchor = ref$1.iconAnchor;
      var iconSize = ref$1.iconSize;
      var angle = rotationAngle || 0;
    },

    _redraw: function _redraw(clear) {
      var this$1 = this;

      if (!this._map) { return; }

      var mapBounds = this._map.getBounds();
      var mapBoundsBox = {
        minX: mapBounds.getWest(),
        minY: mapBounds.getSouth(),
        maxX: mapBounds.getEast(),
        maxY: mapBounds.getNorth(),
      };

      // draw only visible markers
      var markers = [];
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    //
    // private: event methods
    //
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    _reset: function _reset() {
      var topLeft = this._map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(this._svgLayer, topLeft);

      var ref = this._map.getSize();
      var x = ref.x;
      var y = ref.y;
      this._svgLayer.width = x;
      this._svgLayer.height = y;

      this._redraw();
    },

    _fire: function _fire(event) {
      var ref = event.containerPoint;
      var x = ref.x;
      var y = ref.y;
    },

    _animateZoom: function _animateZoom(event) {
      var scale = this._map.getZoomScale(event.zoom);
      var offset = this._map._latLngBoundsToNewLayerBounds(
        this._map.getBounds(),
        event.zoom,
        event.center
      ).min;

      L.DomUtil.setTransform(this._svgLayer, offset, scale);
    },
  };

  L.MarkersSvgLayer = L.Layer.extend(markersSvgLayer);

})));
