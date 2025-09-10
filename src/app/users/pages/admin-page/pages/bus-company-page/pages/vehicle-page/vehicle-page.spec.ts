import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehiclePage } from './vehicle-page';

describe('VehiclePage', () => {
  let component: VehiclePage;
  let fixture: ComponentFixture<VehiclePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehiclePage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehiclePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
