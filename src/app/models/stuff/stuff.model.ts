import { InventoryItem } from "../inventory-item.model";
import { ObjectAtLocation } from "../object-at-location.model";

export class StuffModel extends ObjectAtLocation {
  public name: string;
  public description: string;
  public typeId: number;
  public items: InventoryItem[];
  public boxConfig: string;

  public condlist: string;
  public communities: string[];
}
