import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StuffComponent } from './stuff.component';

describe('StuffComponent', () => {
  let component: StuffComponent;
  let fixture: ComponentFixture<StuffComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StuffComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StuffComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
