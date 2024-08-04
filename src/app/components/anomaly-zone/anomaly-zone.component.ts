import { Component, Input } from '@angular/core';
import { AnomalyZone } from '../../models/anomaly-zone';
import { TranslateModule } from '@ngx-translate/core';
import { KeyValuePipe, NgFor, NgIf } from '@angular/common';
import { AnomalySpawnSectionView } from '../../models/anomaly-zone/anomaly-spawn-section.view.model';
import { Item } from '../../models/item.model';
import { StuffItem } from '../../models/stuff';
import { MapService } from '../../services/map.service';
import { HiddenMarker } from '../../models/hidden-marker.model';

@Component({
  selector: 'app-anomaly-zone',
  standalone: true,
  imports: [TranslateModule, NgFor, NgIf, KeyValuePipe],
  templateUrl: './anomaly-zone.component.html',
  styleUrl: './anomaly-zone.component.scss'
})
export class AnomalyZoneComponent {
  @Input() public anomalZone: AnomalyZone;
  @Input() public game: string;
  @Input() public stuffType: string;
  @Input() public allItems: Item[];
  @Input() public isUnderground: boolean;

  public Math: Math = Math;

  public spawnSections: AnomalySpawnSectionView[];
  public anomalies: {anomaly: string, count: number}[];
  public isMarkerHidden: boolean = false;

  constructor(private mapService: MapService) { }

  private async ngOnInit(): Promise<void> {
    this.isMarkerHidden = this.mapService.isMarkHidden(HiddenMarker.anomalZone(this.anomalZone))

    if (this.anomalZone.anomaliySpawnSections?.length > 0) {
      this.spawnSections = [];

      for (let ss of this.anomalZone.anomaliySpawnSections) {
        let ssv = new AnomalySpawnSectionView();
        ssv.maxCapacity = ss.maxCapacity;
        ssv.count = ss.count;
        ssv.anomalyUniqueName = ss.anomalyUniqueName;
        ssv.anomalySpawnItems = ss.anomalySpawnItems.map(
          x => {
            let item =  this.allItems.find(y => y.uniqueName == x.uniqueName) as Item;
            let model: StuffItem = new StuffItem();
            model.item = item;
            model.probability = x.probability;
            return model;
          }
        );

        this.spawnSections.push(ssv);
      }
    }

    if (this.anomalZone.anomalies) {
      this.anomalies = [];
      for (let anomaly in this.anomalZone.anomalies) {
        this.anomalies.push({anomaly: anomaly, count: this.anomalZone.anomalies[anomaly] as number});
      }
    }
  }

  public hideMarker(): void {
    this.mapService.hideMark(HiddenMarker.anomalZone(this.anomalZone));
    this.isMarkerHidden = true;
  }

  public unHideMarker(): void {
    this.mapService.unhideMark(HiddenMarker.anomalZone(this.anomalZone));
    this.isMarkerHidden = false;
  }

  public copyLink(): void {
    let link = `${window.location.origin}/map/${this.game}?lat=${this.anomalZone.z}&lng=${this.anomalZone.x}&type=anomaly-zone${this.isUnderground ? `&underground=${this.anomalZone.locationId}` : ''}`;
    navigator.clipboard.writeText(link)
  }
}
