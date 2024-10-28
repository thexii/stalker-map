import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HocStuffComponent } from './hoc-stuff.component';

describe('HocStuffComponent', () => {
  let component: HocStuffComponent;
  let fixture: ComponentFixture<HocStuffComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HocStuffComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HocStuffComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
