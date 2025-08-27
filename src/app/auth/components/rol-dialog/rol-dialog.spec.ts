import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RolDialog } from './rol-dialog';

describe('RolDialog', () => {
  let component: RolDialog;
  let fixture: ComponentFixture<RolDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RolDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
