import { Component, Input } from '@angular/core';
import { AnomalyZone } from '../../models/anomaly-zone';
import { TranslateModule } from '@ngx-translate/core';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-anomaly-zone',
  standalone: true,
  imports: [TranslateModule, NgFor, NgIf],
  templateUrl: './anomaly-zone.component.html',
  styleUrl: './anomaly-zone.component.scss'
})
export class AnomalyZoneComponent {
  @Input() public anomalZone: AnomalyZone;
  @Input() public game: string;
  public Math: Math = Math;

  private async ngOnInit(): Promise<void> {
    console.log(this.anomalZone);
  }
}
