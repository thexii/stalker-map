import { Component, Input } from '@angular/core';
import { Guide } from '../../../models/hoc/map-hoc';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-guide-component',
  imports: [TranslateModule],
  templateUrl: './guide-component.html',
  styleUrl: './guide-component.scss',
})
export class GuideComponent {
    @Input() public guide: Guide;
}
