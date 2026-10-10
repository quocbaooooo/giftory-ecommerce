import { Component, OnInit, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { Product } from '../../core/models';

interface FlashSaleDeal {
  _id: string;
  name: string;
  slug: string;
  price: number;
  salePrice: number;
  discountBadge: string;
  featureTag: string;
  categoryTag: string;
  rating: number;
  reviewCount: number;
  image: string;
  stockLeft: number;
  soldPercent: number;
  depositAmount: number;
  isCustomizable: boolean;
}

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
}

@Component({
  selector: 'app-flash-sale',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10 animate-fade-in text-[#1E1B4B]">
      <!-- Toast Notification -->
      <div
        *ngIf="toastMessage()"
        class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 flex items-center gap-2 px-6 py-3 bg-[#1E1B4B] text-white rounded-full shadow-2xl animate-fade-in"
      >
        <span class="material-symbols-outlined text-[#DDD6FE] text-[20px]">loyalty</span>
        <span class="text-xs sm:text-sm font-medium">{{ toastMessage() }}</span>
      </div>

      <!-- 1. HEADER BANNER & FLASH SALE COUNTDOWN -->
      <section
        class="relative overflow-hidden rounded-[28px] bg-white text-[#1E1B4B] shadow-xl p-6 sm:p-10 border border-[#DDD6FE]"
        style="box-shadow: 0 10px 25px -5px rgba(124, 58, 237, 0.08);"
      >
        <!-- Ambient Glow Circles -->
        <div class="absolute -top-24 -right-24 w-96 h-96 bg-[#DDD6FE]/40 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-20 -left-20 w-80 h-80 bg-[#E9DCF8]/60 rounded-full blur-2xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <!-- Left: Hero Text & CTA -->
          <div class="flex-1 text-center lg:text-left space-y-4">
            <div class="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white border border-[#DDD6FE] shadow-xs">
                <img src="/logo.png" alt="Giftory" class="w-4 h-4 object-contain" />
                <span class="text-xs font-bold text-[#7C3AED]">Giftory Official Deal Hub</span>
              </div>
              <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F43F5E] text-white shadow-xs text-xs font-bold uppercase tracking-wider">
                <span class="material-symbols-outlined text-sm">bolt</span>
                <span>ĐỘC QUYỀN HÔM NAY • BESPOKE GIFT SALE</span>
              </div>
            </div>

            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-display font-black tracking-tight leading-tight">
              🔥 SĂN DEAL BẢO BỐI<br />
              <span class="bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#F43F5E] bg-clip-text text-transparent">
                MÓN QUÀ TẬN TÂM
              </span>
            </h1>

            <p class="text-sm sm:text-base text-[#4B5563] max-w-xl leading-relaxed">
              Đồng giá quà tặng Custom chỉ từ <strong class="text-[#7C3AED] font-bold">199.000đ</strong>. Áp dụng chính sách
              <strong class="text-[#7C3AED] font-bold">Đặt cọc 50%</strong> để giữ trọn vẹn giá Deal &amp; nhận hoa lụa thiệp viết tay miễn phí.
            </p>

            <div class="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <a
                href="#deal-products"
                class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-xs sm:text-sm font-bold shadow-lg transition-all active:scale-95 bg-[#7C3AED] hover:bg-[#6D28D9]"
                style="box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);"
              >
                <span>Khám Phá Toàn Bộ Deal Ngay</span>
                <span class="material-symbols-outlined text-base">arrow_downward</span>
              </a>

              <div class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#F3E8FF] text-[#7C3AED] text-xs font-semibold border border-[#DDD6FE]">
                <span class="material-symbols-outlined text-base">verified</span>
                <span>Bảo hiểm vỡ hỏng 100%</span>
              </div>
            </div>
          </div>

          <!-- Right: Countdown Timer Box -->
          <div
            class="w-full sm:w-auto flex flex-col items-center rounded-[24px] p-6 sm:p-8 text-center shadow-md bg-[#FAF5FF] border border-[#DDD6FE]"
          >
            <div class="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-[#7C3AED]">
              <span class="w-2.5 h-2.5 rounded-full bg-[#F43F5E] animate-ping"></span>
              <span>Flash Sale Kết Thúc Sau</span>
            </div>

            <div class="flex items-center gap-2 sm:gap-3">
              <!-- Hours -->
              <div class="flex flex-col items-center">
                <div class="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-white text-[#1E1B4B] text-2xl sm:text-3xl font-black rounded-2xl shadow-xs border border-[#DDD6FE]">
                  {{ hours() }}
                </div>
                <span class="text-[11px] text-[#6B7280] mt-1.5 uppercase tracking-wider font-semibold">Giờ</span>
              </div>

              <span class="text-2xl sm:text-3xl font-black text-[#7C3AED] -mt-5">:</span>

              <!-- Minutes -->
              <div class="flex flex-col items-center">
                <div class="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-white text-[#1E1B4B] text-2xl sm:text-3xl font-black rounded-2xl shadow-xs border border-[#DDD6FE]">
                  {{ minutes() }}
                </div>
                <span class="text-[11px] text-[#6B7280] mt-1.5 uppercase tracking-wider font-semibold">Phút</span>
              </div>

              <span class="text-2xl sm:text-3xl font-black text-[#7C3AED] -mt-5">:</span>

              <!-- Seconds (Màu đỏ neon theo đúng thiết kế) -->
              <div class="flex flex-col items-center">
                <div
                  class="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center text-white text-2xl sm:text-3xl font-black rounded-2xl shadow-md bg-[#F43F5E]"
                  style="box-shadow: 0 4px 16px rgba(244, 63, 94, 0.35);"
                >
                  {{ seconds() }}
                </div>
                <span class="text-[11px] text-[#6B7280] mt-1.5 uppercase tracking-wider font-semibold">Giây</span>
              </div>
            </div>

            <div class="mt-4 text-[#7C3AED] text-xs bg-[#E9DCF8]/70 px-4 py-1.5 rounded-full font-bold">
              🔥 Đã có 4.280 lượt săn Deal trong hôm nay
            </div>
          </div>
        </div>
      </section>

      <!-- 2. TRẠM THU THẬP VOUCHER GIFTORY -->
      <section class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[#7C3AED] text-2xl">confirmation_number</span>
              <h2 class="text-xl sm:text-2xl font-bold text-[#1E1B4B] tracking-tight">
                Trạm Thu Thập Voucher Giftory
              </h2>
            </div>
            <p class="text-xs sm:text-sm text-[#6B7280] mt-0.5">
              Thu thập voucher trước khi thanh toán để áp dụng kép cùng giá Flash Sale
            </p>
          </div>

          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF5FF] border border-[#DDD6FE] text-[#7C3AED] text-xs font-semibold self-start sm:self-auto">
            <span class="material-symbols-outlined text-sm">stars</span>
            <span>Ưu đãi độc quyền hôm nay</span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            *ngFor="let v of vouchers()"
            class="relative bg-white rounded-3xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden border border-[#DDD6FE]"
          >
            <!-- Background accent circle -->
            <div class="absolute -top-3 -right-3 w-12 h-12 rounded-full bg-[#DDD6FE]/30 pointer-events-none"></div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-[#F3E8FF] text-[#7C3AED]">
                  {{ v.type }}
                </span>
                <span class="text-[11px] text-[#6B7280]">{{ v.expiry }}</span>
              </div>

              <div class="text-lg font-bold text-[#1E1B4B]">{{ v.title }}</div>
              <p class="text-xs text-[#4B5563] min-h-[32px] line-clamp-2">{{ v.desc }}</p>

              <div class="inline-block px-2.5 py-1 rounded-full text-xs font-mono bg-[#FAF5FF] text-[#1E1B4B] border border-[#DDD6FE]">
                Mã: <span class="font-bold text-[#7C3AED]">{{ v.code }}</span>
              </div>
            </div>

            <div class="pt-4 space-y-2">
              <div class="flex items-center justify-between text-[11px] text-[#6B7280]">
                <span>Đã dùng {{ v.usedPercent }}%</span>
                <span class="font-bold" [ngClass]="v.statusColor">{{ v.statusLabel }}</span>
              </div>

              <div class="w-full h-1.5 rounded-full bg-[#F3E8FF] overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  [style.width.%]="v.usedPercent"
                  [ngClass]="v.usedPercent >= 90 ? 'bg-[#F43F5E]' : 'bg-[#7C3AED]'"
                ></div>
              </div>

              <button
                (click)="claimVoucher(v)"
                type="button"
                [disabled]="v.claimed"
                class="w-full mt-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                [ngClass]="
                  v.claimed
                    ? 'bg-[#F3E8FF] text-[#7C3AED] cursor-default'
                    : 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white active:scale-98'
                "
              >
                <span class="material-symbols-outlined text-sm">{{ v.claimed ? 'check_circle' : 'bookmark_add' }}</span>
                <span>{{ v.claimed ? 'Đã Lưu ✓' : 'Lưu Mã' }}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. HẠNG MỤC SĂN DEAL HOT (FILTER TABS) -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-base sm:text-lg font-bold text-[#1E1B4B] tracking-tight">Hạng Mục Săn Deal Hot</h3>
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
                ? 'bg-[#7C3AED] text-white font-bold border border-[#7C3AED]'
                : 'bg-white text-[#1E1B4B] border border-[#DDD6FE] hover:bg-[#FAF5FF]'
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
              <h2 class="text-xl sm:text-2xl font-bold text-[#1E1B4B]">
                Món Quà Tinh Xảo Đang Giảm Giá Sâu
              </h2>
              <span class="px-2.5 py-0.5 rounded-full bg-[#FFE4E6] text-[#E11D48] text-[11px] font-bold">
                Giới hạn 24H
              </span>
            </div>
            <p class="text-xs text-[#6B7280] mt-0.5">
              Mỗi sản phẩm đều được hỗ trợ khắc tên, khắc laser lời chúc theo yêu cầu cá nhân hóa
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            *ngFor="let deal of displayDeals()"
            class="group bg-white rounded-[28px] overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between border border-[#DDD6FE]"
          >
            <!-- Product Image Frame -->
            <div class="relative w-full aspect-square overflow-hidden bg-slate-50">
              <img
                [src]="deal.image"
                [alt]="deal.name"
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              <!-- Badges top-left -->
              <div class="absolute top-3 left-3 flex flex-col gap-1">
                <span class="px-3 py-1 rounded-full text-xs font-bold text-white shadow-md bg-[#F43F5E]">
                  {{ deal.discountBadge }}
                </span>
                <span
                  *ngIf="deal.featureTag"
                  class="px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-[11px] font-semibold text-[#1E1B4B] shadow-xs"
                >
                  {{ deal.featureTag }}
                </span>
              </div>

              <!-- Wishlist Heart Button -->
              <button
                (click)="toggleWishlist(deal._id)"
                type="button"
                class="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center transition-all shadow-xs"
                [ngClass]="isWishlisted(deal._id) ? 'text-[#F43F5E]' : 'text-[#7C3AED] hover:bg-white'"
                title="Yêu thích món quà này"
              >
                <span
                  class="material-symbols-outlined text-[20px]"
                  [ngClass]="{ 'fill-1': isWishlisted(deal._id) }"
                >
                  favorite
                </span>
              </button>
            </div>

            <!-- Card Content -->
            <div class="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div class="space-y-2">
                <!-- Rating & Category Tag -->
                <div class="flex items-center gap-1.5 text-xs">
                  <span class="material-symbols-outlined text-sm text-amber-500 fill-1">star</span>
                  <span class="font-bold text-[#1E1B4B]">{{ deal.rating }}</span>
                  <span class="text-[#6B7280]">({{ deal.reviewCount }} đánh giá)</span>
                  <span class="text-[#D1D5DB]">•</span>
                  <span class="font-medium text-[#7C3AED]">{{ deal.categoryTag }}</span>
                </div>

                <!-- Product Name -->
                <a
                  [routerLink]="['/products', deal.slug]"
                  class="text-sm sm:text-base font-bold text-[#1E1B4B] hover:text-[#7C3AED] transition-colors line-clamp-2"
                >
                  {{ deal.name }}
                </a>

                <!-- Price Row -->
                <div class="flex items-baseline gap-2 pt-1">
                  <span class="text-xl sm:text-2xl font-black font-mono text-[#7C3AED]">
                    {{ deal.salePrice | number }}đ
                  </span>
                  <span class="text-xs text-slate-400 line-through">
                    {{ deal.price | number }}đ
                  </span>
                </div>

                <!-- Stock & Progress -->
                <div class="pt-1 space-y-1">
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="font-semibold flex items-center gap-1 text-[#F43F5E]">
                      <span class="w-1.5 h-1.5 rounded-full bg-[#F43F5E] animate-ping"></span>
                      Chỉ còn {{ deal.stockLeft }} suất Deal
                    </span>
                    <span class="text-[#6B7280]">Đã bán {{ deal.soldPercent }}%</span>
                  </div>
                  <div class="w-full h-1.5 rounded-full bg-[#F3E8FF] overflow-hidden">
                    <div
                      class="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#A855F7]"
                      [style.width.%]="deal.soldPercent"
                    ></div>
                  </div>
                </div>
              </div>

              <!-- Action & 50% Deposit Info -->
              <div class="pt-2 space-y-2.5">
                <div class="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full bg-[#FAF5FF] text-[#7C3AED] border border-[#DDD6FE]">
                  <span class="material-symbols-outlined text-[14px]">payments</span>
                  <span>Chỉ cần cọc trước <strong>{{ deal.depositAmount | number }}đ (50%)</strong></span>
                </div>

                <button
                  (click)="quickBuyDeal(deal)"
                  type="button"
                  class="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 text-white bg-[#7C3AED] hover:bg-[#6D28D9]"
                  style="box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);"
                >
                  <span class="material-symbols-outlined text-base">view_in_ar</span>
                  <span>Săn Deal &amp; Tùy Biến 3D</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 5. CHÍNH SÁCH ĐẶT CỌC GIỮ DEAL & CAM KẾT HOÀN TIỀN -->
      <section
        class="rounded-[28px] bg-white p-6 sm:p-8 shadow-xs space-y-6 border border-[#DDD6FE]"
      >
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-2xl">lock_reset</span>
            </div>
            <div>
              <h3 class="text-base sm:text-lg font-bold text-[#1E1B4B]">
                Yên Tâm Săn Deal: Chính Sách Đặt Cọc 50% Giữ Giá Khuyến Mãi
              </h3>
              <p class="text-xs text-[#6B7280] mt-0.5">
                Áp dụng theo quy chuẩn Bespoke Gifting chính hãng Giftory Studio
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1.5 text-[#7C3AED] text-xs font-semibold">
            <span class="material-symbols-outlined text-base">verified_user</span>
            <span>100% Cam Kết Hoàn Cọc Nếu Không Hài Lòng Bản Thiết Kế 3D</span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <div class="p-4 rounded-2xl bg-[#FAF5FF] border border-[#DDD6FE]/60 space-y-1">
            <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#7C3AED] shadow-xs mb-2">
              <span class="material-symbols-outlined text-base">savings</span>
            </div>
            <div class="text-xs font-bold text-[#1E1B4B]">1. Cọc trước 50%</div>
            <p class="text-xs text-[#6B7280] leading-relaxed">
              Giữ nguyên giá Flash Sale hời nhất hôm nay mà chưa cần trả toàn bộ ngay.
            </p>
          </div>

          <div class="p-4 rounded-2xl bg-[#FAF5FF] border border-[#DDD6FE]/60 space-y-1">
            <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#7C3AED] shadow-xs mb-2">
              <span class="material-symbols-outlined text-base">draw</span>
            </div>
            <div class="text-xs font-bold text-[#1E1B4B]">2. Duyệt Mockup 3D</div>
            <p class="text-xs text-[#6B7280] leading-relaxed">
              Đội ngũ nghệ nhân gửi bản thảo khắc laser/in ấn 3D chuẩn xác để bạn kiểm tra.
            </p>
          </div>

          <div class="p-4 rounded-2xl bg-[#FAF5FF] border border-[#DDD6FE]/60 space-y-1">
            <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#7C3AED] shadow-xs mb-2">
              <span class="material-symbols-outlined text-base">event_available</span>
            </div>
            <div class="text-xs font-bold text-[#1E1B4B]">3. Chọn Ngày Giao</div>
            <p class="text-xs text-[#6B7280] leading-relaxed">
              Tùy chọn ngày giao chính xác vào đúng ngày kỷ niệm, sinh nhật của người thương.
            </p>
          </div>

          <div class="p-4 rounded-2xl bg-[#FAF5FF] border border-[#DDD6FE]/60 space-y-1">
            <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#7C3AED] shadow-xs mb-2">
              <span class="material-symbols-outlined text-base">handshake</span>
            </div>
            <div class="text-xs font-bold text-[#1E1B4B]">4. Thanh Toán Khi Nhận</div>
            <p class="text-xs text-[#6B7280] leading-relaxed">
              Kiểm tra hộp quà nguyên vẹn lụa là trước khi thanh toán 50% số tiền còn lại.
            </p>
          </div>
        </div>
      </section>
    </div>
  `
})
export class FlashSaleComponent implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private wishlistService = inject(WishlistService);

  hours = signal<string>('08');
  minutes = signal<string>('38');
  seconds = signal<string>('56');
  toastMessage = signal<string | null>(null);

  selectedTab = signal<string>('all');

  categoryTabs = [
    { key: 'all', icon: '🔥', label: 'Deal Flash Sale 24h' },
    { key: 'combo', icon: '🎁', label: 'Combo Quà Tặng Đội Ngũ/Sếp (-30%)' },
    { key: 'custom', icon: '✨', label: 'Quà Custom Cọc 50% Tặng Thiệp' },
    { key: 'ship', icon: '🎟️', label: 'Mã Giảm Giá Phí Ship & Hỏa Tốc' },
    { key: 'anniversary', icon: '🌸', label: 'Quà Dịp Kỷ Niệm & Sinh Nhật' }
  ];

  vouchers = signal<VoucherItem[]>([
    {
      id: 'v1',
      type: 'Giảm Tiền Mặt',
      title: 'Giảm 50.000đ',
      desc: 'Cho đơn hàng quà tặng bất kỳ từ 300.000đ',
      code: 'TRIAN50K',
      expiry: 'HSD: Hôm nay',
      usedPercent: 82,
      statusLabel: 'Sắp hết',
      statusColor: 'text-[#F43F5E]',
      claimed: false
    },
    {
      id: 'v2',
      type: 'Vận Chuyển',
      title: 'Freeship Max',
      desc: 'Miễn phí ship toàn quốc (Hỏa tốc 2h HCM & HN)',
      code: 'FREESHIPMAX',
      expiry: 'HSD: 24h tới',
      usedPercent: 95,
      statusLabel: 'Cháy vé',
      statusColor: 'text-[#F43F5E]',
      claimed: true
    },
    {
      id: 'v3',
      type: 'Quà Tặng Thêm',
      title: 'Tặng Hộp Lụa 45K',
      desc: 'Tặng kèm hộp quà cao cấp, nơ lụa & thiệp thơm viết tay',
      code: 'LUABESPOKE',
      expiry: 'HSD: 3 ngày',
      usedPercent: 64,
      statusLabel: 'Còn nhiều',
      statusColor: 'text-[#7C3AED]',
      claimed: false
    },
    {
      id: 'v4',
      type: 'Doanh Nghiệp',
      title: 'Giảm 100.000đ',
      desc: 'Cho đơn hàng quà doanh nghiệp hoặc combo từ 1.000.000đ',
      code: 'CORP100',
      expiry: 'HSD: 7 ngày',
      usedPercent: 45,
      statusLabel: 'Đang mở',
      statusColor: 'text-[#7C3AED]',
      claimed: false
    }
  ]);

  // Bộ sưu tập Flash Sale theo đúng thiết kế Stitch
  mockDeals: FlashSaleDeal[] = [
    {
      _id: 'deal-1',
      name: 'Khung Gỗ Kỷ Niệm LED Khắc Tên Bespoke',
      slug: 'khung-go-ky-niem-led-khac-ten-bespoke',
      price: 350000,
      salePrice: 199000,
      discountBadge: '-43% FLASH SALE',
      featureTag: '✨ Khắc tên lấy ngay 2h',
      categoryTag: 'Bespoke LED',
      rating: 4.9,
      reviewCount: 420,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuArEXObxasubXCiRJSIN6fj-nsx8mGY4OmRsHMVxmHMuQj_XR3Rzj0HQIkLAo86IFXIr6CGWn-NHuts-1TKiZmkj03r6Pzi3S-tj9d3d_qWC4uAmugh2V30Dji9BLCOCrRGq_racZs9K689hUThEPLXafuuTV1v08jjhiGxHv8CwHHiN1voQWsvk2g6SFoGe4hZyRST-ftXgrn_iDXhF8dO29fzT3tG_k13E43bctE7qIAXC0eZMwjvyb1FtQkIP5jAZcg',
      stockLeft: 5,
      soldPercent: 83,
      depositAmount: 99500,
      isCustomizable: true
    },
    {
      _id: 'deal-2',
      name: 'Hộp Quà Bình Yên Ngày Mới (Nến Thơm + Trà Thảo Mộc)',
      slug: 'hop-qua-binh-yen-ngay-moi',
      price: 650000,
      salePrice: 429000,
      discountBadge: '-34% DEAL HOT',
      featureTag: '🌿 100% Thuần Tự Nhiên',
      categoryTag: 'Combo Chữa Lành',
      rating: 5.0,
      reviewCount: 289,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD8KIuacr0hXocga6u3rVB3zwB56SazF0l16x0d42NoupJcpNXdPQe8Rhie9-8N9ncMhpviZeKkpdVtyNpVDTjYWZuZGgw_tneuSa2Pvl1Vnc4vgMxwExcDlvWDlyI4RuTw_QUg03V-ATGuSYZbaJUW3LbVJx-i_Vac6z0BYpRUDlcFR5VaIpRJUUekOlByVslqu4LKo_XaBBeBKJ4Yrd72oixnqaITRcfohy-g701CGyy2j_YNv7GrlnQZjMbx7aGml1w',
      stockLeft: 7,
      soldPercent: 72,
      depositAmount: 214500,
      isCustomizable: true
    },
    {
      _id: 'deal-3',
      name: 'Ví Da Sáp Khắc Tên & Chữ Ký Riêng Kèm Hộp Gỗ',
      slug: 'vi-da-sap-khac-ten-chu-ky-rieng',
      price: 600000,
      salePrice: 390000,
      discountBadge: '-35% GIÁ TỐT',
      featureTag: '🖋️ Khắc chữ ký laser',
      categoryTag: 'Bespoke Leather',
      rating: 4.9,
      reviewCount: 331,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCIGs0Xk0EUNf1R_wZeCpbDwzg_pCWEbRZuNeHGSf3vEoKPp6zX8D8iu8lvmyEQOJlUNoP9JrBE0M_7EwO2CmROMRIl-4wKJT49RTmeCzT0fZxh_urM6w4z5DW4CIvbLgWAYfG9a8ph915-vsUZ5YTmIi6hP8-T5NhBZaW3Bc868yyIUyQz8hkokevfuUWsGe31dzjozvGcZWTlUd3pe2J7i4Tyik77niwj10cVg42UVBKhq2wLrDXL39ug9Gv3EvwD8to',
      stockLeft: 5,
      soldPercent: 79,
      depositAmount: 195000,
      isCustomizable: true
    },
    {
      _id: 'deal-4',
      name: 'Set Quà Mộc Vững Vàng Khắc Logo Doanh Nghiệp',
      slug: 'set-qua-moc-vung-vang-khac-logo',
      price: 680000,
      salePrice: 490000,
      discountBadge: '-28% RIB DEAL',
      featureTag: '🏢 Khắc Logo Doanh Nghiệp',
      categoryTag: 'Quà Tri Ân',
      rating: 4.9,
      reviewCount: 196,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCc8ruMBG5EcIlqZBd6AUOI6AFmqmPQO0I7Fs51OOZlJJ2G3VTlFiGbHZpkBLL5StMoHmEumgvbsuN-oMT4nD3Bqkb_i2nO5v8kuY7J5qsi5rw6l8LkRkc4CZ8fp48nGvCzdMQiZN-lk2Wi_S6SvgcGZm8TMf6MDbbwlaZwMpZlsnMBCNLqKalETigL4jZdnkcHHavJ9aRtkwFSNkPY9uTIqav3-j8PgoQUuz45SLUzzDEwWxf9zd6Bookimj8YkoB3o9g',
      stockLeft: 12,
      soldPercent: 60,
      depositAmount: 245000,
      isCustomizable: true
    },
    {
      _id: 'deal-5',
      name: 'Hộp Kỷ Niệm Từng Khoảnh Khắc (Cuộn Phim Ảnh 12 Mốc)',
      slug: 'hop-ky-niem-tung-khoanh-khac',
      price: 490000,
      salePrice: 299000,
      discountBadge: '-39% FLASH DEAL',
      featureTag: '🎞️ In 12 ảnh kỷ niệm',
      categoryTag: 'Bespoke Memories',
      rating: 4.9,
      reviewCount: 670,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB_WTAMey-PnxTQfkveigNWyBUEIMPh_9LOsQFsa7U5vpOGBDEfrehdlxyuRLJhMs5LZLmCQiVyejWMgn8nGup9voJGlcPlZ-zhN7WK49zC5SuZz2V3mgdflTKSt2eqjvqhzxdO1wQ6hD2cQmunNj4JGuWM7aqva8VEArWUsDElliof78dQS7OS51b1vgZRhU6nqMM3QEvoP4ImWlrdkh0-erofGMQps3TtOXWhErsbZ2z3a0wDx15BrF2isdiuubKMMao',
      stockLeft: 4,
      soldPercent: 88,
      depositAmount: 149500,
      isCustomizable: true
    },
    {
      _id: 'deal-6',
      name: 'Set Tinh Dầu & Nến Thơm Tinh Khiết Dịp 20/10',
      slug: 'set-tinh-dau-nen-thom-tinh-khiet',
      price: 520000,
      salePrice: 335000,
      discountBadge: '-36% DỊP LỄ',
      featureTag: '🌸 Bộ quà Phụ Nữ & Tri Ân',
      categoryTag: 'Phiên Bản Giới Hạn',
      rating: 5.0,
      reviewCount: 340,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB6njhjkXq-rlCZzjcV-D2lxG3U4PJBsV7DPKQfzX7G3HDxJzgj8J9cM2GtZT6PdsyOeUFbSvzCUFIi8TgannSfq6gCVZlodqwhZeBmoLhIXy85hd1nuCShg56rXSQQxfwPCAQiNNvu-yzAtPqNSmBv17o-bmP2QWmyAPltkTAVc0YPIl2eiFngnoLotPx1TxlDfPSY1x9cbl7lLpPuZgn8pAvT-BMEmYypGf0rKz9gci54d1QHAKOJrRA_MUbH2BPlPms',
      stockLeft: 8,
      soldPercent: 74,
      depositAmount: 167500,
      isCustomizable: true
    }
  ];

  displayDeals = signal<FlashSaleDeal[]>(this.mockDeals);

  private timerInterval: any;

  ngOnInit() {
    this.startCountdown();
    this.loadBackendProducts();
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  loadBackendProducts() {
    this.productService.getProducts({ isFlashSale: true }).subscribe({
      next: (res: any) => {
        const list: Product[] = Array.isArray(res) ? res : (res?.data || res?.items || []);
        if (list && list.length > 0) {
          const mapped: FlashSaleDeal[] = list.map((p, idx) => {
            const salePrice = p.salePrice || Math.round(p.price * 0.7);
            const discount = Math.round(((p.price - salePrice) / p.price) * 100);
            return {
              _id: p._id,
              name: p.name,
              slug: p.slug,
              price: p.price,
              salePrice: salePrice,
              discountBadge: `-${discount}% FLASH SALE`,
              featureTag: p.isCustomizable ? '✨ Khắc tên laser miễn phí' : '🎁 Hộp nơ lụa cao cấp',
              categoryTag: p.category?.name || 'Quà Tặng Giftory',
              rating: 4.9,
              reviewCount: 150 + idx * 45,
              image: p.images?.[0] || 'https://lh3.googleusercontent.com/aida-public/AB6AXuArEXObxasubXCiRJSIN6fj-nsx8mGY4OmRsHMVxmHMuQj_XR3Rzj0HQIkLAo86IFXIr6CGWn-NHuts-1TKiZmkj03r6Pzi3S-tj9d3d_qWC4uAmugh2V30Dji9BLCOCrRGq_racZs9K689hUThEPLXafuuTV1v08jjhiGxHv8CwHHiN1voQWsvk2g6SFoGe4hZyRST-ftXgrn_iDXhF8dO29fzT3tG_k13E43bctE7qIAXC0eZMwjvyb1FtQkIP5jAZcg',
              stockLeft: 3 + (idx % 8),
              soldPercent: 70 + (idx % 25),
              depositAmount: Math.round(salePrice / 2),
              isCustomizable: p.isCustomizable || false
            };
          });

          // Gộp các deal backend lên đầu, giữ các mock deal nếu backend ít
          const combined = [...mapped, ...this.mockDeals.slice(mapped.length)];
          this.displayDeals.set(combined);
        }
      },
      error: () => {
        // Fallback giữ nguyên mockDeals
      }
    });
  }

  startCountdown() {
    let totalSec = 8 * 3600 + 38 * 60 + 56;
    this.timerInterval = setInterval(() => {
      if (totalSec <= 0) {
        totalSec = 8 * 3600;
      }
      totalSec--;
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      this.hours.set(h < 10 ? '0' + h : '' + h);
      this.minutes.set(m < 10 ? '0' + m : '' + m);
      this.seconds.set(s < 10 ? '0' + s : '' + s);
    }, 1000);
  }

  claimVoucher(v: VoucherItem) {
    if (v.claimed) return;
    this.vouchers.update((list) =>
      list.map((item) => (item.id === v.id ? { ...item, claimed: true } : item))
    );
    this.showToast(`Đã lưu mã ${v.code} thành công!`);
  }

  showToast(msg: string) {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3000);
  }

  toggleWishlist(productId: string) {
    this.wishlistService.toggleWishlist(productId).subscribe({
      next: () => {
        const isAdded = this.wishlistService.isWishlisted(productId);
        this.showToast(isAdded ? 'Đã thêm vào danh sách yêu thích!' : 'Đã xóa khỏi danh sách yêu thích!');
      },
      error: () => {
        this.showToast('Đã cập nhật danh sách yêu thích!');
      }
    });
  }

  isWishlisted(productId: string): boolean {
    return this.wishlistService.isWishlisted(productId);
  }

  quickBuyDeal(deal: FlashSaleDeal) {
    this.cartService.addItem({
      productId: deal._id,
      name: deal.name,
      price: deal.salePrice,
      quantity: 1,
      image: deal.image,
      isCustom: false
    }).subscribe({
      next: () => {
        this.showToast(`Đã thêm "${deal.name}" vào giỏ hàng!`);
      },
      error: () => {
        this.showToast(`Đã thêm món quà vào giỏ hàng!`);
      }
    });
  }
}
