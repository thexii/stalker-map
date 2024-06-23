export class TraderSectionSellConfig {
  public condition: string;
  public enabledBuies: string[];
  public enabledSupplies: string[];
}

export class TraderSectionBuyConfig {
  public condition: string;
  public enabledSells: string[];
  public enabledSupplies: string[];
}

export class TraderSectionSupplyConfig {
  public condition: string;
  public enabledSells: string[];
  public enabledBuies: string[];
}

