import { InventoryItem } from "../inventory-item.model";
import { Attachment, Item } from "../item.model";
import { ShapeCollection } from "../map.model";

export class MapHoc {
  public widthInMeters: number;
  public heightInMeters: number;

  public markers: Marker[];
  public lairs: LairCluster[];
  public stuffs: Stuff[];
  public anomalyFields: Marker[];
  public artefactSpawners: ArtefactSpawner[];
  public artefactSpawnerData: ArtefactSpawnerConfig;
  public stashes: Stash[];
  public stashGenerators: StashGenerator[];
  public stashPrototypes: StashPrototype[];
  public traders: TraderHoc[];
  public tradeItemGenerators: TradeItemGenerator[];
  public guides: Guide[];
  public zones: ShapeCollection[];

  public equipmentWidth: number;
  public equipmentHeight: number;
  public attachmentsWidth: number;
  public attachmentsHeight: number;
}

export class TradeItem {
    public item: Item;
    public minCount: number;
    public maxCount: number;
    public price: number;
    public preinstalled: Attachment[];
}

export class TradeItemGenerator {
    public name: string;
    public itemGenerators: TradeItemSubGenerator[];
}

export class TradeItemSubGenerator {
    public allowSameCategoryGeneration: boolean;
    public playerRanks: string[];
    public possibleItems: TraderPossibleItem[];
}

export class TraderPossibleItem {
    public isArray: boolean;
    public chance: number;
    public uniqueName: string;
    public minCount: number;
    public maxCount: number;
}

export class ObjectAtLocationHoc {
  public x: number;
  public y: number;
  public z: number;
  public dlc: string;
}

export class Marker extends ObjectAtLocationHoc {
  public title: string;
  public description: string;
  public type: string;
  public radius: number;
}

export class LairCluster extends ObjectAtLocationHoc {
  public lairs: Lair[];
}

export class Lair {
    public faction: string;
    public type: string;
    public maxSpawnRank: string;
    public minSpawnRank: string;

    public canBeCaptured: boolean;
    public canAttack: boolean;
    public canDefend: boolean;
    public activeLair: boolean;
}

export class Stuff extends ObjectAtLocationHoc {
  public items: InventoryItem[];
}

export class ArtefactSpawner extends ObjectAtLocationHoc {
  public spawner: string;
}

export class ArtefactSpawnerConfig {
  public configs: ArtefactSpawnerType[];
  public artefacts: Artefact[];
}

export class ArtefactSpawnerType {
  public name: string;
  public settings: ArtefactSpawnerSetting[];
  public excludeRules: string[];
  public listOfArtifacts: string[];
  public useListOfArtifacts: boolean;
}

export class ArtefactSpawnerSetting {
  public name: string;
  public count: number;
  public radius: number;
  public minCooldown: number;
  public maxCooldown: number;
  public spawnChanceBase: number;
  public spawnChanceBonus: number;
  public rarityChance: number[];
}

export class Artefact {
  public name: string;
  public weight: number;
  public rarity: string;
  public detectorRequired: boolean;
  public artifactType: string;
  public archiartifactType: string;
  public lifeTime: number;
  public cost: number;
}

export class Stash extends ObjectAtLocationHoc {
  public clueVariablePrototypeSID: string;
  public itemGeneratorSettings: StashItemGenerator[];
  public items: InventoryItem[];
}

export class StashGenerator {
  public name: string;
  public itemGenerators: ItemGenerator[];
}

export class ItemGenerator {
  public allowSameCategoryGeneration: boolean;
  public category: string;
  public difficulty: string;
  public possibleItems: PossibleItem[];
}

export class StashItemGenerator {
  public playerRank: string;
  public itemGenerators: string[];
}

export class PossibleItem {
  public name: string;
  public chance: number;
  public minCount: number;
  public maxCount: number;
  public weight: number;
}

export class StashPrototype {
  public name: string;
  public itemGenerators: StashPrototypeItemGenerator[];
}

export class StashPrototypeItemGenerator {
  public rank: string;
  public consumablesParams: ConsumablesParamsItemGenerator[];
  public primaryWeaponParams: PrimaryWeaponParams[];
  public secondaryWeaponParams: PrimaryWeaponParams[];
  public pistolWeaponParams: PrimaryWeaponParams[];
  public grenadesParams: ConsumablesParamsItemGenerator[];
}

export class ConsumablesParamsItemGenerator {
  public itemSetCount: number;
  public minSpawnChance: number;
  public maxSpawnChance: number;
  public items: PossibleItem[];
}

export class PrimaryWeaponParams {
  public priorityCaliber: string;
  public mainWeaponAmmoCount: number;
  public minSpawnChance: number;
  public maxSpawnChance: number;
  public items: PossibleItem[];
}

export class Npc extends ObjectAtLocationHoc {
    public name: string;
    public marker: string;
    public faction: string;
}

export class TraderHoc extends Npc {
    public infiniteMoney : boolean;
    public buyDiscounts: Condition[];
    public sellDiscounts: Condition[];
    public tradeGenerators: TradeGenerator[];
}

export class GuidePath {
    public destination: string;
    public price: number;
}

export class Guide extends Npc {
    public guidePaths: GuidePath[];
}

export class Condition {
    public sID: string;
    public modifier: number;
}

export class TradeGenerator {
    public condition: string;
    public itemGenerator: string;

    public buyModifier: number;
    public sellModifier: number;
    public weaponSellMinDurability: string;
    public armorSellMinDurability: string;

    public buyLimitations: string[];
}