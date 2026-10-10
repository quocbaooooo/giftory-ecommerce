import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarRailComponent } from './shared/components/sidebar-rail/sidebar-rail.component';
import { AiConciergeComponent } from './shared/components/ai-concierge/ai-concierge.component';
import { AuthService } from './core/services/auth.service';
import { CartService } from './core/services/cart.service';

export interface AnnouncementItem {
  icon: string;
  badge: string;
  text: string;
  linkText: string;
  link: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SidebarRailComponent,
    AiConciergeComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private router = inject(Router);
  authService = inject(AuthService);
  cartService = inject(CartService);

  isAdminRoute = signal<boolean>(false);
  isCustomStudioRoute = signal<boolean>(false);
  mobileMenuOpen = signal<boolean>(false);

  // Auto-rotating Announcement Ticker (3-4 seconds per message)
  announcements: AnnouncementItem[] = [
    {
      icon: 'stars',
      badge: 'Bespoke Studio',
      text: 'Hệ sinh thái Quà Tặng Bespoke Giftory • Thiết kế 1:1 độc bản',
      linkText: 'Khám phá Studio',
      link: '/custom-studio'
    },
    {
      icon: 'local_shipping',
      badge: 'Freeship 499K',
      text: 'Miễn phí vận chuyển hỏa tốc cho tất cả đơn hàng từ 499.000đ',
      linkText: 'Mua sắm ngay',
      link: '/products'
    },
    {
      icon: 'edit_note',
      badge: 'Thiệp Độc Bản',
      text: 'Tặng kèm thiệp chúc mừng viết tay nghệ thuật cho mọi món quà',
      linkText: 'Xem chi tiết',
      link: '/shopping-guide'
    },
    {
      icon: 'card_membership',
      badge: 'Giftory Rewards',
      text: 'Đăng ký hội viên Giftory Club & Nhận ngay 100 điểm thưởng',
      linkText: 'Nhận 100 điểm',
      link: '/loyalty'
    }
  ];

  currentAnnouncementIndex = signal<number>(0);

  constructor() {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      this.isAdminRoute.set(path.startsWith('/admin'));
      this.isCustomStudioRoute.set(path.startsWith('/custom-studio'));

      // Ticker interval every 3.5s
      setInterval(() => {
        this.currentAnnouncementIndex.update(idx => (idx + 1) % this.announcements.length);
      }, 3500);
    }

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isAdminRoute.set(event.urlAfterRedirects.startsWith('/admin'));
      this.isCustomStudioRoute.set(event.urlAfterRedirects.startsWith('/custom-studio'));
      window.scrollTo(0, 0);
    });
  }

  nextAnnouncement() {
    this.currentAnnouncementIndex.update(idx => (idx + 1) % this.announcements.length);
  }

  prevAnnouncement() {
    this.currentAnnouncementIndex.update(idx => (idx - 1 + this.announcements.length) % this.announcements.length);
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.update(v => !v);
  }
}
