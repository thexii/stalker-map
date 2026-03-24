import { NgClass } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [TranslateModule, RouterModule, NgClass],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss'
})
export class HeaderComponent {
    @ViewChild('container') container!: ElementRef;
    @ViewChild('wrapper') wrapper!: ElementRef;

    public readonly avaliableLanguages: string[] = ["ua", "en", "ru", "pl", "fr", "de", "esp", "it", "cz", 'chn', 'jpn', 'kor', 'ar'];
    private readonly lastLanguageCacheKeyString: string = "language";
    private readonly defaultLocale: string = "en";
    public selectedLanguage: string = "";
    public showShort: boolean = false;

    private languageChanged: boolean = false;
    private resizeObserver: ResizeObserver;

    constructor(
        private translate: TranslateService,
        protected route: ActivatedRoute) {
    }

    public ngOnInit(): void {
        this.translate.onLangChange.subscribe(i => {
            this.selectedLanguage = i.lang;
            localStorage.removeItem(this.lastLanguageCacheKeyString);
            localStorage.setItem(this.lastLanguageCacheKeyString, i.lang);

            if (this.languageChanged) {
                window.location.reload();
                this.languageChanged = false;
            }
        });

        this.route.queryParams.subscribe((h: any) => {
            if (h.lang != null && this.avaliableLanguages.includes(h.lang)) {
                this.selectedLanguage = h.lang;
                this.translate.use(h.lang);
            }
            else {
                let lastLanguage = localStorage.getItem(this.lastLanguageCacheKeyString);
                this.translate.setDefaultLang(this.defaultLocale);

                if (lastLanguage != null) {
                    this.translate.use(lastLanguage);
                }
                else {
                    this.translate.use(this.defaultLocale);
                }
            }
        });
    }

    public ngOnDestroy() {
        this.resizeObserver.disconnect();
    }

    public changeLanguage(event: any): void {
        //this.languageChanged = true;
        this.translate.use(event.target.value);
    }
}
