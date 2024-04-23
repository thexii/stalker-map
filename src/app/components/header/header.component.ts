import { NgFor } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [TranslateModule, NgFor, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  public readonly avaliableLanguages: string[] = ["ua", "en", "ru"];
  private readonly lastLanguageCacheKeyString: string = "language";
  private readonly defaultLocale: string = "en";
  public selectedLanguage: string = "";

  constructor(private translate: TranslateService) {

  }

  public ngOnInit(): void {
        let lastLanguage = localStorage.getItem(this.lastLanguageCacheKeyString);

        if (lastLanguage != null) {
          this.translate.use(lastLanguage);
          this.translate.currentLang = lastLanguage;
        }
        else {
          this.translate.use(this.defaultLocale);
          this.translate.currentLang = this.defaultLocale;
        }

        this.translate.onLangChange.subscribe(i=>{
          this.selectedLanguage = i.lang;
          localStorage.removeItem(this.lastLanguageCacheKeyString),
          localStorage.setItem(this.lastLanguageCacheKeyString, i.lang)
        });
        /*n != null ? (this.translate.use(n),
        this.translate.currentLang = n) : (this.translate.use(this.defaultLocale),
        this.translate.currentLang = this.defaultLocale),
        this.translate.onLangChange.subscribe(i=>{
            localStorage.removeItem(this.lastLanguageCacheKeyString),
            localStorage.setItem(this.lastLanguageCacheKeyString, JSON.stringify(i.lang))
        }*/
  }


  public changeLanguage(event: any): void {
    this.translate.use(event.target.value);
  }
}
