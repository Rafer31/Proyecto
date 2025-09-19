import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WatchMoreDialog } from './watch-more-dialog';

describe('WatchMoreDialog', () => {
  let component: WatchMoreDialog;
  let fixture: ComponentFixture<WatchMoreDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WatchMoreDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WatchMoreDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
