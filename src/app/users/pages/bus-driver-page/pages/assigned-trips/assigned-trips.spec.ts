import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignedTrips } from './assigned-trips';

describe('AssignedTrips', () => {
  let component: AssignedTrips;
  let fixture: ComponentFixture<AssignedTrips>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignedTrips]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignedTrips);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
