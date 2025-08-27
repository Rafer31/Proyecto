import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserSidenav } from './user-sidenav';

describe('UserSidenav', () => {
  let component: UserSidenav;
  let fixture: ComponentFixture<UserSidenav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserSidenav]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserSidenav);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
