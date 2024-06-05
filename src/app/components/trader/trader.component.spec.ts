import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TraderComponent } from './trader.component';

describe('TraderComponent', () => {
  let component: TraderComponent;
  let fixture: ComponentFixture<TraderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TraderComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TraderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
