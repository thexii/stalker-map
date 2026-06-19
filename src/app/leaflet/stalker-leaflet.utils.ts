import type { LatLngBoundsExpression, LatLngExpression, Map } from 'leaflet';
import * as L from 'leaflet';

import type { StalkerMap } from './stalker-leaflet.types';

export function asStalkerMap(map: Map): StalkerMap {
    return map as StalkerMap;
}

export function pixelBounds(height: number, width: number): LatLngBoundsExpression {
    return [[0, 0], [height, width]];
}

export function pixelCenter(height: number, width: number): LatLngExpression {
    return [height / 2, width / 2];
}

export function asLatLngBounds(bounds: number[][]): LatLngBoundsExpression {
    return bounds as LatLngBoundsExpression;
}

export function asLatLngExpressions(bounds: number[][]): L.LatLngExpression[] {
    return bounds as L.LatLngExpression[];
}
