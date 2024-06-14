import { Component, Input } from '@angular/core';
import { TradeSection, TraderBuySellItem, TraderModel, TraderSupplyItem, BestBuyModel, BestBuySellModel, SelectedItem } from '../../models/trader';
import { NgClass, NgFor, NgIf } from '@angular/common';
import Chart from 'chart.js/auto';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-trader',
  standalone: true,
  imports: [NgFor, NgIf, TranslateModule, NgClass, NgClass],
  templateUrl: './trader.component.html',
  styleUrl: './trader.component.scss'
})

export class TraderComponent {
  @Input() public trader: TraderModel;
  @Input() public allTraders: TraderModel[];
  @Input() public game: { gameName: string, id: number};

  public readonly relations: number[] = [1, 0.5, 0];
  public readonly relationsTitle: string[] = ['enemy', 'neutral', 'friend'];

  public selectedBuySection: TradeSection<TraderBuySellItem>;
  public selectedSellSection: TradeSection<TraderBuySellItem>;
  public selectedSupplySection: TradeSection<TraderSupplyItem>;
  public selectedRelationId: number = 1;

  public selectedItem: SelectedItem;
  //public selectedSection: { sell: TradeSection<TraderSupplyItem>, buy: TradeSection<TraderBuySellItem>};
  //public bestTradersForItem: { sell: BestBuySellModel[], buy: BestBuySellModel[], traderHasNoSellItem: boolean, traderHasNoSellItemInSection: boolean};

  public readonly allwaysCondition: string = 'allways';

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
    this.selectedBuySection = this.trader.buy.find(x => x.sectionConditions == "") as TradeSection<TraderBuySellItem>;
    this.selectedSellSection = this.trader.sell.find(x => x.sectionConditions == "") as TradeSection<TraderBuySellItem>;
    this.selectedSupplySection = this.trader.supplies?.find(x => x.sectionConditions == "") as TradeSection<TraderSupplyItem>;

    console.log(this.trader);
    this.recalculateSection();
  }

  public copyLink(): void {
    let link = `${window.location.origin}/map/${this.game.gameName}?lat=${this.trader.y}&lng=${this.trader.x}&type=traders`;
    console.log(link);
    navigator.clipboard.writeText(link)
  }

  public selectItem(item: Item): void {
    if (this.chart != null) {
      this.chart.destroy();
    }

    console.log(item);
    let newSelectedItem: SelectedItem = new SelectedItem();

    newSelectedItem.item = item;
    newSelectedItem.sell = this.selectedSellSection.items.find(x => x.item.uniqueName == item.uniqueName) as TraderBuySellItem;
    //let buyModel: TraderBuySellItem = this.selectedBuySection.items.find(x => x.item.uniqueName == item.uniqueName) as TraderBuySellItem;

    let bestSell: BestBuySellModel[] = [];
    let bestBuy: BestBuySellModel[] = [];

    for (let trader of this.allTraders) {
      let traderSell: BestBuySellModel[] = [];

      for (let section of trader.sell) {
        let sItem = section.items.find(x => x.item.uniqueName == item.uniqueName);

        if (sItem) {
          let bestAssortement: BestBuySellModel = new BestBuySellModel();
          bestAssortement.item = sItem;
          bestAssortement.condition = section.sectionConditions;
          bestAssortement.traderName = trader.name;

          traderSell.push(bestAssortement);
        }
      }

      for (let section of trader.buy) {
        let bItem = section.items.find(x => x.item.uniqueName == item.uniqueName);

        if (bItem) {
          let bestHeroSell: BestBuyModel = new BestBuyModel();
          bestHeroSell.item = bItem;
          bestHeroSell.condition = section.sectionConditions;
          bestHeroSell.traderName = trader.name;

          bestBuy.push(bestHeroSell);
        }
      }

      let uniqueSellCoefs = [... new Set(traderSell.map(x => (x.item.minCoeficient + x.item.maxCoeficient) / 2))];
      if (uniqueSellCoefs.length == 1 && trader.sell.length == traderSell.length) {
        traderSell[0].condition = this.allwaysCondition;
        bestSell.push(traderSell[0]);
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

    bestSell = bestSell.sort((x, y) => ((x.item.minCoeficient + x.item.maxCoeficient) / 2) - ((y.item.minCoeficient + y.item.maxCoeficient) / 2));
    bestBuy = bestBuy.sort((x, y) => (((y.item.minCoeficient + y.item.maxCoeficient) / 2) - (x.item.minCoeficient + x.item.maxCoeficient) / 2));

    let uniqueBuyCoefs = [... new Set(bestBuy.map(x => (x.item.minCoeficient + x.item.maxCoeficient) / 2))];

    if (uniqueBuyCoefs.length == 1 && bestBuy.length == this.allTraders.length) {
      bestBuy = [bestBuy[0]];
      bestBuy[0].traderName = 'all-traders';
    }

    newSelectedItem.bestSell = bestSell;
    newSelectedItem.bestBuy = bestBuy;
    newSelectedItem.supply = this.selectedSupplySection.items.find(x => x.item.uniqueName == item.uniqueName) as TraderSupplyItem;

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

    let mapItem = item.maps.find(x => x.mapId == this.game.id);

    if (mapItem) {
      newSelectedItem.boxSize = mapItem.boxSize;
      newSelectedItem.price = mapItem.cost;
    }

    this.selectedItem = newSelectedItem;
    console.log(this.selectedItem);
    console.log(this.selectedItem != null, this.selectedItem.sell  != null, this.selectedItem.supply  != null);
  }

  public selectItemSell(item: TraderBuySellItem): void {
    console.log(item);
    let buyItem = this.selectedBuySection.items.find(x => x.item.uniqueName == item.item.uniqueName);
    this.prepareSelectedItem(item, buyItem);
  }

  public selectItemBuy(item: TraderBuySellItem): void {
    console.log(item);
    let sellItem = this.selectedBuySection.items.find(x => x.item.uniqueName == item.item.uniqueName);
    this.prepareSelectedItem(sellItem, item);
  }

  public selectSellSection(section: TradeSection<TraderBuySellItem>): void {
    if (this.selectedSellSection == section) {
      return;
    }

    this.selectedSellSection = section;

    if (this.game.id == 1) {
      this.selectedSupplySection = this.trader.supplies.find(x => x.sectionConditions == this.selectedSellSection.sectionConditions) as TradeSection<TraderSupplyItem>;
    }

    this.recalculateSection();
  }

  /*public changeSection(section: TradeSection<TraderSupplyItem>): void {
    let sellSection = this.trader.sell.find(x => x == section);
    let buySection = this.trader.buy.find(x => x.sectionConditions == sellSection?.sectionConditions);

    this.selectedSection =
    {
      buy: (buySection ? buySection : this.trader.buy.find(x => x.sectionConditions == "")) as TradeSection<TraderBuySellItem>,
      sell: sellSection as TradeSection<TraderSupplyItem>
    }

    let items = "";

    for (let item of this.selectedSection.buy.assortment) {
      if (this.translate.instant(item.item.uniqueName) == item.item.uniqueName) {
        items += `"${item.item.uniqueName}",`
      }
    }

    if (items) {
      console.error(items);
    }

    this.recalculateSection();
  }*/

  private prepareSelectedItem(sell: TraderBuySellItem | undefined, buy: TraderBuySellItem | undefined): void {
    if (this.chart != null) {
      this.chart.destroy();
    }

    let traderHasNoSellItem = false;
    let traderHasNoSellItemInSection = false;

    if (sell && this.selectedSupplySection) {
      let itemSupply = this.selectedSupplySection.items.find(x => x.item.uniqueName == sell.item.uniqueName);

      if (itemSupply && itemSupply.count > 0) {
        let labels: string[] = [];
        let values: number[] = [];

        for (let i = 0; i < itemSupply.count + 1; i++) {
          labels.push(i.toString());
          values.push(this.bernoulli(itemSupply.count, i, itemSupply.probability) * 100);
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
    }

    if (buy) {
      let bestAssortements: BestBuySellModel[] = [];
      let bestHeroSells: BestBuySellModel[] = [];

      for (let trader of this.allTraders) {
        let traderSell: BestBuySellModel[] = [];

        for (let section of trader.sell) {
          let sItem = section.items.find(x => x.item.uniqueName == buy.item.uniqueName);

          if (sItem) {
            let bestAssortement: BestBuySellModel = new BestBuySellModel();
            bestAssortement.item = sItem;
            bestAssortement.condition = section.sectionConditions;
            bestAssortement.traderName = trader.name;

            traderSell.push(bestAssortement);
          }
        }

        for (let section of trader.buy) {
          let bItem = section.items.find(x => x.item.uniqueName == buy.item.uniqueName);

          if (bItem) {
            let bestHeroSell: BestBuyModel = new BestBuyModel();
            bestHeroSell.item = bItem;
            bestHeroSell.condition = section.sectionConditions;
            bestHeroSell.traderName = trader.name;

            bestHeroSells.push(bestHeroSell);
          }
        }

        let uniqueSellCoefs = [... new Set(traderSell.map(x => (x.item.minCoeficient + x.item.maxCoeficient) / 2))];
        if (uniqueSellCoefs.length == 1 && trader.sell.length == traderSell.length) {
          traderSell[0].condition = this.allwaysCondition;
          bestAssortements.push(traderSell[0]);
        }
        else{
          if (trader == this.trader) {
            if (uniqueSellCoefs.length == 0) {
              traderHasNoSellItem = true;
            }
            else if (sell == null) {
              traderHasNoSellItemInSection = true;
            }
          }

          bestAssortements.push(...traderSell);
        }
      }

      bestAssortements = bestAssortements.sort((x, y) => ((x.item.minCoeficient + x.item.maxCoeficient) / 2) - ((y.item.minCoeficient + y.item.maxCoeficient) / 2));
      bestHeroSells = bestHeroSells.sort((x, y) => (((y.item.minCoeficient + y.item.maxCoeficient) / 2) - (x.item.minCoeficient + x.item.maxCoeficient) / 2));

      let uniqueBuyCoefs = [... new Set(bestHeroSells.map(x => (x.item.minCoeficient + x.item.maxCoeficient) / 2))];

      if (uniqueBuyCoefs.length == 1 && bestHeroSells.length == this.allTraders.length) {
        bestHeroSells = [bestHeroSells[0]];
        bestHeroSells[0].traderName = 'all-traders';
      }

      /*this.bestTradersForItem =
      {
        sell: bestAssortements,
        buy: bestHeroSells,
        traderHasNoSellItem: traderHasNoSellItem,
        traderHasNoSellItemInSection: traderHasNoSellItemInSection
      };

      console.log(this.bestTradersForItem);*/
    }

    let priceItem = sell ? sell : buy;

    let price = 0;
    let boxSize = 1;

    if (priceItem) {
      let mapItem = priceItem.item.maps.find(x => x.mapId == this.game.id);

      if (mapItem) {
        price = mapItem.cost;
        boxSize = mapItem.boxSize;
      }
    }

    let supply: TraderSupplyItem;
    supply = null as unknown as TraderSupplyItem;

    let item: Item = sell ? sell.item as Item : buy?.item as Item;

    if (item && this.selectedSupplySection) {
      supply = this.selectedSupplySection.items.find(x => x.item.uniqueName == item.uniqueName) as TraderSupplyItem;
    }

    //this.selectedItem = { price: price, item: item, boxSize: boxSize, supply: supply};
    console.log(this.selectedItem);
  }

  private recalculateSection(): void {
    this.selectedBuySection.items.sort(function(a, b) {
      return -(a.item.width - b.item.width || a.item.area - b.item.area);
    });

    this.selectedSellSection.items.sort(function(a, b) {
      return -(a.item.width - b.item.width || a.item.area - b.item.area);
    });

    for (let item of this.selectedBuySection.items) {
      let price = item.item.maps.find(x => x.mapId == this.game.id)?.cost;
      item.price = price as number * (item.minCoeficient + item.maxCoeficient) * this.relations[this.selectedRelationId];
    }

    for (let item of this.selectedSellSection.items) {
      let price = item.item.maps.find(x => x.mapId == this.game.id)?.cost;
      item.price = price as number * (item.minCoeficient + (item.maxCoeficient - item.minCoeficient)* this.relations[this.selectedRelationId]) ;
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
}
