import { AnomalySpawnSection } from ".";
import { Way } from "../way.model";

export class AnomalyZone {
  public x: number;
  public y: number;
  public name: string;
  public locationId: number;
  public anomaliySpawnSections: AnomalySpawnSection[];
  public anomalies: any;
  public artefactWays: Way[];
}
