import { TraderBuyItem } from "./trader-buy-item.model";

export class TraderSellItem extends TraderBuyItem {
  public count: number;
  public probability: number;
}
