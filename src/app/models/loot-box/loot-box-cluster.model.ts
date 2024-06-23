import { LootBox } from "./loot-box-section.model";

export class LootBoxCluster {
  public x: number;
  public y: number;
  public z: number;
  public lootBoxes: LootBox[];
  public locationId: number;
}
