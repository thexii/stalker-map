import { TradeSection, TraderSellItem, TraderBuyItem } from ".";

export class TraderModel {
  public name: string;
  public locationId: number;
  public locationName: string;
  public faction: string;
  public money: number;
  public sell: TradeSection<TraderSellItem>[];
  public buy: TradeSection<TraderBuyItem>[];
  public x: number;
  public y: number;
}
