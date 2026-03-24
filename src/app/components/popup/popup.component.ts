import { Component, Input } from "@angular/core";
import { TranslateModule } from "@ngx-translate/core";
import { MapService } from "../../services/map.service";
import { HiddenMarker } from "../../models/hidden-marker.model";
import { NgClass } from "@angular/common";

@Component({
    selector: 'app-popup',
    standalone: true,
    templateUrl: './popup.component.html',
    styleUrl: './popup.component.scss',
    imports: [TranslateModule, NgClass]
})
export class PopupComponent {
    @Input() public title: string;
    @Input() public marker: HiddenMarker;
    @Input() public shareUrl: string;

    public popup: any;

    public isMarkerHidden: boolean = false;

    constructor(private mapService: MapService) {

    }

    private async ngOnInit(): Promise<void> {
        this.isMarkerHidden = this.mapService.isMarkHidden(this.marker);
    }

    public hideShow(): void {
        if (this.isMarkerHidden) {
            this.unHideMarker();
        }
        else {
            this.hideMarker();
        }
    }

    public hideMarker(): void {
        this.mapService.hideMark(this.marker);
        this.isMarkerHidden = true;
    }

    public unHideMarker(): void {
        this.mapService.unhideMark(this.marker);
        this.isMarkerHidden = false;
    }

    public async share(): Promise<void> {
        if (navigator.share) {
            await navigator.share({
                url: this.shareUrl
            });
        }
    }

    public close(): void {
        this.popup.close();
    }
}