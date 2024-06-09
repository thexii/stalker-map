import { StuffItem } from ".";

export class StuffModel {
  public name: string;
  public description: string;
  public x: number;
  public y: number;
  public typeId: number;
  public locationId: number;
  public items: StuffItem[];
}
