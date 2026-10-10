import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Breadcrumb & Header Title Area -->
      <section class="flex flex-col gap-2 mb-6">
        <div class="flex items-center gap-2 text-xs text-slate-500">
          <a routerLink="/" class="hover:text-[#7C3AED]">Trang chủ</a>
          <span>/</span>
          <span class="text-[#1E1B4B] font-semibold">Giỏ hàng & Đặt cọc</span>
        </div>

        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-2xl sm:text-3xl font-bold text-[#1E1B4B]">Giỏ Hàng Của Bạn</h1>
              <span class="px-3 py-1 rounded-full bg-purple-100 text-[#7C3AED] text-xs font-bold flex items-center gap-1 shadow-sm">
                <span class="material-symbols-outlined text-[15px]">redeem</span>
                <span>{{ cartService.itemsCount() }} Sản Phẩm</span>
              </span>
            </div>
            <p class="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-3xl leading-relaxed">
              Kiểm tra kỹ thông tin sản phẩm và chính sách cọc 50% cho quà tặng thiết kế theo yêu cầu.
            </p>
          </div>
          <div class="flex items-center gap-2 text-xs text-slate-500 bg-white px-4 py-2 rounded-full border border-[#DDD6FE] shadow-sm">
            <span class="material-symbols-outlined text-[#7C3AED] text-[18px]">verified_user</span>
            <span>Đảm bảo quyền lợi khách hàng 100%</span>
          </div>
        </div>

        <!-- Guest Cart Persistence Banner -->
        @if (!authService.isAuthenticated()) {
          <div class="mt-4 p-4 rounded-2xl bg-white border border-[#DDD6FE] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div class="flex items-start gap-3.5">
              <div class="w-9 h-9 rounded-full bg-[#1E1B4B] text-white flex items-center justify-center shrink-0 mt-0.5 md:mt-0">
                <span class="material-symbols-outlined text-[20px]">bolt</span>
              </div>
              <div>
                <p class="text-xs font-bold text-[#1E1B4B]">
                  Bạn đang thao tác với tư cách <span class="text-[#7C3AED]">Khách vãng lai</span>
                </p>
                <p class="text-xs text-slate-500 mt-0.5">
                  Giỏ hàng và bản thiết kế custom đã được tự động lưu tạm trên thiết bị này. Đăng nhập 1-Click để đồng bộ đa nền tảng và nhận ngay <strong class="text-[#7C3AED]">+35 điểm tích lũy Giftory!</strong>
                </p>
              </div>
            </div>
            <a routerLink="/login" class="shrink-0 px-4 py-2 rounded-full bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#7C3AED] font-bold text-xs shadow-sm transition-all flex items-center gap-1.5">
              <span>Đăng nhập 1-Click</span>
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </a>
          </div>
        }
      </section>

      @if (cartService.items().length === 0) {
        <div class="py-20 bg-white rounded-3xl p-8 text-center border border-[#DDD6FE] shadow-shop-card">
          <span class="material-symbols-outlined text-6xl text-slate-300 mb-3">shopping_bag</span>
          <h2 class="text-xl font-bold text-[#1E1B4B]">Giỏ hàng của bạn đang trống</h2>
          <p class="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">Hãy khám phá bộ sưu tập quà tặng ý nghĩa hoặc tạo một bản thiết kế khắc laser riêng biệt!</p>
          <div class="mt-6 flex items-center justify-center gap-3">
            <a routerLink="/products" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl">Khám phá sản phẩm</a>
            <a routerLink="/custom-studio" class="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl shadow-md">Đến Custom Studio</a>
          </div>
        </div>
      } @else {
        <!-- Main Layout: 7 Cols Left / 5 Cols Right -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <!-- LEFT COLUMN: CART ITEMS LIST -->
          <div class="lg:col-span-7 flex flex-col gap-5">
            <!-- Select All Utility Header -->
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-[#DDD6FE] flex items-center justify-between">
              <label class="flex items-center gap-2.5 cursor-pointer select-none text-xs font-bold text-[#1E1B4B]">
                <input type="checkbox" checked class="w-4 h-4 rounded accent-[#7C3AED]">
                <span>Chọn tất cả ({{ cartService.itemsCount() }} sản phẩm)</span>
              </label>
              <button (click)="clearCart()" class="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1 transition-colors">
                <span class="material-symbols-outlined text-[16px]">delete_sweep</span>
                <span>Xóa toàn bộ giỏ</span>
              </button>
            </div>

            <!-- Items Loop -->
            @for (item of cartService.items(); track $index) {
              <article class="bg-white rounded-2xl p-5 sm:p-6 shadow-shop-card border border-[#DDD6FE] relative overflow-hidden group">
                <!-- Color edge indicator -->
                <div 
                  class="absolute top-0 left-0 bottom-0 w-1.5"
                  [ngClass]="item.isCustom ? 'bg-[#10B981]' : 'bg-[#DDD6FE]'"
                ></div>

                <div class="flex items-start gap-4">
                  <!-- Checkbox -->
                  <input type="checkbox" checked class="w-4 h-4 mt-2 rounded accent-[#7C3AED] cursor-pointer shrink-0">

                  <!-- Thumbnail -->
                  <div class="relative w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                    <img [src]="item.customDetails?.previewImage || (item.productId?.images && item.productId.images[0]) || 'https://placehold.co/400'" [alt]="item.productId?.name" class="w-full h-full object-cover">
                    @if (item.isCustom) {
                      <div class="absolute bottom-1 left-1 right-1 py-0.5 px-1 rounded bg-white/90 backdrop-blur-sm text-center">
                        <span class="text-[9px] text-[#7C3AED] font-bold flex items-center justify-center gap-0.5">
                          <span class="material-symbols-outlined text-[10px]">view_in_ar</span>
                          Mô phỏng 3D
                        </span>
                      </div>
                    }
                  </div>

                  <!-- Details -->
                  <div class="flex-1 min-w-0">
                    <!-- Badges & Delete -->
                    <div class="flex items-center justify-between gap-2 mb-1">
                      @if (item.isCustom) {
                        <span class="px-2.5 py-0.5 rounded-full bg-[#10B981] text-white font-bold text-[10px] flex items-center gap-1 shadow-sm">
                          <span class="material-symbols-outlined text-[12px]">palette</span>
                          Sản phẩm Custom • Cọc 50%
                        </span>
                      } @else {
                        <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[10px] flex items-center gap-1">
                          <span class="material-symbols-outlined text-[12px]">inventory_2</span>
                          Hàng chuẩn • Không yêu cầu cọc
                        </span>
                      }
                      <button (click)="removeItem($index)" class="text-slate-400 hover:text-red-500 transition-colors" title="Xóa món này">
                        <span class="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>

                    <!-- Title -->
                    <h2 class="font-bold text-sm sm:text-base text-[#1E1B4B] truncate mb-1">
                      {{ item.productId?.name || 'Sản phẩm quà tặng Giftory' }}
                    </h2>

                    <!-- Custom details callout if custom (AC14 & BR-CUS06) -->
                    @if (item.isCustom && item.customDetails) {
                      <div class="my-2 p-3 rounded-xl bg-purple-50/80 border border-purple-100 text-xs text-slate-700 flex flex-col gap-1.5">
                        @if (item.customDetails.frontMessage) {
                          <div class="flex items-center gap-1.5">
                            <span class="text-slate-400 font-medium shrink-0">Mặt trước:</span>
                            <span class="font-bold text-[#7C3AED] truncate">“{{ item.customDetails.frontMessage }}”</span>
                          </div>
                        }
                        @if (item.customDetails.backMessage) {
                          <div class="flex items-center gap-1.5">
                            <span class="text-slate-400 font-medium shrink-0">Mặt sau:</span>
                            <span class="font-bold text-[#7C3AED] truncate">“{{ item.customDetails.backMessage }}”</span>
                          </div>
                        }

                        <div class="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 pt-1 border-t border-purple-200/50">
                          <span>Màu phôi: <strong class="text-slate-700">{{ item.customDetails.selectedColor || item.variantName || 'Chuẩn' }}</strong></span>
                          <span>•</span>
                          <span>Font: <strong class="text-slate-700">{{ item.customDetails.fontFamily || 'Signature' }}</strong></span>
                          <span>•</span>
                          <span>Khắc: <strong class="text-slate-700">{{ item.customDetails.engraveColor || 'Gold' }}</strong></span>
                          @if (item.customDetails.pattern && item.customDetails.pattern !== 'none') {
                            <span>•</span>
                            <span>Họa tiết: <strong class="text-[#7C3AED]">{{ item.customDetails.pattern }}</strong></span>
                          }
                          @if (item.customDetails.uploadedImage) {
                            <span>•</span>
                            <span class="text-emerald-700 font-bold flex items-center gap-0.5">
                              <span class="material-symbols-outlined text-[13px]">image</span>
                              Ảnh cá nhân HD
                            </span>
                          }
                        </div>

                        <!-- Surcharges breakdown pill -->
                        @if (item.customDetails.customFee && item.customDetails.customFee > 0) {
                          <div class="text-[10px] text-[#7C3AED] font-semibold bg-white/70 px-2 py-0.5 rounded-md border border-purple-100 w-fit">
                            Phụ phí tùy biến: +{{ item.customDetails.customFee | number:'1.0-0' }}đ
                          </div>
                        }
                      </div>
                    }

                    <!-- Price & Quantity -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div>
                        <div class="flex items-baseline gap-1.5">
                          <span class="font-extrabold text-base text-[#7C3AED]">
                            {{ item.price | number:'1.0-0' }}đ
                          </span>
                        </div>
                        @if (item.isCustom) {
                          <div class="text-[11px] text-emerald-700 font-bold mt-0.5">
                            Cần cọc trước 50%: {{ item.depositRequired | number:'1.0-0' }}đ
                          </div>
                        }
                      </div>

                      <div class="flex items-center gap-2">
                        @if (item.isCustom) {
                          <a 
                            routerLink="/custom-studio" 
                            [queryParams]="{ productId: item.productId?._id, cartItemIndex: $index }"
                            class="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                            title="Chỉnh sửa cấu hình bản thiết kế này (AC14)"
                          >
                            <span class="material-symbols-outlined text-[14px]">tune</span>
                            <span>Sửa cấu hình</span>
                          </a>
                        }

                        <!-- Stepper -->
                        <div class="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                          <button (click)="updateQuantity($index, item.quantity - 1)" class="w-6 h-6 rounded bg-white flex items-center justify-center text-slate-700 shadow-sm text-xs">
                            <span class="material-symbols-outlined text-[14px]">remove</span>
                          </button>
                          <span class="w-7 text-center text-xs font-bold text-[#1E1B4B]">{{ item.quantity }}</span>
                          <button (click)="updateQuantity($index, item.quantity + 1)" class="w-6 h-6 rounded bg-white flex items-center justify-center text-slate-700 shadow-sm text-xs">
                            <span class="material-symbols-outlined text-[14px]">add</span>
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </article>
            }

            <!-- Premium Packaging Card -->
            <div class="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#DDD6FE] flex items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <input type="checkbox" checked class="w-5 h-5 rounded accent-[#7C3AED] cursor-pointer shrink-0">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs sm:text-sm font-bold text-[#1E1B4B]">Gói quà nghệ thuật lụa Satin & xịt hương hoa khô</span>
                    <span class="px-2 py-0.5 rounded-full bg-slate-900 text-white font-bold text-[10px] uppercase">Miễn phí hôm nay</span>
                  </div>
                  <p class="text-xs text-slate-500 mt-0.5">Đóng gói thủ công tỉ mỉ kèm ruy băng lụa dập nổi tên Giftory (Trị giá 35.000đ).</p>
                </div>
              </div>
              <span class="material-symbols-outlined text-amber-500 text-3xl shrink-0">card_giftcard</span>
            </div>

            <!-- Action Link -->
            <div class="pt-2 flex items-center justify-between">
              <a routerLink="/products" class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#7C3AED]">
                <span class="material-symbols-outlined text-[16px]">west</span>
                <span>Tiếp tục chọn thêm quà tặng</span>
              </a>
            </div>
          </div>

          <!-- RIGHT COLUMN: PRICE BREAKDOWN & 50% DEPOSIT CHECKOUT PANEL -->
          <div class="lg:col-span-5 flex flex-col gap-6">
            <div class="bg-white rounded-3xl p-6 shadow-shop-card border border-[#DDD6FE] flex flex-col gap-5">
              
              <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 class="font-bold text-base text-[#1E1B4B]">Tóm tắt đơn hàng</h3>
                <span class="text-xs text-slate-500">{{ cartService.itemsCount() }} sản phẩm</span>
              </div>

              <!-- Voucher Input -->
              <div class="flex items-center gap-2">
                <input 
                  [(ngModel)]="voucherInput"
                  placeholder="Mã ưu đãi (TRIAN30K / FREESHIP)"
                  class="flex-1 px-3 py-2 rounded-xl border border-[#DDD6FE] text-xs focus:outline-none focus:border-[#7C3AED] uppercase font-bold"
                >
                <button 
                  (click)="applyVoucher()"
                  class="px-4 py-2 rounded-xl bg-purple-100 hover:bg-[#7C3AED] hover:text-white text-[#7C3AED] font-bold text-xs transition-all shrink-0 cursor-pointer"
                >
                  Áp dụng
                </button>
              </div>

              <!-- Price Breakdown Lines -->
              <div class="flex flex-col gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <div class="flex items-center justify-between">
                  <span>Tổng tiền hàng ({{ cartService.itemsCount() }} món):</span>
                  <span class="font-bold text-[#1E1B4B]">{{ cartService.pricing().itemsTotal | number:'1.0-0' }}đ</span>
                </div>
                <div class="flex items-center justify-between">
                  <span>Gói quà nghệ thuật lụa:</span>
                  <span class="text-emerald-600 font-bold">Miễn phí</span>
                </div>
                @if (cartService.pricing().voucherDiscount > 0) {
                  <div class="flex items-center justify-between text-[#7C3AED]">
                    <span>Ưu đãi Voucher {{ cartService.cart()?.voucherCode }}:</span>
                    <span class="font-bold">-{{ cartService.pricing().voucherDiscount | number:'1.0-0' }}đ</span>
                  </div>
                }
                <div class="flex items-center justify-between">
                  <span>Phí vận chuyển dự kiến:</span>
                  <span class="font-semibold text-slate-800">
                    {{ cartService.pricing().shippingFee === 0 ? 'Miễn phí' : ((cartService.pricing().shippingFee | number:'1.0-0') + 'đ') }}
                  </span>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-sm font-bold text-[#1E1B4B]">
                  <span>Tổng giá trị đơn hàng:</span>
                  <span class="text-base text-[#1E1B4B]">{{ cartService.pricing().totalAmount | number:'1.0-0' }}đ</span>
                </div>
              </div>

              @if (cartService.pricing().totalCustomItems > 0) {
                <!-- 50% Deposit Summary Card for Custom Items -->
                <div class="p-4 rounded-2xl bg-[#F5EEFD] border border-[#DDD6FE] flex flex-col gap-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-[#7C3AED] uppercase tracking-wide">
                      Tiền cọc 50% thiết kế:
                    </span>
                    <span class="text-xl font-extrabold text-[#7C3AED]">
                      {{ cartService.pricing().depositAmount | number:'1.0-0' }}đ
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-500">
                    Cọc trước 50% cho {{ cartService.pricing().totalCustomItems }} sản phẩm custom theo quy định xưởng
                  </p>
                  <div class="flex items-center justify-between pt-2 border-t border-purple-200/50 text-xs font-semibold text-slate-700">
                    <span>Còn lại thanh toán COD:</span>
                    <strong class="text-[#1E1B4B] font-bold text-sm">{{ cartService.pricing().remainingCodAmount | number:'1.0-0' }}đ</strong>
                  </div>
                </div>
              }

              <!-- Checkout Submit Button -->
              <button 
                (click)="proceedToCheckout()"
                class="w-full py-3.5 px-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-300 transition-all active:scale-95 cursor-pointer"
              >
                <span class="material-symbols-outlined text-[18px]">verified</span>
                <span>Tiến Hành Đặt Hàng</span>
              </button>

              <div class="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <span class="material-symbols-outlined text-[15px]">lock</span>
                <span>Giao dịch an toàn 100% mã hóa 256-bit</span>
              </div>
            </div>
          </div>

        </div>
      }
    </div>
  `
})
export class CartComponent {
  cartService = inject(CartService);
  authService = inject(AuthService);
  private router = inject(Router);

  voucherInput: string = 'TRIAN30K';

  updateQuantity(index: number, qty: number): void {
    this.cartService.updateQuantity(index, qty).subscribe();
  }

  removeItem(index: number): void {
    this.cartService.removeItem(index).subscribe();
  }

  clearCart(): void {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng?')) {
      this.cartService.clearCart().subscribe();
    }
  }

  applyVoucher(): void {
    if (!this.voucherInput.trim()) return;
    this.cartService.applyVoucher(this.voucherInput.trim()).subscribe({
      next: () => alert('Áp dụng mã ưu đãi thành công!'),
      error: (err) => alert(err.error?.message || 'Mã ưu đãi không hợp lệ')
    });
  }

  setPaymentMode(mode: 'DEPOSIT_50' | 'FULL_PAYMENT'): void {
    this.cartService.setPaymentMode(mode).subscribe();
  }

  proceedToCheckout(): void {
    this.router.navigate(['/checkout']);
  }
}
