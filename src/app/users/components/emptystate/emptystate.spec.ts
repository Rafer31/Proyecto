import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Emptystate } from './emptystate';

describe('Emptystate', () => {
  let component: Emptystate;
  let fixture: ComponentFixture<Emptystate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Emptystate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Emptystate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
