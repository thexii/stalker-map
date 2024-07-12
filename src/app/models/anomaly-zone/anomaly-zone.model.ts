import { AnomalySpawnSection } from ".";
import { ObjectAtLocation } from "../object-at-location.model";
import { Way } from "../way.model";

export class AnomalyZone extends ObjectAtLocation {
  public name: string;
  public anomaliySpawnSections: AnomalySpawnSection[];
  public anomalies: any;
  public artefactWays: Way[];
}
