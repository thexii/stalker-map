import { Component, Input } from '@angular/core';
import { Artefact, ArtefactSpawner, ArtefactSpawnerConfig, ArtefactSpawnerType } from '../../../models/hoc/map-hoc';
import { TranslateModule } from '@ngx-translate/core';
import { Item } from '../../../models/item.model';
import { TooltipDirective } from '../../tooltips/tooltip.directive';
import { ItemTooltipComponent } from '../../tooltips/item-tooltip/item-tooltip.component';

@Component({
  selector: 'app-artefact-spawner-popup',
  standalone: true,
  imports: [TranslateModule, TooltipDirective],
  templateUrl: './artefact-spawner-popup.component.html',
  styleUrl: './artefact-spawner-popup.component.scss'
})
export class ArtefactSpawnerPopupComponent {
  @Input() public artefactSpawner: ArtefactSpawner;
  @Input() public artefactSpawnerData: ArtefactSpawnerConfig;
  @Input() public items: Item[];

  public config: ArtefactSpawnerType;
  public useListOfArtifacts: boolean;
  public artefacts: ArtefactItem[][];

  public itemTooltipComponent: any = ItemTooltipComponent;

  public static readonly excludeArchiArtifacts: string = "EArtifactSpawnerExcludeRule::ExcludeArchiArtifacts";

  private async ngOnInit(): Promise<void> {
    if (this.artefactSpawner.spawner) {
      let config = this.artefactSpawnerData.configs.find(x => x.name == this.artefactSpawner.spawner);
      if (config && config.settings && config.settings.length > 0) {
        this.artefacts = [];

        if (config.useListOfArtifacts) {
          let anomalyArtefacts: ArtefactItem[] = [];
          this.useListOfArtifacts = true;

          if (config.listOfArtifacts && config.listOfArtifacts.length > 0) {
            for (let art of config.listOfArtifacts) {
              let model = new ArtefactItem();

              let artefact = this.artefactSpawnerData.artefacts.find(x => x.name == art);
              let item = this.items.find(x => x.uniqueName == art);

              if (item && artefact) {
                if (item.destroyOnPickup) {
                    continue;
                }

                model.artefact = artefact;
                model.item = item;
                anomalyArtefacts.push(model);
              }
            }
          }

          this.artefacts.push(anomalyArtefacts)
        }
        else {
          let common = this.artefactSpawnerData.artefacts.filter(x => x.rarity == 'EArtifactRarity::Common');
          let uncommon = this.artefactSpawnerData.artefacts.filter(x => x.rarity == 'EArtifactRarity::Uncommon');
          let rare = this.artefactSpawnerData.artefacts.filter(x => x.rarity == 'EArtifactRarity::Rare');
          let epic = this.artefactSpawnerData.artefacts.filter(x => x.rarity == 'EArtifactRarity::Epic');

          if (config.excludeRules && config.excludeRules.includes(ArtefactSpawnerPopupComponent.excludeArchiArtifacts)) {
            epic = epic.filter(x => x.archiartifactType == 'EArchiartifactType::None');
          }

          this.createArtefactItems(common);
          this.createArtefactItems(uncommon);
          this.createArtefactItems(rare);
          this.createArtefactItems(epic);
        }

        this.config = config;
      }
    }
  }

  private createArtefactItems(artefacts: Artefact[]): void {
    let result: ArtefactItem[] = [];

    for (let art of artefacts) {
      let model = new ArtefactItem();

      let item = this.items.find(x => x.uniqueName == art.name);

      if (item) {
        if (item.destroyOnPickup || item.price == 0) {
            continue;
        }

        model.artefact = art;
        model.item = item;
        result.push(model);
      }
    }

    if (result.length > 0) {
      this.artefacts.push(result);
    }
  }
}

class ArtefactItem {
  public artefact: Artefact;
  public item: Item;
}
