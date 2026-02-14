import * as L from 'leaflet';

declare module 'leaflet' {
  namespace Control {
    interface Layers {
      // Приватні методи та властивості базового класу
      _initLayout(): void;
      _update(): this;
      _addItem(obj: any): HTMLElement;
      _onInputClick(): void;
      _getLayer(id: number): any;
      _addLayer(layer: Layer, name: string, overlay?: boolean): this;
      _checkDisabledLayers(): void;
      _refocusOnMap(): void;
      _createRadioElement(name: string, checked: boolean): HTMLInputElement;
      
      _container: HTMLElement;
      _baseLayersList: HTMLElement;
      _overlaysList: HTMLElement;
      _separator: HTMLElement;
      _layerControlInputs: HTMLInputElement[];
      _layers: any[];
      _lastZIndex: number;
      _handlingClick: boolean;
      _preventClick: boolean;
      _map: L.Map;
    }

    class CustomLayers extends Layers {
      _overlaysListTop: HTMLElement | null;
      _layerControlInputsTop: HTMLInputElement[];
      isUnderground: boolean;
      
      constructor(baseLayers?: any, overlays?: any, options?: any);
      _onInputClickTop(): void;
      _onInputClickFinal(addedLayers: Layer[], removedLayers: Layer[]): void;
    }

    class Slider extends Control {
      constructor(options?: SliderOptions);
      options: SliderOptions;
    }
  }

  namespace control {
    function customLayers(
      baseLayers?: any,
      overlays?: any,
      options?: any
    ): Control.CustomLayers;

    function slider(options?: Control.SliderOptions): Control.Slider;
    
    function ruler(options?: Control.RulerOptions): Control.Ruler;
  }
}

// Розширення для layer objects
declare module 'leaflet' {
  interface Layer {
    addToTop?: boolean;
    topId?: number;
    isUnderground?: boolean;
    name?: string;
  }
}