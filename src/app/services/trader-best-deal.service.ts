import { Injectable } from '@angular/core';
import { Item } from '../models/item.model';
import { TraderModel } from '../models/trader';
import { BestBuySellModel } from '../models/trader';
import { TraderSectionsConfig } from '../models/trader/trader-sections-config.model';

const ALWAYS_CONDITION = 'allways';
const INFO_PORTION_REGEX = /[-+~=!]/;
const FACTION_RESOURCE_GREATER_REGEX = /(is_faction_resource_greater)\([^\)]+\)/;

export interface BestDealResult {
  bestSell: BestBuySellModel[];
  bestBuy: BestBuySellModel[];
  traderHasNoSellItem: boolean;
  /** Current trader has this item in at least one sell section (used with selected section to derive traderHasNoSellItemInSection) */
  traderHasSellInSomeSection: boolean;
}

@Injectable({ providedIn: 'root' })
export class TraderBestDealService {

  computeBestDeals(
    item: Item,
    allTraders: TraderModel[],
    traderConfigs: TraderSectionsConfig[],
    currentTrader: TraderModel
  ): BestDealResult {
    const bestSell: BestBuySellModel[] = [];
    const bestBuy: BestBuySellModel[] = [];
    let traderHasNoSellItem = false;
    let traderHasSellInSomeSection = false;

    for (const trader of allTraders) {
      const traderSell = this.collectTraderSellItems(item, trader, traderConfigs);
      const traderBuy = this.collectTraderBuyItems(item, trader);

      const uniqueSellCoefs = [...new Set(traderSell.map((x) => (x.item.minCoeficient + x.item.maxCoeficient) / 2))];

      if (uniqueSellCoefs.length === trader.sell.length) {
        for (const sell of trader.sell) {
          const sameSellCoeffSupply = traderSell.filter((x) => x.conditionSell === sell.sectionConditions);
          const best = this.createBestSellFromSameCoeff(sameSellCoeffSupply, sell.sectionConditions, trader.profile.name, trader);
          bestSell.push(best);
        }
      } else {
        if (uniqueSellCoefs.length === 1) {
          if (trader.sell.length === traderSell.length) {
            traderSell[0].conditionSell = ALWAYS_CONDITION;
            this.filterConditionSupplyFromSell(traderSell[0]);
            bestSell.push(traderSell[0]);
          } else {
            traderSell[0].conditionSell = '';
            traderSell[0].conditionSupply = [''];
            this.filterConditionSupplyFromSell(traderSell[0]);
            bestSell.push(traderSell[0]);
          }
        } else {
          if (trader === currentTrader) {
            if (uniqueSellCoefs.length === 0) {
              traderHasNoSellItem = true;
            } else {
              traderHasSellInSomeSection = true;
            }
          }
          if (traderSell.length > 0) {
            for (const b of traderSell) {
              this.filterConditionSupplyFromSell(b);
            }
          }
          bestSell.push(...traderSell);
        }
      }

      const uniqueBuyCoefs = [...new Set(traderBuy.map((x) => (x.item.minCoeficient + x.item.maxCoeficient) / 2))];
      if (uniqueBuyCoefs.length === trader.buy.length) {
        for (const buy of trader.buy) {
          const sameBuyCoeff = traderBuy.filter((x) => x.conditionSell === buy.sectionConditions);
          const best = new BestBuySellModel();
          best.item = sameBuyCoeff[0].item;
          best.conditionSell = buy.sectionConditions;
          best.conditionsSell = buy.sectionConditions.split(' ');
          best.traderName = trader.profile.name;
          bestBuy.push(best);
        }
      } else {
        if (uniqueBuyCoefs.length === 1) {
          traderBuy[0].conditionSell = '';
          if (trader.buy.length !== traderBuy.length) {
            traderBuy[0].conditionSupply = [''];
          }
          bestBuy.push(traderBuy[0]);
        }
      }
    }

    bestSell.sort((x, y) => (x.item.minCoeficient + x.item.maxCoeficient) / 2 - (y.item.minCoeficient + y.item.maxCoeficient) / 2);
    bestBuy.sort((x, y) => (y.item.minCoeficient + y.item.maxCoeficient) / 2 - (x.item.minCoeficient + x.item.maxCoeficient) / 2);

    const uniqueBuyCoefs = [...new Set(bestBuy.map((x) => (x.item.minCoeficient + x.item.maxCoeficient) / 2))];
    if (uniqueBuyCoefs.length === 1 && bestBuy.length === allTraders.length) {
      const first = bestBuy[0];
      bestBuy.length = 0;
      const allTradersEntry = new BestBuySellModel();
      Object.assign(allTradersEntry, first);
      allTradersEntry.traderName = 'all-traders';
      bestBuy.push(allTradersEntry);
    }

    return { bestSell, bestBuy, traderHasNoSellItem, traderHasSellInSomeSection };
  }

  private collectTraderSellItems(
    item: Item,
    trader: TraderModel,
    traderConfigs: TraderSectionsConfig[]
  ): BestBuySellModel[] {
    const traderSell: BestBuySellModel[] = [];
    const traderSectionConfig = traderConfigs.find((x) => x.trader === trader.profile.name);

    for (const section of trader.sell) {
      const sellItem = section.items.find((x) => x.uniqueName === item.uniqueName);
      if (!sellItem) continue;
      for (const supply of trader.supplies) {
        const supplyConfig = traderSectionConfig?.supply?.find((x) => x.condition === supply.sectionConditions);
        if (supplyConfig != null && supplyConfig.enabledSells != null && !supplyConfig.enabledSells.includes(section.sectionConditions)) {
          continue;
        }
        const supplyItem = supply.items.find((x) => x.uniqueName === item.uniqueName);
        if (!supplyItem) continue;
        const best = new BestBuySellModel();
        best.item = sellItem;
        best.conditionSell = section.sectionConditions;
        best.conditionsSell = section.sectionConditions.split(' ');
        best.conditionSupply = supply.sectionConditions.split(' ').map((x) => this.normalizeCondition(x));
        best.traderName = trader.profile.name;
        traderSell.push(best);
      }
    }
    return traderSell;
  }

  private collectTraderBuyItems(item: Item, trader: TraderModel): BestBuySellModel[] {
    const traderBuy: BestBuySellModel[] = [];
    for (const section of trader.buy) {
      const buyItem = section.items.find((x) => x.uniqueName === item.uniqueName);
      if (buyItem) {
        const best = new BestBuySellModel();
        best.item = buyItem;
        best.conditionSell = section.sectionConditions;
        best.conditionsSell = section.sectionConditions.split(' ');
        best.traderName = trader.profile.name;
        traderBuy.push(best);
      }
    }
    return traderBuy;
  }

  private createBestSellFromSameCoeff(
    sameSellCoeffSupply: BestBuySellModel[],
    sectionConditions: string,
    traderName: string,
    trader: TraderModel
  ): BestBuySellModel {
    const best = new BestBuySellModel();
    best.item = sameSellCoeffSupply[0].item;
    best.conditionSell = sectionConditions;
    best.conditionsSell = sectionConditions.split(' ');
    best.traderName = traderName;
    best.conditionSupply = [];
    if (sameSellCoeffSupply.length !== trader.supplies.length) {
      const flat = sameSellCoeffSupply.flatMap((x) =>
        (x.conditionSupply || []).map((y) =>
          y.trim().split(' ').map((z) => this.normalizeCondition(z.replace(INFO_PORTION_REGEX, '')))
        )
      );
      const uniqFlat = this.uniq(flat.flat());
      best.conditionSupply.push(...uniqFlat);
      if (best.conditionsSell.length > 0) {
        best.conditionSupply = best.conditionSupply.filter((x) => !best.conditionsSell!.includes(x));
      }
    }
    return best;
  }

  private filterConditionSupplyFromSell(b: BestBuySellModel): void {
    if (b.conditionsSell?.length > 0 && b.conditionSupply?.length > 0) {
      b.conditionSupply = b.conditionSupply.filter((x) => !b.conditionsSell!.includes(x));
    }
  }

  private normalizeCondition(value: string): string {
    if (FACTION_RESOURCE_GREATER_REGEX.test(value)) {
      const match = FACTION_RESOURCE_GREATER_REGEX.exec(value);
      return match ? match[1] : value;
    }
    return value;
  }

  private uniq(a: string[]): string[] {
    return [...a].sort().filter((item, pos, ary) => !pos || item !== ary[pos - 1]);
  }
}
