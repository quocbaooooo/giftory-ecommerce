import { Component, ElementRef, HostListener, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-sidebar-rail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  styles: [`
    .rail-link { display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;width:100%;min-height:54px;border-radius:14px;color:#64748b;position:relative;transition:background .15s,color .15s }
    .rail-link:hover { background:#f3ebf9;color:#7c3aed }
    .rail-link.active { background:#7c3aed;color:white }
    .rail-link:focus-visible,.account-link:focus-visible,button:focus-visible { outline:2px solid #7c3aed;outline-offset:3px }
    .account-link { display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:10px;font-size:13px;color:#334155;width:100%;text-align:left }
    .account-link:hover,.account-link.active { background:#f3ebf9;color:#7c3aed }
    .account-link .material-symbols-outlined { font-size:20px }
  `],
  template: `
    <aside class="fixed left-0 inset-y-0 h-dvh w-16 md:w-20 bg-white/95 backdrop-blur-md border-r border-[#DDD6FE] z-50 flex flex-col items-center py-3 shadow-sm">
      <a routerLink="/" class="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center hover:bg-purple-50 focus-visible:outline-purple-600" title="Trang chủ Giftory" aria-label="Trang chủ Giftory">
        <img src="/logo.png" alt="Giftory" class="w-10 h-10 object-contain" />
      </a>

      <nav aria-label="Điều hướng chính" class="flex-1 min-h-0 overflow-y-auto w-full px-1.5 md:px-2 py-4">
        <div class="min-h-full flex flex-col justify-center gap-2">
          @for (item of primaryLinks; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.path === '/' }" ariaCurrentWhenActive="page" class="rail-link shrink-0" [title]="item.title" [attr.aria-label]="item.title">
              <span class="material-symbols-outlined text-[22px]" aria-hidden="true">{{ item.icon }}</span>
              <span class="text-[9px] md:text-[10px] font-semibold">{{ item.label }}</span>
              @if (item.path === '/cart' && cartService.productCount() > 0) {
                <span class="absolute top-0 right-0 min-w-[17px] px-1 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold" [attr.aria-label]="cartService.productCount() + ' sản phẩm, tổng số lượng ' + cartService.itemsCount()">{{ cartService.productCount() > 99 ? '99+' : cartService.productCount() }}</span>
              }
            </a>
          }
        </div>
      </nav>

      <div #accountArea class="relative shrink-0 pt-3 border-t border-purple-100" (focusout)="onFocusOut($event)">
        <button #avatarButton type="button" (click)="toggleMenu()" [attr.aria-expanded]="menuOpen()" aria-controls="account-navigation" aria-label="Mở menu tài khoản và tiện ích" title="Tài khoản & tiện ích" class="w-11 h-11 rounded-full border-2 border-purple-600 bg-purple-100 text-purple-700 flex items-center justify-center hover:bg-purple-200 transition-colors">
          @if (authService.currentUser()) { <span class="text-xs font-bold">{{ getInitials() }}</span> }
          @else { <span class="material-symbols-outlined" aria-hidden="true">person</span> }
        </button>
        @if (menuOpen()) {
          <div id="account-navigation" class="absolute left-[calc(100%+14px)] bottom-0 w-64 max-w-[calc(100vw-90px)] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-2xl border border-purple-100 bg-white shadow-xl p-2" aria-label="Tài khoản và tiện ích">
            <div class="px-3 py-3 border-b border-slate-100 mb-1">
              <p class="text-sm font-bold text-slate-900 truncate">{{ authService.currentUser()?.name || 'Chào bạn!' }}</p>
              <p class="text-xs text-slate-500 mt-1">{{ authService.currentUser() ? 'Tài khoản & tiện ích' : 'Đăng nhập để quản lý quà của bạn' }}</p>
            </div>
            <nav aria-label="Tài khoản và hỗ trợ">
              @if (authService.currentUser()) {
                <a routerLink="/profile" routerLinkActive="active" class="account-link" (click)="closeMenu()"><span class="material-symbols-outlined" aria-hidden="true">person</span>Hồ sơ của tôi</a>
              } @else {
                <a routerLink="/login" class="account-link" (click)="closeMenu()"><span class="material-symbols-outlined" aria-hidden="true">login</span>Đăng nhập / Đăng ký</a>
              }
              @for (item of accountLinks; track item.path) {
                <a [routerLink]="item.path" routerLinkActive="active" ariaCurrentWhenActive="page" class="account-link" (click)="closeMenu()"><span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>{{ item.label }}</a>
              }
              @if (authService.isAdmin()) {
                <a routerLink="/admin/dashboard" class="account-link border-t border-slate-100 mt-1" (click)="closeMenu()"><span class="material-symbols-outlined" aria-hidden="true">admin_panel_settings</span>Quản trị Giftory</a>
              }
            </nav>
            @if (authService.currentUser()) {
              <button type="button" class="account-link border-t border-slate-100 mt-1" (click)="logout()"><span class="material-symbols-outlined" aria-hidden="true">logout</span>Đăng xuất</button>
            }
          </div>
        }
      </div>
    </aside>
  `,
})
export class SidebarRailComponent {
  authService = inject(AuthService);
  cartService = inject(CartService);
  private router = inject(Router);
  @ViewChild('accountArea') accountArea?: ElementRef<HTMLElement>;
  @ViewChild('avatarButton') avatarButton?: ElementRef<HTMLButtonElement>;
  menuOpen = signal(false);
  primaryLinks = [
    { path: '/', icon: 'home', label: 'Trang chủ', title: 'Trang chủ Giftory' },
    { path: '/products', icon: 'grid_view', label: 'Quà tặng', title: 'Khám phá sản phẩm' },
    { path: '/custom-studio', icon: 'palette', label: 'Studio', title: 'Thiết kế quà cá nhân hóa' },
    { path: '/cart', icon: 'shopping_bag', label: 'Giỏ hàng', title: 'Giỏ hàng' },
    { path: '/orders', icon: 'local_shipping', label: 'Đơn hàng', title: 'Theo dõi đơn hàng' },
    { path: '/flash-sale', icon: 'bolt', label: 'Ưu đãi', title: 'Ưu đãi & Flash Sale' },
  ];
  accountLinks = [
    { path: '/wishlist', icon: 'favorite', label: 'Quà & thiết kế đã lưu' },
    { path: '/loyalty', icon: 'stars', label: 'Điểm thưởng của tôi' },
    { path: '/care', icon: 'support_agent', label: 'Thông báo & hỗ trợ' },
    { path: '/shopping-guide', icon: 'menu_book', label: 'Hướng dẫn mua hàng' },
  ];
  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof NavigationEnd) this.closeMenu();
    });
  }
  toggleMenu() {
    this.menuOpen.update(open => !open);
    if (this.menuOpen()) setTimeout(() => {
      if (this.menuOpen()) this.accountArea?.nativeElement.querySelector<HTMLElement>('#account-navigation a')?.focus();
    });
  }
  closeMenu(restoreFocus = false) {
    this.menuOpen.set(false);
    if (restoreFocus) this.avatarButton?.nativeElement.focus();
  }
  @HostListener('document:click', ['$event'])
  onOutsideClick(event: MouseEvent) {
    if (!this.accountArea?.nativeElement.contains(event.target as Node)) this.closeMenu();
  }
  @HostListener('document:keydown.escape')
  onEscape() { if (this.menuOpen()) this.closeMenu(true); }
  onFocusOut(event: FocusEvent) {
    if (!this.accountArea?.nativeElement.contains(event.relatedTarget as Node | null)) this.closeMenu();
  }
  logout() { this.closeMenu(); this.authService.logout(); }
  getInitials(): string {
    const user = this.authService.currentUser();
    const parts = (user?.fullName || user?.name || 'Member').trim().split(/\s+/);
    return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
  }
}
