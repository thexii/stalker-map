import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemPropertyNumberComponent } from './item-property-number.component';

describe('ItemPropertyNumberComponent', () => {
  let component: ItemPropertyNumberComponent;
  let fixture: ComponentFixture<ItemPropertyNumberComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemPropertyNumberComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ItemPropertyNumberComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
