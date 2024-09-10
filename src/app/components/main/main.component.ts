import { Component } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { Meta, Title } from '@angular/platform-browser';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [HeaderComponent, TranslateModule],
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss'
})
export class MainComponent {
  /**
   *
   */
  constructor(
    private translate: TranslateService,
    private titleService:Title) {
  }

  private ngOnInit(): void {
    this.translate.onLangChange.subscribe(i=>{
      this.titleService.setTitle(this.translate.instant(`mainTitle`));
    });
    this.titleService.setTitle(this.translate.instant('mainTitle'));
  }
}
