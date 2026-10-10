import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-xs text-slate-500 mb-6">
        <a routerLink="/" class="hover:text-[#7C3AED]">Trang chủ</a>
        <span>/</span>
        <a routerLink="/cart" class="hover:text-[#7C3AED]">Giỏ hàng</a>
        <span>/</span>
        <span class="text-[#1E1B4B] font-semibold">Thanh toán & Xác nhận đơn</span>
      </div>

      <!-- AF1: Invalid / Empty Cart Alert (BR-01, AF1) - Only show if NO cart items AND NO pending order -->
      @if (!hasItemsOrPendingOrder()) {
        <div class="max-w-2xl mx-auto my-12 p-8 bg-white rounded-3xl border border-rose-200 shadow-xl text-center space-y-4 animate-fade-in">
          <div class="w-16 h-16 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
            <span class="material-symbols-outlined text-3xl">remove_shopping_cart</span>
          </div>
          <h2 class="text-xl font-bold text-slate-900">Giỏ Hàng Không Hợp Lệ Hoặc Đang Trống</h2>
          <p class="text-xs text-slate-500 max-w-md mx-auto">
            Vui lòng kiểm tra lại sản phẩm trong giỏ hàng trước khi tiếp tục quy trình đặt hàng.
          </p>
          <div class="pt-2 flex items-center justify-center gap-3">
            <a routerLink="/cart" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition">
              ← Cập Nhật Giỏ Hàng
            </a>
            <a routerLink="/products" class="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs rounded-xl shadow-md transition">
              Khám Phá Sản Phẩm →
            </a>
          </div>
        </div>
      } @else {
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <!-- LEFT COLUMN: SHIPPING INFO, SHIPPING METHOD & PAYMENT METHOD -->
          <div class="lg:col-span-7 flex flex-col gap-6">
            
            <!-- Section 1: Customer & Delivery Address -->
            <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-shop-card border border-[#DDD6FE]">
              <div class="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <span class="w-7 h-7 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center font-bold text-xs">1</span>
                <h2 class="text-base sm:text-lg font-bold text-[#1E1B4B]">Thông Tin Người Nhận Quà</h2>
              </div>

              <div class="space-y-4 text-xs">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="font-bold text-slate-700 block mb-1">Họ và tên người nhận *</label>
                    <input 
                      [(ngModel)]="customerName"
                      [disabled]="!!pendingOrder()"
                      class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#7C3AED] focus:outline-none text-sm text-slate-800 disabled:bg-slate-50"
                      placeholder="Nguyễn Minh Anh"
                    >
                  </div>
                  <div>
                    <label class="font-bold text-slate-700 block mb-1">Số điện thoại liên hệ *</label>
                    <input 
                      [(ngModel)]="customerPhone"
                      [disabled]="!!pendingOrder()"
                      class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#7C3AED] focus:outline-none text-sm text-slate-800 disabled:bg-slate-50"
                      placeholder="0912 345 678"
                    >
                  </div>
                </div>

                <div>
                  <label class="font-bold text-slate-700 block mb-1">Địa chỉ email (nhận hóa đơn & mã đơn tracking)</label>
                  <input 
                    [(ngModel)]="customerEmail"
                    [disabled]="!!pendingOrder()"
                    type="email"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#7C3AED] focus:outline-none text-sm text-slate-800 disabled:bg-slate-50"
                    placeholder="minhanh@gmail.com"
                  >
                </div>

                <div>
                  <label class="font-bold text-slate-700 block mb-1">Địa chỉ giao quà chi tiết *</label>
                  <input 
                    [(ngModel)]="customerAddress"
                    [disabled]="!!pendingOrder()"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#7C3AED] focus:outline-none text-sm text-slate-800 disabled:bg-slate-50"
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                  >
                </div>

                <div>
                  <label class="font-bold text-slate-700 block mb-1">Ghi chú gửi xưởng chế tác / Shipper</label>
                  <textarea 
                    [(ngModel)]="customerNote"
                    [disabled]="!!pendingOrder()"
                    rows="2"
                    class="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-[#7C3AED] focus:outline-none text-sm text-slate-800 disabled:bg-slate-50"
                    placeholder="Ví dụ: Gọi trước khi giao 15 phút, quà tặng sinh nhật nên giao đúng ngày..."
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- Section 2: Shipping Method Selector (AC 4, PF Step 5-6) -->
            <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-shop-card border border-[#DDD6FE]">
              <div class="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <span class="w-7 h-7 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center font-bold text-xs">2</span>
                <h2 class="text-base sm:text-lg font-bold text-[#1E1B4B]">Lựa Chọn Phương Thức Giao Hàng</h2>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <!-- Standard Shipping -->
                <label 
                  (click)="!pendingOrder() && selectedShippingMethod.set('STANDARD')"
                  class="flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all"
                  [ngClass]="selectedShippingMethod() === 'STANDARD' ? 'border-[#7C3AED] bg-purple-50/70 shadow-sm' : 'border-slate-200 hover:border-purple-200 bg-white'"
                >
                  <input type="radio" name="shippingMethod" [checked]="selectedShippingMethod() === 'STANDARD'" [disabled]="!!pendingOrder()" class="mt-1 accent-[#7C3AED]">
                  <div>
                    <div class="font-bold text-sm text-[#1E1B4B]">Giao Tiêu Chuẩn</div>
                    <p class="text-xs text-slate-500 mt-0.5">3 - 5 ngày làm việc</p>
                    <span class="text-xs font-bold text-[#7C3AED] mt-1 block">
                      {{ cartService.pricing().itemsTotal >= 250000 ? 'Miễn phí vận chuyển' : '30.000đ' }}
                    </span>
                  </div>
                </label>

                <!-- Express Shipping -->
                <label 
                  (click)="!pendingOrder() && selectedShippingMethod.set('EXPRESS')"
                  class="flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all"
                  [ngClass]="selectedShippingMethod() === 'EXPRESS' ? 'border-[#7C3AED] bg-purple-50/70 shadow-sm' : 'border-slate-200 hover:border-purple-200 bg-white'"
                >
                  <input type="radio" name="shippingMethod" [checked]="selectedShippingMethod() === 'EXPRESS'" [disabled]="!!pendingOrder()" class="mt-1 accent-[#7C3AED]">
                  <div>
                    <div class="flex items-center gap-1.5 font-bold text-sm text-[#1E1B4B]">
                      <span>Giao Hỏa Tốc</span>
                      <span class="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">2h - 48h</span>
                    </div>
                    <p class="text-xs text-slate-500 mt-0.5">Ưu tiên chế tác & bàn giao bưu tá ngay</p>
                    <span class="text-xs font-bold text-slate-800 mt-1 block">50.000đ</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- Section 3: Payment Method Selector (BR-02, BR-03, BR-04, BR-07) -->
            <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-shop-card border border-[#DDD6FE]">
              <div class="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <span class="w-7 h-7 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center font-bold text-xs">3</span>
                <h2 class="text-base sm:text-lg font-bold text-[#1E1B4B]">Phương Thức Thanh Toán</h2>
              </div>

              <!-- Structure Notice Banner -->
              @if (hasCustomItems()) {
                <div class="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-start gap-2.5">
                  <span class="material-symbols-outlined text-amber-600 text-lg shrink-0 mt-0.5">auto_awesome</span>
                  <div>
                    <strong class="font-bold block">Đơn hàng có sản phẩm Custom thiết kế riêng:</strong>
                    <span>Chọn COD sẽ cần <strong>đặt cọc trước 50%</strong> qua mã QR, 50% còn lại thanh toán COD khi nhận hàng. Chọn QR để thanh toán trước 100%.</span>
                  </div>
                </div>
              } @else {
                <div class="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start gap-2.5">
                  <span class="material-symbols-outlined text-emerald-600 text-lg shrink-0 mt-0.5">inventory_2</span>
                  <div>
                    <strong class="font-bold block">Đơn hàng chỉ gồm sản phẩm có sẵn:</strong>
                    <span>Chọn COD đơn hàng sẽ ở trạng thái <strong>"COD Pending"</strong> (không cần cọc trước). Chọn QR để thanh toán trước 100%.</span>
                  </div>
                </div>
              }

              <div class="space-y-4">
                <!-- Group 1: Online Payment 100% -->
                <div 
                  (click)="!pendingOrder() && (selectedPaymentMethod() === 'COD' ? selectedPaymentMethod.set('VIETQR') : null)"
                  class="p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col gap-3.5"
                  [ngClass]="selectedPaymentMethod() !== 'COD' ? 'border-[#7C3AED] bg-purple-50/50 shadow-sm' : 'border-slate-200 hover:border-purple-200 bg-white'"
                >
                  <div class="flex items-start gap-3">
                    <input type="radio" name="payGroup" [checked]="selectedPaymentMethod() !== 'COD'" [disabled]="!!pendingOrder()" class="mt-1 accent-[#7C3AED] shrink-0">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between gap-2">
                        <span class="font-bold text-sm text-[#1E1B4B]">Thanh Toán Trực Tuyến 100%</span>
                        <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">Xác nhận tự động</span>
                      </div>
                      <p class="text-xs text-slate-500 mt-1 leading-snug">
                        Thanh toán toàn bộ ngay để đơn hàng được ưu tiên xử lý & giao hàng nhanh nhất.
                      </p>
                    </div>
                  </div>

                  <!-- Sub-chips: Grid layout 3 equal columns, clean design -->
                  @if (selectedPaymentMethod() !== 'COD') {
                    <div class="pt-3 border-t border-purple-200/60">
                      <p class="text-[11px] font-bold text-slate-500 mb-2">Chọn kênh thanh toán:</p>
                      <div class="grid grid-cols-3 gap-2">
                        
                        <!-- VietQR Chip -->
                        <button 
                          type="button"
                          (click)="!pendingOrder() && selectedPaymentMethod.set('VIETQR'); $event.stopPropagation()"
                          class="py-2.5 px-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                          [ngClass]="selectedPaymentMethod() === 'VIETQR' ? 'bg-[#7C3AED] text-white border-[#7C3AED]' : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'"
                        >
                          <span class="material-symbols-outlined text-[16px]">qr_code_2</span>
                          <span class="truncate">VietQR</span>
                        </button>

                        <!-- MoMo Chip -->
                        <button 
                          type="button"
                          (click)="!pendingOrder() && selectedPaymentMethod.set('MOMO'); $event.stopPropagation()"
                          class="py-2.5 px-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                          [ngClass]="selectedPaymentMethod() === 'MOMO' ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-slate-700 border-slate-200 hover:border-pink-300'"
                        >
                          <span class="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                          <span class="truncate">Ví MoMo</span>
                        </button>

                        <!-- VNPAY Chip -->
                        <button 
                          type="button"
                          (click)="!pendingOrder() && selectedPaymentMethod.set('VNPAY'); $event.stopPropagation()"
                          class="py-2.5 px-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                          [ngClass]="selectedPaymentMethod() === 'VNPAY' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'"
                        >
                          <span class="material-symbols-outlined text-[16px]">credit_card</span>
                          <span class="truncate">VNPAY / ATM</span>
                        </button>

                      </div>
                    </div>
                  }
                </div>

                <!-- Group 2: COD -->
                <div 
                  (click)="!pendingOrder() && selectedPaymentMethod.set('COD')"
                  class="p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3"
                  [ngClass]="selectedPaymentMethod() === 'COD' ? 'border-[#7C3AED] bg-purple-50/50 shadow-sm' : 'border-slate-200 hover:border-purple-200 bg-white'"
                >
                  <input type="radio" name="payGroup" [checked]="selectedPaymentMethod() === 'COD'" [disabled]="!!pendingOrder()" class="mt-1 accent-[#7C3AED] shrink-0">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-bold text-sm text-[#1E1B4B]">COD - Thanh toán khi nhận hàng</span>
                      <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0" [ngClass]="hasCustomItems() ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'">
                        {{ hasCustomItems() ? 'Yêu cầu cọc 50%' : 'COD Pending (0đ cọc)' }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-500 mt-1 leading-snug">
                      {{ hasCustomItems() ? 'Đơn có sản phẩm Custom: Đặt cọc 50% qua QR sau khi bấm Xác nhận, 50% còn lại thanh toán khi nhận hàng.' : 'Đơn sản phẩm sẵn: Ghi nhận trạng thái COD Pending, thanh toán 100% cho bưu tá khi nhận hàng.' }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: ORDER SUMMARY & SUBMIT -->
          <div class="lg:col-span-5 flex flex-col gap-6">
            <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-shop-card border border-[#DDD6FE] flex flex-col gap-5 sticky top-6">
              <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 class="font-bold text-lg text-[#1E1B4B]">Tóm Tắt Đơn Hàng ({{ displayItems().length }} món)</h3>
                @if (pendingOrder()) {
                  <span class="px-2.5 py-0.5 rounded-full bg-purple-100 text-[#7C3AED] text-xs font-mono font-bold">
                    #{{ pendingOrder().orderCode }}
                  </span>
                }
              </div>

              <!-- Item Mini List (Uses displayItems computed signal to never flash empty) -->
              <div class="space-y-3 max-h-60 overflow-y-auto pr-1">
                @for (item of displayItems(); track $index) {
                  <div class="flex items-center gap-3 text-xs">
                    <img 
                      [src]="item.customDetails?.previewImage || (item.productId?.images && item.productId.images[0]) || item.productImage || 'https://placehold.co/100'" 
                      class="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                    >
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-slate-800 truncate">{{ item.productId?.name || item.productName }}</div>
                      <div class="text-[11px] text-slate-400">SL: {{ item.quantity }} • {{ item.isCustom ? 'Custom' : 'Có sẵn' }}</div>
                    </div>
                    <span class="font-bold text-[#1E1B4B]">{{ ((item.price || item.unitPrice) * item.quantity) | number:'1.0-0' }}đ</span>
                  </div>
                }
              </div>

              <!-- Dynamic Calculated Pricing Breakdown -->
              <div class="flex flex-col gap-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                <div class="flex items-center justify-between">
                  <span>Tổng tiền hàng:</span>
                  <span class="font-bold text-slate-800">{{ displayPricing().itemsTotal | number:'1.0-0' }}đ</span>
                </div>

                <div class="flex items-center justify-between">
                  <span>Phí vận chuyển ({{ selectedShippingMethod() === 'EXPRESS' ? 'Hỏa Tốc' : 'Tiêu Chuẩn' }}):</span>
                  <span class="font-semibold text-slate-800">{{ displayPricing().shippingFee === 0 ? 'Miễn phí' : ((displayPricing().shippingFee | number:'1.0-0') + 'đ') }}</span>
                </div>

                @if (displayPricing().voucherDiscount > 0) {
                  <div class="flex items-center justify-between text-[#7C3AED]">
                    <span>Voucher giảm giá:</span>
                    <span class="font-bold">-{{ displayPricing().voucherDiscount | number:'1.0-0' }}đ</span>
                  </div>
                }

                <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-base font-bold text-[#1E1B4B]">
                  <span>Tổng thanh toán đơn hàng:</span>
                  <span>{{ displayPricing().totalAmount | number:'1.0-0' }}đ</span>
                </div>
              </div>

              <!-- Deposit / Payment Box -->
              <div class="p-4 rounded-2xl bg-[#F5EEFD] border border-[#DDD6FE] flex flex-col gap-1.5">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-[#7C3AED]">
                    {{ displayPricing().depositAmount < displayPricing().totalAmount ? 'TIỀN CỌC CẦN THANH TOÁN (50%):' : 'THANH TOÁN TRỰC TUYẾN (100%):' }}
                  </span>
                  <span class="text-xl font-extrabold text-[#7C3AED]">
                    {{ displayPricing().depositAmount | number:'1.0-0' }}đ
                  </span>
                </div>

                @if (displayPricing().depositAmount === 0) {
                  <div class="text-xs text-emerald-700 font-bold pt-1 border-t border-purple-200/50 flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">check_circle</span>
                    <span>Không yêu cầu cọc trước. Thanh toán 100% COD khi nhận hàng.</span>
                  </div>
                } @else if (displayPricing().depositAmount < displayPricing().totalAmount) {
                  <div class="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-purple-200/50">
                    <span>Còn lại thanh toán COD khi nhận hàng:</span>
                    <span class="font-bold text-[#1E1B4B]">{{ (displayPricing().totalAmount - displayPricing().depositAmount) | number:'1.0-0' }}đ</span>
                  </div>
                }
              </div>

              <!-- Submit Button / Re-open Payment Modal Button -->
              @if (!pendingOrder()) {
                <button 
                  (click)="submitOrder()"
                  [disabled]="isSubmitting()"
                  class="w-full py-4 px-4 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-300 transition-all active:scale-95 cursor-pointer"
                >
                  @if (isSubmitting()) {
                    <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang khởi tạo đơn hàng...</span>
                  } @else {
                    <span class="material-symbols-outlined text-[20px]">shopping_bag</span>
                    <span>{{ calculatedDepositAmount() > 0 ? 'Xác Nhận Đặt Hàng & Thanh Toán QR' : 'Xác Nhận Đặt Hàng COD' }}</span>
                  }
                </button>
              } @else {
                <button 
                  (click)="showPaymentModal.set(true)"
                  class="w-full py-4 px-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-300 transition-all active:scale-95 cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[20px]">qr_code_2</span>
                  <span>Mở Lại Mã QR Thanh Toán VietQR</span>
                </button>
              }

              <div class="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <span class="material-symbols-outlined text-[15px]">lock</span>
                <span>Bảo mật chuẩn PCI-DSS mã hóa 256-bit</span>
              </div>
            </div>
          </div>

        </div>
      }

      <!-- PAYMENT GATEWAY VIETQR MODAL (BR-05, BR-06, AF2, AF4, EF1) -->
      @if (showPaymentModal() && pendingOrder()) {
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-purple-100 space-y-6 relative overflow-hidden">
            
            <!-- Top Header -->
            <div class="text-center space-y-2">
              <div class="w-12 h-12 rounded-2xl bg-purple-100 text-[#7C3AED] flex items-center justify-center mx-auto shadow-inner">
                <span class="material-symbols-outlined text-2xl">qr_code_2</span>
              </div>
              <h3 class="text-xl font-bold text-slate-900">Cổng Thanh Toán Trực Tuyến VietQR</h3>
              <p class="text-xs text-slate-500">
                Mã đơn hàng: <strong class="text-slate-800 font-mono">#{{ pendingOrder().orderCode }}</strong>
              </p>
            </div>

            <!-- Payment Failure Error Alert -->
            @if (paymentError()) {
              <div class="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5 animate-fade-in">
                <span class="material-symbols-outlined text-rose-500 text-lg shrink-0 mt-0.5">error</span>
                <div class="flex-1">
                  <strong class="font-bold block">Thanh toán chưa hoàn tất</strong>
                  <span>{{ paymentError() }}</span>
                </div>
              </div>
            }

            <!-- QR Code Section -->
            <div class="bg-[#F5EEFD] rounded-2xl p-5 border border-[#DDD6FE] text-center space-y-4">
              <div class="bg-white p-3 rounded-2xl inline-block shadow-md">
                <img 
                  [src]="'https://img.vietqr.io/image/MB-0988889999-compact2.png?amount=' + pendingOrder().pricing.depositAmount + '&addInfo=' + pendingOrder().orderCode + '&accountName=GIFTORY%20STUDIO'"
                  alt="VietQR Code"
                  class="w-52 h-52 object-contain mx-auto rounded-xl"
                  (error)="onQrImageError($event)"
                />
              </div>

              <div class="text-xs space-y-1">
                <p class="font-bold text-[#7C3AED] text-base">
                  {{ pendingOrder().pricing.depositAmount | number:'1.0-0' }}đ
                </p>
                <p class="text-slate-600 font-semibold">Ngân hàng: MB Bank • STK: 0988889999</p>
                <p class="text-slate-500">Chủ tài khoản: <strong>GIFTORY STUDIO CO., LTD</strong></p>
                <p class="text-slate-500 font-mono font-bold">Nội dung CK: {{ pendingOrder().orderCode }}</p>
              </div>
            </div>

            <!-- Simulated Payment Gateway Action Buttons -->
            <div class="space-y-3">
              <button 
                (click)="simulatePayment(true)"
                [disabled]="isProcessingPayment()"
                class="w-full py-3.5 px-4 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-lg shadow-purple-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                @if (isProcessingPayment()) {
                  <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang xử lý kết quả từ Payment Gateway...</span>
                } @else {
                  <span class="material-symbols-outlined text-lg">verified</span>
                  <span>Xác Nhận Đã Thanh Toán (Thành Công)</span>
                }
              </button>

              <button 
                (click)="simulatePayment(false)"
                [disabled]="isProcessingPayment()"
                class="w-full py-2.5 px-4 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span class="material-symbols-outlined text-base">cancel</span>
                <span>Mô Phỏng Thanh Toán Thất Bại (Thử Lại)</span>
              </button>
            </div>

            <div class="text-center">
              <button 
                (click)="cancelPaymentModal()" 
                class="text-xs text-slate-400 hover:text-slate-600 font-semibold hover:underline"
              >
                Thanh toán sau trong Lộ Trình Đơn Hàng →
              </button>
            </div>

          </div>
        </div>
      }

    </div>
  `
})
export class CheckoutComponent implements OnInit {
  cartService = inject(CartService);
  authService = inject(AuthService);
  private orderService = inject(OrderService);
  private router = inject(Router);

  customerName: string = '';
  customerPhone: string = '';
  customerEmail: string = '';
  customerAddress: string = '';
  customerNote: string = '';

  selectedShippingMethod = signal<'STANDARD' | 'EXPRESS'>('STANDARD');
  selectedPaymentMethod = signal<'VIETQR' | 'MOMO' | 'VNPAY' | 'COD'>('VIETQR');
  
  isSubmitting = signal<boolean>(false);
  showPaymentModal = signal<boolean>(false);
  pendingOrder = signal<any>(null);
  paymentError = signal<string | null>(null);
  isProcessingPayment = signal<boolean>(false);

  // Check if cart has items OR if an order is being paid
  hasItemsOrPendingOrder = computed(() => {
    return this.cartService.itemsCount() > 0 || !!this.pendingOrder();
  });

  // Check if cart or pending order contains any customized item
  hasCustomItems = computed(() => {
    if (this.pendingOrder()) {
      return this.pendingOrder().items.some((item: any) => item.isCustom);
    }
    return this.cartService.items().some(item => item.isCustom || item.productId?.isCustomizable);
  });

  // Calculate dynamic shipping fee
  calculatedShippingFee = computed(() => {
    if (this.pendingOrder()) {
      return this.pendingOrder().pricing.shippingFee;
    }
    if (this.selectedShippingMethod() === 'EXPRESS') {
      return 50000;
    }
    return this.cartService.pricing().itemsTotal >= 250000 ? 0 : 30000;
  });

  // Dynamic Display Items (Switches seamlessly to pendingOrder items so products never vanish)
  displayItems = computed(() => {
    if (this.pendingOrder()) {
      return this.pendingOrder().items;
    }
    return this.cartService.items();
  });

  // Dynamic Display Pricing (Switches seamlessly to pendingOrder pricing)
  displayPricing = computed(() => {
    if (this.pendingOrder()) {
      return this.pendingOrder().pricing;
    }
    const total = this.calculatedTotalAmount();
    const deposit = this.calculatedDepositAmount();
    return {
      itemsTotal: this.cartService.pricing().itemsTotal,
      voucherDiscount: this.cartService.pricing().voucherDiscount,
      shippingFee: this.calculatedShippingFee(),
      totalAmount: total,
      depositAmount: deposit,
      remainingCodAmount: Math.max(0, total - deposit)
    };
  });

  // Calculate total order amount dynamically
  calculatedTotalAmount = computed(() => {
    if (this.pendingOrder()) {
      return this.pendingOrder().pricing.totalAmount;
    }
    const itemsTotal = this.cartService.pricing().itemsTotal;
    const voucherDiscount = this.cartService.pricing().voucherDiscount;
    const shipping = this.calculatedShippingFee();
    return Math.max(0, itemsTotal - voucherDiscount + shipping);
  });

  // Calculate required deposit amount based on BP-03 rules
  calculatedDepositAmount = computed(() => {
    if (this.pendingOrder()) {
      return this.pendingOrder().pricing.depositAmount;
    }
    const total = this.calculatedTotalAmount();
    if (this.hasCustomItems()) {
      if (this.selectedPaymentMethod() === 'COD') {
        return Math.round(total * 0.5); // 50% deposit for Custom COD
      }
      return total; // 100% for QR/Online Custom
    } else {
      if (this.selectedPaymentMethod() === 'COD') {
        return 0; // 0 deposit for Standard COD (COD Pending)
      }
      return total; // 100% for QR/Online Standard
    }
  });

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.customerName = user.name || '';
      this.customerPhone = user.phone || '';
      this.customerEmail = user.email || '';
      if (user.address?.street) {
        this.customerAddress = `${user.address.street}, ${user.address.ward || ''}, ${user.address.district || ''}, ${user.address.city || ''}`;
      }
    }
  }

  submitOrder(): void {
    if (this.cartService.itemsCount() === 0) {
      alert('Giỏ hàng không hợp lệ hoặc đang trống!');
      return;
    }

    if (!this.customerName.trim() || !this.customerPhone.trim() || !this.customerAddress.trim()) {
      alert('Vui lòng điền đầy đủ Họ tên, Số điện thoại và Địa chỉ nhận hàng');
      return;
    }

    this.isSubmitting.set(true);
    this.paymentError.set(null);

    const orderPayload = {
      customerInfo: {
        name: this.customerName.trim(),
        phone: this.customerPhone.trim(),
        email: this.customerEmail.trim(),
        address: this.customerAddress.trim(),
        note: this.customerNote.trim()
      },
      paymentMode: this.calculatedDepositAmount() < this.calculatedTotalAmount() ? 'DEPOSIT_50' : 'FULL_PAYMENT',
      paymentMethod: this.selectedPaymentMethod(),
      shippingMethod: this.selectedShippingMethod(),
      sessionId: this.cartService.getSessionId()
    };

    this.orderService.createOrder(orderPayload).subscribe({
      next: (order: any) => {
        this.isSubmitting.set(false);
        this.cartService.loadCart(); // Refresh cart to empty state

        // Standard product + COD => No QR payment modal needed, go directly to completion page (AF3)
        if (!this.hasCustomItems() && this.selectedPaymentMethod() === 'COD') {
          this.router.navigate(['/orders', order.orderCode]);
        } else {
          // Requires Online Payment / QR Deposit => Display VietQR Payment Modal (AF2, AF4)
          this.pendingOrder.set(order);
          this.showPaymentModal.set(true);
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err.error?.message || 'Có lỗi xảy ra khi khởi tạo đơn hàng');
      }
    });
  }

  simulatePayment(success: boolean): void {
    if (!this.pendingOrder()) return;
    this.isProcessingPayment.set(true);
    this.paymentError.set(null);

    const orderCode = this.pendingOrder().orderCode;
    const paymentType = this.calculatedDepositAmount() < this.calculatedTotalAmount() ? 'DEPOSIT_50' : 'FULL_100';

    this.orderService.processPayment(orderCode, { success, paymentType }).subscribe({
      next: () => {
        this.isProcessingPayment.set(false);
        this.showPaymentModal.set(false);
        this.router.navigate(['/orders', orderCode]);
      },
      error: (err) => {
        this.isProcessingPayment.set(false);
        // EF1: Payment Failure Exception Flow
        this.paymentError.set(err.error?.message || 'Giao dịch thanh toán trực tuyến không thành công. Vui lòng thực hiện lại giao dịch.');
      }
    });
  }

  cancelPaymentModal(): void {
    if (this.pendingOrder()) {
      this.showPaymentModal.set(false);
      this.router.navigate(['/orders', this.pendingOrder().orderCode]);
    }
  }

  onQrImageError(event: any): void {
    // Fallback QR placeholder if external API fails
    event.target.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GIFTORY-' + (this.pendingOrder()?.orderCode || 'PAY');
  }
}
