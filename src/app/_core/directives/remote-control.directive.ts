import { Directive, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[appRemoteControl]'
})
export class RemoteControlDirective {
  private lastEnterPressTime = 0;

  @Output() onKey = new EventEmitter<number>();

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    console.log(event.keyCode);
    
    const isInputFocused =
      document.activeElement &&
      (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');

    const remoteKeys = [13, 37, 38, 39, 40, 461];

    if (remoteKeys.includes(event.keyCode) && !isInputFocused) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.onKey.emit(event.keyCode);

    switch (event.keyCode) {
      case 13: {
        const now = Date.now();
        const delta = now - this.lastEnterPressTime;
        this.lastEnterPressTime = now;

        if (delta < 500) {
          console.log("DOUBLE ENTER pressed, submitting form");

          const submitBtn = document.getElementById('submit-button') as HTMLElement;
          if (submitBtn) submitBtn.click();
        } else {
          console.log("SINGLE ENTER pressed");

          const input = document.getElementById('unique-number') as HTMLElement;
          if (input && document.activeElement !== input) {
            input.focus();
          }
        }
        break;
      }
      case 37:
        console.log("LEFT pressed");
        break;
      case 38:
        console.log("UP pressed");
        break;
      case 39:
        console.log("RIGHT pressed");
        break;
      case 40:
        console.log("DOWN pressed");
        break;
      case 36: // HOME
        console.log("BACK pressed");
        window.history.back();
        break;
      default:
        console.log("Other key pressed:", event.keyCode);
    }
  }
}
