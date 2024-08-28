import { NgFor, NgIf, NgStyle } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Upgrade } from '../../../models/upgrades/upgrades';

@Component({
  selector: 'app-upgrade-tooltip',
  standalone: true,
  imports: [TranslateModule, NgStyle, NgIf, NgFor],
  templateUrl: './upgrade-tooltip.component.html',
  styleUrl: './upgrade-tooltip.component.scss'
})
export class UpgradeTooltipComponent {
  @Input() upgrade: Upgrade;
  @Input() discount: number;
  public math = Math;
}
