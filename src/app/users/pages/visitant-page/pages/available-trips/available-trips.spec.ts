import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvailableTrips } from './available-trips';

describe('AvailableTrips', () => {
  let component: AvailableTrips;
  let fixture: ComponentFixture<AvailableTrips>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvailableTrips]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AvailableTrips);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
