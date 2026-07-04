import 'leaflet';

declare module 'leaflet' {
    interface Map {
        scaleFactor?: number;
    }

    interface TileLayer {
        name?: string;
        ableToSearch?: boolean;
        addToTop?: boolean;
    }

    interface CRS {
        transformation: Transformation;
    }

    interface LayersOptions {
        overlaysListTop?: string | null;
    }

    interface SearchControlOptions extends ControlOptions {
        layer?: Layer | Layer[];
        initial?: boolean;
        propertyName?: string;
        delayType?: number;
        collapsed?: boolean;
        autoCollapseTime?: number;
        textPlaceholder?: string;
        buildTip?: (text: string, val: SearchTipValue) => string | HTMLElement;
        filterData?: (textSearch: string, allRecords: Record<string, unknown>) => Record<string, unknown>;
    }

    interface SearchTipValue {
        layer: Marker & { properties?: Record<string, unknown>; name?: string };
    }

    interface ImageOverlay {
        name?: string;
        uniqueName?: string;
        id?: number;
    }

    interface RulerControlOptions extends ControlOptions {
        position?: ControlPosition;
        circleMarker?: CircleMarkerOptions;
        lineStyle?: PolylineOptions;
        lengthUnit?: {
            factor?: number | null;
            display?: string;
            decimal?: number;
            label?: string;
        };
        angleUnit?: {
            display?: string;
            decimal?: number;
            factor?: number | null;
            label?: string;
        };
        events?: {
            onToggle?: (isActive: boolean) => void;
        };
    }

    interface CustomLayersControlOptions extends LayersOptions {
        overlaysListTop?: string | null;
    }

    interface SliderControlOptions extends ControlOptions {
        onChange?: (value: number | string) => void;
    }

    namespace Control {
        class Ruler extends Control {}

        // Runtime-defined via L.Control.*.extend(...)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let CustomLayers: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let Slider: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let Compare: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let StashFilter: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let DlcFilter: any;
    }

    interface Transformation {
        _a: number;
        _b: number;
        _c: number;
        _d: number;
    }

    interface StashFilterControlOptions extends ControlOptions {
        gameCategories?: string[];
        categoriesConfig?: { gameCategories: string[]; name: string }[];
        layers?: LayerGroup[];
    }

    namespace control {
        function search(options?: SearchControlOptions): Control;
        function ruler(options?: RulerControlOptions): Control.Ruler;
        function customLayers(
            baseLayers?: LayersObject | null,
            overlays?: LayersObject | null,
            options?: CustomLayersControlOptions
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ): any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function slider(options?: SliderControlOptions): any;
        function compare(opts?: ControlOptions): Control.Compare;
        function stashFilter(options?: StashFilterControlOptions): Control.StashFilter;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function dlcFilter(): any;
    }
}
