import { Injectable } from '@angular/core';
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {

  constructor()
  {

  }

  public init(): void {
    let config = {
      apiKey: process.env['apiKey'],
      authDomain: process.env['authDomain'],
      projectId: process.env['projectId'],
      storageBucket: process.env['storageBucket'],
      messagingSenderId: process.env['messagingSenderId'],
      appId: process.env['appId'],
      measurementId: process.env['measurementId']
    };

    const app = initializeApp(config);
    const analytics = getAnalytics(app);
  }

  private logEvent(eventName: string, data: any) {

  }
}
