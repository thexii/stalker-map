import { ObjectAtLocation } from "../object-at-location.model";
import { LootBox } from "./loot-box-section.model";

export class LootBoxCluster extends ObjectAtLocation {
  public lootBoxes: LootBox[];
}
