import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VoucherOffer } from '../../core/services/voucher.service';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-cart-vouchers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-2 text-xs" aria-label="Mã ưu đãi">
      <div class="rounded-2xl border border-[#E8DEE2] bg-white p-3.5">
        <div class="mb-3 flex items-center gap-2 text-[#800020]">
          <span class="material-symbols-outlined" aria-hidden="true">confirmation_number</span>
          <h3 class="text-xs font-bold">Ưu đãi cho đơn hàng</h3>
        </div>
        <form class="flex gap-2" (ngSubmit)="applyInlineCode()">
          <input
            class="min-w-0 flex-1 rounded-xl border border-[#E8E0E3] bg-[#FAF9FA] px-3 py-2.5 text-xs text-[#34272D] focus:outline-none focus:ring-2 focus:ring-[#E8CCD5]"
            name="inlineVoucherCode"
            [(ngModel)]="inlineCode"
            (ngModelChange)="inlineMessage.set('')"
            aria-label="Nhập mã giảm giá"
            placeholder="Nhập mã giảm giá"
            maxlength="80"
            [disabled]="busy()"
            autocomplete="off"
          />
          <button
            class="shrink-0 rounded-xl bg-[#800020] px-3 py-2.5 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:bg-[#F0EAED] disabled:text-[#A08C94]"
            type="submit"
            [disabled]="
              busy() ||
              !inlineCode.trim() ||
              cart.quantitySyncPending() ||
              cart.voucherSyncPending()
            "
          >
            {{ busy() ? 'Đang áp dụng…' : 'Áp dụng' }}
          </button>
        </form>
        <button
          type="button"
          (click)="open()"
          [disabled]="busy()"
          class="flex w-full items-center justify-between pt-3 text-left text-[11px] font-semibold text-[#800020]"
        >
          <span>Chọn từ voucher của bạn</span
          ><span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
        </button>
        @if (cart.cart()?.voucherCode) {
          <p class="mt-2.5 flex items-center gap-1 text-[11px] text-emerald-800">
            <span class="material-symbols-outlined" aria-hidden="true">check_circle</span
            >{{ summary() }}
          </p>
        }
        @if (inlineMessage()) {
          <p
            role="status"
            class="mt-2.5 text-[11px] leading-relaxed"
            [class.text-rose-700]="inlineFailed()"
            [class.text-emerald-800]="!inlineFailed()"
          >
            {{ inlineMessage() }}
          </p>
        }
      </div>
      @if (cart.cart()?.voucherNotice) {
        <p role="alert" class="rounded-lg bg-amber-50 p-2 text-amber-800">
          {{ cart.cart()?.voucherNotice }}
          <button type="button" (click)="open()" class="font-bold underline">Chọn mã khác</button>
        </p>
      }
    </section>

    <div
      #voucherOverlay
      class="vc-overlay"
      [class.hidden]="!isOpen()"
      (click)="close()"
      (keydown)="onDialogKeydown($event)"
    >
      <section
        #voucherDialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="voucher-dialog-title"
        tabindex="-1"
        (click)="$event.stopPropagation()"
        class="vc-dialog"
        [class.translate-y-full]="draggingDown()"
      >
        <div
          class="drag-handle"
          (touchstart)="onTouchStart($event)"
          (touchend)="onTouchEnd($event)"
        >
          <span></span>
        </div>
        <header class="vc-header">
          <div class="vc-heading">
            <span class="heading-icon material-symbols-outlined" aria-hidden="true"
              >confirmation_number</span
            >
            <h2 id="voucher-dialog-title">Giftory Voucher</h2>
            <span class="available">{{ availableCount() }} khả dụng</span>
          </div>
          <p>
            Tổng giỏ hàng hiện tại:
            <strong>{{ cart.pricing().itemsTotal | number: '1.0-0' }}đ</strong>
          </p>
          <button type="button" (click)="close()" aria-label="Đóng popup" class="close-button">
            <span class="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </header>
        <div class="vc-controls">
          <form (ngSubmit)="stageCode()" class="vc-entry">
            <span class="material-symbols-outlined" aria-hidden="true">sell</span
            ><input
              name="voucherCode"
              [(ngModel)]="code"
              maxlength="80"
              aria-label="Nhập mã ưu đãi"
              placeholder="Nhập mã voucher / livestream, đối tác…"
            /><button type="submit" [disabled]="!code.trim()">Áp dụng</button>
          </form>
          <nav class="vc-filters" aria-label="Lọc voucher">
            <button
              type="button"
              [class.active]="filter() === 'all'"
              [attr.aria-pressed]="filter() === 'all'"
              (click)="filter.set('all')"
            >
              Tất cả ({{ savedVouchers().length }})
            </button>
            <button
              type="button"
              [class.active]="filter() === 'discount'"
              [attr.aria-pressed]="filter() === 'discount'"
              (click)="filter.set('discount')"
            >
              Giảm tiền mặt
            </button>
            <button
              type="button"
              [class.active]="filter() === 'shipping'"
              [attr.aria-pressed]="filter() === 'shipping'"
              (click)="filter.set('shipping')"
            >
              Miễn phí vận chuyển
            </button>
          </nav>
        </div>
        <div class="vc-list">
          @for (v of filteredVouchers(); track v.code) {
            <article
              class="vc-ticket"
              [class.shipping]="v.discountType === 'FREESHIP'"
              [class.selected]="draftCode() === v.code"
              [class.unavailable]="!v.eligible"
            >
              <div class="tk-stub" aria-hidden="true">
                <span class="stub-label">{{
                  v.discountType === 'FREESHIP' ? 'FREESHIP' : 'VOUCHER'
                }}</span
                ><strong>{{ benefitLabel(v) }}</strong
                ><span class="stub-minimum">{{
                  v.minOrderValue > 0 ? 'Đơn từ ' + compactAmount(v.minOrderValue) : 'Mọi đơn hàng'
                }}</span>
              </div>
              <div class="tk-content">
                <div class="tk-topline">
                  <span class="tk-code">{{ v.code }}</span>
                  @if (v.recommended && v.eligible) {
                    <span class="recommended">Tối ưu nhất cho đơn bạn</span>
                  }
                </div>
                <h3>{{ v.title }}</h3>
                <p class="tk-description">
                  {{
                    v.description ||
                      (v.discountType === 'FREESHIP'
                        ? 'Ưu đãi phí giao hàng cho món quà của bạn.'
                        : 'Ưu đãi dành cho đơn quà tặng của bạn.')
                  }}
                </p>
                @if (!v.eligible) {
                  <p class="reason">{{ v.reason }}</p>
                  @if (v.missingAmount > 0) {
                    <div
                      class="order-progress"
                      role="progressbar"
                      aria-label="Tiến độ đạt giá trị đơn tối thiểu"
                      [attr.aria-valuenow]="orderProgress(v)"
                      aria-valuemin="0"
                      aria-valuemax="100"
                    >
                      <span [style.width.%]="orderProgress(v)"></span>
                    </div>
                  }
                }
                <div class="tk-bottom">
                  <span
                    ><span class="material-symbols-outlined" aria-hidden="true">schedule</span>HSD:
                    {{ v.expiresAt | date: 'dd/MM/yyyy' }}</span
                  ><button
                    type="button"
                    (click)="detailsCode.set(detailsCode() === v.code ? '' : v.code)"
                    [attr.aria-expanded]="detailsCode() === v.code"
                  >
                    Điều kiện
                  </button>
                </div>
                @if (detailsCode() === v.code) {
                  <p class="tk-conditions">
                    {{
                      v.minOrderValue > 0
                        ? 'Đơn hàng từ ' + (v.minOrderValue | number: '1.0-0') + 'đ.'
                        : 'Áp dụng cho mọi đơn hàng.'
                    }}
                    @if (v.maxDiscount > 0) {
                      Giảm tối đa {{ v.maxDiscount | number: '1.0-0' }}đ.
                    }
                    @if (v.requiredPoints > 0) {
                      Cần đổi {{ v.requiredPoints }} điểm để sử dụng.
                    }
                    @if (v.reason) {
                      {{ v.reason }}
                    }
                  </p>
                }
              </div>
              <button
                type="button"
                class="tk-select"
                [disabled]="!v.eligible"
                [attr.aria-label]="(draftCode() === v.code ? 'Bỏ chọn ' : 'Chọn ') + v.code"
                [attr.aria-pressed]="draftCode() === v.code"
                (click)="selectVoucher(v.code)"
              >
                <span class="select-dot">
                  @if (draftCode() === v.code) {
                    <span class="material-symbols-outlined" aria-hidden="true">check</span>
                  }
                </span>
              </button>
            </article>
          } @empty {
            <div class="vc-empty">
              <span class="material-symbols-outlined" aria-hidden="true">confirmation_number</span>
              <p>Chưa có voucher trong mục này.</p>
              <span>Bạn vẫn có thể nhập mã ưu đãi ở phía trên.</span>
            </div>
          }
          <p class="vc-note">
            <span class="material-symbols-outlined" aria-hidden="true">info</span>Mỗi đơn hàng áp
            dụng 1 mã ưu đãi. Chọn voucher phù hợp để món quà thêm trọn vẹn.
          </p>
        </div>
        @if (message()) {
          <p role="status" class="vc-message" [class.error]="failed()">{{ message() }}</p>
        }
        <footer class="vc-footer">
          <div class="savings" aria-live="polite">
            <span>Số tiền ưu đãi nhận được:</span>
            <div>
              <strong>{{ selectedSavings() | number: '1.0-0' }}đ</strong>
              @if (draftCode()) {
                <button type="button" (click)="draftCode.set('')" aria-label="Bỏ chọn voucher">
                  1 voucher đã chọn <span aria-hidden="true">×</span>
                </button>
              }
            </div>
          </div>
          <div class="footer-actions">
            <button type="button" (click)="close()" class="later-button">Để sau</button
            ><button
              type="button"
              (click)="confirm()"
              [disabled]="busy() || cart.quantitySyncPending() || cart.voucherSyncPending()"
              class="confirm-button"
            >
              {{ busy() ? 'Đang áp dụng…' : 'Xác nhận áp dụng'
              }}<span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
            </button>
          </div>
        </footer>
      </section>
    </div>
  `,
  styleUrl: './cart-vouchers.component.css',
})
export class CartVouchersComponent implements AfterViewInit, OnDestroy {
  @ViewChild('voucherOverlay', { static: true }) private voucherOverlay!: ElementRef<HTMLElement>;
  @ViewChild('voucherDialog', { static: true }) private voucherDialog!: ElementRef<HTMLElement>;
  cart = inject(CartService);
  private document = inject(DOCUMENT);
  isOpen = signal(false);
  draggingDown = signal(false);
  draftCode = signal('');
  inlineCode = '';
  inlineMessage = signal('');
  inlineFailed = signal(false);
  code = '';
  busy = signal(false);
  message = signal('');
  failed = signal(false);
  filter = signal<'all' | 'discount' | 'shipping'>('all');
  detailsCode = signal('');
  private previousFocus: HTMLElement | null = null;
  private previousOverflow = '';
  private touchY = 0;

  ngAfterViewInit() {
    // Keep the modal outside sticky/overflow containers so it always layers above the page.
    this.document.body.appendChild(this.voucherOverlay.nativeElement);
  }
  ngOnDestroy() {
    if (this.isOpen()) this.close();
    this.voucherOverlay.nativeElement.remove();
  }

  summary(): string {
    const cart = this.cart.cart();
    if (!cart?.voucherCode) return 'Chưa chọn';
    return `${cart.voucherCode} −${(this.cart.pricing().voucherDiscount + (this.cart.pricing().shippingDiscount || 0)).toLocaleString('vi-VN')}đ`;
  }
  selectedSavings(): number {
    const selected = this.cart.cart()?.vouchers?.find((v) => v.code === this.draftCode());
    return selected?.savings || 0;
  }
  savedVouchers() {
    return (this.cart.cart()?.vouchers || []).filter((v) => v.saved);
  }
  availableCount() {
    return this.savedVouchers().filter((v) => v.eligible).length;
  }
  filteredVouchers() {
    return this.savedVouchers().filter(
      (v) =>
        this.filter() === 'all' ||
        (this.filter() === 'shipping'
          ? v.discountType === 'FREESHIP'
          : v.discountType !== 'FREESHIP'),
    );
  }
  compactAmount(value: number) {
    return value >= 1000
      ? (value / 1000).toLocaleString('vi-VN') + 'K'
      : value.toLocaleString('vi-VN') + 'đ';
  }
  benefitLabel(v: VoucherOffer) {
    return v.discountType === 'FREESHIP'
      ? 'MIỄN PHÍ'
      : v.discountType === 'PERCENT'
        ? '-' + v.discountValue + '%'
        : '-' + this.compactAmount(v.discountValue);
  }
  orderProgress(v: VoucherOffer) {
    return v.minOrderValue > 0
      ? Math.min(100, Math.max(0, (this.cart.pricing().itemsTotal / v.minOrderValue) * 100))
      : 100;
  }
  selectVoucher(code: string) {
    this.draftCode.set(this.draftCode() === code ? '' : code);
    this.message.set('');
  }
  open() {
    if (this.isOpen()) return;
    this.inlineMessage.set('');
    this.previousFocus = this.document.activeElement as HTMLElement;
    this.previousOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
    this.draftCode.set(this.cart.cart()?.voucherCode || '');
    this.message.set('');
    this.failed.set(false);
    this.filter.set('all');
    this.detailsCode.set('');
    this.isOpen.set(true);
    setTimeout(() => {
      if (this.isOpen()) this.voucherDialog.nativeElement.focus();
    });
  }
  close() {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.draggingDown.set(false);
    this.document.body.style.overflow = this.previousOverflow;
    this.previousFocus?.focus();
  }
  onDialogKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      this.voucherDialog.nativeElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex="0"]',
      ),
    ).filter((el) => el.getClientRects().length > 0);
    const first = focusable[0],
      last = focusable[focusable.length - 1];
    if (
      event.shiftKey &&
      (this.document.activeElement === first ||
        this.document.activeElement === this.voucherDialog.nativeElement)
    ) {
      event.preventDefault();
      last?.focus();
    } else if (
      !event.shiftKey &&
      (this.document.activeElement === last ||
        this.document.activeElement === this.voucherDialog.nativeElement)
    ) {
      event.preventDefault();
      first?.focus();
    }
  }
  onTouchStart(event: TouchEvent) {
    this.touchY = event.changedTouches[0]?.clientY || 0;
  }
  onTouchEnd(event: TouchEvent) {
    const delta = (event.changedTouches[0]?.clientY || 0) - this.touchY;
    if (delta > 80) {
      this.draggingDown.set(true);
      this.close();
    }
  }
  applyInlineCode() {
    const entered = this.inlineCode.trim().toUpperCase();
    if (
      !entered ||
      this.busy() ||
      this.cart.quantitySyncPending() ||
      this.cart.voucherSyncPending()
    )
      return;
    this.busy.set(true);
    this.inlineMessage.set('');
    this.inlineFailed.set(false);
    this.cart.applyVoucher(entered).subscribe({
      next: () => {
        this.busy.set(false);
        this.inlineCode = '';
        this.inlineMessage.set('Đã áp dụng mã ' + entered + '.');
      },
      error: (error) => {
        this.busy.set(false);
        this.inlineFailed.set(true);
        this.inlineMessage.set(error.error?.message || 'Chưa áp dụng được mã. Vui lòng thử lại.');
      },
    });
  }
  stageCode() {
    const entered = this.code.trim().toUpperCase();
    const voucher = this.cart.cart()?.vouchers?.find((v) => v.code === entered);
    if (voucher && !voucher.eligible) {
      this.failed.set(true);
      this.message.set(voucher.reason);
      return;
    }
    this.draftCode.set(entered);
    this.message.set(
      voucher ? 'Đã chọn mã. Nhấn Xác nhận để áp dụng.' : 'Mã sẽ được kiểm tra khi xác nhận.',
    );
    this.failed.set(false);
  }
  confirm() {
    if (this.busy()) return;
    const code = this.draftCode();
    this.busy.set(true);
    this.message.set('');
    this.cart.applyVoucher(code).subscribe({
      next: () => {
        this.busy.set(false);
        this.failed.set(false);
        this.code = '';
        this.close();
      },
      error: (error) => {
        this.busy.set(false);
        this.failed.set(true);
        this.message.set(error.error?.message || 'Chưa áp dụng được mã. Vui lòng thử lại.');
        this.cart.loadCart();
      },
    });
  }
}
