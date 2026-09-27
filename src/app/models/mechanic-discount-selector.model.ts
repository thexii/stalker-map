export class FactorSelectorOption {
    public condition: string;
    public label: string;
}

export class FactorSelectorGroupConfig {
    public name: string;
    public label: string;
    public conditionPrefix?: string;
    public options?: FactorSelectorOption[];
}

export class FactorSelector {
    public name: string;
    public label: string;
    public selectedCondition: string;
    public options: FactorSelectorOption[];
}

export class MechanicDiscountSelectorConfig {
    public mechanic: string;
    public selectors: FactorSelectorGroupConfig[];
}

export class TraderFactorSelectorConfig {
    public trader: string;
    public selectors: FactorSelectorGroupConfig[];
}

export type MechanicDiscountSelector = FactorSelector;
export type MechanicDiscountSelectorGroupConfig = FactorSelectorGroupConfig;
export type MechanicDiscountSelectorOption = FactorSelectorOption;
