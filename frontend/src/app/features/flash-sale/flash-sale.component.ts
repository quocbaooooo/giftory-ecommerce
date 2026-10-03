import { Component, OnInit, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { Product } from '../../core/models';

@Component({
  selector: 'app-flash-sale',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <!-- Flash Sale Hero Banner (Stitch Screen 5401600908711970906) -->
      <div class="bg-gradient-to-r from-[#831843] via-[#BE185D] to-giftory-sale rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="space-y-2 max-w-xl">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider backdrop-blur">
              <span class="material-symbols-outlined text-sm text-yellow-300">bolt</span>
              Ưu Đãi Giờ Vàng Độc Quyền
            </div>
            <h1 class="text-3xl md:text-5xl font-display font-black tracking-tight">Flash Sale — Chớp Thời Cơ Quà Tặng</h1>
            <p class="text-sm text-white/80">
              Giảm sâu lên đến 50% cho các sản phẩm quà tặng tinh tế và phiên bản bespoke giới hạn. Số lượng có hạn theo khung giờ vàng!
            </p>
          </div>

          <!-- Countdown Timer Box -->
          <div class="bg-black/30 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-center min-w-[260px] space-y-3">
            <span class="text-xs text-white/80 block uppercase font-bold tracking-wider">Kết thúc sau</span>
            <div class="flex items-center justify-center gap-3">
              <div class="bg-white/20 rounded-xl px-3 py-2">
                <span class="text-2xl font-mono font-black">{{ hours() }}</span>
                <span class="text-[10px] block uppercase text-white/70">Giờ</span>
              </div>
              <span class="text-2xl font-bold">:</span>
              <div class="bg-white/20 rounded-xl px-3 py-2">
                <span class="text-2xl font-mono font-black">{{ minutes() }}</span>
                <span class="text-[10px] block uppercase text-white/70">Phút</span>
              </div>
              <span class="text-2xl font-bold">:</span>
              <div class="bg-white/20 rounded-xl px-3 py-2">
                <span class="text-2xl font-mono font-black text-yellow-300">{{ seconds() }}</span>
                <span class="text-[10px] block uppercase text-white/70">Giây</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Flash Sale Products Grid -->
      <div class="space-y-6">
        <div class="flex items-center justify-between border-b border-giftory-border/60 pb-4">
          <h2 class="text-xl font-display font-black text-giftory-ink flex items-center gap-2">
            <span class="material-symbols-outlined text-giftory-sale">local_fire_department</span>
            Tất Cả Sản Phẩm Đang Flash Sale ({{ products().length }})
          </h2>
          <span class="text-xs text-giftory-ink/60">Cập nhật mỗi 60 phút</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div
            *ngFor="let product of products()"
            class="bg-white rounded-3xl p-4 border border-giftory-border shadow-sm hover:shadow-md transition flex flex-col justify-between group"
          >
            <div class="space-y-3">
              <div class="relative aspect-square rounded-2xl overflow-hidden bg-giftory-surface">
                <img [src]="product.images[0]" [alt]="product.name" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                <span class="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-giftory-sale text-white text-[11px] font-black uppercase tracking-wider shadow">
                  GIẢM {{ getDiscountPercent(product) }}%
                </span>
                <span *ngIf="product.isCustomizable" class="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-giftory-primary/90 text-white text-[10px] font-bold">
                  Bespoke
                </span>
              </div>

              <div>
                <a [routerLink]="['/products', product.slug]" class="text-sm font-bold text-giftory-ink hover:text-giftory-primary transition line-clamp-2">
                  {{ product.name }}
                </a>

                <div class="mt-2 flex items-baseline gap-2">
                  <span class="text-lg font-black text-giftory-sale font-mono">{{ (product.salePrice || product.price) | number }} đ</span>
                  <span *ngIf="product.salePrice" class="text-xs text-giftory-ink/40 line-through">{{ product.price | number }} đ</span>
                </div>

                <!-- Progress Bar: Sold Stock -->
                <div class="mt-3 space-y-1">
                  <div class="flex justify-between text-[11px]">
                    <span class="text-giftory-ink/60 font-semibold">Đã bán: 75%</span>
                    <span class="text-giftory-sale font-bold">Còn ít</span>
                  </div>
                  <div class="w-full h-2 bg-giftory-surface rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-giftory-sale to-pink-500 rounded-full" style="width: 75%"></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="pt-4">
              <button
                (click)="quickBuy(product)"
                class="w-full py-2.5 bg-giftory-sale hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-1.5"
              >
                <span class="material-symbols-outlined text-sm">bolt</span>
                Mua Nhanh Giá Sốc
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class FlashSaleComponent implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private cartService = inject(CartService);

  products = signal<Product[]>([]);
  hours = signal<string>('04');
  minutes = signal<string>('28');
  seconds = signal<string>('50');

  private timerInterval: any;

  ngOnInit() {
    this.productService.getProducts({ isFlashSale: true }).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
        this.products.set(list);
      }
    });

    this.startCountdown();
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  startCountdown() {
    let totalSec = 4 * 3600 + 28 * 60 + 50;
    this.timerInterval = setInterval(() => {
      if (totalSec <= 0) {
        totalSec = 6 * 3600;
      }
      totalSec--;
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      this.hours.set(h < 10 ? '0' + h : '' + h);
      this.minutes.set(m < 10 ? '0' + m : '' + m);
      this.seconds.set(s < 10 ? '0' + s : '' + s);
    }, 1000);
  }

  getDiscountPercent(p: Product): number {
    if (!p.salePrice || p.salePrice >= p.price) return 15;
    return Math.round(((p.price - p.salePrice) / p.price) * 100);
  }

  quickBuy(product: Product) {
    this.cartService.addItem({
      productId: product._id,
      name: product.name,
      price: product.salePrice || product.price,
      quantity: 1,
      image: product.images[0],
      isCustom: false
    }).subscribe({
      next: () => {
        alert('Đã thêm sản phẩm Flash Sale vào giỏ hàng!');
      }
    });
  }
}
