import { Component, Input, OnInit } from '@angular/core';
import { TradeSection, TraderModel, BestBuySellModel, SelectedItem, TraderBuySellItemView, TraderSupplyItemView } from '../../models/trader';
import { NgClass, NgStyle, NgTemplateOutlet } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Item } from '../../models/item.model';
import { StalkerProfileComponent } from '../stalker-profile/stalker-profile.component';
import { RankSetting } from '../../models/rank-settings.model';
import { TraderSectionsConfig } from '../../models/trader/trader-sections-config.model';
import { TraderDiscounts } from '../../models/trader/trader-discount.model';
import { RelationType } from '../../models/gamedata/map-config';
import { CharacterProfile } from '../../models/character-profile.model';
import { Game } from '../../models/game.model';
import Chart from 'chart.js/auto';
import { TraderSectionBuilderService } from '../../services/trader-section-builder.service';
import { TraderBestDealService } from '../../services/trader-best-deal.service';
import { TraderChartService } from '../../services/trader-chart.service';
import { TraderItemTileComponent } from './trader-item-tile/trader-item-tile.component';
import { ShareLinkService } from '../../services/share-link.service';
import { FactorSelector, TraderFactorSelectorConfig } from '../../models/mechanic-discount-selector.model';
import { matchCondlist } from '../../utils/condlist';
import { buildFactorSelectors, collectWorldTokens } from '../../utils/factor-selector';

@Component({
  selector: 'app-trader',
  standalone: true,
  templateUrl: './trader.component.html',
  styleUrl: './trader.component.scss',
  imports: [TranslatePipe, NgClass, NgStyle, StalkerProfileComponent, TraderItemTileComponent, NgTemplateOutlet]
})
export class TraderComponent implements OnInit {
  @Input() trader: TraderModel;
  @Input() allTraders: TraderModel[];
  @Input() game: Game;
  @Input() allItems: Item[];
  @Input() rankSetting: RankSetting[];
  @Input() actor: CharacterProfile;
  @Input() relationType: RelationType;
  @Input() traderConfigs: TraderSectionsConfig[];
  @Input() traderConfig: TraderSectionsConfig;
  @Input() factorSelectorConfigs: TraderFactorSelectorConfig[] = [];
  @Input() isPopup: boolean;

  readonly relations: number[] = [0, 0.5, 1];
  readonly relationsTitle: string[] = ['enemy', 'neutral', 'friend'];
  selectedRelationId = 1;
  relation = this.relations[1];

  traderBuySections: TradeSection<TraderBuySellItemView>[];
  traderSellSections: TradeSection<TraderBuySellItemView>[];
  traderSupplySections: TradeSection<TraderSupplyItemView>[];
  traderDiscounts: TraderDiscounts[] = [];

  selectedBuySection: TradeSection<TraderBuySellItemView>;
  selectedSellSection: TradeSection<TraderBuySellItemView>;
  selectedSupplySection: TradeSection<TraderSupplyItemView>;
  selectedDiscount: TraderDiscounts | undefined;

  selectedItem: SelectedItem | undefined;

  readonly alwaysCondition = 'allways';
  hasMultiplyBuies = true;
  hasMultiplySells = true;
  hasMultiplySupplies = true;
  sharedSectionSelector: 'all' | 'sell-buy' | 'sell-supply' | 'buy-supply' | null = null;
  sharedSectionConditions: string[] = [];
  sharedSectionDefaultLabel = 'sell_default';
  hasDiscounts = false;
  factorSelectors: FactorSelector[] = [];

  relationTypeEnum = RelationType;

  chart: Chart | null = null;

  public isTraderSelected: boolean = false;
  public shareUrl: string = '';

  constructor(
    private translate: TranslateService,
    private sectionBuilder: TraderSectionBuilderService,
    private bestDealService: TraderBestDealService,
    private chartService: TraderChartService,
    private shareLinks: ShareLinkService
  ) {}

  ngOnInit(): void {
    this.shareUrl = this.shareLinks.forMarker(
      this.game.uniqueName,
      this.trader.z,
      this.trader.x,
      'traders'
    );

    this.traderBuySections = this.sectionBuilder.buildBuySections(this.trader, this.allItems);
    this.hasMultiplyBuies = this.traderBuySections.length > 1;

    this.traderSellSections = this.sectionBuilder.buildSellSections(this.trader, this.allItems);
    this.hasMultiplySells = this.traderSellSections.length > 1;

    this.traderSupplySections = this.sectionBuilder.buildSupplySections(this.trader, this.allItems);
    this.hasMultiplySupplies = this.traderSupplySections.length > 1;
    this.configureSharedSectionSelector();
    this.configureFactorSelectors();

    const builtDiscounts = this.sectionBuilder.buildDiscounts(this.trader);
    this.traderDiscounts = builtDiscounts ?? [];
    this.hasDiscounts = this.traderDiscounts.length > 0;
    if (this.hasDiscounts) {
      this.selectedDiscount = this.traderDiscounts.find((d) => d.conditions === '') ?? this.traderDiscounts[0];
    }

    this.selectedBuySection = this.copy(this.traderBuySections.find((x) => x.sectionConditions === '')!);
    this.selectedSellSection = this.copy(this.traderSellSections.find((x) => x.sectionConditions === '')!);
    this.selectedSupplySection = this.copy(this.traderSupplySections.find((x) => x.sectionConditions === '')!);

    if (this.factorSelectors.length > 0) {
      this.applyFactorSelection();
    } else {
      this.recalculateSection();
    }
  }

  selectSell(sell: TradeSection<TraderBuySellItemView>): void {
    if (this.selectedSellSection.sectionConditions === sell.sectionConditions) return;
    const sectionConfig = this.traderConfig.sell.find((x) => x.condition === sell.sectionConditions);
    this.selectedSellSection = this.copy(this.traderSellSections.find((x) => x.sectionConditions === sell.sectionConditions)!);
    this.checkBuy(sectionConfig?.enabledBuies);
    this.checkSupply(sectionConfig?.enabledSupplies);
    this.checkDiscount(sectionConfig?.enabledDicounts);
    this.recalculateSection();
  }

  selectSellCondition(condition: string): void {
    const section = this.traderSellSections.find((x) => x.sectionConditions === condition);
    if (section) this.selectSell(section);
  }

  selectBuy(buy: TradeSection<TraderBuySellItemView>): void {
    if (this.selectedBuySection.sectionConditions === buy.sectionConditions) return;
    const sectionConfig = this.traderConfig.buy.find((x) => x.condition === buy.sectionConditions);
    this.selectedBuySection = this.copy(this.traderBuySections.find((x) => x.sectionConditions === buy.sectionConditions)!);
    this.checkSell(sectionConfig?.enabledSells);
    this.checkSupply(sectionConfig?.enabledSupplies);
    this.checkDiscount(sectionConfig?.enabledDicounts);
    this.recalculateSection();
  }

  selectBuyCondition(condition: string): void {
    const section = this.traderBuySections.find((x) => x.sectionConditions === condition);
    if (section) this.selectBuy(section);
  }

  selectSupply(supply: TradeSection<TraderSupplyItemView>): void {
    if (this.selectedSupplySection.sectionConditions === supply.sectionConditions) return;
    const sectionConfig = this.traderConfig.supply.find((x) => x.condition === supply.sectionConditions);
    this.selectedSupplySection = this.copy(this.traderSupplySections.find((x) => x.sectionConditions === supply.sectionConditions)!);
    this.checkSell(sectionConfig?.enabledSells);
    this.checkBuy(sectionConfig?.enabledBuies);
    this.checkDiscount(sectionConfig?.enabledDicounts);
    this.recalculateSection();
    if (this.selectedItem?.item) {
      this.selectItem(this.selectedItem.item);
    }
  }

  selectSupplyCondition(condition: string): void {
    const section = this.traderSupplySections.find((x) => x.sectionConditions === condition);
    if (section) this.selectSupply(section);
  }

  selectSharedSectionCondition(condition: string): void {
    if (this.sharedSectionSelector === 'buy-supply') {
      this.selectBuyCondition(condition);
    } else {
      this.selectSellCondition(condition);
    }
  }

  get sharedSectionSelectedCondition(): string {
    return this.sharedSectionSelector === 'buy-supply'
      ? this.selectedBuySection.sectionConditions
      : this.selectedSellSection.sectionConditions;
  }

  selectDiscount(discount: TraderDiscounts): void {
    if (this.selectedDiscount?.conditions === discount.conditions) return;
    const sectionConfig = this.traderConfig.discount.find((x) => x.condition === discount.conditions);
    const found = this.traderDiscounts.find((x) => x.conditions === discount.conditions);
    if (found) this.selectedDiscount = this.copy(found);
    this.checkSell(sectionConfig?.enabledSells);
    this.checkBuy(sectionConfig?.enabledBuies);
    this.checkSupply(sectionConfig?.enabledSupplies);
    this.recalculateSection();
  }

  selectDiscountCondition(condition: string): void {
    const discount = this.traderDiscounts.find((x) => x.conditions === condition);
    if (discount) this.selectDiscount(discount);
  }

  setRelationSelect(relation: string): void {
    this.selectedRelationId = parseInt(relation, 10);
    this.relation = this.relations[this.selectedRelationId];
    this.recalculateSection();
  }

  setRelationSelectRange(relation: string): void {
    this.relation = parseFloat(relation);
    this.recalculateSection();
  }

  getPrice(coef: number): number {
    return this.selectedItem?.item?.price != null ? Math.floor(coef * this.selectedItem.item.price) : 0;
  }

  getBestSellPrice(sell: BestBuySellModel): number {
    const mid = (sell.item.minCoeficient + sell.item.maxCoeficient) / 2;
    return this.selectedItem?.item?.price != null ? Math.floor(mid * this.selectedItem.item.price) : 0;
  }

  getBestBuyPrice(buy: BestBuySellModel): number {
    const mid = (buy.item.minCoeficient + buy.item.maxCoeficient) / 2;
    return this.selectedItem?.item?.price != null ? Math.floor(mid * this.selectedItem.item.price) : 0;
  }

  getDiscountPercent(value: number): number {
    return Math.round((value - 1) * 100);
  }

  selectItem(item: Item): void {
    this.chartService.destroyChart(this.chart);
    this.chart = null;

    const newSelectedItem = new SelectedItem();
    newSelectedItem.item = item;
    newSelectedItem.sell = this.selectedSellSection.items.find((x) => x.item.uniqueName === item.uniqueName) as TraderBuySellItemView;

    const result = this.bestDealService.computeBestDeals(item, this.allTraders, this.traderConfigs, this.trader);
    newSelectedItem.bestSell = result.bestSell;
    newSelectedItem.bestBuy = result.bestBuy;
    newSelectedItem.traderHasNoSellItem = result.traderHasNoSellItem;
    newSelectedItem.traderHasNoSellItemInSection = result.traderHasSellInSomeSection && !newSelectedItem.sell;

    newSelectedItem.supply = this.selectedSupplySection.items.find((x) => x.item.uniqueName === item.uniqueName) as TraderSupplyItemView;

    if (newSelectedItem.supply && newSelectedItem.supply.count > 0) {
      this.chart = this.chartService.createSupplyChart('item-chart', newSelectedItem.supply);
    }

    this.selectedItem = newSelectedItem;
  }

  private checkSell(enabledSells: string[] | undefined): void {
    if (enabledSells && !enabledSells.includes(this.selectedSellSection.sectionConditions)) {
      for (const sellConfig of enabledSells) {
        const found = this.traderSellSections.find((s) => s.sectionConditions === sellConfig);
        if (found) {
          this.selectedSellSection = this.copy(found);
          return;
        }
      }
    } else {
      this.selectedSellSection = this.copy(
        this.traderSellSections.find((x) => x.sectionConditions === this.selectedSellSection.sectionConditions)!
      );
    }
  }

  private checkBuy(enabledBuies: string[] | undefined): void {
    if (enabledBuies && !enabledBuies.includes(this.selectedBuySection.sectionConditions)) {
      for (const buyConfig of enabledBuies) {
        const found = this.traderBuySections.find((s) => s.sectionConditions === buyConfig);
        if (found) {
          this.selectedBuySection = this.copy(found);
          return;
        }
      }
    } else {
      this.selectedBuySection = this.copy(
        this.traderBuySections.find((x) => x.sectionConditions === this.selectedBuySection.sectionConditions)!
      );
    }
  }

  private checkSupply(enabledSupplies: string[] | undefined): void {
    if (enabledSupplies && !enabledSupplies.includes(this.selectedSupplySection.sectionConditions)) {
      for (const supplyConfig of enabledSupplies) {
        const found = this.traderSupplySections.find((s) => s.sectionConditions === supplyConfig);
        if (found) {
          this.selectedSupplySection = this.copy(found);
          return;
        }
      }
    } else {
      this.selectedSupplySection = this.copy(
        this.traderSupplySections.find((x) => x.sectionConditions === this.selectedSupplySection.sectionConditions)!
      );
    }
  }

  private checkDiscount(enabledDicounts: string[] | undefined): void {
    if (enabledDicounts && this.selectedDiscount && !enabledDicounts.includes(this.selectedDiscount.conditions)) {
      for (const discountCond of enabledDicounts) {
        const found = this.traderDiscounts.find((d) => d.conditions === discountCond);
        if (found) {
          this.selectedDiscount = this.copy(found);
          return;
        }
      }
    } else if (this.traderDiscounts.length > 0) {
      const found = this.traderDiscounts.find((x) => x.conditions === this.selectedDiscount?.conditions);
      if (found) this.selectedDiscount = this.copy(found);
    }
  }

  private recalculateSection(): void {
    this.selectedBuySection.items.sort((a, b) => -(a.item.width - b.item.width || a.item.area - b.item.area));
    this.selectedSellSection.items.sort((a, b) => -(a.item.width - b.item.width || a.item.area - b.item.area));

    let sellCoeff = 1;
    let buyCoeff = 1;
    if (this.selectedDiscount) {
      sellCoeff = this.selectedDiscount.sell;
      buyCoeff = this.selectedDiscount.buy;
    }

    for (const item of this.selectedBuySection.items) {
      item.price = (item.item.price as number) * (item.maxCoeficient + (item.minCoeficient - item.maxCoeficient) * this.relation) * buyCoeff;
    }

    this.selectedSellSection.subSections = [new TradeSection<TraderBuySellItemView>()];
    this.selectedSellSection.subSections[0].items = [];
    for (const item of this.selectedSellSection.items) {
      item.price = Math.floor(
        item.item.price * ((item.minCoeficient + (item.maxCoeficient - item.minCoeficient) * (1 - this.relation)) * sellCoeff)
      );
      if (!this.selectedSupplySection.items.some((x) => x.item.uniqueName === item.item.uniqueName)) {
        this.selectedSellSection.subSections[0].items.push(item);
      }
    }
    for (const conditionedItem of this.selectedSellSection.subSections[0].items) {
      this.selectedSellSection.items = this.selectedSellSection.items.filter((x) => x.item.uniqueName !== conditionedItem.item.uniqueName);
    }
  }

  private copy<T>(object: T): T {
    if (object) {
      return JSON.parse(JSON.stringify(object));
    }
    return object;
  }

  private haveSameSectionConditions(first: string[], second: string[]): boolean {
    return first.length === second.length
      && first.every((condition, index) => condition === second[index]);
  }

  private configureSharedSectionSelector(): void {
    const sellConditions = this.traderSellSections.map((section) => section.sectionConditions);
    const buyConditions = this.traderBuySections.map((section) => section.sectionConditions);
    const supplyConditions = this.traderSupplySections.map((section) => section.sectionConditions);
    const sameSellBuy = this.hasMultiplySells && this.hasMultiplyBuies
      && this.haveSameSectionConditions(sellConditions, buyConditions);
    const sameSellSupply = this.hasMultiplySells && this.hasMultiplySupplies
      && this.haveSameSectionConditions(sellConditions, supplyConditions);
    const sameBuySupply = this.hasMultiplyBuies && this.hasMultiplySupplies
      && this.haveSameSectionConditions(buyConditions, supplyConditions);

    if (sameSellBuy && sameSellSupply) {
      this.sharedSectionSelector = 'all';
      this.sharedSectionConditions = sellConditions;
    } else if (sameSellBuy) {
      this.sharedSectionSelector = 'sell-buy';
      this.sharedSectionConditions = sellConditions;
    } else if (sameSellSupply) {
      this.sharedSectionSelector = 'sell-supply';
      this.sharedSectionConditions = sellConditions;
    } else if (sameBuySupply) {
      this.sharedSectionSelector = 'buy-supply';
      this.sharedSectionConditions = buyConditions;
      this.sharedSectionDefaultLabel = 'buy_default';
    }
  }

  public selectFactorSelector(selector: FactorSelector, condition: string): void {
    selector.selectedCondition = condition;
    this.applyFactorSelection();
  }

  private configureFactorSelectors(): void {
    const config = this.factorSelectorConfigs?.find((x) => x.trader === this.trader.profile.name);
    if (!config) {
      return;
    }

    const sourceConditions = [
      ...this.trader.sell.map((section) => section.sectionConditions),
      ...this.trader.buy.map((section) => section.sectionConditions),
      ...this.trader.supplies.map((section) => section.sectionConditions),
      ...(this.trader.discounts ?? []).map((discount) => discount.conditions)
    ];

    this.factorSelectors = buildFactorSelectors(config.selectors, sourceConditions);
  }

  private applyFactorSelection(): void {
    const world = collectWorldTokens(this.factorSelectors);

    this.selectMatchedSection(this.trader.sell, this.traderSellSections, world, (section) => {
      this.selectedSellSection = section;
    });
    this.selectMatchedSection(this.trader.buy, this.traderBuySections, world, (section) => {
      this.selectedBuySection = section;
    });
    this.selectMatchedSection(this.trader.supplies, this.traderSupplySections, world, (section) => {
      this.selectedSupplySection = section;
    });

    if (this.hasDiscounts) {
      const matchedDiscount = matchCondlist(
        this.trader.discounts ?? [],
        (discount) => discount.conditions,
        world
      );
      const matchedView = matchedDiscount
        ? this.traderDiscounts.find((discount) => discount.conditions === matchedDiscount.conditions)
        : this.traderDiscounts.find((discount) => discount.conditions === '');
      if (matchedView) {
        this.selectedDiscount = this.copy(matchedView);
      }
    }

    this.recalculateSection();
    if (this.selectedItem?.item) {
      this.selectItem(this.selectedItem.item);
    }
  }

  private selectMatchedSection<TRaw extends { sectionConditions: string }, TView extends TradeSection<unknown>>(
    rawSections: TRaw[],
    builtSections: TView[],
    world: string[],
    assign: (section: TView) => void
  ): void {
    const matched = matchCondlist(rawSections, (section) => section.sectionConditions, world);
    const built = matched
      ? builtSections.find((section) => section.sectionConditions === matched.sectionConditions)
      : builtSections.find((section) => section.sectionConditions === '');
    if (built) {
      assign(this.copy(built));
    }
  }
}
