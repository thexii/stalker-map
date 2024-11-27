import { InventoryItem } from "../inventory-item.model";

export class MapHoc {
  public widthInMeters: number;
  public heightInMeters: number;

  public markers: Marker[];
  public stuffs: Stuff[];
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

