import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { StuffItem } from '../../../models/stuff';
import { ItemTooltipComponent } from '../../tooltips/item-tooltip/item-tooltip.component';
import { TooltipDirective } from '../../tooltips/tooltip.directive';

@Component({
    selector: 'app-hoc-inventory-item',
    imports: [TooltipDirective],
    templateUrl: './hoc-inventory-item.html',
    styleUrl: './hoc-inventory-item.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HocInventoryItem {
    @Input() public stuffItem: StuffItem;
    public itemTooltipComponent: any = ItemTooltipComponent;
}
