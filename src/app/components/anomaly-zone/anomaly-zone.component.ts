import { Component, Input } from '@angular/core';
import { AnomalyZone } from '../../models/anomaly-zone';
import { TranslateModule } from '@ngx-translate/core';
import { AnomalySpawnSectionView } from '../../models/anomaly-zone/anomaly-spawn-section.view.model';
import { Item } from '../../models/item.model';
import { StuffItem } from '../../models/stuff';
import { HiddenMarker } from '../../models/hidden-marker.model';
import { TooltipDirective } from '../tooltips/tooltip.directive';
import { ItemTooltipComponent } from '../tooltips/item-tooltip/item-tooltip.component';
import { HideUnhideComponent } from '../hide-unhide/hide-unhide.component';

@Component({
    selector: 'app-anomaly-zone',
    standalone: true,
    imports: [TranslateModule, TooltipDirective, HideUnhideComponent],
    templateUrl: './anomaly-zone.component.html',
    styleUrl: './anomaly-zone.component.scss'
})
export class AnomalyZoneComponent {
    @Input() public anomalZone: AnomalyZone;
    @Input() public game: { gameStyle: string, uniqueName: string };
    @Input() public stuffType: string;
    @Input() public allItems: Item[];
    @Input() public isUnderground: boolean;
    public itemTooltipComponent: any = ItemTooltipComponent;
    public hiddenMarker: any = HiddenMarker;

    public Math: Math = Math;

    public spawnSections: AnomalySpawnSectionView[];
    public anomalies: { anomaly: string, count: number }[];
    public isMarkerHidden: boolean = false;

    constructor() { }

    private async ngOnInit(): Promise<void> {
        if (this.anomalZone.anomaliySpawnSections?.length > 0) {
            this.spawnSections = [];

            for (let ss of this.anomalZone.anomaliySpawnSections) {
                let ssv = new AnomalySpawnSectionView();
                ssv.maxCapacity = ss.maxCapacity;
                ssv.count = ss.count;
                ssv.anomalyUniqueName = ss.anomalyUniqueName;
                ssv.anomalySpawnItems = ss.anomalySpawnItems.map(
                    x => {
                        let item = this.allItems.find(y => y.uniqueName == x.uniqueName) as Item;
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
                this.anomalies.push({ anomaly: anomaly, count: this.anomalZone.anomalies[anomaly] as number });
            }
        }
    }

    public copyLink(): void {
        let link = `${window.location.origin}/map/${this.game.uniqueName}?lat=${this.anomalZone.z}&lng=${this.anomalZone.x}&type=anomaly-zone${this.isUnderground ? `&underground=${this.anomalZone.locationId}` : ''}`;
        navigator.clipboard.writeText(link)
    }
}
