import { MapService } from './../../services/map.service';
import { Component, Input } from '@angular/core';
import { Mechanic, MechanicDiscount } from '../../models/mechanic.model';
import { Item } from '../../models/item.model';
import { RankSetting } from '../../models/rank-settings.model';
import { RelationType } from '../../models/gamedata/map-config';
import { CharacterProfile } from '../../models/character-profile.model';
import { TranslateModule } from '@ngx-translate/core';
import { StalkerProfileComponent } from "../stalker-profile/stalker-profile.component";
import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { ItemUpgrade, ItemUpgradeView, Upgrade } from '../../models/upgrades/upgrades';

@Component({
  selector: 'app-mechanic',
  standalone: true,
  imports: [TranslateModule, StalkerProfileComponent, NgFor, NgIf, NgStyle, NgClass],
  templateUrl: './mechanic.component.html',
  styleUrl: './mechanic.component.scss'
})
export class MechanicComponent {
  @Input() public mechanic: Mechanic;
  @Input() public game: string;
  @Input() public allItems: Item[];
  @Input() public rankSetting: RankSetting[];
  @Input() public relationType: RelationType;
  @Input() public actor: CharacterProfile;
  @Input() public upgrades: ItemUpgrade[];

  public readonly relations: number[] = [0, 0.5, 1];
  public readonly relationsTitle: string[] = ['enemy', 'neutral', 'friend'];
  public selectedRelationId: number = 1;
  public relation: number = this.relations[1];
  public selectedDiscount: MechanicDiscount;
  public discounts: MechanicDiscount[];
  public selectedItem: Item;
  public selectedItemUpgrade: ItemUpgrade;

  public relationTypeEnum = RelationType;
  public itemsToRepait: Item[];
  public Math: Math = Math;

  public repairPriceFactor: number = 0.6;

  constructor(private mapService: MapService) { }

  private async ngOnInit(): Promise<void> {
    console.log(this.mechanic);

    if (this.mechanic.itemsForUpgrader?.length > 0) {
      this.itemsToRepait = [];

      for (let inv of this.mechanic.itemsForUpgrader) {
        let item = this.allItems.find(y => y.uniqueName == inv) as Item;

        if (item) {
          this.itemsToRepait.push(item);
        }
      }

      this.itemsToRepait.sort((x, y) => {
        let dw = x.width - y.width;

        if (dw != 0) {
          return -dw;
        }

        return y.area - x.area;
      })
    }

    this.selectedDiscount = new MechanicDiscount();
    this.selectedDiscount.condition = '';
    this.selectedDiscount.value = 1;

    if (this.mechanic.discounts?.length > 0) {
      this.discounts = [];

      for (let discount of this.mechanic.discounts) {
        let discountNew = JSON.parse(JSON.stringify(discount));
        discountNew.conditions = discount.condition.split(' ').map(x => x.replace('+', '').replace('=', ''));
        this.discounts.push(discountNew);
      }

      if (this.discounts.length > 0) {
        this.discounts.push(this.selectedDiscount);
        this.discounts.reverse();
      }
    }
  }

  public selectDiscount(discount: MechanicDiscount): void {
    this.selectedDiscount = discount;
  }

  public selectItem(item: Item): void {
      this.selectedItem = item;
      let selectedItemUpgrade = this.upgrades.find(x => x.item == item.uniqueName) as ItemUpgrade;
      let lockedUpgrades = this.mechanic.upgradeConditions.filter(x => x.condition == 'false');

      for (let up of lockedUpgrades) {
        up.upgrade = up.upgrade.replace('_sect_', '_');
      }

      console.log(lockedUpgrades);

      if (selectedItemUpgrade) {
        this.selectedItemUpgrade = JSON.parse(JSON.stringify(selectedItemUpgrade));

        if (this.selectedItem.installedUpgrades && this.selectedItem.installedUpgrades.length > 0) {
          for (let section of this.selectedItemUpgrade.upgradeSections) {
            let isBlocked = false;
            for (let upgrade of section.elements) {
              upgrade.isBlocked = isBlocked;
              upgrade.isInstalled = this.selectedItem.installedUpgrades.includes(upgrade.name);
              if (upgrade.isInstalled) {
                isBlocked = true;
              }
            }

            if (isBlocked) {
              section.elements.filter(x => !x.isInstalled).forEach(x => x.isBlocked = true);
            }
          }
        }

        let branchId: number = 0;

        for (let section of this.selectedItemUpgrade.upgradeSections) {
          if (section.branch == null || section.branch < 0) {
            section.branch = branchId++;

            if (section.elements) {
              let branchElements: Upgrade[] = [];

              for (let element of section.elements) {
                branchElements.push(element);
                if (lockedUpgrades.some(x => x.upgrade == element.name)) {
                  element.isLocked = true;
                }
              }

              for (let element of branchElements) {
                if (element.effects) {
                  for (let effect of element.effects) {
                    let anotherSection = this.selectedItemUpgrade.upgradeSections.find(x => x.name == effect);

                    if (anotherSection) {
                      anotherSection.branch = section.branch;

                      if (anotherSection.elements) {
                        for (let aElement of anotherSection.elements) {
                          branchElements.push(aElement);

                          if (lockedUpgrades.some(x => x.upgrade == aElement.name)) {
                            aElement.isLocked = true;
                          }
                        }
                      }
                    }
                    else {
                      console.log(section, effect);
                    }
                  }
                }
              }
            }
          }
        }
      }
      else {
        this.selectedItemUpgrade = undefined as unknown as ItemUpgrade;
      }
  }

  public selectedItemHasUpgrade(upgrade: string): boolean {
    console.log(upgrade)
    return this.selectedItem.installedUpgrades?.includes(upgrade);
  }

  public setRelationSelect(relation: string): void {
    this.selectedRelationId = parseInt(relation);
    this.relation = this.relations[this.selectedRelationId];
    //this.recalculateSection();
  }

  public setRelationSelectRange(relation: string): void {
    this.relation = parseFloat(relation);
    //this.recalculateSection();
  }
}
