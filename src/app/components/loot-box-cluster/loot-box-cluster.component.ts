import { Component, Input } from '@angular/core';
import { LootBoxCluster } from '../../models/loot-box/loot-box-cluster.model';
import { TranslateModule } from '@ngx-translate/core';
import { NgFor, NgIf } from '@angular/common';
import { LootBoxView } from '../../models/loot-box/loot-box-veiw.model';
import { Item } from '../../models/item.model';
import { LootBox } from '../../models/loot-box/loot-box-section.model';
import { StuffItem } from '../../models/stuff';
import { MapService } from '../../services/map.service';
import { HiddenMarker } from '../../models/hidden-marker.model';
import { ItemTooltipComponent } from '../tooltips/item-tooltip/item-tooltip.component';
import { TooltipDirective } from '../tooltips/tooltip.directive';
import { HideUnhideComponent } from "../hide-unhide/hide-unhide.component";

@Component({
  selector: 'app-loot-box-cluster',
  standalone: true,
  imports: [TranslateModule, NgIf, NgFor, TooltipDirective, HideUnhideComponent],
  templateUrl: './loot-box-cluster.component.html',
  styleUrl: './loot-box-cluster.component.scss'
})
export class LootBoxClusterComponent {
  @Input() public cluster: LootBoxCluster;
  @Input() public game: string;
  @Input() public allItems: Item[];
  @Input() public lootBoxLocationConfig: LootBox;
  @Input() public lootBoxConfigs: LootBox[];
  @Input() public isUnderground: boolean;
  public itemTooltipComponent: any = ItemTooltipComponent;

  public boxes: LootBoxView[];

  constructor(private mapService: MapService) { }

  private async ngOnInit(): Promise<void> {

    if (this.cluster.lootBoxes && this.cluster.lootBoxes.length > 0) {
      this.boxes = [];

      for (let box of this.cluster.lootBoxes) {
        let boxView: LootBoxView = new LootBoxView();
        boxView.count = box.count;

        boxView.items = box.items.map(x => {
          let item = new StuffItem();
          item.item = this.allItems.find(y => y.uniqueName == x.uniqueName) as Item;
          item.count = x.count;

          return item;
        } );

        boxView.items.sort((x, y) => {
          let dw = x.item.width - y.item.width;

          if (dw != 0) {
            return -dw;
          }

          return y.item.area - x.item.area;
        })

        if (box.name ) {
          let lootBox: LootBox = this.lootBoxConfigs.find(x => x.name == box.name) as LootBox;

          if (lootBox && this.lootBoxLocationConfig) {
            boxView.boxItems = [];
            boxView.boxConfig = box.name;

            for (let item of lootBox.items) {
              if (this.lootBoxLocationConfig.items.some(x => x.uniqueName == item.uniqueName)) {
                let item1 = new StuffItem();
                item1.item = this.allItems.find(y => y.uniqueName == item.uniqueName) as Item;

                if (item1.item) {
                  item1.probability = Math.floor(item.probability * 100);
                  boxView.boxItems.push(item1);
                }
              }
            }

            boxView.boxItems.sort((x, y) => {
              let dw = x.item.width - y.item.width;

              if (dw != 0) {
                return -dw;
              }

              return y.item.area - x.item.area;
            })
          }
        }

        this.boxes.push(boxView);
      }
    }
  }

  public copyLink(): void {
    let link = `${window.location.origin}/map/${this.game}?lat=${this.cluster.z}&lng=${this.cluster.x}&type=destroyable-box${this.isUnderground ? `&underground=${this.cluster.locationId}` : ''}`;
    console.log(link);
    navigator.clipboard.writeText(link)
  }
}
