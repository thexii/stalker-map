import { Component, Input } from '@angular/core';
import { CharacterProfile } from '../../models/character-profile.model';
import { TranslateModule } from '@ngx-translate/core';
import { NgStyle } from '@angular/common';
import { RankSetting } from '../../models/rank-settings.model';

@Component({
  selector: 'stalker-profile',
  standalone: true,
  imports: [TranslateModule, NgStyle],
  templateUrl: './stalker-profile.component.html',
  styleUrl: './stalker-profile.component.scss'
})

export class StalkerProfileComponent {
  @Input() public profile: CharacterProfile;
  @Input() public game: string;
  @Input() public money: number;
  @Input() public hasInfinityMoney: boolean;
  @Input() public rankSetting: RankSetting[];

  public rank: string = 'novice';

  private async ngOnInit(): Promise<void> {
    if (this.rankSetting != null) {
      for (let r of this.rankSetting) {
        if (r.rank > this.profile.rank) {
          break;
        }
        this.rank = r.rankName;
      }
    }
  }
}
