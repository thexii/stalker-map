import { Character } from "./character.model";
import { InventoryItem } from "./inventory-item.model";

export class Stalker extends Character {
  public alive: boolean;
  public hasUniqueItem: boolean;
  public inventoryItems: InventoryItem[];
}
