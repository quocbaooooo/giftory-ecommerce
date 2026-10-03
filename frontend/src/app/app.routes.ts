import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Customer Storefront Routes
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'products',
    loadComponent: () => import('./features/products/products.component').then(m => m.ProductsComponent)
  },
  {
    path: 'products/:slug',
    loadComponent: () => import('./features/products/product-detail/product-detail.component').then(m => m.ProductDetailComponent)
  },
  {
    path: 'custom-studio',
    loadComponent: () => import('./features/custom-studio/custom-studio.component').then(m => m.CustomStudioComponent)
  },
  {
    path: 'custom-studio/:id',
    loadComponent: () => import('./features/custom-studio/custom-studio.component').then(m => m.CustomStudioComponent)
  },
  {
    path: 'flash-sale',
    loadComponent: () => import('./features/flash-sale/flash-sale.component').then(m => m.FlashSaleComponent)
  },
  {
    path: 'cart',
    loadComponent: () => import('./features/cart/cart.component').then(m => m.CartComponent)
  },
  {
    path: 'checkout',
    loadComponent: () => import('./features/checkout/checkout.component').then(m => m.CheckoutComponent)
  },
  {
    path: 'orders',
    loadComponent: () => import('./features/orders/orders.component').then(m => m.OrdersComponent)
  },
  {
    path: 'orders/:code',
    loadComponent: () => import('./features/orders/orders.component').then(m => m.OrdersComponent)
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'loyalty',
    loadComponent: () => import('./features/loyalty/loyalty.component').then(m => m.LoyaltyComponent)
  },
  {
    path: 'wishlist',
    loadComponent: () => import('./features/wishlist/wishlist.component').then(m => m.WishlistComponent)
  },
  {
    path: 'saved-designs',
    loadComponent: () => import('./features/wishlist/wishlist.component').then(m => m.WishlistComponent)
  },
  {
    path: 'shopping-guide',
    loadComponent: () => import('./features/shopping-guide/shopping-guide.component').then(m => m.ShoppingGuideComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent)
  },

  // Admin Portal Routes (Guarded by adminGuard)
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./features/admin/products/admin-products.component').then(m => m.AdminProductsComponent)
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/admin/orders/admin-orders.component').then(m => m.AdminOrdersComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/users/admin-users.component').then(m => m.AdminUsersComponent)
      }
    ]
  },

  // Catch-all
  {
    path: '**',
    redirectTo: ''
  }
];
