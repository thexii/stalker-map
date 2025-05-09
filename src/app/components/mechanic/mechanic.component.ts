import { MapService } from './../../services/map.service';
import { Component, Input } from '@angular/core';
import { Mechanic, MechanicDiscount } from '../../models/mechanic.model';
import { Item } from '../../models/item.model';
import { RankSetting } from '../../models/rank-settings.model';
import { RelationType } from '../../models/gamedata/map-config';
import { CharacterProfile } from '../../models/character-profile.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { StalkerProfileComponent } from "../stalker-profile/stalker-profile.component";
import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { ItemUpgrade, Upgrade, UpgradeProperty, UpgradeSection, UpgradeSelectedEventModel } from '../../models/upgrades/upgrades';
import { TooltipDirective } from '../tooltips/tooltip.directive';
import { UpgradeTooltipComponent } from '../tooltips/upgrade-tooltip/upgrade-tooltip.component';
import { ItemTooltipComponent } from '../tooltips/item-tooltip/item-tooltip.component';
import Chart, { BubbleDataPoint } from 'chart.js/auto';
import { ItemPropertyComponent } from './item-property-bar/item-property.component';
import { ItemPropertyNumberComponent } from './item-property-number/item-property-number.component';
import { ItemUpgradesComponent } from './item-upgrades/item-upgrades.component';
import { CompareComponent } from '../compare/compare.component';
import { CompareService } from '../../services/compare.service';

@Component({
  selector: 'app-mechanic',
  standalone: true,
  imports: [TranslateModule, StalkerProfileComponent, NgFor, NgIf, NgStyle, NgClass, TooltipDirective, ItemPropertyComponent, ItemPropertyNumberComponent, ItemUpgradesComponent
  ],
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
  @Input() public upgradeProperties: UpgradeProperty[];

  public readonly relations: number[] = [0, 0.5, 1];
  public readonly relationsTitle: string[] = ['enemy', 'neutral', 'friend'];
  public selectedRelationId: number = 1;
  public relation: number = this.relations[1];
  public selectedDiscount: MechanicDiscount;
  public discounts: MechanicDiscount[];
  public selectedItem: Item;
  public selectedItemForUpgrades: Item;
  public selectedItemUpgrade: ItemUpgrade;

  public relationTypeEnum = RelationType;
  public itemsToRepait: Item[];
  public Math: Math = Math;
  public itemTooltipComponent: any = ItemTooltipComponent;

  public repairPriceFactor: number = 0.6;

  public recoilTimeChart: any;
  public weaponDynamicChart: any;
  public outfitStatsChart: any;

  public readonly copMaxProperties = {
    radio_zone_max_power: 0.03,
    fire_zone_max_power: 0.2,
    acid_zone_max_power: 0.2,
    psi_zone_max_power: 0.1,
    electra_zone_max_power: 0.8,
    max_power_restore_speed: 0.020,
    max_fire_wound_protection: 1.45,
    max_wound_protection: 0.5,
    max_explo_protection: 0.55,
    bleeding_v: 0.002,
    health_restore_v: 0.0001
  }

  public readonly csMaxProperties = {
    radio_zone_max_power: 0.166,
    fire_zone_max_power: 0.166,
    acid_zone_max_power: 0.166,
    psi_zone_max_power: 0.166,
    electra_zone_max_power: 0.166,
    max_fire_wound_protection: 1.45,
    max_wound_protection: 0.5,
    max_explo_protection: 0.55,
    bleeding_v: 0.002,
    health_restore_v: 0.0003
  }

  constructor(
    private mapService: MapService,
    protected translate: TranslateService,
  private compare: CompareService) { }

  private async ngOnInit(): Promise<void> {
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

  public addItemToCompare(item: Item) {
    if (item.$type == 'weapon') {
      new Promise(async (resolve, reject) => {
        this.compare.addWeaponToCompare(item, this.game)
      });
    }
    else if (item.$type == 'outfit') {
      new Promise(async (resolve, reject) => {
        this.compare.addOutfitToCompare(item, this.game)
      });
    }

  }

  public selectDiscount(discount: MechanicDiscount): void {
    this.selectedDiscount = discount;
  }

  public selectItem(item: Item): void {
      this.selectedItem = JSON.parse(JSON.stringify(item));
      this.selectedItemForUpgrades = JSON.parse(JSON.stringify(this.selectedItem));
      let selectedItemUpgrade = this.upgrades.find(x => x.item == item.uniqueName) as ItemUpgrade;
      let lockedUpgrades = this.mechanic.upgradeConditions.filter(x => x.condition == 'false');

      if (this.recoilTimeChart) {
        this.recoilTimeChart.destroy();
      }

      if (this.weaponDynamicChart) {
        this.weaponDynamicChart.destroy();
      }

      if (this.outfitStatsChart) {
        this.outfitStatsChart.destroy();
      }

      for (let up of lockedUpgrades) {
        up.upgrade = up.upgrade.replace('_sect_', '_');
      }

      if (selectedItemUpgrade) {
        this.selectedItemUpgrade = JSON.parse(JSON.stringify(selectedItemUpgrade));

        if (this.selectedItemForUpgrades.installedUpgrades && this.selectedItemForUpgrades.installedUpgrades.length > 0) {
          for (let section of this.selectedItemUpgrade.upgradeSections) {
            let isBlocked = false;
            for (let upgrade of section.elements) {
              upgrade.isBlocked = isBlocked;
              upgrade.isInstalled = this.selectedItemForUpgrades.installedUpgrades.includes(upgrade.name);
              if (upgrade.isInstalled) {
                isBlocked = true;
                upgrade.isPreinstall = true;

                let effectsPropsUp = Object.keys(upgrade.propertiesEffects);
                let effectsValuesUp = Object.values(upgrade.propertiesEffects);

                for (let i = 0; i < effectsPropsUp.length; i++) {
                  this.compare.applyUpgradeEffect(this.selectedItem, effectsPropsUp[i], effectsValuesUp[i], 1);
                  this.compare.applyUpgradeEffect(this.selectedItemForUpgrades, effectsPropsUp[i], effectsValuesUp[i], 1);
                }
              }
            }

            if (isBlocked) {
              section.elements.filter(x => !x.isInstalled).forEach(x => {
                x.isBlocked = true
                x.isPreinstall = true;
              });
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

                      if (!anotherSection.needPreviousUpgrade) {
                        anotherSection.needPreviousUpgrade = [];
                      }

                      if (!anotherSection.needPreviousUpgrade.includes(element.name)) {
                        anotherSection.needPreviousUpgrade.push(element.name);
                      }

                      if (anotherSection.elements) {
                        for (let aElement of anotherSection.elements) {
                          branchElements.push(aElement);
                          aElement.needPreviousUpgrades = true;

                          if (lockedUpgrades.some(x => x.upgrade == aElement.name)) {
                            aElement.isLocked = true;
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

        console.log(this.selectedItemUpgrade.upgradeSections)
      }
      else {
        this.selectedItemUpgrade = undefined as unknown as ItemUpgrade;
      }

      if (item.$type == "weapon") {
        this.resetWeaponStats();
      }

      if (this.selectedItem.$type == "outfit") {
        this.resetOutfitStats();
      }
  }

  public selectUpgrade(model: UpgradeSelectedEventModel): void {
    let upgrade: Upgrade = model.upgrade;
    let upgradeSection: UpgradeSection = model.upgradeSection;

    if (upgrade.isPreinstall) {
      return;
    }

    this.compare.selectUpgrade(upgrade, upgradeSection, this.selectedItemForUpgrades, model.selectedItemUpgrade);

    if (this.selectedItem.$type == "weapon") {
      this.resetWeaponStats();
    }

    if (this.selectedItem.$type == "outfit") {
      this.resetOutfitStats();
    }
  }

  public selectedItemHasUpgrade(upgrade: string): boolean {
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

  private resetWeaponStats(): void {
    let maxTime = (60 / this.selectedItem.rpm) * this.selectedItem.ammoMagazineSize;
    let shots: BubbleDataPoint[] = [];
    let shotsZoom: BubbleDataPoint[] = [];
    let shotsUp: BubbleDataPoint[] = [];
    let shotsUpZoom: BubbleDataPoint[] = [];

    shots = this.calculateWeaponShots(this.selectedItem, 'camDispersion', 'camDispersionInc', 'camDispertionFrac', 'camMaxAngle');

    if (this.selectedItem.zoomCamDispersion > 0) {
      shotsZoom = this.calculateWeaponShots(this.selectedItem, 'zoomCamDispersion', 'zoomCamDispersionInc', 'zoomCamDispertionFrac', 'zoomCamMaxAngle');
    }

    if (!this.hasSameUps(this.selectedItem, this.selectedItemForUpgrades)) {
      shotsUp = this.calculateWeaponShots(this.selectedItemForUpgrades, 'camDispersion', 'camDispersionInc', 'camDispertionFrac', 'camMaxAngle');
      if (this.selectedItemForUpgrades.zoomCamDispersion > 0) {
        shotsUpZoom = this.calculateWeaponShots(this.selectedItemForUpgrades, 'zoomCamDispersion', 'zoomCamDispersionInc', 'zoomCamDispertionFrac', 'zoomCamMaxAngle');
      }
    }

    let n = 20;

    let maxDist = Math.max(this.selectedItemForUpgrades.fireDistance, this.selectedItem.fireDistance);

    let dx = maxDist / n;

    let dynamic: BubbleDataPoint[] = [];
    let dynamicUp: BubbleDataPoint[] = [];

    for (let i = 0; i < n + 1; i++) {
      let x = dx * i;

      let time = x / this.selectedItem.bulletSpeed;
      let d = this.bulletDinamic(this.selectedItem.bulletSpeed, 0, 0, time)
      dynamic.push({x: d[0], y: d[1]});

      let timeUp = x / this.selectedItemForUpgrades.bulletSpeed;
      let dUp = this.bulletDinamic(this.selectedItemForUpgrades.bulletSpeed, 0, 0, timeUp)
      dynamicUp.push({x: dUp[0], y: dUp[1]});
    }

    if (this.recoilTimeChart) {
      this.recoilTimeChart.destroy();
    }

    let recoilDatasets: any = [];

    if (shotsUp.length > 0) {
      recoilDatasets.push(
        {
          data: shotsUp,
          label: this.translate.instant('recoil-up'),
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgb(255, 99, 132)',
        }
      );
    };

    recoilDatasets.push(
      {
        data: shots,
        label: this.translate.instant('recoil-base'),
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgb(54, 162, 235)',
        pointRadius: 5
      }
    );

    if (shotsUpZoom.length > 0) {

      recoilDatasets.push(
        {
          data: shotsUpZoom,
          label: this.translate.instant('recoil-zoom-up'),
          backgroundColor: 'rgba(255, 0, 0, 0.2)',
          borderColor: 'rgb(255, 0, 0)',
        }
      );
    }

    if (shotsZoom.length > 0) {

      recoilDatasets.push(
        {
          data: shotsZoom,
          label: this.translate.instant('recoil-zoom-base'),
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderColor: 'rgb(255, 255, 255)',
          pointRadius: 5
        }
      );
    }

    this.recoilTimeChart = new Chart("dispersion-chart-canvas", {
      type: 'line',
      data: {
        datasets: recoilDatasets
      },
      options: {
        scales: {
          x: {
            type: 'linear'
          }
        },
        parsing: false
      }
    });

    if (this.weaponDynamicChart) {
      this.weaponDynamicChart.destroy();
    }

    this.weaponDynamicChart = new Chart("dynamic-chart-canvas", {
      type: 'line',
      data: {
        datasets: [
          {
            data: dynamicUp,
            label: this.translate.instant('recoil-up'),
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgb(255, 99, 132)',
          },
          {
            data: dynamic,
            label: this.translate.instant('recoil-base'),
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgb(54, 162, 235)',
            pointRadius: 5
          },
      ]
      },
      options: {
        scales: {
          x: {
            type: 'linear'
          }
        },
        parsing: false
      }
    });

    /*this.weaponDynamicChart = new Chart("dynamic-chart-canvas", {
      type: 'line',

      data: {
        datasets: [{
          data: dynamic,

          backgroundColor: 'white',
          borderColor: 'white',
          borderWidth: 2,
          label: 'Базова',
          hoverBackgroundColor: 'rgba(255, 99, 132, 0.8)',
          hoverBorderColor: 'rgba(255, 99, 132, 1)',
          hoverBorderWidth: 3,
        },
        {
          data: dynamicUp,

          backgroundColor: 'green',
          borderColor: 'green',
          borderWidth: 2,
          label: 'Модифікована',
          hoverBackgroundColor: 'green',
          hoverBorderColor: 'white',
          hoverBorderWidth: 3,
        },
      ]
      },
      options: {
        scales: {
          x: {
            beginAtZero: true
          }
        }
      }
    });*/
  }

  private calculateWeaponShots(item: Item, camDispersion: string, camDispersionInc: string, camDispertionFrac: string, camMaxAngle: string): any[] {
    let shots: any[] = [];
    let currentTime = 0;
    let currentAngle = 0;
    let deltaTime = (60 / item.rpm);

    let itemAsAny = item as any;

    for (let shot = 0; shot < item.ammoMagazineSize; shot++) {
      shots.push({x: currentTime, y: currentAngle, r: 1});

      currentTime += deltaTime;
      let angle = (itemAsAny[camDispersion] + itemAsAny[camDispersionInc] * (shot + 1)) * itemAsAny[camDispertionFrac];
      currentAngle += angle;

      if (currentAngle > itemAsAny[camMaxAngle]) {
        currentAngle = itemAsAny[camMaxAngle];
      }
    }

    return shots;
  }

  private resetOutfitStats(): void {

    if (this.outfitStatsChart) {
      this.outfitStatsChart.destroy();
    }
    /*
    public burnProtection : number;
    public shockProtection : number;
    public radiationProtection : number;
    public chemicalBurnProtection : number;
    public telepaticProtection : number;
    public strikeProtection : number;
    public explosionProtection : number;
    public woundProtection : number;
    public hitFractionActor : number;
    public powerLoss : number;
    public artefactCount : number;*/

    let itemStats = [
      this.selectedItem.burnProtection,
      this.selectedItem.shockProtection,
      this.selectedItem.radiationProtection,
      this.selectedItem.chemicalBurnProtection,
      this.selectedItem.strikeProtection,
      this.selectedItem.explosionProtection,
      this.selectedItem.woundProtection,
      /*this.selectedItem.hitFractionActor,
      this.selectedItem.powerLoss,
      this.selectedItem.artefactCount,*/
    ]

    let itemStatsUp = [
      this.selectedItemForUpgrades.burnProtection,
      this.selectedItemForUpgrades.shockProtection,
      this.selectedItemForUpgrades.radiationProtection,
      this.selectedItemForUpgrades.chemicalBurnProtection,
      this.selectedItemForUpgrades.strikeProtection,
      this.selectedItemForUpgrades.explosionProtection,
      this.selectedItemForUpgrades.woundProtection,
      /*this.selectedItemForUpgrades.hitFractionActor,
      this.selectedItemForUpgrades.powerLoss,
      this.selectedItemForUpgrades.artefactCount,*/
    ]

    /*this.outfitStatsChart = new Chart("outfit-stats-chart-canvas", {
      type: 'radar',
      data: {
        labels: [
          'burnProtection',
          'shockProtection',
          'radiationProtection',
          'chemicalBurnProtection',
          'strikeProtection',
          'explosionProtection',
          'woundProtection',
          'hitFractionActor',
          'powerLoss',
          'artefactCount',
        ],
        datasets: [
          {
            data: itemStatsUp,
            label: 'Модифікована',
            fill: true,
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgb(255, 99, 132)',
            pointBackgroundColor: 'rgb(255, 99, 132)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgb(255, 99, 132)'
          },
          {
            data: itemStats,
            label: 'Базова',
            fill: true,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgb(54, 162, 235)',
            pointBackgroundColor: 'rgb(54, 162, 235)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgb(54, 162, 235)'
          },
        ]
      },
      options: {
        elements: {
          line: {
            borderWidth: 3
          }
        }
      },
    });*/
  }

  private bulletDinamic(v0: number, h0: number, a0: number, t: number):any {
    return [
      v0 * t * Math.cos(a0),
      h0 + v0 * t * Math.sin(a0) - (9.81 * t * t) / 2,
    ]
  }

  private hasSameUps(item: Item, another: Item): boolean {
    if (item.uniqueName != another.uniqueName) {
      return false;
    }

    if (item.installedUpgrades?.length != another.installedUpgrades?.length) {
      return false;
    }

    if (item.installedUpgrades?.length > 0) {
      for (let up of item.installedUpgrades) {
        if (!another.installedUpgrades?.includes(up)) {
          return false;
        }
      }
    }

    return true;
  }
}
