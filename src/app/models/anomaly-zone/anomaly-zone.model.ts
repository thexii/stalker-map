import { AnomalyEntity, AnomalySpawnSection } from ".";

export class AnomalyZone {
  public x: number;
  public y: number;
  public name: string;
  public description: string;
  public locationId: number;
  public anomaliySpawnSections: AnomalySpawnSection[];
  public anomalies: AnomalyEntity[];
}
