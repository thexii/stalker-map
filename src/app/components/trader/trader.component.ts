import { Component, Input } from '@angular/core';
import { Item } from '../../models/item.model';
import { TradeSection, TraderModel, TraderSellItem } from '../../models/trader';
import { NgFor, NgIf } from '@angular/common';
//import Chart from 'chart.js';
import Chart from 'chart.js/auto';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-trader',
  standalone: true,
  imports: [NgFor, NgIf, TranslateModule],
  templateUrl: './trader.component.html',
  styleUrl: './trader.component.scss'
})

export class TraderComponent {
  @Input() public trader: TraderModel;
  @Input() public allTraders: TraderModel[];
  @Input() public game: { gameName: string, id: number};

  public selectedItem: TraderSellItem;
  public selectedTradeSection: TradeSection;

  public chart: any;

  public selectItem(item: TraderSellItem): void {
    console.log(item)

    if (item == this.selectedItem) {
      return;
    }

    if (this.chart != null) {
      this.chart.destroy();
    }

    let labels: string[] = [];
    let values: number[] = [];

    for (let i = 0; i < item.count + 1; i++) {
      labels.push(i.toString());
      values.push(this.bernoulli(item.count, i, item.probability) * 100);
    }

    this.chart = new Chart("MyChart", {
      type: 'line', //this denotes tha type of chart

      data: {
        labels: labels,
        datasets: [{
          data: values,
          fill: false,
          borderColor: 'white',
          tension: 0.1
        }]
      },
      options: {
        aspectRatio:2.5,
      }

    });

    this.selectedItem = item;
  }

  public changeSection(event: any): void {
    this.selectedTradeSection = this.trader.tradeSections.find(x => x.sectionConditions == event.target.value) as TradeSection;
    this.recalculateSection();
  }

  private recalculateSection(): void {
    this.selectedTradeSection.assortment.sort(function(a, b) {
      return -(a.item.width - b.item.width || a.item.area - b.item.area);
    });

    this.selectedTradeSection.buying.sort(function(a, b) {
      return -(a.item.width - b.item.width || a.item.area - b.item.area);
    });

    for (let item of this.selectedTradeSection.assortment) {
      item.price = item.item.maps.find(x => x.mapId == this.game.id)?.cost as number * item.sellCoeficient;
    }

    for (let item of this.selectedTradeSection.buying) {
      item.price = item.item.maps.find(x => x.mapId == this.game.id)?.cost as number * item.sellCoeficient;
    }
  }

  private async ngOnInit(): Promise<void> {
    console.log('trader ngOnInit');
    console.log(this.trader);
    this.selectedTradeSection = this.trader.tradeSections[0];

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
