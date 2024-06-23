import { InventoryItem } from "../inventory-item.model";

export class AnomalySpawnSection {
  public maxCapacity: number;
  public count: number;
  public anomalyUniqueName: string;
  public anomalySpawnItems: InventoryItem[];
}
