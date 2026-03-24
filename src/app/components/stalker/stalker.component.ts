import { Component, Input } from '@angular/core';
import { Stalker } from '../../models/stalker.model';
import { Item } from '../../models/item.model';
import { StuffItem } from '../../models/stuff';
import { TranslateModule } from '@ngx-translate/core';
import { StalkerProfileComponent } from "../stalker-profile/stalker-profile.component";
import { RankSetting } from '../../models/rank-settings.model';
import { MapService } from '../../services/map.service';
import { TooltipDirective } from '../tooltips/tooltip.directive';
import { ItemTooltipComponent } from '../tooltips/item-tooltip/item-tooltip.component';
import { Game } from '../../models/game.model';
import { NgStyle, NgTemplateOutlet, NgClass } from '@angular/common';
import { HiddenMarker } from '../../models/hidden-marker.model';

@Component({
    selector: 'app-stalker',
    standalone: true,
    templateUrl: './stalker.component.html',
    styleUrl: './stalker.component.scss',
    imports: [TranslateModule, StalkerProfileComponent, TooltipDirective, NgTemplateOutlet, NgStyle, NgClass]
})
export class StalkerComponent {
    @Input() public stalker: Stalker;
    @Input() public game: Game;
    @Input() public allItems: Item[];
    @Input() public rankSetting: RankSetting[];
    @Input() public isUnderground: boolean;
    @Input() public isBottomSheet: boolean;
    public itemTooltipComponent: any = ItemTooltipComponent;

    public hiddenMarker: HiddenMarker;
    public shareUrl: string = '';

    public inventory: StuffItem[];

    constructor(private mapService: MapService) { }

    private async ngOnInit(): Promise<void> {
        if (this.stalker.inventoryItems?.length > 0) {
            this.inventory = [];

            for (let inv of this.stalker.inventoryItems) {
                let item = new StuffItem();
                item.item = this.allItems.find(y => y.uniqueName == inv.uniqueName) as Item;
                item.count = inv.count;
                this.inventory.push(item);
            }

            this.inventory.sort((x, y) => {
                let dw = x.item.width - y.item.width;

                if (dw != 0) {
                    return -dw;
                }

                return y.item.area - x.item.area;
            })
        }

        this.shareUrl = `${window.location.origin}/map/${this.game.uniqueName}?lat=${this.stalker.z}&lng=${this.stalker.x}&type=stalkers${this.isUnderground ? `&underground=${this.stalker.locationId}` : ''}`;
        
        this.hiddenMarker = new HiddenMarker();
        this.hiddenMarker.game = this.game.uniqueName;
        this.hiddenMarker.isUnderground = this.isUnderground;
        this.hiddenMarker.layerName = 'stalkers';
        this.hiddenMarker.lat = this.stalker.z;
        this.hiddenMarker.lng = this.stalker.x;
    }
}
