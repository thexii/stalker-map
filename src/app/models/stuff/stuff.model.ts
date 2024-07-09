import { InventoryItem } from "../inventory-item.model";

export class StuffModel {
  public name: string;
  public description: string;
  public x: number;
  public y: number;
  public z: number;
  public typeId: number;
  public locationId: number;
  public items: InventoryItem[];
  public boxConfig: string;

  public condlist: string;
  public communities: string[];
}
