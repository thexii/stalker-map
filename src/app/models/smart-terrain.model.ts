import { ObjectAtLocation } from "./object-at-location.model";

export class SmartTerrain extends ObjectAtLocation {
  public localeName: string;
  public name: string;
  public simType: string;
  public simValue: number;
  public squadCapacity: number;
  public respawnSector: string;
  public targets: string[];
  public isMutantLair: boolean;
}
