import { NgClass, NgFor, NgIf, NgStyle } from "@angular/common";
import { Component, ComponentFactoryResolver, Input, ViewChild, ViewContainerRef } from "@angular/core";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { StalkerProfileComponent } from "../stalker-profile/stalker-profile.component";
import { Map } from '../../models/map.model';
import { Location } from '../../models/location.model';
import { StuffModel } from "../../models/stuff";
import { Item } from "../../models/item.model";
import { Point } from "../../models/point.model";
import { StuffComponent } from "../stuff/stuff.component";

declare const L: any;

@Component({
    selector: 'app-underground',
    standalone: true,
    templateUrl: './underground.component.html',
    styleUrl: './underground.component.scss',
    imports: [NgFor, NgIf, TranslateModule, NgClass, NgStyle, StalkerProfileComponent]
})

export class UndergroundComponent {
    @ViewChild('dynamicComponents', { read: ViewContainerRef })
    container: ViewContainerRef;
    
    @Input() public location: Location;
    @Input() public gamedata: Map;
    @Input() public items: Item[];
    @Input() public game: string;

    private map: any;
  private canvasLayer: any;

    constructor(
        private translate: TranslateService,
        private resolver: ComponentFactoryResolver) {
        
    }

    private async ngOnInit(): Promise<void> {
        console.log(this.location)

        this.map = L.map('underground-map', {
            center: [this.location.heightInMeters / 2, this.location.widthInMeters / 2],
            zoom: 1.5,
            minZoom: 1,
            maxZoom: 3,
            crs: L.CRS.Simple,
            markerZoomAnimation: !0,
            zoomAnimation: !0,
            zoomControl: !1
        });

        let bounds = [
            [0, 0],
            [this.location.heightInMeters, this.location.widthInMeters],
        ];

        this.addLocation();

        this.addMarks();

        this.addStuffs();
    }

    private addLocation() {
        let locationImage = `/assets/images/maps/${this.gamedata.uniqueName}/map_${this.location.uniqueName}.png`;
        let locationBounds = [
            [0, 0],
            [this.location.heightInMeters, this.location.widthInMeters],
        ];
        let locationImageOverlay = L.imageOverlay(locationImage, locationBounds, {
            interactive: !0,
            className: 'location-on-map',
        });

        locationImageOverlay.addTo(this.map);
    }

    private addMarks() {
      let markTypes = [
        {
          id: 0,
          ableToSearch: !0,
          name: 'none',
        },
        {
          id: 1,
          ableToSearch: !0,
          name: this.translate.instant('sub-location'),
          uniqueName: 'sub-location',
          markName: 'sub-location',
          icon: L.icon({
            iconSizeInit: [4, 4],
            className: 'mark-container stalker-mark-4',
            animate: !1,
            iconUrl: '/assets/images/svg/marks/sub-location.svg',
            iconAnchor: [0, 0],
          }),
        },
        {
          id: 100,
          name: this.translate.instant('acidic'),
          uniqueName: 'acidic',
          markName: 'acidic',
          icon: L.icon({
            iconSizeInit: [2, 2],
            className: 'mark-container stalker-mark-2',
            animate: !1,
            iconUrl: '/assets/images/svg/marks/chemical.svg',
            iconAnchor: [0, 0],
          }),
        },
        {
          id: 101,
          name: this.translate.instant('psychic'),
          uniqueName: 'psychic',
          markName: 'psychic',
          icon: L.icon({
            iconSizeInit: [2, 2],
            className: 'mark-container stalker-mark-2',
            animate: !1,
            iconUrl: '/assets/images/svg/marks/psi.svg',
            iconAnchor: [0, 0],
          }),
        },
        {
          id: 102,
          name: this.translate.instant('radioactive'),
          uniqueName: 'radioactive',
          markName: 'st_name_radioactive_contamination',
          icon: L.icon({
            iconSizeInit: [2, 2],
            className: 'mark-container stalker-mark-2',
            animate: !1,
            iconUrl: '/assets/images/svg/marks/radiation.svg',
            iconAnchor: [0, 0],
          }),
        },
        {
          id: 103,
          name: this.translate.instant('thermal'),
          uniqueName: 'thermal',
          markName: 'thermal_zone',
          icon: L.icon({
            iconSizeInit: [2, 2],
            className: 'mark-container stalker-mark-2',
            animate: !1,
            iconUrl: '/assets/images/svg/marks/fire.svg',
            iconAnchor: [0, 0],
          }),
        },
        {
          id: 104,
          name: this.translate.instant('electro'),
          uniqueName: 'electro',
          markName: 'electro_zone',
          icon: L.icon({
            iconSizeInit: [2, 2],
            className: 'mark-container stalker-mark-2',
            animate: !1,
            iconUrl: '/assets/images/svg/marks/electro.svg',
            iconAnchor: [0, 0],
          }),
        },
        {
          id: 200,
          name: this.translate.instant('teleport'),
          uniqueName: 'teleport',
          markName: 'st_name_teleport',
          icon: L.icon({
            iconSizeInit: [2, 2],
            className: 'mark-container stalker-mark-2',
            animate: !1,
            iconUrl: '/assets/images/svg/marks/portal.svg',
            iconAnchor: [0, 0],
          }),
        },
        {
          id: 201,
          name: this.translate.instant('mines'),
          uniqueName: 'mines',
          markName: 'mines',
          icon: L.icon({
            iconSizeInit: [1.5, 1.5],
            className: 'mark-container stalker-mark-1.5',
            animate: !1,
            iconUrl: '/assets/images/svg/marks/mines.svg',
            iconAnchor: [0, 0],
          }),
        },
      ];
  
      this.gamedata.marks = this.gamedata.marks.sort(
        (c: { typeId: number }, l: { typeId: number }) => c.typeId - l.typeId
      );
      for (let markType of markTypes) {
        let marks = this.gamedata.marks.filter(
          (u: { typeId: number }) => u.typeId == markType.id
        );
  
        if (marks.length > 0) {
          let geoMarks: any = {};
          geoMarks.type = 'FeatureCollection';
          geoMarks.features = [];
  
          for (let mark of marks.filter(x => x.locationId == this.location.id)) {
  
            let marker = L.marker([mark.z, mark.x], {
              icon: markType.icon,
            });
  
            marker.properties = {};
            marker.properties.name = mark.name ? mark.name : markType.markName;
            marker.properties.description = mark.description;
            marker.properties.markType = markType.name;
            marker.properties.typeUniqueName = markType.uniqueName;
            marker.properties.ableToSearch = markType.ableToSearch;
  
            if (marker.properties.ableToSearch) {
              let p = [];
  
              p.push(marker.properties.name);
  
              if (
                marker.properties.description &&
                marker.properties.description !=
                this.translate.instant('default-desription')
              ) {
                p.push(marker.properties.description);
              }
  
              marker.feature = {
                properties: {
                  search: p.join(', '),
                },
              };
  
              this.createProperty(
                marker.feature.properties,
                'search',
                p,
                this.translate
              );
              
              marker.properties.locationUniqueName = this.location.uniqueName;
            }

            marker.addTo(this.map);
  
            marker.bindTooltip(
              (marker: any) => this.translate.instant(marker.properties.name),
              {
                sticky: true,
                className: 'map-tooltip',
                offset: [0, 50],
              }
            );
            geoMarks.features.push(marker);
          }
  
          //this.addToCanvas(geoMarks, markType);
        }
      }
    }

    private addStuffs() {
        let stuffTypes = [
          {
            id: 0,
            ableToSearch: !0,
            itemableToSearch: !0,
            name: this.translate.instant('stash'),
            uniqueName: 'stash',
            icon: L.icon({
              iconSizeInit: [1, 1],
              className: 'mark-container stalker-mark',
              animate: !1,
              iconUrl: '/assets/images/svg/marks/stash.svg',
              iconAnchor: [0, 0],
            }),
          },
          {
            id: 1,
            ableToSearch: !0,
            itemableToSearch: !0,
            name: this.translate.instant('quest'),
            uniqueName: 'quest',
            icon: L.icon({
              iconSizeInit: [1, 1],
              className: 'mark-container stalker-mark',
              animate: !1,
              iconUrl: '/assets/images/svg/marks/quest-item.svg',
              iconAnchor: [0, 0],
            }),
          },
          {
            id: 3,
            ableToSearch: !0,
            itemableToSearch: !0,
            name: this.translate.instant('stuff'),
            uniqueName: 'stuff',
            icon: L.icon({
              iconSizeInit: [1, 1],
              className: 'mark-container stalker-mark',
              animate: !1,
              iconUrl: '/assets/images/svg/marks/stuff.svg',
              iconAnchor: [0, 0],
            }),
          },
        ];
    
        this.gamedata.stuffs = this.gamedata.stuffs.sort(
          (c: StuffModel, l: StuffModel) => c.typeId - l.typeId
        );
    
        let ignoredNames: string[] = ['stuff_at_location'];
    
        let buggedStrings = [];
    
        for (let markType of stuffTypes) {
          let stuffsAtLocation = this.gamedata.stuffs.filter(
            (u: StuffModel) => u.locationId == this.location.id && u.typeId == markType.id
          );
    
          if (stuffsAtLocation.length > 0) {
            let geoMarks: any = {};
            geoMarks.type = 'FeatureCollection';
            geoMarks.features = [];
    
            for (let stuffModel of stuffsAtLocation) {
              let stuff = L.marker([stuffModel.z + this.location.heightInMeters / 2 - this.location.yShift, stuffModel.x + this.location.widthInMeters / 2 - this.location.xShift], {
                icon: markType.icon,
              });
    
              stuff.properties = {};
              stuff.properties.stuff = stuffModel;
              stuff.properties.markType = markType.name;
              stuff.properties.typeUniqueName = markType.uniqueName;
              stuff.properties.ableToSearch = markType.ableToSearch;
    
              if (stuff.properties.ableToSearch) {
                let localesToFind = [];
    
                if (stuff.properties.stuff.name && !ignoredNames.includes(stuff.properties.stuff.name)) {
                  localesToFind.push(stuff.properties.stuff.name);
                }
    
                if (stuff.properties.description) {
                  localesToFind.push(stuff.properties.stuff.description);
                }
    
                if (stuff.properties.stuff.items?.length > 0) {
                  localesToFind.push(...stuff.properties.stuff.items.map((x: { uniqueName: string; }) => {
                    return this.items.find(y => y.uniqueName == x.uniqueName)?.localeName;
                  } ));
                }
    
                stuff.feature = {};
                stuff.feature.properties = {};
    
                if (localesToFind.length > 0) {
                  let bugged = localesToFind.filter(x => this.translate.instant(x) == x)
    
                  if (bugged.length > 0) {
                    buggedStrings.push(...bugged);
                  }
                }
    
                /*this.createProperty(
                  stuff.feature.properties,
                  'search',
                  localesToFind,
                  this.translate
                );*/

                stuff.addTo(this.map);
    
                /*if (stuff.properties.stuff.name == 'st_monolith_stuff_title') {
                  console.log(stuff.feature.properties.search);
                }*/
    
                /*stuff.properties.locationUniqueName = location.uniqueName;
                stuff.properties.locationName = location.name;
                stuff.properties.name = stuff.properties.stuff.name;*/
              }
    
              stuff.bindTooltip((p: any) => this.createStuffTooltip(p), {
                sticky: true,
                className: 'map-tooltip',
                offset: new Point(0, 50),
              });
              stuff.bindPopup((p: any) => this.createStashPopup(p)),
                geoMarks.features.push(stuff);
            }
    
            //this.addToCanvas(geoMarks, markType);
          }
        }
      }

    private createProperty(
      object: any,
      propertyName: string,
      array: string[],
      translate: TranslateService
    ): void {
      Object.defineProperty(object, propertyName, {
        get: function () {
          try {
            return this.array.map((x: string) => translate.instant(x)).join(', ');
          } catch (ex) {
            console.error(this.array);
            throw ex;
          }
        },
        set: function (array) {
          this.array = array;
        },
      });
  
      object[propertyName] = array;
    }

    private createStuffTooltip(stuff: any) {
      let html = `<div class="header-tip"><p class="p-header">${this.translate.instant(
        stuff.properties.stuff.name
      )}</p></div>`;
      if (stuff.description) {
        html += `<div class="tooltip-text"><p>${this.translate.instant(
          stuff.properties.stuff.description
        )}</p></div>`;
      }
  
      return html;
    }
  
    private createStashPopup(stash: any) {
      stash.getPopup().on('remove', function () {
        stash.getPopup().off('remove');
        componentRef.destroy();
      });
  
      const factory = this.resolver.resolveComponentFactory(StuffComponent);
  
      const componentRef = this.container.createComponent(factory);
      componentRef.instance.stuff = stash.properties.stuff;
      componentRef.instance.game = this.game;
      componentRef.instance.allItems = this.items;
      componentRef.instance.stuffType = stash.properties.typeUniqueName;
  
      return componentRef.location.nativeElement;
    }

    private async ngOnDestroy(): Promise<void> {
      if (this.map) {
        this.map.remove();
        this.map = null;
      }
    }
}