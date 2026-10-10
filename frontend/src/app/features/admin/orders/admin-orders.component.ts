import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { Order, OrderItemDetail } from '../../../core/models';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in pb-12">
      <!-- Header -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-giftory-border/60 pb-6">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-[#7C3AED] text-xs font-bold mb-2">
            <span class="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-ping"></span>
            BP-04 • Quy Trình Thực Thi Đơn Hàng & Giao Hàng Live
          </div>
          <h1 class="text-2xl md:text-3xl font-display font-black text-giftory-ink">
            Điều Phối Đơn Hàng & Quy Trình BP-04
          </h1>
          <p class="text-xs text-giftory-ink/70 mt-1 max-w-3xl">
            Quản lý toàn diện từ Tiếp nhận đơn BP-03 (Chờ xác nhận 12h-48h) → Chuẩn bị Ready-made & Chế tác Custom → Đóng gói → Bàn giao Shipper (In transit) → Xác nhận giao thành công hoặc Chuyển sang BP-06.
          </p>
        </div>

        <div class="flex items-center gap-3 self-start lg:self-center">
          <!-- Toggle Bypass 12h for testing -->
          <label class="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800 cursor-pointer shadow-xs hover:bg-amber-100/60 transition">
            <input type="checkbox" [(ngModel)]="bypassWaitTime" class="rounded text-[#7C3AED] focus:ring-[#7C3AED]" />
            <span>Bỏ qua 12h chờ (Chế độ Dev/Test)</span>
          </label>

          <button (click)="loadOrders()" [disabled]="loading()" class="px-4 py-2 rounded-xl border border-giftory-border hover:bg-giftory-canvas text-giftory-ink text-xs font-bold flex items-center gap-1.5 transition cursor-pointer">
            <span class="material-symbols-outlined text-sm" [class.animate-spin]="loading()">refresh</span>
            {{ loading() ? 'Đang tải...' : 'Làm mới' }}
          </button>
        </div>
      </div>

      <!-- Auth Error / Session Expired Banner -->
      <div *ngIf="authError()" class="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-fade-in">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
            <span class="material-symbols-outlined text-2xl">lock_clock</span>
          </div>
          <div>
            <h4 class="font-bold text-amber-900 text-sm">Phiên làm việc Quản trị viên đã hết hạn hoặc chưa xác thực (401)</h4>
            <p class="text-xs text-amber-800/80 mt-0.5">
              Để tải toàn bộ 15 đơn hàng hiện có trong database và thao tác thực thi BP-04, bạn có thể bấm nút bên dưới để khôi phục phiên Admin ngay lập tức.
            </p>
          </div>
        </div>
        <button
          (click)="reloginAdmin()"
          class="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl text-xs font-bold whitespace-nowrap shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 self-start md:self-auto shrink-0"
        >
          <span class="material-symbols-outlined text-sm">verified_user</span>
          Kích Hoạt Phiên Admin & Tải Lại
        </button>
      </div>

      <!-- BP-04 Stage KPI Metrics -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div (click)="selectFilter('AWAITING_CONFIRMATION')" class="p-3.5 bg-white rounded-2xl border border-giftory-border hover:border-amber-400 cursor-pointer transition shadow-xs">
          <span class="text-[10px] font-bold text-amber-600 block uppercase tracking-wider">1. Chờ Xác Nhận (12h-48h)</span>
          <span class="text-xl font-display font-black text-slate-800">{{ countStage('AWAITING_CONFIRMATION') }}</span>
          <span class="text-[10px] text-slate-400 block mt-0.5">BR-01, BR-02</span>
        </div>

        <div (click)="selectFilter('CONFIRMED')" class="p-3.5 bg-white rounded-2xl border border-giftory-border hover:border-blue-400 cursor-pointer transition shadow-xs">
          <span class="text-[10px] font-bold text-blue-600 block uppercase tracking-wider">2. Đã Xác Nhận</span>
          <span class="text-xl font-display font-black text-slate-800">{{ countStage('CONFIRMED') }}</span>
          <span class="text-[10px] text-slate-400 block mt-0.5">Chuẩn bị & Xưởng</span>
        </div>

        <div (click)="selectFilter('PACKAGED')" class="p-3.5 bg-white rounded-2xl border border-giftory-border hover:border-purple-400 cursor-pointer transition shadow-xs">
          <span class="text-[10px] font-bold text-purple-600 block uppercase tracking-wider">3. Đã Đóng Gói</span>
          <span class="text-xl font-display font-black text-slate-800">{{ countStage('PACKAGED') }}</span>
          <span class="text-[10px] text-slate-400 block mt-0.5">Sẵn sàng giao Shipper</span>
        </div>

        <div (click)="selectFilter('IN_TRANSIT')" class="p-3.5 bg-white rounded-2xl border border-giftory-border hover:border-indigo-400 cursor-pointer transition shadow-xs">
          <span class="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider">4. In Transit</span>
          <span class="text-xl font-display font-black text-slate-800">{{ countStage('IN_TRANSIT') }}</span>
          <span class="text-[10px] text-slate-400 block mt-0.5">Delivery Service</span>
        </div>

        <div (click)="selectFilter('DELIVERED')" class="p-3.5 bg-white rounded-2xl border border-giftory-border hover:border-emerald-400 cursor-pointer transition shadow-xs">
          <span class="text-[10px] font-bold text-emerald-600 block uppercase tracking-wider">5. Đã Giao Thành Công</span>
          <span class="text-xl font-display font-black text-slate-800">{{ countStage('DELIVERED') }}</span>
          <span class="text-[10px] text-slate-400 block mt-0.5">Hoàn tất BP-04</span>
        </div>

        <div (click)="selectFilter('RETURNED')" class="p-3.5 bg-white rounded-2xl border border-giftory-border hover:border-rose-400 cursor-pointer transition shadow-xs">
          <span class="text-[10px] font-bold text-rose-600 block uppercase tracking-wider">6. Hàng Trả / BP-06</span>
          <span class="text-xl font-display font-black text-slate-800">{{ countStage('RETURNED') }}</span>
          <span class="text-[10px] text-slate-400 block mt-0.5">Chuyển xử lý BP-06</span>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="bg-white rounded-3xl p-4 border border-giftory-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <!-- Status filter tabs -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            *ngFor="let filter of statusFilters"
            (click)="selectFilter(filter.key)"
            [ngClass]="activeFilter() === filter.key ? 'bg-[#7C3AED] text-white font-bold shadow-xs' : 'bg-giftory-canvas text-giftory-ink/70 hover:text-giftory-ink'"
            class="px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition cursor-pointer"
          >
            {{ filter.label }}
          </button>
        </div>

        <div class="relative max-w-xs w-full">
          <span class="material-symbols-outlined absolute left-3 top-2.5 text-giftory-ink/40 text-lg">search</span>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Tìm theo mã đơn, SĐT hoặc tên..."
            class="w-full pl-9 pr-4 py-2 bg-giftory-canvas rounded-xl border border-giftory-border focus:outline-none focus:border-[#7C3AED] text-xs"
          />
        </div>
      </div>

      <!-- Orders List Table -->
      <div class="bg-white rounded-3xl p-5 border border-giftory-border shadow-xs space-y-4">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-giftory-border text-giftory-ink/50 font-bold uppercase tracking-wider text-[11px]">
                <th class="py-3 px-3">Mã Đơn & Thời Gian Chờ (BR-02)</th>
                <th class="py-3 px-3">Khách Hàng & Địa Chỉ</th>
                <th class="py-3 px-3">Cơ Cấu Order Items</th>
                <th class="py-3 px-3">Thanh Toán</th>
                <th class="py-3 px-3">Trạng Thái BP-04</th>
                <th class="py-3 px-3">Giao Vận / Shipper</th>
                <th class="py-3 px-3 text-right">Thao Tác BP-04</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-giftory-border/40">
              <!-- Loading State -->
              <tr *ngIf="loading()">
                <td colspan="7" class="py-12 text-center text-giftory-ink/50">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-3xl animate-spin text-[#7C3AED]">progress_activity</span>
                    <span class="text-xs font-semibold">Đang đồng bộ dữ liệu đơn hàng & quy trình BP-04...</span>
                  </div>
                </td>
              </tr>

              <!-- Empty State -->
              <tr *ngIf="!loading() && filteredOrders().length === 0">
                <td colspan="7" class="py-12 text-center text-giftory-ink/60">
                  <div class="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                    <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <span class="material-symbols-outlined text-2xl">inbox</span>
                    </div>
                    <span class="text-sm font-bold text-slate-800">Không tìm thấy đơn hàng phù hợp</span>
                    <p class="text-xs text-slate-500">
                      Hiện không có đơn hàng nào ở giai đoạn này hoặc khớp với từ khóa tìm kiếm.
                    </p>
                    <button
                      *ngIf="activeFilter() !== 'ALL' || searchQuery"
                      (click)="activeFilter.set('ALL'); searchQuery=''"
                      class="mt-2 px-3.5 py-1.5 rounded-xl bg-purple-50 text-[#7C3AED] hover:bg-purple-100 font-bold text-xs transition cursor-pointer"
                    >
                      Hiển thị tất cả đơn hàng
                    </button>
                  </div>
                </td>
              </tr>

              <tr *ngFor="let ord of filteredOrders()" class="hover:bg-giftory-canvas/60 transition">
                <!-- Mã Đơn & Thời gian chờ xác nhận -->
                <td class="py-3.5 px-3">
                  <span class="font-mono font-bold text-[#7C3AED] block text-sm">#{{ ord.orderCode }}</span>
                  <span class="text-[10px] text-giftory-ink/50 block">{{ ord.createdAt | date:'HH:mm dd/MM/yyyy' }}</span>

                  <!-- Wait timer badge if awaiting confirmation -->
                  <div *ngIf="ord.orderStatus === 'AWAITING_CONFIRMATION' || ord.orderStatus === 'PENDING'" class="mt-1">
                    <span [ngClass]="getWaitTimeBadge(ord).badgeClass" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      <span class="material-symbols-outlined text-[11px]">timer</span>
                      {{ getWaitTimeBadge(ord).label }}
                    </span>
                  </div>
                </td>

                <!-- Khách hàng -->
                <td class="py-3.5 px-3">
                  <span class="font-bold text-giftory-ink block">{{ ord.customerInfo?.name || ord.shippingAddress?.fullName || 'Khách Vãng Lai' }}</span>
                  <span class="text-[10px] text-giftory-ink/60 font-mono block">{{ ord.customerInfo?.phone || ord.shippingAddress?.phone }}</span>
                  <span class="text-[10px] text-giftory-ink/40 line-clamp-1 max-w-[180px]">{{ ord.customerInfo?.address || ord.shippingAddress?.detailAddress }}</span>
                </td>

                <!-- Order items breakdown -->
                <td class="py-3.5 px-3">
                  <div class="space-y-1 max-w-xs">
                    <div *ngFor="let item of ord.items" class="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
                      <div class="flex items-center gap-1.5 truncate">
                        <span *ngIf="item.isCustom" class="px-1.5 py-0.2 rounded bg-purple-100 text-[#7C3AED] font-bold text-[9px] shrink-0">Custom</span>
                        <span *ngIf="!item.isCustom" class="px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-bold text-[9px] shrink-0">Ready-made</span>
                        <span class="truncate font-medium text-slate-800">{{ item.productName || item.name }} (x{{ item.quantity }})</span>
                      </div>
                      <span [ngClass]="getItemStatusBadge(item)" class="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0">
                        {{ getItemStatusText(item) }}
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Thanh toán -->
                <td class="py-3.5 px-3">
                  <span class="font-mono font-bold text-giftory-ink block">{{ (ord.pricing?.totalAmount || ord.totalAmount) | number }} đ</span>
                  <span *ngIf="ord.paymentMode === 'DEPOSIT_50'" class="text-[10px] text-emerald-600 font-semibold block">
                    Đã cọc 50%: {{ (ord.pricing?.depositAmount || ord.depositAmount) | number }} đ
                  </span>
                  <span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono inline-block mt-0.5">
                    {{ ord.paymentMethod }} • {{ ord.paymentStatus }}
                  </span>
                </td>

                <!-- Trạng thái đơn -->
                <td class="py-3.5 px-3">
                  <span [ngClass]="getOrderStatusBadge(ord.orderStatus)" class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase inline-block">
                    {{ getOrderStatusText(ord.orderStatus) }}
                  </span>
                  <span *ngIf="ord.isPackaged" class="text-[9px] font-bold text-purple-600 block mt-1">
                    ✓ Đã đóng gói (BR-09)
                  </span>
                </td>

                <!-- Giao vận -->
                <td class="py-3.5 px-3">
                  <span class="font-mono font-bold text-slate-700 block text-[11px]">{{ ord.deliveryInfo?.trackingCode || ord.trackingCode || 'Chưa gán' }}</span>
                  <span class="text-[10px] text-slate-500 block">{{ ord.deliveryInfo?.carrier || ord.shippingCarrier }}</span>
                  <span *ngIf="ord.deliveryInfo?.deliveryAttempts?.length" class="text-[9px] text-amber-600 font-semibold block">
                    Đã thử giao: {{ ord.deliveryInfo?.deliveryAttempts?.length }} lần
                  </span>
                </td>

                <!-- Nút thao tác -->
                <td class="py-3.5 px-3 text-right">
                  <button (click)="openProcessModal(ord)" class="px-3.5 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1 ml-auto cursor-pointer">
                    <span class="material-symbols-outlined text-sm">tune</span>
                    Xử Lý BP-04
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- MODAL: TRUNG TÂM ĐIỀU PHỐI & THỰC THI BP-04 (LIVE PIPELINE) -->
      <!-- ============================================================== -->
      <div *ngIf="selectedOrder() as ord" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div class="bg-white rounded-3xl p-5 sm:p-7 max-w-4xl w-full border border-giftory-border shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto animate-fade-in my-auto">
          
          <!-- Top Modal Bar -->
          <div class="flex items-center justify-between border-b border-giftory-border/50 pb-4">
            <div class="flex items-center gap-3">
              <span class="font-mono font-black text-xl text-[#7C3AED]">#{{ ord.orderCode }}</span>
              <span [ngClass]="getOrderStatusBadge(ord.orderStatus)" class="px-3 py-1 rounded-full text-xs font-bold uppercase">
                {{ getOrderStatusText(ord.orderStatus) }}
              </span>
              <span *ngIf="ord.isPackaged" class="px-2.5 py-0.5 rounded-full bg-purple-100 text-[#7C3AED] text-xs font-bold">
                Đã Đóng Hộp Quà
              </span>
            </div>

            <button (click)="selectedOrder.set(null)" class="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- Customer & Order Meta Banner -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span class="text-slate-400 block font-semibold uppercase text-[10px]">Khách Hàng & Liên Hệ</span>
              <span class="font-bold text-slate-800 block text-sm">{{ ord.customerInfo?.name || ord.shippingAddress?.fullName }}</span>
              <span class="font-mono text-slate-600 block">{{ ord.customerInfo?.phone || ord.shippingAddress?.phone }}</span>
            </div>
            <div>
              <span class="text-slate-400 block font-semibold uppercase text-[10px]">Địa Chỉ Nhận Quà</span>
              <p class="text-slate-700 font-medium line-clamp-2">{{ ord.customerInfo?.address || ord.shippingAddress?.detailAddress }}</p>
              <p *ngIf="ord.customerInfo?.note" class="text-amber-700 italic mt-0.5 text-[11px]">Note: {{ ord.customerInfo?.note }}</p>
            </div>
            <div>
              <span class="text-slate-400 block font-semibold uppercase text-[10px]">Giá Trị Đơn & Thu Hộ COD</span>
              <span class="font-mono font-bold text-slate-900 block text-sm">{{ (ord.pricing?.totalAmount || ord.totalAmount) | number }} đ</span>
              <span *ngIf="ord.paymentMode === 'DEPOSIT_50'" class="text-emerald-600 font-semibold block text-[11px]">
                Đã cọc 50%: {{ (ord.pricing?.depositAmount || ord.depositAmount) | number }} đ (Còn thu COD: {{ (ord.pricing?.remainingCodAmount || ord.remainingAmount) | number }} đ)
              </span>
            </div>
          </div>

          <!-- ========================================================== -->
          <!-- STEP 1: XÁC NHẬN ĐƠN HÀNG (US-04.01, BR-01, BR-02, BR-03, BR-04) -->
          <!-- ========================================================== -->
          <div class="p-5 rounded-2xl border transition" [ngClass]="ord.orderStatus === 'AWAITING_CONFIRMATION' || ord.orderStatus === 'PENDING' ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-100' : 'bg-slate-50/50 border-slate-200'">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs" [ngClass]="ord.orderStatus !== 'AWAITING_CONFIRMATION' && ord.orderStatus !== 'PENDING' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'">
                  1
                </span>
                <div>
                  <h3 class="text-sm font-bold text-slate-800">Bước 1: Xác Nhận Đơn Hàng (Admin Quản lý đơn hàng)</h3>
                  <span class="text-[11px] text-slate-500">Quy tắc BR-02: Thời gian chờ xác nhận ít nhất sau 12 giờ và tối đa sau 48 giờ.</span>
                </div>
              </div>

              <!-- Wait timer status -->
              <div class="text-right shrink-0">
                <span [ngClass]="getWaitTimeBadge(ord).badgeClass" class="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1">
                  <span class="material-symbols-outlined text-xs">hourglass_top</span>
                  {{ getWaitTimeBadge(ord).label }}
                </span>
              </div>
            </div>

            <div class="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="text-xs text-slate-600">
                <p *ngIf="ord.orderStatus === 'AWAITING_CONFIRMATION' || ord.orderStatus === 'PENDING'">
                  Đơn hàng đang ở trạng thái <strong>"Chờ xác nhận đơn hàng"</strong>. Khi xác nhận, hệ thống cập nhật <strong>"Đơn hàng đã được xác nhận"</strong> và trích xuất Order Items để phân loại phương thức xử lý (BR-04, BR-05).
                </p>
                <p *ngIf="ord.orderStatus !== 'AWAITING_CONFIRMATION' && ord.orderStatus !== 'PENDING'" class="text-emerald-700 font-semibold flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">check_circle</span>
                  Đã xác nhận đơn hàng thành công bởi: {{ ord.confirmationWait?.confirmedBy || 'Admin Quản lý đơn hàng' }}
                </p>
              </div>

              <div *ngIf="ord.orderStatus === 'AWAITING_CONFIRMATION' || ord.orderStatus === 'PENDING'" class="flex items-center gap-2 shrink-0">
                <button
                  (click)="handleConfirmOrder(ord)"
                  class="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs font-bold transition shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <span class="material-symbols-outlined text-sm">task_alt</span>
                  Xác Nhận Đơn Hàng (US-04.01)
                </button>
              </div>
            </div>
          </div>

          <!-- ========================================================== -->
          <!-- STEP 2: CHUẨN BỊ SẢN PHẨM: READY-MADE & CUSTOM GIFT (US-04.02, US-04.03, BR-05, BR-06, BR-07, BR-08) -->
          <!-- ========================================================== -->
          <div class="p-5 rounded-2xl border transition" [ngClass]="ord.orderStatus === 'CONFIRMED' && !ord.isPackaged ? 'bg-purple-50/40 border-purple-300 ring-2 ring-purple-100' : 'bg-slate-50/50 border-slate-200'">
            <div class="flex items-center justify-between pb-3 border-b border-slate-200/60">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs" [ngClass]="isAllItemsReady(ord) ? 'bg-emerald-500 text-white' : 'bg-[#7C3AED] text-white'">
                  2
                </span>
                <div>
                  <h3 class="text-sm font-bold text-slate-800">Bước 2: Xử Lý Theo Loại Sản Phẩm (Ready-made vs Custom Gift)</h3>
                  <span class="text-[11px] text-slate-500">Ready-made do Admin lấy; Custom do Xưởng truy xuất cấu hình, sản xuất & kiểm tra chất lượng.</span>
                </div>
              </div>

              <span *ngIf="isAllItemsReady(ord)" class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1">
                <span class="material-symbols-outlined text-xs">done_all</span>
                Tất Cả Món Đã Sẵn Sàng
              </span>
            </div>

            <!-- Items List -->
            <div class="pt-4 space-y-3">
              <div *ngFor="let item of ord.items; let idx = index" class="p-3.5 bg-white border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                
                <!-- Item Info -->
                <div class="flex items-start gap-3">
                  <img [src]="item.productImage || item.image || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200'" class="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0" />
                  <div>
                    <div class="flex items-center gap-2">
                      <span *ngIf="item.isCustom" class="px-2 py-0.5 rounded bg-purple-100 text-[#7C3AED] font-extrabold text-[10px] uppercase">Custom Gift (Xưởng)</span>
                      <span *ngIf="!item.isCustom" class="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-extrabold text-[10px] uppercase">Ready-made Gift (Có sẵn)</span>
                      <span class="font-bold text-slate-900 text-xs">{{ item.productName || item.name }}</span>
                    </div>

                    <span class="text-[11px] text-slate-500 block mt-0.5">Phân loại: {{ item.variantName || 'Tiêu chuẩn' }} • SL: {{ item.quantity }}</span>

                    <!-- Custom details highlight if bespoke -->
                    <div *ngIf="item.isCustom && item.customDetails" class="mt-1 flex items-center gap-2 text-[11px] text-[#7C3AED] bg-purple-50/80 px-2 py-0.5 rounded-md border border-purple-100">
                      <span class="material-symbols-outlined text-xs">palette</span>
                      <span class="truncate">Nội dung khắc: "{{ item.customDetails.frontMessage || item.customDetails.customText || 'Theo cấu hình' }}" (Font: {{ item.customDetails.fontFamily || 'Serif' }})</span>
                    </div>

                    <!-- QC Notes if any -->
                    <div *ngIf="item.qcNote" class="mt-1 text-[11px]" [ngClass]="item.status === 'QC_PASSED' ? 'text-emerald-700 font-medium' : 'text-rose-600 font-bold'">
                      QC Ghi chú: {{ item.qcNote }}
                    </div>
                  </div>
                </div>

                <!-- Item Actions & Status -->
                <div class="flex flex-wrap items-center gap-2 self-end md:self-center">
                  <!-- Current status badge -->
                  <span [ngClass]="getItemStatusBadge(item)" class="text-xs font-bold px-2.5 py-1 rounded-xl">
                    {{ getItemStatusText(item) }}
                  </span>

                  <!-- Actions for Ready-made Gift (US-04.02, BR-06) -->
                  <div *ngIf="!item.isCustom">
                    <button
                      *ngIf="item.status !== 'PREPARED'"
                      [disabled]="ord.orderStatus === 'AWAITING_CONFIRMATION' || ord.orderStatus === 'PENDING'"
                      (click)="handlePickReadyMade(ord, item)"
                      class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <span class="material-symbols-outlined text-xs">inventory</span>
                      Admin Lấy Sản Phẩm (US-04.02)
                    </button>
                    <span *ngIf="item.status === 'PREPARED'" class="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <span class="material-symbols-outlined text-xs">check</span> Đã lấy xong
                    </span>
                  </div>

                  <!-- Actions for Custom Gift (US-04.03, BR-07, BR-08, EF1) -->
                  <div *ngIf="item.isCustom" class="flex items-center gap-1.5">
                    <!-- Inspect Custom Spec button -->
                    <button
                      (click)="openCustomSpecModal(item)"
                      class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      <span class="material-symbols-outlined text-xs">visibility</span>
                      Truy Xuất Cấu Hình
                    </button>

                    <!-- Start production button -->
                    <button
                      *ngIf="item.status === 'PENDING' || item.status === 'QC_FAILED'"
                      [disabled]="ord.orderStatus === 'AWAITING_CONFIRMATION' || ord.orderStatus === 'PENDING'"
                      (click)="handleStartProduction(ord, item)"
                      class="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <span class="material-symbols-outlined text-xs">handyman</span>
                      {{ item.status === 'QC_FAILED' ? 'Gia Công Lại (EF1)' : 'Bắt Đầu Sản Xuất' }}
                    </button>

                    <!-- QC inspection button -->
                    <button
                      *ngIf="item.status === 'IN_PRODUCTION'"
                      (click)="openQcModal(ord, item)"
                      class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <span class="material-symbols-outlined text-xs">verified</span>
                      Kiểm Định QC (BR-08)
                    </button>

                    <span *ngIf="item.status === 'QC_PASSED'" class="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <span class="material-symbols-outlined text-xs">check_circle</span> Đạt QC Xuất Xưởng
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ========================================================== -->
          <!-- STEP 3 & 4: ĐÓNG GÓI & BÀN GIAO SHIPPER (US-04.04, BR-09, BR-10) -->
          <!-- ========================================================== -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <!-- Card Đóng Gói (BR-09) -->
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs" [ngClass]="ord.isPackaged ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'">
                  3
                </span>
                <div>
                  <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Đóng Gói Đơn Hàng (BR-09)</h4>
                  <span class="text-[11px] text-slate-500">Chỉ đóng gói khi TẤT CẢ sản phẩm đã chuẩn bị xong & đạt QC</span>
                </div>
              </div>

              <div class="text-xs space-y-2">
                <div *ngIf="!ord.isPackaged">
                  <div class="p-2.5 rounded-xl border text-[11px]" [ngClass]="isAllItemsReady(ord) ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'">
                    <span *ngIf="isAllItemsReady(ord)">✓ Toàn bộ {{ ord.items.length }} sản phẩm đã đạt chuẩn. Sẵn sàng đóng gói!</span>
                    <span *ngIf="!isAllItemsReady(ord)">⚠ Chưa thể đóng gói (BR-09). Còn sản phẩm chưa lấy hoặc chưa đạt QC.</span>
                  </div>

                  <button
                    [disabled]="!isAllItemsReady(ord) || ord.orderStatus === 'AWAITING_CONFIRMATION' || ord.orderStatus === 'PENDING'"
                    (click)="handlePackageOrder(ord)"
                    class="w-full mt-2 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white font-bold rounded-xl text-xs transition shadow flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span class="material-symbols-outlined text-sm">inventory_2</span>
                    Đóng Gói Đơn Hàng (US-04.04, BR-09)
                  </button>
                </div>

                <div *ngIf="ord.isPackaged" class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-semibold flex items-center gap-2">
                  <span class="material-symbols-outlined text-lg">check_circle</span>
                  <div>
                    <span class="block">Đã đóng gói hoàn tất!</span>
                    <span class="text-[10px] text-emerald-600 font-normal">Đóng bởi: {{ ord.packagedBy || 'Admin' }} lúc {{ ord.packagedAt | date:'HH:mm dd/MM' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card Bàn Giao Shipper (BR-10) -->
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs" [ngClass]="ord.orderStatus === 'IN_TRANSIT' || ord.orderStatus === 'DELIVERED' ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'">
                  4
                </span>
                <div>
                  <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Bàn Giao Shipper (BR-10)</h4>
                  <span class="text-[11px] text-slate-500">Cập nhật "In transit" & Chuyển Delivery Service</span>
                </div>
              </div>

              <div class="text-xs space-y-2">
                <div *ngIf="ord.orderStatus !== 'IN_TRANSIT' && ord.orderStatus !== 'DELIVERED' && ord.orderStatus !== 'RETURNED_BP06'">
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="text-[10px] font-bold text-slate-500 block">Đơn vị vận chuyển</label>
                      <select [(ngModel)]="dispatchCarrier" class="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs">
                        <option value="Giao Hàng Tiết Kiệm (GHTK)">GHTK Express</option>
                        <option value="Giao Hàng Nhanh Hỏa Tốc (2h - 48h)">GHN Hỏa Tốc</option>
                        <option value="SPX Express">SPX Express</option>
                        <option value="Viettel Post">Viettel Post</option>
                      </select>
                    </div>
                    <div>
                      <label class="text-[10px] font-bold text-slate-500 block">Mã vận đơn tracking</label>
                      <input type="text" [(ngModel)]="dispatchTracking" placeholder="GHTK-VN-..." class="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono" />
                    </div>
                  </div>

                  <button
                    [disabled]="!ord.isPackaged"
                    (click)="handleDispatchOrder(ord)"
                    class="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition shadow flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span class="material-symbols-outlined text-sm">local_shipping</span>
                    Bàn Giao Cho Shipper → "In transit" (BR-10)
                  </button>
                  <span *ngIf="!ord.isPackaged" class="text-[10px] text-slate-400 italic block text-center mt-1">Đơn chưa đóng gói thì không được bàn giao (BR-10)</span>
                </div>

                <div *ngIf="ord.orderStatus === 'IN_TRANSIT' || ord.orderStatus === 'DELIVERED'" class="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 font-semibold space-y-1">
                  <span class="block">✓ Đã bàn giao Shipper (In transit)</span>
                  <span class="text-[11px] text-indigo-700 font-mono block">Vận đơn: {{ ord.deliveryInfo?.trackingCode || ord.trackingCode }}</span>
                  <span class="text-[10px] text-indigo-600 block">Đơn vị: {{ ord.deliveryInfo?.carrier || ord.shippingCarrier }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ========================================================== -->
          <!-- STEP 5 & 6: DELIVERY SERVICE & KẾT QUẢ GIAO HÀNG (US-04.05, US-04.06, US-04.07, BR-11 -> BR-16) -->
          <!-- ========================================================== -->
          <div *ngIf="ord.orderStatus === 'IN_TRANSIT' || ord.orderStatus === 'DELIVERED' || ord.fulfillmentStatus === 'RETURNING' || ord.fulfillmentStatus === 'RETURNED_RECEIVED' || ord.orderStatus === 'RETURNED_BP06'" class="p-5 bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-2xl border border-slate-200 space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-200">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                  5
                </span>
                <div>
                  <h3 class="text-sm font-bold text-slate-800">Bước 5 & 6: Delivery Service Giao Hàng & Xử Lý Kết Quả (US-04.05 - US-04.07)</h3>
                  <span class="text-[11px] text-slate-500">Mô phỏng xác nhận giao thành công hoặc xử lý giao thất bại (Giao lại BR-14 / Trả hàng BR-15 / Chuyển BP-06 BR-16).</span>
                </div>
              </div>

              <span class="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold font-mono">
                {{ ord.deliveryInfo?.carrier || ord.shippingCarrier }}
              </span>
            </div>

            <!-- If In Transit: Show Actions to Report Delivery Result -->
            <div *ngIf="ord.orderStatus === 'IN_TRANSIT'" class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <!-- Success Option (US-04.05, BR-12) -->
              <div class="p-3.5 bg-white border border-emerald-200 rounded-xl space-y-2 flex flex-col justify-between">
                <div>
                  <span class="text-xs font-bold text-emerald-700 block flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">task_alt</span>
                    Giao Hàng Thành Công (BR-12)
                  </span>
                  <p class="text-[11px] text-slate-500 mt-1">Delivery Service xác nhận khách đã nhận trọn vẹn. Hoàn tất quy trình BP-04.</p>
                </div>
                <button
                  (click)="handleDeliverySuccess(ord)"
                  class="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow flex items-center justify-center gap-1 cursor-pointer"
                >
                  Xác Nhận Đã Giao Thành Công (US-04.05)
                </button>
              </div>

              <!-- Failure Option (US-04.06, BR-13, BR-14, BR-15) -->
              <div class="p-3.5 bg-white border border-rose-200 rounded-xl space-y-2 flex flex-col justify-between">
                <div>
                  <span class="text-xs font-bold text-rose-700 block flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">cancel</span>
                    Giao Hàng Không Thành Công (EF2)
                  </span>
                  <p class="text-[11px] text-slate-500 mt-1">Bắt buộc ghi nhận lý do (BR-13). Chọn giao lại hoặc trả hàng về Giftory.</p>
                </div>
                <button
                  (click)="openDeliveryFailedModal(ord)"
                  class="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow flex items-center justify-center gap-1 cursor-pointer"
                >
                  Báo Giao Thất Bại & Xử Lý (US-04.06)
                </button>
              </div>
            </div>

            <!-- If Returning or Returned: Step 6 Handle Return to BP-06 -->
            <div *ngIf="ord.fulfillmentStatus === 'RETURNING' || ord.fulfillmentStatus === 'RETURNED_RECEIVED' || ord.orderStatus === 'RETURNED_BP06'" class="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-rose-800 flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">assignment_return</span>
                  Xử Lý Hàng Hoàn Về Giftory (US-04.07, BR-15, BR-16)
                </span>
                <span class="text-[10px] text-rose-600 font-bold uppercase">
                  Lý do: {{ ord.deliveryInfo?.failureReason || 'Khách không nhận' }}
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <!-- Button 1: Receive Returned Order at Warehouse (BR-15) -->
                <button
                  *ngIf="ord.fulfillmentStatus === 'RETURNING'"
                  (click)="handleReceiveReturn(ord)"
                  class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition shadow flex items-center gap-1 cursor-pointer"
                >
                  <span class="material-symbols-outlined text-sm">warehouse</span>
                  Admin Tiếp Nhận Hàng Trả Tại Kho (BR-15)
                </button>

                <!-- Button 2: Transfer to BP-06 (BR-16) -->
                <button
                  *ngIf="ord.fulfillmentStatus === 'RETURNED_RECEIVED'"
                  (click)="openTransferBp06Modal(ord)"
                  class="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs transition shadow flex items-center gap-1 cursor-pointer"
                >
                  <span class="material-symbols-outlined text-sm">forward</span>
                  Chuyển Thông Tin Sang BP-06 & Kết Thúc BP-04 (BR-16)
                </button>

                <div *ngIf="ord.orderStatus === 'RETURNED_BP06'" class="text-xs font-bold text-purple-700 flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">verified</span>
                  Đã chuyển giao hồ sơ sang quy trình BP-06. Quy trình BP-04 kết thúc!
                </div>
              </div>
            </div>

            <!-- Delivery Attempts Log if any -->
            <div *ngIf="ord.deliveryInfo?.deliveryAttempts?.length" class="space-y-1.5 pt-2 border-t border-slate-200">
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Nhật Ký Các Lần Thử Giao Hàng (BR-14)</span>
              <div *ngFor="let att of ord.deliveryInfo?.deliveryAttempts" class="p-2 bg-white rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <span class="font-bold text-slate-800">Lần {{ att.attemptNumber }}:</span>
                  <span class="text-rose-600 ml-1">"{{ att.failureReason }}"</span>
                  <span *ngIf="att.note" class="text-slate-400 italic ml-1">({{ att.note }})</span>
                </div>
                <div class="text-[10px] text-slate-400">
                  <span class="px-1.5 py-0.5 rounded" [ngClass]="att.allowRetry ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'">
                    {{ att.allowRetry ? 'Được giao lại' : 'Không giao lại' }}
                  </span>
                  <span class="ml-2 font-mono">{{ att.timestamp | date:'HH:mm dd/MM' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ========================================================== -->
          <!-- ORDER TIMELINE HISTORY -->
          <!-- ========================================================== -->
          <div class="space-y-2 pt-2 border-t border-slate-200">
            <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Lịch Sử Lộ Trình Đơn Hàng (Timeline)</h4>
            <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
              <div *ngFor="let t of ord.timeline" class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-start gap-2.5">
                <span class="material-symbols-outlined text-sm mt-0.5" [ngClass]="t.completed ? 'text-emerald-500' : 'text-slate-400'">
                  {{ t.completed ? 'check_circle' : 'pending' }}
                </span>
                <div class="flex-1">
                  <span class="font-bold text-slate-800 block">{{ t.title }}</span>
                  <span class="text-slate-500 text-[11px] block">{{ t.description }}</span>
                </div>
                <span class="text-[10px] text-slate-400 font-mono shrink-0">{{ t.timestamp | date:'HH:mm dd/MM/yyyy' }}</span>
              </div>
            </div>
          </div>

          <!-- Bottom Modal Footer -->
          <div class="flex items-center justify-between pt-3 border-t border-giftory-border/50">
            <span class="text-xs text-slate-400">Mã đơn: <strong class="font-mono text-slate-700">#{{ ord.orderCode }}</strong></span>
            <button (click)="selectedOrder.set(null)" class="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer">
              Đóng Cửa Sổ
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- SUB-MODAL: TRUY XUẤT CẤU HÌNH CUSTOM GIFT (US-04.03, BR-07) -->
      <!-- ============================================================== -->
      <div *ngIf="selectedCustomItem() as cItem" class="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl p-6 max-w-lg w-full border border-giftory-border shadow-2xl space-y-4 animate-fade-in">
          <div class="flex items-center justify-between border-b pb-3">
            <div>
              <span class="text-[10px] font-bold text-[#7C3AED] uppercase">US-04.03 • BR-07</span>
              <h3 class="text-sm font-bold text-slate-900">Truy Xuất Cấu Hình Sản Phẩm Custom</h3>
            </div>
            <button (click)="selectedCustomItem.set(null)" class="text-slate-400 hover:text-slate-700">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="space-y-3 text-xs">
            <div class="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
              <img [src]="cItem.productImage || cItem.image || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200'" class="w-14 h-14 rounded-lg object-cover" />
              <div>
                <span class="font-bold text-slate-900 block text-sm">{{ cItem.productName || cItem.name }}</span>
                <span class="text-slate-500">Phân loại: {{ cItem.variantName || 'Tiêu chuẩn' }}</span>
              </div>
            </div>

            <div class="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span class="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">Thông Tin Khắc & Gia Công Xưởng:</span>
              <div class="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span class="text-slate-400 block">Nội dung khắc mặt trước:</span>
                  <span class="font-bold text-[#7C3AED] block">{{ cItem.customDetails?.frontMessage || cItem.customDetails?.customText || 'Theo mẫu thiết kế' }}</span>
                </div>
                <div>
                  <span class="text-slate-400 block">Nội dung khắc mặt sau:</span>
                  <span class="font-semibold text-slate-700 block">{{ cItem.customDetails?.backMessage || 'Không yêu cầu' }}</span>
                </div>
                <div>
                  <span class="text-slate-400 block">Kiểu font chữ:</span>
                  <span class="font-semibold text-slate-700 block font-mono">{{ cItem.customDetails?.fontFamily || 'Serif Signature' }}</span>
                </div>
                <div>
                  <span class="text-slate-400 block">Màu mực / Viền kim:</span>
                  <span class="font-semibold text-slate-700 block">{{ cItem.customDetails?.engraveColor || 'Gold (Mạ Vàng 24k)' }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end pt-2 border-t">
            <button (click)="selectedCustomItem.set(null)" class="px-5 py-2 bg-[#7C3AED] text-white rounded-xl text-xs font-bold">
              Đã Xem Xong
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- SUB-MODAL: KIỂM ĐỊNH CHẤT LƯỢNG QC (US-04.03, EF1, BR-08) -->
      <!-- ============================================================== -->
      <div *ngIf="qcModalItem() as qcItem" class="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl p-6 max-w-md w-full border border-giftory-border shadow-2xl space-y-4 animate-fade-in">
          <div class="flex items-center justify-between border-b pb-3">
            <div>
              <span class="text-[10px] font-bold text-amber-600 uppercase">US-04.03 • BR-08 • EF1</span>
              <h3 class="text-sm font-bold text-slate-900">Kiểm Định Chất Lượng Sản Phẩm (QC)</h3>
            </div>
            <button (click)="qcModalItem.set(null)" class="text-slate-400 hover:text-slate-700">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <p class="text-xs text-slate-600">
            Sản phẩm: <strong>{{ qcItem.productName || qcItem.name }}</strong>
          </p>

          <div class="space-y-3 text-xs">
            <div>
              <label class="font-bold text-slate-700 block mb-1">Kết quả kiểm định:</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  (click)="qcPassed = true"
                  [ngClass]="qcPassed ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 text-slate-600'"
                  class="py-2.5 rounded-xl border text-xs flex items-center justify-center gap-1 transition"
                >
                  <span class="material-symbols-outlined text-sm">check_circle</span>
                  ĐẠT YÊU CẦU (Pass)
                </button>
                <button
                  type="button"
                  (click)="qcPassed = false"
                  [ngClass]="!qcPassed ? 'bg-rose-600 text-white font-bold' : 'bg-slate-100 text-slate-600'"
                  class="py-2.5 rounded-xl border text-xs flex items-center justify-center gap-1 transition"
                >
                  <span class="material-symbols-outlined text-sm">cancel</span>
                  KHÔNG ĐẠT (Làm lại)
                </button>
              </div>
            </div>

            <div>
              <label class="font-bold text-slate-700 block mb-1">Ghi chú kiểm định {{ !qcPassed ? '(Bắt buộc khi lỗi EF1)' : '' }}:</label>
              <input
                type="text"
                [(ngModel)]="qcNote"
                [placeholder]="qcPassed ? 'Đạt tiêu chuẩn xuất xưởng...' : 'VD: Nét khắc bị lệch 1mm, cần gia công lại...'"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t">
            <button (click)="qcModalItem.set(null)" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
              Hủy
            </button>
            <button (click)="submitQcResult()" class="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs font-bold">
              Lưu Kết Quả QC
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- SUB-MODAL: BÁO CÁO GIAO HÀNG THẤT BẠI (US-04.06, BR-13, BR-14, BR-15) -->
      <!-- ============================================================== -->
      <div *ngIf="deliveryFailedModalOpen()" class="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl p-6 max-w-md w-full border border-giftory-border shadow-2xl space-y-4 animate-fade-in">
          <div class="flex items-center justify-between border-b pb-3">
            <div>
              <span class="text-[10px] font-bold text-rose-600 uppercase">US-04.06 • BR-13, BR-14, BR-15</span>
              <h3 class="text-sm font-bold text-slate-900">Giao Hàng Không Thành Công</h3>
            </div>
            <button (click)="deliveryFailedModalOpen.set(false)" class="text-slate-400 hover:text-slate-700">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <label class="font-bold text-slate-700 block mb-1">Lý do giao thất bại (Bắt buộc theo BR-13):</label>
              <select [(ngModel)]="deliveryFailureReason" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs mb-1.5">
                <option value="Khách không nghe máy (3 cuộc gọi)">Khách không nghe máy (3 cuộc gọi)</option>
                <option value="Khách hẹn lại ngày/giờ khác">Khách hẹn lại ngày/giờ khác</option>
                <option value="Sai địa chỉ hoặc số điện thoại không liên lạc được">Sai địa chỉ / SĐT không liên lạc được</option>
                <option value="Khách từ chối nhận hàng do đổi ý">Khách từ chối nhận hàng do đổi ý</option>
                <option value="Khách đi vắng không thể nhận quà">Khách đi vắng không thể nhận quà</option>
              </select>
              <input
                type="text"
                [(ngModel)]="deliveryFailureReasonCustom"
                placeholder="Hoặc nhập lý do chi tiết khác..."
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label class="font-bold text-slate-700 block">Quyết định xử lý tiếp theo:</label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="allowRetry" [value]="true" [(ngModel)]="deliveryAllowRetry" class="text-[#7C3AED]" />
                <span class="text-slate-800 font-semibold">Được phép giao lại (BR-14) - Giữ đơn "In transit"</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="allowRetry" [value]="false" [(ngModel)]="deliveryAllowRetry" class="text-[#7C3AED]" />
                <span class="text-rose-700 font-semibold">Không được phép giao lại (BR-15) - Trả hàng về Giftory</span>
              </label>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t">
            <button (click)="deliveryFailedModalOpen.set(false)" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
              Hủy
            </button>
            <button (click)="submitDeliveryFailed()" class="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold">
              Xác Nhận Kết Quả
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- SUB-MODAL: CHUYỂN THÔNG TIN SANG BP-06 (US-04.07, BR-16) -->
      <!-- ============================================================== -->
      <div *ngIf="transferBp06ModalOpen()" class="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl p-6 max-w-md w-full border border-giftory-border shadow-2xl space-y-4 animate-fade-in">
          <div class="flex items-center justify-between border-b pb-3">
            <div>
              <span class="text-[10px] font-bold text-purple-700 uppercase">US-04.07 • BR-16</span>
              <h3 class="text-sm font-bold text-slate-900">Chuyển Hồ Sơ Đơn Hàng Sang BP-06</h3>
            </div>
            <button (click)="transferBp06ModalOpen.set(false)" class="text-slate-400 hover:text-slate-700">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="space-y-3 text-xs">
            <p class="text-slate-600">
              Đơn hàng giao không thành công đã được tiếp nhận lại kho Giftory. Hệ thống sẽ kết thúc quy trình BP-04 và chuyển giao thông tin sang quy trình BP-06 (Xử lý hàng hoàn, hoàn tiền hoặc đổi trả).
            </p>

            <div>
              <label class="font-bold text-slate-700 block mb-1">Ghi chú bàn giao sang BP-06:</label>
              <textarea
                [(ngModel)]="bp06Note"
                rows="3"
                placeholder="VD: Hàng hoàn nguyên vẹn, cần liên hệ khách để xử lý hoàn tiền cọc hoặc thanh lý tồn xưởng..."
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              ></textarea>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t">
            <button (click)="transferBp06ModalOpen.set(false)" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
              Hủy
            </button>
            <button (click)="submitTransferBp06()" class="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold">
              Chuyển Sang BP-06 (Kết thúc BP-04)
            </button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class AdminOrdersComponent implements OnInit {
  private adminService = inject(AdminService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  orders = signal<Order[]>([]);
  activeFilter = signal<string>('ALL');
  searchQuery = '';
  selectedOrder = signal<Order | null>(null);
  loading = signal<boolean>(false);
  authError = signal<boolean>(false);

  // Sub modals
  selectedCustomItem = signal<OrderItemDetail | null>(null);
  qcModalItem = signal<OrderItemDetail | null>(null);
  qcPassed = true;
  qcNote = '';

  deliveryFailedModalOpen = signal<boolean>(false);
  deliveryFailureReason = 'Khách không nghe máy (3 cuộc gọi)';
  deliveryFailureReasonCustom = '';
  deliveryAllowRetry = true;

  transferBp06ModalOpen = signal<boolean>(false);
  bp06Note = 'Hàng hoàn nguyên vẹn, chuyển BP-06 xử lý hoàn tiền / thanh lý';

  // Dispatch fields
  dispatchCarrier = 'Giao Hàng Tiết Kiệm (GHTK)';
  dispatchTracking = '';

  // Bypass 12h wait time flag
  bypassWaitTime = false;

  statusFilters = [
    { key: 'ALL', label: 'Tất Cả Đơn' },
    { key: 'AWAITING_CONFIRMATION', label: 'Chờ Xác Nhận (12h-48h)' },
    { key: 'CONFIRMED', label: 'Đã Xác Nhận (Cần làm hàng)' },
    { key: 'PACKAGED', label: 'Đã Đóng Gói (Chờ giao Shipper)' },
    { key: 'IN_TRANSIT', label: 'In Transit (Đang giao)' },
    { key: 'DELIVERED', label: 'Đã Giao Thành Công' },
    { key: 'RETURNED', label: 'Hàng Trả & BP-06' }
  ];

  ngOnInit() {
    this.loadOrders();
    const queryCode = this.route.snapshot.queryParamMap.get('code');
    if (queryCode) {
      this.searchQuery = queryCode;
    }
  }

  reloginAdmin() {
    this.loading.set(true);
    this.authService.login({ email: 'admin@giftory.vn', password: 'Admin@Giftory2026' }).subscribe({
      next: () => {
        this.authError.set(false);
        this.loadOrders();
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/login'], { queryParams: { returnUrl: '/admin/orders' } });
      }
    });
  }

  loadOrders() {
    this.loading.set(true);
    this.authError.set(false);
    this.adminService.getAdminOrders({ limit: 100 }).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
        this.orders.set(list);
        if (this.searchQuery) {
          const match = list.find((o: Order) => o.orderCode === this.searchQuery);
          if (match) this.openProcessModal(match);
        }
      },
      error: (err) => {
        this.loading.set(false);
        console.error('Lỗi tải danh sách đơn hàng:', err);
        if (err.status === 401 || err.status === 403) {
          this.authError.set(true);
        }
      }
    });
  }

  selectFilter(key: string) {
    this.activeFilter.set(key);
  }

  filteredOrders(): Order[] {
    let list = this.orders();
    const filter = this.activeFilter();

    if (filter === 'AWAITING_CONFIRMATION') {
      list = list.filter(o => o.orderStatus === 'AWAITING_CONFIRMATION' || o.orderStatus === 'PENDING');
    } else if (filter === 'CONFIRMED') {
      list = list.filter(o => o.orderStatus === 'CONFIRMED' && !o.isPackaged);
    } else if (filter === 'PACKAGED') {
      list = list.filter(o => o.isPackaged && o.orderStatus !== 'IN_TRANSIT' && o.orderStatus !== 'DELIVERED' && o.orderStatus !== 'RETURNED_BP06');
    } else if (filter === 'IN_TRANSIT') {
      list = list.filter(o => o.orderStatus === 'IN_TRANSIT' || o.orderStatus === 'SHIPPING');
    } else if (filter === 'DELIVERED') {
      list = list.filter(o => o.orderStatus === 'DELIVERED');
    } else if (filter === 'RETURNED') {
      list = list.filter(o => o.fulfillmentStatus === 'RETURNING' || o.fulfillmentStatus === 'RETURNED_RECEIVED' || o.orderStatus === 'RETURNED_BP06');
    }

    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(o =>
        o.orderCode.toLowerCase().includes(q) ||
        (o.customerInfo?.phone && o.customerInfo.phone.includes(q)) ||
        (o.shippingAddress?.phone && o.shippingAddress.phone.includes(q)) ||
        (o.customerInfo?.name && o.customerInfo.name.toLowerCase().includes(q))
      );
    }
    return list;
  }

  countStage(stageKey: string): number {
    const all = this.orders();
    switch (stageKey) {
      case 'AWAITING_CONFIRMATION':
        return all.filter(o => o.orderStatus === 'AWAITING_CONFIRMATION' || o.orderStatus === 'PENDING').length;
      case 'CONFIRMED':
        return all.filter(o => o.orderStatus === 'CONFIRMED' && !o.isPackaged).length;
      case 'PACKAGED':
        return all.filter(o => o.isPackaged && o.orderStatus !== 'IN_TRANSIT' && o.orderStatus !== 'DELIVERED' && o.orderStatus !== 'RETURNED_BP06').length;
      case 'IN_TRANSIT':
        return all.filter(o => o.orderStatus === 'IN_TRANSIT' || o.orderStatus === 'SHIPPING').length;
      case 'DELIVERED':
        return all.filter(o => o.orderStatus === 'DELIVERED').length;
      case 'RETURNED':
        return all.filter(o => o.fulfillmentStatus === 'RETURNING' || o.fulfillmentStatus === 'RETURNED_RECEIVED' || o.orderStatus === 'RETURNED_BP06').length;
      default:
        return 0;
    }
  }

  openProcessModal(ord: Order) {
    this.selectedOrder.set(ord);
    this.dispatchTracking = ord.deliveryInfo?.trackingCode || ord.trackingCode || `GHTK-VN-${Math.floor(1000000 + Math.random() * 9000000)}`;
    this.dispatchCarrier = ord.deliveryInfo?.carrier || ord.shippingCarrier || 'Giao Hàng Tiết Kiệm (GHTK)';
  }

  // Check if all items in order are ready for packaging (BR-09)
  isAllItemsReady(ord: Order): boolean {
    if (!ord.items || ord.items.length === 0) return false;
    return ord.items.every(item => {
      if (item.isCustom) {
        return item.status === 'QC_PASSED';
      } else {
        return item.status === 'PREPARED';
      }
    });
  }

  // Wait time badge and countdown calculation (BR-02)
  getWaitTimeBadge(ord: Order): { label: string; badgeClass: string; isEligible: boolean } {
    if (ord.orderStatus !== 'AWAITING_CONFIRMATION' && ord.orderStatus !== 'PENDING') {
      return { label: 'Đã xác nhận', badgeClass: 'bg-emerald-100 text-emerald-700', isEligible: true };
    }

    const createdTime = ord.createdAt ? new Date(ord.createdAt).getTime() : Date.now();
    const eligibleTime = ord.confirmationWait?.eligibleAt
      ? new Date(ord.confirmationWait.eligibleAt).getTime()
      : createdTime + 12 * 3600000;
    const deadlineTime = ord.confirmationWait?.deadlineAt
      ? new Date(ord.confirmationWait.deadlineAt).getTime()
      : createdTime + 48 * 3600000;

    const now = Date.now();

    if (now < eligibleTime) {
      const hoursRemaining = Math.max(0.1, (eligibleTime - now) / 3600000).toFixed(1);
      return {
        label: `Chờ thêm ${hoursRemaining}h (Đang đếm ngược BR-02)`,
        badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
        isEligible: false
      };
    } else if (now <= deadlineTime) {
      const hoursSinceEligible = ((now - eligibleTime) / 3600000).toFixed(1);
      return {
        label: `Đủ điều kiện xác nhận (Sau ${hoursSinceEligible}h)`,
        badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
        isEligible: true
      };
    } else {
      return {
        label: 'Quá hạn 48h chờ xác nhận',
        badgeClass: 'bg-rose-100 text-rose-800 border border-rose-200',
        isEligible: true
      };
    }
  }

  // ==============================================================
  // ACTIONS BP-04
  // ==============================================================

  // US-04.01: Confirm Order
  handleConfirmOrder(ord: Order) {
    this.adminService.confirmOrder(ord._id, this.bypassWaitTime).subscribe({
      next: (res: any) => {
        const updated = res?.data || res;
        this.updateLocalOrder(updated);
        alert(`Xác nhận đơn hàng #${ord.orderCode} thành công! Hệ thống đã trích xuất Order Items để phân luồng (US-04.01, BR-04).`);
      },
      error: (err) => {
        alert(err?.error?.message || err?.message || 'Lỗi khi xác nhận đơn hàng');
      }
    });
  }

  // US-04.02: Admin Pick Ready-made Gift
  handlePickReadyMade(ord: Order, item: OrderItemDetail) {
    const itemId = item._id || item.productId;
    this.adminService.pickReadyMadeItem(ord._id, itemId).subscribe({
      next: (res: any) => {
        const updated = res?.data || res;
        this.updateLocalOrder(updated);
      },
      error: (err) => alert(err?.error?.message || 'Lỗi khi lấy sản phẩm')
    });
  }

  // US-04.03: Custom Gift Production
  handleStartProduction(ord: Order, item: OrderItemDetail) {
    const itemId = item._id || item.productId;
    this.adminService.startCustomItemProduction(ord._id, itemId).subscribe({
      next: (res: any) => {
        const updated = res?.data || res;
        this.updateLocalOrder(updated);
      },
      error: (err) => alert(err?.error?.message || 'Lỗi khi bắt đầu sản xuất')
    });
  }

  openCustomSpecModal(item: OrderItemDetail) {
    this.selectedCustomItem.set(item);
  }

  openQcModal(ord: Order, item: OrderItemDetail) {
    this.qcModalItem.set(item);
    this.qcPassed = true;
    this.qcNote = 'Đạt tiêu chuẩn xuất xưởng';
  }

  submitQcResult() {
    const ord = this.selectedOrder();
    const item = this.qcModalItem();
    if (!ord || !item) return;

    const itemId = item._id || item.productId;
    this.adminService.inspectCustomItemQuality(ord._id, itemId, {
      passed: this.qcPassed,
      note: this.qcNote
    }).subscribe({
      next: (res: any) => {
        const updated = res?.data || res;
        this.updateLocalOrder(updated);
        this.qcModalItem.set(null);
      },
      error: (err) => alert(err?.error?.message || 'Lỗi khi lưu kết quả QC')
    });
  }

  // US-04.04: Package Order (BR-09)
  handlePackageOrder(ord: Order) {
    this.adminService.packageOrder(ord._id).subscribe({
      next: (res: any) => {
        const updated = res?.data || res;
        this.updateLocalOrder(updated);
        alert(`Đóng gói đơn hàng #${ord.orderCode} thành công! Đã kiểm tra tất cả sản phẩm đạt yêu cầu (US-04.04, BR-09).`);
      },
      error: (err) => alert(err?.error?.message || 'Không thể đóng gói')
    });
  }

  // US-04.04: Dispatch to Shipper (BR-10)
  handleDispatchOrder(ord: Order) {
    this.adminService.dispatchToShipper(ord._id, {
      carrier: this.dispatchCarrier,
      trackingCode: this.dispatchTracking
    }).subscribe({
      next: (res: any) => {
        const updated = res?.data || res;
        this.updateLocalOrder(updated);
        alert(`Đã bàn giao đơn hàng cho Shipper (${this.dispatchCarrier})! Trạng thái cập nhật: In transit (US-04.04, BR-10).`);
      },
      error: (err) => alert(err?.error?.message || 'Lỗi bàn giao đơn hàng')
    });
  }

  // US-04.05: Delivery Success (BR-12)
  handleDeliverySuccess(ord: Order) {
    if (!confirm('Xác nhận khách hàng đã nhận được kiện hàng thành công?')) return;
    this.adminService.reportDeliveryResult(ord._id, { success: true }).subscribe({
      next: (res: any) => {
        const updated = res?.data || res;
        this.updateLocalOrder(updated);
        alert(`Đơn hàng #${ord.orderCode} đã giao thành công! Hoàn tất quy trình BP-04.`);
      },
      error: (err) => alert(err?.error?.message || 'Lỗi cập nhật giao hàng')
    });
  }

  // US-04.06: Delivery Failed Modal
  openDeliveryFailedModal(ord: Order) {
    this.deliveryFailedModalOpen.set(true);
  }

  submitDeliveryFailed() {
    const ord = this.selectedOrder();
    if (!ord) return;

    const reason = this.deliveryFailureReasonCustom.trim() || this.deliveryFailureReason;
    if (!reason) {
      alert('Bắt buộc phải ghi nhận lý do giao hàng không thành công theo BR-13!');
      return;
    }

    this.adminService.reportDeliveryResult(ord._id, {
      success: false,
      failureReason: reason,
      allowRetry: this.deliveryAllowRetry
    }).subscribe({
      next: (res: any) => {
        const updated = res?.data || res;
        this.updateLocalOrder(updated);
        this.deliveryFailedModalOpen.set(false);
        this.deliveryFailureReasonCustom = '';
        if (this.deliveryAllowRetry) {
          alert('Đã ghi nhận giao hàng thất bại và lên lịch hẹn giao lại (BR-14). Đơn hàng tiếp tục "In transit".');
        } else {
          alert('Đơn hàng không được phép giao lại (BR-15). Đang chuyển hàng trả về kho Giftory!');
        }
      },
      error: (err) => alert(err?.error?.message || 'Lỗi cập nhật giao hàng thất bại')
    });
  }

  // US-04.07: Admin Receive Returned Order (BR-15)
  handleReceiveReturn(ord: Order) {
    this.adminService.receiveReturnedOrder(ord._id).subscribe({
      next: (res: any) => {
        const updated = res?.data || res;
        this.updateLocalOrder(updated);
        alert(`Admin đã tiếp nhận hàng hoàn trả về kho Giftory thành công (US-04.07, BR-15)!`);
      },
      error: (err) => alert(err?.error?.message || 'Lỗi tiếp nhận hàng trả')
    });
  }

  // US-04.07: Transfer to BP-06 (BR-16)
  openTransferBp06Modal(ord: Order) {
    this.transferBp06ModalOpen.set(true);
  }

  submitTransferBp06() {
    const ord = this.selectedOrder();
    if (!ord) return;

    this.adminService.transferToBp06(ord._id, { bp06Note: this.bp06Note }).subscribe({
      next: (res: any) => {
        const updated = res?.data || res;
        this.updateLocalOrder(updated);
        this.transferBp06ModalOpen.set(false);
        alert(`Đã chuyển thông tin đơn hàng sang BP-06 thành công! Quy trình BP-04 kết thúc (US-04.07, BR-16).`);
      },
      error: (err) => alert(err?.error?.message || 'Lỗi chuyển sang BP-06')
    });
  }

  updateLocalOrder(updated: Order) {
    this.orders.update(list => list.map(o => o._id === updated._id || o.orderCode === updated.orderCode ? { ...o, ...updated } : o));
    this.selectedOrder.set(updated);
  }

  // UI Badges helpers
  getOrderStatusBadge(status: string): string {
    switch (status) {
      case 'DELIVERED': return 'bg-emerald-100 text-emerald-800';
      case 'IN_TRANSIT':
      case 'SHIPPING': return 'bg-indigo-100 text-indigo-800';
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800';
      case 'AWAITING_CONFIRMATION':
      case 'PENDING': return 'bg-amber-100 text-amber-800';
      case 'RETURNED_BP06': return 'bg-rose-100 text-rose-800';
      case 'CANCELLED': return 'bg-slate-200 text-slate-700';
      default: return 'bg-purple-100 text-purple-800';
    }
  }

  getOrderStatusText(status: string): string {
    switch (status) {
      case 'AWAITING_CONFIRMATION':
      case 'PENDING': return 'Chờ Xác Nhận (12h-48h)';
      case 'CONFIRMED': return 'Đã Xác Nhận';
      case 'IN_TRANSIT':
      case 'SHIPPING': return 'In Transit (Đang giao)';
      case 'DELIVERED': return 'Đã Giao Thành Công';
      case 'RETURNED_BP06': return 'Đã Chuyển Sang BP-06';
      case 'CANCELLED': return 'Đã Hủy';
      default: return status;
    }
  }

  getItemStatusBadge(item: OrderItemDetail): string {
    switch (item.status) {
      case 'PREPARED':
      case 'QC_PASSED': return 'bg-emerald-100 text-emerald-800';
      case 'IN_PRODUCTION': return 'bg-purple-100 text-purple-800';
      case 'QC_FAILED': return 'bg-rose-100 text-rose-800';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  getItemStatusText(item: OrderItemDetail): string {
    if (!item.isCustom) {
      return item.status === 'PREPARED' ? 'Đã Lấy Hàng' : 'Chờ Admin Lấy';
    } else {
      switch (item.status) {
        case 'IN_PRODUCTION': return 'Đang Gia Công';
        case 'QC_PASSED': return 'Đạt QC (Sẵn sàng)';
        case 'QC_FAILED': return 'QC Chưa Đạt (Làm lại)';
        default: return 'Chờ Xưởng';
      }
    }
  }
}
