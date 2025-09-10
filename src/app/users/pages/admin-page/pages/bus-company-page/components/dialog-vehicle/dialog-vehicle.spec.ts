import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogVehicle } from './dialog-vehicle';

describe('DialogVehicle', () => {
  let component: DialogVehicle;
  let fixture: ComponentFixture<DialogVehicle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogVehicle]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogVehicle);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
