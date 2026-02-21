import { Component, Input } from "@angular/core";
import { TranslateModule } from "@ngx-translate/core";

@Component({
    selector: 'app-popup',
    standalone: true,
    templateUrl: './popup.component.html',
    styleUrl: './popup.component.scss',
    imports: [TranslateModule]
})
export class PopupComponent {
    @Input() public title: string;
}