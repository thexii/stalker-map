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
    public maps: ItemMap[];
}

/*{
  "id": 0,
  "category": null,
  "uniqueName": "ammo_9x18_fmj",
  "sort": 0,
  "width": 1,
  "height": 1,
  "maps": [
      {
          "itemId": 0,
          "mapId": 3,
          "cost": 200,
          "boxSize": 50
      },
      {
          "itemId": 0,
          "mapId": 2,
          "cost": 50,
          "boxSize": 50
      },
      {
          "itemId": 0,
          "mapId": 1,
          "cost": 70,
          "boxSize": 20
      }
  ],
  "area": 1,
  "isQuest": false,
  "isUpgraded": false,
  "hasScope": false,
  "hasSilencer": false,
  "name": {
      "id": 0,
      "localizations": [
          {
              "id": 0,
              "localizationSetId": 0,
              "localizationSet": null,
              "languageId": 1,
              "value": "Патрони 9х18 мм"
          },
          {
              "id": 0,
              "localizationSetId": 0,
              "localizationSet": null,
              "languageId": 2,
              "value": "9x18 mm rounds"
          },
          {
              "id": 0,
              "localizationSetId": 0,
              "localizationSet": null,
              "languageId": 3,
              "value": "Патроны 9х18 мм"
          }
      ]
  }
}*/
