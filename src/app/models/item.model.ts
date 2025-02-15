export class Item {
    public uniqueName: string;
    public localeName: string;
    public description: string;
    public width: number;
    public height: number;
    public weight: number;
    public area: number;
    public category: string;

    public gridX: number;
    public gridY: number;

    public isQuest: boolean;
    public installedUpgrades: string[];

    public price: number;
    public boxSize: number;

    public upgr_icon_x : number;
    public upgr_icon_y : number;
    public upgr_icon_width : number;
    public upgr_icon_height : number;

    public $type: string;

    //weapon props
    public hasScope: boolean;
    public hasSilencer: boolean;
    public hasGrenadeLauncher: boolean;

    public scopeX: number;
    public scopeY: number;
    public silencerX: number;
    public silencerY: number;
    public grenadeLauncherX: number;
    public grenadeLauncherY: number;

    public camRelaxSpeed : number;
    public camDispersion : number;
    public camDispersionInc : number;
    public camDispertionFrac : number;
    public camMaxAngle : number;
    public camMaxAngleHorz : number;
    public camStepAngleHorz : number;

    public zoomCamRelaxSpeed : number;
    public zoomCamDispersion : number;
    public zoomCamDispersionInc : number;
    public zoomCamDispertionFrac : number;
    public zoomCamMaxAngle : number;
    public zoomCamMaxAngleHorz : number;
    public zoomCamStepAngleHorz : number;

    public fireDistance : number;
    public bulletSpeed : number;
    public rpm : number;
    public ammoMagazineSize : number;
    public conditionShotDec : number;

    public fireDispersionBase : number;
    public fireDispersionConditionFactor : number;

    public misfireProbability : number;
    public misfireConditionK : number;
    public hitPower : number[];
    public hitPowers : number[][];

    //outfit props
    public burnProtection : number;
    public shockProtection : number;
    public radiationProtection : number;
    public chemicalBurnProtection : number;
    public telepaticProtection : number;
    public strikeProtection : number;
    public explosionProtection : number;
    public woundProtection : number;
    public hitFractionActor : number;
    public powerLoss : number;
    public artefactCount : number;

    public healthRestoreSpeed: number = 0;
    public bleedingRestoreSpeed : number = 0;
    public powerRestoreSpeed : number = 0;
    public additionalInventoryWeight: number = 0;

    //compare
    public guid: string;
    public game: string;

    //hoc weapon
    public preinstalledAttachments: string[];
    public compatibleAttachments: Attachment[];
}

export class Attachment {
  public uniqueName: string;
  public gridX: number;
  public gridY: number;
}
