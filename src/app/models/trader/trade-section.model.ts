import { TraderBuyItem } from "./trader-buy-item.model";
import { TraderSellItem } from "./trader-sell-item.model";

export class TradeSection {
  public sectionConditions: string;

  public buying: TraderBuyItem[];

  public assortment: TraderSellItem[];
}
