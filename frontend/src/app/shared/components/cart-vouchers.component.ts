import { AfterViewInit, Component, ElementRef, inject, OnDestroy, signal, ViewChild } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-cart-vouchers', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-2 text-xs" aria-label="Mã ưu đãi">
      <button type="button" (click)="open()" class="w-full flex items-center justify-between gap-3 rounded-xl border border-[#EBD3AE] bg-[#FFF5E1] px-3 py-3 text-left font-bold text-[#800020] hover:bg-[#FFF5E1]">
        <span>🎟️ Chọn mã ưu đãi — <span class="font-semibold">{{ summary() }}</span></span><span aria-hidden="true">→</span>
      </button>
      @if (cart.cart()?.voucherNotice) {
        <p role="alert" class="rounded-lg bg-amber-50 p-2 text-amber-800">{{ cart.cart()?.voucherNotice }} <button type="button" (click)="open()" class="font-bold underline">Chọn mã khác</button></p>
      }
    </section>

    <div #voucherOverlay class="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4" [class.hidden]="!isOpen()" (click)="close()">
        <section role="dialog" aria-modal="true" aria-labelledby="voucher-dialog-title" (click)="$event.stopPropagation()" class="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl transition-transform sm:max-w-xl sm:rounded-3xl sm:p-6" [class.translate-y-full]="draggingDown()">
          <div class="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300 sm:hidden" (touchstart)="onTouchStart($event)" (touchend)="onTouchEnd($event)"></div>
          <header class="flex items-center justify-between border-b border-[#EBD3AE] pb-3">
            <div><h2 id="voucher-dialog-title" class="text-xl font-extrabold text-[#2B1A1A]">Chọn voucher</h2><p class="mt-1 text-xs text-slate-500">Tổng tiền hàng hiện tại: <strong class="text-slate-700">{{ cart.pricing().itemsTotal | number:'1.0-0' }}đ</strong></p></div>
            <button type="button" (click)="close()" aria-label="Đóng" class="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-slate-500 hover:bg-amber-100"><span class="material-symbols-outlined text-lg">close</span></button>
          </header>

          <form (ngSubmit)="stageCode()" class="mt-4 space-y-2">
            <h3 class="font-bold text-slate-800">Nhập mã</h3>
            <div class="flex gap-2"><input name="voucherCode" [(ngModel)]="code" maxlength="80" aria-label="Nhập mã ưu đãi" placeholder="Nhập mã từ quảng cáo" class="min-w-0 flex-1 rounded-xl border border-[#EBD3AE] px-3 py-2.5 uppercase focus:outline-blue-500"><button type="submit" [disabled]="!code.trim()" class="rounded-xl bg-[#FFF5E1] px-4 py-2 font-bold text-[#800020] disabled:opacity-50">Áp dụng</button></div>
          </form>

          <div class="mt-5 space-y-3">
            <div class="flex items-center justify-between"><h3 class="font-bold text-slate-800">Mã của tôi</h3><span class="text-[11px] text-slate-500">Chọn mã phù hợp với đơn hàng</span></div>
            @if (cart.cart()?.vouchers?.length) {
              <div class="max-h-[42dvh] space-y-2 overflow-y-auto pr-1">
                @for (v of savedVouchers(); track v.code) {
                  <article class="flex items-center justify-between gap-4 rounded-2xl border border-[#F0E5D8] bg-[#FFFEFC] p-4 transition" [class.border-[#800020]]="draftCode() === v.code" [class.bg-[#FFF5E1]]="draftCode() === v.code" [class.opacity-50]="!v.eligible">
                    <div class="min-w-0 space-y-1.5">
                      <p class="text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">{{ v.discountType === 'FREESHIP' ? 'FREESHIP' : v.code }}</p>
                      <p class="font-bold text-[#2B1A1A]">{{ v.title }}</p>
                      @if (v.discountType === 'FREESHIP') { <p class="text-[11px] text-slate-500">Miễn phí vận chuyển</p> }
                      @else { <p class="text-[11px] text-slate-500">Giảm {{ v.savings | number:'1.0-0' }}đ@if (v.maxDiscount > 0) { · Tối đa {{ v.maxDiscount | number:'1.0-0' }}đ }</p> }
                      <p class="text-[11px] text-slate-500">{{ v.minOrderValue > 0 ? 'Đơn từ ' + (v.minOrderValue | number:'1.0-0') + 'đ' : 'Áp dụng cho mọi đơn' }} · Hạn {{ v.expiresAt | date:'dd/MM/yyyy' }}</p>
                      @if (!v.eligible) { <p class="font-semibold text-rose-700">{{ v.reason }}</p> }
                    </div>
                    @if (v.eligible) { <button type="button" (click)="draftCode.set(draftCode() === v.code ? '' : v.code)" class="shrink-0 rounded-xl bg-emerald-800 px-4 py-2.5 font-bold text-white hover:bg-emerald-900">{{ draftCode() === v.code ? 'Đã chọn' : 'Áp dụng' }}</button> }
                    @else { <span class="shrink-0 rounded-xl border border-emerald-800/40 px-3 py-2.5 font-bold text-emerald-800">Không đủ ĐK</span> }
                  </article>
                }
              </div>
            } @else { <p class="rounded-xl bg-slate-50 p-4 text-slate-500">Chưa có mã đã lưu. Bạn vẫn có thể nhập mã ở phía trên.</p> }
          </div>

          @if (draftCode()) { <p class="mt-4 rounded-xl bg-emerald-50 p-3 font-bold text-emerald-800">Bạn sẽ tiết kiệm {{ selectedSavings() | number:'1.0-0' }}đ</p> }
          @if (message()) { <p role="status" class="mt-3" [class.text-rose-700]="failed()" [class.text-emerald-700]="!failed()">{{ message() }}</p> }
          <footer class="sticky bottom-0 mt-4 flex gap-2 border-t border-slate-100 bg-white pt-3">
            @if (cart.cart()?.voucherCode) { <button type="button" (click)="draftCode.set('')" class="rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-600">Bỏ chọn</button> }
            <button type="button" (click)="confirm()" [disabled]="busy() || cart.quantitySyncPending() || cart.voucherSyncPending()" class="flex-1 rounded-xl bg-[#800020] hover:bg-[#660019] px-4 py-3 font-bold text-[#FFF5E1] disabled:opacity-50">{{ busy() ? 'Đang áp dụng…' : 'Xác nhận' }}</button>
          </footer>
        </section>
    </div>
  `,
})
export class CartVouchersComponent implements AfterViewInit, OnDestroy {
  @ViewChild('voucherOverlay', { static: true }) private voucherOverlay!: ElementRef<HTMLElement>;
  cart = inject(CartService);
  private document = inject(DOCUMENT);
  isOpen = signal(false);
  draggingDown = signal(false);
  draftCode = signal('');
  code = '';
  busy = signal(false);
  message = signal('');
  failed = signal(false);
  private touchY = 0;

  ngAfterViewInit() {
    // Keep the modal outside sticky/overflow containers so it always layers above the page.
    this.document.body.appendChild(this.voucherOverlay.nativeElement);
  }
  ngOnDestroy() { this.voucherOverlay.nativeElement.remove(); }

  summary(): string {
    const cart = this.cart.cart();
    if (!cart?.voucherCode) return 'Chưa chọn';
    return `${cart.voucherCode} −${(this.cart.pricing().voucherDiscount + (this.cart.pricing().shippingDiscount || 0)).toLocaleString('vi-VN')}đ`;
  }
  selectedSavings(): number {
    const selected = this.cart.cart()?.vouchers?.find(v => v.code === this.draftCode());
    return selected?.savings || 0;
  }
  savedVouchers() { return (this.cart.cart()?.vouchers || []).filter(v => v.saved); }
  open() { this.draftCode.set(this.cart.cart()?.voucherCode || ''); this.message.set(''); this.isOpen.set(true); }
  close() { this.isOpen.set(false); this.draggingDown.set(false); }
  onTouchStart(event: TouchEvent) { this.touchY = event.changedTouches[0]?.clientY || 0; }
  onTouchEnd(event: TouchEvent) {
    const delta = (event.changedTouches[0]?.clientY || 0) - this.touchY;
    if (delta > 80) { this.draggingDown.set(true); this.close(); }
  }
  stageCode() {
    const entered = this.code.trim().toUpperCase();
    const voucher = this.cart.cart()?.vouchers?.find(v => v.code === entered);
    if (voucher && !voucher.eligible) { this.failed.set(true); this.message.set(voucher.reason); return; }
    this.draftCode.set(entered);
    this.message.set(voucher ? 'Đã chọn mã. Nhấn Xác nhận để áp dụng.' : 'Mã sẽ được kiểm tra khi xác nhận.');
    this.failed.set(false);
  }
  confirm() {
    if (this.busy()) return;
    const code = this.draftCode();
    this.busy.set(true); this.message.set('');
    this.cart.applyVoucher(code).subscribe({
      next: () => { this.busy.set(false); this.failed.set(false); this.code = ''; this.close(); },
      error: error => { this.busy.set(false); this.failed.set(true); this.message.set(error.error?.message || 'Chưa áp dụng được mã. Vui lòng thử lại.'); this.cart.loadCart(); },
    });
  }
}
