import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeatsDialog } from './seats-dialog';

describe('SeatsDialog', () => {
  let component: SeatsDialog;
  let fixture: ComponentFixture<SeatsDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeatsDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeatsDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
