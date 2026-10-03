import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-sidebar-rail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="fixed left-0 top-0 bottom-0 h-screen w-16 md:w-20 bg-white/95 backdrop-blur-md border-r border-[#DDD6FE] z-50 flex flex-col justify-between items-center py-4 shadow-sm select-none">
      <!-- Top Section: Brand Icon Logo (Matching Stitch) -->
      <div class="flex flex-col items-center flex-shrink-0 pt-1">
        <a routerLink="/" class="w-11 h-11 rounded-2xl flex items-center justify-center hover:scale-105 transition-transform cursor-pointer overflow-hidden p-0.5" title="Giftory Home">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7C3AED] via-[#9333EA] to-[#EC4899] text-white flex items-center justify-center font-display font-black text-xl shadow-md">
            G
          </div>
        </a>
      </div>

      <!-- Center Section: 8 Navigation Icons Exactly as in Stitch Design -->
      <nav class="flex-1 my-auto flex flex-col items-center justify-center gap-2.5 w-full px-2">
        <!-- 1. Trang Chủ (Home) -->
        <a
          routerLink="/"
          routerLinkActive="!bg-[#7C3AED] !text-white shadow-md shadow-purple-300 font-bold"
          [routerLinkActiveOptions]="{exact: true}"
          class="w-11 h-11 rounded-xl text-slate-400 hover:bg-[#E9DCF8] hover:text-[#7C3AED] flex items-center justify-center transition-all cursor-pointer group"
          title="Trang Chủ Discovery"
        >
          <span class="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">home</span>
        </a>

        <!-- 2. Tất Cả Sản Phẩm (Catalog / Grid) -->
        <a
          routerLink="/products"
          routerLinkActive="!bg-[#7C3AED] !text-white shadow-md shadow-purple-300 font-bold"
          class="w-11 h-11 rounded-xl text-slate-400 hover:bg-[#E9DCF8] hover:text-[#7C3AED] flex items-center justify-center transition-all cursor-pointer group"
          title="Tất Cả Quà Tặng"
        >
          <span class="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">grid_view</span>
        </a>

        <!-- 3. Giỏ Hàng (Cart with Badge) -->
        <a
          routerLink="/cart"
          routerLinkActive="!bg-[#7C3AED] !text-white shadow-md shadow-purple-300 font-bold"
          class="relative w-11 h-11 rounded-xl text-slate-400 hover:bg-[#E9DCF8] hover:text-[#7C3AED] flex items-center justify-center transition-all cursor-pointer group"
          title="Giỏ Hàng & Tách Cọc 50%"
        >
          <span class="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">shopping_bag</span>
          <span
            *ngIf="cartService.itemsCount() > 0"
            class="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#7C3AED] text-white text-[10px] flex items-center justify-center font-bold shadow-xs animate-scale-up"
          >
            {{ cartService.itemsCount() }}
          </span>
        </a>

        <!-- 4. Theo Dõi Đơn Hàng (Order Tracking - Highlighting active) -->
        <a
          routerLink="/orders"
          routerLinkActive="!bg-[#7C3AED] !text-white shadow-md shadow-purple-300 font-bold"
          class="w-11 h-11 rounded-xl text-slate-400 hover:bg-[#E9DCF8] hover:text-[#7C3AED] flex items-center justify-center transition-all cursor-pointer group"
          title="Theo Dõi Lộ Trình Đơn Hàng"
        >
          <span class="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">local_shipping</span>
        </a>

        <!-- 5. Quà Custom Studio (Bespoke Studio) -->
        <a
          routerLink="/custom-studio"
          routerLinkActive="!bg-[#7C3AED] !text-white shadow-md shadow-purple-300 font-bold"
          class="w-11 h-11 rounded-xl text-slate-400 hover:bg-[#E9DCF8] hover:text-[#7C3AED] flex items-center justify-center transition-all cursor-pointer group"
          title="Quà Custom Studio Bespoke"
        >
          <span class="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">storefront</span>
        </a>

        <!-- 6. Món Quà Đã Lưu (Wishlist) -->
        <a
          routerLink="/wishlist"
          routerLinkActive="!bg-[#7C3AED] !text-white shadow-md shadow-purple-300 font-bold"
          class="w-11 h-11 rounded-xl text-slate-400 hover:bg-[#E9DCF8] hover:text-[#7C3AED] flex items-center justify-center transition-all cursor-pointer group"
          title="Món Quà Đã Lưu & Bản Thiết Kế"
        >
          <span class="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">favorite</span>
        </a>

        <!-- 7. Flash Sale (Khung Giờ Vàng) -->
        <a
          routerLink="/flash-sale"
          routerLinkActive="!bg-[#7C3AED] !text-white shadow-md shadow-purple-300 font-bold"
          class="w-11 h-11 rounded-xl text-slate-400 hover:bg-[#E9DCF8] hover:text-[#7C3AED] flex items-center justify-center transition-all cursor-pointer group"
          title="Flash Sale Giờ Vàng"
        >
          <span class="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">bolt</span>
        </a>

        <!-- 8. Cẩm Nang Mua Hàng & Chính Sách Cọc -->
        <a
          routerLink="/shopping-guide"
          routerLinkActive="!bg-[#7C3AED] !text-white shadow-md shadow-purple-300 font-bold"
          class="w-11 h-11 rounded-xl text-slate-400 hover:bg-[#E9DCF8] hover:text-[#7C3AED] flex items-center justify-center transition-all cursor-pointer group"
          title="Cẩm Nang Mua Hàng & Chính Sách Cọc 50%"
        >
          <span class="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">menu_book</span>
        </a>

        <!-- Admin Portal Icon (Chỉ hiện khi role = ADMIN) -->
        <a
          *ngIf="authService.isAdmin()"
          routerLink="/admin/dashboard"
          class="w-11 h-11 rounded-xl bg-purple-100 text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs group mt-1"
          title="Trang Quản Trị Hệ Thống (Giftory Admin)"
        >
          <span class="material-symbols-outlined text-[22px]">admin_panel_settings</span>
        </a>
      </nav>

      <!-- Bottom Section: Member Avatar anchored at bottom with green indicator -->
      <div class="flex flex-col items-center flex-shrink-0 mt-auto pb-1">
        <a
          routerLink="/profile"
          class="relative w-11 h-11 rounded-full border-2 border-[#7C3AED] bg-[#E9DCF8] text-[#7C3AED] font-bold flex items-center justify-center shadow-xs cursor-pointer hover:scale-105 transition-transform group"
          title="Hồ Sơ Hội Viên & Điểm Thưởng"
        >
          <span class="text-xs font-black tracking-tighter">
            {{ getInitials() }}
          </span>
          <span class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
        </a>
      </div>
    </aside>
  `
})
export class SidebarRailComponent {
  authService = inject(AuthService);
  cartService = inject(CartService);

  getInitials(): string {
    const user = this.authService.currentUser();
    if (!user) return 'MA';
    const name = user.fullName || user.name || 'Member';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}
