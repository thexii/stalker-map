import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UpgradeTooltipComponent } from '../../tooltips/upgrade-tooltip/upgrade-tooltip.component';
import { TooltipDirective } from '../../tooltips/tooltip.directive';
import { MechanicDiscount } from '../../../models/mechanic.model';
import { ItemUpgrade, Upgrade, UpgradeProperty, UpgradeSection, UpgradeSelectedEventModel } from '../../../models/upgrades/upgrades';
import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { Item } from '../../../models/item.model';

@Component({
  selector: 'app-item-upgrades',
  standalone: true,
  imports: [TooltipDirective, NgStyle, NgClass, NgIf, NgFor],
  templateUrl: './item-upgrades.component.html',
  styleUrl: './item-upgrades.component.scss'
})
export class ItemUpgradesComponent {
  @Input() public selectedDiscount: MechanicDiscount;
  @Input() public upgradeProperties: UpgradeProperty[];
  @Input() public game: string;
  @Input() public item: Item;
  @Input() public selectedItemUpgrade: ItemUpgrade;
  @Output() public upgradeSelectedEvent = new EventEmitter<UpgradeSelectedEventModel>();

  public upgradeTooltipComponent: any = UpgradeTooltipComponent;

  public ngOnInit(): void {
    console.log(this.selectedItemUpgrade);
  }

  public selectUpgrade(upgrade: Upgrade, upgradeSection: UpgradeSection): void {
    console.log(this.selectedItemUpgrade);
    this.upgradeSelectedEvent.emit({upgrade: upgrade, upgradeSection: upgradeSection, item: this.item, selectedItemUpgrade: this.selectedItemUpgrade});
  }
}
