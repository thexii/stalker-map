import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Item } from '../../../models/item.model';

@Component({
  selector: 'app-item-tooltip',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './item-tooltip.component.html',
  styleUrl: './item-tooltip.component.scss'
})
export class ItemTooltipComponent {
  @Input() item: Item;
}
