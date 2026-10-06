import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarRailComponent } from './shared/components/sidebar-rail/sidebar-rail.component';
import { AiConciergeComponent } from './shared/components/ai-concierge/ai-concierge.component';
import { AuthService } from './core/services/auth.service';
import { CartService } from './core/services/cart.service';

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

  constructor() {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      this.isAdminRoute.set(path.startsWith('/admin'));
      this.isCustomStudioRoute.set(path.startsWith('/custom-studio'));
    }

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isAdminRoute.set(event.urlAfterRedirects.startsWith('/admin'));
      this.isCustomStudioRoute.set(event.urlAfterRedirects.startsWith('/custom-studio'));
      window.scrollTo(0, 0);
    });
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.update(v => !v);
  }
}
