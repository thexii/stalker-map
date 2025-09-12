import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Upgrade, UpgradeProperty } from '../../../models/upgrades/upgrades';

@Component({
  selector: 'app-upgrade-tooltip',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './upgrade-tooltip.component.html',
  styleUrl: './upgrade-tooltip.component.scss'
})
export class UpgradeTooltipComponent {
  @Input() upgrade: Upgrade;
  @Input() discount: number;
  @Input() game: string;
  @Input() upgradeProperties: UpgradeProperty[];
  public math = Math;

  public props: {name: string, value: string, icon: string}[];

  private async ngOnInit(): Promise<void> {
    if (this.upgrade.properties) {
      this.props = [];

      for (let prop of this.upgrade.properties) {
        let config = this.upgradeProperties.find(x => x.name == prop)
        if (config) {
          this.props.push({name: config.localeName, value: this.upgrade.value, icon: config.icon});
        }
      }
    }
  }
}
