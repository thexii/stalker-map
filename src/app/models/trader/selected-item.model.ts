import { BestBuySellModel, TraderBuySellItem, TraderBuySellItemView, TraderSupplyItem, TraderSupplyItemView } from ".";
import { Item } from "../item.model";

export class SelectedItem {
  public item: Item;

  public sell: TraderBuySellItemView;
  public supply: TraderSupplyItemView;

  public bestBuy: BestBuySellModel[];
  public bestSell: BestBuySellModel[];

  public traderHasNoSellItem: boolean;
  public traderHasNoSellItemInSection: boolean;
}
