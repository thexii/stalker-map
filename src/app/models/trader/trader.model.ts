import { TradeSection } from "./trade-section.model";

export class TraderModel {
  public uniqueName: string;
  public locationId: number;
  public locationName: string;
  public tradeSections: TradeSection[];
  //public discounts: Discount[];
}
