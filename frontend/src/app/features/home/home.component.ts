import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PillSearchComponent } from '../../shared/components/pill-search/pill-search.component';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { ProductService } from '../../core/services/product.service';
import { Product, Category } from '../../core/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, PillSearchComponent, ProductCardComponent],
  template: `
    <div class="relative min-h-screen pb-24">
      <!-- BEGIN: HeroDiscoverySection -->
      <section class="relative pt-6 pb-10 px-4 md:px-8 max-w-7xl mx-auto flex flex-col items-center text-center overflow-visible">
        
        <!-- 1 DÒNG DUY NHẤT CHẠY NGANG, KHÔNG VIỀN TRẮNG, NHẤP NHÔ LƯỢN SÓNG LỆCH NHỊP -->
        <div class="relative w-full max-w-6xl mb-4 select-none overflow-hidden py-3">
          <div class="absolute left-0 top-0 bottom-0 w-24 md:w-36 bg-gradient-to-r from-[#e9dcf8] to-transparent z-20 pointer-events-none"></div>
          <div class="absolute right-0 top-0 bottom-0 w-24 md:w-36 bg-gradient-to-l from-[#e9dcf8] to-transparent z-20 pointer-events-none"></div>
          
          <div class="overflow-hidden w-full py-2">
            <div class="animate-single-marquee flex items-center gap-5">
              <!-- Item 1: Bình giữ nhiệt -->
              <div class="flex-shrink-0 wave-item-1">
                <img alt="Bình giữ nhiệt Elmich cao cấp" class="w-[95px] h-[115px] object-cover rounded-2xl shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCnbFnr2bFrmqaeDLx_elgUmNO1zsXditnQ03OwaUohpSw85hopV7UoMrufnrskIYaA7OoLwB8lq9fG6wZK51zDXAaalVUGhlcwmAjVemlLNow5PANugfRdvlyzkw-y7S17vl8CJXw9_rJLZxiicLlqMA84C4TWLpIFwcV8iks14JnTvN9lSyb8HfnF3GT49kfeuybrcNJCRzQDKQj0pdZuwULSz7u-PuDs-xUYJLIWebl-2RaYdJc1ECqMjNKEsjuGH8Q">
              </div>
              <!-- Item 2: Cốc thìa vàng -->
              <div class="flex-shrink-0 wave-item-2">
                <img alt="Hộp quà cốc thìa vàng gốm sứ" class="w-[110px] h-[105px] object-cover rounded-2xl shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCmi8pqctrGS6fEmb1AhbMuAdk_5AdA8tLPUU7Q5KY9j62dMoJncBMWhzstbXhVD-u4m80ETkD1nfYx3ThZDxXGrjA0GvhL2sW7-3SkQkb4Qs2bPj5p07B1EgFzwxCCEkAdqtus1AvMf4ofg6ZCmF3Dj8EGjQQIYVbLpab2KZjv_HROvhj9nB2IpBYTcCfkbA5dYDhuX7ir9W-9wtC8pmw4eX8AE5r0WNQxqFYpgpRstoCaL8f1UD2rW0IKNQUT9aE1y9s">
              </div>
              <!-- Item 3: Sổ da & bút ký -->
              <div class="flex-shrink-0 wave-item-3">
                <img alt="Sổ tay da và bút máy khắc laser" class="w-[100px] h-[110px] object-cover rounded-2xl shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTiUcc1K16mRQtadu3yEAnXGoIohAuCMoAY1yVBoAMwvyfjPIJFirLHWov_uxVpgQ5-GykkXfJ9UexjI-MS_WgHGcD7W0aG0F9yHAziycn8URpqVpTqCFiptz3t_UzpIAFu4ICjGwbBHrbKlGDyRzFQ9HDiLH48zvQjwFtMgMn0XwySjnxnKBc8fnFy38rvx0ufp9BHsnvb3zwHmgmei_s5P1fJU-ZbURE8_qWkyjKo-ZV3j0Ik87ZxHOQPbBdB0vQnpE">
              </div>
              <!-- Item 4: Ốp điện thoại -->
              <div class="flex-shrink-0 wave-item-4">
                <img alt="Ốp điện thoại custom in tên E.M." class="w-[110px] h-[110px] object-cover rounded-2xl shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-bRbWBhv_zezdlBaL0rLu9Plt7vm0VuTJnqygcImvTlLiugv2etis2o4XIwkp35Q-9iBQJ4QgUAPjVyLVk5O4mTf93VT_lAslrS36cC4DTVYEiJOOYOm-RtpRmuaJQ0zjoan3nIg4F9OIGJjvGOs5UgjkrlyX9aD4_ino2r1bPMh8NA57AC2dt0ZnWFo_Pir3cXLrm6ytxc6azoDlqrq6tfdUVaoeoS_A5tLDImqU0eEXAz96BWRaVA">
              </div>
              <!-- Item 5: Áo thun thêu -->
              <div class="flex-shrink-0 wave-item-1">
                <img alt="Áo thun cotton thêu tên nghệ thuật" class="w-[105px] h-[105px] object-cover rounded-2xl shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5C_BuC6873TScG4V8tj6GF6BOc7sPhdDrpa9wu7VLUcXlpKM8NoJBlY_9lYrl1IdRAa9WwlwGO7AEeIPbNjvTh3na33-nodInHZkRzA0TzoNPRLcWCITN6DkPlwvTriwZwIy3eNfOlIULrMjsDgmdVYRmZO-byKa6I9evbnNhSpDxDmwJzJgRPilIlQ8qd50ywk89bB1Fl2swu3qpQGw-p16cSmWz2TNbspfGMc-R81sIl2MWPtVS-Q">
              </div>
              <!-- Item 6: Nến thơm Citta -->
              <div class="flex-shrink-0 wave-item-2">
                <img alt="Nến thơm tinh dầu hoa khô handmade" class="w-[95px] h-[110px] object-cover rounded-2xl shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD0AgXNm0dmGk3HNBCmrk9OS5ijfKIE41QmngNG9OA54P11IRzvZjBHDcnlHGdNH76JJ3MlrDWSaEoi43vB0EaXYWjGQZQssWH6s8x6ON9tG6pStpFPDyyDNUu1ShvSVTPwE4VuAuQxvHMiDIqZg2P-k3E3VkhW5uKwMOZog3IsAgRGhyih7Yre6YJW4iI5wm1wzz1t20wpq46St21-fX5c4sV3b8qxEKzrLqNb3OgV9s1z2yLbLv0x-SL_R11fIxBbJSU">
              </div>
              <!-- Item 7: Móc khóa thỏ gỗ -->
              <div class="flex-shrink-0 wave-item-3">
                <img alt="Móc khóa thỏ gỗ đôi cá nhân hóa" class="w-[125px] h-[95px] object-cover rounded-2xl shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB13Z7iIbjVRr60YvfNMx5FpccEhDWukJEVwqvUzgts1c_hPNfuQ1RLJyKiLkZ5Gx10SldKrbGQQI8cE9Uwt_lIlt555_Q6spEluVtPZLYEGOi_-_7nC9BiK6PuhyAWV0GtGZ9I1BUdYluPy0EqTTztUGbsLYcATRZimlk4TEROEZ5CGFVlZF50CSrY8nvps95-Ir05bA-GVu5eR2P2n28_W0sjvorJ-8A46PWH8ySYo7W1l7NvhkFYjSO-cKcSp7XZwFA">
              </div>

              <!-- Duplicate for seamless loop -->
              <div class="flex-shrink-0 wave-item-1">
                <img alt="Bình giữ nhiệt Elmich cao cấp" class="w-[95px] h-[115px] object-cover rounded-2xl shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCnbFnr2bFrmqaeDLx_elgUmNO1zsXditnQ03OwaUohpSw85hopV7UoMrufnrskIYaA7OoLwB8lq9fG6wZK51zDXAaalVUGhlcwmAjVemlLNow5PANugfRdvlyzkw-y7S17vl8CJXw9_rJLZxiicLlqMA84C4TWLpIFwcV8iks14JnTvN9lSyb8HfnF3GT49kfeuybrcNJCRzQDKQj0pdZuwULSz7u-PuDs-xUYJLIWebl-2RaYdJc1ECqMjNKEsjuGH8Q">
              </div>
              <div class="flex-shrink-0 wave-item-2">
                <img alt="Hộp quà cốc thìa vàng gốm sứ" class="w-[110px] h-[105px] object-cover rounded-2xl shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCmi8pqctrGS6fEmb1AhbMuAdk_5AdA8tLPUU7Q5KY9j62dMoJncBMWhzstbXhVD-u4m80ETkD1nfYx3ThZDxXGrjA0GvhL2sW7-3SkQkb4Qs2bPj5p07B1EgFzwxCCEkAdqtus1AvMf4ofg6ZCmF3Dj8EGjQQIYVbLpab2KZjv_HROvhj9nB2IpBYTcCfkbA5dYDhuX7ir9W-9wtC8pmw4eX8AE5r0WNQxqFYpgpRstoCaL8f1UD2rW0IKNQUT9aE1y9s">
              </div>
            </div>
          </div>
        </div>

        <!-- Logo Giftory nhận diện thương hiệu -->
        <div class="relative z-10 mb-2 flex flex-col items-center">
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAREDp7FnIhC43TVVvZX8CAhyxh7GsZiVJXWmPlVDoQO8HxUf04y-8r4E4j75mE4xh9BLWTO3LJnuW1opufuY41WZOoXvO7Yf9-lzQvlV0gEsD_WzGzwY1NG_hOpsy6daNo7l0AE_9HAoY_6d2wKyh4oyRiwhzX26em4NyrRpBfMAwJIkYMmuvNoOM9rx1Lw0_gYEWx31mNC_GRXoDApK-BNOQNYxq15X0LdvM5VgL2IXRBuCNS6Trpn6T0FgF0_ZLT8kI" alt="Giftory" class="w-auto h-20 md:h-24 object-contain mx-auto transition-transform hover:scale-105 duration-300">
        </div>

        <!-- Pill Search Bar -->
        <app-pill-search></app-pill-search>

        <!-- Quick Category Pills -->
        <div class="relative z-10 flex items-center justify-center gap-2.5 mt-6 flex-wrap max-w-5xl px-2">
          @for (cat of categories(); track cat._id) {
            <a [routerLink]="['/products']" [queryParams]="{ category: cat.slug }" class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#DDD6FE] shadow-sm hover:bg-[#DDD6FE] hover:text-[#7C3AED] transition-all text-xs font-semibold text-[#1E1B4B]">
              <span class="w-5 h-5 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center text-[11px]">{{ cat.emoji }}</span>
              <span>{{ cat.name }}</span>
            </a>
          }
        </div>
      </section>

      <!-- BEGIN: Flash Sale Banner & Countdown -->
      @if (flashSaleProducts().length > 0) {
        <section class="max-w-7xl mx-auto px-4 md:px-8 mb-12">
          <div class="p-6 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-800 text-white shadow-xl relative overflow-hidden">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-5 mb-6">
              <div class="flex items-center gap-3">
                <span class="w-10 h-10 rounded-2xl bg-[#F43F5E] text-white flex items-center justify-center font-bold animate-pulse shadow-md">
                  <span class="material-symbols-outlined text-2xl">bolt</span>
                </span>
                <div>
                  <h2 class="text-xl sm:text-2xl font-bold tracking-tight">Săn Deal & Flash Sale Ưu Đãi</h2>
                  <p class="text-purple-200 text-xs mt-0.5">Số lượng ưu đãi có hạn • Trợ giá xưởng chế tác</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-purple-200 font-medium">Kết thúc trong:</span>
                <div class="flex items-center gap-1 text-sm font-bold">
                  <span class="px-2.5 py-1 rounded-lg bg-black/40 border border-white/20">05</span>:
                  <span class="px-2.5 py-1 rounded-lg bg-black/40 border border-white/20">42</span>:
                  <span class="px-2.5 py-1 rounded-lg bg-black/40 border border-white/20">18</span>
                </div>
                <a routerLink="/flash-sale" class="ml-3 text-xs font-semibold text-white hover:text-purple-200 underline">Xem tất cả deal</a>
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
        <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-shop-card border border-[#DDD6FE]">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 border-b border-slate-100 pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">Thiết Kế Độc Bản</span>
                <h2 class="text-xl sm:text-2xl font-bold text-[#1E1B4B]">Quà Tặng Cá Nhân Hóa • Chế Tác Riêng (Bespoke 1:1)</h2>
              </div>
              <p class="text-slate-500 text-xs sm:text-sm mt-1">
                Tự tay khắc tên, thông điệp, chọn màu ánh kim và xem trước mô phỏng 3D thời gian thực. Áp dụng chính sách cọc 50% linh hoạt.
              </p>
            </div>
            <a routerLink="/custom-studio" class="px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs flex items-center gap-1.5 self-start sm:self-auto shadow-md shadow-purple-300 transition-all">
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
            <h2 class="text-xl sm:text-2xl font-bold text-[#1E1B4B]">Gợi Ý Quà Tặng Tinh Tuyển</h2>
            <p class="text-slate-500 text-xs mt-0.5">Những món quà được yêu thích nhất tháng này</p>
          </div>
          <a routerLink="/products" class="text-xs font-semibold text-[#7C3AED] hover:underline flex items-center gap-1">
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
          <div class="bg-white rounded-2xl p-5 shadow-sm border border-[#DDD6FE]/60 flex items-start gap-4 hover:shadow-md transition-all">
            <div class="w-12 h-12 rounded-full bg-purple-100 text-[#7C3AED] flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <div>
              <h4 class="font-bold text-sm text-[#1E1B4B]">Đổi trả 100% Yên Tâm</h4>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">Hoàn tiền hoặc làm lại tức thì nếu sai lệch bất kỳ chi tiết so với bản xem trước.</p>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-5 shadow-sm border border-[#DDD6FE]/60 flex items-start gap-4 hover:shadow-md transition-all">
            <div class="w-12 h-12 rounded-full bg-purple-100 text-[#7C3AED] flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[24px]">rocket_launch</span>
            </div>
            <div>
              <h4 class="font-bold text-sm text-[#1E1B4B]">Giao Hỏa Tốc 2 Giờ</h4>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">Đội ngũ shipper riêng biệt, giao hẹn giờ chu đáo tận tay người nhận tại HCM & HN.</p>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-5 shadow-sm border border-[#DDD6FE]/60 flex items-start gap-4 hover:shadow-md transition-all">
            <div class="w-12 h-12 rounded-full bg-purple-100 text-[#7C3AED] flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[24px]">security</span>
            </div>
            <div>
              <h4 class="font-bold text-sm text-[#1E1B4B]">Bảo Mật Chuẩn PCI-DSS</h4>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">Thanh toán cọc đa kênh: VNPAY, MoMo, VietQR, Visa/Mastercard mã hóa cấp cao.</p>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-5 shadow-sm border border-[#DDD6FE]/60 flex items-start gap-4 hover:shadow-md transition-all">
            <div class="w-12 h-12 rounded-full bg-purple-100 text-[#7C3AED] flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[24px]">forum</span>
            </div>
            <div>
              <h4 class="font-bold text-sm text-[#1E1B4B]">Hỗ Trợ Quà Tặng 24/7</h4>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">Chuyên viên tư vấn thông điệp, thiệp viết tay & thiết kế luôn sẵn sàng phục vụ.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  `
})
export class HomeComponent implements OnInit {
  private productService = inject(ProductService);

  categories = signal<Category[]>([]);
  allProducts = signal<Product[]>([]);
  bespokeProducts = signal<Product[]>([]);
  flashSaleProducts = signal<Product[]>([]);

  ngOnInit(): void {
    this.productService.getCategories().subscribe({
      next: cats => this.categories.set(cats)
    });

    this.productService.getProducts({ limit: 8 }).subscribe({
      next: res => this.allProducts.set(res.items)
    });

    this.productService.getProducts({ isCustomizable: 'true', limit: 4 }).subscribe({
      next: res => this.bespokeProducts.set(res.items)
    });

    this.productService.getFlashSaleProducts().subscribe({
      next: prods => this.flashSaleProducts.set(prods)
    });
  }
}
