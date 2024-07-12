import { ObjectAtLocation } from "./object-at-location.model";

export class Mark extends ObjectAtLocation {
  public name: string;
  public description: string;
  public typeId: number;
}
