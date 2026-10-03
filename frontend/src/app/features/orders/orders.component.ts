import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { Order } from '../../core/models';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <!-- Top Tag Badge & Header (Exact Stitch Screenshot 355037913911605635) -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div class="space-y-1.5">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-[#7C3AED] text-xs font-bold">
            <span class="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-ping"></span>
            Hệ thống Giám sát Quy trình Bespoke Live
          </div>
          <h1 class="text-3xl lg:text-4xl font-display font-black text-slate-900 tracking-tight">
            Lộ Trình Đơn Hàng & Sản Xuất
          </h1>
          <p class="text-xs lg:text-sm text-slate-500 font-medium">
            Theo dõi trực tiếp từ xưởng gia công cá nhân hóa đến tay người nhận • Minh bạch từng bước cọc và giao vận hỏa tốc.
          </p>
        </div>

        <!-- Order Meta Tag on the Right -->
        <div class="flex items-center gap-3 self-start lg:self-center">
          <span class="text-xs text-slate-500 font-medium">Mã đơn: <strong class="text-slate-800 font-mono">#{{ currentOrderCode() }}</strong></span>
          <div class="px-3.5 py-1.5 rounded-full bg-purple-100 text-[#7C3AED] text-xs font-bold flex items-center gap-1.5 shadow-xs">
            <span class="material-symbols-outlined text-sm">auto_fix_high</span>
            Đang Chế Tác
          </div>
        </div>
      </div>

      <!-- Search Card Pill Box (Stitch Pill Input Filter) -->
      <div class="bg-white rounded-3xl p-5 lg:p-6 border border-[#DDD6FE] shadow-sm space-y-3">
        <div class="flex flex-col md:flex-row items-center gap-3">
          <!-- Sub-label -->
          <div class="hidden xl:block shrink-0 pr-2 border-r border-slate-100 text-left">
            <span class="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">GIFTORY TRACKING</span>
            <span class="text-xs font-bold text-slate-800">Tra cứu đơn hàng</span>
          </div>

          <!-- Input Code -->
          <div class="relative flex-1 w-full">
            <span class="absolute left-3.5 top-2.5 text-slate-400 font-mono font-bold text-sm">#</span>
            <input
              type="text"
              [(ngModel)]="searchCode"
              (keyup.enter)="lookupOrder()"
              placeholder="GIFT-8921"
              class="w-full pl-8 pr-4 py-2.5 bg-[#F3EBF9]/50 rounded-2xl border border-transparent focus:border-[#7C3AED] focus:bg-white text-sm font-mono font-bold text-slate-800 focus:outline-none transition"
            />
          </div>

          <!-- Input Phone -->
          <div class="relative flex-1 w-full">
            <span class="material-symbols-outlined absolute left-3.5 top-2.5 text-slate-400 text-base">call</span>
            <input
              type="text"
              [(ngModel)]="searchPhone"
              (keyup.enter)="lookupOrder()"
              placeholder="0987 654 321"
              class="w-full pl-9 pr-4 py-2.5 bg-[#F3EBF9]/50 rounded-2xl border border-transparent focus:border-[#7C3AED] focus:bg-white text-sm font-mono font-semibold text-slate-800 focus:outline-none transition"
            />
          </div>

          <!-- Button Search -->
          <button
            (click)="lookupOrder()"
            class="w-full md:w-auto px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <span class="material-symbols-outlined text-base">search</span>
            Tra Cứu Lộ Trình
          </button>
        </div>

        <div class="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 gap-2">
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-xs text-emerald-500">verified_user</span>
            <span>Đơn hàng Khách (Guest) được định danh an toàn qua Mã đơn + Số điện thoại, bảo lưu điểm thưởng 90 ngày.</span>
          </div>
          <button (click)="resetSearch()" class="text-[#7C3AED] font-semibold hover:underline">
            Tra cứu đơn hàng khác →
          </button>
        </div>
      </div>

      <!-- MAIN STEPPER CARD: Tiến Độ Gia Công & Giao Vận Thực Tế -->
      <div class="bg-white rounded-3xl p-6 lg:p-8 border border-[#DDD6FE] shadow-sm space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
              <span class="material-symbols-outlined text-[#7C3AED] text-lg">precision_manufacturing</span>
              Tiến Độ Gia Công & Giao Vận Thực Tế
            </h2>
            <p class="text-xs text-slate-400 mt-0.5">Cập nhật tự động thời gian thực từ trạm IoT xưởng Giftory</p>
          </div>

          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">
            <span class="material-symbols-outlined text-sm">schedule</span>
            Dự kiến giao: <strong class="font-bold">30/09 (15:00 - 18:00)</strong>
          </div>
        </div>

        <!-- Visual 5 Steps Stepper Matching Stitch Screenshot -->
        <div class="py-4">
          <div class="relative">
            <!-- Background connecting line -->
            <div class="absolute top-6 left-10 right-10 h-1 bg-slate-100 rounded-full z-0 hidden md:block">
              <div class="h-full bg-gradient-to-r from-emerald-500 via-[#7C3AED] to-[#7C3AED] rounded-full transition-all duration-700" style="width: 38%"></div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-5 gap-6 relative z-10">
              <!-- BƯỚC 1: HOÀN TẤT - Đặt Cọc 50% -->
              <div class="flex md:flex-col items-center md:text-center gap-4 md:gap-2.5">
                <div class="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-200 shrink-0">
                  <span class="material-symbols-outlined text-xl">check</span>
                </div>
                <div>
                  <span class="text-[10px] font-extrabold tracking-wider uppercase text-emerald-600 block">BƯỚC 1 • HOÀN TẤT</span>
                  <span class="text-xs font-bold text-slate-800 block">Đặt Cọc 50%</span>
                  <span class="text-[11px] text-slate-400 block font-mono">10:15 - 28/09</span>
                  <span class="text-[11px] font-semibold text-[#7C3AED] block">175.000đ • VietQR</span>
                </div>
              </div>

              <!-- BƯỚC 2: ĐANG XỬ LÝ - Khắc & In Custom -->
              <div class="flex md:flex-col items-center md:text-center gap-4 md:gap-2.5">
                <div class="w-12 h-12 rounded-full bg-[#7C3AED] text-white flex items-center justify-center font-bold shadow-lg shadow-purple-300 ring-4 ring-purple-100 shrink-0 animate-pulse">
                  <span class="material-symbols-outlined text-xl">handyman</span>
                </div>
                <div>
                  <span class="inline-block px-2 py-0.5 rounded-full bg-purple-100 text-[#7C3AED] text-[10px] font-bold uppercase tracking-wider">
                    • ĐANG XỬ LÝ
                  </span>
                  <span class="text-xs font-bold text-slate-900 block mt-0.5">Khắc & In Custom</span>
                  <span class="text-[11px] text-slate-500 block font-medium">Cập nhật 14:30 hôm nay</span>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-600 inline-block mt-0.5">Khắc Laser Gold</span>
                </div>
              </div>

              <!-- BƯỚC 3: Kiểm Định & Đóng Hộp -->
              <div class="flex md:flex-col items-center md:text-center gap-4 md:gap-2.5 opacity-60">
                <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center font-bold shrink-0">
                  <span class="material-symbols-outlined text-xl">inventory_2</span>
                </div>
                <div>
                  <span class="text-[10px] font-bold tracking-wider uppercase text-slate-400 block">BƯỚC 3</span>
                  <span class="text-xs font-bold text-slate-700 block">Kiểm Định & Đóng Hộp</span>
                  <span class="text-[11px] text-slate-400 block">Dự kiến 09:00 - 29/09</span>
                  <span class="text-[11px] text-slate-500 block">Hộp nơ lụa satin</span>
                </div>
              </div>

              <!-- BƯỚC 4: Giao Hỏa Tốc -->
              <div class="flex md:flex-col items-center md:text-center gap-4 md:gap-2.5 opacity-60">
                <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center font-bold shrink-0">
                  <span class="material-symbols-outlined text-xl">local_shipping</span>
                </div>
                <div>
                  <span class="text-[10px] font-bold tracking-wider uppercase text-slate-400 block">BƯỚC 4</span>
                  <span class="text-xs font-bold text-slate-700 block">Giao Hỏa Tốc</span>
                  <span class="text-[11px] text-slate-400 block">SPX Express</span>
                  <span class="text-[11px] text-slate-500 block font-mono">Mã: #SPX98231VN</span>
                </div>
              </div>

              <!-- BƯỚC 5: Giao Hàng & Thu COD -->
              <div class="flex md:flex-col items-center md:text-center gap-4 md:gap-2.5 opacity-60">
                <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center font-bold shrink-0">
                  <span class="material-symbols-outlined text-xl">location_on</span>
                </div>
                <div>
                  <span class="text-[10px] font-bold tracking-wider uppercase text-slate-400 block">BƯỚC 5</span>
                  <span class="text-xs font-bold text-slate-700 block">Giao Hàng & Thu COD</span>
                  <span class="text-[11px] text-slate-400 block">Dự kiến 30/09</span>
                  <span class="text-[11px] font-bold text-slate-700 block">COD: 205.000đ</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TWO COLUMNS BOTTOM SECTION (Matching Stitch Screenshot) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Card Left: Kiệt Tác Quà Tặng Đang Gia Công -->
        <div class="bg-white rounded-3xl p-6 border border-[#DDD6FE] shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span class="material-symbols-outlined text-[#7C3AED] text-base">brush</span>
              Kiệt Tác Quà Tặng Đang Gia Công
            </h3>

            <a routerLink="/custom-studio" class="px-3 py-1 rounded-xl bg-purple-50 text-[#7C3AED] text-xs font-bold hover:bg-purple-100 transition flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">visibility</span>
              Xem Bản Mẫu 3D Đã Duyệt
            </a>
          </div>

          <!-- Product item row -->
          <div class="flex items-start gap-4">
            <div class="relative w-24 h-24 rounded-2xl overflow-hidden bg-[#F3EBF9] border border-[#DDD6FE] shrink-0">
              <img src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400" alt="Ly Sứ Ngọc Trai" class="w-full h-full object-cover">
              <span class="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-bold uppercase">
                Bespoke QC Passed
              </span>
            </div>

            <div class="space-y-1.5 flex-1">
              <h4 class="text-sm font-bold text-slate-900">Ly Sứ Ngọc Trai Khắc Tên Cao Cấp</h4>
              <p class="text-xs text-slate-500">Phân loại: <strong class="text-slate-700">Trắng Ánh Kim (Hộp Quà Cao Cấp)</strong></p>
              <div class="p-2 rounded-xl bg-[#F3EBF9]/60 border border-purple-100 text-xs text-[#7C3AED]">
                <span class="font-bold">Nội dung khắc laser:</span> "Happy 5th Anniversary - Minh & An 2026"
              </div>
              <div class="flex items-center justify-between text-xs pt-1">
                <span class="text-slate-400 font-mono">Đơn giá: 350.000đ (x1)</span>
                <span class="font-bold text-emerald-600">Đã cọc 50%: 175.000đ</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Card Right: Hành Trình Vận Chuyển #SPX98231VN -->
        <div class="bg-white rounded-3xl p-6 border border-[#DDD6FE] shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span class="material-symbols-outlined text-[#7C3AED] text-base">near_me</span>
              Hành Trình Vận Chuyển
            </h3>
            <span class="font-mono text-xs font-bold text-slate-500">#SPX98231VN</span>
          </div>

          <!-- Simulated Delivery Route Map Canvas (Stitch Map View) -->
          <div class="relative h-44 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
            <!-- Simulated Map Texture Background -->
            <img src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800" alt="Map View" class="w-full h-full object-cover opacity-60 filter contrast-125">
            
            <!-- Origin Workshop Marker -->
            <div class="absolute top-8 left-12 flex flex-col items-center">
              <div class="w-7 h-7 rounded-full bg-[#7C3AED] text-white flex items-center justify-center shadow-md animate-bounce">
                <span class="material-symbols-outlined text-sm">home_work</span>
              </div>
              <span class="text-[9px] font-bold bg-white/90 px-1.5 py-0.5 rounded shadow text-slate-800 mt-0.5">Xưởng Q.1</span>
            </div>

            <!-- Route Line Dash -->
            <div class="absolute top-11 left-18 right-24 h-0.5 border-t-2 border-dashed border-[#7C3AED]"></div>

            <!-- Delivery Van Icon -->
            <div class="absolute top-8 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg">
              <span class="material-symbols-outlined text-base">local_shipping</span>
            </div>

            <!-- Destination Marker -->
            <div class="absolute top-8 right-12 flex flex-col items-center">
              <div class="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                <span class="material-symbols-outlined text-sm">person_pin_circle</span>
              </div>
              <span class="text-[9px] font-bold bg-white/90 px-1.5 py-0.5 rounded shadow text-slate-800 mt-0.5">Người Nhận</span>
            </div>

            <!-- Live Status Overlay -->
            <div class="absolute bottom-2 left-2 right-2 p-2 bg-white/95 backdrop-blur-xs rounded-xl shadow-xs flex items-center justify-between text-[11px]">
              <span class="text-slate-600 flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                Tài xế Nguyễn Văn Toàn (0912.***.***)
              </span>
              <span class="font-bold text-[#7C3AED]">Cách bạn 2.4 km</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class OrdersComponent implements OnInit {
  private orderService = inject(OrderService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  currentOrderCode = signal<string>('GIFT-8921');
  searchCode = 'GIFT-8921';
  searchPhone = '0987654321';
  activeOrder = signal<Order | null>(null);

  ngOnInit() {
    const codeParam = this.route.snapshot.paramMap.get('code') || this.route.snapshot.queryParamMap.get('code');
    if (codeParam) {
      this.searchCode = codeParam;
      this.currentOrderCode.set(codeParam);
      this.lookupOrder();
    }
  }

  lookupOrder() {
    if (!this.searchCode.trim()) return;
    this.currentOrderCode.set(this.searchCode.trim().replace('#', ''));
    this.orderService.getOrderByCode(this.currentOrderCode()).subscribe({
      next: (res: any) => {
        const ord = res?.data || res;
        if (ord) {
          this.activeOrder.set(ord);
        }
      },
      error: () => {
        // Fallback for demo tracking presentation
      }
    });
  }

  resetSearch() {
    this.searchCode = '';
    this.searchPhone = '';
  }
}
