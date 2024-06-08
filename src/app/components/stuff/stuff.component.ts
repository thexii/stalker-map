import { Component, Input } from '@angular/core';
import { StuffModel } from '../../models/stuff';
import { TranslateModule } from '@ngx-translate/core';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-stuff',
  standalone: true,
  imports: [TranslateModule, NgFor, NgIf],
  templateUrl: './stuff.component.html',
  styleUrl: './stuff.component.scss'
})
export class StuffComponent {
  @Input() public stuff: StuffModel;
  @Input() public game: string;

  public copyLink(): void {
    console.log(this.stuff);
  }
}
