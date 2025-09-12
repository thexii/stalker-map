import { Component, Input } from '@angular/core';
import { Stash, StashGenerator, StashPrototype } from '../../models/hoc/map-hoc';
import { Item } from '../../models/item.model';
import { StuffItem } from '../../models/stuff';
import { TranslateModule } from '@ngx-translate/core';
import { ItemTooltipComponent } from '../tooltips/item-tooltip/item-tooltip.component';
import { TooltipDirective } from '../tooltips/tooltip.directive';
import { NgStyle } from '@angular/common';

@Component({
  selector: 'app-hoc-stash',
  standalone: true,
  imports: [TranslateModule, TooltipDirective, NgStyle],
  templateUrl: './hoc-stash.component.html',
  styleUrl: './hoc-stash.component.scss'
})
export class HocStashComponent {
    @Input() public stash: Stash;
    @Input() public allItems: Item[];
    @Input() public stashGenerators: StashGenerator[];
    @Input() public stashPrototypes: StashPrototype[];

    public items: StuffItem[];
    public itemTooltipComponent: any = ItemTooltipComponent;

    private async ngOnInit(): Promise<void> {
      this.items = [];

      if (this.stash.itemGeneratorSettings?.length > 0) {
        for (let diff of this.stash.itemGeneratorSettings) {
          if (diff.itemGenerators?.length > 0) {
            for (let generatorName of diff.itemGenerators) {
              let generator = this.stashGenerators.find(
                (x) => x.name == generatorName
              );

              if (generator) {
                for (let itemGen of generator.itemGenerators) {
                  if (itemGen.possibleItems) {
                    for (let possible of itemGen.possibleItems) {
                      if (possible.chance == 1 && possible.name) {
                        let item = this.allItems.find(
                          (x) => x.uniqueName == possible.name
                        );

                        if (item) {
                          let si = new StuffItem();

                          si.item = item;
                          si.count = possible.minCount;
                          this.items.push(si)
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      if (this.stash.items?.length > 0) {
        for (let itemIn of this.stash.items) {
          let item = this.allItems.find(
            (x) => x.uniqueName == itemIn.uniqueName
          );

          if (item) {
            let si = new StuffItem();

            si.item = item;
            si.count = itemIn.count;

            this.items.push(si);
          }
        }
      }

      if (this.items.length > 0) {
        for (let item of this.items) {
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
          }
        }
      }
    }
}
