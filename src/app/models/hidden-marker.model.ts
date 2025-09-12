import { AnomalyZone } from "./anomaly-zone";
import { Game } from "./game.model";
import { LootBoxCluster } from "./loot-box/loot-box-cluster.model";

export class HiddenMarker {
  public lat: number;
  public lng: number;
  public game: string;
  public layerName: string;
  public isUnderground: boolean = false;

  public static anomalZone(anomalZone: AnomalyZone, game: string, isUnder: boolean): HiddenMarker {
    let markToHide: HiddenMarker = new HiddenMarker();

    markToHide.lat = anomalZone.z;
    markToHide.lng = anomalZone.x;
    markToHide.layerName = 'anomaly-zone';
    markToHide.game = game;
    markToHide.isUnderground = isUnder;

    return markToHide;
  }

  public static lootBox(lootBox: LootBoxCluster, game: string, isUnder: boolean): HiddenMarker {
    let markToHide: HiddenMarker = new HiddenMarker();

    markToHide.lat = lootBox.z;
    markToHide.lng = lootBox.x;
    markToHide.layerName = 'destroyable-box';
    markToHide.game = game;
    markToHide.isUnderground = isUnder;

    return markToHide;
  }
}
