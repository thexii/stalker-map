import { MarkerConfig } from "../marker-config.model";
import { RankSetting } from "../rank-settings.model";
import { TraderSectionsConfig } from "../trader/trader-sections-config.model";

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
}
