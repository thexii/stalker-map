import * as L from 'leaflet';

declare module 'leaflet' {
  namespace Control {
    class CustomLayers extends Layers {
      constructor(baseLayers?: LayersObject, overlays?: LayersObject, options?: LayersOptions);
      _overlaysListTop: LayersObject;
      _layerControlInputs: HTMLInputElement[];
      _layerControlInputsTop: HTMLInputElement[];
      _onInputClickFinal(addedLayers: any[], removedLayers: any[]): void;
      // Додайте інші кастомні методи/властивості, якщо TS на них свариться
    }
  }

  namespace control {
    // Описуємо фабричний метод
    function customLayers(baseLayers?: LayersObject, overlays?: LayersObject, options?: LayersOptions): Control.CustomLayers;
  }
}