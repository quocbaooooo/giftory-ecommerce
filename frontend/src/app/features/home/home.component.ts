import { PillSearchComponent } from '../../shared/components/pill-search/pill-search.component';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { ProductService } from '../../core/services/product.service';
import { Product, Category } from '../../core/models';
import { MarketingCampaign, MarketingService } from '../../core/services/marketing.service';
import { FlashSaleCountdownService } from '../../core/services/flash-sale-countdown.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [PillSearchComponent, CommonModule, RouterModule, ProductCardComponent],
  template: `
    <div class="relative min-h-screen pb-24">
      <!-- BEGIN: HeroDiscoverySection -->
      <section class="relative pt-4 pb-8 px-4 md:px-8 max-w-7xl mx-auto flex flex-col items-center text-center overflow-visible">
        
        <!-- Giữ phong cách mặc định khi không có campaign hoạt động -->
        @if (campaignsLoaded() && campaigns().length === 0 && marqueeProducts().length > 0) {
          <div class="relative w-full max-w-5xl mb-6 overflow-hidden px-2 py-2">
            <div class="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#FFF5E1] via-[#FFF5E1]/80 to-transparent sm:w-20"></div>
            <div class="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#FFF5E1] via-[#FFF5E1]/80 to-transparent sm:w-20"></div>
            <div class="overflow-hidden py-1">
              <div class="animate-single-marquee flex w-max items-center gap-5 pr-5 sm:gap-7 sm:pr-7">
                @for (prod of marqueeProducts(); track prod._id) {
                  <a [routerLink]="['/products', prod.slug]" [attr.aria-label]="'Xem ' + prod.name" class="group block h-[76px] w-[76px] shrink-0 overflow-hidden rounded-[22px] bg-white shadow-[0_5px_18px_rgba(43, 26, 26,0.12)] ring-1 ring-white transition duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-[0_10px_24px_rgba(128, 0, 32,0.2)] sm:h-[88px] sm:w-[88px]">
                    @if (prod.images[0]) {
                      <img [src]="prod.images[0]" [alt]="prod.name" loading="lazy" class="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                    } @else {
                      <span class="material-symbols-outlined flex h-full items-center justify-center text-3xl text-[#800020]/40">card_giftcard</span>
                    }
                  </a>
                }
                @for (prod of marqueeProducts(); track 'repeat-' + prod._id) {
                  <a [routerLink]="['/products', prod.slug]" tabindex="-1" aria-hidden="true" class="group block h-[76px] w-[76px] shrink-0 overflow-hidden rounded-[22px] bg-white shadow-[0_5px_18px_rgba(43, 26, 26,0.12)] ring-1 ring-white transition duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-[0_10px_24px_rgba(128, 0, 32,0.2)] sm:h-[88px] sm:w-[88px]">
                    @if (prod.images[0]) {
                      <img [src]="prod.images[0]" [alt]="prod.name" loading="lazy" class="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                    } @else {
                      <span class="material-symbols-outlined flex h-full items-center justify-center text-3xl text-[#800020]/40">card_giftcard</span>
                    }
                  </a>
                }
              </div>
            </div>
          </div>
        }

        <!-- Logo Giftory nhận diện thương hiệu (Cân đối tỉ lệ nổi bật) -->
        @if (campaignsLoaded() && campaigns().length === 0) {
          <div class="relative z-10 my-3 flex flex-col items-center">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAREDp7FnIhC43TVVvZX8CAhyxh7GsZiVJXWmPlVDoQO8HxUf04y-8r4E4j75mE4xh9BLWTO3LJnuW1opufuY41WZOoXvO7Yf9-lzQvlV0gEsD_WzGzwY1NG_hOpsy6daNo7l0AE_9HAoY_6d2wKyh4oyRiwhzX26em4NyrRpBfMAwJIkYMmuvNoOM9rx1Lw0_gYEWx31mNC_GRXoDApK-BNOQNYxq15X0LdvM5VgL2IXRBuCNS6Trpn6T0FgF0_ZLT8kI" alt="Giftory" class="w-auto h-24 md:h-32 object-contain mx-auto transition-transform hover:scale-105 duration-300 drop-shadow-md">
          </div>
        }

        <!-- Always-on evergreen campaign carousel; product ticker remains below it. -->
        @if (campaigns().length > 0 && campaignImage()) {
          <section class="w-full max-w-7xl mb-7 text-left" aria-label="Chiến dịch quà tặng Giftory" (mouseenter)="pauseAutoplay()" (mouseleave)="resumeAutoplay()" (focusin)="pauseAutoplay()" (focusout)="resumeAutoplay()">
            <div class="relative isolate overflow-hidden rounded-3xl bg-white shadow-[0_18px_55px_rgba(43,26,26,0.10)] ring-1 ring-white/80">
              <div class="grid min-h-[390px] grid-cols-1 md:min-h-[390px] md:grid-cols-[1.04fr_0.96fr]">
                <div class="relative order-2 flex flex-col justify-center overflow-hidden bg-gradient-to-br from-white via-white to-[#FFF5E1] px-6 py-8 sm:px-10 sm:py-10 md:order-1 md:px-12 lg:px-16">
                  <div class="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[#EBD3AE]/30 blur-3xl"></div>
                  <div class="relative z-10 max-w-xl">
                    <span class="inline-flex items-center gap-2 rounded-full border border-[#EBD3AE] bg-white/80 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#800020] shadow-sm sm:text-xs">
                      <span class="material-symbols-outlined text-base">{{ activeCampaign()!.icon || 'campaign' }}</span>
                      {{ activeCampaign()!.eyebrow }}
                    </span>
                    <h2 class="mt-5 text-3xl font-extrabold leading-[1.08] tracking-tight text-[#800020] sm:text-4xl lg:text-[2.8rem]">{{ activeCampaign()!.title }}</h2>
                    <p class="mt-4 max-w-lg text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">{{ activeCampaign()!.description }}</p>
                    <div class="mt-7 flex flex-wrap items-center gap-3">
                      <a [routerLink]="activeCampaign()!.primaryLink" class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#800020] to-[#540015] px-5 py-3 text-sm font-bold text-[#FFF5E1] shadow-lg shadow-[#800020]/25 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#800020] sm:px-6">
                        {{ activeCampaign()!.primaryLabel }}
                        <span class="material-symbols-outlined text-lg">arrow_forward</span>
                      </a>
                      @if (activeCampaign()!.secondaryLink && activeCampaign()!.secondaryLabel) {
                        <a [routerLink]="activeCampaign()!.secondaryLink" class="inline-flex min-h-12 items-center justify-center rounded-xl px-4 py-3 text-sm font-bold text-[#800020] hover:text-[#660019]">{{ activeCampaign()!.secondaryLabel }}</a>
                      }
                    </div>
                    <div class="mt-8 flex items-center gap-2" role="group" aria-label="Chọn chiến dịch">
                      @for (campaign of campaigns(); track campaign._id; let i = $index) {
                        <button type="button" (click)="selectCampaign(i)" [attr.aria-label]="'Hiển thị chiến dịch ' + (i + 1)" [attr.aria-pressed]="activeCampaignIndex() === i" class="h-2.5 rounded-full transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#800020]" [class.w-8]="activeCampaignIndex() === i" [class.w-2.5]="activeCampaignIndex() !== i" [class.bg-[#800020]]="activeCampaignIndex() === i" [class.bg-[#EBD3AE]]="activeCampaignIndex() !== i"></button>
                      }
                      <span class="ml-2 text-xs font-semibold text-slate-400">{{ activeCampaignIndex() + 1 }} / {{ campaigns().length }}</span>
                    </div>
                  </div>
                </div>

                <div class="group relative order-1 min-h-[220px] overflow-hidden bg-[#FDF0D5] md:order-2 md:min-h-full">
                  <img [src]="campaignImage()" [alt]="activeCampaign()!.imageAlt || activeCampaign()!.title" fetchpriority="high" class="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
                  <div class="absolute inset-0 bg-gradient-to-t from-[#4D0013]/40 via-transparent to-white/10 md:bg-gradient-to-l md:from-transparent md:via-transparent md:to-white/10"></div>
                  <div class="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/80 px-3 py-2 text-xs font-bold text-[#800020] shadow-lg backdrop-blur-md sm:bottom-6 sm:left-6">
                    <span class="material-symbols-outlined text-base text-[#800020]">verified</span>
                    Quà tặng từ catalog Giftory
                  </div>
                  <div class="absolute right-4 top-4 flex gap-2 sm:right-6 sm:top-6">
                    <button type="button" (click)="previousCampaign()" aria-label="Chiến dịch trước" class="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/80 text-[#800020] shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#800020]">
                      <span class="material-symbols-outlined">arrow_back</span>
                    </button>
                    <button type="button" (click)="nextCampaign()" aria-label="Chiến dịch tiếp theo" class="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/80 text-[#800020] shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#800020]">
                      <span class="material-symbols-outlined">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        }

        <app-pill-search></app-pill-search>

        <!-- Quick Category Pills -->
        <nav aria-label="Danh mục quà tặng" class="relative z-10 mt-6 w-full max-w-5xl overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div class="flex w-max min-w-full items-center justify-start gap-2.5 whitespace-nowrap">
          @for (cat of categories(); track cat._id) {
            <a [routerLink]="['/products']" [queryParams]="{ category: cat.slug }" class="group relative hover:z-20 focus-visible:z-20 inline-flex shrink-0 items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#EBD3AE] shadow-sm hover:bg-[#EBD3AE] hover:text-[#800020] transition-all text-xs font-semibold text-[#2B1A1A]">
              <span class="w-5 h-5 shrink-0 rounded-full bg-[#FDF0D5] text-[#800020] flex items-center justify-center text-[11px] overflow-hidden origin-center transition-transform duration-200 ease-out group-hover:scale-150 group-focus-visible:scale-150 motion-reduce:transition-none">
                @if (cat.emoji && (cat.emoji.startsWith('http') || cat.emoji.startsWith('/') || cat.emoji.startsWith('data:') || cat.emoji.length > 10)) {
                  <img [src]="cat.emoji" [alt]="cat.name" class="w-full h-full object-contain" />
                } @else {
                  {{ cat.emoji }}
                }
              </span>
              <span>{{ cat.name }}</span>
            </a>
          }
            <a routerLink="/products" class="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#800020] bg-[#800020] px-4 py-2 text-xs font-bold text-[#FFF5E1] shadow-sm transition hover:bg-[#660019] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#800020]">Xem tất cả <span aria-hidden="true">→</span></a>
          </div>
        </nav>
      </section>

      <!-- BEGIN: Flash Sale Banner & Countdown -->
      @if (flashSaleProducts().length > 0) {
        <section class="max-w-7xl mx-auto px-4 md:px-8 mb-12">
          <div class="p-6 rounded-3xl bg-gradient-to-r from-[#4D0013] via-[#660019] to-[#800020] text-[#FFF5E1] shadow-xl relative overflow-hidden">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-5 mb-6">
              <div class="flex items-center gap-3">
                <span class="w-10 h-10 rounded-2xl bg-[#F43F5E] text-white flex items-center justify-center font-bold animate-pulse shadow-md">
                  <span class="material-symbols-outlined text-2xl">bolt</span>
                </span>
                <div>
                  <h2 class="text-xl sm:text-2xl font-bold tracking-tight">Săn Deal & Flash Sale Ưu Đãi</h2>
                  <p class="text-[#FFF5E1] text-xs mt-0.5">Số lượng ưu đãi có hạn • Trợ giá xưởng chế tác</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-[#FFF5E1] font-medium">Kết thúc trong:</span>
                <div class="flex items-center gap-1 text-sm font-bold">
                  <span class="px-2.5 py-1 rounded-lg bg-black/40 border border-white/20">{{ countdown.hours() }}</span>:
                  <span class="px-2.5 py-1 rounded-lg bg-black/40 border border-white/20">{{ countdown.minutes() }}</span>:
                  <span class="px-2.5 py-1 rounded-lg bg-black/40 border border-white/20">{{ countdown.seconds() }}</span>
                </div>
                <a routerLink="/flash-sale" class="ml-3 text-xs font-semibold text-white hover:text-[#FFF5E1] underline">Xem tất cả deal</a>
              </div>
            </div>

            <!-- Flash Sale Products Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              @for (prod of flashSaleProducts().slice(0, 4); track prod._id) {
                <app-product-card [product]="prod"></app-product-card>
              }
            </div>
          </div>
        </section>
      }

      <!-- BEGIN: Custom Studio Bespoke Showcase -->
      <section class="max-w-7xl mx-auto px-4 md:px-8 mb-14">
        <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-shop-card border border-[#EBD3AE]">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 border-b border-slate-100 pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">Thiết Kế Độc Bản</span>
                <h2 class="text-xl sm:text-2xl font-bold text-[#2B1A1A]">Quà Tặng Cá Nhân Hóa • Chế Tác Riêng (Bespoke 1:1)</h2>
              </div>
              <p class="text-slate-500 text-xs sm:text-sm mt-1">
                Tự tay khắc tên, thông điệp, chọn màu ánh kim và xem trước mô phỏng 3D thời gian thực. Áp dụng chính sách cọc 50% linh hoạt.
              </p>
            </div>
            <a routerLink="/custom-studio" class="px-5 py-2.5 rounded-xl bg-[#800020] hover:bg-[#660019] text-[#FFF5E1] font-semibold text-xs flex items-center gap-1.5 self-start sm:self-auto shadow-md shadow-[#800020]/20 transition-all">
              <span class="material-symbols-outlined text-[16px]">palette</span>
              <span>Khám Phá Studio</span>
            </a>
          </div>

          <!-- Bespoke Products Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            @for (prod of bespokeProducts(); track prod._id) {
              <app-product-card [product]="prod"></app-product-card>
            }
          </div>
        </div>
      </section>

      <!-- BEGIN: All Products Grid -->
      <section class="max-w-7xl mx-auto px-4 md:px-8 mb-16">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl sm:text-2xl font-bold text-[#2B1A1A]">Gợi Ý Quà Tặng Tinh Tuyển</h2>
            <p class="text-slate-500 text-xs mt-0.5">Những món quà được yêu thích nhất tháng này</p>
          </div>
          <a routerLink="/products" class="text-xs font-semibold text-[#800020] hover:underline flex items-center gap-1">
            <span>Xem tất cả sản phẩm</span>
            <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
          </a>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          @for (prod of allProducts(); track prod._id) {
            <app-product-card [product]="prod"></app-product-card>
          }
        </div>
      </section>

      <!-- BEGIN: Assurance Badges Grid (Pillow-soft tactile from Stitch) -->
      <section class="max-w-7xl mx-auto px-4 md:px-8">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div class="bg-white rounded-2xl p-5 shadow-sm border border-[#EBD3AE]/60 flex items-start gap-4 hover:shadow-md transition-all">
            <div class="w-12 h-12 rounded-full bg-[#FDF0D5] text-[#800020] flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <div>
              <h4 class="font-bold text-sm text-[#2B1A1A]">Đổi trả 100% Yên Tâm</h4>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">Hoàn tiền hoặc làm lại tức thì nếu sai lệch bất kỳ chi tiết so với bản xem trước.</p>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-5 shadow-sm border border-[#EBD3AE]/60 flex items-start gap-4 hover:shadow-md transition-all">
            <div class="w-12 h-12 rounded-full bg-[#FDF0D5] text-[#800020] flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[24px]">rocket_launch</span>
            </div>
            <div>
              <h4 class="font-bold text-sm text-[#2B1A1A]">Giao Hỏa Tốc 2 Giờ</h4>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">Đội ngũ shipper riêng biệt, giao hẹn giờ chu đáo tận tay người nhận tại HCM & HN.</p>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-5 shadow-sm border border-[#EBD3AE]/60 flex items-start gap-4 hover:shadow-md transition-all">
            <div class="w-12 h-12 rounded-full bg-[#FDF0D5] text-[#800020] flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[24px]">security</span>
            </div>
            <div>
              <h4 class="font-bold text-sm text-[#2B1A1A]">Bảo Mật Chuẩn PCI-DSS</h4>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">Thanh toán cọc đa kênh: VNPAY, MoMo, VietQR, Visa/Mastercard mã hóa cấp cao.</p>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-5 shadow-sm border border-[#EBD3AE]/60 flex items-start gap-4 hover:shadow-md transition-all">
            <div class="w-12 h-12 rounded-full bg-[#FDF0D5] text-[#800020] flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[24px]">forum</span>
            </div>
            <div>
              <h4 class="font-bold text-sm text-[#2B1A1A]">Hỗ Trợ Quà Tặng 24/7</h4>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">Chuyên viên tư vấn thông điệp, thiệp in lời chúc & thiết kế luôn sẵn sàng phục vụ.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  `
})
export class HomeComponent implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private autoplayId?: number;

  private marketingService = inject(MarketingService);
  readonly countdown = inject(FlashSaleCountdownService);

  categories = signal<Category[]>([]);
  allProducts = signal<Product[]>([]);
  marqueeProducts = signal<Product[]>([]);
  bespokeProducts = signal<Product[]>([]);
  flashSaleProducts = signal<Product[]>([]);
  campaigns = signal<MarketingCampaign[]>([]);
  campaignsLoaded = signal(false);
  activeCampaignIndex = signal(0);

  activeCampaign(): MarketingCampaign | undefined {
    return this.campaigns()[this.activeCampaignIndex()];
  }

  campaignImage(): string | undefined {
    return this.activeCampaign()?.imageUrl
      || this.bespokeProducts().find(product => product.images?.[0])?.images[0]
      || this.allProducts().find(product => product.images?.[0])?.images[0]
      || this.marqueeProducts().find(product => product.images?.[0])?.images[0];
  }

  selectCampaign(index: number): void {
    const total = this.campaigns().length;
    if (!total) return;
    this.activeCampaignIndex.set((index + total) % total);
  }

  previousCampaign(): void {
    this.selectCampaign(this.activeCampaignIndex() - 1);
  }

  nextCampaign(): void {
    this.selectCampaign(this.activeCampaignIndex() + 1);
  }

  private restartAutoplay(): void {
    if (this.autoplayId) window.clearInterval(this.autoplayId);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.autoplayId = window.setInterval(() => {
      const total = this.campaigns().length;
      if (total > 1) this.activeCampaignIndex.update(index => (index + 1) % total);
    }, 7000);
  }

  pauseAutoplay(): void {
    if (this.autoplayId) window.clearInterval(this.autoplayId);
    this.autoplayId = undefined;
  }

  resumeAutoplay(): void {
    if (!this.autoplayId) this.restartAutoplay();
  }

  ngOnInit(): void {
    this.marketingService.getActiveCampaigns().subscribe({
      next: items => {
        this.campaigns.set(items || []);
        this.activeCampaignIndex.set(0);
        this.campaignsLoaded.set(true);
        this.restartAutoplay();
      },
      error: () => {
        this.campaigns.set([]);
        this.campaignsLoaded.set(true);
      },
    });
    this.productService.getCategories().subscribe({
      next: cats => this.categories.set(cats)
    });

    this.productService.getCatalogProducts({ limit: 8 }).subscribe({
      next: res => { this.allProducts.set(res.items); this.productService.prefetchProductList(); }
    });

    this.productService.getCatalogProducts({ sort: 'popular', page: 1, limit: 12 }).subscribe({
      next: res => this.marqueeProducts.set(res.items)
    });

    this.productService.getCatalogProducts({ isCustomizable: 'true', limit: 4 }).subscribe({
      next: res => this.bespokeProducts.set(res.items)
    });

    this.productService.getFlashSaleProducts().subscribe({
      next: prods => this.flashSaleProducts.set(prods)
    });
  }

  ngOnDestroy(): void {
    if (this.autoplayId) window.clearInterval(this.autoplayId);
  }
}
