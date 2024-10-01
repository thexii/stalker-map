import { Item } from "../item.model";
import { Point } from "../point.model";

export class ItemUpgrade {
  public item: string;
  public upgradeSections: UpgradeSection[];
  public scheme: Point[][];
}

export class UpgradeSection {
  public name: string;
  public textureName: string;
  public elements: Upgrade[];
  public branch: number = -1;
}

export class Upgrade {
  public name: string;
  public localeName: string;
  public description: string;
  public value: string;
  public effects: string[];
  public properties: string[];
  public propertiesEffects: Map<string, string>;
  public cost: number;
  public schemeIndexX: number;
  public schemeIndexY: number;

  public texture: string;
  public iconX: number;
  public iconY: number;
  public iconWidth: number;
  public iconHeight: number;

  public isInstalled: boolean;
  public isBlocked: boolean;
  public isLocked: boolean;
}

export class ItemUpgradeView {
  public upgradeColumns: UpgradeSectionColumn[];
}

export class UpgradeSectionColumn {
  public upgradeRow: UpgradeSectionRow[];
}

export class UpgradeSectionRow {
  public upgradeRow: Upgrade[];
}

export class UpgradeProperty {
  public name: string;
  public localeName: string;
  public icon: string;
  public params: string[];
}

export class UpgradeSelectedEventModel {
  public upgrade: Upgrade;
  public upgradeSection: UpgradeSection;
  public item: Item;
}
