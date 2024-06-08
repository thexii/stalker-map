import { StuffItem } from ".";

export class StuffModel {
  public name: string;
  public description: string;
  public X: number;
  public Y: number;
  public typeId: number;
  public locationId: number;
  public items: StuffItem[];
}
