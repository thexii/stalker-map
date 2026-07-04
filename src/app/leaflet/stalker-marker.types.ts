import type { LayerGroup } from 'leaflet';

import type { LevelChanger } from '../models/level-changer.model';
import type { LootBox } from '../models/loot-box/loot-box-section.model';
import type { StuffModel } from '../models/stuff/stuff.model';
import type { TraderModel } from '../models/trader/trader.model';

import type { StalkerLayerGroup, StalkerMarker, StalkerSearchLocation } from './stalker-leaflet.types';

export type { MarkerCoordinates } from './stalker-leaflet.types';
import type { MarkerCoordinates } from './stalker-leaflet.types';

export interface StalkerMarkerPropertiesBase {
    coordinates?: MarkerCoordinates;
    typeUniqueName?: string;
    name?: string;
    locationUniqueName?: string;
    locationName?: string;
    ableToSearch?: boolean;
    itemTypes?: string[];
    markType?: string;
    destination?: string;
    markerToSearch?: StalkerSearchLocation;
    description?: string;
}

export interface StalkerStuffMarkerProperties extends StalkerMarkerPropertiesBase {
    stuff: StuffModel;
}

export interface StalkerTraderMarkerProperties extends StalkerMarkerPropertiesBase {
    traderConfig: TraderModel;
}

export interface StalkerLevelChangerMarkerProperties extends StalkerMarkerPropertiesBase {
    levelChanger: LevelChanger;
    destination?: string;
}

export interface StalkerLootBoxMarkerProperties extends StalkerMarkerPropertiesBase {
    lootBox: LootBox & { locationId?: number };
}

export type StalkerMarkerProperties =
    | StalkerStuffMarkerProperties
    | StalkerTraderMarkerProperties
    | StalkerLevelChangerMarkerProperties
    | StalkerLootBoxMarkerProperties
    | (StalkerMarkerPropertiesBase & Record<string, unknown>);

export function isStalkerMarker(layer: unknown): layer is StalkerMarker {
    return typeof layer === 'object'
        && layer !== null
        && 'properties' in layer
        && typeof (layer as StalkerMarker).properties === 'object';
}

export function getLayerMarkers(layer: { _layers?: Record<string, unknown> }): StalkerMarker[] {
    if (!layer._layers) {
        return [];
    }

    return Object.values(layer._layers).filter(isStalkerMarker);
}

export function hasLevelChangerProperties(
    properties: StalkerMarkerProperties
): properties is StalkerLevelChangerMarkerProperties {
    return 'levelChanger' in properties && properties.levelChanger != null;
}

export function asStalkerLayerGroup(layer: LayerGroup): StalkerLayerGroup {
    return layer as StalkerLayerGroup;
}

export function findLayerMarker(
    layer: { _layers?: Record<string, unknown> },
    predicate: (marker: StalkerMarker) => boolean
): StalkerMarker | undefined {
    return getLayerMarkers(layer).find(predicate);
}
