import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserToolbar } from './user-toolbar';

describe('UserToolbar', () => {
  let component: UserToolbar;
  let fixture: ComponentFixture<UserToolbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserToolbar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserToolbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
