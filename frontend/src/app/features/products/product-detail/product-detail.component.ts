import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { Product, ProductVariant } from '../../../core/models';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ProductCardComponent],
  template: `
    @if (product(); as prod) {
      <div class="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <!-- Breadcrumb -->
        <div class="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <a routerLink="/" class="hover:text-[#7C3AED]">Trang chủ</a>
          <span>/</span>
          <a routerLink="/products" class="hover:text-[#7C3AED]">Sản phẩm</a>
          <span>/</span>
          <span class="text-[#1E1B4B] font-semibold truncate">{{ prod.name }}</span>
        </div>

        <!-- AI Recommendation Referral Banner (US-PD-05.3) -->
        @if (isFromAiRecommendation()) {
          <div class="mb-6 p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 border border-purple-200/90 text-[#7C3AED] flex items-center justify-between shadow-2xs">
            <div class="flex items-center gap-2.5 text-xs font-semibold">
              <span class="material-symbols-outlined text-[20px] text-pink-500 animate-spin">auto_awesome</span>
              <span>Món quà này được <strong>Trợ lý Giftory AI</strong> gợi ý riêng dựa theo sở thích và ngân sách của bạn!</span>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-200/80 font-bold uppercase tracking-wider text-purple-800">
              AI Match
            </span>
          </div>
        }

        <!-- Main Product Section: 6 Cols Left (Gallery) / 6 Cols Right (Details) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 bg-white rounded-3xl p-6 md:p-8 shadow-shop-card border border-[#DDD6FE] mb-12">
          
          <!-- LEFT: GALLERY -->
          <div class="lg:col-span-6 flex flex-col gap-4">
            <!-- Main Image Display -->
            <div class="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center">
              <img 
                [src]="activeImage()" 
                [alt]="prod.name" 
                class="w-full h-full object-cover transition-all duration-300"
              >

              @if (prod.isCustomizable) {
                <div class="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#10B981] text-white font-bold text-xs shadow-md flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[15px]">palette</span>
                  <span>Cọc 50% Thiết Kế</span>
                </div>
              }
            </div>

            <!-- Thumbnail Grid -->
            @if (prod.images && prod.images.length > 1) {
              <div class="flex items-center gap-3 overflow-x-auto pb-1">
                @for (img of prod.images; track img) {
                  <button 
                    (click)="activeImage.set(img)"
                    class="w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer"
                    [class.border-[#7C3AED]]="activeImage() === img"
                    [class.border-slate-200]="activeImage() !== img"
                  >
                    <img [src]="img" [alt]="prod.name" class="w-full h-full object-cover">
                  </button>
                }
              </div>
            }
          </div>

          <!-- RIGHT: PRODUCT INFO & CUSTOMIZER ACTIONS -->
          <div class="lg:col-span-6 flex flex-col justify-between">
            <div>
              <!-- Badges & Ratings -->
              <div class="flex items-center gap-3 mb-2 flex-wrap">
                <span class="px-2.5 py-0.5 rounded-full bg-purple-100 text-[#7C3AED] font-semibold text-xs">
                  Bespoke Giftory
                </span>
                <div class="flex items-center gap-1 text-amber-500 font-bold text-xs">
                  <span class="material-symbols-outlined text-[16px]">star</span>
                  <span>{{ prod.rating }}</span>
                  <span class="text-slate-400 font-normal">({{ prod.soldCount || 100 }}+ đã bán)</span>
                </div>
                <span class="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                  Còn hàng sẵn sàng
                </span>
              </div>

              <!-- Product Name -->
              <h1 class="text-2xl sm:text-3xl font-bold text-[#1E1B4B] leading-tight mb-2">
                {{ prod.name }}
              </h1>

              <!-- Product Short Description Excerpt -->
              @if (prod.description) {
                <p class="text-slate-600 text-xs sm:text-sm leading-relaxed mb-4 font-normal">
                  {{ prod.description }}
                </p>
              }

              <!-- Price Breakdown -->
              <div class="p-4 rounded-2xl bg-[#F5EEFD] border border-[#DDD6FE] mb-6 flex items-baseline justify-between gap-4">
                <div>
                  <div class="flex items-baseline gap-2">
                    <span class="text-2xl sm:text-3xl font-extrabold text-[#7C3AED]">
                      {{ (prod.salePrice && prod.salePrice > 0 ? prod.salePrice : prod.price) | number:'1.0-0' }}đ
                    </span>
                    @if (prod.salePrice && prod.salePrice > 0) {
                      <span class="text-sm text-slate-400 line-through">
                        {{ prod.price | number:'1.0-0' }}đ
                      </span>
                    }
                  </div>
                  @if (prod.isCustomizable) {
                    <p class="text-xs text-[#10B981] font-bold mt-1">
                      ⚡ Cần cọc trước 50%: {{ ((prod.salePrice || prod.price) * 0.5) | number:'1.0-0' }}đ để xưởng sản xuất
                    </p>
                  }
                </div>
                <div class="text-right text-[11px] text-slate-500">
                  <span>Mã SKU: {{ prod.sku || 'GF-BESPOKE' }}</span>
                </div>
              </div>

              <!-- Bespoke Notice Banner -->
              @if (prod.isCustomizable) {
                <div class="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-purple-50 to-emerald-50 border border-emerald-200 text-slate-700 text-xs leading-relaxed flex flex-col gap-2.5">
                  <div class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-emerald-600 text-xl shrink-0 mt-0.5">verified_user</span>
                    <div>
                      <strong class="text-emerald-800 font-bold block mb-0.5">Chính Sách Chế Tác Quà Tặng Theo Yêu Cầu</strong>
                      Sản phẩm này hỗ trợ tùy chỉnh cá nhân hóa 2D/3D trực quan. Bạn chỉ cần cọc trước 50% khi đặt hàng, 50% còn lại thanh toán COD khi nhận hàng và kiểm tra trọn vẹn.
                    </div>
                  </div>

                  <!-- Customizable Attributes List -->
                  <div class="pt-2 border-t border-emerald-200/60 flex items-center gap-1.5 flex-wrap text-[11px] font-medium text-slate-600">
                    <span class="font-bold text-[#7C3AED] flex items-center gap-1">
                      <span class="material-symbols-outlined text-[14px]">tune</span>
                      Thuộc tính tùy biến:
                    </span>
                    <span class="px-2 py-0.5 rounded-md bg-white border border-purple-200 text-[#7C3AED]">Khắc 2 mặt (Trước/Sau)</span>
                    <span class="px-2 py-0.5 rounded-md bg-white border border-purple-200 text-[#7C3AED]">Font chữ nghệ thuật</span>
                    <span class="px-2 py-0.5 rounded-md bg-white border border-purple-200 text-[#7C3AED]">Phủ màu Gold/Silver/Ruby</span>
                    <span class="px-2 py-0.5 rounded-md bg-white border border-purple-200 text-[#7C3AED]">Tải ảnh cá nhân</span>
                    <span class="px-2 py-0.5 rounded-md bg-white border border-purple-200 text-[#7C3AED]">Sticker đồ họa</span>
                  </div>
                </div>
              }

              <!-- Variants Selection -->
              @if (prod.variants && prod.variants.length > 0) {
                <div class="mb-6">
                  <div class="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                    <span>Phân loại / Tùy chọn phối màu:</span>
                    <span class="text-[11px] text-[#7C3AED] font-semibold">{{ selectedVariant() }}</span>
                  </div>
                  <div class="flex items-center gap-2 flex-wrap">
                    @for (v of prod.variants; track v.sku || v.name) {
                      @if (v.status !== 'HIDDEN') {
                        @let isOos = (v.stock || 0) <= 0 || v.status === 'OUT_OF_STOCK';
                        <button 
                          (click)="onSelectVariant(v)"
                          [disabled]="isOos"
                          class="px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2"
                          [ngClass]="{
                            'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400': isOos,
                            'cursor-pointer': !isOos,
                            'border-[#7C3AED] bg-purple-50 text-[#7C3AED] shadow-xs': selectedVariant() === v.name && !isOos,
                            'border-slate-200 bg-white text-slate-700 hover:border-purple-200': selectedVariant() !== v.name && !isOos
                          }"
                        >
                          <span class="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0 shadow-2xs" [style.backgroundColor]="v.colorHex || '#1E1B4B'"></span>
                          <span>{{ v.name }}</span>
                          @if (isOos) {
                            <span class="text-[9px] font-bold text-red-500 bg-red-50 px-1 rounded">Hết hàng</span>
                          }
                        </button>
                      }
                    }
                  </div>
                </div>
              }

              <!-- Quantity Selector -->
              <div class="flex items-center gap-4 mb-6">
                <span class="text-xs font-bold text-slate-700">Số lượng:</span>
                <div class="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                  <button 
                    (click)="changeQuantity(-1)"
                    class="w-8 h-8 rounded-lg bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-sm"
                  >
                    <span class="material-symbols-outlined text-[16px]">remove</span>
                  </button>
                  <span class="w-10 text-center text-sm font-bold text-[#1E1B4B]">{{ quantity() }}</span>
                  <button 
                    (click)="changeQuantity(1)"
                    class="w-8 h-8 rounded-lg bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-sm"
                  >
                    <span class="material-symbols-outlined text-[16px]">add</span>
                  </button>
                </div>
              </div>

              <!-- Specifications Table -->
              @if (prod.specs && prod.specs.length > 0) {
                <div class="mb-6 border-t border-slate-100 pt-4">
                  <h4 class="text-xs font-bold text-slate-700 mb-2.5">Thông Số Kỹ Thuật:</h4>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    @for (s of prod.specs; track s.key) {
                      <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col">
                        <span class="text-slate-400 text-[10px]">{{ s.key }}</span>
                        <span class="font-semibold text-slate-800">{{ s.value }}</span>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Action Buttons -->
            <div class="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
              @if (prod.isCustomizable) {
                <a 
                  [routerLink]="['/custom-studio']"
                  [queryParams]="{ productId: prod._id }"
                  class="w-full sm:flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] hover:from-[#6D28D9] hover:to-[#7E22CE] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-300 transition-all active:scale-95"
                >
                  <span class="material-symbols-outlined text-[20px]">view_in_ar</span>
                  <span>Tự Thiết Kế 2D/3D Trong Studio</span>
                </a>
              }

              <button 
                (click)="addToCart()"
                class="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#7C3AED] font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <span class="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                <span>Thêm vào giỏ</span>
              </button>

              <button 
                (click)="toggleWishlist()"
                class="w-12 h-12 rounded-xl border border-[#DDD6FE] text-slate-400 hover:text-[#F43F5E] flex items-center justify-center transition-all shrink-0"
                [class.text-[#F43F5E]]="isWishlisted()"
                title="Lưu vào Wishlist"
              >
                <span class="material-symbols-outlined text-[22px]" [class.fill-1]="isWishlisted()">favorite</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Product Detailed Description & Craftsmanship Showcase Card -->
        <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-shop-card border border-[#DDD6FE] mb-12">
          <div class="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div class="w-10 h-10 rounded-2xl bg-purple-100 text-[#7C3AED] flex items-center justify-center font-bold shrink-0">
              <span class="material-symbols-outlined text-[22px]">description</span>
            </div>
            <div>
              <h3 class="text-lg sm:text-xl font-bold text-[#1E1B4B]">Mô Tả Sản Phẩm & Quy Chuẩn Chế Tác</h3>
              <p class="text-slate-500 text-xs mt-0.5">Thông tin chi tiết về tính năng, chất liệu và dịch vụ đóng gói độc bản</p>
            </div>
          </div>

          <!-- Main Description Content -->
          <div class="space-y-4">
            <div class="p-5 rounded-2xl bg-purple-50/50 border border-purple-100/80 text-slate-700 text-sm sm:text-base leading-relaxed space-y-3 font-normal">
              <p class="whitespace-pre-line leading-loose text-slate-800">
                {{ prod.description || 'Sản phẩm quà tặng bespoke cao cấp được tác chế tỉ mỉ bởi Giftory. Đạt tiêu chuẩn thẩm mỹ đỉnh cao, đóng gói lụa cao cấp và bảo hành đổi trả 100% yên tâm.' }}
              </p>
            </div>
          </div>

          <!-- Feature Assurance Cards Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
            <div class="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="material-symbols-outlined text-[#7C3AED] text-xl shrink-0 mt-0.5">verified</span>
              <div>
                <h5 class="font-bold text-xs text-[#1E1B4B]">Chất Liệu Cao Cấp</h5>
                <p class="text-[11px] text-slate-500 mt-1 leading-relaxed">Đã qua kiểm định độ bền, an toàn tuyệt đối cho người sử dụng.</p>
              </div>
            </div>

            <div class="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="material-symbols-outlined text-[#7C3AED] text-xl shrink-0 mt-0.5">brush</span>
              <div>
                <h5 class="font-bold text-xs text-[#1E1B4B]">Chế Tác Thủ Công</h5>
                <p class="text-[11px] text-slate-500 mt-1 leading-relaxed">Khắc laser Fiber / thêu vi tính nghệ thuật theo yêu cầu riêng.</p>
              </div>
            </div>

            <div class="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="material-symbols-outlined text-[#7C3AED] text-xl shrink-0 mt-0.5">card_giftcard</span>
              <div>
                <h5 class="font-bold text-xs text-[#1E1B4B]">Đóng Gói Nơ Lụa</h5>
                <p class="text-[11px] text-slate-500 mt-1 leading-relaxed">Hộp quà cứng lót nhung/satin sang trọng tặng kèm thiệp chúc mừng viết tay.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Related Products Section -->
        @if (prod.relatedProducts && prod.relatedProducts.length > 0) {
          <div class="mt-12">
            <h3 class="text-xl font-bold text-[#1E1B4B] mb-6">Sản Phẩm Cùng Bộ Sưu Tập</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              @for (rel of prod.relatedProducts; track rel._id) {
                <app-product-card [product]="rel"></app-product-card>
              }
            </div>
          </div>
        }
      </div>
    }
  `
})
export class ProductDetailComponent implements OnInit {
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private wishlistService = inject(WishlistService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  product = signal<Product | null>(null);
  activeImage = signal<string>('');
  selectedVariant = signal<string>('Tiêu chuẩn');
  quantity = signal<number>(1);
  isFromAiRecommendation = signal<boolean>(false);

  ngOnInit(): void {
    // Track AI Recommendation referral (US-PD-05.3)
    this.route.queryParams.subscribe(qParams => {
      if (qParams['ref'] === 'ai_recommendation') {
        this.isFromAiRecommendation.set(true);
        const sessionId = qParams['session_id'];
        console.log(`[Analytics Event] Product viewed via AI Recommendation. Session: ${sessionId}`);
      }
    });

    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug');
      if (slug) {
        this.productService.getProductBySlug(slug).subscribe({
          next: p => {
            this.product.set(p);
            this.activeImage.set(p.images && p.images.length ? p.images[0] : '');
            if (p.variants && p.variants.length > 0) {
              const active = p.variants.find(v => v.status !== 'HIDDEN' && (v.stock || 0) > 0) || p.variants[0];
              if (active) {
                this.selectedVariant.set(active.name);
                if (active.image) {
                  this.activeImage.set(active.image);
                }
              }
            }
          }
        });
      }
    });
  }

  onSelectVariant(v: any): void {
    if ((v.stock || 0) <= 0 || v.status === 'OUT_OF_STOCK') return;
    this.selectedVariant.set(v.name);
    if (v.image) {
      this.activeImage.set(v.image);
    }
  }

  changeQuantity(delta: number): void {
    const next = this.quantity() + delta;
    if (next >= 1) {
      this.quantity.set(next);
    }
  }

  isWishlisted(): boolean {
    const p = this.product();
    return p ? this.wishlistService.isWishlisted(p._id) : false;
  }

  toggleWishlist(): void {
    const p = this.product();
    if (p) {
      this.wishlistService.toggleProduct(p._id).subscribe();
    }
  }

  addToCart(): void {
    const p = this.product();
    if (!p) return;

    this.cartService.addItem(p._id, this.quantity(), this.selectedVariant()).subscribe({
      next: () => {
        this.router.navigate(['/cart']);
      }
    });
  }
}
