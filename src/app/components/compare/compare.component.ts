import { Component } from '@angular/core';
import { CompareService } from '../../services/compare.service';
import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { ItemUpgradesComponent } from '../mechanic/item-upgrades/item-upgrades.component';
import { MechanicDiscount } from '../../models/mechanic.model';
import { ItemUpgrade, UpgradeProperty, UpgradeSelectedEventModel } from '../../models/upgrades/upgrades';
import { ItemPropertyNumberComponent } from "../mechanic/item-property-number/item-property-number.component";
import { TranslateModule } from '@ngx-translate/core';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [NgIf, NgFor, ItemUpgradesComponent, NgClass, NgStyle, ItemPropertyNumberComponent, TranslateModule],
  templateUrl: './compare.component.html',
  styleUrl: './compare.component.scss'
})

export class CompareComponent {
  public element: HTMLElement;

  public tabs: string[] = ['weapon', 'outfit'];
  public selectedTab: string = this.tabs[0];

  public selectedDiscount: MechanicDiscount;
  public upgradeProperties: { [id: string] : UpgradeProperty[]; } = {};
  private upgrades: { [id: string] : { [id: string] : ItemUpgrade; }; } = {};
  public upgradeForItems: { [id: string] : ItemUpgrade; } = {};

  public isLoaded: boolean = false;
  public Math: Math = Math;

  public bestWeaponStats: Item;

  constructor(public compare: CompareService) {
    this.selectedDiscount = new MechanicDiscount();
    this.selectedDiscount.value = 1;
    this.selectedTab = this.tabs[0];
  }

  private async ngOnInit(): Promise<void> {
    let promises = [
      this.loadUpgradeProperties('cop'), this.loadUpgradeProperties('cs'),
      this.loadUpgrades('cop'), this.loadUpgrades('cs')];

    await Promise.all(promises);
    this.calculateBestItems();
    this.calculateUpgradesForItems();

    this.isLoaded = true;
    this.element.style.top = '0';

    this.compare.addedNewWeaponEvent.subscribe(
      (event: any) => {
          this.calculateBestItems();
          this.calculateUpgradesForItems();
      }
    )
  }

  public selectUpgrade(model: UpgradeSelectedEventModel): void {
    this.compare.selectUpgrade(model.upgrade, model.upgradeSection, model.item, model.selectedItemUpgrade);
    this.calculateBestItems();
  }

  private calculateBestItems(): void {
    if (this.compare.weaponsToCompare.length > 0) {
      this.bestWeaponStats = new Item();
      let rpms = this.compare.weaponsToCompare.map(x => x.rpm);
      let conditionShotDec = this.compare.weaponsToCompare.map(x => x.conditionShotDec);
      let fireDispersionBase = this.compare.weaponsToCompare.map(x => x.fireDispersionBase);
      let fireDispersionConditionFactor = this.compare.weaponsToCompare.map(x => x.fireDispersionConditionFactor);
      let bulletSpeed = this.compare.weaponsToCompare.map(x => x.bulletSpeed);
      let fireDistance = this.compare.weaponsToCompare.map(x => x.fireDistance);
      let ammoMagazineSize = this.compare.weaponsToCompare.map(x => x.ammoMagazineSize);
      let weight = this.compare.weaponsToCompare.map(x => x.weight);

      this.bestWeaponStats.rpm = Math.max(...rpms);
      this.bestWeaponStats.conditionShotDec = Math.min(...conditionShotDec);
      this.bestWeaponStats.fireDispersionBase = Math.min(...fireDispersionBase);
      this.bestWeaponStats.fireDispersionConditionFactor = Math.min(...fireDispersionConditionFactor);
      this.bestWeaponStats.bulletSpeed = Math.max(...bulletSpeed);
      this.bestWeaponStats.fireDistance = Math.max(...fireDistance);
      this.bestWeaponStats.ammoMagazineSize = Math.max(...ammoMagazineSize);
      this.bestWeaponStats.weight = Math.min(...weight);
    }
  }

  private calculateUpgradesForItems(): void {
    for (let item of this.compare.weaponsToCompare) {
      if (this.upgradeForItems[item.guid] == null && this.upgrades[item.game][item.uniqueName] != null) {
        this.upgradeForItems[item.guid] = JSON.parse(JSON.stringify(this.upgrades[item.game][item.uniqueName]));
      }
    }
  }

  private async loadUpgradeProperties(game: string): Promise<void> {
    if (game != 'shoc') {
      return new Promise(async (resolve, reject) => {
        await fetch(`/assets/data/${game}/upgrade_properties.json`)
          .then((response) => {
            if (response.ok) {
              response.json().then((config: UpgradeProperty[]) => {
                if (config) {
                  this.upgradeProperties[game] = config;
                  resolve();
                }
              })
            }
          });
      });
    }
  }

  private async loadUpgrades(game: string): Promise<void> {
    if (game != 'shoc') {
      return new Promise(async (resolve, reject) => {
      await fetch(`/assets/data/${game}/upgrades.json`)
        .then((response) => {
          if (response.ok) {
            response.json().then((config: ItemUpgrade[]) => {
              if (config) {
                let upgrades: { [id: string] : ItemUpgrade; } = {};

                for (let c of config) {
                  upgrades[c.item] = c;
                }

                this.upgrades[game] = upgrades;
                resolve();
              }
            })
          }
        });
    });
    }
  }
}
