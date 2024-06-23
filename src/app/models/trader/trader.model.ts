import { TradeSection, TraderSupplyItem, TraderBuySellItem } from ".";
import { CharacterProfile } from "../character-profile.model";

export class TraderModel {
  public locationId: number;
  public locationName: string;
  public faction: string;
  public money: number;
  public buy: TradeSection<TraderBuySellItem>[];
  public sell: TradeSection<TraderBuySellItem>[];
  public supplies: TradeSection<TraderSupplyItem>[];
  public x: number;
  public y: number;
  public profile: CharacterProfile;
  public infinitiveMoney: boolean;
}
