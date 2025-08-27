import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadingDialog } from './loading-dialog';

describe('LoadingDialog', () => {
  let component: LoadingDialog;
  let fixture: ComponentFixture<LoadingDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoadingDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
