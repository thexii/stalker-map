import { Component, ComponentFactoryResolver, HostListener, ViewEncapsulation, ViewContainerRef, ViewChild } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { Point } from '../../models/point.model';
import { getAnalytics, logEvent } from 'firebase/analytics';
import { TraderModel } from '../../models/trader/trader.model';
import { TraderComponent } from '../trader/trader.component';
import { StuffComponent } from '../stuff/stuff.component';
import { AnomalyZoneComponent } from '../anomaly-zone/anomaly-zone.component';
import { Item } from '../../models/item.model';

declare const L: any;
declare var markWidth: number;

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [HeaderComponent, TranslateModule],
  templateUrl: './map.component.html',
  styleUrls: [
    './map.component.inventory.base.scss',
    './map.component.inventory.items.scss',
    './map.component.inventory.quest.scss',
    './map.component.inventory.artefacts.scss',
    './map.component.inventory.weapon.scss',
    './map.component.inventory.hovers.scss',
    './map.component.scss'
  ],
  encapsulation: ViewEncapsulation.None,
})

export class MapComponent {
  @ViewChild('dynamicComponents', { read: ViewContainerRef }) container: ViewContainerRef;

  public readonly game: string;

  private readonly avaliableGames: string[] = ["shoc", "cs", "cop", "s2_2011", "hoc"];
  private readonly defaultGame: string = "shoc";

  private gamedata: any;
  private map: any;
  private locations: any;
  private canvasLayer: any;
  private layers: any[] = [];

  constructor(
    private translate: TranslateService,
    private route: ActivatedRoute,
    private resolver: ComponentFactoryResolver
  ) {
    let urlGame: string = this.route.snapshot.paramMap.get('game') as string;

    if (this.avaliableGames.includes(urlGame)) {
      this.game = urlGame;
    }
    else {
      this.game = this.defaultGame;
    }
  }

  public showHideAll(n: any = null) {
    let i = Object.values(this.layers);
    if (n.target.checked) {
      for (let o of i) {
        this.map.addLayer(o);
        o.show(o);
      }
    }
    else {
      for (let o of i) {
        this.map.removeLayer(o);
        o.hide(o);
      }
    }
  }

  @HostListener('window:resize', ['$event'])
  private onResize(event: any) {
    let vh = event.target.outerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);

    let wrapper = document.getElementById('map-wrapper');

    if (wrapper) {
      let wrapperHeight = event.target.innerHeight - wrapper.offsetTop - 10;
      document.documentElement.style.setProperty('--wrapper-height', `${wrapperHeight}px`);
    }
  }

  private async ngOnInit(): Promise<void> {
    if (typeof L === 'undefined') {
      await this.addScript("/assets/libs/leaflet/index.js");
      await this.addScript("/assets/libs/leaflet/leaflet.js");
      await this.addScript("/assets/libs/leaflet/plugins/rbush.js");
      await this.addScript("/assets/libs/leaflet/plugins/leaflet-markers-canvas.js");
      await this.addScript("/assets/libs/leaflet/plugins/search/leaflet-search.js");
      await this.addScript("/assets/libs/leaflet/plugins/search/leaflet-search-geocoder.js");
      await this.addScript("/assets/libs/leaflet/plugins/ruler/leaflet-ruler.js");
      console.log("Leaflet is loaded");
    }

    await Promise.all([this.addStyle("/assets/libs/leaflet/leaflet.css"), this.addStyle("/assets/libs/leaflet/plugins/search/leaflet-search.css"), this.addStyle("/assets/libs/leaflet/plugins/search/leaflet-search.mobile.css"), this.addStyle("/assets/libs/leaflet/plugins/ruler/leaflet-ruler.css")]);

    fetch(`/assets/data/${this.game}.json`)
      .then(response => response.json())
      .then(
        (gamedata: any) => {
          fetch(`/assets/data/${this.game}_config.json`)
            .then(response => response.json())
            .then(
              (gameConfig: any) => {
                this.loadMap(gamedata, gameConfig);
              }
            )
        }
      );

      let body = document.body, html = document.documentElement;

      let height = Math.max( body.scrollHeight, body.offsetHeight,
                       html.clientHeight, html.scrollHeight, html.offsetHeight);

    let wrapper = document.getElementById('map-wrapper');

    if (wrapper) {
      let wrapperHeight = height - wrapper.offsetTop - 10;
      document.documentElement.style.setProperty('--wrapper-height', `${wrapperHeight}px`);
    }

    let itemJson: string = `[{"Id":0,"Category":null,"UniqueName":"af_ameba_mica","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":5000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_ameba_slime","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":1000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_ameba_slug","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":2500,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_baloon","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":12000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":12000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_blood","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":2000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":2000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":1000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_compass","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":50000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":50000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_cristall","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":2000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":2000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":5000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_cristall_flower","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":3000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":3000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":2500,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_drops","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":1000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_dummy_battery","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":6000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":6000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":5000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_dummy_dummy","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":12000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":12000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":5000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_dummy_glassbeads","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":6000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":6000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":5000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_dummy_pellicle","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":5000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_dummy_spring","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":5000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_electra_flash","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":4000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":4000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":2500,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_electra_moonlight","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":6000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":6000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":5000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_electra_sparkler","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":2000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":2000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":1000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_eye","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":12000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":12000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_fire","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":18000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":18000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_fireball","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":4000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":4000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":2500,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_fuzz_kolobok","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":12000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":12000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":5000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_glass","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":18000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":18000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_gold_fish","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":18000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":18000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":5000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_gravi","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":12000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":12000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":2500,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_ice","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":18000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":18000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_medusa","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":4000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":4000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":1000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_mincer_meat","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":4000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":4000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":2500,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_night_star","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":6000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":6000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":5000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_oasis_heart","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":50000,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_quest_b14_twisted","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":1000,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_rusty_kristall","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":2500,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_rusty_sea-urchin","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":5000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_rusty_thorn","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":1000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_soul","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":6000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":6000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":5000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"af_vyvert","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":8000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":8000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":1000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_11.43x23_fmj","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":600,"BoxSize":50},{"ItemId":0,"MapId":2,"Cost":250,"BoxSize":50},{"ItemId":0,"MapId":1,"Cost":200,"BoxSize":20}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_11.43x23_hydro","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":1000,"BoxSize":50},{"ItemId":0,"MapId":2,"Cost":500,"BoxSize":50},{"ItemId":0,"MapId":1,"Cost":215,"BoxSize":20}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_12x70_buck","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":120,"BoxSize":10},{"ItemId":0,"MapId":2,"Cost":10,"BoxSize":10},{"ItemId":0,"MapId":1,"Cost":50,"BoxSize":10}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_12x76_dart","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":50,"BoxSize":10},{"ItemId":0,"MapId":1,"Cost":100,"BoxSize":10}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_12x76_zhekan","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":250,"BoxSize":10},{"ItemId":0,"MapId":2,"Cost":20,"BoxSize":10},{"ItemId":0,"MapId":1,"Cost":60,"BoxSize":10}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_12x76_zhekan_heli","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":20,"BoxSize":10},{"ItemId":0,"MapId":1,"Cost":60,"BoxSize":10}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_5.45x39_ap","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":1100,"BoxSize":60},{"ItemId":0,"MapId":2,"Cost":450,"BoxSize":60},{"ItemId":0,"MapId":1,"Cost":250,"BoxSize":30}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_5.45x39_fmj","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":650,"BoxSize":60},{"ItemId":0,"MapId":2,"Cost":250,"BoxSize":60},{"ItemId":0,"MapId":1,"Cost":200,"BoxSize":30}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_5.56x45_ap","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":1150,"BoxSize":60},{"ItemId":0,"MapId":2,"Cost":540,"BoxSize":60},{"ItemId":0,"MapId":1,"Cost":380,"BoxSize":30}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_5.56x45_ss190","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":700,"BoxSize":60},{"ItemId":0,"MapId":2,"Cost":300,"BoxSize":60},{"ItemId":0,"MapId":1,"Cost":320,"BoxSize":30}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_7.62x54_7h1","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":400,"BoxSize":10},{"ItemId":0,"MapId":2,"Cost":450,"BoxSize":30},{"ItemId":0,"MapId":1,"Cost":900,"BoxSize":10}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_7.62x54_7h14","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":1000,"BoxSize":30},{"ItemId":0,"MapId":1,"Cost":1000,"BoxSize":10}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_7.62x54_ap","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":600,"BoxSize":30},{"ItemId":0,"MapId":1,"Cost":950,"BoxSize":10}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_9x18_fmj","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":200,"BoxSize":50},{"ItemId":0,"MapId":2,"Cost":50,"BoxSize":50},{"ItemId":0,"MapId":1,"Cost":70,"BoxSize":20}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_9x18_pmm","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":300,"BoxSize":50},{"ItemId":0,"MapId":2,"Cost":50,"BoxSize":50},{"ItemId":0,"MapId":1,"Cost":80,"BoxSize":20}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_9x19_fmj","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":250,"BoxSize":50},{"ItemId":0,"MapId":2,"Cost":100,"BoxSize":50},{"ItemId":0,"MapId":1,"Cost":100,"BoxSize":20}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_9x19_pbp","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":350,"BoxSize":50},{"ItemId":0,"MapId":2,"Cost":100,"BoxSize":50},{"ItemId":0,"MapId":1,"Cost":120,"BoxSize":20}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_9x39_ap","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":700,"BoxSize":30},{"ItemId":0,"MapId":2,"Cost":720,"BoxSize":60},{"ItemId":0,"MapId":1,"Cost":400,"BoxSize":30}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_9x39_pab9","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":550,"BoxSize":30},{"ItemId":0,"MapId":2,"Cost":630,"BoxSize":60},{"ItemId":0,"MapId":1,"Cost":340,"BoxSize":30}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_9x39_sp5","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":375,"BoxSize":30}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_gauss","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":2000,"BoxSize":10},{"ItemId":0,"MapId":2,"Cost":1000,"BoxSize":10},{"ItemId":0,"MapId":1,"Cost":550,"BoxSize":10}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_m209","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":350,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_og-7b","Sort":0,"Width":3,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":2000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":500,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":1000,"BoxSize":1}],"Area":3,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_pkm_100","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":2000,"BoxSize":100},{"ItemId":0,"MapId":2,"Cost":1000,"BoxSize":100}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_vog-25","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":300,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":100,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":150,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ammo_vog-25p","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":100,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":170,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"antirad","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":250,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":300,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":300,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"bandage","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":80,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":200,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":20,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"bandit_outfit","Sort":0,"Width":2,"Height":2,"Maps":[{"ItemId":0,"MapId":2,"Cost":500,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":3000,"BoxSize":1}],"Area":4,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"bread","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":10,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":20,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":20,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"conserva","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":40,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":100,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":100,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"cs_heavy_outfit","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":3,"Cost":20000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":15000,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"cs_light_outfit","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":2,"Cost":5000,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"decoder","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":50,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"detector_advanced","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":1000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":1000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"detector_elite","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":2000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":1500,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"detector_scientific","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":12500,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"detector_simple","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":500,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":500,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"dev_flash_1","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":50,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":50,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"dev_flash_2","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":50,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":50,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"device_pda","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":20,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":20,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"device_pda_fang","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":0,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"device_pda_old","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":0,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"device_torch","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":100,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":100,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"dolg_heavy_outfit","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":3,"Cost":25000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":20000,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"dolg_outfit","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":3,"Cost":6500,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":8125,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":14000,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"dolg_scientific_outfit","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":1,"Cost":25000,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"drug_anabiotic","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":1000,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"drug_antidot","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":300,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"drug_booster","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":200,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"drug_coagulant","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":200,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"drug_psy_blockade","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":550,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"drug_radioprotector","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":300,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"ecolog_outfit","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":1,"Cost":15000,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"energy_drink","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":50,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":75,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":75,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"exo_outfit","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":3,"Cost":50000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":55000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":50000,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"flesh_up_a_novice_outfit","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":1000,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"flesh_up_ab_pkm","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":7500,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"flesh_up_ab_svu","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":3750,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"flesh_up_abcd_pkm","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":12500,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"flesh_up_abcd_svu","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":6250,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"flesh_up_ac_ak74u","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":903,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"flesh_up_ac_desert_eagle","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":1125,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"flesh_up_ac_mp5","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":1125,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"flesh_up_ac_spas12","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":1125,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"flesh_up_ac_wincheaster1300","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":750,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"flesh_up_aceg_scientific_outfit","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":12500,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"flesh_up_bd_desert_eagle","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":1125,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"flesh_up_bd_mp5","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":1125,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"flesh_up_bd_wincheaster1300","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":750,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"flesh_up_bdfh_scientific_outfit","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":12500,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"flesh_up_cd_pkm","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":7500,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"flesh_up_cd_svu","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":3750,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"flesh_up_fh_scientific_outfit","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":9375,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"grenade_f1","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":500,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":500,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":210,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"grenade_gd-05","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":300,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":350,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":210,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"grenade_rgd5","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":300,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":350,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":100,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"guitar_a","Sort":0,"Width":4,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":35,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":35,"BoxSize":1}],"Area":8,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"gunslinger_flash","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":0,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"helm_battle","Sort":0,"Width":2,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":6000,"BoxSize":1}],"Area":4,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"helm_hardhat","Sort":0,"Width":2,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":1200,"BoxSize":1}],"Area":4,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"helm_hardhat_snag","Sort":0,"Width":2,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":1400,"BoxSize":1}],"Area":4,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"helm_protective","Sort":0,"Width":2,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":6000,"BoxSize":1}],"Area":4,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"helm_respirator","Sort":0,"Width":2,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":1000,"BoxSize":1}],"Area":4,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"helm_respirator_joker","Sort":0,"Width":2,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":1200,"BoxSize":1}],"Area":4,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"helm_tactic","Sort":0,"Width":2,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":7000,"BoxSize":1}],"Area":4,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"hunters_toz","Sort":0,"Width":3,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":400,"BoxSize":1}],"Area":3,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"jup_b1_half_artifact","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":1000,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"jup_b10_ufo_memory","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":0,"BoxSize":1}],"Area":2,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"jup_b200_tech_materials_acetone","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":20,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"jup_b200_tech_materials_capacitor","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":20,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"jup_b200_tech_materials_textolite","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":20,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"jup_b200_tech_materials_transistor","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":20,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"jup_b200_tech_materials_wire","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":20,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"jup_b205_sokolov_note","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":0,"BoxSize":1}],"Area":2,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"killer_outfit","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":1,"Cost":6000,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"kolbasa","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":70,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":50,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":50,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"lx8_service_instruction","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":0,"BoxSize":1}],"Area":2,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"medkit","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":250,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":300,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":150,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"medkit_army","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":650,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":500,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":220,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"medkit_scientic","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":800,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":1000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":200,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"military_outfit","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":3,"Cost":25000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":25000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":40000,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"monolit_outfit","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":1,"Cost":10000,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"mutant_psevdodog_tail","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":0,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"novice_outfit","Sort":0,"Width":2,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":500,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":500,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":1000,"BoxSize":1}],"Area":4,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"outfit_bandit_m1","Sort":0,"Width":2,"Height":2,"Maps":[{"ItemId":0,"MapId":1,"Cost":3000,"BoxSize":1}],"Area":4,"IsQuest":true,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"outfit_dolg_m1","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":1,"Cost":14000,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"outfit_exo_m1","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":1,"Cost":50000,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"outfit_killer_m1","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":1,"Cost":6000,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"outfit_novice_m1","Sort":0,"Width":2,"Height":2,"Maps":[{"ItemId":0,"MapId":1,"Cost":1000,"BoxSize":1}],"Area":4,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"outfit_specnaz_m1","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":1,"Cost":12000,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"outfit_stalker_m1","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":1,"Cost":15000,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"outfit_svoboda_m1","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":1,"Cost":10000,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"pri_a15_documents","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":100,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"pri_a17_gauss_rifle","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":25000,"BoxSize":1}],"Area":10,"IsQuest":true,"IsUpgraded":false,"HasScope":true,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":60,"ScopeY":-2,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"pri_a19_american_experiment_info","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":0,"BoxSize":1}],"Area":2,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"pri_a19_lab_x10_info","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":0,"BoxSize":1}],"Area":2,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"pri_a19_lab_x16_info","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":0,"BoxSize":1}],"Area":2,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"pri_a19_lab_x18_info","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":0,"BoxSize":1}],"Area":2,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"pri_a19_lab_x7_info","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":0,"BoxSize":1}],"Area":2,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"pri_b36_monolith_hiding_place_pda","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":0,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"pri_decoder_documents","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":0,"BoxSize":1}],"Area":2,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"protection_outfit","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":1,"Cost":24000,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"quest_case_01","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":50,"BoxSize":1}],"Area":2,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"quest_case_02","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":1000,"BoxSize":1}],"Area":2,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"scientific_outfit","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":3,"Cost":25000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":18750,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":30000,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"specops_outfit","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":3,"Cost":12500,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":12500,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":12000,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"stalker_outfit","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":3,"Cost":5000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":6250,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":15000,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"stalker_outfit_barge","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":3,"Cost":6200,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"svoboda_heavy_outfit","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":3,"Cost":18500,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":15000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":12500,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"svoboda_light_outfit","Sort":0,"Width":2,"Height":3,"Maps":[{"ItemId":0,"MapId":3,"Cost":6500,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":7500,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":10000,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"toolkit_1","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":20,"BoxSize":1}],"Area":2,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"toolkit_2","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":20,"BoxSize":1}],"Area":2,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"toolkit_3","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":20,"BoxSize":1}],"Area":2,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"vodka","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":40,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":100,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":100,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"vodka_script","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":40,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_abakan","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":6000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":6000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":2500,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":-1000,"ScopeY":-1000,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_abakan_m1","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":1,"Cost":2500,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":true,"HasScope":true,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":47,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_abakan_m2","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":1,"Cost":2500,"BoxSize":1}],"Area":10,"IsQuest":true,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":true,"ScopeX":47,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":126,"GrenadeLauncherY":24},{"Id":0,"Category":null,"UniqueName":"wpn_abakan_up2","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":2,"Cost":6000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":47,"ScopeY":0,"SilencerX":228,"SilencerY":9,"GrenadeLauncherX":126,"GrenadeLauncherY":24},{"Id":0,"Category":null,"UniqueName":"wpn_addon_grenade_launcher","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":2000,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_addon_grenade_launcher_m203","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":1500,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_addon_scope","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":800,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":1000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":200,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_addon_scope_4x","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":1000,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_addon_scope_detector","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":10000,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_addon_scope_night","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":3000,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_addon_scope_susat","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":900,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":1500,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":200,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_addon_scope_susat_custom","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":5500,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_addon_scope_susat_dusk","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":2500,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_addon_scope_susat_night","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":3500,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_addon_scope_susat_x1.6","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":900,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_addon_scope_x2.7","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":2000,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_addon_silencer","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":200,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":200,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":100,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_ak74","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":4000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":4000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":2000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":126,"GrenadeLauncherY":24},{"Id":0,"Category":null,"UniqueName":"wpn_ak74_m1","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":1,"Cost":2000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":42,"ScopeY":3,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":116,"GrenadeLauncherY":23},{"Id":0,"Category":null,"UniqueName":"wpn_ak74_minigame","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":2,"Cost":0,"BoxSize":1}],"Area":10,"IsQuest":true,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":224,"SilencerY":13,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_ak74_up","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":2,"Cost":4000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":224,"SilencerY":13,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_ak74_up2","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":2,"Cost":4000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":47,"ScopeY":0,"SilencerX":224,"SilencerY":13,"GrenadeLauncherX":126,"GrenadeLauncherY":24},{"Id":0,"Category":null,"UniqueName":"wpn_ak74u","Sort":0,"Width":4,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":3000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":2100,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":1000,"BoxSize":1}],"Area":8,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_ak74u_m1","Sort":0,"Width":4,"Height":2,"Maps":[{"ItemId":0,"MapId":1,"Cost":1000,"BoxSize":1}],"Area":8,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":true,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":168,"SilencerY":-3,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_ak74u_snag","Sort":0,"Width":4,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":3200,"BoxSize":1}],"Area":8,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_beretta","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":750,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":900,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":900,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_beretta_minigame","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":0,"BoxSize":1}],"Area":2,"IsQuest":true,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_binoc","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":800,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":200,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":200,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":true,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":-1000,"ScopeY":-1000,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_bm16","Sort":0,"Width":3,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":200,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":200,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":400,"BoxSize":1}],"Area":3,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_colt_m1","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":1100,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":true,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":62,"SilencerY":-15,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_colt1911","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":900,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":1500,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":1100,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_colt1911_up2","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":1500,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":62,"SilencerY":-15,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_desert_eagle","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":1800,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":3750,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":2500,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_desert_eagle_nimble","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":3500,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_desert_eagle_up","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":3750,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_eagle_m1","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":2500,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":77,"SilencerY":-17,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_fn2000","Sort":0,"Width":4,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":14000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":12500,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":17000,"BoxSize":1}],"Area":8,"IsQuest":false,"IsUpgraded":false,"HasScope":true,"HasSilencer":false,"HasGrenadeLauncher":true,"ScopeX":63,"ScopeY":-1,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":95,"GrenadeLauncherY":25},{"Id":0,"Category":null,"UniqueName":"wpn_fn2000_nimble","Sort":0,"Width":4,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":20000,"BoxSize":1}],"Area":8,"IsQuest":false,"IsUpgraded":false,"HasScope":true,"HasSilencer":false,"HasGrenadeLauncher":true,"ScopeX":63,"ScopeY":-1,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":95,"GrenadeLauncherY":25},{"Id":0,"Category":null,"UniqueName":"wpn_fort","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":600,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":600,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":350,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_fort_m1","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":350,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":38,"SilencerY":-17,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_fort_snag","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":700,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_fort_up","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":600,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_g36","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":10000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":10000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":18000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":false,"HasScope":true,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":78,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_g36_nimble","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":12000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":false,"HasScope":true,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":78,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_g36_up2","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":2,"Cost":10000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":true,"HasScope":true,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":78,"ScopeY":0,"SilencerX":214,"SilencerY":12,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_gauss","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":25000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":25000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":25000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":false,"HasScope":true,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":60,"ScopeY":-2,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_gauss_aes","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":2,"Cost":25000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":false,"HasScope":true,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":60,"ScopeY":-2,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_groza","Sort":0,"Width":4,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":10000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":9000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":10000,"BoxSize":1}],"Area":8,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":true,"ScopeX":0,"ScopeY":0,"SilencerX":180,"SilencerY":16,"GrenadeLauncherX":109,"GrenadeLauncherY":30},{"Id":0,"Category":null,"UniqueName":"wpn_groza_m1","Sort":0,"Width":4,"Height":2,"Maps":[{"ItemId":0,"MapId":1,"Cost":10000,"BoxSize":1}],"Area":8,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":true,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":-1000,"GrenadeLauncherY":-1000},{"Id":0,"Category":null,"UniqueName":"wpn_groza_nimble","Sort":0,"Width":4,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":15000,"BoxSize":1}],"Area":8,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":true,"ScopeX":-1000,"ScopeY":-1000,"SilencerX":180,"SilencerY":16,"GrenadeLauncherX":109,"GrenadeLauncherY":30},{"Id":0,"Category":null,"UniqueName":"wpn_groza_specops","Sort":0,"Width":4,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":15000,"BoxSize":1}],"Area":8,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":true,"ScopeX":-1000,"ScopeY":-1000,"SilencerX":180,"SilencerY":16,"GrenadeLauncherX":109,"GrenadeLauncherY":30},{"Id":0,"Category":null,"UniqueName":"wpn_hpsa","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":650,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":600,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":500,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_knife","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":0,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":900,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":70,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_l85","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":5000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":5000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":4000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":false,"HasScope":true,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":60,"ScopeY":-2,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_l85_m1","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":1,"Cost":4000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":true,"HasScope":true,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":60,"ScopeY":-2,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_l85_m2","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":1,"Cost":4000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":true,"HasScope":true,"HasSilencer":true,"HasGrenadeLauncher":false,"ScopeX":60,"ScopeY":-2,"SilencerX":190,"SilencerY":10,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_lr300","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":6000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":6000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":5000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":-1000,"ScopeY":-1000,"SilencerX":210,"SilencerY":9,"GrenadeLauncherX":128,"GrenadeLauncherY":28},{"Id":0,"Category":null,"UniqueName":"wpn_lr300_m1","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":1,"Cost":5000,"BoxSize":1}],"Area":10,"IsQuest":true,"IsUpgraded":true,"HasScope":true,"HasSilencer":true,"HasGrenadeLauncher":false,"ScopeX":86,"ScopeY":-5,"SilencerX":210,"SilencerY":9,"GrenadeLauncherX":128,"GrenadeLauncherY":28},{"Id":0,"Category":null,"UniqueName":"wpn_lr300_minigame","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":2,"Cost":0,"BoxSize":1}],"Area":10,"IsQuest":true,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":75,"ScopeY":-5,"SilencerX":210,"SilencerY":9,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_lr300_up2","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":2,"Cost":6000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":75,"ScopeY":-5,"SilencerX":210,"SilencerY":9,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_mp5","Sort":0,"Width":3,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":3600,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":3000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":1100,"BoxSize":1}],"Area":3,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":130,"SilencerY":-13,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_mp5_m1","Sort":0,"Width":3,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":1100,"BoxSize":1}],"Area":3,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":130,"SilencerY":-15,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_mp5_m2","Sort":0,"Width":3,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":1100,"BoxSize":1}],"Area":3,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":true,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":130,"SilencerY":-15,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_mp5_minigame","Sort":0,"Width":3,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":0,"BoxSize":1}],"Area":3,"IsQuest":true,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":130,"SilencerY":-13,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_mp5_nimble","Sort":0,"Width":3,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":5500,"BoxSize":1}],"Area":3,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":130,"SilencerY":-13,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_pb","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":700,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":400,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":300,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":true,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":65,"SilencerY":-18,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_pkm","Sort":0,"Width":6,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":20000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":50000,"BoxSize":1}],"Area":12,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_pkm_zulus","Sort":0,"Width":6,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":25000,"BoxSize":1}],"Area":12,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_pm","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":400,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":300,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":280,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_pm_9x19","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":300,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":39,"SilencerY":-16,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_pm_actor","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":500,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_pm_minigame","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":0,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":39,"SilencerY":-16,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_pm_up","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":300,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":39,"SilencerY":-16,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_protecta","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":9000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":63,"ScopeY":-1,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_protecta_nimble","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":12000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":63,"ScopeY":-1,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_rg-6","Sort":0,"Width":4,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":20000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":10000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":12000,"BoxSize":1}],"Area":8,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_rg6_m1","Sort":0,"Width":4,"Height":2,"Maps":[{"ItemId":0,"MapId":1,"Cost":12000,"BoxSize":1}],"Area":8,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_rpg7","Sort":0,"Width":5,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":26000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":25000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":10000,"BoxSize":1}],"Area":5,"IsQuest":false,"IsUpgraded":false,"HasScope":true,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":-1000,"ScopeY":-1000,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_sig_m1","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":1,"Cost":6500,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_sig_m2","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":1,"Cost":6500,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":true,"HasScope":true,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":78,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":109,"GrenadeLauncherY":30},{"Id":0,"Category":null,"UniqueName":"wpn_sig_no_draw_sound","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":2,"Cost":7500,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":221,"SilencerY":16,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_sig_with_scope","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":2,"Cost":7500,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":false,"HasScope":true,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":78,"ScopeY":0,"SilencerX":221,"SilencerY":16,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_sig220","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":1200,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":3000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":1200,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":48,"SilencerY":-14,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_sig220_nimble","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":2800,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":48,"SilencerY":-14,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_sig550","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":8000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":7500,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":6500,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":109,"GrenadeLauncherY":30},{"Id":0,"Category":null,"UniqueName":"wpn_sig550_luckygun","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":10000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":-1000,"ScopeY":-1000,"SilencerX":221,"SilencerY":14,"GrenadeLauncherX":109,"GrenadeLauncherY":30},{"Id":0,"Category":null,"UniqueName":"wpn_sig550_minigame","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":2,"Cost":0,"BoxSize":1}],"Area":10,"IsQuest":true,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":221,"SilencerY":16,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_sig550_up2","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":2,"Cost":7500,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":221,"SilencerY":16,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_spas12","Sort":0,"Width":5,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":5300,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":1750,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":2000,"BoxSize":1}],"Area":5,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_spas12_m1","Sort":0,"Width":5,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":2000,"BoxSize":1}],"Area":5,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_spas12_nimble","Sort":0,"Width":5,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":5200,"BoxSize":1}],"Area":5,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_svd","Sort":0,"Width":6,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":16000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":15500,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":15000,"BoxSize":1}],"Area":12,"IsQuest":false,"IsUpgraded":false,"HasScope":true,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":60,"ScopeY":-2,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_svd_nimble","Sort":0,"Width":6,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":18000,"BoxSize":1}],"Area":12,"IsQuest":false,"IsUpgraded":false,"HasScope":true,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":60,"ScopeY":-2,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_svu","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":17000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":17500,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":10000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":false,"HasScope":true,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":60,"ScopeY":-2,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_svu_nimble","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":20000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":false,"HasScope":true,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":60,"ScopeY":-2,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_toz34","Sort":0,"Width":6,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":1200,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":400,"BoxSize":1}],"Area":6,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_usp","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":1400,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":2250,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":1500,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":48,"SilencerY":-15,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_usp_nimble","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":3000,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":48,"SilencerY":-15,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_val","Sort":0,"Width":4,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":9000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":10200,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":9000,"BoxSize":1}],"Area":8,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":true,"HasGrenadeLauncher":false,"ScopeX":-1000,"ScopeY":-1000,"SilencerX":221,"SilencerY":16,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_val_m1","Sort":0,"Width":4,"Height":2,"Maps":[{"ItemId":0,"MapId":1,"Cost":9000,"BoxSize":1}],"Area":8,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":true,"HasGrenadeLauncher":false,"ScopeX":37,"ScopeY":0,"SilencerX":-1000,"SilencerY":-1000,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_val_minigame","Sort":0,"Width":4,"Height":2,"Maps":[{"ItemId":0,"MapId":2,"Cost":0,"BoxSize":1}],"Area":8,"IsQuest":true,"IsUpgraded":true,"HasScope":false,"HasSilencer":true,"HasGrenadeLauncher":false,"ScopeX":37,"ScopeY":0,"SilencerX":221,"SilencerY":16,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_vintorez","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":12000,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":12000,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":12000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":false,"HasScope":true,"HasSilencer":true,"HasGrenadeLauncher":false,"ScopeX":78,"ScopeY":0,"SilencerX":221,"SilencerY":16,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_vintorez_nimble","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":15000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":false,"HasScope":true,"HasSilencer":true,"HasGrenadeLauncher":false,"ScopeX":78,"ScopeY":0,"SilencerX":221,"SilencerY":16,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_vintorez_up","Sort":0,"Width":5,"Height":2,"Maps":[{"ItemId":0,"MapId":2,"Cost":12000,"BoxSize":1}],"Area":10,"IsQuest":false,"IsUpgraded":true,"HasScope":true,"HasSilencer":true,"HasGrenadeLauncher":false,"ScopeX":78,"ScopeY":0,"SilencerX":221,"SilencerY":16,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_walther","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":1200,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":1200,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":800,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_walther_m1","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":800,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_walther_up2","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":2,"Cost":1200,"BoxSize":1}],"Area":1,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":39,"SilencerY":-14,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_wincheaster1300","Sort":0,"Width":5,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":2400,"BoxSize":1},{"ItemId":0,"MapId":2,"Cost":1250,"BoxSize":1},{"ItemId":0,"MapId":1,"Cost":2150,"BoxSize":1}],"Area":5,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_wincheaster1300_trapper","Sort":0,"Width":5,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":5000,"BoxSize":1}],"Area":5,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"wpn_winchester_m1","Sort":0,"Width":5,"Height":1,"Maps":[{"ItemId":0,"MapId":1,"Cost":2150,"BoxSize":1}],"Area":5,"IsQuest":false,"IsUpgraded":true,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"zat_a23_gauss_rifle_docs","Sort":0,"Width":2,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":0,"BoxSize":1}],"Area":2,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"zat_a23_labx8_key","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":0,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"zat_b33_safe_container","Sort":0,"Width":2,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":20,"BoxSize":1}],"Area":4,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"zat_b39_joker_pda","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":20,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"zat_b40_notebook","Sort":0,"Width":2,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":100,"BoxSize":1}],"Area":4,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"zat_b44_barge_pda","Sort":0,"Width":1,"Height":1,"Maps":[{"ItemId":0,"MapId":3,"Cost":2000,"BoxSize":1}],"Area":1,"IsQuest":true,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0},{"Id":0,"Category":null,"UniqueName":"zat_b57_gas","Sort":0,"Width":1,"Height":2,"Maps":[{"ItemId":0,"MapId":3,"Cost":0,"BoxSize":1}],"Area":2,"IsQuest":false,"IsUpgraded":false,"HasScope":false,"HasSilencer":false,"HasGrenadeLauncher":false,"ScopeX":0,"ScopeY":0,"SilencerX":0,"SilencerY":0,"GrenadeLauncherX":0,"GrenadeLauncherY":0}]`;
    let items: any[] = JSON.parse(itemJson);
    console.log(items);

    let strings: string = "";

    for (let item of items) {
      if (this.translate.instant(item.UniqueName) == item.UniqueName) {
        strings += `"${item.UniqueName}",`;
      }
    }

    if (strings) {
      console.error(strings);
    }
  }

  private async ngOnDestroy(): Promise<void> {
    if (this.map) {
      console.log("remove");
      this.map.remove();
      this.map = null;
    }
  }

  private loadMap(gameData: any, gameConfig: any): void {
    this.gamedata = gameData;
    this.map = L.map("map", {
      center: [gameData.heightInPixels / 2, gameData.widthInPixels / 2],
      zoom: 1,
      minZoom: gameConfig.minZoom,
      maxZoom: gameConfig.maxZoom,
      crs: L.CRS.Simple,
      markerZoomAnimation: !0,
      zoomAnimation: !0,
      zoomControl: !1
    });

    let bounds = [[0, 0], [this.gamedata.heightInPixels, this.gamedata.widthInPixels]];
    L.imageOverlay(`/assets/images/maps/${this.gamedata.uniqueName}/${gameConfig.globalMapFileName}`, bounds).addTo(this.map);
    this.map.fitBounds(bounds);
    markWidth = Math.exp(1.3615 + .6117 * this.map.getZoom());
    document.documentElement.style.setProperty(`--map-mark-width`, `${markWidth}px`);
    this.map.setMaxBounds(bounds);

    this.canvasLayer = new L.MarkersCanvas();
    this.canvasLayer.addTo(this.map);

    this.map.redraw = () => {
        this.canvasLayer.redraw();
    }

    this.map.on("zoomend", ()=>{
      markWidth = 3 * Math.pow(2, this.map.getZoom())
      document.documentElement.style.setProperty(`--map-mark-width`, `${markWidth}px`);
    });

    if (this.gamedata.locations && this.gamedata.locations.length > 0) {
      this.addLocations();
      let marks = "";

      for (let location of this.gamedata.locations) {
        if (this.translate.instant(location.uniqueName) == location.uniqueName) {
          marks += `"${location.uniqueName}",`
        }
      }

      if (marks) {
        console.error(marks);
      }
    }

    if (this.gamedata.marks && this.gamedata.marks.length > 0) {
      this.addMarks();
      let marks = "";
      for (let mark of this.gamedata.marks) {

        if (this.translate.instant(mark.name) == mark.name) {
          marks += `"${mark.name}",`
        }
        if (mark.description && this.translate.instant(mark.description) == mark.description) {
          marks += `"${mark.description}",`
        }
      }

      if (marks) {
        console.error(marks);
      }
    }

    if (this.gamedata.stuffs && this.gamedata.stuffs.length > 0) {
      this.addStuffs();
      let marks = "";

      for (let stuff of this.gamedata.stuffs) {
        if (this.translate.instant(stuff.name) == stuff.name) {
          marks += `"${stuff.name}",`
        }
        if (this.translate.instant(stuff.description) == stuff.description) {
          marks += `"${stuff.description}",`
        }
      }

      if (marks) {
        console.error(marks);
      }
    }

    if (this.gamedata.anomalyZones && this.gamedata.anomalyZones.length > 0 ) {
      this.addAnomalyZones();
    }

    if (this.gamedata.traders && this.gamedata.traders.length > 0) {
        this.addTraders();
    }

    let layersToHide = [];

    if (gameConfig.markersConfig != null && gameConfig.markersConfig.length > 0 && this.layers != null) {
        let allLayers = Object.values(this.layers);
        let newLayers: any = {};
        for (let config of gameConfig.markersConfig) {
          if (allLayers.some(y => y.name == config.uniqueName)) {
            let currentLayer = allLayers.filter(D=> D.name == config.uniqueName)[0];
            newLayers[this.translate.instant(config.uniqueName)] = currentLayer;

            if (!config.isShow) {
              layersToHide.push(currentLayer);
            }
          }
        }

        this.layers = newLayers;
    }

    let layerControl = L.control.layers(null, this.layers).addTo(this.map)

    this.map.on('drag', () => {
      this.map.panInsideBounds(bounds, { animate: false });
    });

    let searchLayers = L.featureGroup(Object.values(this.layers));
    let translate = this.translate;

    let searchContoller = L.control.search({
        layer: searchLayers,
        initial: false,
        propertyName: 'search',
        delayType: 0,
        collapsed: false,
        autoCollapseTime: 10000,
        textPlaceholder: this.translate.instant("search"),
        buildTip: function (text: string, val: any) {
            let type = val.layer.properties.typeUniqueName;
            let translated = translate.instant(val.layer.properties.name);
            let location = translate.instant(val.layer.properties.locationUniqueName);
            return '<a href="#"><span class="stalker-search-item ' + type + '">' + translated + '</span> <b>(' + location + ')</b></a>';
        }
    });

    if (gameConfig.rulerEnabled) {
      var options = {
          position: 'topright',         // Leaflet control position option
          circleMarker: {               // Leaflet circle marker options for points used in this plugin
            color: 'red',
            radius: 2
          },
          lineStyle: {                  // Leaflet polyline options for lines used in this plugin
            color: 'red',
            dashArray: '1,6'
          },
          lengthUnit: {
              factor: gameConfig.lengthFactor, //  from km to nm
              display: this.translate.instant('meterShort'),
              decimal: 2,
              label: this.translate.instant('length')
          },
          angleUnit: {
            display: '&deg;',           // This is the display value will be shown on the screen. Example: 'Gradian'
            decimal: 2,                 // Bearing result will be fixed to this value.
            factor: null,                // This option is required to customize angle unit. Specify solid angle value for angle unit. Example: 400 (for gradian).
            label: this.translate.instant('azimuth')
          }
      };

      L.control.ruler(options).addTo(this.map);
    }

    searchContoller.on('search:locationfound', function (e: { layer: { openPopup: () => void; }; }) {
        e.layer.openPopup();
    });

    this.map.addControl(searchContoller);

    L.control.zoom({
        position: 'bottomright'
    }).addTo(this.map);

    let carousel = document.getElementById("layers-control") as HTMLElement;

    carousel.addEventListener("wheel", function (e) {
        if (e.deltaY > 0) carousel.scrollLeft += 100;
        else carousel.scrollLeft -= 100;
    });

    if (layersToHide.length > 0) {
      for (let h of layersToHide) {
        this.map.removeLayer(h);
        h.hide(h);
      }
      this.map.redraw()
    }

    const analytics = getAnalytics();
    logEvent(analytics, 'open-map', {
      game: this.gamedata.name,
      language: this.translate.currentLang
    });

    this.route.queryParams.subscribe((h: any)=>{
        if (h.lat != null && h.lng != null) {
            if (this.map.flyTo([h.lat, h.lng], this.map.getMaxZoom(), {
                animate: !0,
                duration: .3
            }),
            h.type) {
                let m = this.layers[this.translate.instant(h.type)].markers.find((y: { _latlng: { lat: number; lng: number; }; })=>Math.abs(y._latlng.lat - h.lat) < 1 && Math.abs(y._latlng.lng - h.lng) < 1);
                if (m) {
                    m.fireEvent("click");

                    logEvent(analytics, 'open-map-queryParams', {
                      game: this.gamedata.name,
                      language: this.translate.currentLang,
                      markType: h.type,
                      coordinates: `${h.lat} ${h.lng}`
                    });

                    return
                }
            }
        } else
            this.map.setView([this.gamedata.heightInPixels / 2, this.gamedata.widthInPixels / 2])
    });

    /*this.map.on('click', function(e: { latlng: any; }){
      var coord = e.latlng;
      var lat = coord.lat;
      var lng = coord.lng;
      console.log("You clicked the map at latitude: " + lat + " and longitude: " + lng);
      });*/
  }

  private addLocations() {
    let locationsOnMap = [];
    for (let location of this.gamedata.locations) {
      let locationImage = `/assets/images/maps/${this.gamedata.uniqueName}/map_${location.uniqueName}.png`;
      let locationBounds = [[location.y1, location.x1], [location.y2, location.x2]];
      let locationImageOverlay = L.imageOverlay(locationImage, locationBounds, {
        interactive: !0,
        className: "location-on-map"
      });

      locationImageOverlay.name = location.name;
      locationImageOverlay.uniqueName = location.uniqueName;
      locationImageOverlay.id = location.id;
      locationsOnMap.push(locationImageOverlay);
    }

    this.locations = L.layerGroup(locationsOnMap);
    this.locations.locations = Object.values(locationsOnMap);
    this.locations.addTo(this.map);
  }

  private addMarks() {
    let markTypes = [{
      id: 0,
      ableToSearch: !0,
      name: "none"
    }, {
      id: 1,
      ableToSearch: !0,
      name: this.translate.instant("sub-location"),
      uniqueName: "sub-location",
      icon: L.icon({
        iconSizeInit: [4, 4],
        className: "mark-container stalker-mark-4",
        animate: !1,
        iconUrl: "/assets/images/svg/marks/sub-location.svg",
        iconAnchor: [0, 0]
      })
    }, {
      id: 100,
      name: this.translate.instant("acidic"),
      uniqueName: "acidic",
      icon: L.icon({
        iconSizeInit: [2, 2],
        className: "mark-container stalker-mark-2",
        animate: !1,
        iconUrl: "/assets/images/svg/marks/chemical.svg",
        iconAnchor: [0, 0]
      })
    }, {
      id: 101,
      name: this.translate.instant("psychic"),
      uniqueName: "psychic",
      icon: L.icon({
        iconSizeInit: [2, 2],
        className: "mark-container stalker-mark-2",
        animate: !1,
        iconUrl: "/assets/images/svg/marks/psi.svg",
        iconAnchor: [0, 0]
      })
    }, {
      id: 102,
      name: this.translate.instant("radioactive"),
      uniqueName: "radioactive",
      icon: L.icon({
        iconSizeInit: [2, 2],
        className: "mark-container stalker-mark-2",
        animate: !1,
        iconUrl: "/assets/images/svg/marks/radiation.svg",
        iconAnchor: [0, 0]
      })
    }, {
      id: 103,
      name: this.translate.instant("thermal"),
      uniqueName: "thermal",
      icon: L.icon({
        iconSizeInit: [2, 2],
        className: "mark-container stalker-mark-2",
        animate: !1,
        iconUrl: "/assets/images/svg/marks/fire.svg",
        iconAnchor: [0, 0]
      })
    }, {
      id: 200,
      name: this.translate.instant("teleport"),
      uniqueName: "teleport",
      icon: L.icon({
        iconSizeInit: [2, 2],
        className: "mark-container stalker-mark-2",
        animate: !1,
        iconUrl: "/assets/images/svg/marks/portal.svg",
        iconAnchor: [0, 0]
      })
    }, {
      id: 201,
      name: this.translate.instant("mines"),
      uniqueName: "mines",
      icon: L.icon({
        iconSizeInit: [1.5, 1.5],
        className: "mark-container stalker-mark-1.5",
        animate: !1,
        iconUrl: "/assets/images/svg/marks/mines.svg",
        iconAnchor: [0, 0]
      })
    }];

    this.gamedata.marks = this.gamedata.marks.sort((c: { typeId: number; }, l: { typeId: number; }) => c.typeId - l.typeId);
    for (let markType of markTypes) {
      let marks = this.gamedata.marks.filter((u: { typeId: number; }) => u.typeId == markType.id);

      if (marks.length > 0) {
        let geoMarks: any = {};
        geoMarks.type = "FeatureCollection";
        geoMarks.features = [];

        for (let mark of marks) {
          let marker = L.marker([mark.y, mark.x], {
            icon: markType.icon
          });

          marker.properties = {};
          marker.properties.name = mark.name;
          marker.properties.description = mark.description;
          marker.properties.markType = markType.name;
          marker.properties.typeUniqueName = markType.uniqueName;
          marker.properties.ableToSearch = markType.ableToSearch;

          if (marker.properties.ableToSearch) {

            let p = [];

            p.push(marker.properties.name);

            if (marker.properties.description != this.translate.instant("default-desription")) {
              p.push(marker.properties.description);
            }

            marker.feature = {
              properties: {
                search: p.join(", ")
              }
            };

            this.createProperty(marker.feature.properties, "search", p, this.translate);

            let location = this.locations.locations.find((y: { id: any; }) => y.id == mark.locationId);
            marker.properties.locationUniqueName = location.uniqueName;
            marker.properties.locationName = location.name;
          }

          marker.bindTooltip((marker: any) => this.translate.instant(marker.properties.name), {
            sticky: true,
            className: "map-tooltip",
            offset: [0, 50]
          });
            geoMarks.features.push(marker)
        }

        this.addToCanvas(geoMarks, markType);
      }
    }
  }

  private createProperty(object: any, propertyName: string, array: string[], translate: TranslateService): void {
    Object.defineProperty(object, propertyName, {
        get: function () {
          try {
            return this.array.map((x: string) => translate.instant(x)).join(", ");
          }
          catch (ex) {
            console.error(this.array);
            throw ex;
          }
        },
        set: function(array) {
            this.array = array;
        }
    });

    object[propertyName] = array;
  }

  private addStuffs() {
      let stuffTypes = [{
          id: 0,
          ableToSearch: !0,
          itemableToSearch: !0,
          name: this.translate.instant("stash"),
          uniqueName: "stash",
          icon: L.icon({
              iconSizeInit: [1, 1],
              className: "mark-container stalker-mark",
              animate: !1,
              iconUrl: "/assets/images/svg/marks/stash.svg",
              iconAnchor: [0, 0]
          })
      }, {
          id: 1,
          ableToSearch: !0,
          itemableToSearch: !0,
          name: this.translate.instant("quest"),
          uniqueName: "quest",
          icon: L.icon({
              iconSizeInit: [1, 1],
              className: "mark-container stalker-mark",
              animate: !1,
              iconUrl: "/assets/images/svg/marks/quest-item.svg",
              iconAnchor: [0, 0]
          })
      }, {
          id: 2,
          ableToSearch: !0,
          itemableToSearch: !0,
          name: this.translate.instant("destroyable-box"),
          uniqueName: "destroyable-box",
          icon: L.icon({
              iconSizeInit: [1, 1],
              className: "mark-container stalker-mark",
              animate: !1,
              iconUrl: "/assets/images/svg/marks/items.svg",
              iconAnchor: [0, 0]
          })
      }, {
          id: 3,
          ableToSearch: !0,
          itemableToSearch: !0,
          name: this.translate.instant("stuff"),
          uniqueName: "stuff",
          icon: L.icon({
              iconSizeInit: [1, 1],
              className: "mark-container stalker-mark",
              animate: !1,
              iconUrl: "/assets/images/svg/marks/stuff.svg",
              iconAnchor: [0, 0]
          })
      }];

      this.gamedata.stuffs = this.gamedata.stuffs.sort((c: { typeId: number; },l: { typeId: number; })=>c.typeId - l.typeId);
      for (let markType of stuffTypes) {
          let stuffsAtLocation = this.gamedata.stuffs.filter((u: { typeId: number; })=>u.typeId == markType.id);

          if (stuffsAtLocation.length > 0) {
              let geoMarks: any = {};
              geoMarks.type = "FeatureCollection";
              geoMarks.features = [];

              for (let f of stuffsAtLocation) {
                  let stuff = L.marker([f.y, f.x], {
                      icon: markType.icon
                  });

                  stuff.properties = {};
                  stuff.properties.stuff = f;
                  stuff.properties.name = f.name;
                  stuff.properties.description = f.description;
                  stuff.properties.items = f.items;
                  stuff.properties.markType = markType.name;
                  stuff.properties.typeUniqueName = markType.uniqueName;
                  stuff.properties.ableToSearch = markType.ableToSearch;

                  if (stuff.properties.ableToSearch) {
                      let p = [];
                      p.push(stuff.properties.name);
                      stuff.properties.description != this.translate.instant("default-desription") && p.push(stuff.properties.description);
                      p.push(...stuff.properties.items.map((y: { item: { uniqueName: string; }; })=>y.item.uniqueName));

                      stuff.feature = {
                          properties: {
                              search: p.join(", ")
                          }
                      };

                      this.createProperty(stuff.feature.properties, "search", p, this.translate);

                      let location = this.locations.locations.find((y: { id: any; })=>y.id == f.locationId);
                      stuff.properties.locationUniqueName = location.uniqueName;
                      stuff.properties.locationName = location.name;
                  }

                  stuff.bindTooltip((p: any) =>this.createStuffTooltip(p), {
                      sticky: true,
                      className: "map-tooltip",
                      offset: new Point(0,50)
                  });
                  stuff.bindPopup((p: any) =>this.createStashPopup(p)).openPopup(),
                  geoMarks.features.push(stuff)
              }

              this.addToCanvas(geoMarks, markType);
          }
      }
  }

  private createStuffTooltip(stuff: { properties: { name: any; description: any; }; description: any; }) {
    let html = `<div class="header-tip"><p class="p-header">${ this.translate.instant(stuff.properties.name)}</p></div>`;
    if (stuff.description) {
        html += `<div class="tooltip-text"><p>${this.translate.instant(stuff.properties.description)}</p></div>`;
    }

    return html;
  }

  private createStashPopup(stash: any) {

    stash.getPopup().on('remove', function() {
        stash.getPopup().off('remove');
        componentRef.destroy();
    });

    const factory = this.resolver.resolveComponentFactory(StuffComponent);

    const componentRef = this.container.createComponent(factory);
    componentRef.instance.stuff = stash.properties.stuff;
    componentRef.instance.game = this.game;
    return componentRef.location.nativeElement;
  }

  private addAnomalyZones() {
    let anomalyZoneIcon = { name: this.translate.instant("anomaly-zone"), uniqueName: 'anomaly-zone', cssClass: "anomaly-zone", ableToSearch: true, icon: L.icon({ iconSize: [4, 4], className: 'mark-container stalker-mark-2', animate: false, iconUrl: '/assets/images/svg/marks/anomaly.svg', iconSizeInit: [2, 2], iconAnchor: [0, 0] }) };
    let anomalyZoneNoArtIcon = { name: this.translate.instant("anomaly-zone-no-art"), uniqueName: 'anomaly-zone-no-art', icon: L.icon({ iconSize: [12.5, 12.5], className: 'mark-container stalker-mark', animate: false, iconUrl: '/assets/images/svg/marks/anomaly_noart.svg', iconSizeInit: [1, 1], iconAnchor: [0, 0] }) };
    let anomalies: any = {};
    let anomaliesNoArt: any = {};
    anomalies.type = "FeatureCollection";
    anomaliesNoArt.type = "FeatureCollection";
    anomalies.features = [];
    anomaliesNoArt.features = [];

    for (let zone of this.gamedata.anomalyZones) {
        let canvasMarker;
        if (zone.anomaliySpawnSections != null && zone.anomaliySpawnSections.length > 0) {
            canvasMarker = L.marker([zone.y, zone.x], {icon: anomalyZoneIcon.icon});
        }
        else {
            canvasMarker = L.marker([zone.y, zone.x], {icon: anomalyZoneNoArtIcon.icon});
        }

        canvasMarker.properties = {};
        canvasMarker.properties.name = zone.name;
        canvasMarker.properties.description = zone.description;
        canvasMarker.properties.zoneModel = zone;

        if (zone.anomaliySpawnSections != null && zone.anomaliySpawnSections.length > 0) {
            canvasMarker.properties.anomaliySpawnSections = zone.anomaliySpawnSections;
            canvasMarker.properties.markType = anomalyZoneIcon.cssClass;
            canvasMarker.properties.ableToSearch = true;
            canvasMarker.properties.typeUniqueName = "anomaly-zone";

            let searchFields = [];
            searchFields.push(canvasMarker.properties.name);

            if (canvasMarker.properties.description != this.translate.instant("default-desription")) {
                searchFields.push(canvasMarker.properties.description);
            }

            let artefactsSections = zone.anomaliySpawnSections.map((item: { anomalySpawnItems: any[]; }) => item.anomalySpawnItems.map(ass => ass.artefact.uniqueName));

            for (let artefactsSection of artefactsSections) {
              for (let art of artefactsSection) {
                searchFields.push(art);
              }
            }

            canvasMarker.feature = { properties: {search: searchFields.join(', ')}}
            this.createProperty(canvasMarker.feature.properties, "search", searchFields, this.translate);

            anomalies.features.push(canvasMarker);

            let location = this.locations.locations.find((x: { id: any; }) => x.id == zone.locationId);
            if (location) {
                canvasMarker.properties.locationUniqueName = location.uniqueName;
                canvasMarker.properties.locationName = location.name;
            }
        }
        else {
            if (zone.anomalies != null) {
              canvasMarker.properties.anomalies = zone.anomalies;
            }
            anomaliesNoArt.features.push(canvasMarker);
            canvasMarker.properties.ableToSearch = false;
        }

        canvasMarker.bindTooltip((zone: any) => { return this.createAnomalyZoneTooltip(zone) }, { sticky: true, className: "map-tooltip", offset: new Point(0, 50) });
        canvasMarker.bindPopup((zone: any) => this.createeAnomalyZonePopup(zone), { maxWidth : 400 }).openPopup();
    }

    try {
      this.addToCanvas(anomalies, anomalyZoneIcon);

      if (anomaliesNoArt.features.length > 0) {
        this.addToCanvas(anomaliesNoArt, anomalyZoneNoArtIcon);
      }
    }
    catch (e) {
        console.log(e);
    }
  }

  private addTraders() {
    let traderIcon = { name: this.translate.instant("traders"), uniqueName: 'traders', cssClass: "tradere", ableToSearch: false, icon: L.icon({ iconSize: [4, 4], className: 'mark-container stalker-mark-2', animate: false, iconUrl: '/assets/images/svg/marks/trader.svg', iconSizeInit: [2, 2], iconAnchor: [0, 0] }) };

    let traders: any = {};
    traders.type = "FeatureCollection";
    traders.features = [];

    for (let trader of this.gamedata.traders) {
        let canvasMarker = L.marker([trader.y, trader.x], {icon: traderIcon.icon});

        canvasMarker.properties = {};
        canvasMarker.properties.traderConfig = trader;
        traders.features.push(canvasMarker);
        canvasMarker.properties.ableToSearch = false;

        canvasMarker.bindTooltip((marker: any) => this.translate.instant(marker.properties.traderConfig.name + '.name'), {
          sticky: true,
          className: "map-tooltip",
          offset: [0, 50]
        });

        canvasMarker.bindPopup((trader: any) => this.createTraderPopup(trader, this.gamedata.traders, canvasMarker), { maxWidth : 1400 }).openPopup();
    }

    this.addToCanvas(traders, traderIcon);
  }

  private addToCanvas(geoMarks: any, markType: any) {
      let marksLayer = L.geoJSON(geoMarks);
      marksLayer.ableToSearch = markType.ableToSearch ?? false;
      marksLayer.isShowing = false;
      marksLayer.markers = geoMarks.features;
      marksLayer.name = markType.uniqueName;
      this.layers[markType.name] = marksLayer;

      marksLayer.hide = (layer: { isShowing: boolean; markers: any; }) => {
          if (layer.isShowing) {
            this.canvasLayer.removeMarkers(layer.markers);

              layer.isShowing = false;
          }
      }

      marksLayer.show = (layer: { isShowing: boolean; markers: any; }) => {
          if (!layer.isShowing) {
              this.canvasLayer.addMarkers(layer.markers);

              layer.isShowing = true;
          }
      }

      marksLayer.show(marksLayer);
  }

  private createAnomalyZoneTooltip(zone: { properties: { name: any; description: any; }; description: any; }) {
      let html = `<div class="header-tip"><p class="p-header">${zone.properties.name != null ? this.translate.instant(zone.properties.name) : this.translate.instant('anomaliesCluster')}</p></div>`;
      if (zone.description) {
          html += `<div class="tooltip-text"><p>${zone.properties.description}</p></div>`;
      }

      return html;
  }

  private createeAnomalyZonePopup(zone: any) {
      /*let descHtml = `<div><div class='popup header'>${this.translate.instant('anomaliesCluster')}</div>${ zone.properties.description != null ? `<div class='popup description'>${zone.properties.description}</div>` : ''}</div>`

      if (zone.properties.anomaliySpawnSections && zone.properties.anomaliySpawnSections.length > 0) {
          let sectionsHtml = '<div class="sections">';

          let sortedSections = zone.properties.anomaliySpawnSections.sort(function (a, b) {
              return -(a.Sort - b.Sort);
          });

          let maxArtefactsInZone = 0;

          for (let section of sortedSections) {
              if (section.anomalySpawnItems && section.anomalySpawnItems.length > 0) {
                  if (section.count == 0) {
                      section.count = 1;
                  }
                  let anomalyCountSection = section.count > 1 ? `<div>${this.translate.instant('anomaliesCount', {count: section.count})}</div>` : '';
                  let anomalyNameSection = '';

                  if (section.anomalyUniqueName != null) {
                    if (section.count > 1) {
                      anomalyNameSection = `<div>${section.count} x ${this.translate.instant(section.anomalyUniqueName)}</div>`;
                    }
                    else {
                      anomalyNameSection = `<div>${this.translate.instant(section.anomalyUniqueName)}</div>`;
                    }
                  }
                  else {
                    anomalyNameSection = anomalyCountSection;
                  }

                  sectionsHtml += `<div class='section'><div class='anomaly-section-info'>${anomalyNameSection}<div>${this.translate.instant('anomalyArtMaxCount', {count: section.maxCapacity})}</div></div>`;
                  sectionsHtml += `<div class="inventory">`;
                  let items = section.anomalySpawnItems.sort(function (a: { probability: number; }, b: { probability: number; }) {
                      return -(a.probability - b.probability);
                  });

                  for (let item of items) {
                      sectionsHtml += `<div class="inventory-item inventory-item-width-1 inventory-item-height-1">`
                      sectionsHtml += `<div class="inventory-item-percentage">${Math.floor(item.probability * 100)}%</div>`;
                      sectionsHtml += `<div class="inventory-item-image ${item.artefact.uniqueName} ${this.gamedata.uniqueName}" title="${item.artefact.name}"></div></div>`;
                  }

                  sectionsHtml += '</div></div>';
                  maxArtefactsInZone += section.count * section.maxCapacity;
              }
          }

          sectionsHtml += `</div><div class='anomaly-section-info'>${this.translate.instant('anomalyZoneArtMaxCount', {count: maxArtefactsInZone})}</div>`

          descHtml += sectionsHtml;
          descHtml += `<div class="bottom"><div link-uniqueName="${zone.properties.typeUniqueName}" link-lng="${zone._latlng.lng}" link-lat="${zone._latlng.lat}" link-game="${this.gamedata.name}" class="button url-button" onclick="copyLink(this)"><span>Mark link</span></div></div>`;
      }

      if (zone.properties.anomalies != null && zone.properties.anomalies.length > 0) {
        descHtml += `<div class='anomalies-in-claster-container'>`;
        for (let anomaly of zone.properties.anomalies) {
          descHtml += `<div class='anomaly-in-claster'> ${anomaly.count} x ${this.translate.instant(anomaly.uniqueName)}</div>`
        }

        descHtml += '</div>'
      }*/

      const analytics = getAnalytics();
      logEvent(analytics, 'open-anomaly-zone-popup', {
        type: zone.properties.typeUniqueName,
        location: zone.properties.locationUniqueName,
        coordinates: `${zone._latlng.lat} ${zone._latlng.lng}`,
        game: this.game,
        language: this.translate.currentLang
      });

      //return descHtml;

      zone.getPopup().on('remove', function() {
          zone.getPopup().off('remove');
          componentRef.destroy();
      });

      const factory = this.resolver.resolveComponentFactory(AnomalyZoneComponent);

      const componentRef = this.container.createComponent(factory);
      componentRef.instance.anomalZone = zone.properties.zoneModel;
      componentRef.instance.game = this.game;
      return componentRef.location.nativeElement;
  }

  private createTraderPopup(traderMarker: any, traders: any[], marker: any) {
    let trader: TraderModel = traderMarker.properties.traderConfig;

    marker.getPopup().on('remove', function() {
        marker.getPopup().off('remove');
        componentRef.destroy();
    });

    const factory = this.resolver.resolveComponentFactory(TraderComponent);

    const componentRef = this.container.createComponent(factory);
    componentRef.instance.trader = trader;
    componentRef.instance.allTraders = traders as TraderModel[];
    componentRef.instance.game = {gameName: this.game, id: this.avaliableGames.indexOf(this.game) + 1}
    return componentRef.location.nativeElement;
  }

  private async addScript(scriptUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let script = document.createElement("script");
      script.type = "text/javascript";
      script.src = scriptUrl;
      document.body.appendChild(script);
      script.onload = () => {
        console.log(`${scriptUrl} is loaded.`);
        resolve();
      }
    });
  }


  private async addStyle(styleUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = styleUrl;
      document.body.appendChild(style);
      style.onload = () => {
        console.log(`${styleUrl} is loaded.`);
        resolve();
      }
    });
  }
}
