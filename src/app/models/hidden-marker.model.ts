import { AnomalyZone } from "./anomaly-zone";
import { LootBoxCluster } from "./loot-box/loot-box-cluster.model";
import { StuffModel } from "./stuff";

export class HiddenMarker {
  public lat: number;
  public lng: number;
  public type: string;

  public static anomalZone(anomalZone: AnomalyZone): HiddenMarker {
    let markToHide: HiddenMarker = new HiddenMarker();

    markToHide.lat = anomalZone.z;
    markToHide.lng = anomalZone.x;
    markToHide.type = 'anomaly-zone';

    return markToHide;
  }

  public static lootBox(lootBox: LootBoxCluster): HiddenMarker {
    let markToHide: HiddenMarker = new HiddenMarker();

    markToHide.lat = lootBox.z;
    markToHide.lng = lootBox.x;
    markToHide.type = 'destroyable-box';

    return markToHide;
  }

  public static stuff(lootBox: StuffModel): HiddenMarker {
    let markToHide: HiddenMarker = new HiddenMarker();

    markToHide.lat = lootBox.z;
    markToHide.lng = lootBox.x;
    markToHide.type = 'destroyable-box';

    return markToHide;
  }
}
