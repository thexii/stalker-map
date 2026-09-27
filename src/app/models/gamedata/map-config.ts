import { CharacterProfile } from "../character-profile.model";
import { MarkersLayerConfig } from "../marker-config.model";
import { RankSetting } from "../rank-settings.model";
import { TraderSectionsConfig } from "../trader/trader-sections-config.model";
import { UndergroundLevelsConfig } from "../underground-levels-config.model";
import { RichLootSubFilterConfig } from "../hoc/rich-loot-tags";
import { MechanicDiscountSelectorConfig, TraderFactorSelectorConfig } from "../mechanic-discount-selector.model";

export class MapConfig {
  public minZoom: number;
  public maxZoom: number;
  public startZoom: number;
  public minPixelsPerMeter: number;
  public globalMapFileName: string;
  public markersConfig: MarkersLayerConfig[];
  public rankSetting: RankSetting[];
  public rulerEnabled: boolean;
  public needLootBoxConfig: boolean;
  public lengthFactor: number;
  public markerFactor: number;
  public traderConfigs: TraderSectionsConfig[];
  public mechanicDiscountSelectors?: MechanicDiscountSelectorConfig[];
  public traderFactorSelectors?: TraderFactorSelectorConfig[];
  public traderRelationType: RelationType;
  public actor: CharacterProfile;
  public undergroundLevelsConfig: UndergroundLevelsConfig[];
  public itemsCategoriesSettings: CategoryFilterSettings[];
  public richLootExpensiveThreshold?: number;
  public richLootSubFilters?: RichLootSubFilterConfig[];

  public mapBounds: any;
  public kx: number;
}

export enum RelationType {
  selector = 1,
  range = 2
}

export class CategoryFilterSettings {
  public name: string;
  public gameCategories: string[];
}