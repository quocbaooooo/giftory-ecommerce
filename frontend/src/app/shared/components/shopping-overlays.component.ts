import { DialogFocusDirective } from './dialog-focus.directive';
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { ProductService } from '../../core/services/product.service';
import { ProductOptions } from './product-options';
import { Product } from '../../core/models';

@Component({
  selector: 'app-shopping-overlays',
  standalone: true,
  imports: [CommonModule, RouterModule, DialogFocusDirective],
  host: { '(document:keydown.escape)': 'close()' },
  styles: [`
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
    .drawer { animation: slideIn .25s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes popIn {
      0% { opacity: 0; transform: scale(0.96) translateY(10px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    .modal-pop { animation: popIn .22s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes slideInTop {
      0% { transform: translateY(-16px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    @keyframes slideOutTop {
      0% { transform: translateY(0); opacity: 1; }
      100% { transform: translateY(-10px); opacity: 0; }
    }
    .toast-anim { animation: slideInTop .28s cubic-bezier(0.16, 1, 0.3, 1) both; }
    .toast-anim.toast-leaving { animation: slideOutTop .22s ease-in forwards; }
    .toast-action { color:#93C5FD; font-weight:700; text-decoration:underline; text-underline-offset:3px; pointer-events:auto; }
    .toast-action:hover { color:#fff; }
    @media (prefers-reduced-motion: reduce) {
      .toast-anim { animation-duration: 1ms; }
    }
  `],
  template: `
    <!-- Toast Notification -->
    @if (cart.toast()) {
      <div role="status" aria-live="polite" class="fixed top-5 left-1/2 -translate-x-1/2 z-[150] pointer-events-none">
        <div class="flex items-center gap-2.5 px-5 py-2.5 bg-slate-900/95 backdrop-blur-md text-white rounded-full shadow-2xl text-xs sm:text-sm font-medium border border-white/10 toast-anim" [class.toast-leaving]="cart.toastLeaving()">
          <div class="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold shrink-0">✓</div>
          <span>{{ cart.toast() }}</span>
          @if (cart.toastAction(); as action) {
            <button type="button" class="toast-action" (click)="cart.runToastAction()">{{ action.label }}</button>
          }
        </div>
      </div>
    }

    <!-- Quick Add Modal (Theo thiết kế Stitch) -->
    @if (cart.quickProduct()) {
      <div class="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity duration-200" (click)="close()">
        <section appDialogFocus role="dialog" aria-modal="true" aria-label="Thêm nhanh vào giỏ hàng"
          class="relative w-full max-w-[530px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-auto max-h-[92vh] modal-pop"
          (click)="$event.stopPropagation()">
          
          <!-- Nút đóng -->
          <button type="button" class="absolute top-3.5 right-4 z-20 w-8 h-8 rounded-full bg-slate-100/90 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold transition-all focus:outline-none"
            aria-label="Đóng" (click)="close()">✕</button>

          <!-- Sub-header: quick add luôn thêm dòng hàng không gắn thiết kế -->
          <div class="pt-3.5 px-5 pb-3 border-b border-slate-100 bg-[#fdfcff] flex items-center justify-between pr-14">
            <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <span class="material-symbols-outlined text-lg text-blue-700">shopping_bag</span>
              <span class="tracking-wide text-xs font-bold text-slate-800">Thêm nhanh vào giỏ</span>
            </div>
            <span class="text-[11px] font-medium text-slate-400">Chọn phân loại · số lượng</span>
          </div>

          <!-- Nội dung chính -->
          @if (loading()) {
            <div class="p-12 text-center text-slate-500 space-y-3">
              <div class="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p class="text-sm font-medium">Đang tải thông tin sản phẩm…</p>
            </div>
          } @else if (options.product(); as p) {
            <div class="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(92vh-130px)]">
              
              <!-- 1. Header Sản phẩm gọn nhẹ -->
              <div class="flex gap-3.5 items-start">
                <div class="relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden bg-blue-50/50 shrink-0 border border-blue-100/80">
                  <img [src]="options.activeImage() || (p.images && p.images[0]) || ''" [alt]="p.name" class="w-full h-full object-cover">
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5 mb-1">
                    @if (options.stock() > 0) {
                      <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span class="text-[11px] font-semibold text-emerald-700">Còn {{ options.stock() }} sản phẩm · Giao dự kiến 24h</span>
                    } @else if (options.hasAvailableVariants()) {
                      <span class="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span class="text-[11px] font-semibold text-emerald-700">Còn {{ options.availableVariantCount() }} phân loại · Chọn màu để xem tồn kho</span>
                    } @else {
                      <span class="inline-block w-2 h-2 rounded-full bg-rose-500"></span>
                      <span class="text-[11px] font-semibold text-rose-600">Hết hàng tạm thời</span>
                    }
                  </div>
                  <h2 class="text-sm sm:text-base font-bold text-slate-900 leading-snug line-clamp-2">
                    {{ p.name }}
                  </h2>
                  <!-- Giá & Discount -->
                  <div class="flex items-baseline gap-2 mt-1.5">
                    <span class="text-xl font-extrabold text-blue-700">{{ options.price() | number }}₫</span>
                    @if (p.price && options.price() < p.price) {
                      <span class="text-xs text-slate-400 line-through">{{ p.price | number }}₫</span>
                      <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200/50">
                        -{{ ((p.price - options.price()) / p.price * 100) | number:'1.0-0' }}%
                      </span>
                    }
                  </div>
                </div>
              </div>

              <!-- 2. Khối Chọn Biến Thể Màu Sắc / Chất Liệu -->
              @if (options.colors().length) {
                <div>
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-xs font-bold text-slate-700 uppercase tracking-wider">Màu sắc / Chất liệu</span>
                    <span class="text-xs font-semibold" [class.text-blue-700]="options.color()" [class.text-amber-700]="!options.color()">{{ options.color() || 'Bắt buộc chọn' }}</span>
                  </div>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    @for (color of options.colors(); track color) {
                      <button type="button"
                        [disabled]="!options.colorAvailable(color)"
                        (click)="options.chooseColor(color)"
                        class="flex items-center justify-center gap-2 p-2.5 rounded-xl text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs"
                        [class]="options.color() === color
                          ? 'border-2 border-blue-600 bg-blue-50/70 font-bold text-slate-900 shadow-xs'
                          : 'border border-slate-200 bg-white hover:border-blue-300 font-medium text-slate-700'">
                        <span class="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" [style.backgroundColor]="options.hex(color) || '#d1d5db'"></span>
                        <span class="truncate">{{ color }}</span>
                      </button>
                    }
                  </div>
                  @if (options.attempted() && !options.color()) {
                    <p class="text-xs text-rose-600 mt-1 font-medium">Vui lòng chọn màu sắc</p>
                  } @else if (!options.color() && options.hasAvailableVariants()) {
                    <p class="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-amber-700"><span class="material-symbols-outlined text-sm">info</span>Chọn màu để mở khóa thêm vào giỏ</p>
                  }
                </div>
              }

              <!-- Khối Chọn Size nếu có -->
              @if (options.sizes().length) {
                <div>
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-xs font-bold text-slate-700 uppercase tracking-wider">Kích thước</span>
                    <span class="text-xs font-semibold text-blue-700">{{ options.size() || 'Chưa chọn' }}</span>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    @for (size of options.sizes(); track size) {
                      <button type="button"
                        [disabled]="!options.sizeAvailable(size)"
                        (click)="options.chooseSize(size)"
                        class="px-3.5 py-2 rounded-xl text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        [class]="options.size() === size
                          ? 'border-2 border-blue-600 bg-blue-50/70 font-bold text-blue-900 shadow-xs'
                          : 'border border-slate-200 bg-white hover:border-blue-300 text-slate-700 font-medium'">
                        {{ size }}
                      </button>
                    }
                  </div>
                  @if (options.attempted() && !options.size()) {
                    <p class="text-xs text-rose-600 mt-1 font-medium">Vui lòng chọn kích thước</p>
                  }
                </div>
              }

              <!-- 3. Khối Chọn Số Lượng & Tạm Tính -->
              <div class="flex items-center justify-between p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                <div class="flex items-center gap-2.5">
                  <span class="text-xs font-bold text-slate-700">Số lượng:</span>
                  <div class="inline-flex items-center bg-white rounded-xl p-0.5 border border-slate-200 shadow-xs">
                    <button type="button" (click)="decrementQty()" [disabled]="options.quantity() <= 1"
                      class="w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 flex items-center justify-center text-sm font-bold transition-all focus:outline-none disabled:opacity-40">−</button>
                    <span class="w-8 text-center text-xs font-bold text-slate-800 select-none">{{ options.quantity() }}</span>
                    <button type="button" (click)="incrementQty()" [disabled]="!options.selected() || options.quantity() >= options.stock()"
                      class="w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 flex items-center justify-center text-sm font-bold transition-all focus:outline-none disabled:opacity-40">+</button>
                  </div>
                </div>
                <div class="text-right">
                  <span class="text-[11px] text-slate-400 block">Tạm tính:</span>
                  <span class="text-base font-bold text-blue-700">{{ (options.price() * options.quantity()) | number }}₫</span>
                </div>
              </div>

              <!-- Quick add không gắn designId nên luôn tạo dòng hàng thường. -->
              <div class="pt-1">
                <button type="button" (click)="add()" [disabled]="pending() || !options.canPurchase()"
                  class="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed group">
                  @if (pending()) {
                    <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span class="text-sm">Đang thêm vào giỏ…</span>
                  } @else {
                    <svg class="w-5 h-5 transition-transform group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                    </svg>
                    <span class="text-sm">{{ options.selectionHint() || 'Thêm vào giỏ' }}</span>
                  }
                </button>
                @if (isCustomizationAvailable(p)) {
                  <a [routerLink]="['/custom-studio']" [queryParams]="{ product: p.slug }" (click)="close()"
                    class="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50">
                    <span class="material-symbols-outlined text-lg">draw</span>
                    Tự thiết kế trong Studio
                  </a>
                  <p class="mt-2 text-center text-[11px] leading-4 text-slate-500">Muốn thêm chữ hoặc hình riêng? Tạo thiết kế trong Studio để lưu thành một dòng hàng custom.</p>
                }
              </div>

              <!-- 5. Link Điều hướng phụ -->
              <div class="text-center pt-1">
                <a [routerLink]="['/products', p.slug]" (click)="close()" class="text-xs text-slate-400 hover:text-blue-600 underline underline-offset-4 transition-colors">
                  Xem chi tiết đầy đủ & đánh giá →
                </a>
              </div>
            </div>

            <!-- 6. Footer hướng dẫn tương tác -->
            <div class="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span class="flex items-center gap-1">
                <kbd class="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded text-slate-500 font-mono shadow-2xs">ESC</kbd>
              </span>
            </div>
          }
        </section>
      </div>
    }

    <!-- Mini Cart Drawer -->
    @if (cart.miniCartOpen()) {
      <div class="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-[130]" (click)="cart.miniCartOpen.set(false)">
        <aside appDialogFocus role="dialog" aria-modal="true" aria-label="Giỏ hàng" class="drawer absolute right-0 top-0 bottom-0 w-full max-w-md bg-white p-6 overflow-y-auto shadow-2xl flex flex-col justify-between" (click)="$event.stopPropagation()">
          <div>
            <div class="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 class="text-lg font-bold text-slate-900">Giỏ hàng ({{ cart.productCount() }} sản phẩm · {{ cart.itemsCount() }} món)</h2>
              <button class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold transition-all focus:outline-none" aria-label="Đóng giỏ hàng" (click)="cart.miniCartOpen.set(false)">✕</button>
            </div>
            
            <div class="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto py-2">
              @for (item of cart.items(); track item._id || $index) {
                <div class="flex gap-3.5 py-3.5 items-center">
                  <img [src]="item.image || item.productId?.images?.[0]" [alt]="item.productId?.name || ''" class="w-16 h-16 object-cover rounded-xl border border-slate-100 shrink-0">
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-sm text-slate-900 truncate">{{ item.productId?.name || item.name }}</p>
                    <p class="text-xs text-slate-500">{{ item.variantName }} × {{ item.quantity }}</p>
                    <p class="text-sm font-bold text-blue-700 mt-1">{{ item.price * item.quantity | number }}₫</p>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="pt-4 border-t border-slate-100 space-y-3">
            <div class="flex items-center justify-between text-base font-bold text-slate-900">
              <span>Tạm tính:</span>
              <span class="text-xl text-blue-700">{{ cart.pricing().itemsTotal | number }}₫</span>
            </div>
            <a routerLink="/cart" (click)="cart.miniCartOpen.set(false)" class="block w-full py-3.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-center rounded-2xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]">
              Xem Giỏ Hàng & Thanh Toán
            </a>
          </div>
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
      this.cart.quickProduct.set(product);
      this.loading.set(true);
      this.products.getProductBySlug(product.slug).subscribe({
        next: p => {
          if (this.cart.quickProduct() !== product) return;
          this.options.load(p);
          this.loading.set(false);
        },
        error: () => {
          this.cart.quickProduct.set(null);
          this.loading.set(false);
          this.cart.notify('Không thể tải sản phẩm');
        }
      });
    };
  }

  isCustomizationAvailable(product: Product): boolean {
    return product.supportsCustomization === true && product.studioSupported === true;
  }

  close() {
    if (!this.pending()) {
      this.cart.quickProduct.set(null);
    }
    this.cart.miniCartOpen.set(false);
  }

  incrementQty() {
    if (this.options.quantity() < this.options.stock()) {
      this.options.quantity.update(q => q + 1);
    }
  }

  decrementQty() {
    if (this.options.quantity() > 1) {
      this.options.quantity.update(q => q - 1);
    }
  }

  setQuantity(event: Event) {
    this.options.quantity.set(Number((event.target as HTMLInputElement).value));
  }

  add() {
    const error = this.options.error();
    if (error) {
      this.cart.notify(error);
      return;
    }
    if (this.pending()) return;
    this.pending.set(true);
    this.cart.addItem({
      productId: this.options.product()!._id,
      quantity: this.options.quantity(),
      variantName: this.options.selected()?.name,
      variantSku: this.options.selected()?.sku
    }).subscribe({
      next: () => {
        this.pending.set(false);
        this.cart.quickProduct.set(null);
        this.cart.added();
      },
      error: err => {
        this.pending.set(false);
        this.cart.notify(err.error?.message || 'Không thể thêm vào giỏ');
      }
    });
  }
}
