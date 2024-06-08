import { Component, Input } from '@angular/core';
import { TradeSection, TraderBuyItem, TraderModel, TraderSellItem, BestBuyModel, BestSellModel } from '../../models/trader';
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

  public selectedItem: {sell: TraderSellItem, buy: TraderBuyItem, price: number, item: Item, boxSize: number};
  public selectedSection: { sell: TradeSection<TraderSellItem>, buy: TradeSection<TraderBuyItem>};
  public bestTradersForItem: { sell: BestSellModel[], buy: BestBuyModel[], traderHasNoSellItem: boolean, traderHasNoSellItemInSection: boolean};

  public readonly allwaysCondition: string = 'allways';

  public chart: any;

  constructor(private translate: TranslateService) {

  }

  public selectItemSell(item: TraderSellItem): void {
    if (this.selectedItem && item == this.selectedItem.sell) {
      return;
    }

    let buyItem = this.selectedSection.buy.assortment.find(x => x.item.uniqueName == item.item.uniqueName);

    this.prepareSelectedItem(item, buyItem);
  }

  public selectItemBuy(item: TraderBuyItem): void {
      if (this.selectedItem && this.selectedItem.buy == item) {
        return;
      }
      else {
        let sellItem = this.selectedSection.sell.assortment.find(x => x.item.uniqueName == item.item.uniqueName);
        this.prepareSelectedItem(sellItem, item);
      }
  }

  public changeSection(section: TradeSection<TraderSellItem>): void {
    let sellSection = this.trader.sell.find(x => x == section);
    let buySection = this.trader.buy.find(x => x.sectionConditions == sellSection?.sectionConditions);

    this.selectedSection =
    {
      buy: (buySection ? buySection : this.trader.buy.find(x => x.sectionConditions == "")) as TradeSection<TraderBuyItem>,
      sell: sellSection as TradeSection<TraderSellItem>
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
  }

  private prepareSelectedItem(sell: TraderSellItem | undefined, buy: TraderBuyItem | undefined): void {
    if (this.chart != null) {
      this.chart.destroy();
    }

    let traderHasNoSellItem = false;
    let traderHasNoSellItemInSection = false;

    if (sell) {
      let labels: string[] = [];
      let values: number[] = [];

      for (let i = 0; i < sell.count + 1; i++) {
        labels.push(i.toString());
        values.push(this.bernoulli(sell.count, i, sell.probability) * 100);
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

    if (buy) {
      let bestAssortements: BestSellModel[] = [];
      let bestHeroSells: BestBuyModel[] = [];

      for (let trader of this.allTraders) {
        let traderSell: BestSellModel[] = [];

        for (let section of trader.sell) {
          let sItem = section.assortment.find(x => x.item.uniqueName == buy.item.uniqueName);

          if (sItem) {
            let bestAssortement: BestSellModel = new BestSellModel();
            bestAssortement.item = sItem;
            bestAssortement.condition = section.sectionConditions;
            bestAssortement.traderName = trader.name;

            traderSell.push(bestAssortement);
          }
        }

        for (let section of trader.buy) {
          let bItem = section.assortment.find(x => x.item.uniqueName == buy.item.uniqueName);

          if (bItem) {
            let bestHeroSell: BestBuyModel = new BestBuyModel();
            bestHeroSell.item = bItem;
            bestHeroSell.condition = section.sectionConditions;
            bestHeroSell.traderName = trader.name;

            bestHeroSells.push(bestHeroSell);
          }
        }

        let uniqueSellCoefs = [... new Set(traderSell.map(x => x.item.sellCoeficient))];
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

      bestAssortements = bestAssortements.sort((x, y) => x.item.sellCoeficient - y.item.sellCoeficient);
      bestHeroSells = bestHeroSells.sort((x, y) => y.item.sellCoeficient - x.item.sellCoeficient);

      let uniqueBuyCoefs = [... new Set(bestHeroSells.map(x => x.item.sellCoeficient))];

      if (uniqueBuyCoefs.length == 1 && bestHeroSells.length == this.allTraders.length) {
        bestHeroSells = [bestHeroSells[0]];
        bestHeroSells[0].traderName = 'all-traders';
      }

      this.bestTradersForItem =
      {
        sell: bestAssortements,
        buy: bestHeroSells,
        traderHasNoSellItem: traderHasNoSellItem,
        traderHasNoSellItemInSection: traderHasNoSellItemInSection
      };
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

    this.selectedItem = { sell: sell as TraderSellItem, buy: buy as TraderBuyItem, price: price, item: sell ? sell.item as Item : buy?.item as Item, boxSize: boxSize};
  }

  private recalculateSection(): void {
    this.selectedSection.sell.assortment.sort(function(a, b) {
      return -(a.item.width - b.item.width || a.item.area - b.item.area);
    });

    this.selectedSection.buy.assortment.sort(function(a, b) {
      return -(a.item.width - b.item.width || a.item.area - b.item.area);
    });

    for (let item of this.selectedSection.sell.assortment) {
      let price = item.item.maps.find(x => x.mapId == this.game.id)?.cost;
      item.price = price as number * item.sellCoeficient;
    }

    for (let item of this.selectedSection.buy.assortment) {
      item.price = item.item.maps.find(x => x.mapId == this.game.id)?.cost as number * item.sellCoeficient;
    }
  }

  private async ngOnInit(): Promise<void> {
    console.log('trader ngOnInit');
    console.log(this.trader);
    this.selectedSection = {sell: this.trader.sell.find(x => x.sectionConditions == "") as TradeSection<TraderSellItem>, buy: this.trader.buy.find(x => x.sectionConditions == "") as TradeSection<TraderBuyItem>} ;

    this.recalculateSection();
  }

  private async ngOnDestroy(): Promise<void> {
    console.log('trader ngOnDestroy');
  }

  private bernoulli(n: number, k: number, p: number): number {
    return (this.factorial(n) / (this.factorial(k) * this.factorial(n - k))) * Math.pow(p, k) * Math.pow(1 - p, n - k);
  }

  private factorial(n: number): number {
    if (n == 0) {
      return 1;
    }
    else {
      return n * this.factorial(n - 1);
    }
  }
}
