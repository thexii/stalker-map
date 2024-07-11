import { AnomalyZone } from "./anomaly-zone";
import { Location } from "./location.model";
import { LootBoxCluster } from "./loot-box/loot-box-cluster.model";
import { Mark } from "./mark.model";
import { SmartTerrain } from "./smart-terrain.model";
import { Stalker } from "./stalker.model";
import { StuffModel } from "./stuff";
import { TraderModel } from "./trader";

export class Map {
  public id: number;
  public uniqueName: string;
  public build: string;
  public stuffs: StuffModel[];
  public traders: TraderModel[];
  public locations: Location[];
  public heightInPixels: number;
  public widthInPixels: number;
  public marks: Mark[];
  public lootBoxes: LootBoxCluster[];
  public anomalyZones: AnomalyZone[];
  public stalkers: Stalker[];
  public smartTerrains: SmartTerrain[];
}
