import { combineLatest, EMPTY, Subscription, timer } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, switchMap } from 'rxjs/operators';
import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { Order } from '../../core/models';
import { GreetingCardPreviewComponent } from '../../shared/components/greeting-card-preview.component';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, GreetingCardPreviewComponent],
  template: `
    <div class="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      @if (isListView()) {
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div><h1 class="text-3xl font-display font-black text-slate-900">Đơn hàng của tôi</h1><p class="text-sm text-slate-500 mt-2">Xem tất cả đơn hàng và chọn đơn bạn muốn theo dõi.</p></div>
          <a routerLink="/care" class="text-sm font-semibold text-[#800020] hover:underline">Thông báo & hỗ trợ</a>
        </div>
        @if (!loading() && !error()) {
          <p class="text-sm text-slate-500">{{ orders().length }} đơn hàng · Mới nhất trước</p>
          <div class="bg-white border border-[#EBD3AE] rounded-3xl overflow-hidden">
            @for (order of orders(); track order._id) {
              <a [routerLink]="['/orders', order.orderCode]" [attr.aria-label]="'Xem chi tiết đơn ' + order.orderCode" class="grid grid-cols-[56px_minmax(0,1fr)] sm:grid-cols-[64px_minmax(0,1fr)_auto] gap-4 items-center p-4 sm:p-6 border-b border-slate-100 last:border-b-0 hover:bg-[#FFF5E1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#800020] focus-visible:outline-offset-[-3px] transition-colors">
                <img [src]="order.items[0]?.productImage || '/logo.png'" [alt]="order.items[0]?.productName || 'Quà tặng Giftory'" (error)="onThumbnailError($event)" loading="lazy" class="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-2xl bg-[#FFF5E1] border border-slate-100">
                <div class="min-w-0">
                  <div class="flex flex-wrap gap-x-3 gap-y-1 items-center"><strong class="font-mono text-sm text-slate-900">#{{ order.orderCode }}</strong><span class="text-xs text-slate-500">{{ order.createdAt | date:'dd/MM/yyyy · HH:mm':'+0700' }}</span></div>
                  <p class="truncate text-sm text-slate-600 mt-1.5">{{ order.items[0]?.productName || 'Quà tặng' }}@if (order.items.length > 1) { <span class="text-slate-400"> +{{ order.items.length - 1 }} sản phẩm khác</span> }</p>
                  <span [ngClass]="getOrderHeaderBadge(order).class" class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold mt-2"><span class="material-symbols-outlined text-sm" aria-hidden="true">{{ getOrderHeaderBadge(order).icon }}</span>{{ getOrderHeaderBadge(order).label }}</span>
                </div>
                <div class="col-start-2 sm:col-start-auto flex items-center justify-between sm:justify-end gap-3"><span class="font-bold text-slate-900">{{ (order.pricing?.totalAmount ?? order.totalAmount) | number }} đ</span><span class="material-symbols-outlined text-slate-400" aria-hidden="true">chevron_right</span></div>
              </a>
            } @empty {
              <div class="text-center px-6 py-14"><span class="material-symbols-outlined text-5xl text-[#800020]/40" aria-hidden="true">shopping_bag</span><h2 class="text-lg font-bold mt-4 text-[#800020]">Bạn chưa có đơn hàng nào</h2><p class="text-sm text-slate-500 mt-2">Những món quà bạn đặt sẽ xuất hiện tại đây.</p><a routerLink="/products" class="inline-block mt-6 px-5 py-3 rounded-xl bg-[#800020] hover:bg-[#660019] text-[#FFF5E1] text-sm font-semibold">Khám phá quà tặng</a></div>
            }
          </div>
        }
      } @else {
        @if (routeCode()) {
          <a routerLink="/orders" class="inline-flex items-center text-sm font-semibold text-[#800020] hover:underline">{{ authService.isAuthenticated() ? '← Về danh sách' : '← Tra cứu đơn khác' }}</a>
        }
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div><h1 class="text-3xl lg:text-4xl font-display font-black text-slate-900">{{ activeOrder() ? 'Chi tiết đơn hàng' : 'Tra cứu tiến trình đơn hàng' }}</h1><p class="text-sm text-slate-500 mt-2">{{ activeOrder() ? 'Theo dõi quá trình chuẩn bị quà và giao hàng của bạn.' : 'Nhập mã đơn và số điện thoại đã dùng khi đặt hàng.' }}</p></div>
          @if (activeOrder()) {
            <div class="flex flex-wrap items-center gap-3"><strong class="text-sm font-mono">#{{ currentOrderCode() }}</strong><span [ngClass]="getOrderHeaderBadge().class" class="px-3 py-1.5 rounded-full text-xs font-semibold">{{ getOrderHeaderBadge().label }}</span></div>
          }
        </div>
      }
      @if (loading()) { <div role="status" class="bg-white border border-[#EBD3AE] rounded-3xl p-10 text-center text-slate-500">{{ isListView() ? 'Đang tải danh sách đơn hàng…' : 'Đang tra cứu đơn hàng…' }}</div> }
      @if (error()) { <div role="alert" class="bg-rose-50 border border-rose-100 rounded-2xl p-5 text-sm text-rose-700">{{ error() }} @if (authService.isAuthenticated()) { <button type="button" (click)="loadPage()" class="ml-3 underline font-semibold">Thử lại</button> }</div> }
      @if (!authService.isAuthenticated() && !activeOrder()) {
      <!-- Search Card Pill Box -->
      <div class="bg-white rounded-3xl p-5 lg:p-6 border border-[#EBD3AE] shadow-sm space-y-3">
        <div class="flex flex-col md:flex-row items-center gap-3">
          <!-- Sub-label -->
          <div class="hidden xl:block shrink-0 pr-2 border-r border-slate-100 text-left">
            <span class="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">GIFTORY TRACKING</span>
            <span class="text-xs font-bold text-slate-800">Tra cứu tiến trình</span>
          </div>

          <!-- Input Code -->
          <div class="relative flex-1 w-full">
            <span class="absolute left-3.5 top-2.5 text-slate-400 font-mono font-bold text-sm">#</span>
            <input
              type="text"
              [(ngModel)]="searchCode"
              (keyup.enter)="lookupOrder()"
              aria-label="Mã đơn hàng"
              placeholder="VD: GF-104001, GF-894212..."
              class="w-full pl-8 pr-4 py-2.5 bg-[#FFF5E1]/50 rounded-2xl border border-transparent focus:border-[#800020] focus:bg-white text-sm font-mono font-bold text-slate-800 focus:outline-none transition"
            />
          </div>

          <!-- Input Phone -->
          <div class="relative flex-1 w-full">
            <span class="material-symbols-outlined absolute left-3.5 top-2.5 text-slate-400 text-base">call</span>
            <input
              type="text"
              [(ngModel)]="searchPhone"
              (keyup.enter)="lookupOrder()"
              aria-label="Số điện thoại đặt hàng"
              inputmode="tel"
              autocomplete="tel"
              placeholder="0987 654 321"
              class="w-full pl-9 pr-4 py-2.5 bg-[#FFF5E1]/50 rounded-2xl border border-transparent focus:border-[#800020] focus:bg-white text-sm font-mono font-semibold text-slate-800 focus:outline-none transition"
            />
          </div>

          <!-- Button Search -->
          <button
            (click)="lookupOrder()"
            [disabled]="loading()"
            class="w-full md:w-auto px-6 py-2.5 bg-[#800020] hover:bg-[#660019] text-[#FFF5E1] text-xs font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <span class="material-symbols-outlined text-base">search</span>
            Tra Cứu Lộ Trình
          </button>
        </div>

        <div class="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 gap-2">
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-xs text-emerald-500">verified_user</span>
            <span>Sử dụng đúng số điện thoại bạn đã cung cấp khi đặt hàng.</span>
          </div>
          <button (click)="resetSearch()" class="text-[#800020] font-semibold hover:underline cursor-pointer">
            Nhập mã đơn khác →
          </button>
        </div>
      </div>

      }
      @if (activeOrder()) {
      <a routerLink="/care" class="inline-block text-sm font-semibold text-[#800020] hover:underline">Thông báo, đánh giá & hỗ trợ đơn hàng</a>
      @if (activeOrder()?.gift?.enabled) {
        <section class="space-y-3 rounded-3xl border border-[#E6D2DA] bg-[#FCF7F9] p-6 text-sm text-[#552337]">
          <h2 class="font-bold">Món quà gửi tới {{ activeOrder()?.customerInfo?.name }}</h2>
          <p class="text-xs">{{ activeOrder()?.gift?.anonymous ? 'Gửi ẩn danh dưới tên Giftory.' : 'Hiển thị tên người gửi trên thiệp và phiếu giao.' }} Người nhận không thấy giá và không phải thanh toán COD.</p>
          @if (activeOrder()?.paymentStatus === 'PARTIALLY_PAID_DEPOSIT_50') { <p class="text-xs font-bold text-rose-700">Bạn cần thanh toán đủ trước khi bàn giao quà.</p><button type="button" [disabled]="giftBusy()" (click)="settleGift()" class="rounded-xl bg-[#800020] px-4 py-3 text-xs font-bold text-white">Thanh toán phần còn lại (mô phỏng)</button> }
          @if (activeOrder()?.gift?.exception; as issue) {
            <div class="rounded-xl border border-amber-200 bg-white p-4"><strong>Hỗ trợ giao quà</strong><p class="mt-2 text-xs">{{ issue.reason }}</p>
              @if (issue.status === 'AWAITING_BUYER' || issue.status === 'AWAITING_RECIPIENT') { <label class="mt-3 block text-xs">Chọn thời gian giao lại<input type="datetime-local" [(ngModel)]="giftDeliveryWindow" class="mt-1 block w-full rounded-xl border p-3" /></label><button [disabled]="giftBusy() || !giftDeliveryWindow" (click)="scheduleGiftDelivery()" class="mt-3 rounded-xl bg-[#800020] px-4 py-3 text-xs font-bold text-white">Xác nhận giao lại</button> }
              @else { <p class="mt-2 text-xs">Đã xác nhận giao lại: {{ issue.requestedWindow | date:'dd/MM/yyyy HH:mm':'+0700' }}</p> }
            </div>
          }
          @if (activeOrder()?.gift?.proofOfDelivery; as proof) { <div><p class="text-xs font-semibold">Ảnh bằng chứng giao quà</p><img [src]="proof" alt="Bằng chứng đã giao quà" class="mt-2 max-h-64 rounded-xl object-contain" /></div> }
          <details><summary class="cursor-pointer text-xs font-semibold">Thông báo dành cho người đặt (mô phỏng)</summary>@for (n of buyerGiftNotices(); track n.id) { <p class="mt-2 rounded-xl bg-white p-3 text-xs">{{ n.text }}</p> }</details>
          @if (giftError()) { <p role="alert" class="text-xs text-rose-700">{{ giftError() }}</p> }
        </section>
      }
      @if (activeOrder()?.orderStatus !== 'CANCELLED') {
      <!-- MAIN STEPPER CARD: Tiến Độ BP-04 Live -->
      <div class="bg-white rounded-3xl p-6 lg:p-8 border border-[#EBD3AE] shadow-sm space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
              <span class="material-symbols-outlined text-[#800020] text-lg">precision_manufacturing</span>
              Tiến Độ Thực Thi & Giao Vận
            </h2>
            <p class="text-xs text-slate-400 mt-0.5">Minh bạch từng công đoạn chuẩn bị quà, đóng gói và giao hàng</p>
          </div>

          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF5E1] text-[#800020] border border-[#EBD3AE] text-xs font-semibold">
            <span class="material-symbols-outlined text-sm">schedule</span>
            Hãng vận chuyển: <strong class="font-bold">{{ getOrderCarrier() }}</strong>
          </div>
        </div>

        <!-- 5 Steps Stepper -->
        <div class="py-4">
          <div class="relative">
            <!-- Background connecting line -->
            <div class="absolute top-6 left-10 right-10 h-1 bg-slate-100 rounded-full z-0 hidden md:block">
              <div class="h-full bg-gradient-to-r from-emerald-500 via-[#800020] to-[#800020] rounded-full transition-all duration-700" [style.width]="getStepperProgressPercent() + '%'"></div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-5 gap-6 relative z-10">
              
              <!-- BƯỚC 1: Tiếp nhận & Chờ xác nhận (US-04.01) -->
              <div class="flex md:flex-col items-center md:text-center gap-4 md:gap-2.5" [ngClass]="getStepClass(1)">
                <div class="w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-md shrink-0 transition" [ngClass]="getStepIconClass(1)">
                  <span class="material-symbols-outlined text-xl">{{ getStepIcon(1) }}</span>
                </div>
                <div>
                  <span class="text-[10px] font-extrabold tracking-wider uppercase block" [ngClass]="getStepSubClass(1)">BƯỚC 1</span>
                  <span class="text-xs font-bold text-slate-800 block">Xác Nhận Đơn Hàng</span>
                  <span class="text-[11px] text-slate-500 block">{{ getStepDesc(1) }}</span>
                </div>
              </div>

              <!-- BƯỚC 2: Chuẩn bị & Gia công xưởng (US-04.02, US-04.03) -->
              <div class="flex md:flex-col items-center md:text-center gap-4 md:gap-2.5" [ngClass]="getStepClass(2)">
                <div class="w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-md shrink-0 transition" [ngClass]="getStepIconClass(2)">
                  <span class="material-symbols-outlined text-xl">{{ getStepIcon(2) }}</span>
                </div>
                <div>
                  <span class="text-[10px] font-extrabold tracking-wider uppercase block" [ngClass]="getStepSubClass(2)">BƯỚC 2</span>
                  <span class="text-xs font-bold text-slate-800 block">Chuẩn Bị & Chế Tác</span>
                  <span class="text-[11px] text-slate-500 block">{{ getStepDesc(2) }}</span>
                </div>
              </div>

              <!-- BƯỚC 3: Đóng gói hộp quà (US-04.04, BR-09) -->
              <div class="flex md:flex-col items-center md:text-center gap-4 md:gap-2.5" [ngClass]="getStepClass(3)">
                <div class="w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-md shrink-0 transition" [ngClass]="getStepIconClass(3)">
                  <span class="material-symbols-outlined text-xl">{{ getStepIcon(3) }}</span>
                </div>
                <div>
                  <span class="text-[10px] font-extrabold tracking-wider uppercase block" [ngClass]="getStepSubClass(3)">BƯỚC 3</span>
                  <span class="text-xs font-bold text-slate-800 block">Đóng Gói Hộp Quà</span>
                  <span class="text-[11px] text-slate-500 block">{{ getStepDesc(3) }}</span>
                </div>
              </div>

              <!-- BƯỚC 4: Bàn giao Shipper & In transit (US-04.04, BR-10) -->
              <div class="flex md:flex-col items-center md:text-center gap-4 md:gap-2.5" [ngClass]="getStepClass(4)">
                <div class="w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-md shrink-0 transition" [ngClass]="getStepIconClass(4)">
                  <span class="material-symbols-outlined text-xl">{{ getStepIcon(4) }}</span>
                </div>
                <div>
                  <span class="text-[10px] font-extrabold tracking-wider uppercase block" [ngClass]="getStepSubClass(4)">BƯỚC 4</span>
                  <span class="text-xs font-bold text-slate-800 block">In Transit (Vận chuyển)</span>
                  <span class="text-[11px] text-slate-500 block font-mono">{{ getStepDesc(4) }}</span>
                </div>
              </div>

              <!-- BƯỚC 5: Giao hàng & Kết thúc (US-04.05, US-04.07) -->
              <div class="flex md:flex-col items-center md:text-center gap-4 md:gap-2.5" [ngClass]="getStepClass(5)">
                <div class="w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-md shrink-0 transition" [ngClass]="getStepIconClass(5)">
                  <span class="material-symbols-outlined text-xl">{{ getStepIcon(5) }}</span>
                </div>
                <div>
                  <span class="text-[10px] font-extrabold tracking-wider uppercase block" [ngClass]="getStepSubClass(5)">BƯỚC 5</span>
                  <span class="text-xs font-bold text-slate-800 block">{{ getStepTitle(5) }}</span>
                  <span class="text-[11px] text-slate-500 block">{{ getStepDesc(5) }}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      }
      <!-- TWO COLUMNS BOTTOM SECTION -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Card Left: Chi Tiết Sản Phẩm Trong Đơn -->
        <div class="bg-white rounded-3xl p-6 border border-[#EBD3AE] shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span class="material-symbols-outlined text-[#800020] text-base">brush</span>
              Sản Phẩm Trong Đơn Hàng (#{{ currentOrderCode() }})
            </h3>

            <a routerLink="/custom-studio" class="px-3 py-1 rounded-xl bg-[#FFF5E1] text-[#800020] border border-[#EBD3AE] text-xs font-bold hover:bg-[#FDF0D5] transition flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">palette</span>
              Custom Studio
            </a>
          </div>

          @if (activeOrder()?.greetingCard; as card) {
            <div class="mb-4 space-y-3">
              <h4 class="text-sm font-bold text-[#2B1A1A]">Thiệp chúc mừng · {{ card.templateName }}</h4>
              <p class="text-xs text-slate-500">Xưởng in thiệp và đặt kèm trong gói quà.</p>
              <app-greeting-card-preview [templateId]="card.templateId" [heading]="card.heading" [message]="card.message" [senderName]="card.senderName || ''" [recipientName]="card.recipientName || ''" />
            </div>
          }
          <!-- Product items list -->
          <div class="space-y-3">
            <div *ngFor="let item of getOrderItems()" class="flex items-start gap-4 p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
              <div class="relative w-20 h-20 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0">
                <img [src]="item.productImage || item.image || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400'" [alt]="item.productName || item.name" class="w-full h-full object-cover">
                <span *ngIf="item.isCustom" class="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-[#800020] text-[#FFF5E1] text-[8px] font-bold uppercase">
                  Custom
                </span>
                <span *ngIf="!item.isCustom" class="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-[#800020] text-[#FFF5E1] text-[8px] font-bold uppercase">
                  Có sẵn
                </span>
              </div>

              <div class="space-y-1 flex-1 text-xs">
                <h4 class="font-bold text-slate-900">{{ item.productName || item.name }} (x{{ item.quantity }})</h4>
                <p class="text-[11px] text-slate-500">Phân loại: <strong class="text-slate-700">{{ item.variantName || 'Tiêu chuẩn' }}</strong></p>
                <p *ngIf="item.giftBoxStyle && item.giftBoxStyle !== 'NONE'" class="text-[11px] font-semibold text-[#800020]">Hộp quà: {{ giftBoxName(item.giftBoxStyle) }} · {{ item.giftBoxFee | number:'1.0-0' }}đ × {{ item.quantity }}</p>
                
                <div *ngIf="item.isCustom && item.customDetails" class="p-2 rounded-xl bg-[#FFF5E1] border border-[#EBD3AE] text-[11px] text-[#800020]">
                  <span class="font-bold">Khắc:</span> "{{ item.customDetails.frontMessage || item.customDetails.customText || 'Theo mẫu' }}"
                  <span *ngIf="item.customDetails.fontFamily" class="block text-[10px] text-slate-500 font-mono">Font: {{ item.customDetails.fontFamily }}</span>
                </div>

                <div class="flex items-center justify-between pt-1 text-[11px]">
                  <span class="text-slate-400 font-mono">{{ (item.unitPrice || item.price) | number }} đ / món</span>
                  <span class="font-bold text-emerald-600">
                    Trạng thái: {{ getItemStatusText(item) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Card Right: Thông Tin Giao Vận & Lịch Sử Timeline -->
        <div class="bg-white rounded-3xl p-6 border border-[#EBD3AE] shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span class="material-symbols-outlined text-[#800020] text-base">near_me</span>
              Hành Trình Giao Vận & Lịch Sử
            </h3>
            <span class="font-mono text-xs font-bold text-slate-500">#{{ getOrderTrackingCode() }}</span>
          </div>

          <!-- Timeline log -->
          <div class="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            <div *ngFor="let t of getOrderTimeline()" class="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs flex items-start gap-2.5">
              <span class="material-symbols-outlined text-sm mt-0.5 text-emerald-500">
                check_circle
              </span>
              <div class="flex-1">
                <span class="font-bold text-slate-800 block">{{ t.title }}</span>
                <span class="text-slate-500 text-[11px] block mt-0.5">{{ t.description }}</span>
              </div>
              <span class="text-[10px] text-slate-400 font-mono shrink-0">{{ t.timestamp | date:'HH:mm dd/MM':'+0700' }}</span>
            </div>

            <div *ngIf="!getOrderTimeline().length" class="text-xs text-slate-400 text-center py-6">
              Đang đồng bộ lộ trình đơn hàng từ trạm điều phối...
            </div>
          </div>
        </div>
      </div>
      }
    </div>
  `
})
export class OrdersComponent implements OnInit, OnDestroy {
  private orderService = inject(OrderService);
  authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  giftBoxName(style?: string): string { return ({ NONE: 'Không lấy hộp', STANDARD: 'Hộp tiêu chuẩn', SILK: 'Hộp lụa cao cấp', LUXURY: 'Hộp quà sang trọng' } as Record<string, string>)[style || ''] || 'Hộp quà'; }
  private routeSubscription?: Subscription;
  private request?: Subscription;
  private refreshSubscription?: Subscription;
  routeCode = signal('');
  isListView = computed(() => this.authService.isAuthenticated() && !this.routeCode());
  orders = signal<Order[]>([]);
  loading = signal(false);
  error = signal('');
  currentOrderCode = signal('');
  searchCode = '';
  searchPhone = '';
  activeOrder = signal<Order | null>(null);

  giftBusy = signal(false); giftError = signal(''); giftDeliveryWindow = '';
  buyerGiftNotices() { return this.activeOrder()?.gift?.notifications?.filter(n => n.audience === 'BUYER') || []; }
  scheduleGiftDelivery() {
    const order = this.activeOrder(); const value = new Date(this.giftDeliveryWindow);
    if (!order || this.giftBusy() || !Number.isFinite(value.getTime())) return;
    this.giftBusy.set(true); this.giftError.set('');
    this.orderService.scheduleGift(order.orderCode, this.searchPhone.trim() || undefined, value.toISOString()).subscribe({ next: () => { this.giftBusy.set(false); this.lookupOrder(); }, error: err => { this.giftBusy.set(false); this.giftError.set(err.error?.message || 'Chưa hẹn lại được.'); } });
  }
  settleGift() {
    const order = this.activeOrder(); if (!order || this.giftBusy()) return;
    this.giftBusy.set(true); this.giftError.set('');
    this.orderService.settleGiftDemo(order.orderCode, this.searchPhone.trim() || undefined).subscribe({ next: updated => { this.giftBusy.set(false); this.activeOrder.set(updated); }, error: err => { this.giftBusy.set(false); this.giftError.set(err.error?.message || 'Chưa thanh toán được.'); } });
  }

  ngOnInit() {
    this.refreshSubscription = timer(15000, 15000).pipe(
      filter(() => !!this.activeOrder() && !this.loading()),
      switchMap(() => this.orderService.getOrderByCode(this.activeOrder()!.orderCode, this.searchPhone.trim() || undefined).pipe(catchError(() => EMPTY))),
    ).subscribe(order => {
      if (order.orderCode === this.activeOrder()?.orderCode) this.activeOrder.set(order);
    });
    this.routeSubscription = combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
      map(([params, query]) => params.get('code') || query.get('code') || ''),
      distinctUntilChanged(),
    ).subscribe(code => {
      this.routeCode.set(code);
      this.searchCode = code;
      this.searchPhone = typeof history.state?.lookupPhone === 'string' ? history.state.lookupPhone : '';
      this.loadPage();
    });
  }
  ngOnDestroy() { this.routeSubscription?.unsubscribe(); this.request?.unsubscribe(); this.refreshSubscription?.unsubscribe(); }
  loadPage() {
    this.request?.unsubscribe();
    this.activeOrder.set(null); this.error.set(''); this.loading.set(false);
    if (this.isListView()) {
      this.loading.set(true);
      this.request = this.orderService.getMyOrders().subscribe({
        next: orders => { this.orders.set(orders); this.loading.set(false); },
        error: () => { this.error.set('Không thể tải danh sách đơn hàng. Vui lòng thử lại.'); this.loading.set(false); },
      });
    } else if (this.routeCode() && (this.authService.isAuthenticated() || this.searchPhone)) {
      this.lookupOrder();
    }
  }
  lookupOrder() {
    if (this.loading()) return;
    const code = this.searchCode.trim().replace(/^#/, '').toUpperCase();
    const phone = this.searchPhone.trim();
    this.error.set(''); this.activeOrder.set(null);
    if (!code || (!this.authService.isAuthenticated() && !phone)) {
      this.error.set('Vui lòng nhập đầy đủ mã đơn hàng và số điện thoại đặt hàng.'); return;
    }
    this.request?.unsubscribe(); this.loading.set(true);
    this.request = this.orderService.getOrderByCode(code, phone || undefined).subscribe({
      next: order => {
        this.loading.set(false);
        if (this.routeCode() !== code) {
          void this.router.navigate(['/orders', code], { state: { lookupPhone: phone } });
        } else {
          this.currentOrderCode.set(order.orderCode); this.activeOrder.set(order);
        }
      },
      error: err => { this.loading.set(false); this.error.set(err.status === 404 ? 'Không tìm thấy đơn hàng phù hợp. Vui lòng kiểm tra mã đơn và số điện thoại.' : 'Không thể tải đơn hàng. Vui lòng thử lại.'); },
    });
  }
  resetSearch() { this.request?.unsubscribe(); this.loading.set(false); this.error.set(''); this.activeOrder.set(null); this.searchCode = ''; this.searchPhone = ''; }
  onThumbnailError(event: Event) { const image = event.target as HTMLImageElement; if (!image.src.endsWith('/logo.png')) image.src = '/logo.png'; }
  getOrderItems(): any[] { return this.activeOrder()?.items || []; }
  getOrderTimeline(): any[] {
    return (this.activeOrder()?.timeline || [])
      .filter(event => event.completed === true)
      .map(event => ({ ...event,
        title: event.title.replace(/\s*\([^)]*(?:US-\d|BR-\d)[^)]*\)/g, '').replace(/BP-04/g, ''),
        description: event.description.replace(/quy trình BP-04/g, 'quy trình giao hàng').replace(/BP-04/g, ''),
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  getOrderCarrier(): string { const ord = this.activeOrder(); return ord?.deliveryInfo?.carrier || ord?.shippingCarrier || 'Chưa cập nhật'; }
  getOrderTrackingCode(): string { const ord = this.activeOrder(); return this.getStepStageNumber() >= 4 ? (ord?.deliveryInfo?.trackingCode || ord?.trackingCode || 'Chưa có mã vận đơn') : 'Chưa có mã vận đơn'; }

  // Stepper calculations based on BP-04 state
  getStepStageNumber(): number {
    const ord = this.activeOrder();
    if (!ord || ['AWAITING_CONFIRMATION', 'PENDING', 'CANCELLED'].includes(ord.orderStatus)) return 1;

    if (ord.orderStatus === 'DELIVERED') return 5;
    if (ord.orderStatus === 'RETURNED_BP06' || ord.fulfillmentStatus === 'RETURNING' || ord.fulfillmentStatus === 'RETURNED_RECEIVED') return 5;
    if (ord.orderStatus === 'IN_TRANSIT' || ord.orderStatus === 'SHIPPING') return 4;
    if (ord.isPackaged || ord.fulfillmentStatus === 'PACKAGED') return 3;
    if (ord.orderStatus === 'CONFIRMED' || ord.orderStatus === 'PROCESSING') return 2;
    return 1; // AWAITING_CONFIRMATION / PENDING
  }

  getStepperProgressPercent(): number {
    const stage = this.getStepStageNumber();
    return (stage - 1) * 25;
  }

  getStepClass(stepNum: number): string {
    const current = this.getStepStageNumber();
    if (stepNum < current) return '';
    if (stepNum === current) return '';
    return 'opacity-50';
  }

  getStepIconClass(stepNum: number): string {
    const current = this.getStepStageNumber();
    if (stepNum < current || (stepNum === 5 && this.activeOrder()?.orderStatus === 'DELIVERED')) return 'bg-emerald-500 text-white shadow-emerald-200';
    if (stepNum === current) return 'bg-[#800020] text-[#FFF5E1] shadow-[#800020]/20 ring-4 ring-[#F5D9AF] animate-pulse';
    return 'bg-slate-100 text-slate-400 border border-slate-200';
  }

  getStepSubClass(stepNum: number): string {
    const current = this.getStepStageNumber();
    if (stepNum < current || (stepNum === 5 && this.activeOrder()?.orderStatus === 'DELIVERED')) return 'text-emerald-600';
    if (stepNum === current) return 'text-[#800020]';
    return 'text-slate-400';
  }

  getStepIcon(stepNum: number): string {
    const current = this.getStepStageNumber();
    if (stepNum < current || (stepNum === 5 && this.activeOrder()?.orderStatus === 'DELIVERED')) return 'check';
    switch (stepNum) {
      case 1: return 'hourglass_top';
      case 2: return 'handyman';
      case 3: return 'inventory_2';
      case 4: return 'local_shipping';
      case 5: return 'location_on';
      default: return 'circle';
    }
  }

  getStepTitle(stepNum: number): string {
    if (stepNum === 5) {
      const ord = this.activeOrder();
      if (ord?.orderStatus === 'RETURNED_BP06' || ord?.fulfillmentStatus === 'RETURNING') {
        return 'Xử Lý Hàng Hoàn';
      }
      return 'Giao Hàng Thành Công';
    }
    return '';
  }

  getStepDesc(stepNum: number): string {
    const ord = this.activeOrder();
    switch (stepNum) {
      case 1:
        if (ord?.orderStatus === 'AWAITING_CONFIRMATION' || ord?.orderStatus === 'PENDING') {
          return 'Đang chờ xác nhận (12h-48h)';
        }
        return 'Đã xác nhận bởi admin';
      case 2:
        return this.getStepStageNumber() >= 2 ? 'Đang chuẩn bị theo cập nhật của admin' : 'Chờ xác nhận đơn hàng';
      case 3:
        return this.getStepStageNumber() >= 3 ? 'Đã hoàn tất đóng gói' : 'Chờ chuẩn bị sản phẩm';
      case 4:
        return this.getStepStageNumber() >= 4 ? this.getOrderTrackingCode() : 'Chưa bàn giao vận chuyển';
      case 5:
        if (ord?.orderStatus === 'RETURNED_BP06' || ord?.fulfillmentStatus === 'RETURNING' || ord?.fulfillmentStatus === 'RETURNED_RECEIVED') return 'Đang xử lý hàng hoàn';
        if (ord?.orderStatus === 'DELIVERED') return 'Khách đã ký nhận';
        return 'Chưa giao hàng';
      default:
        return '';
    }
  }

  getOrderHeaderBadge(ord: Order | null = this.activeOrder()): { label: string; class: string; icon: string } {
    if (!ord) return { label: 'Đang Tra Cứu', class: 'bg-[#FFF5E1] text-[#800020] border border-[#EBD3AE]', icon: 'search' };

    switch (ord.orderStatus) {
      case 'DELIVERED':
        return { label: 'Đã Giao Thành Công', class: 'bg-emerald-100 text-emerald-700', icon: 'task_alt' };
      case 'IN_TRANSIT':
      case 'SHIPPING':
        return { label: 'In Transit • Đang Vận Chuyển', class: 'bg-[#FFF5E1] text-[#800020] border border-[#EBD3AE]', icon: 'local_shipping' };
      case 'PROCESSING':
      case 'CONFIRMED':
        return { label: ord.isPackaged || ord.fulfillmentStatus === 'PACKAGED' ? 'Đã Đóng Hộp Quà' : ord.fulfillmentStatus === 'AT_WORKSHOP' || ord.orderStatus === 'PROCESSING' ? 'Đang Chuẩn Bị & Chế Tác' : 'Đã Xác Nhận', class: 'bg-[#FFF5E1] text-[#800020] border border-[#EBD3AE]', icon: 'auto_fix_high' };
      case 'AWAITING_CONFIRMATION':
      case 'PENDING':
        return { label: 'Chờ Xác Nhận (12h - 48h)', class: 'bg-amber-100 text-amber-800', icon: 'hourglass_top' };
      case 'CANCELLED':
        return { label: 'Đã hủy', class: 'bg-slate-200 text-slate-700', icon: 'cancel' };
      case 'RETURNED_BP06':
        return { label: 'Đã Chuyển Xử Lý BP-06', class: 'bg-rose-100 text-rose-700', icon: 'assignment_return' };
      default:
        return { label: ord.orderStatus, class: 'bg-slate-100 text-slate-700', icon: 'info' };
    }
  }

  getItemStatusText(item: any): string {
    if (!item.isCustom) {
      return item.status === 'PREPARED' ? 'Đã Lấy Hàng' : 'Chờ Lấy Hàng';
    } else {
      switch (item.status) {
        case 'QC_PASSED': return 'Đạt QC Xuất Xưởng';
        case 'IN_PRODUCTION': return 'Đang Gia Công';
        case 'QC_FAILED': return 'Gia Công Lại';
        default: return 'Chờ Xưởng';
      }
    }
  }
}
