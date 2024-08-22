import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpgradeTooltipComponent } from './upgrade-tooltip.component';

describe('UpgradeTooltipComponent', () => {
  let component: UpgradeTooltipComponent;
  let fixture: ComponentFixture<UpgradeTooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpgradeTooltipComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UpgradeTooltipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
