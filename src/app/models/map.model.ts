import { Location } from "./location.model";
import { StuffModel } from "./stuff";
import { TraderModel } from "./trader";

export class Map {
  public id: number;
  public uniqueName: string;
  public build: string;
  public stuffs: StuffModel[];
  public traders: TraderModel[];
  public locations: Location[];
  public heightInPixels: number;
  public widthInPixels: number;
}
