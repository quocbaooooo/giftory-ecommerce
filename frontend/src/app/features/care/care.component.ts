import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-care',
  imports: [CommonModule, FormsModule, RouterModule],
  styles: [`
    @keyframes pulseSoft {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.85; }
    }
    .pulse-soft { animation: pulseSoft 3s ease-in-out infinite; }
  `],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <!-- HERO HEADER & TRUST BADGES -->
      <section class="space-y-6">
        <!-- Breadcrumb -->
        <nav class="flex items-center text-xs text-slate-500 space-x-2 font-medium">
          <a routerLink="/" class="hover:text-purple-600 transition flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">home</span>
            <span>Trang chủ</span>
          </a>
          <span class="text-slate-300">/</span>
          <span class="text-slate-900 font-bold">Trung tâm Hậu mãi & Hỗ trợ</span>
        </nav>

        <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-purple-100">
          <div>
            <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold mb-3 border border-purple-200">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              CSKH Đang Hoạt Động (08:00 – 22:00 hôm nay)
            </div>
            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              {{ admin ? 'Chăm Sóc Khách Hàng & Kiểm Duyệt' : 'Hậu Mãi & Hỗ Trợ Đơn Hàng' }}
            </h1>
            <p class="mt-2 text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Tất cả món quà trao gửi từ <strong class="text-purple-700 font-bold">Giftory</strong> đều được cam kết bảo hành 1 đổi 1, kiểm tra khắc laser tỉ mỉ và đồng hành trọn vẹn 100% yêu thương.
            </p>
          </div>

          <!-- Top Action Buttons -->
          <div class="flex flex-wrap items-center gap-2.5">
            <button type="button" (click)="load()" [disabled]="busy()"
              class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 font-bold text-xs shadow-xs transition active:scale-95 disabled:opacity-50">
              <span class="material-symbols-outlined text-[18px]">refresh</span>
              <span>Làm mới dữ liệu</span>
            </button>
            <a routerLink="/orders"
              class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm transition active:scale-95">
              <span class="material-symbols-outlined text-[18px]">local_shipping</span>
              <span>Theo dõi đơn hàng</span>
            </a>
          </div>
        </div>

        <!-- System Alerts / Status Messages -->
        @if (error()) {
          <div role="alert" class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[18px]">error</span>
              <span>{{ error() }}</span>
            </div>
            <button type="button" (click)="error.set('')" class="text-rose-400 hover:text-rose-700">✕</button>
          </div>
        }
        @if (message()) {
          <div role="status" class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{{ message() }}</span>
            </div>
            <button type="button" (click)="message.set('')" class="text-emerald-400 hover:text-emerald-700">✕</button>
          </div>
        }

        <!-- Trust Badges & Metrics Row -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div class="bg-white p-4 rounded-2xl border border-purple-100/80 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[20px]">schedule</span>
            </div>
            <div>
              <div class="text-[11px] text-slate-500 font-medium">Tốc độ phản hồi</div>
              <div class="text-sm font-extrabold text-slate-900">Dưới 15 Phút</div>
            </div>
          </div>
          <div class="bg-white p-4 rounded-2xl border border-purple-100/80 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[20px]">verified_user</span>
            </div>
            <div>
              <div class="text-[11px] text-slate-500 font-medium">Bảo hành 1 đổi 1</div>
              <div class="text-sm font-extrabold text-slate-900">7 Ngày Miễn Phí</div>
            </div>
          </div>
          <div class="bg-white p-4 rounded-2xl border border-purple-100/80 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[20px]">security</span>
            </div>
            <div>
              <div class="text-[11px] text-slate-500 font-medium">Bảo lưu cọc 50%</div>
              <div class="text-sm font-extrabold text-slate-900">Trước Khi Khắc</div>
            </div>
          </div>
          <div class="bg-white p-4 rounded-2xl border border-purple-100/80 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[20px]">support_agent</span>
            </div>
            <div>
              <div class="text-[11px] text-slate-500 font-medium">Hotline kỹ thuật</div>
              <div class="text-sm font-extrabold text-slate-900">1900 888 999</div>
            </div>
          </div>
        </div>
      </section>

      <!-- MAIN WORKSPACE: 8 COLS LEFT + 4 COLS RIGHT -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- LEFT COLUMN (8 COLS): Interactive Working Areas -->
        <div class="lg:col-span-8 space-y-6">

          <!-- 1. NOTIFICATION CENTER (Customer only) -->
          @if (!admin && notices().length > 0) {
            <section class="bg-white rounded-3xl p-6 shadow-xs border border-purple-100">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2.5">
                  <span class="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <span class="material-symbols-outlined text-[18px]">notifications</span>
                  </span>
                  <h2 class="text-base sm:text-lg font-bold text-slate-900">Thông báo từ ban chăm sóc</h2>
                </div>
                <span class="text-xs bg-purple-50 text-purple-700 font-semibold px-2.5 py-1 rounded-full border border-purple-200">
                  {{ notices().length }} thông báo
                </span>
              </div>

              <div class="space-y-3">
                @for (n of notices(); track n._id) {
                  <div class="bg-purple-50/40 border border-purple-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-all hover:bg-purple-50/70">
                    <div class="flex items-start gap-3">
                      <div class="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                        [class]="n.status === 'SENT' ? 'bg-purple-600 animate-ping' : 'bg-slate-300'"></div>
                      <div>
                        <p class="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">{{ n.text }}</p>
                        <div class="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                          <span>{{ n.sentAt | date: 'dd/MM/yyyy HH:mm' }}</span>
                          @if (n.href?.startsWith('https://zalo.me/')) {
                            <a [href]="n.href" target="_blank" rel="noopener" class="text-purple-700 font-bold hover:underline inline-flex items-center gap-1">
                              <span>Chat Zalo CSKH</span>
                              <span class="material-symbols-outlined text-[13px]">open_in_new</span>
                            </a>
                          }
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center gap-2 shrink-0">
                      @if (n.status === 'SENT') {
                        @if (n.kind === 'REVIEW_INVITE') {
                          <button type="button" (click)="selectOrder(n.orderId)"
                            class="px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition shadow-xs">
                            Viết đánh giá
                          </button>
                        }
                        <button type="button" [disabled]="busy()" (click)="dismiss(n)"
                          class="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium transition">
                          {{ n.kind === 'REVIEW_INVITE' ? 'Bỏ qua' : 'Đã đọc' }}
                        </button>
                      } @else {
                        <span class="text-xs text-slate-400 font-medium">Đã xử lý</span>
                      }
                    </div>
                  </div>
                }
              </div>
            </section>
          }

          <!-- 2. SELECT ORDER & CREATE SUPPORT TICKET / REVIEW -->
          @if (!admin) {
            <section class="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-purple-100 space-y-6">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-purple-50">
                <div>
                  <h2 class="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span class="material-symbols-outlined text-purple-700 text-[20px]">inventory_2</span>
                    <span>Chọn Đơn Hàng Cần Hỗ Trợ</span>
                  </h2>
                  <p class="text-xs text-slate-500 mt-0.5">Chọn đơn hàng để đánh giá chất lượng, sửa chi tiết khắc, hủy hoặc gửi yêu cầu bảo hành</p>
                </div>
              </div>

              <!-- Order Select Dropdown / Quick Selector -->
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Danh sách đơn hàng của bạn:
                </label>
                <select [ngModel]="orderId" (ngModelChange)="selectOrder($event)"
                  class="w-full bg-slate-50 border border-purple-200 rounded-xl p-3 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600">
                  <option value="">-- Vui lòng chọn đơn hàng --</option>
                  @for (o of orders(); track o._id) {
                    <option [value]="o._id">
                      Đơn #{{ o.orderCode }} — {{ label(o.orderStatus) }} ({{ o.pricing?.totalAmount | number }}₫)
                    </option>
                  }
                </select>
              </div>

              <!-- Selected Order Details & Actions -->
              @if (selectedOrder; as o) {
                <div class="border-2 border-purple-500/80 bg-purple-50/30 rounded-2xl p-5 space-y-4">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-100">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-extrabold text-sm text-slate-900">#{{ o.orderCode }}</span>
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                          {{ label(o.orderStatus) }}
                        </span>
                      </div>
                      <p class="text-xs text-slate-500 mt-1">
                        Tổng tiền: <strong class="text-purple-700 font-bold">{{ o.pricing.totalAmount | number }}₫</strong>
                        @if (o.paymentMode === 'DEPOSIT_50') {
                          <span>(Cọc 50%: {{ o.pricing.depositAmount | number }}₫)</span>
                        }
                      </p>
                    </div>

                    <!-- Cancel / Refund Actions -->
                    <div>
                      @if (o.refundPending) {
                        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                          <span class="material-symbols-outlined text-[16px]">hourglass_empty</span>
                          Đang chờ cổng thanh toán xác nhận hoàn tiền
                        </span>
                      } @else if (canCancel(o)) {
                        <button type="button" [disabled]="busy()" (click)="cancel(o)"
                          class="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition">
                          Yêu cầu hủy đơn & hoàn cọc
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Chọn sản phẩm cụ thể nếu đơn có nhiều món -->
                  @if (o.items && o.items.length > 0) {
                    <div>
                      <label class="block text-xs font-bold text-slate-700 mb-1">Sản phẩm liên quan đến yêu cầu:</label>
                      <select [(ngModel)]="productId"
                        class="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600">
                        <option value="">Toàn bộ đơn hàng</option>
                        @for (i of o.items; track $index) {
                          <option [value]="i.productId?._id || i.productId">{{ i.productName || i.name }}</option>
                        }
                      </select>
                    </div>
                  }

                  <!-- Tab Form: Tạo Case Hỗ Trợ -->
                  <div class="pt-2 border-t border-purple-100 space-y-4">
                    <h3 class="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span class="material-symbols-outlined text-purple-700 text-[18px]">contact_support</span>
                      <span>Gửi Yêu Cầu Hỗ Trợ / Đổi Trả / Khiếu Nại</span>
                    </h3>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button type="button" (click)="caseType = 'SUPPORT'"
                        class="p-2.5 rounded-xl text-xs font-bold border transition text-center"
                        [class]="caseType === 'SUPPORT' ? 'border-purple-600 bg-purple-50 text-purple-800' : 'border-slate-200 bg-white text-slate-700 hover:border-purple-300'">
                        🛠️ Hỗ trợ kỹ thuật
                      </button>
                      <button type="button" (click)="caseType = 'RETURN'"
                        class="p-2.5 rounded-xl text-xs font-bold border transition text-center"
                        [class]="caseType === 'RETURN' ? 'border-purple-600 bg-purple-50 text-purple-800' : 'border-slate-200 bg-white text-slate-700 hover:border-purple-300'">
                        🔄 Đổi mới / Đổi trả
                      </button>
                      <button type="button" (click)="caseType = 'COMPLAINT'"
                        class="p-2.5 rounded-xl text-xs font-bold border transition text-center"
                        [class]="caseType === 'COMPLAINT' ? 'border-purple-600 bg-purple-50 text-purple-800' : 'border-slate-200 bg-white text-slate-700 hover:border-purple-300'">
                        ⚠️ Khiếu nại dịch vụ
                      </button>
                    </div>

                    @if (caseType !== 'SUPPORT') {
                      <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Lý do chính (Bắt buộc):</label>
                        <input [(ngModel)]="reason" maxlength="1000" placeholder="Ví dụ: Cốc bị mẻ men góc viền khi bóc hộp quà"
                          class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600">
                      </div>
                    }

                    <div>
                      <label class="block text-xs font-bold text-slate-700 mb-1">Mô tả chi tiết vấn đề:</label>
                      <textarea [(ngModel)]="description" maxlength="5000" rows="3"
                        placeholder="Mô tả cụ thể thời điểm nhận hàng, tình trạng sản phẩm để xưởng Giftory xử lý nhanh nhất..."
                        class="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"></textarea>
                    </div>

                    <div>
                      <label class="block text-xs font-bold text-slate-700 mb-1">Hình ảnh / video chứng minh:</label>
                      <div class="flex items-center gap-3">
                        <input type="file" accept="image/png,image/jpeg,image/webp,video/mp4,application/pdf" multiple
                          (change)="upload($event, 'case')" [disabled]="busy()"
                          class="text-xs text-slate-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200">
                        @if (caseFiles.length) {
                          <span class="text-xs text-purple-700 font-semibold">{{ caseFiles.length }} tệp đã tải</span>
                          <button type="button" (click)="caseFiles = []" class="text-xs text-rose-500 hover:underline">Xóa</button>
                        }
                      </div>
                    </div>

                    <button type="button" (click)="createCase()"
                      [disabled]="busy() || description.trim().length < 10 || (caseType !== 'SUPPORT' && reason.trim().length < 3)"
                      class="w-full py-3 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition disabled:opacity-40">
                      Gửi Yêu Cầu Hỗ Trợ
                    </button>
                  </div>

                  <!-- Đánh giá đơn hàng nếu đã giao (DELIVERED) -->
                  @if (o.orderStatus === 'DELIVERED') {
                    <div class="pt-4 border-t border-purple-100 space-y-3">
                      <div class="flex items-center justify-between">
                        <h3 class="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <span class="material-symbols-outlined text-amber-500 text-[18px]">star</span>
                          <span>Đánh Giá Trải Nghiệm Món Quà</span>
                        </h3>
                        <span class="text-xs font-bold text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-200">
                          +50 Điểm Thưởng
                        </span>
                      </div>

                      <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-slate-700">Mức độ hài lòng:</span>
                        <div class="flex items-center gap-1">
                          @for (r of [1, 2, 3, 4, 5]; track r) {
                            <button type="button" (click)="rating = r"
                              class="text-xl transition hover:scale-125"
                              [class]="rating >= r ? 'text-amber-400' : 'text-slate-300'">
                              ★
                            </button>
                          }
                          <span class="text-xs font-bold text-slate-600 ml-2">({{ rating }} sao)</span>
                        </div>
                      </div>

                      <textarea [(ngModel)]="reviewContent" maxlength="3000" rows="2"
                        placeholder="Chia sẻ cảm xúc khi mở hộp quà, chất lượng khắc laser hoặc độ đẹp của nơ lụa (tối thiểu 10 ký tự)..."
                        class="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"></textarea>

                      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div class="flex items-center gap-2">
                          <input type="file" accept="image/png,image/jpeg,image/webp,video/mp4" multiple
                            (change)="upload($event, 'review')" [disabled]="busy()"
                            class="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700">
                          @if (reviewFiles.length) {
                            <span class="text-xs text-purple-700 font-semibold">{{ reviewFiles.length }} ảnh/video</span>
                            <button type="button" (click)="reviewFiles = []" class="text-xs text-rose-500 hover:underline">Xóa</button>
                          }
                        </div>

                        <button type="button" (click)="submitReview()"
                          [disabled]="busy() || !productId || reviewContent.trim().length < 10"
                          class="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm transition disabled:opacity-40">
                          Gửi Đánh Giá (+50 Điểm)
                        </button>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="text-center py-6 bg-slate-50/70 rounded-2xl border border-dashed border-purple-200 text-xs text-slate-500">
                  Vui lòng chọn một đơn hàng ở trên để bắt đầu tạo yêu cầu khiếu nại, hủy hoặc đánh giá.
                </div>
              }
            </section>
          }

          <!-- 3. SUPPORT TICKETS / CASES PROGRESS LIST -->
          <section class="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-purple-100 space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-purple-50">
              <div class="flex items-center gap-2">
                <span class="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <span class="material-symbols-outlined text-[18px]">assignment</span>
                </span>
                <h2 class="text-base sm:text-lg font-bold text-slate-900">
                  {{ admin ? 'Hồ Sơ Hỗ Trợ & Khiếu Nại Cần Xử Lý' : 'Hồ Sơ & Tiến Trình Xử Lý' }}
                </h2>
              </div>
              <span class="text-xs bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-full">
                {{ cases().length }} hồ sơ
              </span>
            </div>

            <div class="space-y-4">
              @for (c of cases(); track c._id) {
                <article class="bg-purple-50/30 border border-purple-100 rounded-2xl p-5 space-y-3.5">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="px-2.5 py-0.5 rounded-lg bg-purple-700 text-white font-mono text-xs font-bold">
                        {{ label(c.type) }}
                      </span>
                      <span class="text-xs text-slate-600 font-medium">
                        Đơn: <strong class="text-slate-900">#{{ c.orderId?.orderCode || c._id }}</strong>
                      </span>
                    </div>

                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                      [class]="c.status === 'CLOSED' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'">
                      <span class="w-2 h-2 rounded-full mr-1.5"
                        [class]="c.status === 'CLOSED' ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'"></span>
                      {{ label(c.status) }}
                    </span>
                  </div>

                  @if (c.reason) {
                    <p class="text-xs font-bold text-slate-800">Lý do: {{ c.reason }}</p>
                  }
                  <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">{{ c.description }}</p>

                  <!-- Bằng chứng đính kèm -->
                  @if (c.attachments && c.attachments.length > 0) {
                    <div class="flex items-center gap-2 flex-wrap pt-1">
                      <span class="text-xs font-bold text-slate-500">Tệp đính kèm:</span>
                      @for (file of c.attachments; track file) {
                        <button type="button" (click)="download(file)"
                          class="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-purple-700 text-xs font-semibold hover:bg-purple-50 transition flex items-center gap-1">
                          <span class="material-symbols-outlined text-[14px]">download</span>
                          <span>Tải tệp #{{ file.slice(-6) }}</span>
                        </button>
                      }
                    </div>
                  }

                  <!-- Tin nhắn trao đổi -->
                  @if (c.messages && c.messages.length > 0) {
                    <div class="space-y-2 pt-2 border-t border-purple-100">
                      @for (m of c.messages; track $index) {
                        <div class="p-3 rounded-xl bg-white border border-purple-100 text-xs leading-relaxed">
                          <strong class="text-purple-700">{{ m.author }}:</strong>
                          <span class="text-slate-700 ml-1">{{ m.text }}</span>
                        </div>
                      }
                    </div>
                  }

                  @if (c.resolution) {
                    <div class="p-3 rounded-xl bg-purple-100/70 text-xs text-purple-900 font-medium">
                      <strong>Phương án xử lý:</strong> {{ label(c.resolution) }} — {{ c.result || 'Đang tiến hành' }}
                    </div>
                  }

                  <!-- Admin Management Panel -->
                  @if (admin) {
                    <div class="pt-3 border-t border-purple-200/80 space-y-3">
                      <details class="text-xs text-slate-500">
                        <summary class="cursor-pointer font-bold text-purple-700">Xem chi tiết JSON dữ liệu đơn hàng</summary>
                        <pre class="bg-slate-900 text-slate-100 p-3 rounded-xl mt-2 overflow-auto text-[11px] max-h-48">{{ c.orderId | json }}</pre>
                      </details>

                      @if (c.status !== 'CLOSED') {
                        <div class="space-y-2">
                          <label class="block text-xs font-bold text-slate-700">Nhắn khách hàng:</label>
                          <textarea [(ngModel)]="c.message" rows="2" class="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs"></textarea>
                          <button type="button" [disabled]="busy() || !c.message?.trim()" (click)="updateCase(c, 'NEEDS_INFO')"
                            class="px-3.5 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold">
                            Yêu cầu bổ sung
                          </button>

                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                            <div>
                              <label class="block text-xs font-bold text-slate-700">Nguyên nhân / trách nhiệm:</label>
                              <input [(ngModel)]="c.responsibility" class="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs">
                            </div>
                            <div>
                              <label class="block text-xs font-bold text-slate-700">Phương án giải quyết:</label>
                              <select [(ngModel)]="c.resolution" class="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs">
                                <option value="">-- Chọn phương án --</option>
                                @for (r of resolutions; track r) {
                                  <option [value]="r">{{ label(r) }}</option>
                                }
                              </select>
                            </div>
                          </div>

                          <div class="flex items-center gap-2 pt-1">
                            <input type="checkbox" [(ngModel)]="c.customizationChecked" id="customCheck-{{c._id}}" class="rounded text-purple-600">
                            <label [for]="'customCheck-' + c._id" class="text-xs text-slate-700">Đã đối chiếu thông số khắc laser & cấu hình tùy chỉnh</label>
                          </div>

                          <div class="flex items-center gap-2 pt-2 flex-wrap">
                            <button type="button" [disabled]="busy()" (click)="updateCase(c, 'INVESTIGATING')"
                              class="px-3 py-1.5 rounded-xl bg-purple-100 text-purple-700 text-xs font-bold">
                              Lưu xác minh
                            </button>
                            <button type="button" [disabled]="busy()" (click)="updateCase(c, 'RESOLVING')"
                              class="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold">
                              Thực hiện phương án
                            </button>
                            <button type="button" [disabled]="busy()" (click)="updateCase(c, 'CLOSED')"
                              class="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold">
                              Hoàn tất & Đóng hồ sơ
                            </button>
                          </div>
                        </div>
                      }
                    </div>
                  } @else if (c.status !== 'CLOSED') {
                    <!-- Customer reply box -->
                    <div class="pt-3 border-t border-purple-100 space-y-2">
                      <label class="block text-xs font-bold text-slate-700">Phản hồi bổ sung cho CSKH:</label>
                      <textarea [(ngModel)]="c.reply" rows="2" placeholder="Nhập thêm chi tiết hoặc trả lời chuyên viên..."
                        class="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-purple-600"></textarea>
                      <div class="flex items-center justify-between gap-2">
                        <input type="file" accept="image/png,image/jpeg,image/webp,video/mp4,application/pdf" multiple
                          (change)="upload($event, c)" [disabled]="busy()"
                          class="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-slate-100">
                        <button type="button" [disabled]="busy() || !c.reply?.trim()" (click)="reply(c)"
                          class="px-4 py-2 rounded-xl bg-purple-700 text-white text-xs font-bold transition disabled:opacity-40">
                          Gửi phản hồi
                        </button>
                      </div>
                    </div>
                  }
                </article>
              } @empty {
                <div class="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-2xl">
                  Chưa có hồ sơ hỗ trợ nào được ghi nhận.
                </div>
              }
            </div>
          </section>

          <!-- 4. REVIEWS HISTORY & MODERATION -->
          <section class="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-purple-100 space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-purple-50">
              <div class="flex items-center gap-2">
                <span class="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <span class="material-symbols-outlined text-[18px]">rate_review</span>
                </span>
                <h2 class="text-base sm:text-lg font-bold text-slate-900">
                  {{ admin ? 'Đánh Giá Chờ Kiểm Duyệt' : 'Đánh Giá Của Bạn' }}
                </h2>
              </div>
              <span class="text-xs bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-full">
                {{ reviews().length }} đánh giá
              </span>
            </div>

            <div class="space-y-3.5">
              @for (r of reviews(); track r._id) {
                <article class="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 space-y-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-amber-500 font-bold text-xs">{{ r.rating }} ★</span>
                      <strong class="text-xs text-slate-900">{{ r.author }}</strong>
                      <span class="text-[11px] text-slate-400">• Trạng thái: {{ label(r.status) }}</span>
                    </div>
                  </div>

                  <p class="text-xs text-slate-700 leading-relaxed italic">"{{ r.content }}"</p>

                  @if (r.moderationNote) {
                    <p class="text-xs text-rose-600 font-semibold bg-rose-50 p-2 rounded-lg">Ghi chú kiểm duyệt: {{ r.moderationNote }}</p>
                  }

                  @if (admin) {
                    <div class="pt-2 border-t border-slate-200 flex items-center gap-2 flex-wrap">
                      <input [(ngModel)]="r.note" placeholder="Lý do từ chối nếu có..." class="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
                      <button type="button" [disabled]="busy()" (click)="moderate(r, 'APPROVED')"
                        class="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold">
                        Duyệt
                      </button>
                      <button type="button" [disabled]="busy() || !r.note?.trim()" (click)="moderate(r, 'REJECTED')"
                        class="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold disabled:opacity-40">
                        Từ chối
                      </button>
                    </div>
                  } @else if (r.status === 'REJECTED') {
                    <button type="button" (click)="editReview(r)"
                      class="px-3 py-1 rounded-lg bg-purple-700 text-white text-xs font-bold">
                      Sửa và gửi lại
                    </button>
                  }
                </article>
              } @empty {
                <div class="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-2xl">
                  Chưa có đánh giá nào.
                </div>
              }
            </div>
          </section>

          <!-- 5. REFUND TRACKER (Admin only) -->
          @if (admin) {
            <section class="bg-white rounded-3xl p-6 shadow-xs border border-purple-100 space-y-4">
              <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
                <span class="material-symbols-outlined text-rose-600 text-[18px]">currency_exchange</span>
                <span>Theo Dõi Hoàn Tiền Qua Cổng Thanh Toán</span>
              </h2>
              <div class="space-y-3">
                @for (r of refunds(); track r._id) {
                  <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div class="flex items-center justify-between font-bold">
                      <span>Mã: {{ r.key }}</span>
                      <span class="text-purple-700">{{ r.amount | number }}₫ · {{ label(r.status) }}</span>
                    </div>
                    @if (r.error) { <p class="text-rose-600">{{ r.error }}</p> }
                    <p class="text-slate-400">Gateway Ref: {{ r.gatewayReference || 'Chờ đối soát' }}</p>
                  </div>
                } @empty {
                  <p class="text-xs text-slate-400 text-center py-4">Chưa có giao dịch hoàn tiền nào.</p>
                }
              </div>
            </section>
          }

        </div>

        <!-- RIGHT COLUMN (4 COLS): Policy, VIP Hotline & FAQ -->
        <div class="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
          
          <!-- VIP Support / Direct Care Card -->
          <div class="bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div class="flex items-center justify-between mb-3">
              <span class="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider text-purple-200">
                Bespoke Concierge
              </span>
              <span class="w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-white/20"></span>
            </div>
            <h3 class="text-xl font-extrabold text-white">Trợ Lý Riêng 1:1</h3>
            <p class="text-xs text-purple-100 mt-1 leading-relaxed">
              Bạn cần thay đổi lời chúc thiệp khẩn cấp hay kiểm tra đơn quà mừng sinh nhật hôm nay?
            </p>
            <div class="mt-5 space-y-2.5">
              <a href="tel:1900888999"
                class="w-full py-3 px-4 rounded-2xl bg-white text-purple-800 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-purple-50 transition active:scale-95">
                <span class="material-symbols-outlined text-[18px]">call</span>
                <span>Hotline: 1900 888 999</span>
              </a>
              <a href="https://zalo.me" target="_blank" rel="noopener"
                class="w-full py-2.5 px-4 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/20 transition">
                <span class="material-symbols-outlined text-[18px]">chat</span>
                <span>Nhắn tin Zalo Official Account</span>
              </a>
            </div>
            <div class="mt-4 pt-3 border-t border-white/15 text-[11px] text-purple-200 flex items-center justify-between">
              <span>Thời gian làm việc:</span>
              <span class="font-bold text-white">08:00 – 22:00 (Cả T7 & CN)</span>
            </div>
          </div>

          <!-- Transparent Policies -->
          <div class="bg-white rounded-3xl p-6 shadow-xs border border-purple-100 space-y-3.5">
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <span class="material-symbols-outlined text-purple-700 text-[18px]">verified</span>
              <span>Chính sách minh bạch</span>
            </h3>

            <div class="space-y-3 text-xs">
              <div class="p-3 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-1">
                <span class="font-bold text-slate-900 block">1. Đổi mới 100% trong 7 ngày</span>
                <p class="text-[11px] text-slate-600 leading-relaxed">
                  Áp dụng cho mọi sản phẩm vỡ, mẻ hoặc sai khác so với bản duyệt khắc laser trước đó.
                </p>
              </div>

              <div class="p-3 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-1">
                <span class="font-bold text-slate-900 block">2. Hoàn cọc 50% linh hoạt</span>
                <p class="text-[11px] text-slate-600 leading-relaxed">
                  Hủy đơn trước khi xưởng chạy máy laser khắc phôi được hoàn cọc ngay trong 2h.
                </p>
              </div>

              <div class="p-3 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-1">
                <span class="font-bold text-slate-900 block">3. Đóng gói lụa chống sốc</span>
                <p class="text-[11px] text-slate-600 leading-relaxed">
                  3 lớp bóng khí định hình, thắt nơ ruy băng satin cao cấp và túi giấy quà tặng đi kèm.
                </p>
              </div>
            </div>
          </div>

          <!-- FAQ Accordions -->
          <div class="bg-white rounded-3xl p-6 shadow-xs border border-purple-100 space-y-3">
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <span class="material-symbols-outlined text-amber-500 text-[18px]">help</span>
              <span>Câu hỏi thường gặp</span>
            </h3>

            <div class="space-y-2.5">
              <details class="group bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs">
                <summary class="font-bold text-slate-800 cursor-pointer list-none flex justify-between items-center">
                  <span>Nếu tôi ghi sai tên người nhận thì sao?</span>
                  <span class="text-purple-600 group-open:rotate-180 transition">▾</span>
                </summary>
                <p class="text-[11px] text-slate-600 mt-2 pt-2 border-t border-slate-200 leading-relaxed">
                  Nếu đơn hàng ở trạng thái "Chờ xác nhận" hoặc trước 12:00 trưa mỗi ngày, bạn có thể gọi hotline để sửa hoàn toàn miễn phí.
                </p>
              </details>

              <details class="group bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs">
                <summary class="font-bold text-slate-800 cursor-pointer list-none flex justify-between items-center">
                  <span>Gửi sản phẩm đổi mới mất bao lâu?</span>
                  <span class="text-purple-600 group-open:rotate-180 transition">▾</span>
                </summary>
                <p class="text-[11px] text-slate-600 mt-2 pt-2 border-t border-slate-200 leading-relaxed">
                  Tại TP.HCM và Hà Nội sẽ gửi hỏa tốc bù trong 4 giờ. Các tỉnh thành khác từ 1 - 2 ngày làm việc.
                </p>
              </details>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
})
export class CareComponent implements OnInit {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  admin = this.route.snapshot.data['admin'] === true;
  orders = signal<any[]>([]);
  notices = signal<any[]>([]);
  reviews = signal<any[]>([]);
  cases = signal<any[]>([]);
  refunds = signal<any[]>([]);
  busy = signal(false);
  loading = signal(false);
  error = signal('');
  message = signal('');
  orderId = '';
  productId = '';
  rating = 5;
  reviewContent = '';
  reviewFiles: string[] = [];
  caseType = 'SUPPORT';
  reason = '';
  description = '';
  caseFiles: string[] = [];
  resolutions = ['REFUND', 'REPLACEMENT', 'REPRODUCTION', 'REDELIVERY', 'REJECT', 'OTHER'];

  get selectedOrder() {
    return this.orders().find((o) => o._id === this.orderId);
  }

  ngOnInit() {
    this.load();
  }

  label(value: string) {
    return (
      (
        {
          PENDING: 'Chờ xử lý',
          AWAITING_CONFIRMATION: 'Chờ xác nhận',
          CONFIRMED: 'Đã xác nhận',
          DELIVERED: 'Đã giao thành công',
          CANCELLED: 'Đã hủy',
          APPROVED: 'Đã xuất bản',
          REJECTED: 'Cần chỉnh sửa',
          OPEN: 'Đã tiếp nhận',
          QUEUED: 'Chờ ca làm việc',
          INVESTIGATING: 'Đang xác minh',
          NEEDS_INFO: 'Cần bổ sung',
          RESOLVING: 'Đang xử lý',
          CLOSED: 'Đã đóng',
          RETURN: 'Đổi trả',
          COMPLAINT: 'Khiếu nại',
          SUPPORT: 'Hỗ trợ kỹ thuật',
          REFUND: 'Hoàn tiền',
          REPLACEMENT: 'Đổi sản phẩm',
          REPRODUCTION: 'Làm lại',
          REDELIVERY: 'Giao lại',
          REJECT: 'Từ chối yêu cầu',
          OTHER: 'Hỗ trợ khác',
          SUCCESS: 'Thành công',
          FAILED: 'Chưa thành công',
        } as Record<string, string>
      )[value] || value
    );
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    const paths = this.admin
      ? ['care/admin/reviews', 'care/admin/cases', 'care/admin/refunds']
      : ['care/reviews', 'care/cases', 'orders', 'care/notifications'];
    forkJoin(paths.map((p) => this.api.get<any[]>(p))).subscribe({
      next: (data) => {
        this.reviews.set(data[0] || []);
        this.cases.set(data[1] || []);
        if (this.admin) {
          this.refunds.set(data[2] || []);
        } else {
          this.orders.set(data[2] || []);
          this.notices.set(data[3] || []);
        }
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.fail(e);
      },
    });
  }

  fail(e: any) {
    const msg = e.error?.message;
    this.error.set(
      Array.isArray(msg) ? msg.join('; ') : msg || 'Không thể thực hiện. Vui lòng thử lại.',
    );
    this.busy.set(false);
  }

  act(path: string, body: any, patch = false, done?: () => void) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    (patch ? this.api.patch(path, body) : this.api.post(path, body)).subscribe({
      next: () => {
        this.busy.set(false);
        this.message.set('Đã ghi nhận thành công.');
        done?.();
        this.load();
      },
      error: (e) => this.fail(e),
    });
  }

  selectOrder(id: string) {
    this.orderId = id;
    this.productId = '';
    this.reviewContent = '';
    this.reviewFiles = [];
  }

  canCancel(o: any) {
    return (
      ['PENDING', 'AWAITING_CONFIRMATION'].includes(o.orderStatus) &&
      !o.confirmationWait?.confirmedAt
    );
  }

  cancel(o: any) {
    this.act(`orders/${o._id}/cancel`, {}, true);
  }

  dismiss(n: any) {
    this.act(`care/notifications/${n._id}/dismiss`, {}, true);
  }

  submitReview() {
    this.act(
      'care/reviews',
      {
        orderId: this.orderId,
        productId: this.productId,
        rating: this.rating,
        content: this.reviewContent,
        attachments: this.reviewFiles,
      },
      false,
      () => {
        this.reviewContent = '';
        this.reviewFiles = [];
      },
    );
  }

  editReview(r: any) {
    this.orderId = r.orderId;
    this.productId = r.productId;
    this.rating = r.rating;
    this.reviewContent = r.content;
    this.reviewFiles = [...r.attachments];
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  createCase() {
    this.act(
      'care/cases',
      {
        orderId: this.orderId,
        productId: this.productId || undefined,
        type: this.caseType,
        reason: this.reason,
        description: this.description,
        attachments: this.caseFiles,
      },
      false,
      () => {
        this.description = '';
        this.reason = '';
        this.caseFiles = [];
      },
    );
  }

  reply(c: any) {
    this.act(`care/cases/${c._id}/replies`, { text: c.reply, attachments: c.replyFiles || [] });
  }

  moderate(r: any, status: string) {
    this.act(`care/admin/reviews/${r._id}`, { status, note: r.note }, true);
  }

  updateCase(c: any, status: string) {
    this.act(
      `care/admin/cases/${c._id}`,
      {
        status,
        message: c.message,
        investigation: c.investigation,
        responsibility: c.responsibility,
        customizationChecked: c.customizationChecked,
        resolution: c.resolution,
        result: c.result,
      },
      true,
    );
  }

  upload(event: Event, target: any) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    const existing =
      target === 'review'
        ? this.reviewFiles
        : target === 'case'
          ? this.caseFiles
          : target.replyFiles || [];
    if (!files.length) return;
    if (existing.length + files.length > 5 || files.some((f) => f.size > 10 * 1024 * 1024)) {
      this.error.set('Tối đa 5 tệp, mỗi tệp không quá 10 MB.');
      input.value = '';
      return;
    }
    this.busy.set(true);
    forkJoin(
      files.map((file) => {
        const form = new FormData();
        form.append('file', file);
        return this.http.post<any>(`${environment.apiUrl}/care/attachments`, form);
      }),
    ).subscribe({
      next: (results) => {
        const ids = [...existing, ...results.map((r) => r.data._id)];
        if (target === 'review') this.reviewFiles = ids;
        else if (target === 'case') this.caseFiles = ids;
        else target.replyFiles = ids;
        this.busy.set(false);
        input.value = '';
      },
      error: (e) => this.fail(e),
    });
  }

  download(id: string) {
    this.http
      .get(`${environment.apiUrl}/care/attachments/${id}`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `giftory-${id}.${({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'video/mp4': 'mp4', 'application/pdf': 'pdf' } as Record<string, string>)[blob.type] || 'bin'}`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
        error: (e) => this.fail(e),
      });
  }
}
