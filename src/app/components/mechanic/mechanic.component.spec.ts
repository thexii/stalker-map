import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MechanicComponent } from './mechanic.component';

describe('MechanicComponent', () => {
  let component: MechanicComponent;
  let fixture: ComponentFixture<MechanicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MechanicComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MechanicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
