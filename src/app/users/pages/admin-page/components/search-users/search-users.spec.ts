import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchUsers } from './search-users';

describe('SearchUsers', () => {
  let component: SearchUsers;
  let fixture: ComponentFixture<SearchUsers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchUsers]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchUsers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
