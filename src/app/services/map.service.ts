import { Injectable } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { HiddenMarker } from "../models/hidden-marker.model";

@Injectable({
    providedIn: 'root'
  })

export class MapService {
  private hiddenMarksLocalStorageKey: string = 'hidden-markers';
  private hiddenMarksCache: HiddenMarker[];

  public isMarkHidden(marker: HiddenMarker): boolean {
    return this.getAllHiddenMarkers().some(x => {
      return x.lat == marker.lat &&
      x.lng == marker.lng &&
      x.type == marker.type
    });
  }

  public hideMark(markerToHide: HiddenMarker): void {
    let hiddenMarkers: HiddenMarker[] = this.getAllHiddenMarkers();

    hiddenMarkers.push(markerToHide);

    this.setHiddenMarkers(hiddenMarkers);
  }

  public unhideMark(marker: HiddenMarker): void {
    let hiddenMarkers: HiddenMarker[] = this.getAllHiddenMarkers();

    hiddenMarkers = this.getAllHiddenMarkers().filter(x => {
      return x.lat != marker.lat &&
      x.lng != marker.lng &&
      x.type != marker.type
    });

    this.setHiddenMarkers(hiddenMarkers);
  }

  private getAllHiddenMarkers(): HiddenMarker[] {
    if (this.hiddenMarksCache) {
      return this.hiddenMarksCache;
    }
    else {
      let allHiddenMarkers = localStorage.getItem(this.hiddenMarksLocalStorageKey);

      if (allHiddenMarkers) {
        this.hiddenMarksCache = JSON.parse(allHiddenMarkers);

        return this.hiddenMarksCache;
      }
    }

    return [];
  }

  private setHiddenMarkers(markers: HiddenMarker[]): void {
    this.hiddenMarksCache = markers;
    localStorage.setItem(this.hiddenMarksLocalStorageKey, JSON.stringify(markers));
  }
}
