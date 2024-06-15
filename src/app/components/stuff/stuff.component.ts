import { Component, Input } from '@angular/core';
import { StuffItem, StuffModel } from '../../models/stuff';
import { TranslateModule } from '@ngx-translate/core';
import { NgFor, NgIf } from '@angular/common';
import { Item } from '../../models/item.model';
import { LootBoxSection } from '../../models/loot-box-section.model';

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
  @Input() public lootBoxLocationConfig: LootBoxSection;
  @Input() public lootBoxConfig: LootBoxSection;

  public items: StuffItem[];
  public lootBoxItems: StuffItem[];

  private async ngOnInit(): Promise<void> {
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

    console.log(this.lootBoxLocationConfig);
    console.log(this.lootBoxConfig, this.stuff.boxConfig);

    if (this.lootBoxLocationConfig && this.lootBoxConfig) {
      this.lootBoxItems = [];

      for (let item of this.lootBoxConfig.items) {
        if (this.lootBoxLocationConfig.items.some(x => x.uniqueName == item.uniqueName)) {
          let item1 = new StuffItem();
          item1.item = this.allItems.find(y => y.uniqueName == item.uniqueName) as Item;

          if (item1.item) {
            item1.probability = Math.floor(item.probability * 100);
            this.lootBoxItems.push(item1);
          }
          else {
            console.log(item.uniqueName)
          }
        }
      }

      this.lootBoxItems.sort((x, y) => {
        let dw = x.item.width - y.item.width;

        if (dw != 0) {
          return -dw;
        }

        return y.item.area - x.item.area;
      })
    }
  }

  public copyLink(): void {
    console.log(this.stuff);

    let link = `${window.location.origin}/map/${this.game}?lat=${this.stuff.y}&lng=${this.stuff.x}&type=${this.stuffType}`;
    console.log(link);
    navigator.clipboard.writeText(link)
  }
}
