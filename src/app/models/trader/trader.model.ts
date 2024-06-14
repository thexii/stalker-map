import { TradeSection, TraderSupplyItem, TraderBuySellItem } from ".";

export class TraderModel {
  public name: string;
  public locationId: number;
  public locationName: string;
  public faction: string;
  public money: number;
  public buy: TradeSection<TraderBuySellItem>[];
  public sell: TradeSection<TraderBuySellItem>[];
  public supplies: TradeSection<TraderSupplyItem>[];
  public x: number;
  public y: number;
}
