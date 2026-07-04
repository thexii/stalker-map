import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import Chart from 'chart.js/auto';
import { bernoulli } from '../utils/probability.utils';
import { TraderSupplyItemView } from '../models/trader';

@Injectable({ providedIn: 'root' })
export class TraderChartService {

  constructor(private translate: TranslateService) {}

  createSupplyChart(canvasId: string, supply: TraderSupplyItemView): Chart | null {
    if (!supply || supply.count <= 0) {
      return null;
    }
    const labels: string[] = [];
    const values: number[] = [];
    for (let i = 0; i < supply.count + 1; i++) {
      labels.push(i.toString());
      values.push(bernoulli(supply.count, i, supply.probability) * 100);
    }
    return new Chart(canvasId, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: this.translate.instant('item-trader-chance'),
          data: values,
          fill: false,
          borderColor: 'white',
          tension: 0.1
        }]
      },
      options: {
        aspectRatio: 2.5,
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  destroyChart(chart: Chart | null | undefined): void {
    if (chart && typeof (chart as Chart).destroy === 'function') {
      (chart as Chart).destroy();
    }
  }
}
