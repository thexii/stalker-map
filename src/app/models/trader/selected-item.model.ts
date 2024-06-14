import { BestBuySellModel, TraderBuySellItem, TraderSupplyItem } from ".";
import { Item } from "../item.model";

export class SelectedItem {
  public item: Item;

  public sell: TraderBuySellItem;
  public supply: TraderSupplyItem;

  public bestBuy: BestBuySellModel[];
  public bestSell: BestBuySellModel[];

  public traderHasNoSellItem: boolean;
  public traderHasNoSellItemInSection: boolean;

  public boxSize: number;
  public price: number;
}
