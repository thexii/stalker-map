import { Component, Input } from "@angular/core";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { MapService } from "../../services/map.service";
import { ToastService } from "../../services/toast.service";
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

    constructor(
        private mapService: MapService,
        private translate: TranslateService,
        private toast: ToastService,
    ) {}

    private ngOnInit(): void {
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
        const url = this.shareUrl;
        if (!url) {
            return;
        }

        if (this.shouldUseNativeShare() && typeof navigator.share === "function") {
            try {
                await navigator.share({ url });
            } catch (err) {
                if ((err as Error)?.name !== "AbortError") {
                    await this.copyShareUrlToClipboard(url);
                }
            }
            return;
        }

        await this.copyShareUrlToClipboard(url);
    }

    private shouldUseNativeShare(): boolean {
        const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
        if (nav.userAgentData?.mobile === true) {
            return true;
        }
        return /iPhone|iPod|Android/i.test(navigator.userAgent);
    }

    private async copyShareUrlToClipboard(url: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(url);
            this.toast.show(this.translate.instant("shareLinkCopied"));
        } catch {
            // Clipboard may be unavailable (non-secure context, permissions).
        }
    }

    public close(): void {
        this.popup.close();
    }
}