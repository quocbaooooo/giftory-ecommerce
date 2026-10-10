import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Product } from '../../../core/models';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  host: {
    class: 'flex flex-col h-full w-full'
  },
  template: `
    <article class="w-full h-full bg-white rounded-2xl p-4 sm:p-5 shadow-shop-card border border-[#DDD6FE]/60 hover:shadow-floating hover:border-purple-300 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
      <!-- Top Image with Floating Badges -->
      <div class="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-50 mb-3.5 flex items-center justify-center shrink-0">
        <img 
          [src]="product.images && product.images.length ? product.images[0] : 'https://placehold.co/400'" 
          [alt]="product.name" 
          class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        >

        <!-- Top-Left Badge (Max 1 merged badge to avoid visual cluttering) -->
        <div class="absolute top-2 left-2 z-10">
          @if (product.isCustomizable && product.isFlashSale && product.flashSaleDiscountPercent) {
            <span class="px-2.5 py-1 rounded-full bg-[#10B981] text-white font-semibold text-[11px] shadow-sm flex items-center gap-1">
              <span class="material-symbols-outlined text-[13px]">palette</span>
              Cọc 50% • -{{ product.flashSaleDiscountPercent }}%
            </span>
          } @else if (product.isCustomizable) {
            <span class="px-2.5 py-1 rounded-full bg-[#10B981] text-white font-semibold text-[11px] shadow-sm flex items-center gap-1">
              <span class="material-symbols-outlined text-[13px]">palette</span>
              Cọc 50%
            </span>
          } @else if (product.isFlashSale && product.flashSaleDiscountPercent) {
            <span class="px-2.5 py-1 rounded-full bg-[#F43F5E] text-white font-bold text-[11px] shadow-sm flex items-center gap-1">
              <span class="material-symbols-outlined text-[13px]">bolt</span>
              -{{ product.flashSaleDiscountPercent }}%
            </span>
          }
        </div>

        <!-- Wishlist Heart Button -->
        <button 
          (click)="toggleWishlist($event)"
          class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-slate-400 hover:text-[#F43F5E] flex items-center justify-center shadow-sm transition-transform active:scale-90 z-10"
          [class.text-[#F43F5E]]="isWishlisted()"
          title="Lưu vào danh sách quà tặng"
        >
          <span class="material-symbols-outlined text-[18px]" [class.fill-1]="isWishlisted()">favorite</span>
        </button>

        <!-- 3D/AR Interactive Studio Link Pill Button -->
        @if (product.isCustomizable) {
          <a 
            [routerLink]="['/custom-studio']"
            [queryParams]="{ productId: product._id }"
            (click)="$event.stopPropagation()"
            class="absolute bottom-2 left-2 right-2 py-1.5 px-2 rounded-xl bg-white/95 hover:bg-white text-[#7C3AED] hover:text-[#6D28D9] font-bold text-[11px] text-center shadow-md border border-purple-100 flex items-center justify-center gap-1 transition-all active:scale-95 z-10 cursor-pointer"
            title="Mở Custom Studio mô phỏng 3D"
          >
            <span class="material-symbols-outlined text-[14px]">view_in_ar</span>
            <span>Mô phỏng 3D Khắc Laser →</span>
          </a>
        }
      </div>

      <!-- Product Meta Body -->
      <div class="flex-1 flex flex-col justify-between">
        <div>
          <!-- Category & Rating Row: Fixed height 20px -->
          <div class="flex items-center justify-between text-xs text-slate-500 mb-1.5 h-5 shrink-0">
            <span class="truncate font-semibold text-slate-400 max-w-[62%]">{{ getCategoryName() }}</span>
            <div class="flex items-center gap-1 text-amber-500 font-semibold shrink-0 text-xs">
              <span class="material-symbols-outlined text-[14px]">star</span>
              <span>{{ product.rating || 4.9 }}</span>
              <span class="text-slate-400 font-normal">({{ product.soldCount || 100 }}+)</span>
            </div>
          </div>

          <!-- Title: Standardized fixed 2-line height so 1-line and 2-line titles align perfectly -->
          <div class="h-10 sm:h-11 mb-1 flex items-start">
            <a [routerLink]="['/products', product.slug]" 
               class="font-bold text-sm sm:text-base text-[#1E1B4B] hover:text-[#7C3AED] transition-colors line-clamp-2 leading-snug" 
               [title]="product.name">
              {{ product.name }}
            </a>
          </div>
        </div>

        <!-- Price & Action Row: Pinned to bottom, identical vertical space across all cards -->
        <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline gap-1.5 flex-wrap">
              <span class="text-base sm:text-lg font-bold text-[#7C3AED] leading-none">
                {{ (product.salePrice && product.salePrice > 0 ? product.salePrice : product.price) | number:'1.0-0' }}đ
              </span>
              @if (product.salePrice && product.salePrice > 0 && product.salePrice < product.price) {
                <span class="text-xs text-slate-400 line-through leading-none">
                  {{ product.price | number:'1.0-0' }}đ
                </span>
              }
            </div>
            <!-- Subtitle / Deposit guarantee row: Always reserved 18px height -->
            <div class="h-4.5 min-h-[18px] flex items-center mt-1">
              @if (product.isCustomizable) {
                <span class="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 truncate">
                  <span class="material-symbols-outlined text-[12px]">payments</span>
                  Cọc 50% chỉ từ {{ ((product.salePrice || product.price) * 0.5) | number:'1.0-0' }}đ
                </span>
              } @else {
                <span class="text-[10px] text-slate-400 font-medium flex items-center gap-0.5 truncate">
                  <span class="material-symbols-outlined text-[12px] text-emerald-500">verified</span>
                  Chính hãng • Giao nhanh
                </span>
              }
            </div>
          </div>

          <!-- Quick Action Button: Standardized height (h-9) -->
          <div class="shrink-0 flex items-center">
            @if (product.isCustomizable) {
              <a 
                [routerLink]="['/custom-studio']"
                [queryParams]="{ productId: product._id }"
                class="h-9 px-3 rounded-xl bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#7C3AED] font-semibold text-xs flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                title="Mở Studio chế tác cá nhân"
              >
                <span class="material-symbols-outlined text-[15px]">draw</span>
                <span>Chế tác</span>
              </a>
            } @else {
              <button 
                (click)="quickAddToCart($event)"
                class="w-9 h-9 rounded-xl bg-[#EDE9FE] hover:bg-[#7C3AED] text-[#7C3AED] hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
                title="Thêm nhanh vào giỏ"
              >
                <span class="material-symbols-outlined text-[18px]">add_shopping_cart</span>
              </button>
            }
          </div>
        </div>
      </div>
    </article>
  `
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;

  cartService = inject(CartService);
  wishlistService = inject(WishlistService);
  authService = inject(AuthService);
  private router = inject(Router);

  getCategoryName(): string {
    if (!this.product.category) return 'Giftory Studio';
    let catName = '';
    if (typeof this.product.category === 'object' && this.product.category.name) {
      catName = this.product.category.name;
    } else if (typeof this.product.category === 'string') {
      catName = this.product.category;
    }

    if (!catName || catName === 'Quà Tặng Giftory') return 'Giftory Studio';

    // Avoid title redundancy (e.g. category "Móc Khóa Thỏ Gỗ Đôi" vs product title "Móc Khóa Thỏ Gỗ Đôi Cá Nhân Hóa...")
    if (this.product.name && (this.product.name.toLowerCase().startsWith(catName.toLowerCase()) || catName.length > 25)) {
      if (catName.includes('Móc Khóa')) return 'Móc Khóa & Quà Gỗ';
      if (catName.includes('Bình Giữ')) return 'Bình Giữ Nhiệt & Cốc Sứ';
      if (catName.includes('Nến Thơm')) return 'Nến Thơm & Decor';
      if (catName.includes('Sổ Tay')) return 'Sổ Tay & Bút Ký';
      if (catName.includes('Áo Thun')) return 'Thời Trang Custom';
      return 'Giftory Bespoke';
    }

    return catName;
  }

  isWishlisted(): boolean {
    return this.wishlistService.isWishlisted(this.product._id);
  }

  toggleWishlist(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.authService.isAuthenticated()) {
      alert('Vui lòng đăng nhập để lưu quà tặng yêu thích!');
      return;
    }
    this.wishlistService.toggleProduct(this.product._id).subscribe();
  }

  quickAddToCart(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.cartService.addItem(this.product._id, 1).subscribe({
      next: () => {
        this.router.navigate(['/cart']);
      }
    });
  }
}
