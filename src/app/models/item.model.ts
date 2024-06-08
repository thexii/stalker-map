import { ItemMap } from "./item-map.model";

export class Item {
    public uniqueName: string;
    public width: number;
    public height: number;
    public area: number;

    public isQuest: boolean;
    public isUpgraded: boolean;

    public hasScope: boolean;
    public hasSilencer: boolean;
    public hasGrenadeLauncher: boolean;

    public scopeX: number;
    public scopeY: number;
    public silencerX: number;
    public silencerY: number;
    public grenadeLauncherX: number;
    public grenadeLauncherY: number;

    public maps: ItemMap[];
}
