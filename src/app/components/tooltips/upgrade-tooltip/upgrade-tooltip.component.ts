import { NgIf, NgStyle } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-upgrade-tooltip',
  standalone: true,
  imports: [TranslateModule, NgStyle, NgIf],
  templateUrl: './upgrade-tooltip.component.html',
  styleUrl: './upgrade-tooltip.component.scss'
})
export class UpgradeTooltipComponent {
  @Input() title: string;
  @Input() price: number;
  @Input() description: string;

  @Input() installed: boolean;
  @Input() locked: boolean;
  @Input() blocked: boolean;
  @Input() condition: string;
}
