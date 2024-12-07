import { InventoryItem } from "../inventory-item.model";

export class MapHoc {
  public widthInMeters: number;
  public heightInMeters: number;

  public markers: Marker[];
  public stuffs: Stuff[];
  public anomalyFields: Marker[];
  public artefactSpawners: ArtefactSpawner[];
  public artefactSpawnerData: ArtefactSpawnerConfig;
}

export class ObjectAtLocationHoc {
  public x: number;
  public y: number;
  public z: number;
  public dlcs: string[];
}

export class Marker extends ObjectAtLocationHoc {
  public title: string;
  public description: string;
  public type: string;
  public radius: number;
}

export class Stuff extends ObjectAtLocationHoc {
  public items: InventoryItem[];
}

export class ArtefactSpawner extends ObjectAtLocationHoc {
  public spawner: string;
}

export class ArtefactSpawnerConfig {
  public configs: ArtefactSpawnerType[];
  public artefacts: Artefact[];
}

export class ArtefactSpawnerType {
  public name: string;
  public settings: ArtefactSpawnerSetting[];
  public excludeRules: string[];
  public listOfArtifacts: string[];
  public useListOfArtifacts: boolean;
}

export class ArtefactSpawnerSetting {
  public name: string;
  public count: number;
  public radius: number;
  public minCooldown: number;
  public maxCooldown: number;
  public spawnChanceBase: number;
  public spawnChanceBonus: number;
  public rarityChance: number[];
}

export class Artefact {
  public name: string;
  public weight: number;
  public rarity: string;
  public detectorRequired: boolean;
  public artifactType: string;
  public archiartifactType: string;
  public lifeTime: number;
  public cost: number;
}
