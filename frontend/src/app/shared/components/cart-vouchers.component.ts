import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-cart-vouchers', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-3 text-xs" aria-label="Mã ưu đãi">
      <button type="button" (click)="expanded.set(!expanded())" [attr.aria-expanded]="expanded()" class="w-full flex justify-between items-center text-purple-700 font-bold py-2">
        <span>🎟 Chọn mã ưu đãi</span><span>{{ expanded() ? 'Thu gọn' : 'Xem mã' }}</span>
      </button>
      @if (cart.cart()?.voucherCode) {
        <div class="rounded-xl bg-purple-50 border border-purple-200 p-3 flex justify-between gap-3">
          <div><strong>{{ cart.cart()?.voucherCode }}</strong><p class="mt-1">Tiết kiệm {{ (cart.pricing().voucherDiscount + (cart.pricing().shippingDiscount || 0)) | number:'1.0-0' }}đ</p></div>
          <button type="button" (click)="apply('')" [disabled]="busy() || cart.quantitySyncPending()" class="text-purple-700 underline disabled:opacity-50" aria-label="Bỏ mã ưu đãi">Bỏ mã</button>
        </div>
      }
      @if (cart.cart()?.voucherNotice) { <p role="status" class="text-amber-800">{{ cart.cart()?.voucherNotice }}</p> }
      @if (expanded()) {
        <p class="text-slate-500">Mỗi đơn dùng một mã. Mã tiết kiệm nhất được tính theo cách giao hàng đang chọn.</p>
        <div class="max-h-80 overflow-y-auto space-y-2 pr-1">
          @for (v of cart.cart()?.vouchers || []; track v.code) {
            <div class="border rounded-xl p-3 space-y-2" [class.border-purple-400]="v.recommended" [class.bg-purple-50]="v.recommended">
              <div class="flex justify-between gap-2"><strong>{{ v.code }}</strong>
                @if (v.recommended) { <span class="text-purple-700 font-semibold">Tiết kiệm nhất</span> }
                @else if (v.saved) { <span class="text-slate-500">Đã lưu</span> }
              </div>
              <p class="font-semibold">{{ v.title }}</p>
              <p class="text-slate-500">Đơn từ {{ v.minOrderValue | number:'1.0-0' }}đ · HSD {{ v.expiresAt | date:'dd/MM/yyyy' }}</p>
              @if (v.maxDiscount > 0) { <p class="text-slate-500">Giảm tối đa {{ v.maxDiscount | number:'1.0-0' }}đ</p> }
              @if (v.eligible) {
                <div class="flex items-center justify-between gap-2"><span class="text-emerald-700 font-bold">Giảm {{ v.savings | number:'1.0-0' }}đ</span>
                  <button type="button" (click)="apply(v.code)" [disabled]="busy() || cart.quantitySyncPending() || cart.cart()?.voucherCode === v.code" class="bg-purple-600 text-white rounded-lg px-3 py-2 disabled:opacity-50">{{ cart.cart()?.voucherCode === v.code ? 'Đang dùng' : 'Áp dụng' }}</button>
                </div>
              } @else { <p class="text-slate-600">{{ v.reason }}</p> }
            </div>
          } @empty { <p class="text-slate-500">Hiện chưa có mã ưu đãi khả dụng.</p> }
        </div>
      }
      <form (ngSubmit)="apply(code)" class="flex gap-2">
        <input name="voucherCode" [(ngModel)]="code" maxlength="80" aria-label="Nhập mã ưu đãi" placeholder="Nhập mã ưu đãi" class="min-w-0 flex-1 px-3 py-2 border border-purple-200 rounded-xl uppercase focus:outline-purple-500">
        <button type="submit" [disabled]="busy() || cart.quantitySyncPending() || !code.trim()" class="px-3 py-2 rounded-xl bg-purple-100 text-purple-700 font-bold disabled:opacity-50">Áp dụng</button>
      </form>
      <p role="status" aria-live="polite" class="min-h-4" [class.text-rose-700]="failed()" [class.text-emerald-700]="!failed()">{{ cart.cart()?.voucherNotice ? '' : message() }}</p>
    </section>
  `,
})
export class CartVouchersComponent {
  cart = inject(CartService);
  code = '';
  expanded = signal(false);
  busy = signal(false);
  message = signal('');
  failed = signal(false);
  apply(code: string) {
    if (this.busy() || this.cart.quantitySyncPending()) return;
    this.busy.set(true); this.message.set('');
    this.cart.applyVoucher(code.trim()).subscribe({
      next: () => { this.busy.set(false); this.failed.set(false); this.code = ''; this.message.set(code ? 'Đã áp dụng mã ưu đãi.' : 'Đã bỏ mã ưu đãi.'); },
      error: error => { this.busy.set(false); this.failed.set(true); this.message.set(error.error?.message || 'Chưa áp dụng được mã. Vui lòng thử lại.'); this.cart.loadCart(); },
    });
  }
}
