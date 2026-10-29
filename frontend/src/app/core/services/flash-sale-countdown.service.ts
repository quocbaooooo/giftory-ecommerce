import { Injectable, signal } from '@angular/core';

const INITIAL_REMAINING_SECONDS = 8 * 60 * 60 + 38 * 60 + 56;

@Injectable({ providedIn: 'root' })
export class FlashSaleCountdownService {
  readonly hours = signal('08');
  readonly minutes = signal('38');
  readonly seconds = signal('56');

  private deadline = Date.now() + INITIAL_REMAINING_SECONDS * 1000;

  constructor() {
    this.tick();
    window.setInterval(() => this.tick(), 1000);
  }

  private tick(): void {
    let remaining = Math.max(0, Math.ceil((this.deadline - Date.now()) / 1000));
    if (remaining === 0) {
      this.deadline = Date.now() + 8 * 60 * 60 * 1000;
      remaining = 8 * 60 * 60;
    }
    this.hours.set(this.pad(Math.floor(remaining / 3600)));
    this.minutes.set(this.pad(Math.floor((remaining % 3600) / 60)));
    this.seconds.set(this.pad(remaining % 60));
  }

  private pad(value: number): string { return String(value).padStart(2, '0'); }
}
