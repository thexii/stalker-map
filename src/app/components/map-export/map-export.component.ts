import { Component, ComponentFactoryResolver } from '@angular/core';
import { MapComponent } from '../map/map.component';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-map-export',
  standalone: true,
  imports: [],
  templateUrl: './map-export.component.html',
  styleUrl: './map-export.component.scss'
})
export class MapExportComponent extends MapComponent {
  constructor(
    protected override translate: TranslateService,
    protected override route: ActivatedRoute,
    protected override resolver: ComponentFactoryResolver,
    protected override titleService:Title
  ) {
    super(
      translate,
      route,
      resolver,
      titleService);

    this.overlaysListTop = '';
    let lang: string = this.route.snapshot.paramMap.get('lang') as string;
    this.translate.currentLang = lang;
  }
}
