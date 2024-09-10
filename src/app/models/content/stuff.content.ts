import { StuffItem } from "../stuff";

export class StuffContent {
  public name: string;
  public description: string;
  public typeId: number;
  public isUnderground: boolean;
  public items: StuffItem[];
  public boxConfig: string;
  public link: string;
  public locaton: string;
  public summaryPrice: number;

  public condlist: string;
  public communities: string[];

  public maxColumns: number;
}
