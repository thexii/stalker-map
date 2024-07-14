import { CharacterProfile } from "../character-profile.model";
import { MarkerConfig } from "../marker-config.model";
import { RankSetting } from "../rank-settings.model";
import { TraderSectionsConfig } from "../trader/trader-sections-config.model";
import { UndergroundLevelsConfig } from "../underground-levels-config.model";

export class MapConfig {
  public minZoom: number;
  public maxZoom: number;
  public globalMapFileName: string;
  public markersConfig: MarkerConfig[];
  public rankSetting: RankSetting[];
  public rulerEnabled: boolean;
  public needLootBoxConfig: boolean;
  public lengthFactor: number;
  public traderConfigs: TraderSectionsConfig[];
  public traderRelationType: RelationType;
  public actor: CharacterProfile;
  public undergroundLevelsConfig: UndergroundLevelsConfig[];
}

export enum RelationType {
  selector = 1,
  range = 2
}
