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
  @Input() public stuffType: string;

  public copyLink(): void {
    console.log(this.stuff);

    let link = `${window.location.origin}/map/${this.game}?lat=${this.stuff.y}&lng=${this.stuff.x}&type=${this.stuffType}`;
    console.log(link);
    navigator.clipboard.writeText(link)
  }
}
