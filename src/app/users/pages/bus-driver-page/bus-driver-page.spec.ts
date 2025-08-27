import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BusDriverPage } from './bus-driver-page';

describe('BusDriverPage', () => {
  let component: BusDriverPage;
  let fixture: ComponentFixture<BusDriverPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusDriverPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BusDriverPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
