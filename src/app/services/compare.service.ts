import { EventEmitter, Injectable } from '@angular/core';
import { Item } from '../models/item.model';
import { v4 as uuidv4 } from 'uuid';
import { Upgrade, UpgradeSection } from '../models/upgrades/upgrades';

@Injectable({
  providedIn: 'root'
})
export class CompareService {
  public weaponsToCompare: Item[] = [];
  public outfitsToCompare: Item[];
  public weaponsToCompareStorageKey = 'weapons-to-compare'

  public addedNewWeaponEvent = new EventEmitter<void>();

  constructor() {
    this.weaponsToCompare = this.getAllWeaponsToCompare(this.weaponsToCompareStorageKey);
  }

  public addWeaponToCompare(item: Item, game: string): void {
    let copy: Item = JSON.parse(JSON.stringify(item));
    copy.guid = uuidv4();
    copy.game = game;
    this.weaponsToCompare.push(copy);
    this.addedNewWeaponEvent.emit();

    this.setWeaponsToCompareStorage(this.weaponsToCompare, this.weaponsToCompareStorageKey);
  }

  public removeWeapon(item: Item): void {
    this.weaponsToCompare = this.weaponsToCompare.filter(x => x.guid != item.guid);
  }

  public addOutfitToCompare(item: Item, game: string): void {
    let copy: Item = JSON.parse(JSON.stringify(item));
    copy.guid = uuidv4();
    copy.game = game;
    this.outfitsToCompare.push(copy);
  }

  public removeOutfit(item: Item): void {
    this.outfitsToCompare = this.weaponsToCompare.filter(x => x.guid != item.guid);
  }

  public getAllWeaponsToCompare(key: string): Item[] {
    let weaponsToCompare = localStorage.getItem(key);
    if (weaponsToCompare) {
      return JSON.parse(weaponsToCompare);
    }

    return [];
  }

  private setWeaponsToCompareStorage(items: Item[], key: string): void {
    localStorage.setItem(key, JSON.stringify(this.weaponsToCompare));
  }

  public selectUpgrade(upgrade: Upgrade, upgradeSection: UpgradeSection, item: Item): void {
    if (upgrade.isLocked) {
      return;
    }

    let effectsProps: string[] = []
    let effectsValues: any[] = [];

    if (upgrade.propertiesEffects) {
      effectsProps = Object.keys(upgrade.propertiesEffects);
      effectsValues = Object.values(upgrade.propertiesEffects);
    }

    let itemProps = Object.keys(item);

    if (upgrade.isInstalled) {
      for (let up of upgradeSection.elements) {
        up.isBlocked = false;

        if (up.isInstalled && up.propertiesEffects) {
          let effectsPropsUp = Object.keys(up.propertiesEffects);
          let effectsValuesUp = Object.values(up.propertiesEffects);

          for (let i = 0; i < effectsPropsUp.length; i++) {
            this.applyUpgradeEffect(item, effectsPropsUp[i], effectsValuesUp[i], -1);
          }
        }

        up.isInstalled = false;
      }

      item.installedUpgrades = item.installedUpgrades.filter(x => x != upgrade.name);
    }
    else {
      for (let up of upgradeSection.elements) {
        up.isBlocked = true;

        if (up.isInstalled && up.propertiesEffects) {
          let effectsPropsUp = Object.keys(up.propertiesEffects);
          let effectsValuesUp = Object.values(up.propertiesEffects);

          for (let i = 0; i < effectsPropsUp.length; i++) {
            this.applyUpgradeEffect(item, effectsPropsUp[i], effectsValuesUp[i], -1);
          }
        }

        up.isInstalled = false;
      }

      upgrade.isBlocked = false;
      upgrade.isInstalled = true;

      for (let i = 0; i < effectsProps.length; i++) {
        this.applyUpgradeEffect(item, effectsProps[i], effectsValues[i], 1);
      }

      if (item.installedUpgrades == null) {
        item.installedUpgrades = [];
      }

      item.installedUpgrades.push(upgrade.name);
    }
  }

  public applyUpgradeEffect(item: Item, propName: string, effectsValues: string, koeff: number): void {
    let propNameParts = propName.split('_');

    if (propNameParts.length > 1) {

      for (let i = 1; i < propNameParts.length; i++) {
        propNameParts[i] = propNameParts[i].charAt(0).toUpperCase() + propNameParts[i].slice(1);
      }

      propName = propNameParts.join('')
    }

    let value = parseFloat(effectsValues);

    switch (propName) {
      case "ammoMagSize": {
        item.ammoMagazineSize += koeff * value;
        break;
      }
      case "invWeight": {
        item.weight += koeff * value;
        item.weight = Math.round(item.weight * 100) / 100;
        break;
      }
      case "fireDispersionBase": {
        item.fireDispersionBase += koeff * value;
        item.fireDispersionBase = Math.round(item.fireDispersionBase * 100) / 100;
        break;
      }
      case "hitPower": {
        let strings = effectsValues.split(",");
        let number = [];

        for (let s of strings) {
          number.push(parseFloat(s));
        }

        let itemity = [];
        itemity.push(...number);
        itemity.push(...item.hitPower);

        if (item.hitPowers == null) {
          item.hitPowers = [];

          if (koeff > 0) {
            item.hitPowers.push(itemity);

            item.hitPower = number;
          }
          else {
            console.error(item.hitPower, number);
          }
        }
        else {
          if (koeff > 0) {
            item.hitPowers.push(itemity);

            item.hitPower = number;
          }
          else {
            let index = 0;

            let config = item.hitPowers.find(x => {
              for (let i = 0; i < item.hitPower.length; i++) {
                if (item.hitPower[i] != x[i]) {
                  return false;
                }
              }

              return true;
            })

            if (config) {
              let currentLenght = item.hitPower.length;
              let delta = config.length - currentLenght;

              item.hitPower = config.slice(currentLenght, config.length);
              item.hitPowers = item.hitPowers.filter(x => {
                if (config?.length != x.length) {
                  return true;
                }

                for (let i = 0; i < config.length; i++) {
                  if (config[i] != x[i]) {
                    return true;
                  }
                }

                return false;
              })
            }
          }
        }
        //item.hitPower += koeff * value;
        //item.fireDispersionBase = Math.round(item.fireDispersionBase * 100) / 100;
        break;
      }
      default: {
        if ((item as any)[propName] == undefined) {
          (item as any)[propName] = koeff * value;
        }
        else {
          (item as any)[propName] += koeff * value;
        }
      }
    }
  }
}
