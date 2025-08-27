import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BusCompanyPage } from './bus-company-page';

describe('BusCompanyPage', () => {
  let component: BusCompanyPage;
  let fixture: ComponentFixture<BusCompanyPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusCompanyPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BusCompanyPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
