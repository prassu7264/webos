import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfflinePlayerComponent } from './offline-player.component';

describe('OfflinePlayerComponent', () => {
  let component: OfflinePlayerComponent;
  let fixture: ComponentFixture<OfflinePlayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OfflinePlayerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfflinePlayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
