import { CharacterProfile } from "./character-profile.model";
import { ObjectAtLocation } from "./object-at-location.model";

export class Character extends ObjectAtLocation {
  public profile: CharacterProfile
  public money: number;
}
