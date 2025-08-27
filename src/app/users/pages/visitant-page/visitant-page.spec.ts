import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisitantPage } from './visitant-page';

describe('VisitantPage', () => {
  let component: VisitantPage;
  let fixture: ComponentFixture<VisitantPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisitantPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VisitantPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
