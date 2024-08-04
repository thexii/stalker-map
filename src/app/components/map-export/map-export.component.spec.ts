import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapExportComponent } from './map-export.component';

describe('MapExportComponent', () => {
  let component: MapExportComponent;
  let fixture: ComponentFixture<MapExportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapExportComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MapExportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
