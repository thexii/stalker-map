import * as L from 'leaflet';

interface KeepMapSizeRegistry {
    markers: Set<any>;
    handler: () => void;
}

const keepMapSizeRegistries = new WeakMap<object, KeepMapSizeRegistry>();
const EMPTY_HIT_CELL: any[] = [];
const HIT_GRID_SIZE = 64;

let canvasIconClass: any;
let canvasMarkerClass: any;
let canvasRendererPatched = false;

function updateMarkerDrawSize(marker: any): void {
    const map = marker._map;
    const iconWrapper = marker.options?.icon;
    const canvasIcon = iconWrapper?.icon;

    if (!map || !canvasIcon) {
        return;
    }

    const imageFactor = canvasIcon.options?.imageFactor ?? 1;
    const baseRadius = marker.options.radius;
    const scaleFactor = map.scaleFactor ?? 1;

    const calculatedRadius = iconWrapper.keepMapSize
        ? baseRadius * Math.pow(2, map._zoom)
        : baseRadius;

    marker._radius = calculatedRadius * scaleFactor;
    marker._radius2 = marker._radius * 2;
    marker._drawRadius = marker._radius2 * imageFactor;
    marker._drawRadiusHalf = marker._radius * imageFactor;
}

export function refreshCanvasMarkerSize(marker: any): void {
    if (!marker?._map) {
        return;
    }

    updateMarkerDrawSize(marker);

    if (typeof marker._project === 'function') {
        marker._project();
    }

    if (typeof marker._updateBounds === 'function') {
        marker._updateBounds();
    }

    marker._renderer?._requestRedraw?.(marker);
}

function redrawKeepMapSizeRenderers(markers: Set<any>): void {
    const renderers = new Set<any>();

    for (const marker of markers) {
        if (!marker._map) {
            continue;
        }

        updateMarkerDrawSize(marker);

        if (typeof marker._project === 'function') {
            marker._project();
        }

        if (typeof marker._updateBounds === 'function') {
            marker._updateBounds();
        }

        if (marker._renderer) {
            renderers.add(marker._renderer);
        }
    }

    for (const renderer of renderers) {
        renderer._hitGridDirty = true;
        renderer._redrawBounds = null;
        if (typeof renderer._redraw === 'function') {
            renderer._redraw();
        }
    }
}

function registerKeepMapSizeMarker(marker: any, map: any): void {
    let registry = keepMapSizeRegistries.get(map);

    if (!registry) {
        registry = {
            markers: new Set(),
            handler: () => redrawKeepMapSizeRenderers(registry!.markers),
        };

        map.on('zoomend', registry.handler);
        keepMapSizeRegistries.set(map, registry);
    }

    registry.markers.add(marker);
    updateMarkerDrawSize(marker);
}

function unregisterKeepMapSizeMarker(marker: any, map: any): void {
    const registry = keepMapSizeRegistries.get(map);
    if (!registry) {
        return;
    }

    registry.markers.delete(marker);

    if (registry.markers.size === 0) {
        map.off('zoomend', registry.handler);
        keepMapSizeRegistries.delete(map);
    }
}

function rebuildHitGrid(renderer: any): void {
    const grid = new Map<string, any[]>();

    for (let order = renderer._drawFirst; order; order = order.next) {
        const layer = order.layer;
        if (!layer?.options?.interactive || layer.doNotRender) {
            continue;
        }

        const bounds = layer._pxBounds;
        if (!bounds?.min || !bounds?.max) {
            continue;
        }

        const x0 = Math.floor(bounds.min.x / HIT_GRID_SIZE);
        const y0 = Math.floor(bounds.min.y / HIT_GRID_SIZE);
        const x1 = Math.floor(bounds.max.x / HIT_GRID_SIZE);
        const y1 = Math.floor(bounds.max.y / HIT_GRID_SIZE);

        for (let x = x0; x <= x1; x++) {
            for (let y = y0; y <= y1; y++) {
                const key = `${x}:${y}`;
                let cell = grid.get(key);
                if (!cell) {
                    cell = [];
                    grid.set(key, cell);
                }
                cell.push(layer);
            }
        }
    }

    renderer._hitGrid = grid;
    renderer._hitGridDirty = false;
}

function layersNearPoint(renderer: any, point: { x: number; y: number }): any[] {
    if (renderer._hitGridDirty !== false || !renderer._hitGrid) {
        rebuildHitGrid(renderer);
    }

    const key = `${Math.floor(point.x / HIT_GRID_SIZE)}:${Math.floor(point.y / HIT_GRID_SIZE)}`;
    return renderer._hitGrid.get(key) || EMPTY_HIT_CELL;
}

export function createCanvasIconClass(): any {
    if (canvasIconClass) {
        return canvasIconClass;
    }

    canvasIconClass = L.Icon.extend({
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

            if (this.options.imageFactor == null) {
                this.options.imageFactor = 1;
            }

            if (options.color) {
                fetch(options.iconUrl).then((response) => {
                    if (response.ok) {
                        response.text().then((svg: string) => {
                            const colored = svg.replace(/#FFFFFF/gm, options.color);
                            const svgBlob = new Blob([colored], { type: 'image/svg+xml' });
                            this._image.src = URL.createObjectURL(svgBlob);
                        });
                    }
                });
            } else {
                this._image.src = options.iconUrl;
            }
        },
    });

    return canvasIconClass;
}

export function createCanvasMarkerClass(): any {
    if (canvasMarkerClass) {
        return canvasMarkerClass;
    }

    canvasMarkerClass = L.CircleMarker.extend({
        _updatePath: function () {
            this._renderer._updateSvgMarker(this);
        },

        setOpacity: function (opacity: number) {
            this.setStyle({
                opacity: opacity,
                fillOpacity: opacity,
            });
        },

        onAdd: function (map: any) {
            L.CircleMarker.prototype.onAdd.call(this, map);

            if (this.options.icon) {
                updateMarkerDrawSize(this);

                if (this.options.icon.keepMapSize) {
                    registerKeepMapSizeMarker(this, map);
                }
            }

            return this;
        },

        onRemove: function (map: any) {
            if (this.options.icon?.keepMapSize) {
                unregisterKeepMapSizeMarker(this, map);
            }

            return L.CircleMarker.prototype.onRemove.call(this, map);
        },
    });

    return canvasMarkerClass;
}

export function createCanvasRenderer(): any {
    patchCanvasRenderer();
    return L.canvas();
}

export function patchCanvasRenderer(): void {
    if (!canvasRendererPatched) {
        const canvasProto = L.Canvas.prototype as any;
        const originalRequestRedraw = canvasProto._requestRedraw;
        const originalRedraw = canvasProto._redraw;
        const originalOnZoomEnd = canvasProto._onZoomEnd;

        L.Canvas.include({
            _updateSvgMarker: function (layer: any) {
                if (!this._drawing || layer._empty() || layer.doNotRender) {
                    return;
                }

                const img = layer.options?.icon?.icon?._image;
                if (!img?.complete || img.naturalWidth === 0 || !layer._drawRadius) {
                    return;
                }

                try {
                    this._ctx.globalAlpha = layer.options.opacity;

                    const x = layer._point.x - layer._drawRadiusHalf;
                    const y = layer._point.y - layer._drawRadiusHalf;

                    this._ctx.drawImage(
                        img,
                        x,
                        y,
                        layer._drawRadius,
                        layer._drawRadius
                    );
                } catch {
                    // Image may still be decoding; skip this frame.
                }
            },

            _requestRedraw: function (layer: any) {
                this._hitGridDirty = true;
                return originalRequestRedraw.call(this, layer);
            },

            // Zoom and pan reproject markers without _requestRedraw, which left the
            // hit grid on the previous view. Hover then misses every marker.
            _redraw: function () {
                this._hitGridDirty = true;
                return originalRedraw.call(this);
            },

            _onZoomEnd: function () {
                const result = originalOnZoomEnd.call(this);
                this._hitGridDirty = true;
                return result;
            },

            _onClick: function (e: any) {
                const point = this._map.mouseEventToLayerPoint(e);
                let clickedLayer: any;

                for (const layer of layersNearPoint(this, point)) {
                    if (layer.options.interactive && layer._containsPoint(point)) {
                        if (!(e.type === 'click' || e.type === 'preclick') || !this._map._draggableMoved(layer)) {
                            clickedLayer = layer;
                        }
                    }
                }

                this._fireEvent(clickedLayer ? [clickedLayer] : false, e);
            },

            _handleMouseHover: function (e: any, point: any) {
                if (this._mouseHoverThrottled) {
                    return;
                }

                let candidateHoveredLayer: any;

                for (const layer of layersNearPoint(this, point)) {
                    if (layer.options.interactive && layer._containsPoint(point)) {
                        candidateHoveredLayer = layer;
                    }
                }

                if (candidateHoveredLayer !== this._hoveredLayer) {
                    this._handleMouseOut(e);

                    if (candidateHoveredLayer) {
                        L.DomUtil.addClass(this._container, 'leaflet-interactive');
                        this._fireEvent([candidateHoveredLayer], e, 'mouseover');
                        this._hoveredLayer = candidateHoveredLayer;
                    }
                }

                this._fireEvent(this._hoveredLayer ? [this._hoveredLayer] : false, e);

                this._mouseHoverThrottled = true;
                setTimeout(L.Util.bind(function (this: any) {
                    this._mouseHoverThrottled = false;
                }, this), 32);
            },
        });

        canvasRendererPatched = true;
    }
}
