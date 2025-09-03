import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationDialog } from './observation-dialog';

describe('ObservationDialog', () => {
  let component: ObservationDialog;
  let fixture: ComponentFixture<ObservationDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObservationDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ObservationDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
