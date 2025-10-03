import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsbReaderComponent } from './usb-reader.component';

describe('UsbReaderComponent', () => {
  let component: UsbReaderComponent;
  let fixture: ComponentFixture<UsbReaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UsbReaderComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsbReaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
