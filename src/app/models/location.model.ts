import { Point } from "./point.model";

export class Location {
  public id: number;
  public uniqueName: string;
  public image: string;
  public isUnderground: boolean;

  public widthInMeters: number;
  public heightInMeters: number;

  public xShift: number;
  public yShift: number;

  public x1: number;
  public x2: number;

  public y1: number;
  public y2: number;
}

export class LocationStroke extends Location {
  public points: Point[];
}
