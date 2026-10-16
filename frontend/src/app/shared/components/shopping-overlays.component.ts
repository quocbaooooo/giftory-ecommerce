import { DialogFocusDirective } from './dialog-focus.directive';
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { ProductService } from '../../core/services/product.service';
import { ProductOptions } from './product-options';
import { VariantPickerComponent } from './variant-picker.component';

@Component({
  selector: 'app-shopping-overlays', standalone: true,
  imports: [CommonModule, RouterModule, VariantPickerComponent, DialogFocusDirective],
  host: { '(document:keydown.escape)': 'close()' },
  styles: [`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } } .drawer { animation: slideIn .25s ease-out; }`],
  template: `
    @if (cart.toast()) { <div role="status" aria-live="polite" class="fixed top-6 left-1/2 -translate-x-1/2 z-[150] bg-slate-900 text-white px-6 py-3 rounded-xl shadow-lg">{{ cart.toast() }}</div> }
    @if (cart.quickProduct()) {
      <div class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" (click)="close()">
        <section appDialogFocus role="dialog" aria-modal="true" aria-label="Chọn nhanh sản phẩm" class="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <button class="float-right p-2" aria-label="Đóng" (click)="close()">✕</button>
          @if (loading()) { <p>Đang tải sản phẩm…</p> } @else if (options.product(); as p) {
            <img [src]="options.activeImage()" [alt]="p.name" class="w-40 h-40 object-contain mx-auto">
            <h2 class="font-bold text-xl my-3">{{ p.name }}</h2>
            <p class="text-purple-700 text-xl font-bold mb-3">{{ options.price() | number }}đ</p>
            <p class="text-sm mb-3">SKU: {{ options.selected()?.sku || '—' }} · Tồn kho: {{ options.stock() }}</p>
            <app-variant-picker [options]="options" />
            <label>Số lượng <input type="number" min="1" [max]="options.stock()" [value]="options.quantity()" (input)="setQuantity($event)" class="border rounded-lg p-2 w-24 ml-3"></label>
            <button class="block w-full bg-purple-700 text-white rounded-xl p-3 mt-5 disabled:opacity-50" [disabled]="pending()" (click)="add()">Thêm vào giỏ</button>
          }
        </section>
      </div>
    }
    @if (cart.miniCartOpen()) {
      <div class="fixed inset-0 bg-black/40 z-[110]" (click)="cart.miniCartOpen.set(false)">
        <aside appDialogFocus role="dialog" aria-modal="true" aria-label="Giỏ hàng" class="drawer absolute right-0 top-0 bottom-0 w-full max-w-md bg-white p-6 overflow-y-auto shadow-xl" (click)="$event.stopPropagation()">
          <button class="float-right p-2" aria-label="Đóng giỏ hàng" (click)="cart.miniCartOpen.set(false)">✕</button>
          <h2 class="text-xl font-bold mb-6">Giỏ hàng ({{ cart.productCount() }} sản phẩm · {{ cart.itemsCount() }} món)</h2>
          @for (item of cart.items(); track item._id || $index) {
            <div class="flex gap-3 border-b py-4">
              <img [src]="item.image || item.productId?.images?.[0]" [alt]="item.productId?.name || ''" class="w-16 h-16 object-cover rounded-lg">
              <div><p class="font-semibold">{{ item.productId?.name || item.name }}</p><p class="text-sm">{{ item.variantName }} × {{ item.quantity }}</p><p>{{ item.price * item.quantity | number }}đ</p></div>
            </div>
          }
          <p class="font-bold my-5">Tạm tính: {{ cart.pricing().itemsTotal | number }}đ</p>
          <a routerLink="/cart" (click)="cart.miniCartOpen.set(false)" class="block bg-purple-700 text-white text-center rounded-xl p-3">Xem giỏ hàng</a>
        </aside>
      </div>
    }
  `
})
export class ShoppingOverlaysComponent {
  cart = inject(CartService);
  products = inject(ProductService);
  options = new ProductOptions();
  loading = signal(false);
  pending = signal(false);
  constructor() {
    this.cart.openQuick = product => {
      this.cart.quickProduct.set(product); this.loading.set(true);
      this.products.getProductBySlug(product.slug).subscribe({
        next: p => { if (this.cart.quickProduct() !== product) return; this.options.load(p); this.loading.set(false); },
        error: () => { this.cart.quickProduct.set(null); this.loading.set(false); this.cart.notify('Không thể tải sản phẩm'); }
      });
    };
  }
  close() { if (!this.pending()) this.cart.quickProduct.set(null); this.cart.miniCartOpen.set(false); }
  setQuantity(event: Event) { this.options.quantity.set(Number((event.target as HTMLInputElement).value)); }
  add() {
    const error = this.options.error();
    if (error) { this.cart.notify(error); return; }
    if (this.pending()) return;
    this.pending.set(true);
    this.cart.addItem({ productId: this.options.product()!._id, quantity: this.options.quantity(), variantName: this.options.selected()?.name, variantSku: this.options.selected()?.sku }).subscribe({
      next: () => { this.pending.set(false); this.cart.quickProduct.set(null); this.cart.added(); },
      error: err => { this.pending.set(false); this.cart.notify(err.error?.message || 'Không thể thêm vào giỏ'); }
    });
  }
}
