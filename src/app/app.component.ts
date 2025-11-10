import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnalyticsService } from './services/analytics.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'stalker-map';

  constructor(private analytics: AnalyticsService) {

  }

  private ngOnInit(): void {
    this.analytics.init();
  }
}