import { Component } from '@angular/core';
import { StuffComponent } from '../stuff.component';
import { NgFor, NgIf } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { HideUnhideComponent } from '../../hide-unhide/hide-unhide.component';
import { TooltipDirective } from '../../tooltips/tooltip.directive';

@Component({
  selector: 'app-hoc-stuff',
  standalone: true,
  imports: [TranslateModule, NgFor, NgIf, TooltipDirective, HideUnhideComponent],
  templateUrl: './hoc-stuff.component.html',
  styleUrl: './hoc-stuff.component.scss'
})
export class HocStuffComponent extends StuffComponent {

}
