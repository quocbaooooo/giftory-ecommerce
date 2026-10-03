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
  mobileMenuOpen = signal<boolean>(false);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isAdminRoute.set(event.urlAfterRedirects.startsWith('/admin'));
      window.scrollTo(0, 0);
    });
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.update(v => !v);
  }
}
