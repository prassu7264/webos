import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsermanualComponent } from './usermanual.component';

describe('UsermanualComponent', () => {
  let component: UsermanualComponent;
  let fixture: ComponentFixture<UsermanualComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UsermanualComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsermanualComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
