import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterUsers } from './filter-users';

describe('FilterUsers', () => {
  let component: FilterUsers;
  let fixture: ComponentFixture<FilterUsers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterUsers]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilterUsers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
