import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventTransactionsComponent } from './event-transactions.component';

describe('EventTransactionsComponent', () => {
  let component: EventTransactionsComponent;
  let fixture: ComponentFixture<EventTransactionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EventTransactionsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventTransactionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
