import { Injectable } from '@angular/core';
import { initializeApp } from "firebase/app";
import { Analytics, getAnalytics } from "firebase/analytics";

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {

  private readonly config = {
    apiKey: "AIzaSyDB32mndR7uGFr_-w5G9-w8o05832TjauI",
    authDomain: "stalker-map-online.firebaseapp.com",
    projectId: "stalker-map-online",
    storageBucket: "stalker-map-online.appspot.com",
    messagingSenderId: "412308123213",
    appId: "1:412308123213:web:179813ce72e454c9f3f604",
    measurementId: "G-W3X4BS4H20"
  };

  constructor()
  {
    console.log('constructor');
  }

  public init(): void {
    const app = initializeApp(this.config);
    const analytics = getAnalytics(app);
  }

  private logEvent(eventName: string, data: any) {

  }
}
