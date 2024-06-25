import { Component, Input } from '@angular/core';
import { TradeSection, TraderBuySellItem, TraderModel, TraderSupplyItem, BestBuyModel, BestBuySellModel, SelectedItem, TraderBuySellItemView, TraderSupplyItemView } from '../../models/trader';
import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import Chart from 'chart.js/auto';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Item } from '../../models/item.model';
import { StalkerProfileComponent } from "../stalker-profile/stalker-profile.component";
import { RankSetting } from '../../models/rank-settings.model';
import { TraderSectionsConfig } from '../../models/trader/trader-sections-config.model';

@Component({
    selector: 'app-trader',
    standalone: true,
    templateUrl: './trader.component.html',
    styleUrl: './trader.component.scss',
    imports: [NgFor, NgIf, TranslateModule, NgClass, NgStyle, StalkerProfileComponent]
})

export class TraderComponent {
  @Input() public trader: TraderModel;
  @Input() public allTraders: TraderModel[];
  @Input() public game: string;
  @Input() public allItems: Item[];
  @Input() public rankSetting: RankSetting[];
  @Input() public traderConfigs: TraderSectionsConfig[];
  @Input() public traderConfig: TraderSectionsConfig;

  public readonly relations: number[] = [1, 0.5, 0];
  public readonly relationsTitle: string[] = ['enemy', 'neutral', 'friend'];

  public traderBuySections: TradeSection<TraderBuySellItemView>[];
  public traderSellSections: TradeSection<TraderBuySellItemView>[];
  public traderSupplySections: TradeSection<TraderSupplyItemView>[];

  public selectedBuySection: TradeSection<TraderBuySellItemView>;
  public selectedSellSection: TradeSection<TraderBuySellItemView>;
  public selectedSupplySection: TradeSection<TraderSupplyItemView>;
  public selectedRelationId: number = 1;
  public readonly space: string = ' ';

  public selectedItem: SelectedItem;

  public readonly allwaysCondition: string = 'allways';
  public traderSectionIndexes: number[];
  public hasMultiplyBuies: boolean = true;
  public hasMultiplySells: boolean = true;
  public hasMultiplySupplies: boolean = true;

  private static factorialCache: Map<number, number>;

  public chart: any;
  public Math: Math = Math;
  public nan = NaN;

  constructor(private translate: TranslateService) {
    if (TraderComponent.factorialCache == null) {
      TraderComponent.factorialCache = new Map<number, number>();
      this.factorial(20);
    }
  }

  private async ngOnInit(): Promise<void> {
    console.log(this.trader);
    console.log(this.traderConfig);
    let allItems = this.allItems;

    this.traderBuySections = this.trader.buy.map(x => {
      let section: TradeSection<TraderBuySellItemView> = new TradeSection<TraderBuySellItemView>();

      section.sectionConditions = x.sectionConditions;
      section.conditions = section.sectionConditions.split(' ');
      section.items = x.items.map(y => {
        let item = new TraderBuySellItemView();
        item.item = allItems.find(x => x.uniqueName == y.uniqueName) as Item;
        item.maxCoeficient = y.maxCoeficient;
        item.minCoeficient = y.minCoeficient;

        return item;
      })

      return section;
    }).reverse();

    this.hasMultiplyBuies = this.traderBuySections.length > 1;

    this.traderSellSections = this.trader.sell.map(x => {
      let section: TradeSection<TraderBuySellItemView> = new TradeSection<TraderBuySellItemView>();
      section.subSections = [];

      section.sectionConditions = x.sectionConditions;
      section.conditions = section.sectionConditions.split(' ');

      section.items = x.items.map(y => {
        let item = new TraderBuySellItemView();
        item.item = allItems.find(x => x.uniqueName == y.uniqueName) as Item;
        item.maxCoeficient = y.maxCoeficient;
        item.minCoeficient = y.minCoeficient;

        return item;
      })

      return section;
    }).reverse();

    this.hasMultiplySells = this.traderSellSections.length > 1;

    this.traderSupplySections = this.trader.supplies.map(x => {
      let section: TradeSection<TraderSupplyItemView> = new TradeSection<TraderSupplyItemView>();

      section.sectionConditions = x.sectionConditions;
      section.conditions = section.sectionConditions.split(' ');
      section.conditions = section.conditions.map(x => x.replace('+', '').replace('=', ''))

      section.items = x.items.map(y => {
        let item = new TraderSupplyItemView();
        item.item = allItems.find(x => x.uniqueName == y.uniqueName) as Item;
        item.count = y.count;
        item.probability = y.probability;

        return item;
      })

      return section;
    }).reverse();

    this.hasMultiplySupplies = this.traderSupplySections.length > 1;

    this.selectedBuySection = this.copy(this.traderBuySections.find(x => x.sectionConditions == "") as TradeSection<TraderBuySellItemView>);
    this.selectedSellSection = this.copy(this.traderSellSections.find(x => x.sectionConditions == "") as TradeSection<TraderBuySellItemView>);
    this.selectedSupplySection = this.copy(this.traderSupplySections.find(x => x.sectionConditions == "") as TradeSection<TraderSupplyItemView>);

    this.traderSectionIndexes = Array.from(Array(Math.max(this.traderBuySections.length, this.traderSellSections.length, this.traderSupplySections.length)).keys())
    console.log(this.traderSectionIndexes);

    this.recalculateSection();
  }

  public copyLink(): void {
    let link = `${window.location.origin}/map/${this.game}?lat=${this.trader.y}&lng=${this.trader.x}&type=traders`;
    console.log(link);
    navigator.clipboard.writeText(link)
  }

  public selectSell(sell: TradeSection<TraderBuySellItemView>): void {
    if (this.selectedSellSection.sectionConditions == sell.sectionConditions) {
      return;
    }

    let sectionConfig = this.traderConfig.sell.find(x => x.condition == sell.sectionConditions);
    this.selectedSellSection = this.copy(this.traderSellSections.find(x => x.sectionConditions == sell.sectionConditions) as TradeSection<TraderBuySellItemView>);

    this.checkBuy(sectionConfig?.enabledBuies);

    this.checkSupply(sectionConfig?.enabledSupplies);

    this.recalculateSection();
  }

  public selectBuy(buy: TradeSection<TraderBuySellItemView>): void {
    if (this.selectedBuySection.sectionConditions == buy.sectionConditions) {
      return;
    }

    let sectionConfig = this.traderConfig.buy.find(x => x.condition == buy.sectionConditions);
    this.selectedBuySection = this.copy(this.traderBuySections.find(x => x.sectionConditions == buy.sectionConditions) as TradeSection<TraderBuySellItemView>);

    this.checkSell(sectionConfig?.enabledSells);

    this.checkSupply(sectionConfig?.enabledSupplies);

    this.recalculateSection();
  }

  public selectSupply(supply: TradeSection<TraderSupplyItemView>): void {
    if (this.selectedSupplySection.sectionConditions == supply.sectionConditions) {
      return;
    }

    let sectionConfig = this.traderConfig.supply.find(x => x.condition == supply.sectionConditions);
    this.selectedSupplySection = this.copy(this.traderSupplySections.find(x => x.sectionConditions == supply.sectionConditions) as TradeSection<TraderSupplyItemView>);

    this.checkSell(sectionConfig?.enabledSells);

    this.checkBuy(sectionConfig?.enabledBuies);

    this.recalculateSection();
  }

  private checkSell(enabledSells: string[] | undefined): void {
    if (enabledSells) {
      if (!enabledSells.includes(this.selectedSellSection.sectionConditions)) {
        for (let sellConfig of enabledSells) {
          for (let traderSell of this.traderSellSections) {
            if (traderSell.sectionConditions == sellConfig) {
              this.selectedSellSection = this.copy(traderSell);
              return;
            }
          }
        }
      }
    }
    else {
      this.selectedSellSection = this.copy(this.traderSellSections.find(x => x.sectionConditions == this.selectedSellSection.sectionConditions) as TradeSection<TraderBuySellItemView>);
    }
  }

  private checkBuy(enabledBuies: string[] | undefined): void {
    if (enabledBuies) {
      if (!enabledBuies.includes(this.selectedBuySection.sectionConditions)) {
        for (let buyConfig of enabledBuies) {
          for (let traderBuy of this.traderBuySections) {
            if (traderBuy.sectionConditions == buyConfig) {
              this.selectedBuySection = this.copy(traderBuy);
              return;
            }
          }
        }
      }
    }
    else {
      this.selectedBuySection = this.copy(this.traderBuySections.find(x => x.sectionConditions == this.selectedBuySection.sectionConditions) as TradeSection<TraderBuySellItemView>);
    }
  }

  public checkSupply(enabledSupplies: string[] | undefined): void {
    if (enabledSupplies) {
      if (!enabledSupplies.includes(this.selectedSupplySection.sectionConditions)) {
        for (let supplyConfig of enabledSupplies) {
          for (let traderSupply of this.traderSupplySections) {
            if (traderSupply.sectionConditions == supplyConfig) {
              this.selectedSupplySection = this.copy(traderSupply);
              return;
            }
          }
        }
      }
    }
    else {
      this.selectedSupplySection = this.copy(this.traderSupplySections.find(x => x.sectionConditions == this.selectedSupplySection.sectionConditions) as TradeSection<TraderSupplyItemView>);
    }
  }

  public selectItem(item: Item): void {
    if (this.chart != null) {
      this.chart.destroy();
    }

    let newSelectedItem: SelectedItem = new SelectedItem();

    newSelectedItem.item = item;
    newSelectedItem.sell = this.selectedSellSection.items.find(x => x.item.uniqueName == item.uniqueName) as TraderBuySellItemView;

    let bestSell: BestBuySellModel[] = [];
    let bestBuy: BestBuySellModel[] = [];

    for (let trader of this.allTraders) {
      let traderSell: BestBuySellModel[] = [];
      let traderSectionConfig = this.traderConfigs.find(x => x.trader == trader.profile.name)

      for (let section of trader.sell) {
        let sellItem = section.items.find(x => x.uniqueName == item.uniqueName);
        if (sellItem) {
          for (let supply of trader.supplies) {
            if (traderSectionConfig?.supply.some(x => x.condition == supply.sectionConditions)) {
                let supplyItem = supply.items.find(x => x.uniqueName == item.uniqueName);
                if (supplyItem) {
                  let bestAssortement: BestBuySellModel = new BestBuySellModel();
                  bestAssortement.item = sellItem;
                  bestAssortement.conditionSell = section.sectionConditions;
                  bestAssortement.conditionSupply = [supply.sectionConditions];
                  bestAssortement.traderName = trader.profile.name;

                  traderSell.push(bestAssortement);
                }
            }
          }
        }
      }

      if (traderSell.length == 0) {
        continue;
      }

      for (let section of trader.buy) {
        let buyItem = section.items.find(x => x.uniqueName == item.uniqueName);

        if (buyItem) {
          let bestHeroSell: BestBuySellModel = new BestBuySellModel();
          bestHeroSell.item = buyItem;
          bestHeroSell.conditionSell = section.sectionConditions;
          bestHeroSell.traderName = trader.profile.name;

          bestBuy.push(bestHeroSell);
        }
      }

      let uniqueSellCoefs = [... new Set(traderSell.map(x => (x.item.minCoeficient + x.item.maxCoeficient) / 2))];

      if (uniqueSellCoefs.length == trader.sell.length) {
          for (let sell of trader.sell) {
              let sameSellCoeffSupply = traderSell.filter(x => x.conditionSell == sell.sectionConditions);

              let bestAssortement: BestBuySellModel = new BestBuySellModel();
              bestAssortement.item = sameSellCoeffSupply[0].item;
              bestAssortement.conditionSell = sell.sectionConditions;
              bestAssortement.traderName = trader.profile.name;

              if (sameSellCoeffSupply.length != trader.supplies.length) {
                bestAssortement.conditionSupply.push(...sameSellCoeffSupply.map(x => x.conditionSupply.map(x => x.trim())).flat(1));
              }

              bestSell.push(bestAssortement);
          }
      }
      else {
        if (uniqueSellCoefs.length == 1) {
          if (trader.sell.length == traderSell.length) {
            traderSell[0].conditionSell = this.allwaysCondition;
            bestSell.push(traderSell[0]);
          }
          else {
            traderSell[0].conditionSell = '';
            traderSell[0].conditionSupply = [''];
            bestSell.push(traderSell[0]);
          }
        }
        else{
          if (trader == this.trader) {
            if (uniqueSellCoefs.length == 0) {
              newSelectedItem.traderHasNoSellItem = true;
            }
            else if (newSelectedItem.sell == null) {
              newSelectedItem.traderHasNoSellItemInSection = true;
            }
          }

          bestSell.push(...traderSell);
        }
      }
    }

    bestSell = bestSell.sort((x, y) => ((x.item.minCoeficient + x.item.maxCoeficient) / 2) - ((y.item.minCoeficient + y.item.maxCoeficient) / 2));
    bestBuy = bestBuy.sort((x, y) => (((y.item.minCoeficient + y.item.maxCoeficient) / 2) - (x.item.minCoeficient + x.item.maxCoeficient) / 2));

    let uniqueBuyCoefs = [... new Set(bestBuy.map(x => (x.item.minCoeficient + x.item.maxCoeficient) / 2))];

    if (uniqueBuyCoefs.length == 1 && bestBuy.length == this.allTraders.length) {
      bestBuy = [bestBuy[0]];
      bestBuy[0].traderName = 'all-traders';
    }

    newSelectedItem.bestSell = bestSell;
    newSelectedItem.bestBuy = bestBuy;
    newSelectedItem.supply = this.selectedSupplySection.items.find(x => x.item.uniqueName == item.uniqueName) as TraderSupplyItemView;

    if (newSelectedItem.supply && newSelectedItem.supply.count > 0) {
      let labels: string[] = [];
      let values: number[] = [];

      for (let i = 0; i < newSelectedItem.supply.count + 1; i++) {
        labels.push(i.toString());
        values.push(this.bernoulli(newSelectedItem.supply.count, i, newSelectedItem.supply.probability) * 100);
      }

      this.chart = new Chart("item-chart", {
        type: 'line', //this denotes tha type of chart

        data: {
          labels: labels,
          datasets: [{
            label: 'Шанс появи',
            data: values,
            fill: false,
            borderColor: 'white',
            tension: 0.1
          }]
        },
        options: {
          aspectRatio:2.5,
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    }

    this.selectedItem = newSelectedItem;
  }

  private recalculateSection(): void {
    let allItems = this.allItems;

    this.selectedBuySection.items.sort(function(a, b) {
      return -(a.item.width - b.item.width || a.item.area - b.item.area);
    });

    this.selectedSellSection.items.sort(function(a, b) {
      return -(a.item.width - b.item.width || a.item.area - b.item.area);
    });

    for (let item of this.selectedBuySection.items) {
      item.price = item.item.price as number * (item.minCoeficient + item.maxCoeficient) * this.relations[this.selectedRelationId];
    }

    this.selectedSellSection.subSections = [new TradeSection<TraderBuySellItemView>()];
    this.selectedSellSection.subSections[0].items = [];

    for (let item of this.selectedSellSection.items) {
      item.price = Math.floor(item.item.price * (item.minCoeficient + (item.maxCoeficient - item.minCoeficient)* this.relations[this.selectedRelationId]));

      if (!this.selectedSupplySection.items.some(x => x.item.uniqueName == item.item.uniqueName)) {
        this.selectedSellSection.subSections[0].items.push(item);
      }
    }

    for (let conditionedItem of this.selectedSellSection.subSections[0].items) {
      this.selectedSellSection.items = this.selectedSellSection.items.filter(x => x.item.uniqueName != conditionedItem.item.uniqueName);
    }
  }

  private bernoulli(n: number, k: number, p: number): number {
    return (this.factorial(n) / (this.factorial(k) * this.factorial(n - k))) * Math.pow(p, k) * Math.pow(1 - p, n - k);
  }

  private factorial(n: number): number {
    if (TraderComponent.factorialCache.has(n)) {
      return TraderComponent.factorialCache.get(n) as number;
    }

    if (n == 0) {
      return 1;
    }
    else {
      let calculated: number = n * this.factorial(n - 1);
      TraderComponent.factorialCache.set(n, calculated);
      return calculated;
    }
  }

  private copy<T>(object: T): T {
    if (object) {
      let json: string = JSON.stringify(object);
      return JSON.parse(json);
    }

    return object;
  }
}
