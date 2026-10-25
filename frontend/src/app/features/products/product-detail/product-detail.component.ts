import { DialogFocusDirective } from '../../../shared/components/dialog-focus.directive';
import { ProductOptions } from '../../../shared/components/product-options';
import { ProductReviewsComponent } from '../../care/product-reviews.component';
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
  imports: [CommonModule, RouterModule, FormsModule, ProductCardComponent, ProductReviewsComponent, DialogFocusDirective],
  host: { '(document:keydown.escape)': 'lightbox.set(false)' },
  styles: [`
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .tab-content { animation: fadeIn .2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  `],
  template: `
    <!-- Image Lightbox Modal -->
    @if (lightbox()) {
      <div class="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4" appDialogFocus role="dialog" aria-modal="true" aria-label="Ảnh sản phẩm phóng to" (touchstart)="touchStart($event)" (touchend)="touchEnd($event)" (click)="lightbox.set(false)">
        <button autofocus class="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg font-bold transition-all" (click)="lightbox.set(false)" aria-label="Đóng">✕</button>
        <button class="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center text-2xl transition-all" (click)="$event.stopPropagation(); options.moveImage(-1)" aria-label="Ảnh trước">❮</button>
        <img [src]="activeImage()" [alt]="product()?.name" class="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl" (click)="$event.stopPropagation()">
        <button class="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center text-2xl transition-all" (click)="$event.stopPropagation(); options.moveImage(1)" aria-label="Ảnh sau">❯</button>
      </div>
    }

    @if (product(); as prod) {
      <div class="max-w-7xl mx-auto px-4 md:px-8 py-6">
        
        <!-- BREADCRUMB & METADATA OVERVIEW -->
        <div class="w-full flex flex-wrap items-center justify-between gap-4 mb-6">
          <nav class="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <a routerLink="/" class="hover:text-purple-600 transition-colors flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px]">home</span>
              <span>Trang chủ</span>
            </a>
            <span class="text-slate-300">/</span>
            <a routerLink="/products" class="hover:text-purple-600 transition-colors">Sản phẩm</a>
            @if (prod.category?.name) {
              <span class="text-slate-300">/</span>
              <a [routerLink]="['/products']" [queryParams]="{ category: prod.category?.slug }" class="hover:text-purple-600 transition-colors">{{ prod.category?.name }}</a>
            }
            <span class="text-slate-300">/</span>
            <span class="text-slate-900 font-bold truncate max-w-xs md:max-w-md">{{ prod.name }}</span>
          </nav>

          <div class="flex items-center gap-2.5">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
              <span class="material-symbols-outlined text-[15px]">verified</span>
              Bespoke Signature
            </span>
            <span class="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
              SKU: <strong class="text-slate-800 ml-1">{{ options.selected()?.sku || prod.sku || 'GFT-BESPOKE' }}</strong>
            </span>
          </div>
        </div>

        <!-- AI Recommendation Referral Banner -->
        @if (isFromAiRecommendation()) {
          <div class="mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 border border-purple-200 text-purple-700 flex items-center justify-between shadow-xs">
            <div class="flex items-center gap-2.5 text-xs font-semibold">
              <span class="material-symbols-outlined text-[20px] text-pink-500 animate-spin">auto_awesome</span>
              <span>Món quà này được <strong>Trợ lý Giftory AI</strong> gợi ý riêng dựa theo sở thích và dịp kỷ niệm của bạn!</span>
            </div>
            <span class="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-200/80 font-bold uppercase tracking-wider text-purple-900">
              AI Match
            </span>
          </div>
        }

        <!-- MAIN PRODUCT HERO: 2-COLUMN LUXURY SHOWCASE -->
        <div class="w-full grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-5 items-start mb-10">
          
          <!-- LEFT: GALLERY (5 COLUMNS) -->
          <div class="lg:col-span-5 min-w-0 flex flex-col gap-4">
            <!-- Main Featured Image Stage -->
            <div (touchstart)="touchStart($event)" (touchend)="touchEnd($event)"
              class="product-cover relative w-full aspect-square bg-white rounded-[28px] overflow-hidden shadow-[0_10px_25px_-5px_rgba(124,58,237,0.08)] border border-purple-100/70 flex items-center justify-center p-3 group">
              
              <!-- Floating Status Badges -->
              <div class="absolute top-4 left-4 z-20 flex flex-col gap-2">
                @if (prod.isCustomizable) {
                  <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-700 text-white text-xs font-bold shadow-md">
                    <span class="material-symbols-outlined text-[14px]">auto_awesome</span>
                    Sản Phẩm Custom Theo Yêu Cầu
                  </span>
                }
                @if (prod.price && options.price() < prod.price) {
                  <span class="inline-flex items-center px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-extrabold uppercase tracking-wider shadow-sm">
                    Flash Deal -{{ ((prod.price - options.price()) / prod.price * 100) | number:'1.0-0' }}%
                  </span>
                }
              </div>

              <!-- Zoom Button -->
              <button (click)="lightbox.set(true)"
                class="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/80 backdrop-blur-md text-slate-700 flex items-center justify-center hover:bg-white hover:text-purple-600 transition-all shadow-sm"
                type="button" title="Phóng to ảnh">
                <span class="material-symbols-outlined text-[18px]">zoom_in</span>
              </button>

              <!-- Main Image -->
              <img [src]="activeImage() || 'https://placehold.co/600?text=Giftory'"
                [alt]="prod.name"
                (click)="lightbox.set(true)"
                class="absolute inset-3 w-[calc(100%-1.5rem)] h-[calc(100%-1.5rem)] object-cover rounded-[22px] transition-all duration-300 cursor-pointer group-hover:scale-[1.01]">

            </div>

            <div class="flex flex-col gap-4 min-w-0">
            <!-- Thumbnail Selector -->
            @if (options.gallery().length > 1) {
              <div class="grid grid-cols-5 gap-2.5">
                @for (img of options.gallery(); track img) {
                  <button type="button"
                    (click)="activeImage.set(img)"
                    class="aspect-square rounded-2xl bg-white overflow-hidden p-1 shadow-xs transition-all border-2"
                    [class.border-purple-600]="activeImage() === img"
                    [class.ring-2]="activeImage() === img"
                    [class.ring-purple-100]="activeImage() === img"
                    [class.border-transparent]="activeImage() !== img">
                    <img [src]="img" [alt]="prod.name" class="w-full h-full object-cover rounded-xl">
                  </button>
                }
              </div>
            }

            <!-- Guarantee Highlights Panel -->
            <div class="w-full bg-white rounded-2xl p-4 shadow-xs border border-slate-100 grid grid-cols-2 gap-3 mt-1">
              <div class="flex items-center gap-3 p-2.5 rounded-xl bg-purple-50/50 border border-purple-100/60">
                <span class="material-symbols-outlined text-purple-700 text-[24px] shrink-0">verified_user</span>
                <div class="flex flex-col min-w-0">
                  <span class="text-xs text-slate-900 font-bold">Bảo hành 1 đổi 1</span>
                  <span class="text-[11px] text-slate-500 truncate">Nếu nứt vỡ khi vận chuyển</span>
                </div>
              </div>
              <div class="flex items-center gap-3 p-2.5 rounded-xl bg-purple-50/50 border border-purple-100/60">
                <span class="material-symbols-outlined text-purple-700 text-[24px] shrink-0">view_in_ar</span>
                <div class="flex flex-col min-w-0">
                  <span class="text-xs text-slate-900 font-bold">Duyệt Demo 3D</span>
                  <span class="text-[11px] text-slate-500 truncate">Xem trước khi khắc gia công</span>
                </div>
              </div>
            </div>
            </div>
          </div>

          <!-- RIGHT: PRODUCT CONFIGURATOR & COMMERCE PANEL (7 COLUMNS) -->
          <div class="lg:col-span-7 min-w-0 flex flex-col gap-5">
            
            <!-- Card 1: Main Product Header & Pricing Box -->
            <div class="product-overview min-w-0 bg-white rounded-[26px] p-6 shadow-[0_10px_25px_-5px_rgba(124,58,237,0.08)] border border-purple-100/60 flex flex-col gap-4">
              
              <!-- Badges & Ratings -->
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 text-xs font-bold">
                    🔥 Đã bán {{ prod.soldCount || 120 }}+
                  </span>
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                    Mã: {{ options.selected()?.sku || prod.sku || 'Bespoke-01' }}
                  </span>
                </div>
                <div class="flex items-center gap-1 text-xs">
                  <span class="material-symbols-outlined text-amber-500 text-[18px]">star</span>
                  <strong class="text-slate-900 font-bold text-sm">{{ prod.rating || 4.9 }}</strong>
                  <span class="text-slate-400">({{ ((prod.soldCount || 100) * 1.8) | number:'1.0-0' }} đánh giá)</span>
                  <span class="mx-1 text-slate-300">•</span>
                  <span class="text-emerald-700 font-semibold">99.4% Hài lòng</span>
                </div>
              </div>

              <!-- Product Name -->
              <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
                {{ prod.name }}
              </h1>

              <!-- Short Description -->
              @if (prod.description) {
                <p class="text-slate-600 text-xs sm:text-sm leading-relaxed line-clamp-2">
                  {{ prod.description }}
                </p>
              }

              <!-- Pricing & Deposit Banner -->
              <div class="bg-gradient-to-r from-purple-50/80 via-[#fdfcff] to-purple-50/50 rounded-2xl p-4 border border-purple-100 flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-baseline gap-3">
                  <span class="text-3xl font-black text-purple-700 tracking-tight">
                    {{ options.price() | number:'1.0-0' }}₫
                  </span>
                  @if (prod.price && options.price() < prod.price) {
                    <span class="text-sm text-slate-400 line-through">
                      {{ prod.price | number:'1.0-0' }}₫
                    </span>
                    <span class="px-2 py-0.5 rounded-full bg-rose-600 text-white text-xs font-bold">
                      -{{ ((prod.price - options.price()) / prod.price * 100) | number:'1.0-0' }}%
                    </span>
                  }
                </div>

                @if (prod.isCustomizable) {
                  <div class="bg-white px-3.5 py-1.5 rounded-xl border border-purple-200/80 shadow-2xs flex items-center gap-2">
                    <span class="text-[11px] text-slate-500 uppercase font-semibold">Cọc 50%:</span>
                    <span class="text-sm text-rose-600 font-extrabold">
                      {{ (options.price() * 0.5) | number:'1.0-0' }}₫
                    </span>
                  </div>
                }
              </div>

              <!-- Delivery Lead-time Badges -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div class="flex items-center gap-2 p-2.5 rounded-xl bg-purple-50/60 text-purple-900 font-medium">
                  <span class="material-symbols-outlined text-purple-600 text-[18px] shrink-0">schedule</span>
                  <span>Giao 3 - 5 ngày (1 - 2 ngày xưởng khắc hoàn thiện)</span>
                </div>
                <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-slate-700">
                  <div class="flex items-center gap-1.5 font-medium">
                    <span class="material-symbols-outlined text-amber-600 text-[18px]">bolt</span>
                    <span>Hỏa tốc 2H nội thành HN / TP.HCM</span>
                  </div>
                  <span class="text-purple-600 font-bold text-[11px]">Đảm bảo</span>
                </div>
              </div>
            </div>

            <!-- Card 2: Variant Picker, Quantity & Engrave Input -->
            <div class="min-w-0 bg-white rounded-[26px] p-6 shadow-[0_10px_25px_-5px_rgba(124,58,237,0.08)] border border-purple-100/60 flex flex-col gap-5">
              
              <!-- 1. Bộ Chọn Màu Sắc / Chất Liệu -->
              @if (options.colors().length) {
                <div class="flex flex-col gap-2">
                  <div class="flex items-center justify-between">
                    <label class="text-xs text-slate-800 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                      <span class="w-2 h-2 rounded-full bg-purple-600"></span>
                      1. Màu sắc / Chất liệu:
                      <span class="text-purple-700 font-extrabold normal-case ml-1">{{ options.color() || 'Vui lòng chọn' }}</span>
                    </label>
                    <span class="text-xs text-slate-400 font-normal">{{ options.colors().length }} lựa chọn</span>
                  </div>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    @for (color of options.colors(); track color) {
                      <button type="button"
                        [disabled]="!options.colorAvailable(color)"
                        (click)="options.chooseColor(color)"
                        class="flex items-center gap-2 p-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs text-left"
                        [class]="options.color() === color
                          ? 'border-2 border-purple-600 bg-purple-50/70 text-purple-900 font-bold shadow-xs'
                          : 'border border-slate-200 bg-white hover:border-purple-300 text-slate-700 font-medium'">
                        <span class="w-4 h-4 rounded-full border border-black/10 shrink-0 shadow-inner"
                          [style.backgroundColor]="options.hex(color) || '#d1d5db'"></span>
                        <span class="truncate">{{ color }}</span>
                      </button>
                    }
                  </div>
                  @if (options.attempted() && !options.color()) {
                    <p class="text-xs text-rose-600 font-medium">Vui lòng chọn màu sắc sản phẩm</p>
                  }
                </div>
              }

              <!-- 2. Bộ Chọn Kích Thước / Size nếu có -->
              @if (options.sizes().length) {
                <div class="flex flex-col gap-2 pt-1 border-t border-slate-100">
                  <div class="flex items-center justify-between">
                    <label class="text-xs text-slate-800 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                      <span class="w-2 h-2 rounded-full bg-purple-600"></span>
                      2. Kích thước / Quy cách:
                      <span class="text-purple-700 font-extrabold normal-case ml-1">{{ options.size() || 'Vui lòng chọn' }}</span>
                    </label>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    @for (size of options.sizes(); track size) {
                      <button type="button"
                        [disabled]="!options.sizeAvailable(size)"
                        (click)="options.chooseSize(size)"
                        class="px-4 py-2.5 rounded-xl text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        [class]="options.size() === size
                          ? 'border-2 border-purple-600 bg-purple-50/70 text-purple-900 font-bold shadow-xs'
                          : 'border border-slate-200 bg-white hover:border-purple-300 text-slate-700 font-medium'">
                        {{ size }}
                      </button>
                    }
                  </div>
                  @if (options.attempted() && !options.size()) {
                    <p class="text-xs text-rose-600 font-medium">Vui lòng chọn kích thước</p>
                  }
                </div>
              }

              <!-- 3. Số Lượng & Tồn Kho -->
              <div class="flex items-center justify-between pt-1 border-t border-slate-100">
                <div class="flex items-center gap-3">
                  <span class="text-xs font-bold text-slate-700">Số lượng:</span>
                  <div class="flex items-center bg-slate-100 rounded-full p-0.5 border border-slate-200">
                    <button type="button" (click)="changeQuantity(-1)" [disabled]="quantity() <= 1"
                      class="w-7 h-7 rounded-full bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-xs disabled:opacity-40 transition-colors">
                      <span class="material-symbols-outlined text-[15px]">remove</span>
                    </button>
                    <span class="w-9 text-center text-xs font-bold text-slate-900 select-none">{{ quantity() }}</span>
                    <button type="button" (click)="changeQuantity(1)" [disabled]="quantity() >= (options.stock() || 1)"
                      class="w-7 h-7 rounded-full bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-xs disabled:opacity-40 transition-colors">
                      <span class="material-symbols-outlined text-[15px]">add</span>
                    </button>
                  </div>
                </div>

                <div class="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  @if (options.stock() > 0) {
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Còn <strong>{{ options.stock() }} sản phẩm</strong> tại xưởng</span>
                  } @else {
                    <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span class="text-rose-600">Hết hàng tạm thời</span>
                  }
                </div>
              </div>

              <!-- 4. Ô Khắc Laser Nhanh (Quick Engrave Input) -->
              @if (prod.supportsCustomization === true && prod.studioSupported === true) {
                <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col gap-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-slate-800 font-bold flex items-center gap-1">
                      <span class="material-symbols-outlined text-purple-600 text-[18px]">edit_note</span>
                      Nội dung khắc laser (Tùy chọn nhanh):
                    </span>
                    <span class="text-[11px] text-slate-400 font-medium">{{ engraveText().length }}/30 ký tự</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <input type="text"
                      maxlength="30"
                      [value]="engraveText()"
                      (input)="engraveText.set($any($event.target).value)"
                      placeholder="Ví dụ: Hoàng An • 24.12 • Kỷ Niệm"
                      class="flex-1 bg-white px-3.5 py-2.5 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 shadow-2xs">
                    <a [routerLink]="['/custom-studio']"
                      [queryParams]="{ productId: prod._id, text: engraveText() || undefined }"
                      class="px-3.5 py-2.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-bold transition-colors shrink-0">
                      Mở Studio 3D
                    </a>
                  </div>
                </div>
              }

              <!-- 5. Khối Nút Kêu Gọi Hành Động (CTA Buttons) -->
              <div class="flex flex-col gap-3 pt-2">
                @if (prod.supportsCustomization === true && prod.studioSupported === true) {
                  <!-- Nút Thiết Kế 3D Nổi Bật -->
                  <a [routerLink]="['/custom-studio']"
                    [queryParams]="{ productId: prod._id, text: engraveText() || undefined }"
                    class="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-[0_10px_25px_-5px_rgba(124,58,237,0.35)] hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] transition-all">
                    <span class="material-symbols-outlined text-[20px]">palette</span>
                    <span>TỰ THIẾT KẾ & CUSTOM (Studio 2D/3D)</span>
                    <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </a>
                  
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button type="button" (click)="buyNow()" [disabled]="pending() || options.stock() <= 0"
                      class="w-full py-3.5 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50">
                      <span class="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
                      <span>MUA NGAY</span>
                    </button>
                    <button type="button" (click)="addToCart()" [disabled]="pending() || options.stock() <= 0"
                      class="w-full py-3.5 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50">
                      <span class="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                      <span>Thêm Vào Giỏ Hàng</span>
                    </button>
                  </div>
                } @else {
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button type="button" (click)="buyNow()" [disabled]="pending() || options.stock() <= 0"
                      class="w-full py-3.5 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all active:scale-[0.98] disabled:opacity-50">
                      <span class="material-symbols-outlined text-[20px]">bolt</span>
                      <span>MUA NGAY</span>
                    </button>
                    <button type="button" (click)="addToCart()" [disabled]="pending() || options.stock() <= 0"
                      class="w-full py-3.5 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50">
                      <span class="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                      <span>Thêm Vào Giỏ</span>
                    </button>
                  </div>
                }

                <!-- Thanh Tiện Ích Phụ: Wishlist, Tặng Bạn Bè, Chia Sẻ -->
                <div class="flex items-center justify-around pt-2 text-xs text-slate-500 border-t border-slate-100">
                  <button type="button" (click)="toggleWishlist()"
                    class="flex items-center gap-1.5 py-1 px-3 rounded-full hover:bg-slate-100 transition-all"
                    [class.text-rose-600]="isWishlisted()">
                    <span class="material-symbols-outlined text-[18px]" [class.fill-1]="isWishlisted()">favorite</span>
                    <span>{{ isWishlisted() ? 'Đã yêu thích' : 'Yêu thích' }}</span>
                  </button>
                  <div class="w-px h-3 bg-slate-200"></div>
                  <a [routerLink]="['/cart']"
                    class="flex items-center gap-1.5 py-1 px-3 rounded-full hover:bg-slate-100 hover:text-purple-600 transition-all">
                    <span class="material-symbols-outlined text-[18px]">card_giftcard</span>
                    <span>Tặng kèm thiệp</span>
                  </a>
                  <div class="w-px h-3 bg-slate-200"></div>
                  <button type="button" (click)="shareProduct()"
                    class="flex items-center gap-1.5 py-1 px-3 rounded-full hover:bg-slate-100 hover:text-purple-600 transition-all">
                    <span class="material-symbols-outlined text-[18px]">share</span>
                    <span>Chia sẻ</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TABBED SPECIFICATIONS & ARTISAN DETAILS -->
        <div class="w-full bg-white rounded-[28px] p-6 sm:p-8 shadow-[0_10px_25px_-5px_rgba(124,58,237,0.08)] border border-purple-100/60 mb-12">
          <!-- Tab Navigation -->
          <div class="flex items-center gap-2 border-b border-slate-100 pb-4 mb-6 overflow-x-auto">
            <button type="button" (click)="activeTab.set('specs')"
              class="px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all shrink-0"
              [class]="activeTab() === 'specs' ? 'bg-purple-100 text-purple-700 font-extrabold shadow-2xs' : 'text-slate-600 hover:bg-slate-100'">
              Chi Tiết Chất Liệu & Kích Thước
            </button>
            <button type="button" (click)="activeTab.set('custom-guide')"
              class="px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all shrink-0"
              [class]="activeTab() === 'custom-guide' ? 'bg-purple-100 text-purple-700 font-extrabold shadow-2xs' : 'text-slate-600 hover:bg-slate-100'">
              Quy Trình Khắc Laser & Custom
            </button>
            <button type="button" (click)="activeTab.set('care')"
              class="px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all shrink-0"
              [class]="activeTab() === 'care' ? 'bg-purple-100 text-purple-700 font-extrabold shadow-2xs' : 'text-slate-600 hover:bg-slate-100'">
              Bảo Quản & Đóng Gói Quà
            </button>
          </div>

          <!-- Tab 1: Specs Content -->
          @if (activeTab() === 'specs') {
            <div class="tab-content flex flex-col gap-6">
              <!-- Grid chất liệu cao cấp -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div class="p-5 rounded-2xl bg-purple-50/40 border border-purple-100/70 flex flex-col gap-2">
                  <div class="flex items-center gap-2 text-purple-700 font-bold text-sm">
                    <span class="material-symbols-outlined">coffee</span>
                    <span>Chất Liệu Cao Cấp Tuyển Chọn</span>
                  </div>
                  <p class="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    Được gia công từ nguyên liệu tự nhiên tinh khiết (gốm sứ cao lanh nung 1280°C, gỗ sồi Bắc Âu hoặc da thuộc cao cấp), khử hoàn toàn độc tố và đạt chuẩn vệ sinh an toàn.
                  </p>
                </div>

                <div class="p-5 rounded-2xl bg-purple-50/40 border border-purple-100/70 flex flex-col gap-2">
                  <div class="flex items-center gap-2 text-purple-700 font-bold text-sm">
                    <span class="material-symbols-outlined">eco</span>
                    <span>Gia Công Khắc Tinh Xảo</span>
                  </div>
                  <p class="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    Áp dụng công nghệ khắc vi điểm chính xác đến 0.01mm, đường nét sắc sảo, chống trầy xước và bền bỉ vĩnh cửu theo thời gian.
                  </p>
                </div>

                <div class="p-5 rounded-2xl bg-purple-50/40 border border-purple-100/70 flex flex-col gap-2">
                  <div class="flex items-center gap-2 text-purple-700 font-bold text-sm">
                    <span class="material-symbols-outlined">stars</span>
                    <span>Phụ Kiện Đi Kèm Chuẩn Quà Tặng</span>
                  </div>
                  <p class="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    Kèm theo nắp đậy tinh tế, thìa mạ titan hoặc móc khóa phối đôi tùy phân loại. Hoàn hảo để trao gửi tình cảm tới người thương yêu.
                  </p>
                </div>
              </div>

              <!-- Bảng thông số kỹ thuật nếu có -->
              @if (prod.specs && prod.specs.length > 0) {
                <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Thông Số Kỹ Thuật Đầy Đủ:</h4>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    @for (s of prod.specs; track s.key) {
                      <div>
                        <span class="text-slate-400 block text-[10px] uppercase font-semibold">{{ s.key }}</span>
                        <strong class="text-slate-800 text-sm font-bold">{{ s.value }}</strong>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Tiêu chuẩn cam kết -->
              <div class="flex items-center gap-2 text-emerald-700 font-semibold text-xs sm:text-sm">
                <span class="material-symbols-outlined text-[20px]">verified</span>
                <span>An toàn cho sức khỏe người dùng · Cam kết đạt chuẩn chứng nhận nguồn gốc xuất xứ</span>
              </div>
            </div>
          }

          <!-- Tab 2: Quy Trình Khắc Laser & Custom -->
          @if (activeTab() === 'custom-guide') {
            <div class="tab-content grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="p-5 rounded-2xl bg-purple-50/40 border border-purple-100 flex flex-col gap-2.5">
                <span class="w-8 h-8 rounded-full bg-purple-700 text-white flex items-center justify-center font-extrabold text-xs">1</span>
                <span class="text-sm font-bold text-slate-900">Chọn Mẫu & Nhập Lời Nhắn</span>
                <p class="text-xs text-slate-600 leading-relaxed">Nhập tên, ngày kỷ niệm hoặc tải lên hình ảnh / chữ ký vẽ tay qua giao diện Studio.</p>
              </div>

              <div class="p-5 rounded-2xl bg-purple-50/40 border border-purple-100 flex flex-col gap-2.5">
                <span class="w-8 h-8 rounded-full bg-purple-700 text-white flex items-center justify-center font-extrabold text-xs">2</span>
                <span class="text-sm font-bold text-slate-900">Xem Trước Bản Mô Phỏng 3D</span>
                <p class="text-xs text-slate-600 leading-relaxed">Giftory tự động kết xuất ảnh 3D chân thực 360 độ góc nhìn sau khi khắc xong.</p>
              </div>

              <div class="p-5 rounded-2xl bg-purple-50/40 border border-purple-100 flex flex-col gap-2.5">
                <span class="w-8 h-8 rounded-full bg-purple-700 text-white flex items-center justify-center font-extrabold text-xs">3</span>
                <span class="text-sm font-bold text-slate-900">Nghệ Nhân Khắc Laser Fiber</span>
                <p class="text-xs text-slate-600 leading-relaxed">Sử dụng chùm tia laser fiber vi điểm với độ nét tinh vi 0.01mm, vĩnh viễn không phai màu.</p>
              </div>

              <div class="p-5 rounded-2xl bg-purple-50/40 border border-purple-100 flex flex-col gap-2.5">
                <span class="w-8 h-8 rounded-full bg-purple-700 text-white flex items-center justify-center font-extrabold text-xs">4</span>
                <span class="text-sm font-bold text-slate-900">Đóng Gói Chống Sốc 3 Lớp</span>
                <p class="text-xs text-slate-600 leading-relaxed">Lót xốp và rơm hoa khô thơm dịu, thắt nơ ruy băng lụa satin cao cấp và dán tem niêm phong.</p>
              </div>
            </div>
          }

          <!-- Tab 3: Bảo Quản & Đóng Gói Quà -->
          @if (activeTab() === 'care') {
            <div class="tab-content p-5 rounded-2xl bg-purple-50/40 border border-purple-100 flex flex-col gap-3">
              <h4 class="text-sm font-bold text-slate-900">Hướng Dẫn Bảo Quản & Trao Tặng:</h4>
              <ul class="list-disc list-inside space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                <li>Đối với chất liệu gỗ tự nhiên: Tránh ngâm nước quá lâu, lau khô bằng khăn mềm sau khi vệ sinh.</li>
                <li>Đối với phụ kiện mạ titan kim loại: Dùng khăn vải mịn hoặc bọt biển mềm để giữ bề mặt bóng bẩy lâu dài.</li>
                <li>Hộp quà hoa khô có gói bảo quản kèm theo, lưu giữ nơi khô thoáng để màu sắc luôn tươi tắn.</li>
                <li>Thiệp chúc mừng viết tay được đính kèm trong phong bì nơ lụa trang trọng khi giao hàng.</li>
              </ul>
            </div>
          }
        </div>

        <!-- VERIFIED CUSTOMER REVIEWS -->
        <div class="mb-12">
          <app-product-reviews [productId]="prod._id" />
        </div>

        <!-- RELATED PRODUCTS SECTION -->
        @if (prod.relatedProducts && prod.relatedProducts.length > 0) {
          <div class="mt-12">
            <div class="flex items-center justify-between mb-6">
              <div>
                <span class="text-xs font-bold uppercase tracking-widest text-purple-700">Gợi ý từ AI Gift Concierge</span>
                <h3 class="text-xl sm:text-2xl font-extrabold text-slate-900">Các Sản Phẩm Thường Được Đặt Cùng</h3>
              </div>
              <a routerLink="/products" class="text-xs sm:text-sm font-bold text-purple-700 hover:underline flex items-center gap-1">
                <span>Xem tất cả quà tặng</span>
                <span class="material-symbols-outlined text-[16px]">chevron_right</span>
              </a>
            </div>
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

  options = new ProductOptions();
  product = this.options.product;
  activeImage = this.options.activeImage;
  quantity = this.options.quantity;
  lightbox = signal(false);
  pending = signal(false);
  activeTab = signal<'specs' | 'custom-guide' | 'care'>('specs');
  engraveText = signal('');
  isFromAiRecommendation = signal<boolean>(false);

  private touchX = 0;
  touchStart(e: TouchEvent) { this.touchX = e.changedTouches[0].clientX; }
  touchEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - this.touchX;
    if (Math.abs(dx) > 40) this.options.moveImage(dx > 0 ? -1 : 1);
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(qParams => {
      if (qParams['ref'] === 'ai_recommendation') {
        this.isFromAiRecommendation.set(true);
      }
    });

    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug');
      if (slug) {
        this.productService.getProductBySlug(slug).subscribe({
          next: p => {
            this.options.load(p);
            this.lightbox.set(false);
          }
        });
      }
    });
  }

  changeQuantity(delta: number): void {
    const next = this.quantity() + delta;
    if (next >= 1 && next <= (this.options.stock() || 1)) {
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

  shareProduct(): void {
    if (navigator.share) {
      navigator.share({
        title: this.product()?.name || 'Giftory',
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      this.cartService.notify('Đã sao chép liên kết sản phẩm!');
    }
  }

  addToCart(): void {
    const p = this.product();
    if (!p) return;

    const error = this.options.error();
    if (error) {
      this.cartService.notify(error);
      return;
    }
    if (this.pending()) return;
    this.pending.set(true);

    this.cartService.addItem({
      productId: p._id,
      quantity: this.quantity(),
      variantName: this.options.selected()?.name,
      variantSku: this.options.selected()?.sku
    }).subscribe({
      next: () => {
        this.pending.set(false);
        this.cartService.added();
      },
      error: err => {
        this.pending.set(false);
        this.cartService.notify(err.error?.message || 'Không thể thêm vào giỏ');
      }
    });
  }

  buyNow(): void {
    const p = this.product();
    if (!p) return;

    const error = this.options.error();
    if (error) {
      this.cartService.notify(error);
      return;
    }
    const unitPrice = this.options.price();
    const vName = this.options.selected()?.name;

    const buyNowItem = {
      productId: p,
      name: p.name,
      image: this.activeImage() || '',
      price: unitPrice,
      unitPrice: unitPrice,
      quantity: this.quantity(),
      variantName: vName || 'Tiêu chuẩn',
      variantSku: this.options.selected()?.sku,
      isCustom: false,
      customDetails: null
    };

    this.cartService.setBuyNowItem(buyNowItem);
    this.router.navigate(['/checkout'], { queryParams: { buyNow: '1' } });
  }
}
