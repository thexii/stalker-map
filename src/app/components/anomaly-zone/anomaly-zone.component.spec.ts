import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnomalyZoneComponent } from './anomaly-zone.component';

describe('AnomalyZoneComponent', () => {
  let component: AnomalyZoneComponent;
  let fixture: ComponentFixture<AnomalyZoneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnomalyZoneComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AnomalyZoneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
