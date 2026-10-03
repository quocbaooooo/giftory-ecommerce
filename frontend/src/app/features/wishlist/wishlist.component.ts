import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { WishlistService } from '../../core/services/wishlist.service';
import { CustomStudioService } from '../../core/services/custom-studio.service';
import { CartService } from '../../core/services/cart.service';
import { Product, CustomDesign } from '../../core/models';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <!-- Header -->
      <div class="border-b border-giftory-border/60 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span class="text-xs font-bold tracking-widest text-giftory-primary uppercase">Bộ Sưu Tập Riêng</span>
          <h1 class="text-3xl font-display font-black text-giftory-ink mt-1">Món Quà Đã Lưu & Bản Thiết Kế Của Bạn</h1>
          <p class="text-sm text-giftory-ink/60 mt-1">Lưu trữ các ý tưởng quà tặng yêu thích và các phác thảo cá nhân hóa chưa hoàn tất</p>
        </div>

        <!-- Segmented Tab Control (Stitch Screen 92436556303324641) -->
        <div class="inline-flex p-1.5 bg-giftory-canvas rounded-2xl border border-giftory-border shadow-sm">
          <button
            (click)="activeTab.set('wishlist')"
            [ngClass]="activeTab() === 'wishlist' ? 'bg-white text-giftory-primary shadow-sm font-bold' : 'text-giftory-ink/60 font-semibold hover:text-giftory-ink'"
            class="px-5 py-2 rounded-xl text-xs transition flex items-center gap-2"
          >
            <span class="material-symbols-outlined text-sm">favorite</span>
            Quà Đã Thích ({{ wishlistItems().length }})
          </button>
          <button
            (click)="activeTab.set('designs')"
            [ngClass]="activeTab() === 'designs' ? 'bg-white text-giftory-primary shadow-sm font-bold' : 'text-giftory-ink/60 font-semibold hover:text-giftory-ink'"
            class="px-5 py-2 rounded-xl text-xs transition flex items-center gap-2"
          >
            <span class="material-symbols-outlined text-sm">palette</span>
            Bản Thiết Kế Studio ({{ savedDesigns().length }})
          </button>
        </div>
      </div>

      <!-- TAB 1: Quà Đã Thích (Wishlist) -->
      <div *ngIf="activeTab() === 'wishlist'" class="space-y-6">
        <div *ngIf="wishlistItems().length > 0; else emptyWishlist" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div
            *ngFor="let item of wishlistItems()"
            class="bg-white rounded-3xl p-4 border border-giftory-border shadow-sm hover:shadow-md transition flex flex-col justify-between group"
          >
            <div class="space-y-3">
              <div class="relative aspect-square rounded-2xl overflow-hidden bg-giftory-surface">
                <img [src]="item.images[0]" [alt]="item.name" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                <button
                  (click)="removeFromWishlist(item._id)"
                  class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 text-giftory-sale hover:bg-white flex items-center justify-center shadow transition"
                  title="Xóa khỏi danh sách thích"
                >
                  <span class="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <div>
                <a [routerLink]="['/products', item.slug]" class="text-sm font-bold text-giftory-ink hover:text-giftory-primary transition line-clamp-2">
                  {{ item.name }}
                </a>
                <div class="mt-2 flex items-center gap-2">
                  <span class="text-base font-black text-giftory-ink">{{ (item.salePrice || item.price) | number }} đ</span>
                  <span *ngIf="item.salePrice" class="text-xs text-giftory-ink/40 line-through">{{ item.price | number }} đ</span>
                </div>
              </div>
            </div>

            <div class="pt-4">
              <button
                (click)="addToCart(item)"
                class="w-full py-2 bg-giftory-primary hover:bg-giftory-primary-dark text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
              >
                <span class="material-symbols-outlined text-sm">shopping_cart</span>
                Thêm Vào Giỏ
              </button>
            </div>
          </div>
        </div>

        <ng-template #emptyWishlist>
          <div class="bg-white rounded-3xl p-12 text-center border border-giftory-border max-w-md mx-auto space-y-4">
            <span class="material-symbols-outlined text-5xl text-giftory-sale/40">favorite_border</span>
            <h3 class="text-lg font-bold text-giftory-ink">Danh sách yêu thích đang trống</h3>
            <p class="text-xs text-giftory-ink/60">Bấm biểu tượng trái tim ở bất kỳ sản phẩm nào để lưu lại và xem lại tại đây.</p>
            <a routerLink="/products" class="inline-block px-6 py-2.5 bg-giftory-primary text-white text-xs font-bold rounded-xl hover:bg-giftory-primary-dark transition shadow">
              Khám Phá Quà Tặng Ngay
            </a>
          </div>
        </ng-template>
      </div>

      <!-- TAB 2: Bản Thiết Kế Studio (Saved Designs) -->
      <div *ngIf="activeTab() === 'designs'" class="space-y-6">
        <div *ngIf="savedDesigns().length > 0; else emptyDesigns" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            *ngFor="let design of savedDesigns()"
            class="bg-white rounded-3xl p-5 border border-giftory-border shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
          >
            <div class="space-y-3">
              <div class="relative aspect-video rounded-2xl overflow-hidden bg-giftory-canvas flex items-center justify-center p-4 border border-giftory-border/40">
                <img [src]="design.previewImage || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400'" alt="Design preview" class="max-h-full object-contain drop-shadow" />
                <span class="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-giftory-primary/10 text-giftory-primary text-[10px] font-bold uppercase">
                  Studio Bespoke
                </span>
              </div>

              <div>
                <h4 class="text-sm font-bold text-giftory-ink">{{ design.designName || 'Mẫu quà tùy biến cá nhân' }}</h4>
                <p class="text-xs text-giftory-primary font-medium italic mt-1">"{{ design.customText || 'Không có chữ' }}"</p>
                <div class="flex items-center gap-2 mt-2">
                  <span class="px-2 py-0.5 rounded bg-gray-100 text-giftory-ink/60 text-[10px] font-mono">Font: {{ design.fontFamily || 'Playfair' }}</span>
                  <span class="px-2 py-0.5 rounded bg-giftory-emerald/10 text-giftory-emerald text-[10px] font-bold">Cọc 50%</span>
                </div>
              </div>
            </div>

            <div class="pt-3 border-t border-giftory-border/60 flex items-center gap-2">
              <a
                [routerLink]="['/custom-studio']"
                [queryParams]="{ editId: design._id }"
                class="flex-1 py-2 text-center border border-giftory-border hover:bg-giftory-canvas text-xs font-bold text-giftory-ink rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <span class="material-symbols-outlined text-sm">edit</span>
                Chỉnh Sửa
              </a>
              <button
                (click)="orderDesign(design)"
                class="flex-1 py-2 bg-giftory-primary hover:bg-giftory-primary-dark text-white text-xs font-bold rounded-xl transition shadow flex items-center justify-center gap-1.5"
              >
                <span class="material-symbols-outlined text-sm">shopping_bag</span>
                Đặt Hàng
              </button>
            </div>
          </div>
        </div>

        <ng-template #emptyDesigns>
          <div class="bg-white rounded-3xl p-12 text-center border border-giftory-border max-w-md mx-auto space-y-4">
            <span class="material-symbols-outlined text-5xl text-giftory-primary/40">brush</span>
            <h3 class="text-lg font-bold text-giftory-ink">Chưa có bản thiết kế nào</h3>
            <p class="text-xs text-giftory-ink/60">Tự tay khắc tên, phối màu vải và tạo thiệp độc bản tại Custom Studio ngay bây giờ.</p>
            <a routerLink="/custom-studio" class="inline-block px-6 py-2.5 bg-giftory-primary text-white text-xs font-bold rounded-xl hover:bg-giftory-primary-dark transition shadow">
              Vào Custom Studio
            </a>
          </div>
        </ng-template>
      </div>
    </div>
  `
})
export class WishlistComponent implements OnInit {
  private wishlistService = inject(WishlistService);
  private customStudioService = inject(CustomStudioService);
  private cartService = inject(CartService);

  activeTab = signal<'wishlist' | 'designs'>('wishlist');
  wishlistItems = signal<Product[]>([]);
  savedDesigns = signal<CustomDesign[]>([]);

  ngOnInit() {
    this.loadWishlist();
    this.loadSavedDesigns();
  }

  loadWishlist() {
    this.wishlistService.getWishlist().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || res?.productIds || []);
        this.wishlistItems.set(list);
      }
    });
  }

  loadSavedDesigns() {
    this.customStudioService.getMySavedDesigns().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        this.savedDesigns.set(list);
      }
    });
  }

  removeFromWishlist(productId: string) {
    this.wishlistService.toggleWishlist(productId).subscribe({
      next: () => {
        this.wishlistItems.update(items => items.filter(i => i._id !== productId));
      }
    });
  }

  addToCart(product: Product) {
    this.cartService.addItem({
      productId: product._id,
      name: product.name,
      price: product.salePrice || product.price,
      quantity: 1,
      image: product.images[0],
      isCustom: false
    }).subscribe({
      next: () => {
        alert('Đã thêm sản phẩm vào giỏ hàng!');
      }
    });
  }

  orderDesign(design: CustomDesign) {
    this.cartService.addItem({
      productId: (design as any).baseProductId || 'custom_base_01',
      name: design.designName || 'Hộp Quà Bespoke Cá Nhân Hóa',
      price: (design as any).price || 450000,
      quantity: 1,
      image: design.previewImage || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400',
      isCustom: true,
      customDetails: {
        customText: design.customText,
        fontFamily: design.fontFamily,
        colorHex: design.colorHex,
        designData: design.designData
      },
      depositRequired: ((design as any).price || 450000) * 0.5
    }).subscribe({
      next: () => {
        alert('Đã thêm mẫu thiết kế độc bản vào giỏ hàng (Áp dụng cọc 50%)!');
      }
    });
  }
}
