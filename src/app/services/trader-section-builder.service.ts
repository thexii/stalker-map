import { Injectable } from '@angular/core';
import { Item } from '../models/item.model';
import { TraderModel } from '../models/trader';
import { TradeSection, TraderBuySellItemView, TraderSupplyItemView } from '../models/trader';
import { TraderDiscounts } from '../models/trader/trader-discount.model';

const FACTION_RESOURCE_GREATER_REGEX = /(is_faction_resource_greater)\([^\)]+\)/;

@Injectable({ providedIn: 'root' })
export class TraderSectionBuilderService {

  buildBuySections(trader: TraderModel, allItems: Item[]): TradeSection<TraderBuySellItemView>[] {
    return trader.buy.map((x) => {
      const section = new TradeSection<TraderBuySellItemView>();
      section.sectionConditions = x.sectionConditions;
      section.conditions = section.sectionConditions.split(' ');
      section.items = x.items.map((y) => {
        const item = new TraderBuySellItemView();
        item.item = allItems.find((i) => i.uniqueName === y.uniqueName) as Item;
        item.maxCoeficient = y.maxCoeficient;
        item.minCoeficient = y.minCoeficient;
        return item;
      });
      return section;
    }).reverse();
  }

  buildSellSections(trader: TraderModel, allItems: Item[]): TradeSection<TraderBuySellItemView>[] {
    return trader.sell.map((x) => {
      const section = new TradeSection<TraderBuySellItemView>();
      section.subSections = [];
      section.sectionConditions = x.sectionConditions;
      section.conditions = section.sectionConditions.split(' ');
      section.items = x.items.map((y) => {
        const item = new TraderBuySellItemView();
        item.item = allItems.find((i) => i.uniqueName === y.uniqueName) as Item;
        item.maxCoeficient = y.maxCoeficient;
        item.minCoeficient = y.minCoeficient;
        return item;
      });
      return section;
    }).reverse();
  }

  buildSupplySections(trader: TraderModel, allItems: Item[]): TradeSection<TraderSupplyItemView>[] {
    return trader.supplies.map((x) => {
      const section = new TradeSection<TraderSupplyItemView>();
      section.sectionConditions = x.sectionConditions;
      section.conditions = section.sectionConditions.split(' ').map((cond) => {
        let value = cond.replace('+', '').replace('=', '');
        if (FACTION_RESOURCE_GREATER_REGEX.test(value)) {
          const match = FACTION_RESOURCE_GREATER_REGEX.exec(value);
          value = match ? match[1] : value;
        }
        return value;
      });
      section.items = x.items.map((y) => {
        const item = new TraderSupplyItemView();
        item.item = allItems.find((i) => i.uniqueName === y.uniqueName) as Item;
        item.count = y.count;
        item.probability = y.probability;
        return item;
      });
      return section;
    }).reverse();
  }

  buildDiscounts(trader: TraderModel): TraderDiscounts[] | null {
    if (!trader.discounts || trader.discounts.length === 0) {
      return null;
    }
    const list = JSON.parse(JSON.stringify(trader.discounts)) as TraderDiscounts[];
    for (const d of list) {
      d.sectionConditions = d.conditions.split(' ').map((x) => x.replace('+', '').replace('=', ''));
    }
    const defaultDiscount = new TraderDiscounts();
    defaultDiscount.conditions = '';
    defaultDiscount.sectionConditions = [];
    defaultDiscount.buy = 1;
    defaultDiscount.sell = 1;
    list.push(defaultDiscount);
    list.reverse();
    return list;
  }
}
