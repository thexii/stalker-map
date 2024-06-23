import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LootBoxClusterComponent } from './loot-box-cluster.component';

describe('LootBoxClusterComponent', () => {
  let component: LootBoxClusterComponent;
  let fixture: ComponentFixture<LootBoxClusterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LootBoxClusterComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LootBoxClusterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
