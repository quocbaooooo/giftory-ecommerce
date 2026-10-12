import { Component, Input } from '@angular/core';
import { ProductOptions } from './product-options';

@Component({
  selector: 'app-variant-picker', standalone: true,
  template: `
    @if (options.colors().length) {
      <fieldset class="mb-4 rounded-xl border p-3" [style.borderColor]="options.attempted() && !options.color() ? '#dc2626' : '#ddd6fe'">
        <legend>Màu sắc *</legend>
        <div class="flex gap-2 flex-wrap">
          @for (color of options.colors(); track color) {
            <button type="button" class="border rounded-lg px-3 py-2 disabled:opacity-40" [disabled]="!options.colorAvailable(color)"
              [attr.aria-pressed]="options.color() === color" [style.borderColor]="options.color() === color ? '#7c3aed' : '#cbd5e1'" (click)="options.chooseColor(color)">
              <span class="inline-block w-4 h-4 rounded-full border align-middle mr-1" [style.backgroundColor]="options.hex(color)"></span>
              {{ color }} @if (!options.colorAvailable(color)) { <span>— Hết hàng</span> }
            </button>
          }
        </div>
      </fieldset>
    }
    @if (options.sizes().length) {
      <fieldset class="mb-4 rounded-xl border p-3" [style.borderColor]="options.attempted() && !options.size() ? '#dc2626' : '#ddd6fe'">
        <legend>Kích thước *</legend>
        <div class="flex gap-2 flex-wrap">
          @for (size of options.sizes(); track size) {
            <button type="button" class="border rounded-lg px-3 py-2 disabled:opacity-40" [disabled]="!options.sizeAvailable(size)"
              [attr.aria-pressed]="options.size() === size" [style.borderColor]="options.size() === size ? '#7c3aed' : '#cbd5e1'" (click)="options.chooseSize(size)">
              {{ size }} @if (!options.sizeAvailable(size)) { <span>— Hết hàng</span> }
            </button>
          }
        </div>
      </fieldset>
    }
  `
})
export class VariantPickerComponent { @Input({ required: true }) options!: ProductOptions; }
