import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogCompany } from './dialog-company';

describe('DialogCompany', () => {
  let component: DialogCompany;
  let fixture: ComponentFixture<DialogCompany>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogCompany]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogCompany);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
