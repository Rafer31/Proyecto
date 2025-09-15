import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanningCard } from './planning-card';

describe('PlanningCard', () => {
  let component: PlanningCard;
  let fixture: ComponentFixture<PlanningCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanningCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanningCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
