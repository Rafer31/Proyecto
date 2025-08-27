import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TripPlanningPage } from './trip-planning-page';

describe('TripPlanningPage', () => {
  let component: TripPlanningPage;
  let fixture: ComponentFixture<TripPlanningPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripPlanningPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TripPlanningPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
