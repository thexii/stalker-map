import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemUpgradesComponent } from './item-upgrades.component';

describe('ItemUpgradesComponent', () => {
  let component: ItemUpgradesComponent;
  let fixture: ComponentFixture<ItemUpgradesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemUpgradesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ItemUpgradesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
