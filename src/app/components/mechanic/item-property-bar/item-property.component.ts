import { NgClass, NgStyle } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-item-property-bar',
  standalone: true,
  imports: [TranslateModule, NgStyle, NgClass],
  templateUrl: './item-property.component.html',
  styleUrl: './item-property.component.scss'
})
export class ItemPropertyComponent {
  @Input() public defaultValue: number;
  @Input() public value: number;
  @Input() public maxValue: number;
  @Input() public iconStyle: string;
  @Input() public name: string;

  public defaultValueWidth: string;
  public maskWidth: string;
  public valueWidth: string;
  public valueShift: string;
  public valueColor: string;

  private ngOnChanges(): void {
    if (this.defaultValue == null) {
      this.defaultValue = 0;
    }
    this.defaultValueWidth = `${this.defaultValue / this.maxValue * 100}%`;

    if (this.value > this.defaultValue) {
      this.valueShift = this.defaultValueWidth;
      this.valueWidth = `${(this.value - this.defaultValue) / this.maxValue * 100}%`;
      this.maskWidth = `${this.value / this.maxValue * 100}%`;
      this.valueColor = '#00ff72';
    }
    else if (this.value < this.defaultValue) {
      this.valueShift = '0';
      this.valueWidth = `${(this.value) / this.maxValue * 100}%`;
      this.maskWidth = this.defaultValueWidth;
      this.valueColor = '#7c3a3e';
    }
    else {
      this.valueShift = '0';
      this.valueWidth = '0';
      this.valueColor = 'white';
      this.maskWidth = this.defaultValueWidth;
    }
  }
}
