import { Attachment, Item } from "../item.model";

export class StuffItem {
  public item: Item;
  public count: number;
  public probability: number;
  public preinstalled: Attachment[];
}
