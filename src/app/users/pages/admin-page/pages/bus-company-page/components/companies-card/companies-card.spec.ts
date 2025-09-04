import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompaniesCard } from './companies-card';

describe('CompaniesCard', () => {
  let component: CompaniesCard;
  let fixture: ComponentFixture<CompaniesCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompaniesCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompaniesCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
