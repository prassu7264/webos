import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContentPlayerComponent } from './content-player.component';

describe('ContentPlayerComponent', () => {
  let component: ContentPlayerComponent;
  let fixture: ComponentFixture<ContentPlayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ContentPlayerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContentPlayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
