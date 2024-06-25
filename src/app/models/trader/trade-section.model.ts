export class TradeSection<T> {
  public sectionConditions: string;
  public conditions: string[];

  public items: T[];

  public subSections: TradeSection<T>[];
}
