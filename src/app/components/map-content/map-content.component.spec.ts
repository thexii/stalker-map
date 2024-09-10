import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapContentComponent } from './map-content.component';

describe('MapContentComponent', () => {
  let component: MapContentComponent;
  let fixture: ComponentFixture<MapContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapContentComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MapContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
