import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HideUnhideComponent } from './hide-unhide.component';

describe('HideUnhideComponent', () => {
  let component: HideUnhideComponent;
  let fixture: ComponentFixture<HideUnhideComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HideUnhideComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HideUnhideComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
