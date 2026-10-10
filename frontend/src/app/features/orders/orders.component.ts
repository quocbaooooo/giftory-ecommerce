import { Component, OnInit, signal, computed, inject } from '@angular/core';
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
    <div class="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      <!-- Top Tag Badge & Header -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div class="space-y-1.5">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-[#7C3AED] text-xs font-bold">
            <span class="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-ping"></span>
            Hệ thống Giám sát Quy trình BP-04 Live
          </div>
          <h1 class="text-3xl lg:text-4xl font-display font-black text-slate-900 tracking-tight">
            Lộ Trình Đơn Hàng & Thực Thi BP-04
          </h1>
          <p class="text-xs lg:text-sm text-slate-500 font-medium">
            Theo dõi trực tiếp từ thời gian chờ xác nhận 12h-48h, xưởng gia công cá nhân hóa đến bàn giao Shipper và nhận quà.
          </p>
        </div>

        <!-- Order Meta Tag on the Right -->
        <div class="flex items-center gap-3 self-start lg:self-center">
          <span class="text-xs text-slate-500 font-medium">Mã đơn: <strong class="text-slate-800 font-mono">#{{ currentOrderCode() }}</strong></span>
          <div [ngClass]="getOrderHeaderBadge().class" class="px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs">
            <span class="material-symbols-outlined text-sm">{{ getOrderHeaderBadge().icon }}</span>
            {{ getOrderHeaderBadge().label }}
          </div>
        </div>
      </div>

      <!-- Search Card Pill Box -->
      <div class="bg-white rounded-3xl p-5 lg:p-6 border border-[#DDD6FE] shadow-sm space-y-3">
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
              placeholder="VD: GF-104001, GF-894212..."
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
            <span>Trạng thái cập nhật chuẩn hóa theo quy trình Thực thi đơn hàng BP-04.</span>
          </div>
          <button (click)="resetSearch()" class="text-[#7C3AED] font-semibold hover:underline cursor-pointer">
            Nhập mã đơn khác →
          </button>
        </div>
      </div>

      <!-- MAIN STEPPER CARD: Tiến Độ BP-04 Live -->
      <div class="bg-white rounded-3xl p-6 lg:p-8 border border-[#DDD6FE] shadow-sm space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
              <span class="material-symbols-outlined text-[#7C3AED] text-lg">precision_manufacturing</span>
              Tiến Độ Thực Thi & Giao Vận (BP-04)
            </h2>
            <p class="text-xs text-slate-400 mt-0.5">Minh bạch từng công đoạn chuẩn bị quà, đóng gói và giao hàng</p>
          </div>

          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">
            <span class="material-symbols-outlined text-sm">schedule</span>
            Hãng vận chuyển: <strong class="font-bold">{{ getOrderCarrier() }}</strong>
          </div>
        </div>

        <!-- 5 Steps Stepper -->
        <div class="py-4">
          <div class="relative">
            <!-- Background connecting line -->
            <div class="absolute top-6 left-10 right-10 h-1 bg-slate-100 rounded-full z-0 hidden md:block">
              <div class="h-full bg-gradient-to-r from-emerald-500 via-[#7C3AED] to-[#7C3AED] rounded-full transition-all duration-700" [style.width]="getStepperProgressPercent() + '%'"></div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-5 gap-6 relative z-10">
              
              <!-- BƯỚC 1: Tiếp nhận & Chờ xác nhận (US-04.01) -->
              <div class="flex md:flex-col items-center md:text-center gap-4 md:gap-2.5" [ngClass]="getStepClass(1)">
                <div class="w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-md shrink-0 transition" [ngClass]="getStepIconClass(1)">
                  <span class="material-symbols-outlined text-xl">{{ getStepIcon(1) }}</span>
                </div>
                <div>
                  <span class="text-[10px] font-extrabold tracking-wider uppercase block" [ngClass]="getStepSubClass(1)">BƯỚC 1 • BP-04</span>
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
                  <span class="text-[10px] font-extrabold tracking-wider uppercase block" [ngClass]="getStepSubClass(2)">BƯỚC 2 • BP-04</span>
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
                  <span class="text-[10px] font-extrabold tracking-wider uppercase block" [ngClass]="getStepSubClass(3)">BƯỚC 3 • BP-04</span>
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
                  <span class="text-[10px] font-extrabold tracking-wider uppercase block" [ngClass]="getStepSubClass(4)">BƯỚC 4 • BP-04</span>
                  <span class="text-xs font-bold text-slate-800 block">In Transit (Vận chuyển)</span>
                  <span class="text-[11px] text-slate-500 block font-mono">{{ getOrderTrackingCode() }}</span>
                </div>
              </div>

              <!-- BƯỚC 5: Giao hàng & Kết thúc (US-04.05, US-04.07) -->
              <div class="flex md:flex-col items-center md:text-center gap-4 md:gap-2.5" [ngClass]="getStepClass(5)">
                <div class="w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-md shrink-0 transition" [ngClass]="getStepIconClass(5)">
                  <span class="material-symbols-outlined text-xl">{{ getStepIcon(5) }}</span>
                </div>
                <div>
                  <span class="text-[10px] font-extrabold tracking-wider uppercase block" [ngClass]="getStepSubClass(5)">BƯỚC 5 • BP-04</span>
                  <span class="text-xs font-bold text-slate-800 block">{{ getStepTitle(5) }}</span>
                  <span class="text-[11px] text-slate-500 block">{{ getStepDesc(5) }}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <!-- TWO COLUMNS BOTTOM SECTION -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Card Left: Chi Tiết Sản Phẩm Trong Đơn -->
        <div class="bg-white rounded-3xl p-6 border border-[#DDD6FE] shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span class="material-symbols-outlined text-[#7C3AED] text-base">brush</span>
              Sản Phẩm Trong Đơn Hàng (#{{ currentOrderCode() }})
            </h3>

            <a routerLink="/custom-studio" class="px-3 py-1 rounded-xl bg-purple-50 text-[#7C3AED] text-xs font-bold hover:bg-purple-100 transition flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">palette</span>
              Custom Studio
            </a>
          </div>

          <!-- Product items list -->
          <div class="space-y-3">
            <div *ngFor="let item of getOrderItems()" class="flex items-start gap-4 p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
              <div class="relative w-20 h-20 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0">
                <img [src]="item.productImage || item.image || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400'" [alt]="item.productName || item.name" class="w-full h-full object-cover">
                <span *ngIf="item.isCustom" class="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-[#7C3AED] text-white text-[8px] font-bold uppercase">
                  Custom
                </span>
                <span *ngIf="!item.isCustom" class="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-blue-600 text-white text-[8px] font-bold uppercase">
                  Có sẵn
                </span>
              </div>

              <div class="space-y-1 flex-1 text-xs">
                <h4 class="font-bold text-slate-900">{{ item.productName || item.name }} (x{{ item.quantity }})</h4>
                <p class="text-[11px] text-slate-500">Phân loại: <strong class="text-slate-700">{{ item.variantName || 'Tiêu chuẩn' }}</strong></p>
                
                <div *ngIf="item.isCustom && item.customDetails" class="p-2 rounded-xl bg-purple-50 border border-purple-100 text-[11px] text-[#7C3AED]">
                  <span class="font-bold">Khắc:</span> "{{ item.customDetails.frontMessage || item.customDetails.customText || 'Theo mẫu' }}"
                  <span *ngIf="item.customDetails.fontFamily" class="block text-[10px] text-purple-500 font-mono">Font: {{ item.customDetails.fontFamily }}</span>
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
        <div class="bg-white rounded-3xl p-6 border border-[#DDD6FE] shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span class="material-symbols-outlined text-[#7C3AED] text-base">near_me</span>
              Hành Trình Giao Vận & Lịch Sử BP-04
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
              <span class="text-[10px] text-slate-400 font-mono shrink-0">{{ t.timestamp | date:'HH:mm dd/MM' }}</span>
            </div>

            <div *ngIf="!getOrderTimeline().length" class="text-xs text-slate-400 text-center py-6">
              Đang đồng bộ lộ trình đơn hàng từ trạm điều phối...
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

  currentOrderCode = signal<string>('GF-104001');
  searchCode = 'GF-104001';
  searchPhone = '';
  activeOrder = signal<Order | null>(null);

  ngOnInit() {
    const codeParam = this.route.snapshot.paramMap.get('code') || this.route.snapshot.queryParamMap.get('code');
    if (codeParam) {
      this.searchCode = codeParam;
      this.currentOrderCode.set(codeParam);
      this.lookupOrder();
    } else {
      this.lookupOrder();
    }
  }

  lookupOrder() {
    const code = this.searchCode.trim().replace('#', '');
    if (!code) return;
    this.currentOrderCode.set(code);
    this.orderService.getOrderByCode(code).subscribe({
      next: (res: any) => {
        const ord = res?.data || res;
        if (ord) {
          this.activeOrder.set(ord);
        }
      },
      error: () => {
        // Fallback demo state
      }
    });
  }

  resetSearch() {
    this.searchCode = '';
    this.searchPhone = '';
  }

  getOrderItems(): any[] {
    const ord = this.activeOrder();
    if (ord && ord.items && ord.items.length) {
      return ord.items;
    }
    return [{
      name: 'Bình Giữ Nhiệt Nordic Khắc Tên Cao Cấp',
      productName: 'Bình Giữ Nhiệt Nordic Khắc Tên Cao Cấp',
      variantName: 'Navy Blue',
      quantity: 1,
      price: 250000,
      unitPrice: 250000,
      isCustom: true,
      image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400',
      customDetails: { frontMessage: 'Happy Birthday My Love ❤️', fontFamily: 'Signature' }
    }];
  }

  getOrderTimeline(): any[] {
    const ord = this.activeOrder();
    if (ord && ord.timeline && ord.timeline.length) {
      return ord.timeline;
    }
    return [
      { title: 'Tiếp nhận đơn hàng BP-03 (BR-01)', description: 'Đơn hàng được ghi nhận "Chờ xác nhận đơn hàng".', timestamp: new Date() }
    ];
  }

  getOrderCarrier(): string {
    const ord = this.activeOrder();
    return ord?.deliveryInfo?.carrier || ord?.shippingCarrier || 'Giao Hàng Tiết Kiệm (GHTK)';
  }

  getOrderTrackingCode(): string {
    const ord = this.activeOrder();
    return ord?.deliveryInfo?.trackingCode || ord?.trackingCode || 'GHTK-VN-8821941';
  }

  // Stepper calculations based on BP-04 state
  getStepStageNumber(): number {
    const ord = this.activeOrder();
    if (!ord) return 1;

    if (ord.orderStatus === 'DELIVERED') return 5;
    if (ord.orderStatus === 'RETURNED_BP06' || ord.fulfillmentStatus === 'RETURNING' || ord.fulfillmentStatus === 'RETURNED_RECEIVED') return 5;
    if (ord.orderStatus === 'IN_TRANSIT' || ord.orderStatus === 'SHIPPING') return 4;
    if (ord.isPackaged || ord.fulfillmentStatus === 'PACKAGED') return 3;
    if (ord.orderStatus === 'CONFIRMED' || ord.fulfillmentStatus === 'AT_WORKSHOP') return 2;
    return 1; // AWAITING_CONFIRMATION / PENDING
  }

  getStepperProgressPercent(): number {
    const stage = this.getStepStageNumber();
    switch (stage) {
      case 1: return 10;
      case 2: return 35;
      case 3: return 60;
      case 4: return 85;
      case 5: return 100;
      default: return 10;
    }
  }

  getStepClass(stepNum: number): string {
    const current = this.getStepStageNumber();
    if (stepNum < current) return '';
    if (stepNum === current) return '';
    return 'opacity-50';
  }

  getStepIconClass(stepNum: number): string {
    const current = this.getStepStageNumber();
    if (stepNum < current) return 'bg-emerald-500 text-white shadow-emerald-200';
    if (stepNum === current) return 'bg-[#7C3AED] text-white shadow-purple-300 ring-4 ring-purple-100 animate-pulse';
    return 'bg-slate-100 text-slate-400 border border-slate-200';
  }

  getStepSubClass(stepNum: number): string {
    const current = this.getStepStageNumber();
    if (stepNum < current) return 'text-emerald-600';
    if (stepNum === current) return 'text-[#7C3AED]';
    return 'text-slate-400';
  }

  getStepIcon(stepNum: number): string {
    const current = this.getStepStageNumber();
    if (stepNum < current) return 'check';
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
        return 'Chuyển Xử Lý BP-06';
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
        return 'Đã duyệt đơn (BR-04)';
      case 2:
        return 'Xưởng chế tác & Lấy hàng';
      case 3:
        return ord?.isPackaged ? 'Đã đóng hộp quà' : 'Chờ kiểm định QC';
      case 4:
        return ord?.orderStatus === 'IN_TRANSIT' ? 'Đang trên đường giao' : 'Sẵn sàng giao';
      case 5:
        if (ord?.orderStatus === 'RETURNED_BP06') return 'Hàng trả về, chuyển BP-06';
        if (ord?.orderStatus === 'DELIVERED') return 'Khách đã ký nhận';
        return 'Dự kiến hôm nay';
      default:
        return '';
    }
  }

  getOrderHeaderBadge(): { label: string; class: string; icon: string } {
    const ord = this.activeOrder();
    if (!ord) return { label: 'Đang Tra Cứu', class: 'bg-purple-100 text-[#7C3AED]', icon: 'search' };

    switch (ord.orderStatus) {
      case 'DELIVERED':
        return { label: 'Đã Giao Thành Công', class: 'bg-emerald-100 text-emerald-700', icon: 'task_alt' };
      case 'IN_TRANSIT':
      case 'SHIPPING':
        return { label: 'In Transit • Đang Vận Chuyển', class: 'bg-indigo-100 text-indigo-700', icon: 'local_shipping' };
      case 'CONFIRMED':
        return { label: ord.isPackaged ? 'Đã Đóng Hộp Quà' : 'Đang Chế Tác Tại Xưởng', class: 'bg-purple-100 text-[#7C3AED]', icon: 'auto_fix_high' };
      case 'AWAITING_CONFIRMATION':
      case 'PENDING':
        return { label: 'Chờ Xác Nhận (12h - 48h)', class: 'bg-amber-100 text-amber-800', icon: 'hourglass_top' };
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
