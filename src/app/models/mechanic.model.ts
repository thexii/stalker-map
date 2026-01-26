import { Character } from "./character.model";

export class Mechanic extends Character {
  public itemsForUpgrader: string[];
  public upgradeConditions: UpgradeCondition[];
  public discounts: MechanicDiscount[];
}

export class UpgradeCondition {
  public upgrade: string;
  public condition: string;
}

export class MechanicDiscount {
  public condition: string;
  public conditions: string[];
  public value: number;
}

export class MechanicWeaponDamage {
    public value: number;
    public valuePerSecound: number;
    public valuePerMag: number;
    public complexity: string;
}