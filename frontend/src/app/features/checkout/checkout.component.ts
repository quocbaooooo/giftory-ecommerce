import { Component, OnInit, inject, signal } from '@angular/core';
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

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- LEFT COLUMN: SHIPPING INFO & PAYMENT METHOD -->
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
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#7C3AED] focus:outline-none text-sm text-slate-800"
                    placeholder="Nguyễn Minh Anh"
                  >
                </div>
                <div>
                  <label class="font-bold text-slate-700 block mb-1">Số điện thoại liên hệ *</label>
                  <input 
                    [(ngModel)]="customerPhone"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#7C3AED] focus:outline-none text-sm text-slate-800"
                    placeholder="0912 345 678"
                  >
                </div>
              </div>

              <div>
                <label class="font-bold text-slate-700 block mb-1">Địa chỉ email (nhận hóa đơn & mã đơn tracking)</label>
                <input 
                  [(ngModel)]="customerEmail"
                  type="email"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#7C3AED] focus:outline-none text-sm text-slate-800"
                  placeholder="minhanh@gmail.com"
                >
              </div>

              <div>
                <label class="font-bold text-slate-700 block mb-1">Địa chỉ giao quà chi tiết *</label>
                <input 
                  [(ngModel)]="customerAddress"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#7C3AED] focus:outline-none text-sm text-slate-800"
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                >
              </div>

              <div>
                <label class="font-bold text-slate-700 block mb-1">Ghi chú gửi xưởng chế tác / Shipper</label>
                <textarea 
                  [(ngModel)]="customerNote"
                  rows="2"
                  class="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-[#7C3AED] focus:outline-none text-sm text-slate-800"
                  placeholder="Ví dụ: Gọi trước khi giao 15 phút, quà tặng sinh nhật nên giao đúng ngày..."
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Section 2: Payment Method Selector -->
          <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-shop-card border border-[#DDD6FE]">
            <div class="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <span class="w-7 h-7 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center font-bold text-xs">2</span>
              <h2 class="text-base sm:text-lg font-bold text-[#1E1B4B]">Phương Thức Thanh Toán Cọc / Đơn Hàng</h2>
            </div>

            <div class="space-y-3">
              <!-- VietQR -->
              <label 
                (click)="selectedPaymentMethod.set('VIETQR')"
                class="flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all"
                [ngClass]="selectedPaymentMethod() === 'VIETQR' ? 'border-[#7C3AED] bg-purple-50/70 shadow-sm' : 'border-slate-200 hover:border-purple-200 bg-white'"
              >
                <input type="radio" name="payMethod" [checked]="selectedPaymentMethod() === 'VIETQR'" class="mt-1 accent-[#7C3AED]">
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-sm text-[#1E1B4B]">VietQR Pro (Quét mã mọi ngân hàng)</span>
                    <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Xác nhận tức thì</span>
                  </div>
                  <p class="text-xs text-slate-500 mt-0.5">Quét mã QR qua app ngân hàng (MB, VCB, Techcombank, VPBank, ACB...), tự động nhận cọc 50%.</p>
                </div>
              </label>

              <!-- MoMo -->
              <label 
                (click)="selectedPaymentMethod.set('MOMO')"
                class="flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all"
                [ngClass]="selectedPaymentMethod() === 'MOMO' ? 'border-[#7C3AED] bg-purple-50/70 shadow-sm' : 'border-slate-200 hover:border-purple-200 bg-white'"
              >
                <input type="radio" name="payMethod" [checked]="selectedPaymentMethod() === 'MOMO'" class="mt-1 accent-[#7C3AED]">
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-sm text-[#1E1B4B]">Ví MoMo</span>
                    <span class="text-xs text-pink-600 font-bold">MoMo E-Wallet</span>
                  </div>
                  <p class="text-xs text-slate-500 mt-0.5">Thanh toán nhanh chóng qua ứng dụng Ví điện tử MoMo.</p>
                </div>
              </label>

              <!-- VNPAY -->
              <label 
                (click)="selectedPaymentMethod.set('VNPAY')"
                class="flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all"
                [ngClass]="selectedPaymentMethod() === 'VNPAY' ? 'border-[#7C3AED] bg-purple-50/70 shadow-sm' : 'border-slate-200 hover:border-purple-200 bg-white'"
              >
                <input type="radio" name="payMethod" [checked]="selectedPaymentMethod() === 'VNPAY'" class="mt-1 accent-[#7C3AED]">
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-sm text-[#1E1B4B]">VNPAY-QR / Thẻ ATM & Quốc tế</span>
                    <span class="text-xs text-blue-600 font-bold">VNPAY Cổng thanh toán</span>
                  </div>
                  <p class="text-xs text-slate-500 mt-0.5">Hỗ trợ thẻ nội địa NAPAS, thẻ Visa, Mastercard, JCB.</p>
                </div>
              </label>

              <!-- COD -->
              @if (cartService.pricing().totalCustomItems === 0) {
                <label 
                  (click)="selectedPaymentMethod.set('COD')"
                  class="flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all"
                  [ngClass]="selectedPaymentMethod() === 'COD' ? 'border-[#7C3AED] bg-purple-50/70 shadow-sm' : 'border-slate-200 hover:border-purple-200 bg-white'"
                >
                  <input type="radio" name="payMethod" [checked]="selectedPaymentMethod() === 'COD'" class="mt-1 accent-[#7C3AED]">
                  <div class="flex-1">
                    <span class="font-bold text-sm text-[#1E1B4B]">COD - Thanh toán 100% khi nhận hàng</span>
                    <p class="text-xs text-slate-500 mt-0.5">Áp dụng cho đơn hàng chỉ có sản phẩm tiêu chuẩn không yêu cầu khắc riêng.</p>
                  </div>
                </label>
              }
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: ORDER SUMMARY & SUBMIT -->
        <div class="lg:col-span-5 flex flex-col gap-6">
          <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-shop-card border border-[#DDD6FE] flex flex-col gap-5">
            <h3 class="font-bold text-lg text-[#1E1B4B] border-b border-slate-100 pb-3">Đơn Hàng ({{ cartService.itemsCount() }} món)</h3>

            <!-- Item Mini List -->
            <div class="space-y-3 max-h-60 overflow-y-auto pr-1">
              @for (item of cartService.items(); track $index) {
                <div class="flex items-center gap-3 text-xs">
                  <img [src]="item.customDetails?.previewImage || (item.productId?.images && item.productId.images[0]) || 'https://placehold.co/100'" class="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0">
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-slate-800 truncate">{{ item.productId?.name }}</div>
                    <div class="text-[11px] text-slate-400">SL: {{ item.quantity }} • {{ item.isCustom ? 'Custom cọc 50%' : 'Chuẩn' }}</div>
                  </div>
                  <span class="font-bold text-[#1E1B4B]">{{ (item.price * item.quantity) | number:'1.0-0' }}đ</span>
                </div>
              }
            </div>

            <!-- Price Breakdown -->
            <div class="flex flex-col gap-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
              <div class="flex items-center justify-between">
                <span>Tổng tiền hàng:</span>
                <span class="font-bold text-slate-800">{{ cartService.pricing().itemsTotal | number:'1.0-0' }}đ</span>
              </div>
              <div class="flex items-center justify-between">
                <span>Phí vận chuyển:</span>
                <span class="font-semibold text-slate-800">{{ cartService.pricing().shippingFee === 0 ? 'Miễn phí' : ((cartService.pricing().shippingFee | number:'1.0-0') + 'đ') }}</span>
              </div>
              @if (cartService.pricing().voucherDiscount > 0) {
                <div class="flex items-center justify-between text-[#7C3AED]">
                  <span>Voucher giảm giá:</span>
                  <span class="font-bold">-{{ cartService.pricing().voucherDiscount | number:'1.0-0' }}đ</span>
                </div>
              }
              <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-base font-bold text-[#1E1B4B]">
                <span>Tổng thanh toán:</span>
                <span>{{ cartService.pricing().totalAmount | number:'1.0-0' }}đ</span>
              </div>
            </div>

            <!-- Deposit Box -->
            <div class="p-4 rounded-2xl bg-[#F5EEFD] border border-[#DDD6FE] flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-[#7C3AED]">TIỀN CỌC CẦN THANH TOÁN:</span>
                <span class="text-xl font-extrabold text-[#7C3AED]">
                  {{ cartService.pricing().depositAmount | number:'1.0-0' }}đ
                </span>
              </div>
              @if (cartService.pricing().remainingCodAmount > 0) {
                <div class="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-purple-200/50">
                  <span>Còn lại thanh toán COD:</span>
                  <span class="font-bold text-[#1E1B4B]">{{ cartService.pricing().remainingCodAmount | number:'1.0-0' }}đ</span>
                </div>
              }
            </div>

            <!-- Submit Button -->
            <button 
              (click)="submitOrder()"
              [disabled]="isSubmitting()"
              class="w-full py-4 px-4 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-300 transition-all active:scale-95 cursor-pointer"
            >
              @if (isSubmitting()) {
                <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Đang xử lý tạo đơn...</span>
              } @else {
                <span class="material-symbols-outlined text-[20px]">check_circle</span>
                <span>Xác Nhận Đặt Hàng & Thanh Toán Cọc</span>
              }
            </button>

            <div class="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <span class="material-symbols-outlined text-[15px]">lock</span>
              <span>Bảo mật chuẩn PCI-DSS mã hóa 256-bit</span>
            </div>
          </div>
        </div>

      </div>
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
  selectedPaymentMethod = signal<'VIETQR' | 'MOMO' | 'VNPAY' | 'COD'>('VIETQR');
  isSubmitting = signal<boolean>(false);

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
    if (!this.customerName.trim() || !this.customerPhone.trim() || !this.customerAddress.trim()) {
      alert('Vui lòng điền đầy đủ Họ tên, Số điện thoại và Địa chỉ nhận hàng');
      return;
    }

    this.isSubmitting.set(true);

    const orderPayload = {
      customerInfo: {
        name: this.customerName.trim(),
        phone: this.customerPhone.trim(),
        email: this.customerEmail.trim(),
        address: this.customerAddress.trim(),
        note: this.customerNote.trim()
      },
      paymentMode: this.cartService.paymentMode(),
      paymentMethod: this.selectedPaymentMethod(),
      sessionId: this.cartService.getSessionId()
    };

    this.orderService.createOrder(orderPayload).subscribe({
      next: (order) => {
        this.isSubmitting.set(false);
        this.cartService.loadCart(); // Refresh cart to empty state
        this.router.navigate(['/orders', order.orderCode]);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err.error?.message || 'Có lỗi xảy ra khi tạo đơn hàng');
      }
    });
  }
}
