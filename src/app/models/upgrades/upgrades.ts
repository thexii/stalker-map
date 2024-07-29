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
}

export class Upgrade {
  public name: string;
  public localeName: string;
  public description: string;
  public effects: string[];
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
