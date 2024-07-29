import { RoadTypeEnum } from "./road-type.enumb";
import { Way } from "./way.model";

export class Road extends Way {
  public roadType: RoadTypeEnum;
}
