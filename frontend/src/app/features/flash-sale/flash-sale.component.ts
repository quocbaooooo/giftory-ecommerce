import { VoucherService, VoucherOffer } from '../../core/services/voucher.service';
import { AuthService } from '../../core/services/auth.service';
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { Product } from '../../core/models';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { FlashSaleCountdownService } from '../../core/services/flash-sale-countdown.service';

interface VoucherItem {
  id: string;
  type: string;
  title: string;
  desc: string;
  code: string;
  expiry: string;
  usedPercent: number;
  statusLabel: string;
  statusColor: string;
  claimed: boolean;
  exhausted: boolean;
  offer: VoucherOffer;
}

@Component({
  selector: 'app-flash-sale',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductCardComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10 animate-fade-in text-[#2B1A1A]">
      <!-- Toast Notification -->
      <div
        *ngIf="toastMessage()"
        class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 flex items-center gap-2 px-6 py-3 bg-[#2B1A1A] text-white rounded-full shadow-2xl animate-fade-in"
      >
        <span class="material-symbols-outlined text-[#EBD3AE] text-[20px]">loyalty</span>
        <span class="text-xs sm:text-sm font-medium">{{ toastMessage() }}</span>
      </div>

      <!-- 1. HEADER BANNER & FLASH SALE COUNTDOWN -->
      <section
        class="relative overflow-hidden rounded-[28px] bg-white text-[#2B1A1A] shadow-xl p-6 sm:p-10 border border-[#EBD3AE]"
        style="box-shadow: 0 10px 25px -5px rgba(128, 0, 32, 0.08);"
      >
        <!-- Ambient Glow Circles -->
        <div class="absolute -top-24 -right-24 w-96 h-96 bg-[#EBD3AE]/40 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-20 -left-20 w-80 h-80 bg-[#FFF5E1]/60 rounded-full blur-2xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <!-- Left: Hero Text & CTA -->
          <div class="flex-1 text-center lg:text-left space-y-4">
            <div class="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white border border-[#EBD3AE] shadow-xs">
                <img src="/logo.png" alt="Giftory" class="w-4 h-4 object-contain" />
                <span class="text-xs font-bold text-[#800020]">Giftory Official Deal Hub</span>
              </div>
              <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F43F5E] text-white shadow-xs text-xs font-bold uppercase tracking-wider">
                <span class="material-symbols-outlined text-sm">bolt</span>
                <span>ĐỘC QUYỀN HÔM NAY • BESPOKE GIFT SALE</span>
              </div>
            </div>

            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-display font-black tracking-tight leading-tight">
              🔥 SĂN DEAL BẢO BỐI<br />
              <span class="bg-gradient-to-r from-[#800020] via-[#991B33] to-[#C41E3A] bg-clip-text text-transparent">
                MÓN QUÀ TẬN TÂM
              </span>
            </h1>

            <p class="text-sm sm:text-base text-[#4B5563] max-w-xl leading-relaxed">
              Khám phá các sản phẩm đang được giảm giá tại Giftory. Chọn quà có sẵn hoặc tự thiết kế trên những sản phẩm hỗ trợ cá nhân hóa.
            </p>

            <div class="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <a
                href="#deal-products"
                class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-xs sm:text-sm font-bold shadow-lg transition-all active:scale-95 bg-[#800020] hover:bg-[#660019]"
                style="box-shadow: 0 4px 14px rgba(128, 0, 32, 0.35);"
              >
                <span>Khám Phá Toàn Bộ Deal Ngay</span>
                <span class="material-symbols-outlined text-base">arrow_downward</span>
              </a>

              <div class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FDF0D5] text-[#800020] text-xs font-semibold border border-[#EBD3AE]">
                <span class="material-symbols-outlined text-base">verified</span>
                <span>Bảo hiểm vỡ hỏng 100%</span>
              </div>
            </div>
          </div>

          <!-- Right: Countdown Timer Box -->
          <div
            class="w-full sm:w-auto flex flex-col items-center rounded-[24px] p-6 sm:p-8 text-center shadow-md bg-[#FFFBF2] border border-[#EBD3AE]"
          >
            <div class="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-[#800020]">
              <span class="w-2.5 h-2.5 rounded-full bg-[#F43F5E] animate-ping"></span>
              <span>Flash Sale Kết Thúc Sau</span>
            </div>

            <div class="flex items-center gap-2 sm:gap-3">
              <!-- Hours -->
              <div class="flex flex-col items-center">
                <div class="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-white text-[#2B1A1A] text-2xl sm:text-3xl font-black rounded-2xl shadow-xs border border-[#EBD3AE]">
                  {{ countdown.hours() }}
                </div>
                <span class="text-[11px] text-[#6B7280] mt-1.5 uppercase tracking-wider font-semibold">Giờ</span>
              </div>

              <span class="text-2xl sm:text-3xl font-black text-[#800020] -mt-5">:</span>

              <!-- Minutes -->
              <div class="flex flex-col items-center">
                <div class="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-white text-[#2B1A1A] text-2xl sm:text-3xl font-black rounded-2xl shadow-xs border border-[#EBD3AE]">
                  {{ countdown.minutes() }}
                </div>
                <span class="text-[11px] text-[#6B7280] mt-1.5 uppercase tracking-wider font-semibold">Phút</span>
              </div>

              <span class="text-2xl sm:text-3xl font-black text-[#800020] -mt-5">:</span>

              <!-- Seconds (Màu đỏ neon theo đúng thiết kế) -->
              <div class="flex flex-col items-center">
                <div
                  class="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center text-white text-2xl sm:text-3xl font-black rounded-2xl shadow-md bg-[#F43F5E]"
                  style="box-shadow: 0 4px 16px rgba(244, 63, 94, 0.35);"
                >
                  {{ countdown.seconds() }}
                </div>
                <span class="text-[11px] text-[#6B7280] mt-1.5 uppercase tracking-wider font-semibold">Giây</span>
              </div>
            </div>

            <div class="mt-4 text-[#800020] text-xs bg-[#FFF5E1]/70 px-4 py-1.5 rounded-full font-bold">
              Ưu đãi được cập nhật theo danh mục sản phẩm
            </div>
          </div>
        </div>
      </section>

      <!-- 2. TRẠM THU THẬP VOUCHER GIFTORY -->
      <section class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[#800020] text-2xl">confirmation_number</span>
              <h2 class="text-xl sm:text-2xl font-bold text-[#2B1A1A] tracking-tight">
                Trạm Thu Thập Voucher Giftory
              </h2>
            </div>
            <p class="text-xs sm:text-sm text-[#6B7280] mt-0.5">
              Lưu mã vào tài khoản và chọn một mã phù hợp khi thanh toán.
            </p>
          </div>

          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFBF2] border border-[#EBD3AE] text-[#800020] text-xs font-semibold self-start sm:self-auto">
            <span class="material-symbols-outlined text-sm">stars</span>
            <span>Ưu đãi độc quyền hôm nay</span>
          </div>
        </div>

        @if (voucherLoading()) { <p role="status" class="text-sm text-slate-500">Đang tải mã ưu đãi…</p> }
        @if (voucherError()) { <p role="alert" class="text-sm text-rose-700">{{ voucherError() }} <button (click)="loadVouchers()" class="underline">Thử lại</button></p> }
        @if (!voucherLoading() && !voucherError() && !vouchers().length) { <p class="text-sm text-slate-500">Hiện chưa có mã ưu đãi. Hãy quay lại sau.</p> }
        @if (!authService.isAuthenticated()) { <a routerLink="/login" class="inline-block text-sm text-[#800020] underline">Đăng nhập để lưu mã</a> }
        <p class="text-xs text-slate-500">Lưu mã không giữ lượt. Hiệu lực và điều kiện được kiểm tra khi đặt hàng. Mã đổi điểm cần được đổi tại trang thành viên.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            *ngFor="let v of vouchers()"
            class="relative bg-white rounded-3xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden border border-[#EBD3AE]"
          >
            <!-- Background accent circle -->
            <div class="absolute -top-3 -right-3 w-12 h-12 rounded-full bg-[#EBD3AE]/30 pointer-events-none"></div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-[#FDF0D5] text-[#800020]">
                  {{ v.type }}
                </span>
                <span class="text-[11px] text-[#6B7280]">{{ v.expiry }}</span>
              </div>

              <div class="text-lg font-bold text-[#2B1A1A]">{{ v.title }}</div>
              <p class="text-xs text-[#4B5563] min-h-[32px] line-clamp-2">{{ v.desc }}</p>

              <div class="inline-block px-2.5 py-1 rounded-full text-xs font-mono bg-[#FFFBF2] text-[#2B1A1A] border border-[#EBD3AE]">
                Mã: <span class="font-bold text-[#800020]">{{ v.code }}</span>
              </div>
            </div>

            <div class="pt-4 space-y-2">
              <div class="flex items-center justify-between text-[11px] text-[#6B7280]">
                <span>Đã dùng {{ v.usedPercent }}%</span>
                <span class="font-bold" [ngClass]="v.statusColor">{{ v.statusLabel }}</span>
              </div>

              <div class="w-full h-1.5 rounded-full bg-[#FDF0D5] overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  [style.width.%]="v.usedPercent"
                  [ngClass]="v.usedPercent >= 90 ? 'bg-[#F43F5E]' : 'bg-[#800020]'"
                ></div>
              </div>

              <button
                (click)="claimVoucher(v)"
                type="button"
                [disabled]="v.claimed || v.exhausted || !!savingCode()"
                class="w-full mt-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                [ngClass]="
                  v.claimed
                    ? 'bg-[#FDF0D5] text-[#800020] cursor-default'
                    : 'bg-[#800020] hover:bg-[#660019] text-[#FFF5E1] active:scale-98'
                "
              >
                <span class="material-symbols-outlined text-sm">{{ v.claimed ? 'check_circle' : 'bookmark_add' }}</span>
                <span>{{ v.exhausted ? 'Hết lượt' : savingCode() === v.code ? 'Đang lưu…' : v.claimed ? 'Đã lưu ✓' : 'Lưu mã' }}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. HẠNG MỤC SĂN DEAL HOT (FILTER TABS) -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-base sm:text-lg font-bold text-[#2B1A1A] tracking-tight">Hạng Mục Săn Deal Hot</h3>
          <span class="text-xs text-[#6B7280] hidden sm:inline">Kéo ngang để xem thêm nhóm ưu đãi</span>
        </div>

        <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
          <button
            *ngFor="let tab of categoryTabs"
            (click)="selectedTab.set(tab.key)"
            type="button"
            class="flex-shrink-0 font-medium rounded-xl px-4 py-2.5 text-xs transition-all shadow-xs flex items-center gap-2"
            [ngClass]="
              selectedTab() === tab.key
                ? 'bg-[#800020] text-[#FFF5E1] font-bold border border-[#800020]'
                : 'bg-white text-[#2B1A1A] border border-[#EBD3AE] hover:bg-[#FFFBF2]'
            "
          >
            <span>{{ tab.icon }}</span>
            <span>{{ tab.label }}</span>
          </button>
        </div>
      </section>

      <!-- 4. MÓN QUÀ TINH XẢO ĐANG GIẢM GIÁ SÂU (PRODUCT GRID) -->
      <section class="space-y-6" id="deal-products">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-xl sm:text-2xl font-bold text-[#2B1A1A]">
                Món Quà Tinh Xảo Đang Giảm Giá Sâu
              </h2>
              <span class="px-2.5 py-0.5 rounded-full bg-[#FFE4E6] text-[#E11D48] text-[11px] font-bold">
                Giới hạn 24H
              </span>
            </div>
            <p class="text-xs text-[#6B7280] mt-0.5">
              Giá và thông tin theo danh mục. Chỉ sản phẩm có nhãn chế tác mới hỗ trợ tùy chỉnh.
            </p>
          </div>
        </div>

        @if (productsLoading()) { <p role="status" class="text-sm text-slate-500">Đang tải sản phẩm ưu đãi…</p> }
        @if (productsError()) { <p role="alert" class="text-sm text-rose-700">{{ productsError() }} <button type="button" (click)="loadBackendProducts()" class="underline">Thử lại</button></p> }
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (product of filteredDeals(); track product._id) {
            <app-product-card [product]="product" />
          } @empty {
            @if (!productsLoading() && !productsError()) { <p class="col-span-full rounded-2xl border border-[#EBD3AE] bg-white p-6 text-sm text-slate-500">Hiện chưa có sản phẩm ưu đãi trong nhóm này.</p> }
          }
        </div>
      </section>

      <!-- 5. CHÍNH SÁCH ĐẶT CỌC GIỮ DEAL & CAM KẾT HOÀN TIỀN -->
      <section
        class="rounded-[28px] bg-white p-6 sm:p-8 shadow-xs space-y-6 border border-[#EBD3AE]"
      >
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-[#FDF0D5] text-[#800020] flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-2xl">lock_reset</span>
            </div>
            <div>
              <h3 class="text-base sm:text-lg font-bold text-[#2B1A1A]">
                Yên Tâm Săn Deal: Chính Sách Đặt Cọc 50% Giữ Giá Khuyến Mãi
              </h3>
              <p class="text-xs text-[#6B7280] mt-0.5">
                Áp dụng theo quy chuẩn Bespoke Gifting chính hãng Giftory Studio
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1.5 text-[#800020] text-xs font-semibold">
            <span class="material-symbols-outlined text-base">verified_user</span>
            <span>100% Cam Kết Hoàn Cọc Nếu Không Hài Lòng Bản Thiết Kế 3D</span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <div class="p-4 rounded-2xl bg-[#FFFBF2] border border-[#EBD3AE]/60 space-y-1">
            <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#800020] shadow-xs mb-2">
              <span class="material-symbols-outlined text-base">savings</span>
            </div>
            <div class="text-xs font-bold text-[#2B1A1A]">1. Cọc trước 50%</div>
            <p class="text-xs text-[#6B7280] leading-relaxed">
              Giữ nguyên giá Flash Sale hời nhất hôm nay mà chưa cần trả toàn bộ ngay.
            </p>
          </div>

          <div class="p-4 rounded-2xl bg-[#FFFBF2] border border-[#EBD3AE]/60 space-y-1">
            <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#800020] shadow-xs mb-2">
              <span class="material-symbols-outlined text-base">draw</span>
            </div>
            <div class="text-xs font-bold text-[#2B1A1A]">2. Duyệt Mockup 3D</div>
            <p class="text-xs text-[#6B7280] leading-relaxed">
              Đội ngũ nghệ nhân gửi bản thảo khắc laser/in ấn 3D chuẩn xác để bạn kiểm tra.
            </p>
          </div>

          <div class="p-4 rounded-2xl bg-[#FFFBF2] border border-[#EBD3AE]/60 space-y-1">
            <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#800020] shadow-xs mb-2">
              <span class="material-symbols-outlined text-base">event_available</span>
            </div>
            <div class="text-xs font-bold text-[#2B1A1A]">3. Chọn Ngày Giao</div>
            <p class="text-xs text-[#6B7280] leading-relaxed">
              Tùy chọn ngày giao chính xác vào đúng ngày kỷ niệm, sinh nhật của người thương.
            </p>
          </div>

          <div class="p-4 rounded-2xl bg-[#FFFBF2] border border-[#EBD3AE]/60 space-y-1">
            <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#800020] shadow-xs mb-2">
              <span class="material-symbols-outlined text-base">handshake</span>
            </div>
            <div class="text-xs font-bold text-[#2B1A1A]">4. Thanh Toán Khi Nhận</div>
            <p class="text-xs text-[#6B7280] leading-relaxed">
              Kiểm tra hộp quà nguyên vẹn lụa là trước khi thanh toán 50% số tiền còn lại.
            </p>
          </div>
        </div>
      </section>
    </div>
  `
})
export class FlashSaleComponent implements OnInit {
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  readonly countdown = inject(FlashSaleCountdownService);
  toastMessage = signal<string | null>(null);

  selectedTab = signal<string>('all');

  categoryTabs = [
    { key: 'all', icon: '🔥', label: 'Tất cả ưu đãi' },
    { key: 'custom', icon: '✨', label: 'Hỗ trợ chế tác' },
    { key: 'ready', icon: '🎁', label: 'Quà có sẵn' },
  ];

  private voucherService = inject(VoucherService);
  authService = inject(AuthService);
  vouchers = signal<VoucherItem[]>([]);
  voucherLoading = signal(false);
  voucherError = signal('');
  savingCode = signal('');
  loadVouchers() {
    this.voucherLoading.set(true); this.voucherError.set('');
    this.voucherService.list().subscribe({
      next: offers => {
        this.voucherLoading.set(false);
        this.vouchers.set(offers.map(v => {
          const usedPercent = v.usageLimit > 0 ? Math.min(100, Math.round(v.usedCount / v.usageLimit * 100)) : 100;
          return { id: v.code, code: v.code, title: v.title,
            desc: (v.discountType === 'PERCENT' ? `Giảm ${v.discountValue}%` : `Giảm ${v.discountValue.toLocaleString('vi-VN')}đ`) +
              (v.maxDiscount > 0 ? ` (tối đa ${v.maxDiscount.toLocaleString('vi-VN')}đ)` : '') +
              ` · Đơn từ ${v.minOrderValue.toLocaleString('vi-VN')}đ` + (v.requiredPoints ? ` · Cần đổi ${v.requiredPoints} điểm` : ''),
            type: v.discountType === 'FREESHIP' ? 'Vận chuyển' : v.discountType === 'PERCENT' ? 'Giảm phần trăm' : 'Giảm tiền hàng',
            expiry: `HSD: ${new Date(v.expiresAt).toLocaleDateString('vi-VN')}`,
            usedPercent, statusLabel: v.usedCount >= v.usageLimit ? 'Hết lượt' : `Còn ${v.usageLimit - v.usedCount} lượt`,
            statusColor: usedPercent >= 90 ? 'text-rose-600' : 'text-[#800020]',
            claimed: v.saved, exhausted: v.usedCount >= v.usageLimit, offer: v };
        }));
      },
      error: () => { this.voucherLoading.set(false); this.voucherError.set('Chưa tải được mã ưu đãi.'); }
    });
  }

  displayDeals = signal<Product[]>([]);
  productsLoading = signal(false);
  productsError = signal('');
  filteredDeals = computed(() => this.displayDeals().filter(product =>
    this.selectedTab() === 'custom' ? product.isCustomizable :
    this.selectedTab() === 'ready' ? !product.isCustomizable : true));

  ngOnInit() {
    this.loadVouchers();
    this.loadBackendProducts();
  }
  loadBackendProducts() {
    this.productsLoading.set(true);
    this.productsError.set('');
    this.productService.getFlashSaleProducts().subscribe({
      next: products => {
        this.displayDeals.set(products.filter(product => product.isFlashSale && product.status !== 'INACTIVE'));
        this.productsLoading.set(false);
      },
      error: () => {
        this.productsLoading.set(false);
        this.productsError.set('Chưa tải được sản phẩm ưu đãi.');
      },
    });
  }

  claimVoucher(v: VoucherItem) {
    if (!this.authService.isAuthenticated()) { this.showToast('Đăng nhập để lưu mã vào tài khoản. Bạn vẫn có thể nhập mã công khai trong giỏ hàng.'); return; }
    if (v.claimed || v.exhausted || this.savingCode()) return;
    this.savingCode.set(v.code);
    this.voucherService.save(v.code).subscribe({
      next: () => {
        this.savingCode.set('');
        this.vouchers.update(list => list.map(item => item.code === v.code ? { ...item, claimed: true } : item));
        this.cartService.loadCart();
        this.showToast(`Đã lưu mã ${v.code}. Chọn mã khi thanh toán để áp dụng.`);
      },
      error: error => { this.savingCode.set(''); this.showToast(error.error?.message || 'Chưa lưu được mã. Vui lòng thử lại.'); }
    });
  }

  showToast(msg: string) {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3000);
  }

}
