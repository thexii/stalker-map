import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MapComponent } from '../map/map.component';
import { Map } from '../../models/map.model';
import { NgFor, NgIf } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { TooltipDirective } from '../tooltips/tooltip.directive';
import { ItemTooltipComponent } from '../tooltips/item-tooltip/item-tooltip.component';
import { Item } from '../../models/item.model';
import { StuffItem } from '../../models/stuff';
import { InventoryItem } from '../../models/inventory-item.model';
import { StuffContent } from '../../models/content';

@Component({
  selector: 'app-map-content',
  standalone: true,
  imports: [NgIf, NgFor, TranslateModule, HeaderComponent, TooltipDirective],
  templateUrl: './map-content.component.html',
  styleUrl: './map-content.component.scss'
})
export class MapContentComponent {
  public readonly game: string;
  public itemTooltipComponent: any = ItemTooltipComponent;
  public items: Item[];

  public display: boolean;
  public stuffs: StuffContent[];

  public readonly stuffTypes: string[] = ['stash', 'quest', '', 'stuff'];

  constructor(
    protected translate: TranslateService,
    protected route: ActivatedRoute,
    protected titleService:Title) {
    let urlGame: string = this.route.snapshot.paramMap.get('game') as string;

    if (MapComponent.avaliableGames.includes(urlGame)) {
      this.game = urlGame;
    } else {
      this.game = MapComponent.defaultGame;
    }
  }

  public copyLink(x: number, z: number, type: string, isUnderground: boolean, locationId: number): void {
    let link = `${window.location.origin}/map/${this.game}?lat=${z}&lng=${x}&type=${type}${isUnderground ? `&underground=${locationId}` : ''}`;
    navigator.clipboard.writeText(link)
  }

  private async ngOnInit(): Promise<void> {
    this.translate.onLangChange.subscribe((i) => {
      this.loadLocales(i.lang);
    });

    await this.loadItems();

    //this.loadLocales(this.translate.currentLang);

    fetch(`/assets/data/${this.game}/map.json`)
      .then((response) => {
        if (response.ok) {
          response.json()
          .then((gamedata: Map) => {this.prepareToDisplay(gamedata)});
        }
      })
  }

  private prepareToDisplay(gamedata: Map): void {
    if (gamedata.stuffs && gamedata.stuffs.length > 0) {
      this.stuffs = [];

      for (let stuff of gamedata.stuffs) {
        let view = new StuffContent();
        view.name = stuff.name;
        view.description = stuff.description;
        view.typeId = stuff.typeId;

        let location = gamedata.locations.find(x => x.id == stuff.locationId);

        if (location) {
          view.isUnderground = location.isUnderground;
          view.locaton = location.uniqueName;
          view.link = `${window.location.origin}/map/${this.game}?lat=${stuff.z}&lng=${stuff.x}&type=${this.stuffTypes[stuff.typeId]}${view.isUnderground ? `&underground=${stuff.locationId}` : ''}`
        }

        view.items = stuff.items.map(x => this.getStuffItem(x));

        view.items.sort((x, y) => {
          let dw = x.item.width - y.item.width;

          if (dw != 0) {
            return -dw;
          }

          return y.item.area - x.item.area;
        });

        view.summaryPrice = 0;
        for (let item of view.items) {
          view.summaryPrice += item.item.price;
        }

        view.maxColumns = Math.max(...view.items.map(x => x.item.width));

        this.stuffs.push(view);
      }
    }

    this.display = true;
  }

  private async loadLocales(language: string): Promise<void> {
    await fetch(`/assets/data/${this.game}/${this.translate.currentLang}.json`)
      .then((response) => {
        if (response.ok) {
          response.json().then((locales: any) => {
            if (locales) {
              this.translate.setTranslation(language, locales, true);
            }
          });
        }
      })
  }

  private async loadItems(): Promise<void> {
    await fetch(`/assets/data/${this.game}/items.json`)
      .then((response) => {
        if (response.ok) {
          response.json()
          .then((items: Item[]) => {
            if (items) {
              this.items = items;
            }
          });
        }
      })
  }

  private getStuffItem(itemToConvert: InventoryItem): StuffItem {
    let item = new StuffItem();
    item.item = this.items.find(y => y.uniqueName == itemToConvert.uniqueName) as Item;
    item.count = itemToConvert.count;

    return item;
  }
}
