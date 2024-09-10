import { Component, ComponentFactoryResolver, ViewEncapsulation } from '@angular/core';
import { MapComponent } from '../map/map.component';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-map-export',
  standalone: true,
  imports: [],
  templateUrl: './map-export.component.html',
  styleUrls: [
    '../map/map.component.inventory.base.scss',
    '../map/map.component.inventory.addons.scss',
    '../map/map.component.inventory.hovers.scss',
    '../map/map.component.scss',
  ],
  encapsulation: ViewEncapsulation.None
})
export class MapExportComponent extends MapComponent {
  constructor(
    protected override translate: TranslateService,
    protected override route: ActivatedRoute,
    protected override resolver: ComponentFactoryResolver,
    protected override titleService:Title,
    protected override meta: Meta
  ) {
    super(
      translate,
      route,
      resolver,
      titleService,
      meta);

    this.overlaysListTop = '';
    let lang: string = this.route.snapshot.paramMap.get('lang') as string;

    this.translate.use(lang);
    this.translate.currentLang = lang;
    document.body.style.height = '100%';
    document.body.style.margin = '0';
    document.documentElement.style.height = '100%';
  }
}
