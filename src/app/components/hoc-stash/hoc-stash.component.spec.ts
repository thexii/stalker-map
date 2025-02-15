import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HocStashComponent } from './hoc-stash.component';

describe('HocStashComponent', () => {
  let component: HocStashComponent;
  let fixture: ComponentFixture<HocStashComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HocStashComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HocStashComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
