import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-8 animate-fade-in">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span class="text-xs font-bold tracking-widest text-giftory-primary uppercase">Tổng Quan Kinh Doanh</span>
          <h1 class="text-2xl md:text-3xl font-display font-black text-giftory-ink mt-1">Dashboard Quản Trị Hệ Thống Giftory</h1>
          <p class="text-xs text-giftory-ink/60 mt-1">Giám sát doanh thu cọc 50%, số lượng đơn đặt may/khắc và tiến độ sản xuất</p>
        </div>

        <div class="flex items-center gap-3">
          <a routerLink="/admin/products" class="px-4 py-2 bg-white border border-giftory-border text-giftory-ink text-xs font-bold rounded-xl hover:bg-giftory-canvas transition shadow-xs flex items-center gap-1.5">
            <span class="material-symbols-outlined text-sm">add_box</span>
            Thêm Quà Mới
          </a>
          <a routerLink="/admin/orders" class="px-4 py-2 bg-giftory-primary text-white text-xs font-bold rounded-xl hover:bg-giftory-primary-dark transition shadow-sm flex items-center gap-1.5">
            <span class="material-symbols-outlined text-sm">pending_actions</span>
            Xử Lý Đơn Chờ
          </a>
        </div>
      </div>

      <!-- Bento 4 KPI Grid (Stitch Screen 3079406608969517755) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- KPI 1: Doanh Thu -->
        <div class="bg-white rounded-3xl p-6 border border-giftory-border shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-giftory-ink/60 uppercase">Tổng Doanh Thu</span>
            <div class="w-10 h-10 rounded-2xl bg-giftory-emerald/10 text-giftory-emerald flex items-center justify-center">
              <span class="material-symbols-outlined text-xl">payments</span>
            </div>
          </div>
          <div>
            <span class="text-2xl font-black font-mono text-giftory-ink">{{ kpis().totalRevenue | number }} đ</span>
            <div class="flex items-center gap-1 mt-1 text-[11px] font-semibold text-giftory-emerald">
              <span class="material-symbols-outlined text-xs">trending_up</span>
              +18.4% so với tháng trước
            </div>
          </div>
        </div>

        <!-- KPI 2: Tổng Đơn Hàng -->
        <div class="bg-white rounded-3xl p-6 border border-giftory-border shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-giftory-ink/60 uppercase">Tổng Đơn Hàng</span>
            <div class="w-10 h-10 rounded-2xl bg-giftory-primary/10 text-giftory-primary flex items-center justify-center">
              <span class="material-symbols-outlined text-xl">shopping_cart</span>
            </div>
          </div>
          <div>
            <span class="text-2xl font-black font-mono text-giftory-ink">{{ kpis().totalOrders }}</span>
            <div class="flex items-center gap-1 mt-1 text-[11px] font-semibold text-giftory-amber">
              <span class="material-symbols-outlined text-xs">schedule</span>
              {{ kpis().pendingOrders }} đơn đang chờ xử lý
            </div>
          </div>
        </div>

        <!-- KPI 3: Khách Hàng -->
        <div class="bg-white rounded-3xl p-6 border border-giftory-border shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-giftory-ink/60 uppercase">Khách Hàng Hội Viên</span>
            <div class="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <span class="material-symbols-outlined text-xl">group</span>
            </div>
          </div>
          <div>
            <span class="text-2xl font-black font-mono text-giftory-ink">{{ kpis().totalCustomers }}</span>
            <div class="flex items-center gap-1 mt-1 text-[11px] font-semibold text-blue-600">
              <span class="material-symbols-outlined text-xs">person_add</span>
              Tích cực tương tác
            </div>
          </div>
        </div>

        <!-- KPI 4: Danh Mục Quà -->
        <div class="bg-white rounded-3xl p-6 border border-giftory-border shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-giftory-ink/60 uppercase">Mẫu Quà Đang Bán</span>
            <div class="w-10 h-10 rounded-2xl bg-purple-50 text-giftory-primary flex items-center justify-center">
              <span class="material-symbols-outlined text-xl">inventory_2</span>
            </div>
          </div>
          <div>
            <span class="text-2xl font-black font-mono text-giftory-ink">{{ kpis().totalProducts }}</span>
            <div class="flex items-center gap-1 mt-1 text-[11px] font-semibold text-giftory-primary">
              <span class="material-symbols-outlined text-xs">palette</span>
              Hỗ trợ tùy biến Bespoke
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Orders Table (Stitch Screen 3079406608969517755) -->
      <div class="bg-white rounded-3xl p-6 border border-giftory-border shadow-xs space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-bold text-giftory-ink flex items-center gap-2">
            <span class="material-symbols-outlined text-giftory-primary">receipt_long</span>
            Đơn Hàng Gần Đây Cần Xử Lý
          </h2>
          <a routerLink="/admin/orders" class="text-xs font-bold text-giftory-primary hover:underline">Xem tất cả đơn</a>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-giftory-border text-giftory-ink/50 font-bold uppercase tracking-wider">
                <th class="py-3 px-4">Mã Đơn</th>
                <th class="py-3 px-4">Khách Hàng</th>
                <th class="py-3 px-4">Sản Phẩm & Phân Loại</th>
                <th class="py-3 px-4">Loại Quà</th>
                <th class="py-3 px-4">Tổng Tiền</th>
                <th class="py-3 px-4">Trạng Thái</th>
                <th class="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-giftory-border/40">
              <tr *ngFor="let ord of recentOrders()" class="hover:bg-giftory-canvas/60 transition">
                <td class="py-3 px-4 font-mono font-bold text-giftory-primary">#{{ ord.orderCode }}</td>
                <td class="py-3 px-4 font-semibold text-giftory-ink">{{ ord.shippingAddress.fullName }}</td>
                <td class="py-3 px-4 text-giftory-ink/70">
                  <span class="line-clamp-1">{{ ord.items[0]?.name }}</span>
                </td>
                <td class="py-3 px-4">
                  <span *ngIf="ord.items[0]?.isCustom" class="px-2 py-0.5 rounded bg-giftory-primary/10 text-giftory-primary font-bold text-[10px]">
                    Bespoke (Cọc 50%)
                  </span>
                  <span *ngIf="!ord.items[0]?.isCustom" class="px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold text-[10px]">
                    Tiêu Chuẩn
                  </span>
                </td>
                <td class="py-3 px-4 font-mono font-bold text-giftory-ink">{{ ord.totalAmount | number }} đ</td>
                <td class="py-3 px-4">
                  <span [ngClass]="getStatusBadge(ord.orderStatus)" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
                    {{ ord.orderStatus }}
                  </span>
                </td>
                <td class="py-3 px-4 text-right">
                  <a [routerLink]="['/admin/orders']" [queryParams]="{ code: ord.orderCode }" class="text-xs font-bold text-giftory-primary hover:underline">
                    Chi Tiết
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);

  kpis = signal<{
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
    pendingOrders: number;
  }>({
    totalRevenue: 3450000,
    totalOrders: 3,
    totalCustomers: 7,
    totalProducts: 12,
    pendingOrders: 1
  });

  recentOrders = signal<any[]>([]);

  ngOnInit() {
    this.adminService.getDashboardKpis().subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        if (data) {
          this.kpis.set(data);
        }
      }
    });

    this.adminService.getAdminOrders({ limit: 5 }).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
        this.recentOrders.set(list);
      }
    });
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'DELIVERED':
        return 'bg-giftory-emerald/10 text-giftory-emerald';
      case 'PROCESSING':
      case 'SHIPPING':
        return 'bg-giftory-primary/10 text-giftory-primary';
      case 'CONFIRMED':
        return 'bg-blue-50 text-blue-600';
      default:
        return 'bg-amber-50 text-amber-600';
    }
  }
}
