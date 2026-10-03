import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Product } from '../../../core/models';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <article class="bg-white rounded-2xl p-4 sm:p-5 shadow-shop-card border border-[#DDD6FE]/60 hover:shadow-floating hover:border-purple-300 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
      <!-- Top Image with Floating Badges -->
      <div class="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-50 mb-3.5 flex items-center justify-center">
        <img 
          [src]="product.images && product.images.length ? product.images[0] : 'https://placehold.co/400'" 
          [alt]="product.name" 
          class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        >

        <!-- Top Badges -->
        <div class="absolute top-2 left-2 flex flex-col gap-1 items-start z-10">
          @if (product.isCustomizable) {
            <span class="px-2.5 py-1 rounded-full bg-[#10B981] text-white font-semibold text-[11px] shadow-sm flex items-center gap-1">
              <span class="material-symbols-outlined text-[13px]">palette</span>
              Cọc 50% (BR-PAY05)
            </span>
          }
          @if (product.isFlashSale && product.flashSaleDiscountPercent) {
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

        <!-- 3D/AR Preview Badge if Bespoke -->
        @if (product.isCustomizable) {
          <div class="absolute bottom-2 left-2 right-2 py-1 px-2 rounded-lg bg-white/90 backdrop-blur-sm text-center shadow-sm">
            <span class="text-[11px] text-[#7C3AED] font-semibold flex items-center justify-center gap-1">
              <span class="material-symbols-outlined text-[13px]">view_in_ar</span>
              Mô phỏng 3D Khắc Laser
            </span>
          </div>
        }
      </div>

      <!-- Product Meta -->
      <div class="flex-1 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span class="truncate">{{ getCategoryName() }}</span>
            <div class="flex items-center gap-1 text-amber-500 font-semibold shrink-0">
              <span class="material-symbols-outlined text-[14px]">star</span>
              {{ product.rating || 4.9 }}
              <span class="text-slate-400 font-normal">({{ product.soldCount || 100 }}+)</span>
            </div>
          </div>

          <a [routerLink]="['/products', product.slug]" class="font-semibold text-sm sm:text-base text-[#1E1B4B] hover:text-[#7C3AED] transition-colors line-clamp-2 leading-snug" [title]="product.name">
            {{ product.name }}
          </a>
        </div>

        <!-- Price & Action Button -->
        <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <div class="flex items-baseline gap-1.5 flex-wrap">
              <span class="text-base sm:text-lg font-bold text-[#7C3AED]">
                {{ (product.salePrice && product.salePrice > 0 ? product.salePrice : product.price) | number:'1.0-0' }}đ
              </span>
              @if (product.salePrice && product.salePrice > 0 && product.salePrice < product.price) {
                <span class="text-xs text-slate-400 line-through">
                  {{ product.price | number:'1.0-0' }}đ
                </span>
              }
            </div>
            @if (product.isCustomizable) {
              <div class="text-[10px] text-emerald-600 font-medium">Cọc 50% chỉ từ {{ ((product.salePrice || product.price) * 0.5) | number:'1.0-0' }}đ</div>
            }
          </div>

          <!-- Quick Action Button -->
          @if (product.isCustomizable) {
            <a 
              [routerLink]="['/custom-studio']"
              [queryParams]="{ productId: product._id }"
              class="px-3 py-1.5 rounded-xl bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#7C3AED] font-semibold text-xs flex items-center gap-1 transition-all active:scale-95 shrink-0"
              title="Mở Studio chế tác cá nhân"
            >
              <span class="material-symbols-outlined text-[15px]">draw</span>
              <span>Chế tác</span>
            </a>
          } @else {
            <button 
              (click)="quickAddToCart($event)"
              class="w-8 h-8 rounded-xl bg-[#EDE9FE] hover:bg-[#7C3AED] text-[#7C3AED] hover:text-white flex items-center justify-center transition-all active:scale-95 shrink-0"
              title="Thêm nhanh vào giỏ"
            >
              <span class="material-symbols-outlined text-[18px]">add_shopping_cart</span>
            </button>
          }
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

  getCategoryName(): string {
    if (!this.product.category) return 'Quà Tặng Giftory';
    if (typeof this.product.category === 'object' && this.product.category.name) {
      return this.product.category.name;
    }
    return 'Quà Tặng Giftory';
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
        // Feedback toast or indicator
      }
    });
  }
}
