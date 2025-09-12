import { NgStyle } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-item-property-number',
  standalone: true,
  imports: [NgStyle],
  templateUrl: './item-property-number.component.html',
  styleUrl: './item-property-number.component.scss'
})
export class ItemPropertyNumberComponent {
  @Input() public defaultValue: number;
  @Input() public value: number;
  @Input() public iconStyle: string;
  @Input() public unit: string;
  @Input() public name: string;
  @Input() public isPositive: boolean = true;
  @Input() public hasSpaceBeforeUnit: boolean = true;
  @Input() public isCompare: boolean = false;

  public defaultValueString: string;
  public valueString: string;
  public valueStyle: string;

  private ngOnChanges(): void {
    this.valueString = '';
    let unit = '';

    if (this.unit) {
      if (this.hasSpaceBeforeUnit) {
        unit = ` ${this.unit}`;
      }
      else {
        unit = this.unit;
      }
    }

    if (this.isCompare) {
      this.valueString += `${this.value}${unit}`;
      if (this.defaultValue > this.value) {
        if (this.isPositive) {
          this.valueStyle = 'red';
        }
        else {
          this.valueStyle = 'green';
        }
      }
      else if (this.defaultValue < this.value) {
        if (this.isPositive) {
          this.valueStyle = 'green';
        }
        else {
          this.valueStyle = 'red';
        }
      }
      else {
        this.valueStyle = 'green';
      }
    }
    else {
      if (this.defaultValue) {
        this.defaultValueString = `${this.defaultValue}${unit}`;

        if (this.defaultValue != this.value) {
          this.valueString += ` (${this.value}${unit})`;

          if (this.defaultValue > this.value) {
            if (this.isPositive) {
              this.valueStyle = 'red';
            }
            else {
              this.valueStyle = 'green';
            }
          }
          else {
            if (this.isPositive) {
              this.valueStyle = 'green';
            }
            else {
              this.valueStyle = 'red';
            }
          }
        }
      }
      else {
        if (this.value != 0) {
          if (this.value > 0) {
            this.valueString += `+${this.value}${unit}`;

            if (this.isPositive) {
              this.valueStyle = 'green';
            }
            else {
              this.valueStyle = 'red';
            }
          }
          else {
            this.valueString += `-${this.value}${unit}`;

            if (this.isPositive) {
              this.valueStyle = 'red';
            }
            else {
              this.valueStyle = 'green';
            }
          }
        }
      }
    }
  }
}
