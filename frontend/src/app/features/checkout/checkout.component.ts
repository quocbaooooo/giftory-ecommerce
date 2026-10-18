import { CartVouchersComponent } from '../../shared/components/cart-vouchers.component';
import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { Subscription, timer, of, catchError, exhaustMap, switchMap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { RecipientService, Recipient, LocationOption } from '../../core/services/recipient.service';
import { GreetingCardTemplate } from '../../core/models';
import { GreetingCardPreviewComponent } from '../../shared/components/greeting-card-preview.component';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, GreetingCardPreviewComponent, CartVouchersComponent],
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
                @if (authService.isAuthenticated()) {
                  <div class="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-2">
                    <label for="saved-recipient" class="font-bold text-[#1E1B4B] block">Danh bạ người nhận</label>
                    <div class="flex gap-2 items-center">
                      <select id="saved-recipient" [ngModel]="selectedRecipientId" (ngModelChange)="selectRecipient($event)" [disabled]="!!pendingOrder() || recipientsLoading() || recipientSaving()" class="min-w-0 flex-1 px-3 py-2.5 rounded-xl border border-purple-200 bg-white text-sm text-slate-800 disabled:bg-slate-50">
                        <option value="">{{ recipientsLoading() ? 'Đang tải danh bạ…' : '+ Nhập người nhận mới' }}</option>
                        @for (recipient of recipients(); track recipient.id) {
                          <option [value]="recipient.id">{{ recipient.name }} · {{ recipient.phone }} · {{ recipient.address }}</option>
                        }
                      </select>
                      @if (selectedRecipientId) {
                        <button type="button" (click)="removeRecipient()" [disabled]="!!pendingOrder() || recipientSaving()" class="text-rose-600 font-semibold p-2 disabled:opacity-50" aria-label="Xóa người nhận đã chọn khỏi danh bạ">Xóa</button>
                      }
                    </div>
                    <p class="text-slate-500">Chọn người nhận đã lưu để tự điền tên, số điện thoại và địa chỉ.</p>
                    @if (recipientError()) {
                      <p role="alert" class="text-rose-700">{{ recipientError() }} <button type="button" (click)="loadRecipients()" [disabled]="recipientsLoading()" class="underline font-semibold">Tải lại danh bạ</button></p>
                    }
                  </div>
                }
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label for="recipient-name" class="font-bold text-slate-700 block mb-1">Họ và tên người nhận *</label>
                    <input 
                      id="recipient-name" maxlength="100" autocomplete="name"
                      [(ngModel)]="customerName"
                      [disabled]="!!pendingOrder() || recipientSaving()"
                      class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#7C3AED] focus:outline-none text-sm text-slate-800 disabled:bg-slate-50"
                      placeholder="Nguyễn Minh Anh"
                    >
                  </div>
                  <div>
                    <label for="recipient-phone" class="font-bold text-slate-700 block mb-1">Số điện thoại liên hệ *</label>
                    <input 
                      id="recipient-phone" type="tel" maxlength="20" autocomplete="tel"
                      [(ngModel)]="customerPhone"
                      [disabled]="!!pendingOrder() || recipientSaving()"
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

                <div class="space-y-3">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label for="recipient-province" class="font-bold text-slate-700 block mb-1">Tỉnh/Thành phố *</label>
                      <select id="recipient-province" [ngModel]="provinceCode" (ngModelChange)="changeProvince($event)" [disabled]="!!pendingOrder() || recipientSaving() || provincesLoading()" class="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:border-[#7C3AED] focus:outline-none text-sm text-slate-800 disabled:bg-slate-50">
                        <option value="">{{ provincesLoading() ? 'Đang tải tỉnh/thành…' : 'Chọn tỉnh/thành phố' }}</option>
                        @for (province of provinces(); track province.code) { <option [value]="province.code">{{ province.name }}</option> }
                      </select>
                    </div>
                    <div>
                      <label for="recipient-ward" class="font-bold text-slate-700 block mb-1">Phường/Xã *</label>
                      <select id="recipient-ward" [(ngModel)]="wardCode" [disabled]="!!pendingOrder() || recipientSaving() || !provinceCode || wardsLoading()" class="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:border-[#7C3AED] focus:outline-none text-sm text-slate-800 disabled:bg-slate-50">
                        <option value="">{{ wardsLoading() ? 'Đang tải phường/xã…' : 'Chọn phường/xã' }}</option>
                        @for (ward of wards(); track ward.code) { <option [value]="ward.code">{{ ward.name }}</option> }
                      </select>
                    </div>
                  </div>
                  @if (locationError()) {
                    <p role="alert" class="text-rose-700">{{ locationError() }} <button type="button" (click)="retryLocations()" class="underline font-semibold">Thử tải lại</button></p>
                  }
                  <div>
                    <label for="recipient-street" class="font-bold text-slate-700 block mb-1">Số nhà, tên đường *</label>
                    <input id="recipient-street" [(ngModel)]="street" [disabled]="!!pendingOrder() || recipientSaving()" maxlength="200" autocomplete="address-line1" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#7C3AED] focus:outline-none text-sm text-slate-800 disabled:bg-slate-50" placeholder="Ví dụ: 128 Đường Số 7, căn hộ A12">
                  </div>
                  @if (customerAddress) { <p class="text-slate-500"><strong>Địa chỉ giao quà:</strong> {{ customerAddress }}</p> }
                  @if (legacyAddress && !customerAddress) { <p class="text-slate-500">Địa chỉ hồ sơ: {{ legacyAddress }}. Vui lòng chọn tỉnh/thành và phường/xã để chuẩn hóa địa chỉ giao quà.</p> }
                  @if (authService.isAuthenticated()) {
                    <div class="flex flex-wrap items-center gap-3">
                      <button type="button" (click)="saveRecipient()" [disabled]="!!pendingOrder() || recipientSaving() || recipientsLoading() || !recipientValid()" class="px-4 py-2.5 rounded-xl border border-purple-200 text-[#7C3AED] bg-purple-50 hover:bg-purple-100 font-bold disabled:opacity-50 disabled:cursor-not-allowed">{{ recipientSaving() ? 'Đang lưu…' : 'Lưu người nhận vào danh bạ' }}</button>
                      @if (recipientNotice()) { <span role="status" class="text-emerald-700">{{ recipientNotice() }}</span> }
                    </div>
                  }
                  @if (recipientFormError()) { <p role="alert" class="text-rose-700">{{ recipientFormError() }}</p> }
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

            <section class="bg-white rounded-3xl p-6 sm:p-8 shadow-shop-card border border-[#DDD6FE] space-y-4" aria-labelledby="greeting-card-title">
              <label class="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" [ngModel]="includeGreetingCard()" (ngModelChange)="includeGreetingCard.set($event)" [disabled]="!!pendingOrder() || isSubmitting()" class="w-4 h-4 accent-[#7C3AED]">
                <span>
                  <span id="greeting-card-title" class="block text-base font-bold text-[#1E1B4B]">Thêm thiệp chúc mừng</span>
                  <span class="text-xs text-slate-500">Chọn phong cách, viết tiêu đề và lời chúc để xưởng in kèm trong gói quà.</span>
                </span>
              </label>
              @if (includeGreetingCard()) {
                @if (greetingCardTemplatesLoading()) {
                  <p role="status" class="text-xs text-slate-500">Đang tải mẫu thiệp…</p>
                }
                @if (greetingCardTemplatesError()) {
                  <p role="alert" class="text-xs text-rose-700">Không tải được mẫu thiệp. <button type="button" (click)="loadGreetingCardTemplates()" class="font-semibold underline">Thử lại</button></p>
                }
                <fieldset [disabled]="!!pendingOrder() || isSubmitting()" class="space-y-3">
                  <legend class="text-xs font-bold text-slate-700 mb-2">Chọn phong cách thiệp</legend>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    @for (template of greetingCardTemplates(); track template.id) {
                      <label class="flex items-center gap-2 px-3 py-3 rounded-xl border cursor-pointer text-sm font-semibold" [ngClass]="greetingCardTemplateId() === template.id ? 'border-purple-500 bg-purple-50 text-purple-800' : 'border-slate-200 text-slate-600'">
                        <input type="radio" name="greeting-card-template" [value]="template.id" [ngModel]="greetingCardTemplateId()" (ngModelChange)="greetingCardTemplateId.set($event)" class="accent-[#7C3AED]">
                        {{ template.name }}
                      </label>
                    }
                  </div>
                  <p class="text-xs text-slate-500">Phong cách chỉ thay đổi màu sắc và họa tiết, giữ nguyên tiêu đề và lời chúc của bạn.</p>
                  <div>
                    <label for="greeting-heading" class="block text-xs font-bold text-slate-700 mb-1">Tiêu đề thiệp *</label>
                    <input id="greeting-heading" [(ngModel)]="greetingCardHeading" maxlength="80" aria-describedby="greeting-heading-help" class="w-full px-3.5 py-3 rounded-xl border border-slate-300 focus:border-[#7C3AED] focus:outline-none text-sm" placeholder="Ví dụ: Gửi người bạn đặc biệt của mình">
                    <p id="greeting-heading-help" class="text-xs text-slate-500 mt-1">{{ greetingCardHeading.length }}/80 ký tự · Bạn có thể thay đổi dòng mở đầu trên thiệp.</p>
                  </div>
                  <div>
                    <label for="greeting-message" class="block text-xs font-bold text-slate-700 mb-1">Lời chúc trên thiệp *</label>
                    <textarea id="greeting-message" [(ngModel)]="greetingCardMessage" rows="4" maxlength="300" aria-describedby="greeting-message-help" class="w-full px-3.5 py-3 rounded-xl border border-slate-300 focus:border-[#7C3AED] focus:outline-none text-sm" placeholder="Viết điều bạn muốn gửi gắm đến người nhận…"></textarea>
                    <p id="greeting-message-help" class="text-xs text-slate-500 mt-1">{{ greetingCardMessage.length }}/300 ký tự · Tối đa 6 dòng. Nội dung được in đúng như bạn nhập.</p>
                    @if (greetingCardError()) { <p role="alert" class="text-xs text-rose-700 mt-2">{{ greetingCardError() }}</p> }
                  </div>
                </fieldset>
                @if (selectedGreetingCardTemplate(); as template) {
                  <p class="text-xs font-bold text-slate-500">Xem trước thiệp</p>
                  <app-greeting-card-preview [templateId]="template.id" [heading]="greetingCardHeading.trim()" [message]="greetingCardMessage.trim()" />
                }
              }
            </section>

            <!-- Section 2: Shipping Method Selector (AC 4, PF Step 5-6) -->
            <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-shop-card border border-[#DDD6FE]">
              <div class="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <span class="w-7 h-7 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center font-bold text-xs">2</span>
                <h2 class="text-base sm:text-lg font-bold text-[#1E1B4B]">Lựa Chọn Phương Thức Giao Hàng</h2>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <!-- Standard Shipping -->
                <label 
                  (click)="!pendingOrder() && changeShipping('STANDARD')"
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
                  (click)="!pendingOrder() && changeShipping('EXPRESS')"
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
                    <span>Chọn COD chỉ cần <strong>đặt cọc 50% tiền sản phẩm Custom</strong> qua mã QR. Tiền hàng tiêu chuẩn, phần Custom còn lại và phí vận chuyển thanh toán khi nhận hàng. Chọn QR để thanh toán trước 100% tổng đơn.</span>
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
                        {{ hasCustomItems() ? 'Cọc 50% tiền Custom' : 'COD Pending (0đ cọc)' }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-500 mt-1 leading-snug">
                      {{ hasCustomItems() ? 'Chỉ cọc 50% tiền sản phẩm Custom qua QR sau khi xác nhận. Toàn bộ phần còn lại của đơn hàng thanh toán khi nhận hàng.' : 'Đơn sản phẩm sẵn: Ghi nhận trạng thái COD Pending, thanh toán 100% cho bưu tá khi nhận hàng.' }}
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
                <div>
                  <h3 class="font-bold text-lg text-[#1E1B4B]">Tóm Tắt Đơn Hàng ({{ displayItems().length }} món)</h3>
                  @if (isBuyNowMode()) {
                    <span class="inline-flex items-center gap-1 text-[11px] font-bold text-[#7C3AED] mt-0.5">
                      <span class="material-symbols-outlined text-[14px]">bolt</span>
                      Mua ngay độc lập • Không gộp giỏ hàng
                    </span>
                  }
                </div>
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

              @if (!pendingOrder() && !isBuyNowMode()) { <app-cart-vouchers /> }
              @if (shippingSyncPending()) { <p role="status" class="text-xs text-purple-700">Đang cập nhật giao hàng…</p> }
              <!-- Dynamic Calculated Pricing Breakdown -->
              <div class="flex flex-col gap-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                <div class="flex items-center justify-between">
                  <span>Tổng tiền hàng:</span>
                  <span class="font-bold text-slate-800">{{ displayPricing().itemsTotal | number:'1.0-0' }}đ</span>
                </div>

                <div class="flex items-center justify-between">
                  <span>Phí vận chuyển ({{ selectedShippingMethod() === 'EXPRESS' ? 'Hỏa Tốc' : 'Tiêu Chuẩn' }}):</span>
                  <span class="font-semibold text-slate-800">{{ (displayPricing().baseShippingFee ?? displayPricing().shippingFee) === 0 ? 'Miễn phí' : (((displayPricing().baseShippingFee ?? displayPricing().shippingFee) | number:'1.0-0') + 'đ') }}</span>
                </div>

                @if ((displayPricing().shippingDiscount || 0) > 0) {
                  <div class="flex items-center justify-between text-purple-700"><span>Ưu đãi vận chuyển:</span><strong>-{{ displayPricing().shippingDiscount | number:'1.0-0' }}đ</strong></div>
                }
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

              @if (orderError()) { <p role="alert" class="text-sm text-rose-700">{{ orderError() }}</p> }
              <!-- Deposit / Payment Box -->
              <div class="p-4 rounded-2xl bg-[#F5EEFD] border border-[#DDD6FE] flex flex-col gap-1.5">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-[#7C3AED]">
                    {{ displayPricing().depositAmount === 0 ? 'THANH TOÁN TRƯỚC:' : (displayPricing().depositAmount < displayPricing().totalAmount ? 'TIỀN CỌC (50% TIỀN CUSTOM):' : 'THANH TOÁN TRỰC TUYẾN (100%):') }}
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
                  [disabled]="isSubmitting() || shippingSyncPending() || cartService.quantitySyncPending() || cartService.voucherSyncPending()"
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
              @if (demoPayment) {
                <p class="text-xs font-semibold text-amber-800 bg-amber-50 rounded-xl p-3">Thanh toán mô phỏng cho đồ án. Không chuyển tiền thật. Hệ thống tự xác nhận sau khoảng 4 giây.</p>
              }
            </div>

            <!-- Payment Failure Error Alert -->
            @if (paymentError()) {
              <div role="alert" class="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5 animate-fade-in">
                <span class="material-symbols-outlined text-rose-500 text-lg shrink-0 mt-0.5">error</span>
                <div class="flex-1">
                  <strong class="font-bold block">Thanh toán chưa thành công</strong>
                  <span>{{ paymentError() }}</span>
                </div>
              </div>
            }

            @if (qrImageFailed()) {
              <p role="alert" class="text-xs text-rose-700">Không tải được mã QR. Bạn có thể chuyển khoản theo thông tin bên dưới hoặc thử lại.</p>
            }
            <!-- QR Code Section -->
            <div class="bg-[#F5EEFD] rounded-2xl p-5 border border-[#DDD6FE] text-center space-y-4">
              <div class="bg-white p-3 rounded-2xl inline-block shadow-md">
                <img 
                  [hidden]="qrImageFailed()"
                  [src]="demoPayment ? 'https://api.qrserver.com/v1/create-qr-code/?size=208x208&data=GIFTORY-DEMO-' + pendingOrder().orderCode + '&v=' + qrVersion() : 'https://img.vietqr.io/image/MB-0988889999-compact2.png?amount=' + pendingOrder().pricing.depositAmount + '&addInfo=' + pendingOrder().orderCode + '&accountName=GIFTORY%20STUDIO&v=' + qrVersion()"
                  alt="VietQR Code"
                  class="w-52 h-52 object-contain mx-auto rounded-xl"
                  (error)="onQrImageError($event)"
                />
              </div>

              <div class="text-xs space-y-1">
                <p class="font-bold text-[#7C3AED] text-base">
                  {{ pendingOrder().pricing.depositAmount | number:'1.0-0' }}đ
                </p>
                @if (demoPayment) {
                  <p class="text-slate-500">Mã QR minh họa • Không phát sinh giao dịch thực</p>
                } @else {
                  <p class="text-slate-600 font-semibold">Ngân hàng: MB Bank • STK: 0988889999</p>
                  <p class="text-slate-500">Chủ tài khoản: <strong>GIFTORY STUDIO CO., LTD</strong></p>
                  <p class="text-slate-500 font-mono font-bold">Nội dung CK: {{ pendingOrder().orderCode }}</p>
                }
              </div>
            </div>

            <div class="space-y-3 text-center" role="status" aria-live="polite">
              @if (!paymentError()) {
              <div class="flex items-center justify-center gap-2 text-sm font-semibold text-[#7C3AED]">
                <span class="w-4 h-4 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" aria-hidden="true"></span>
                <span>Đang chờ hệ thống xác nhận thanh toán</span>
              </div>
              <p class="text-xs text-slate-500">{{ demoPayment ? 'Đang mô phỏng phản hồi từ cổng thanh toán…' : 'Quét mã QR bằng ứng dụng ngân hàng. Trang sẽ tự chuyển sang kết quả khi Giftory xác nhận đã nhận tiền.' }}</p>
              }
              @if (paymentError()) {
                <button type="button" (click)="retryPayment()" class="w-full py-3 px-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-sm rounded-xl">
                  Thử thanh toán lại
                </button>
                <p class="text-xs text-slate-500">{{ demoPayment ? 'Thử lại giao dịch mô phỏng trên cùng đơn hàng.' : 'Nếu đã chuyển tiền, vui lòng không chuyển thêm. Hệ thống vẫn tiếp tục kiểm tra giao dịch cho đơn hàng này.' }}</p>
              }
            </div>

          </div>
        </div>
      }

    </div>
  `
})
export class CheckoutComponent implements OnInit, OnDestroy {
  readonly demoPayment = !environment.production;
  cartService = inject(CartService);
  authService = inject(AuthService);
  private orderService = inject(OrderService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private recipientService = inject(RecipientService);
  private readonly pageSubscriptions = new Subscription();
  private wardsSubscription?: Subscription;
  includeGreetingCard = signal(false);
  greetingCardTemplateId = signal('BIRTHDAY');
  greetingCardHeading = 'Gửi bạn thật nhiều yêu thương';
  greetingCardMessage = '';
  greetingCardTemplates = signal<GreetingCardTemplate[]>([]);
  greetingCardTemplatesLoading = signal(false);
  greetingCardTemplatesError = signal(false);
  greetingCardError = signal<string | null>(null);
  selectedGreetingCardTemplate = computed(() => this.greetingCardTemplates().find(item => item.id === this.greetingCardTemplateId()));

  customerName: string = '';
  customerPhone: string = '';
  customerEmail: string = '';
  provinceCode = '';
  wardCode = '';
  street = '';
  legacyAddress = '';
  selectedRecipientId = '';
  recipients = signal<Recipient[]>([]);
  provinces = signal<LocationOption[]>([]);
  wards = signal<LocationOption[]>([]);
  recipientsLoading = signal(false);
  provincesLoading = signal(false);
  wardsLoading = signal(false);
  recipientSaving = signal(false);
  recipientError = signal<string | null>(null);
  recipientNotice = signal<string | null>(null);
  recipientFormError = signal<string | null>(null);
  locationError = signal<string | null>(null);

  get customerAddress(): string {
    const province = this.provinces().find(item => item.code === this.provinceCode);
    const ward = this.wards().find(item => item.code === this.wardCode);
    return province && ward && this.street.trim() ? `${this.street.trim().replace(/\s+/g, ' ')}, ${ward.name}, ${province.name}` : '';
  }
  customerNote: string = '';

  selectedShippingMethod = signal<'STANDARD' | 'EXPRESS'>(this.cartService.cart()?.shippingMethod || 'STANDARD');
  shippingSyncPending = signal(false);
  changeShipping(method: 'STANDARD' | 'EXPRESS') {
    if (this.shippingSyncPending() || this.pendingOrder()) return;
    this.selectedShippingMethod.set(method);
    if (this.isBuyNowMode()) return;
    this.shippingSyncPending.set(true);
    this.cartService.setShippingMethod(method).subscribe({
      next: () => this.shippingSyncPending.set(false),
      error: () => {
        this.shippingSyncPending.set(false);
        this.selectedShippingMethod.set(this.cartService.cart()?.shippingMethod || 'STANDARD');
        this.cartService.notify('Không đổi được giao hàng. Vui lòng thử lại.');
      }
    });
  }
  selectedPaymentMethod = signal<'VIETQR' | 'MOMO' | 'VNPAY' | 'COD'>(this.cartService.cart()?.paymentMode === 'FULL_PAYMENT' ? 'VIETQR' : 'COD');
  
  isSubmitting = signal<boolean>(false);
  orderError = signal('');
  showPaymentModal = signal<boolean>(false);
  pendingOrder = signal<any>(null);
  paymentError = signal<string | null>(null);
  private paymentPolling?: Subscription;
  private paymentWaitStarted = 0;
  qrImageFailed = signal(false);
  qrVersion = signal(0);

  isBuyNowQuery = signal<boolean>(false);

  // Check if current flow is independent "Buy Now" (not merging with existing cart)
  isBuyNowMode = computed(() => {
    return (this.isBuyNowQuery() || this.route.snapshot.queryParamMap.get('buyNow') === '1') && !!this.cartService.buyNowItem();
  });

  // Check if cart has items OR if a Buy Now item is present OR if an order is being paid
  hasItemsOrPendingOrder = computed(() => {
    if (this.pendingOrder()) return true;
    if (this.isBuyNowMode()) return !!this.cartService.buyNowItem();
    return this.cartService.itemsCount() > 0;
  });

  // Use the same item classification as order creation.
  hasCustomItems = computed(() => {
    if (this.pendingOrder()) {
      return this.pendingOrder().items.some((item: any) => item.isCustom);
    }
    if (this.isBuyNowMode()) {
      const item = this.cartService.buyNowItem();
      return !!(item?.isCustom || item?.productId?.isCustomizable || item?.customDetails);
    }
    return this.cartService.items().some(item => item.isCustom ?? !!item.productId?.isCustomizable);
  });

  // Calculate dynamic shipping fee
  calculatedShippingFee = computed(() => {
    if (this.pendingOrder()) {
      return this.pendingOrder().pricing.shippingFee;
    }
    const total = this.isBuyNowMode()
      ? ((this.cartService.buyNowItem()?.price || 0) * (this.cartService.buyNowItem()?.quantity || 1))
      : this.cartService.pricing().itemsTotal;
    const base = total === 0 ? 0 : this.selectedShippingMethod() === 'EXPRESS' ? 50000 : total >= 250000 ? 0 : 30000;
    const voucher = !this.isBuyNowMode() ? this.cartService.cart()?.appliedVoucher : null;
    const discount = voucher?.discountType === 'FREESHIP' && total >= voucher.minOrderValue
      ? Math.min(base, voucher.discountValue, voucher.maxDiscount || Infinity) : 0;
    return base - discount;
  });

  // Dynamic Display Items (Switches seamlessly to pendingOrder or BuyNow item)
  displayItems = computed(() => {
    if (this.pendingOrder()) {
      return this.pendingOrder().items;
    }
    if (this.isBuyNowMode()) {
      const bn = this.cartService.buyNowItem();
      return bn ? [bn] : [];
    }
    return this.cartService.items();
  });

  // Dynamic Display Pricing (Switches seamlessly to pendingOrder or BuyNow pricing)
  displayPricing = computed(() => {
    if (this.pendingOrder()) {
      return this.pendingOrder().pricing;
    }
    const total = this.calculatedTotalAmount();
    const deposit = this.calculatedDepositAmount();
    const itemsTotal = this.isBuyNowMode()
      ? ((this.cartService.buyNowItem()?.price || 0) * (this.cartService.buyNowItem()?.quantity || 1))
      : this.cartService.pricing().itemsTotal;
    const voucherDiscount = this.isBuyNowMode() ? 0 : this.cartService.pricing().voucherDiscount;
    return {
      itemsTotal,
      voucherDiscount,
      shippingFee: this.calculatedShippingFee(),
      baseShippingFee: this.isBuyNowMode() ? this.calculatedShippingFee() : (this.cartService.pricing().baseShippingFee ?? this.calculatedShippingFee()),
      shippingDiscount: this.isBuyNowMode() ? 0 : (this.cartService.pricing().shippingDiscount || 0),
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
    const itemsTotal = this.isBuyNowMode()
      ? ((this.cartService.buyNowItem()?.price || 0) * (this.cartService.buyNowItem()?.quantity || 1))
      : this.cartService.pricing().itemsTotal;
    const voucherDiscount = this.isBuyNowMode() ? 0 : this.cartService.pricing().voucherDiscount;
    const shipping = this.calculatedShippingFee();
    return Math.max(0, itemsTotal - voucherDiscount + shipping);
  });

  // Calculate required deposit amount based on BP-03 rules
  calculatedDepositAmount = computed(() => {
    if (this.pendingOrder()) {
      return this.pendingOrder().pricing.depositAmount;
    }
    const total = this.calculatedTotalAmount();
    if (this.selectedPaymentMethod() !== 'COD') return total;
    const items = this.displayItems();
    const customDeposit = items.reduce((sum: number, item: any) => {
      const isCustom = this.isBuyNowMode()
        ? this.hasCustomItems()
        : (item.isCustom ?? !!item.productId?.isCustomizable);
      return sum + (isCustom ? Math.round((item.price ?? item.unitPrice ?? 0) * item.quantity * 0.5) : 0);
    }, 0);
    return Math.min(total, customDeposit);
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.isBuyNowQuery.set(params['buyNow'] === '1');
    });

    const user = this.authService.currentUser();
    if (user) {
      this.customerName = user.name || '';
      this.customerPhone = user.phone || '';
      this.customerEmail = user.email || '';
      if (user.address?.street) {
        this.street = user.address.street;
        this.legacyAddress = [user.address.street, user.address.ward, user.address.district, user.address.city].filter(Boolean).join(', ');
      }
    }
    this.loadProvinces();
    this.loadGreetingCardTemplates();
    if (this.authService.isAuthenticated()) this.loadRecipients();
  }

  loadRecipients(): void {
    if (!this.authService.isAuthenticated()) return;
    this.recipientsLoading.set(true);
    this.recipientError.set(null);
    this.pageSubscriptions.add(this.recipientService.list().subscribe({
      next: list => { this.recipients.set(list); this.recipientsLoading.set(false); },
      error: () => { this.recipientsLoading.set(false); this.recipientError.set('Không tải được danh bạ. Bạn vẫn có thể nhập người nhận mới.'); },
    }));
  }

  loadGreetingCardTemplates(): void {
    if (this.greetingCardTemplatesLoading()) return;
    this.greetingCardTemplatesLoading.set(true);
    this.greetingCardTemplatesError.set(false);
    this.pageSubscriptions.add(this.orderService.getGreetingCardTemplates().subscribe({
      next: templates => { this.greetingCardTemplates.set(templates); this.greetingCardTemplatesLoading.set(false); },
      error: () => { this.greetingCardTemplatesError.set(true); this.greetingCardTemplatesLoading.set(false); },
    }));
  }

  private loadProvinces(): void {
    this.provincesLoading.set(true);
    this.locationError.set(null);
    this.pageSubscriptions.add(this.recipientService.provinces().subscribe({
      next: list => { this.provinces.set(list); this.provincesLoading.set(false); },
      error: () => { this.provincesLoading.set(false); this.locationError.set('Không tải được tỉnh/thành phố. Vui lòng thử lại.'); },
    }));
  }

  changeProvince(code: string, selectedWard = ''): void {
    this.wardsSubscription?.unsubscribe();
    this.provinceCode = code;
    this.wardCode = '';
    this.wards.set([]);
    this.wardsLoading.set(false);
    this.locationError.set(null);
    this.recipientNotice.set(null);
    if (!code) return;
    this.wardsLoading.set(true);
    this.wardsSubscription = this.recipientService.wards(code).subscribe({
      next: list => {
        this.wards.set(list);
        this.wardCode = list.some(item => item.code === selectedWard) ? selectedWard : '';
        this.wardsLoading.set(false);
      },
      error: () => { this.wardsLoading.set(false); this.locationError.set('Không tải được phường/xã. Vui lòng thử lại.'); },
    });
  }

  retryLocations(): void {
    if (!this.provinces().length) this.loadProvinces();
    if (this.provinceCode) this.changeProvince(this.provinceCode, this.recipients().find(item => item.id === this.selectedRecipientId)?.wardCode);
  }

  selectRecipient(id: string): void {
    this.selectedRecipientId = id;
    this.recipientNotice.set(null);
    this.recipientFormError.set(null);
    const recipient = this.recipients().find(item => item.id === id);
    this.customerName = recipient?.name || '';
    this.customerPhone = recipient?.phone || '';
    this.street = recipient?.street || '';
    this.legacyAddress = '';
    this.changeProvince(recipient?.provinceCode || '', recipient?.wardCode || '');
  }

  recipientValid(): boolean {
    const phone = this.customerPhone.replace(/[\s().-]/g, '').replace(/^\+?84/, '0');
    return this.customerName.trim().length >= 2 && this.customerName.trim().length <= 100 && /^0\d{9}$/.test(phone)
      && this.street.trim().length >= 3 && this.street.trim().length <= 200 && !!this.customerAddress && !this.wardsLoading();
  }

  saveRecipient(): void {
    if (!this.authService.isAuthenticated() || !this.recipientValid() || this.recipientSaving() || this.recipientsLoading() || this.pendingOrder()) return;
    this.recipientSaving.set(true);
    this.recipientNotice.set(null);
    this.recipientFormError.set(null);
    const input = {
      name: this.customerName.trim().replace(/\s+/g, ' '),
      phone: this.customerPhone.replace(/[\s().-]/g, '').replace(/^\+?84/, '0'),
      provinceCode: this.provinceCode, wardCode: this.wardCode, street: this.street.trim().replace(/\s+/g, ' '),
    };
    this.pageSubscriptions.add(this.recipientService.save(input).subscribe({
      next: list => {
        this.recipients.set(list);
        this.selectedRecipientId = list.find(item => item.phone === input.phone && item.name.toLocaleLowerCase('vi') === input.name.toLocaleLowerCase('vi') && item.provinceCode === input.provinceCode && item.wardCode === input.wardCode && item.street.toLocaleLowerCase('vi') === input.street.toLocaleLowerCase('vi'))?.id || '';
        this.recipientSaving.set(false);
        this.recipientNotice.set('Đã lưu người nhận. Lần sau bạn chỉ cần chọn từ danh bạ.');
      },
      error: err => { this.recipientSaving.set(false); this.recipientFormError.set(typeof err.error?.message === 'string' ? err.error.message : 'Không lưu được người nhận. Vui lòng thử lại.'); },
    }));
  }

  removeRecipient(): void {
    if (!this.authService.isAuthenticated() || !this.selectedRecipientId || this.pendingOrder() || this.recipientSaving()) return;
    this.recipientSaving.set(true);
    this.recipientFormError.set(null);
    this.pageSubscriptions.add(this.recipientService.remove(this.selectedRecipientId).subscribe({
      next: list => { this.recipients.set(list); this.selectedRecipientId = ''; this.recipientSaving.set(false); this.recipientNotice.set('Đã xóa khỏi danh bạ. Thông tin đang nhập vẫn được giữ để đặt hàng.'); },
      error: () => { this.recipientSaving.set(false); this.recipientFormError.set('Không xóa được người nhận. Vui lòng thử lại.'); },
    }));
  }

  submitOrder(): void {
    if (this.isSubmitting() || this.pendingOrder() || this.shippingSyncPending() || this.cartService.quantitySyncPending() || this.cartService.voucherSyncPending()) return;
    this.greetingCardError.set(null);
    if (this.includeGreetingCard()) {
      const heading = this.greetingCardHeading.trim();
      if (!heading || heading.length > 80) {
        this.greetingCardError.set('Vui lòng nhập tiêu đề thiệp từ 1 đến 80 ký tự.');
        return;
      }
      const message = this.greetingCardMessage.trim().replace(/\r\n?/g, '\n');
      if (!this.selectedGreetingCardTemplate() || !message || message.length > 300 || message.split('\n').length > 6) {
        this.greetingCardError.set('Vui lòng chọn mẫu thiệp và nhập lời chúc từ 1 đến 300 ký tự, tối đa 6 dòng.');
        return;
      }
    }
    if (this.isBuyNowMode()) {
      if (!this.cartService.buyNowItem()) {
        alert('Thông tin đơn hàng Mua Ngay không hợp lệ hoặc đã hết hạn.');
        return;
      }
    } else {
      if (this.cartService.itemsCount() === 0) {
        alert('Giỏ hàng không hợp lệ hoặc đang trống!');
        return;
      }
    }

    if (!this.recipientValid()) {
      this.recipientFormError.set('Vui lòng nhập tên người nhận, số điện thoại hợp lệ gồm 10 số, chọn tỉnh/thành và phường/xã, rồi nhập số nhà, tên đường.');
      return;
    }
    this.recipientFormError.set(null);

    this.orderError.set('');
    this.isSubmitting.set(true);
    this.paymentError.set(null);

    const orderPayload: any = {
      ...(this.includeGreetingCard() ? { greetingCard: { templateId: this.greetingCardTemplateId(), heading: this.greetingCardHeading.trim().replace(/\s+/g, ' '), message: this.greetingCardMessage.trim() } } : {}),
      customerInfo: {
        name: this.customerName.trim(),
        phone: this.customerPhone.replace(/[\s().-]/g, '').replace(/^\+?84/, '0'),
        email: this.customerEmail.trim(),
        address: this.customerAddress.trim(),
        provinceCode: this.provinceCode,
        wardCode: this.wardCode,
        street: this.street.trim(),
        note: this.customerNote.trim()
      },
      paymentMode: this.calculatedDepositAmount() < this.calculatedTotalAmount() ? 'DEPOSIT_50' : 'FULL_PAYMENT',
      paymentMethod: this.selectedPaymentMethod(),
      shippingMethod: this.selectedShippingMethod(),
      sessionId: this.cartService.getSessionId()
    };

    if (this.isBuyNowMode()) {
      const bn = this.cartService.buyNowItem();
      orderPayload.buyNowItem = {
        productId: typeof bn.productId === 'object' ? bn.productId._id : bn.productId,
        variantName: bn.variantName,
        variantSku: bn.variantSku,
        quantity: bn.quantity,
        customDetails: bn.customDetails
      };
    }

    this.orderService.createOrder(orderPayload).subscribe({
      next: (order: any) => {
        this.isSubmitting.set(false);
        if (this.isBuyNowMode()) {
          this.cartService.clearBuyNowItem(); // Clear buy-now item, keep regular cart safe!
        } else {
          this.cartService.loadCart(); // Refresh cart to empty state
        }

        // Standard product + COD => No QR payment modal needed, go directly to completion page (AF3)
        if (order.pricing.depositAmount === 0) {
          this.router.navigate(['/orders', order.orderCode], { state: { lookupPhone: order.customerInfo?.phone } });
        } else {
          // Requires Online Payment / QR Deposit => Display VietQR Payment Modal (AF2, AF4)
          this.pendingOrder.set(order);
          this.showPaymentModal.set(true);
          this.startPaymentPolling();
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.orderError.set(err.error?.message || 'Có lỗi xảy ra khi khởi tạo đơn hàng');
        if (!this.isBuyNowMode()) this.cartService.loadCart();
      }
    });
  }

  ngOnDestroy(): void {
    this.paymentPolling?.unsubscribe();
    this.pageSubscriptions.unsubscribe();
    this.wardsSubscription?.unsubscribe();
  }

  retryPayment(): void {
    this.paymentError.set(null);
    this.qrImageFailed.set(false);
    this.qrVersion.update(value => value + 1);
    this.startPaymentPolling();
  }

  private startPaymentPolling(): void {
    this.paymentPolling?.unsubscribe();
    const order = this.pendingOrder();
    if (!order) return;
    if (this.demoPayment) {
      this.paymentPolling = timer(4000).pipe(
        switchMap(() => this.orderService.simulateDemoPayment(order.orderCode, order.customerInfo?.phone).pipe(timeout(10000)))
      ).subscribe({
        next: latest => {
          if (latest.paymentStatus === 'PAID_FULL' || latest.paymentStatus === 'PARTIALLY_PAID_DEPOSIT_50') {
            this.showPaymentModal.set(false);
            this.router.navigate(['/payment-result', latest.orderCode], { state: { lookupPhone: order.customerInfo?.phone } });
          } else {
            this.paymentError.set('Giao dịch mô phỏng chưa được xác nhận. Vui lòng thử lại.');
          }
        },
        error: () => this.paymentError.set('Không thể hoàn tất giao dịch mô phỏng. Vui lòng kiểm tra kết nối và thử lại.'),
      });
      return;
    }
    this.paymentWaitStarted = Date.now();
    this.paymentPolling = timer(0, 5000).pipe(
      exhaustMap(() => this.orderService.getOrderByCode(order.orderCode, order.customerInfo?.phone).pipe(
        timeout(10000),
        catchError(() => of(null))
      ))
    ).subscribe(latest => {
      if (latest) {
        this.pendingOrder.set(latest);
        const paid = latest.paymentStatus === 'PAID_FULL' ||
          (latest.paymentStatus === 'PARTIALLY_PAID_DEPOSIT_50' && latest.pricing && latest.pricing.depositAmount < latest.pricing.totalAmount);
        if (paid) {
          this.paymentPolling?.unsubscribe();
          this.showPaymentModal.set(false);
          this.router.navigate(['/payment-result', latest.orderCode], {
            state: { lookupPhone: order.customerInfo?.phone }
          });
          return;
        }
        if (['CANCELLED', 'RETURNED_BP06', 'DELIVERED'].includes(latest.orderStatus) || latest.paymentStatus === 'REFUNDED') {
          this.paymentPolling?.unsubscribe();
          this.showPaymentModal.set(false);
          this.router.navigate(['/orders', latest.orderCode], { state: { lookupPhone: order.customerInfo?.phone } });
          return;
        }
      }
      if (!latest) {
        this.paymentError.set('Chưa kết nối được với hệ thống xác nhận. Hệ thống sẽ tự kiểm tra lại; nếu đã chuyển tiền, vui lòng không thanh toán thêm.');
      } else if (Date.now() - this.paymentWaitStarted >= 5 * 60 * 1000) {
        this.paymentError.set('Chưa nhận được xác nhận thanh toán từ hệ thống. Nếu chưa chuyển tiền, bạn có thể thử lại bằng mã QR của đơn hàng này.');
      } else if (!this.qrImageFailed()) {
        this.paymentError.set(null);
      }
    });
  }

  onQrImageError(event: Event): void {
    // Never substitute a decorative QR that cannot initiate the bank transfer.
    (event.target as HTMLImageElement).hidden = true;
    this.qrImageFailed.set(true);
    this.paymentError.set('Không tải được mã QR thanh toán. Vui lòng thử lại hoặc sử dụng thông tin chuyển khoản bên dưới.');
  }
}
