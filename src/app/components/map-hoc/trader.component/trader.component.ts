import { Component, Input } from '@angular/core';
import { TradeGenerator, TradeItem, TradeItemGenerator, TraderHoc, TraderPossibleItem } from '../../../models/hoc/map-hoc';
import { Item } from '../../../models/item.model';
import { ItemTooltipComponent } from '../../tooltips/item-tooltip/item-tooltip.component';
import { TooltipDirective } from '../../tooltips/tooltip.directive';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-trader.component',
  imports: [TooltipDirective, TranslateModule],
  templateUrl: './trader.component.html',
  styleUrl: './trader.component.scss',
})
export class TraderComponent {
    @Input() public trader: TraderHoc;
    @Input() public allItems: Item[];
    @Input() public tradeItemGenerators: TradeItemGenerator[];

    public itemTooltipComponent: any = ItemTooltipComponent;

    public items: TradeItem[];
    public buyitems: TradeItem[];

    private ranks: string[] = ['PlayerRankNovice', 'PlayerRankExperienced', 'PlayerRankVeteran', 'PlayerRankMaster'];
    private currentRank: string = 'PlayerRankNovice';
    private currentGenerator: TradeGenerator;
    //PlayerRankMaster
    //PlayerRankVeteran
    //PlayerRankExperienced

    private async ngOnInit(): Promise<void> {
        let items: TradeItem[] = [];
        let buyLimitations: string[] = [];
        let buyModifier: number = 1;
        let sellModifier: number = 1;

        for (let baseGenerator of this.trader.tradeGenerators) {
            if (baseGenerator.condition == "ConstTrue") {
                items.push(...this.unpackGenerators(baseGenerator.itemGenerator));
                buyModifier = baseGenerator.buyModifier;
                sellModifier = baseGenerator.sellModifier;
                this.currentGenerator = baseGenerator;

                if (baseGenerator.buyLimitations?.length > 0) {
                    buyLimitations.push(...baseGenerator.buyLimitations);
                }
            }
        }

        if (buyLimitations.length > 0) {
            buyLimitations = [...new Set(buyLimitations)];
        }

        this.buyitems = [];

        for (let item of this.allItems) {
            if (item.isQuest || item.invisibleInPlayerInventory || item.destroyOnPickup || item.price == 0 || buyLimitations?.includes(item.category)) {
                continue;
            }

            let tradeItem: TradeItem = new TradeItem();

            tradeItem.item = item;
            tradeItem.price = Math.floor(item.price * buyModifier);

            this.buyitems.push(tradeItem);
        }

        this.buyitems = this.buyitems.sort((a,b) => b.item.area - a.item.area)

        console.log(buyLimitations)

        if (items.length > 0) {
            const uniqueTrades = Array.from(
                items.reduce((acc, current) => {
                    const key = current.item.uniqueName;
                    const existing = acc.get(key);

                    if (existing) {
                        // Підсумовуємо значення для дублікатів

                        if (existing.minCount > 0 && current.minCount > 0) {
                            existing.minCount += current.minCount;
                        }
                        else if (current.minCount > 0) {
                            existing.minCount = current.minCount;
                        }
                        
                        if (existing.maxCount > 0 && current.maxCount > 0) {
                            existing.maxCount += current.maxCount;
                        }
                        else if (current.maxCount > 0) {
                            existing.maxCount = current.maxCount;
                        }
                        // Ціну зазвичай залишають або останню, або середню (тут залишаємо останню)
                        existing.price = current.price; 
                    } else {
                        // Якщо такого ще немає, додаємо копію в Map
                        acc.set(key, { ...current });
                    }

                    return acc;
                }, new Map<string, TradeItem>()).values()
            );

            items = uniqueTrades.sort((a,b) => b.item.area - a.item.area);

            for (let item of items) {
                item.price = Math.floor(item.item.price * sellModifier);
            }

            this.items = items;
        }
        
        console.log(this.trader);
    }

    public setPlayerRank(id: string): void {
        let selectedRank: string = this.ranks[parseInt(id)];

        if (selectedRank == this.currentRank) {
            return;
        }
        
        this.recalculate(this.findBuyModifier(selectedRank), this.findSellModifier(selectedRank));
    }

    private unpackGenerators(name: string): TradeItem[] {
        let result: TradeItem[] = [];
        
        let baseGeneratorConfig = this.tradeItemGenerators.find(x => x.name == name);

        if (baseGeneratorConfig) {
            for (let generator of baseGeneratorConfig.itemGenerators) {
                for (let possibleItem of generator.possibleItems) {
                    if (possibleItem.isArray) {
                        result.push(...this.unpackGenerators(possibleItem.uniqueName));
                    }
                    else {
                        let tradeItem: TradeItem = new TradeItem();
                        let item = this.allItems.find(x => x.uniqueName == possibleItem.uniqueName);

                        if (item) {
                            tradeItem.item = item;
                            tradeItem.minCount = possibleItem.minCount;
                            tradeItem.maxCount = possibleItem.maxCount;
                            tradeItem.price = item.price;

                            result.push(tradeItem);
                        }
                    }
                }
            }
        }

        return result;
    }

    private recalculate(buyModifier: number, sellModifier: number): void {
        for (let item of this.items) {
            item.price = Math.floor(item.item.price * sellModifier * this.currentGenerator.sellModifier);
        }

        for (let item of this.buyitems) {
            item.price = Math.floor(item.item.price * buyModifier * this.currentGenerator.buyModifier);
        }
    }

    private findBuyModifier(selected: string): number {
        if (this.trader.buyDiscounts?.length > 0) {
            let current = this.trader.buyDiscounts.find(x => x.sID == selected);

            if (current) {
                return current.modifier;
            }

            console.error(this.trader.buyDiscounts);
        }

        return 1;
    }

    private findSellModifier(selected: string): number {
        if (this.trader.sellDiscounts?.length > 0) {
            let current = this.trader.sellDiscounts.find(x => x.sID == selected);

            if (current) {
                return current.modifier;
            }

            console.error(this.trader.sellDiscounts);
        }

        return 1;
    }
}
