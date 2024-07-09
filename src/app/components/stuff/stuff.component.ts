import { Component, Input } from '@angular/core';
import { StuffItem, StuffModel } from '../../models/stuff';
import { TranslateModule } from '@ngx-translate/core';
import { NgFor, NgIf } from '@angular/common';
import { Item } from '../../models/item.model';
import { LootBox } from '../../models/loot-box/loot-box-section.model';

@Component({
  selector: 'app-stuff',
  standalone: true,
  imports: [TranslateModule, NgFor, NgIf],
  templateUrl: './stuff.component.html',
  styleUrl: './stuff.component.scss'
})
export class StuffComponent {
  @Input() public stuff: StuffModel;
  @Input() public game: string;
  @Input() public stuffType: string;
  @Input() public allItems: Item[];

  public items: StuffItem[];
  public condition: {
    conditions: string[][],
    communities: string[]
  }

  private actorOnLevel = /actor_on_level\(([^\)]+)\)/;
  private npcRank = /npc_rank\(([^\)]+)\)/;

  private async ngOnInit(): Promise<void> {
    console.log(this.stuff)
    if (this.stuff.items) {
      this.items = this.stuff.items.map(x => {
        let item = new StuffItem();
        item.item = this.allItems.find(y => y.uniqueName == x.uniqueName) as Item;
        item.count = x.count;

        return item;
      } );

      this.items.sort((x, y) => {
        let dw = x.item.width - y.item.width;

        if (dw != 0) {
          return -dw;
        }

        return y.item.area - x.item.area;
      })
    }

    if ((this.stuff.communities && this.stuff.communities.length > 0) || this.stuff.condlist) {
      let conds = this.stuff.condlist.split(',');
      this.condition = { conditions: [], communities: [] };

      if (this.stuff.communities && this.stuff.communities.length > 0) {
        this.condition.communities = this.stuff.communities;
      }

      for (let cond of conds) {
        let sectionConditions = [];
        if (this.actorOnLevel.test(cond)) {
            let levelCond: RegExpExecArray | null = this.actorOnLevel.exec(cond);

            if (levelCond) {
                sectionConditions.push(levelCond[1]);
            }
        }

        if (this.npcRank.test(cond)) {
            let rank: RegExpExecArray | null = this.npcRank.exec(cond);

            if (rank) {
                sectionConditions.push(rank[1]);
            }
        }

        if (sectionConditions.length > 0) {
            this.condition.conditions.push(sectionConditions);
        }
      }
    }
  }

  public copyLink(): void {
    console.log(this.stuff);

    let link = `${window.location.origin}/map/${this.game}?lat=${this.stuff.y}&lng=${this.stuff.x}&type=${this.stuffType}`;
    console.log(link);
    navigator.clipboard.writeText(link)
  }
}
