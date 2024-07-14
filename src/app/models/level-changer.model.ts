import { ObjectAtLocation } from "./object-at-location.model";

export class LevelChanger extends ObjectAtLocation {
    public direction: string;
    public destinationLocationId: number;
    public locale: string;
}
