import { Component, Input } from '@angular/core';
import { HiddenMarker } from '../../models/hidden-marker.model';
import { MapService } from '../../services/map.service';
import { NgIf } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-hide-unhide',
  standalone: true,
  imports: [NgIf, TranslateModule],
  templateUrl: './hide-unhide.component.html',
  styleUrl: './hide-unhide.component.scss'
})

export class HideUnhideComponent {
  @Input() public marker: HiddenMarker;

  public isMarkerHidden: boolean = false;

  constructor(private mapService: MapService) {

  }

  private async ngOnInit(): Promise<void> {
    this.isMarkerHidden = this.mapService.isMarkHidden(this.marker);
  }

  public hideMarker(): void {
    this.mapService.hideMark(this.marker);
    this.isMarkerHidden = true;
  }

  public unHideMarker(): void {
    this.mapService.unhideMark(this.marker);
    this.isMarkerHidden = false;
  }
}
