export class MarkersLayerConfig {
  public uniqueName: string;
  public localeName: string;
  public isShowByDefault: boolean;
  public type: string;

  public markers: MarkerConfig[];
}

export class MarkerConfig {
  public id: number;
  public ableToSearch: boolean;
  public isMapStaticIcon: boolean;
  public imageUrl: string;
  public anchorSize: number[];
  public useCanvasRenderer: boolean;
  public color: string;
}
