import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterPlanning } from './register-planning';

describe('RegisterPlanning', () => {
  let component: RegisterPlanning;
  let fixture: ComponentFixture<RegisterPlanning>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterPlanning]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterPlanning);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
