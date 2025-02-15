import { Component, Input } from '@angular/core';
import { StuffComponent } from '../stuff.component';
import { NgFor, NgIf, NgStyle } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { HideUnhideComponent } from '../../hide-unhide/hide-unhide.component';
import { TooltipDirective } from '../../tooltips/tooltip.directive';
import { Stuff } from '../../../models/hoc/map-hoc';
import { Item } from '../../../models/item.model';
import { StuffItem } from '../../../models/stuff/stuff-item.model';
import { ItemTooltipComponent } from '../../tooltips/item-tooltip/item-tooltip.component';
import { MapService } from '../../../services/map.service';

@Component({
  selector: 'app-hoc-stuff',
  standalone: true,
  imports: [TranslateModule, NgFor, NgIf, TooltipDirective, HideUnhideComponent, NgStyle],
  templateUrl: './hoc-stuff.component.html',
  styleUrl: './hoc-stuff.component.scss'
})
export class HocStuffComponent {
  @Input() public stuff: Stuff;
  @Input() public game: string;
  @Input() public stuffType: string;
  @Input() public allItems: Item[];
  @Input() public isUnderground: boolean;
  public itemTooltipComponent: any = ItemTooltipComponent;

  public items: StuffItem[];
  public condition: {
    conditions: string[][],
    communities: string[]
  }

  private actorOnLevel = /actor_on_level\(([^\)]+)\)/;
  private npcRank = /npc_rank\(([^\)]+)\)/;

  constructor(private mapService: MapService) { }

  private async ngOnInit(): Promise<void> {
    console.log(this.stuff)
    if (this.stuff.items) {
      this.items = this.stuff.items.map(x => {
        let item = new StuffItem();
        item.item = this.allItems.find(y => y.uniqueName == x.uniqueName) as Item;
        item.count = x.count;
        item.preinstalled = [];

        if (item.item.preinstalledAttachments != null) {
          if (item.item.compatibleAttachments != null) {
            for (let attName of item.item.preinstalledAttachments) {
              let attachment = item.item.compatibleAttachments.find(x => x.uniqueName == attName);

              if (attachment) {
                item.preinstalled.push(attachment);
              }
            }
          }
          console.log(item)
        }

        return item;
      } );

      this.items = this.items.filter(x => x.item != null)

      this.items.sort((x, y) => {
        let dw = x.item.width - y.item.width;

        if (dw != 0) {
          return -dw;
        }

        return y.item.area - x.item.area;
      })
    }

    if (this.items == null) {
      this.items = [];
    }
  }

  public copyLink(): void {
    let link = `${window.location.origin}/map/${this.game}?lat=${this.stuff.z}&lng=${this.stuff.x}&type=${this.stuffType}`;
    navigator.clipboard.writeText(link)
  }

}
