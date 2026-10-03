import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-[#F4F0FA] flex text-giftory-ink">
      <!-- Admin Sidebar Navigation (Stitch Screen 3079406608969517755) -->
      <aside class="w-64 bg-white border-r border-giftory-border flex flex-col justify-between p-6 shrink-0 hidden md:flex shadow-xs">
        <div class="space-y-8">
          <!-- Admin Brand -->
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-giftory-primary text-white flex items-center justify-center font-display font-black text-xl shadow">
              G
            </div>
            <div>
              <h2 class="font-display font-black text-lg text-giftory-ink leading-tight">Giftory Admin</h2>
              <span class="text-[10px] font-bold text-giftory-primary uppercase tracking-widest block">Xưởng Quà & Vận Hành</span>
            </div>
          </div>

          <!-- Navigation Links -->
          <nav class="space-y-1.5">
            <a
              routerLink="/admin/dashboard"
              routerLinkActive="bg-giftory-primary/10 text-giftory-primary font-bold"
              [routerLinkActiveOptions]="{ exact: true }"
              class="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold text-giftory-ink/70 hover:bg-giftory-canvas transition"
            >
              <span class="material-symbols-outlined text-lg">dashboard</span>
              Bảng Điều Khiển (KPI)
            </a>

            <a
              routerLink="/admin/products"
              routerLinkActive="bg-giftory-primary/10 text-giftory-primary font-bold"
              class="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold text-giftory-ink/70 hover:bg-giftory-canvas transition"
            >
              <span class="material-symbols-outlined text-lg">inventory_2</span>
              Quản Lý Sản Phẩm
            </a>

            <a
              routerLink="/admin/orders"
              routerLinkActive="bg-giftory-primary/10 text-giftory-primary font-bold"
              class="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold text-giftory-ink/70 hover:bg-giftory-canvas transition"
            >
              <span class="material-symbols-outlined text-lg">receipt_long</span>
              Quản Lý Đơn Hàng
            </a>

            <a
              routerLink="/admin/users"
              routerLinkActive="bg-giftory-primary/10 text-giftory-primary font-bold"
              class="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold text-giftory-ink/70 hover:bg-giftory-canvas transition"
            >
              <span class="material-symbols-outlined text-lg">group</span>
              Quản Trị Người Dùng
            </a>
          </nav>
        </div>

        <!-- Admin Profile & Switch to Store -->
        <div class="space-y-4 pt-6 border-t border-giftory-border/60">
          <div class="flex items-center gap-3 p-2 bg-giftory-canvas rounded-2xl">
            <div class="w-9 h-9 rounded-xl bg-giftory-primary text-white flex items-center justify-center font-bold text-sm">
              AD
            </div>
            <div class="overflow-hidden">
              <span class="text-xs font-bold text-giftory-ink block truncate">{{ authService.currentUser()?.fullName || 'Admin User' }}</span>
              <span class="text-[10px] text-giftory-primary font-mono block">admin&#64;giftory.vn</span>
            </div>
          </div>

          <div class="space-y-1">
            <a routerLink="/" class="flex items-center gap-2 px-3 py-2 text-xs font-bold text-giftory-ink/70 hover:text-giftory-primary hover:bg-giftory-canvas rounded-xl transition">
              <span class="material-symbols-outlined text-sm">storefront</span>
              Về Trang Mua Quà
            </a>
            <button (click)="logout()" class="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-giftory-sale hover:bg-giftory-sale/10 rounded-xl transition">
              <span class="material-symbols-outlined text-sm">logout</span>
              Đăng Xuất
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <!-- Top Mobile Header -->
        <header class="h-16 bg-white border-b border-giftory-border flex items-center justify-between px-6 md:hidden">
          <span class="font-display font-bold text-giftory-primary">Giftory Admin</span>
          <div class="flex items-center gap-4 text-xs font-bold">
            <a routerLink="/admin/dashboard">KPI</a>
            <a routerLink="/admin/products">Sản phẩm</a>
            <a routerLink="/admin/orders">Đơn hàng</a>
            <a routerLink="/">Cửa hàng</a>
          </div>
        </header>

        <div class="p-6 md:p-8 flex-1">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `
})
export class AdminLayoutComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
