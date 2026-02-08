import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapHocComponent } from './map-hoc.component';

describe('MapHocComponent', () => {
  let component: MapHocComponent;
  let fixture: ComponentFixture<MapHocComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapHocComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MapHocComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
