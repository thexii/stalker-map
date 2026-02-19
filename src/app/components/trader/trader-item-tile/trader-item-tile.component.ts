import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Item } from '../../../models/item.model';
import { ItemTooltipComponent } from '../../tooltips/item-tooltip/item-tooltip.component';
import { TooltipDirective } from '../../tooltips/tooltip.directive';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-trader-item-tile',
  standalone: true,
  templateUrl: './trader-item-tile.component.html',
  styleUrl: './trader-item-tile.component.scss',
  imports: [TranslateModule, TooltipDirective]
})
export class TraderItemTileComponent {
  @Input() item: Item;
  @Input() price: number | undefined;
  /** When true, display Math.floor(price); otherwise display price as-is (for sell vs buy) */
  @Input() floorPrice = false;
  @Input() gameStyle: string;

  @Output() itemClick = new EventEmitter<Item>();

  readonly itemTooltipComponent = ItemTooltipComponent;

  get displayPrice(): string | number {
    if (this.price == null) return '';
    return this.floorPrice ? Math.floor(this.price) : this.price;
  }

  get showBugIcon(): boolean {
    return this.price === 0 || this.price == null;
  }

  onClick(): void {
    this.itemClick.emit(this.item);
  }
}
