import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ProductService } from '../../../core/services/product.service';
import { CustomStudioService } from '../../../core/services/custom-studio.service';
import { ApiService } from '../../../core/services/api.service';
import { Product, Category, StudioAsset, ProductVariant } from '../../../core/models';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-giftory-border/60 pb-6">
        <div>
          <span class="text-xs font-bold tracking-widest text-[#7C3AED] uppercase">Quản Trị Kho Quà & Custom Studio</span>
          <h1 class="text-2xl md:text-3xl font-display font-black text-giftory-ink mt-1">Danh Mục & Phôi Chế Tác Quà Tặng</h1>
          <p class="text-xs text-giftory-ink/60 mt-1">Cấu hình phôi quà 2 mặt, quản lý thư viện icon/sticker và chính sách cọc 50%</p>
        </div>

        <div class="flex items-center gap-3 self-start sm:self-auto">
          @if (activeTab() === 'PRODUCTS') {
            <button
              (click)="openCreateModal()"
              class="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer"
            >
              <span class="material-symbols-outlined text-base">add</span>
              Thêm Mẫu Quà Mới
            </button>
          } @else {
            <button
              (click)="openAddAssetModal()"
              class="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer"
            >
              <span class="material-symbols-outlined text-base">add_reaction</span>
              Thêm Icon / Sticker Mới
            </button>
          }
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center gap-3 border-b border-giftory-border pb-2">
        <button
          (click)="activeTab.set('PRODUCTS')"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer"
          [ngClass]="activeTab() === 'PRODUCTS' ? 'bg-[#7C3AED] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
        >
          <span class="material-symbols-outlined text-[18px]">inventory_2</span>
          <span>Sản Phẩm & Phôi Quà Tặng ({{ products().length }})</span>
        </button>

        <button
          (click)="activeTab.set('STUDIO_ASSETS')"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer"
          [ngClass]="activeTab() === 'STUDIO_ASSETS' ? 'bg-[#7C3AED] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
        >
          <span class="material-symbols-outlined text-[18px]">palette</span>
          <span>Thư Viện Icon & Sticker Studio ({{ studioAssets().length }})</span>
        </button>
      </div>

      <!-- ================= TAB 1: PRODUCTS & BLANKS TABLE ================= -->
      @if (activeTab() === 'PRODUCTS') {
        <div class="bg-white rounded-3xl p-6 border border-giftory-border shadow-xs space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div class="text-xs font-bold text-giftory-ink">
              Tổng cộng: <span class="text-[#7C3AED] font-black">{{ products().length }} món quà trong Database</span>
            </div>

            <div class="relative max-w-xs w-full">
              <span class="material-symbols-outlined absolute left-3 top-2 text-giftory-ink/40 text-lg">search</span>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                placeholder="Tìm theo tên hoặc SKU..."
                class="w-full pl-9 pr-4 py-1.5 bg-[#F3EBF9]/50 rounded-xl border border-giftory-border focus:outline-none focus:border-[#7C3AED] text-xs font-medium"
              />
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-giftory-border text-giftory-ink/50 font-bold uppercase tracking-wider">
                  <th class="py-3 px-4">Ảnh & Tên Quà</th>
                  <th class="py-3 px-4">Danh Mục</th>
                  <th class="py-3 px-4">Giá Bán</th>
                  <th class="py-3 px-4">Phôi 2 Mặt Studio</th>
                  <th class="py-3 px-4">Bespoke (Cọc 50%)</th>
                  <th class="py-3 px-4">Trạng Thái</th>
                  <th class="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-giftory-border/40">
                <tr *ngFor="let p of filteredProducts()" class="hover:bg-[#F3EBF9]/40 transition">
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                      <img [src]="p.images[0] || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=100'" [alt]="p.name" class="w-12 h-12 rounded-xl object-cover border border-giftory-border shrink-0" />
                      <div>
                        <span class="font-bold text-giftory-ink block line-clamp-1 max-w-[260px]">{{ p.name }}</span>
                        <div class="flex items-center gap-2 mt-0.5">
                          <span class="text-[10px] text-giftory-ink/50 font-mono">SKU: {{ p.sku || 'N/A' }}</span>
                          <span class="text-[10px] text-[#7C3AED] font-semibold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                            {{ p.variants && p.variants.length > 0 ? p.variants.length + ' màu' : '1 màu' }} • Kho: {{ p.stock || 0 }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="py-3 px-4 font-medium text-giftory-ink/80">{{ p.category?.name || 'Quà Cao Cấp' }}</td>
                  <td class="py-3 px-4">
                    <span class="font-bold font-mono text-giftory-ink">{{ (p.salePrice || p.price) | number }} đ</span>
                    <span *ngIf="p.salePrice" class="text-[10px] text-giftory-ink/40 line-through block">{{ p.price | number }} đ</span>
                  </td>
                  <td class="py-3 px-4">
                    @if (p.isCustomizable) {
                      <div class="flex items-center gap-1.5">
                        <span class="px-2 py-0.5 rounded-md bg-purple-50 text-[#7C3AED] border border-purple-200 font-semibold text-[10px]">
                          {{ p.customConfig?.backBlankImage ? 'Đủ 2 mặt' : '1 mặt' }}
                        </span>
                        <span class="text-[10px] text-slate-400">Phí: +{{ (p.customBaseFee || 30000) | number }}đ</span>
                      </div>
                    } @else {
                      <span class="text-slate-400 text-[10px]">-</span>
                    }
                  </td>
                  <td class="py-3 px-4">
                    <span *ngIf="p.isCustomizable" class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold text-[10px] flex items-center gap-1 w-max">
                      <span class="material-symbols-outlined text-xs">brush</span>
                      Bespoke 1:1
                    </span>
                    <span *ngIf="!p.isCustomizable" class="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold text-[10px] w-max block">
                      Tiêu chuẩn
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <span [ngClass]="p.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'" class="px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {{ p.status }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-right space-x-2">
                    <button (click)="openEditModal(p)" class="text-[#7C3AED] hover:underline font-bold text-xs cursor-pointer">Sửa phôi</button>
                    <button (click)="deleteProduct(p._id)" class="text-rose-500 hover:underline font-bold text-xs cursor-pointer">Xóa</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- ================= TAB 2: STUDIO ASSETS & ICONS ================= -->
      @if (activeTab() === 'STUDIO_ASSETS') {
        <div class="bg-white rounded-3xl p-6 border border-giftory-border shadow-xs space-y-6">
          <div class="flex items-center justify-between pb-2 border-b border-giftory-border/50">
            <div>
              <h3 class="font-bold text-base text-[#1E1B4B]">Thư Viện Icon / Sticker Trang Trí Studio</h3>
              <p class="text-xs text-slate-500 mt-0.5">Các biểu tượng này hiển thị trực tiếp cho khách hàng lựa chọn để trang trí lên quà tặng tại Studio</p>
            </div>
            <button
              (click)="openAddAssetModal()"
              class="px-4 py-2 bg-[#7C3AED] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm hover:bg-[#6D28D9] cursor-pointer"
            >
              <span class="material-symbols-outlined text-[16px]">add</span>
              <span>Thêm Icon Mới</span>
            </button>
          </div>

          <!-- Icons Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            @for (asset of studioAssets(); track asset._id) {
              <div class="p-3 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-[#7C3AED] hover:shadow-sm transition-all flex flex-col items-center text-center relative group">
                <button
                  (click)="deleteAsset(asset._id)"
                  class="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Xóa icon này"
                >
                  <span class="material-symbols-outlined text-[14px]">close</span>
                </button>

                <span class="text-3xl my-1 select-none">{{ asset.icon }}</span>
                <span class="text-xs font-bold text-slate-800 truncate w-full mt-1">{{ asset.name }}</span>
                <span class="text-[10px] text-slate-400 truncate w-full">{{ asset.category || 'Phổ biến' }}</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- ================= MODAL: CREATE / EDIT PRODUCT & BESPOKE BLANK ================= -->
      @if (isModalOpen()) {
        <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full border border-giftory-border shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto animate-fade-in">
            <div class="flex items-center justify-between border-b border-giftory-border/40 pb-4">
              <h3 class="text-lg font-bold text-giftory-ink">
                {{ editingProduct() ? 'Cập Nhật Mẫu Quà & Phôi Studio' : 'Thêm Mẫu Quà & Phôi Chế Tác Mới' }}
              </h3>
              <button (click)="isModalOpen.set(false)" class="text-giftory-ink/50 hover:text-giftory-ink cursor-pointer">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <!-- Modal 3-Tab Navigation Bar -->
            <div class="flex items-center gap-2 border-b border-giftory-border/60 pb-3">
              <button
                type="button"
                (click)="modalTab.set('GENERAL')"
                class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                [ngClass]="modalTab() === 'GENERAL' ? 'bg-[#7C3AED] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
              >
                <span class="material-symbols-outlined text-[16px]">info</span>
                <span>1. Thông Tin Chung (SPU)</span>
              </button>
              <button
                type="button"
                (click)="modalTab.set('VARIANTS')"
                class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer relative"
                [ngClass]="modalTab() === 'VARIANTS' ? 'bg-[#7C3AED] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
              >
                <span class="material-symbols-outlined text-[16px]">palette</span>
                <span>2. Biến Thể & Tồn Kho (SKU)</span>
                <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold" [ngClass]="modalTab() === 'VARIANTS' ? 'bg-white text-[#7C3AED]' : 'bg-purple-100 text-[#7C3AED]'">
                  {{ variants().length }}
                </span>
                @if (hasVariantMissingImage()) {
                  <span class="w-2 h-2 rounded-full bg-red-500 absolute -top-0.5 -right-0.5 animate-ping"></span>
                }
              </button>
              <button
                type="button"
                (click)="modalTab.set('STUDIO')"
                class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                [ngClass]="modalTab() === 'STUDIO' ? 'bg-[#7C3AED] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
              >
                <span class="material-symbols-outlined text-[16px]">auto_fix_high</span>
                <span>3. Studio / Phôi Bespoke</span>
                @if (productForm.get('isCustomizable')?.value) {
                  <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                }
              </button>
            </div>

            <form [formGroup]="productForm" (ngSubmit)="saveProduct()" class="space-y-4">
              <!-- ================= TAB 1: GENERAL INFO (SPU) ================= -->
              @if (modalTab() === 'GENERAL') {
                <div class="space-y-4 animate-fade-in">
                  <!-- Basic Info -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-1.5">
                      <label class="text-xs font-bold text-giftory-ink">Tên món quà *</label>
                      <input type="text" formControlName="name" placeholder="VD: Bình Giữ Nhiệt Nordic Bọc Da..." class="w-full px-4 py-2 bg-[#F3EBF9]/50 rounded-xl border border-giftory-border text-sm font-medium focus:outline-none focus:border-[#7C3AED]" />
                    </div>
                    <div class="space-y-1.5">
                      <label class="text-xs font-bold text-giftory-ink">Danh mục quà tặng *</label>
                      <select formControlName="category" class="w-full px-4 py-2 bg-[#F3EBF9]/50 rounded-xl border border-giftory-border text-sm font-medium focus:outline-none focus:border-[#7C3AED]">
                        <option value="">-- Chọn danh mục quà --</option>
                        <option *ngFor="let cat of categories()" [value]="cat._id">{{ cat.name }}</option>
                      </select>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1.5">
                      <label class="text-xs font-bold text-giftory-ink">Giá gốc (đ) *</label>
                      <input type="number" formControlName="price" placeholder="250000" class="w-full px-4 py-2 bg-[#F3EBF9]/50 rounded-xl border border-giftory-border text-sm font-medium focus:outline-none focus:border-[#7C3AED]" />
                    </div>
                    <div class="space-y-1.5">
                      <label class="text-xs font-bold text-giftory-ink">Giá khuyến mãi (đ)</label>
                      <input type="number" formControlName="salePrice" placeholder="220000" class="w-full px-4 py-2 bg-[#F3EBF9]/50 rounded-xl border border-giftory-border text-sm font-medium focus:outline-none focus:border-[#7C3AED]" />
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-1.5">
                      <label class="text-xs font-bold text-giftory-ink">Mã SKU Gốc (SPU)</label>
                      <input type="text" formControlName="sku" placeholder="GF-BESPOKE-01" class="w-full px-4 py-2 bg-[#F3EBF9]/50 rounded-xl border border-giftory-border text-sm font-medium focus:outline-none focus:border-[#7C3AED]" />
                    </div>
                    <div class="space-y-1.5">
                      <div class="flex items-center justify-between">
                        <label class="text-xs font-bold text-giftory-ink">Tổng tồn kho (Toàn bộ biến thể)</label>
                        <span class="text-[10px] text-purple-700 font-medium">Chỉ xem • Tự động tính</span>
                      </div>
                      <div class="px-4 py-2 bg-slate-100 rounded-xl border border-giftory-border text-sm font-bold text-slate-800 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <span class="material-symbols-outlined text-[#7C3AED] text-base">inventory_2</span>
                          <span>{{ totalVariantStock() }} sản phẩm</span>
                        </div>
                        <span class="text-[11px] font-normal text-slate-500">Tự cộng từ {{ variants().length }} màu</span>
                      </div>
                    </div>
                  </div>

                  <!-- Main Image -->
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                      <label class="text-xs font-bold text-giftory-ink">Ảnh đại diện sản phẩm</label>
                      <label class="cursor-pointer text-[11px] font-bold text-[#7C3AED] hover:underline flex items-center gap-1 bg-[#7C3AED]/10 px-2 py-0.5 rounded-lg transition-all">
                        <span class="material-symbols-outlined text-[14px]">cloud_upload</span>
                        <span>{{ isUploading() ? 'Đang tải...' : 'Tải ảnh đại diện' }}</span>
                        <input type="file" accept="image/*" (change)="onFileSelected($event, 'imageUrl')" class="hidden" [disabled]="isUploading()" />
                      </label>
                    </div>
                    <div class="flex gap-2 items-center">
                      <input type="text" formControlName="imageUrl" placeholder="https://... URL ảnh chính" class="flex-1 px-4 py-2 bg-[#F3EBF9]/50 rounded-xl border border-giftory-border text-sm font-medium focus:outline-none focus:border-[#7C3AED]" />
                      @if (productForm.get('imageUrl')?.value) {
                        <img [src]="productForm.get('imageUrl')?.value" alt="Preview" class="w-10 h-10 rounded-xl object-cover border border-giftory-border shadow-sm shrink-0" />
                      }
                    </div>
                  </div>

                  <div class="space-y-1.5">
                    <label class="text-xs font-bold text-giftory-ink">Mô tả sản phẩm</label>
                    <textarea rows="3" formControlName="description" placeholder="Mô tả chất liệu, quy cách quà tặng..." class="w-full px-4 py-2 bg-[#F3EBF9]/50 rounded-xl border border-giftory-border text-sm font-medium focus:outline-none focus:border-[#7C3AED]"></textarea>
                  </div>
                </div>
              }

              <!-- ================= TAB 2: VARIANTS & STOCK (SKU) ================= -->
              @if (modalTab() === 'VARIANTS') {
                <div class="space-y-4 animate-fade-in">
                  @if (hasVariantMissingImage()) {
                    <div class="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-700">
                      <span class="material-symbols-outlined text-red-500 text-lg">error</span>
                      <span class="font-medium">Có biến thể màu đang thiếu ảnh mockup! Trong Custom Studio bắt buộc cần ảnh mockup riêng để khách đổi màu trực quan.</span>
                    </div>
                  }

                  <!-- Variants Action Header -->
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F3EBF9]/40 p-4 rounded-2xl border border-giftory-border/60">
                    <div>
                      <h4 class="font-bold text-xs text-[#1E1B4B] uppercase tracking-wide flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[#7C3AED] text-[18px]">view_list</span>
                        Bảng Quản Lý Biến Thể Màu & Tồn Kho (SKU)
                      </h4>
                      <p class="text-[11px] text-slate-500 mt-0.5">
                        Mỗi dòng là một màu với SKU, giá, tồn kho và ảnh mockup riêng. Studio sẽ tự động lấy danh sách màu từ đây.
                      </p>
                    </div>
                    <button
                      type="button"
                      (click)="openAddVariantDrawer()"
                      class="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    >
                      <span class="material-symbols-outlined text-base">add</span>
                      Thêm Màu Mới
                    </button>
                  </div>

                  <!-- Bulk Actions Toolbar (when selected) -->
                  @if (selectedVariantIndexes().length > 0) {
                    <div class="p-3 bg-purple-100/70 border border-purple-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-[#7C3AED]">Đã chọn {{ selectedVariantIndexes().length }} màu:</span>
                      </div>
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <button type="button" (click)="bulkUpdatePrice()" class="px-2.5 py-1 bg-white hover:bg-slate-50 border border-purple-200 rounded-lg font-bold text-slate-700 cursor-pointer">
                          Đổi Giá
                        </button>
                        <button type="button" (click)="bulkUpdateStock()" class="px-2.5 py-1 bg-white hover:bg-slate-50 border border-purple-200 rounded-lg font-bold text-slate-700 cursor-pointer">
                          Đổi Tồn Kho
                        </button>
                        <button type="button" (click)="bulkUpdateStatus('ACTIVE')" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg font-bold cursor-pointer">
                          Hiện (Bán)
                        </button>
                        <button type="button" (click)="bulkUpdateStatus('HIDDEN')" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg font-bold cursor-pointer">
                          Ẩn
                        </button>
                        <button type="button" (click)="bulkDeleteVariants()" class="px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg font-bold cursor-pointer">
                          Xóa
                        </button>
                      </div>
                    </div>
                  }

                  <!-- Variants Table -->
                  <div class="overflow-x-auto rounded-2xl border border-giftory-border shadow-2xs">
                    <table class="w-full text-left text-xs border-collapse">
                      <thead class="bg-slate-100 text-slate-600 font-bold border-b border-giftory-border">
                        <tr>
                          <th class="p-3 w-10 text-center">
                            <input type="checkbox" [checked]="isAllVariantsSelected()" (change)="toggleAllVariants($any($event.target).checked)" class="w-4 h-4 rounded accent-[#7C3AED] cursor-pointer" />
                          </th>
                          <th class="p-3">Màu (Swatch + Tên)</th>
                          <th class="p-3">Mã SKU</th>
                          <th class="p-3">Giá Bán</th>
                          <th class="p-3">Tồn Kho</th>
                          <th class="p-3">Ảnh Mockup</th>
                          <th class="p-3">Trạng Thái</th>
                          <th class="p-3 text-right">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-giftory-border/40 bg-white font-medium text-slate-700">
                        @for (v of variants(); track v.sku; let idx = $index) {
                          <tr class="hover:bg-purple-50/30 transition-colors" [ngClass]="{'bg-purple-50/50': isVariantSelected(idx)}">
                            <td class="p-3 text-center">
                              <input type="checkbox" [checked]="isVariantSelected(idx)" (change)="toggleVariantSelect(idx)" class="w-4 h-4 rounded accent-[#7C3AED] cursor-pointer" />
                            </td>
                            <td class="p-3">
                              <div class="flex items-center gap-2">
                                <span class="w-5 h-5 rounded-full border border-slate-300 shadow-2xs shrink-0" [style.backgroundColor]="v.colorHex || '#1E1B4B'"></span>
                                <div>
                                  <span class="font-bold text-slate-800 block">{{ v.name }}</span>
                                  <span class="text-[10px] text-slate-400 font-mono">{{ v.colorHex || '#1E1B4B' }}</span>
                                </div>
                              </div>
                            </td>
                            <td class="p-3">
                              <span class="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{{ v.sku }}</span>
                            </td>
                            <td class="p-3">
                              <div class="font-bold text-slate-800">
                                {{ (v.price || productForm.get('price')?.value || 0) | number }}đ
                              </div>
                            </td>
                            <td class="p-3">
                              @if ((v.stock || 0) > 0) {
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  {{ v.stock }} sp
                                </span>
                              } @else {
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                                  Hết hàng (0)
                                </span>
                              }
                            </td>
                            <td class="p-3">
                              @if (v.image) {
                                <img [src]="v.image" [alt]="v.name" class="w-9 h-9 rounded-lg object-cover border border-slate-200 shadow-2xs" />
                              } @else {
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 flex items-center gap-1 w-fit">
                                  <span class="material-symbols-outlined text-[13px]">warning</span>
                                  Thiếu ảnh
                                </span>
                              }
                            </td>
                            <td class="p-3">
                              @if (v.status === 'ACTIVE' && (v.stock || 0) > 0) {
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Đang bán</span>
                              } @else if (v.status === 'HIDDEN') {
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">Đang ẩn</span>
                              } @else {
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">Hết hàng</span>
                              }
                            </td>
                            <td class="p-3 text-right">
                              <div class="flex items-center justify-end gap-1">
                                <button type="button" (click)="openEditVariantDrawer(idx)" class="p-1 rounded-lg hover:bg-purple-100 text-[#7C3AED] cursor-pointer" title="Sửa màu này">
                                  <span class="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                                <button type="button" (click)="deleteVariant(idx)" class="p-1 rounded-lg hover:bg-red-100 text-red-600 cursor-pointer" title="Xóa màu này">
                                  <span class="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        } @empty {
                          <tr>
                            <td colspan="8" class="p-6 text-center text-slate-400">
                              <span class="material-symbols-outlined text-3xl mb-1 text-slate-300 block">palette</span>
                              Chưa có biến thể màu nào. Vui lòng bấm <b>"Thêm Màu Mới"</b> để thêm các phân loại màu cho sản phẩm.
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              }

              <!-- ================= TAB 3: STUDIO / BESPOKE BLANK ================= -->
              @if (modalTab() === 'STUDIO') {
                <div class="space-y-4 animate-fade-in">

              <!-- Bespoke Toggle Switch -->
              <div class="p-4 bg-purple-50/70 rounded-2xl border border-purple-200 flex items-center justify-between">
                <div>
                  <span class="text-xs font-bold text-[#7C3AED] block">Hỗ Trợ Tùy Biến Bespoke (Custom Studio)</span>
                  <span class="text-[11px] text-slate-500">Kích hoạt để sản phẩm xuất hiện trong Studio Chế Tác và áp dụng chính sách cọc 50%</span>
                </div>
                <input type="checkbox" formControlName="isCustomizable" class="w-5 h-5 accent-[#7C3AED] rounded cursor-pointer" />
              </div>

              <!-- BESPOKE BLANK CONFIGURATION BOX (BP-02) -->
              @if (productForm.get('isCustomizable')?.value) {
                <div class="p-5 rounded-2xl bg-gradient-to-br from-purple-50/90 to-white border-2 border-[#7C3AED]/30 space-y-4">
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-[#7C3AED]">palette</span>
                    <h4 class="font-bold text-xs text-[#1E1B4B] uppercase tracking-wide">Cấu Hình Phôi Chế Tác Studio (Blank Config)</h4>
                  </div>

                  <!-- Front Blank & Back Blank Images -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Front Blank Image -->
                    <div class="space-y-1.5">
                      <div class="flex items-center justify-between">
                        <label class="text-[11px] font-bold text-slate-700">Ảnh Phôi Mặt Trước (Front Blank):</label>
                        <label class="cursor-pointer text-[10px] font-bold text-[#7C3AED] hover:underline flex items-center gap-0.5">
                          <span class="material-symbols-outlined text-[13px]">upload</span>
                          <span>Tải ảnh mặt trước</span>
                          <input type="file" accept="image/*" (change)="onFileSelected($event, 'frontBlankImage')" class="hidden" />
                        </label>
                      </div>
                      <div class="flex gap-2 items-center">
                        <input type="text" formControlName="frontBlankImage" placeholder="Mặc định lấy ảnh chính nếu để trống" class="flex-1 px-3 py-1.5 bg-white rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#7C3AED]" />
                        @if (productForm.get('frontBlankImage')?.value) {
                          <img [src]="productForm.get('frontBlankImage')?.value" alt="Front" class="w-8 h-8 rounded-lg object-contain border bg-white shrink-0" />
                        }
                      </div>
                    </div>

                    <!-- Back Blank Image -->
                    <div class="space-y-1.5">
                      <div class="flex items-center justify-between">
                        <label class="text-[11px] font-bold text-slate-700">Ảnh Phôi Mặt Sau (Back Blank):</label>
                        <label class="cursor-pointer text-[10px] font-bold text-[#7C3AED] hover:underline flex items-center gap-0.5">
                          <span class="material-symbols-outlined text-[13px]">upload</span>
                          <span>Tải ảnh mặt sau</span>
                          <input type="file" accept="image/*" (change)="onFileSelected($event, 'backBlankImage')" class="hidden" />
                        </label>
                      </div>
                      <div class="flex gap-2 items-center">
                        <input type="text" formControlName="backBlankImage" placeholder="URL ảnh phôi mặt sau" class="flex-1 px-3 py-1.5 bg-white rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#7C3AED]" />
                        @if (productForm.get('backBlankImage')?.value) {
                          <img [src]="productForm.get('backBlankImage')?.value" alt="Back" class="w-8 h-8 rounded-lg object-contain border bg-white shrink-0" />
                        }
                      </div>
                    </div>
                  </div>

                  <!-- Fees & Text limits -->
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="space-y-1">
                      <label class="text-[11px] font-bold text-slate-700">Phí chế tác gốc (đ):</label>
                      <input type="number" formControlName="customBaseFee" class="w-full px-3 py-1.5 bg-white rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#7C3AED]" />
                    </div>
                    <div class="space-y-1">
                      <label class="text-[11px] font-bold text-slate-700">Giới hạn ký tự chữ:</label>
                      <input type="number" formControlName="maxTextLength" class="w-full px-3 py-1.5 bg-white rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#7C3AED]" />
                    </div>
                  </div>

                  <!-- PRINT AREA & SAFE AREA (% MOCKUP) -->
                  <div class="pt-4 border-t border-purple-200/60 space-y-3">
                    <div class="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span class="text-xs font-bold text-[#7C3AED] uppercase tracking-wide flex items-center gap-1.5">
                          <span class="material-symbols-outlined text-base">crop_free</span>
                          Trình Chỉnh Vùng In & An Toàn Trực Tiếp Trên Phôi
                        </span>
                        <span class="text-[11px] text-slate-500 block mt-0.5">
                          Kéo thả hoặc co giãn trực tiếp trên hình ảnh phôi bên dưới. Tỷ lệ % tự động đồng bộ theo thời gian thực.
                        </span>
                      </div>

                      <!-- Action buttons & Presets -->
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <button type="button" (click)="centerCurrentArea()" class="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 cursor-pointer flex items-center gap-1" title="Căn giữa vùng đang chọn">
                          <span class="material-symbols-outlined text-[13px]">filter_center_focus</span>
                          Căn Giữa Phôi
                        </button>
                        @if (activeAreaMode() === 'SAFE') {
                          <button type="button" (click)="fitSafeAreaToPrintArea()" class="px-2.5 py-1 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-[10px] font-bold text-emerald-800 cursor-pointer flex items-center gap-1" title="Thu gọn nằm trong Vùng In">
                            <span class="material-symbols-outlined text-[13px]">fit_screen</span>
                            Gọn Trong Vùng In
                          </button>
                        }
                        <button type="button" (click)="applyAreaPreset('tumbler')" class="px-2.5 py-1 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 text-[10px] font-bold text-purple-700 cursor-pointer" title="Phôi bình trụ tròn tránh 2 mép cong bên">
                          Bình Trụ Tròn
                        </button>
                        <button type="button" (click)="applyAreaPreset('mug')" class="px-2.5 py-1 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 text-[10px] font-bold text-purple-700 cursor-pointer">
                          Ly Sứ / Cốc
                        </button>
                        <button type="button" (click)="applyAreaPreset('flat')" class="px-2.5 py-1 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 text-[10px] font-bold text-purple-700 cursor-pointer">
                          Mặt Phẳng / Ví
                        </button>
                      </div>
                    </div>

                    <!-- Direct Visual Canvas Editor Stage -->
                    <div class="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-2.5 shadow-inner">
                      <!-- Mode Switcher & Guide Bar -->
                      <div class="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800">
                        <div class="flex items-center gap-2">
                          <button
                            type="button"
                            (click)="setAreaMode('PRINT')"
                            class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                            [ngClass]="activeAreaMode() === 'PRINT' ? 'bg-[#7C3AED] text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'"
                          >
                            <span class="w-2.5 h-2.5 rounded-xs bg-purple-300 inline-block border border-white"></span>
                            🟣 Chỉnh Vùng In (Print Area)
                          </button>
                          <button
                            type="button"
                            (click)="setAreaMode('SAFE')"
                            class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                            [ngClass]="activeAreaMode() === 'SAFE' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'"
                          >
                            <span class="w-2.5 h-2.5 rounded-xs bg-emerald-300 inline-block border border-white"></span>
                            🟢 Chỉnh Vùng An Toàn (Safe Area)
                          </button>
                        </div>
                        <div class="text-[11px] text-slate-400 flex items-center gap-1">
                          <span class="material-symbols-outlined text-[14px] text-amber-400">info</span>
                          <span>Kéo khung để di chuyển • Kéo các chấm tròn ở góc/cạnh để thay đổi kích thước</span>
                        </div>
                      </div>

                      <!-- Visual Display Box with Real Mockup Phôi Image -->
                      <div class="flex justify-center items-center py-2 min-h-[360px] bg-slate-950/60 rounded-xl overflow-hidden relative">
                        <div class="admin-area-container relative inline-block select-none shadow-2xl rounded-lg overflow-hidden border border-slate-800/80">
                          <img
                            [src]="getAdminPreviewBlankImage()"
                            alt="Ảnh Phôi Mockup"
                            class="max-h-[350px] max-w-full object-contain pointer-events-none block"
                          />

                          <!-- Interactive Overlay -->
                          <div
                            class="absolute inset-0 select-none touch-none"
                            (pointermove)="onAreaPointerMove($event)"
                            (pointerup)="onAreaPointerUp($event)"
                            (pointercancel)="onAreaPointerUp($event)"
                          >
                            <!-- Print Area Box -->
                            <div
                              class="absolute border-2 border-dashed transition-all box-border"
                              [ngClass]="activeAreaMode() === 'PRINT' ? 'border-[#7C3AED] bg-purple-500/25 ring-2 ring-[#7C3AED]/60 z-20 cursor-move' : 'border-purple-400/80 bg-purple-500/10 z-10 cursor-pointer'"
                              [style.left.%]="productForm.get('printAreaX')?.value"
                              [style.top.%]="productForm.get('printAreaY')?.value"
                              [style.width.%]="productForm.get('printAreaWidth')?.value"
                              [style.height.%]="productForm.get('printAreaHeight')?.value"
                              (pointerdown)="onBoxPointerDown($event, 'PRINT')"
                            >
                              <span class="absolute top-1 left-1.5 bg-[#7C3AED] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none select-none whitespace-nowrap">
                                VÙNG IN: {{ productForm.get('printAreaWidth')?.value }}% × {{ productForm.get('printAreaHeight')?.value }}%
                              </span>

                              @if (activeAreaMode() === 'PRINT') {
                                <div class="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#7C3AED] rounded-full shadow-md cursor-nwse-resize z-30" (pointerdown)="onHandlePointerDown($event, 'nw', 'PRINT')"></div>
                                <div class="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#7C3AED] rounded-full shadow-md cursor-nesw-resize z-30" (pointerdown)="onHandlePointerDown($event, 'ne', 'PRINT')"></div>
                                <div class="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#7C3AED] rounded-full shadow-md cursor-nesw-resize z-30" (pointerdown)="onHandlePointerDown($event, 'sw', 'PRINT')"></div>
                                <div class="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#7C3AED] rounded-full shadow-md cursor-nwse-resize z-30" (pointerdown)="onHandlePointerDown($event, 'se', 'PRINT')"></div>
                                <div class="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-[#7C3AED] rounded-full shadow-md cursor-ns-resize z-30" (pointerdown)="onHandlePointerDown($event, 'n', 'PRINT')"></div>
                                <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-[#7C3AED] rounded-full shadow-md cursor-ns-resize z-30" (pointerdown)="onHandlePointerDown($event, 's', 'PRINT')"></div>
                                <div class="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-[#7C3AED] rounded-full shadow-md cursor-ew-resize z-30" (pointerdown)="onHandlePointerDown($event, 'w', 'PRINT')"></div>
                                <div class="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-[#7C3AED] rounded-full shadow-md cursor-ew-resize z-30" (pointerdown)="onHandlePointerDown($event, 'e', 'PRINT')"></div>
                              }
                            </div>

                            <!-- Safe Area Box -->
                            <div
                              class="absolute border-2 border-dashed transition-all box-border"
                              [ngClass]="activeAreaMode() === 'SAFE' ? 'border-emerald-500 bg-emerald-500/25 ring-2 ring-emerald-400/60 z-20 cursor-move' : 'border-emerald-400/80 bg-emerald-500/10 z-10 cursor-pointer'"
                              [style.left.%]="productForm.get('safeAreaX')?.value"
                              [style.top.%]="productForm.get('safeAreaY')?.value"
                              [style.width.%]="productForm.get('safeAreaWidth')?.value"
                              [style.height.%]="productForm.get('safeAreaHeight')?.value"
                              (pointerdown)="onBoxPointerDown($event, 'SAFE')"
                            >
                              <span class="absolute bottom-1 right-1.5 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none select-none whitespace-nowrap">
                                AN TOÀN: {{ productForm.get('safeAreaWidth')?.value }}% × {{ productForm.get('safeAreaHeight')?.value }}%
                              </span>

                              @if (activeAreaMode() === 'SAFE') {
                                <div class="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-full shadow-md cursor-nwse-resize z-30" (pointerdown)="onHandlePointerDown($event, 'nw', 'SAFE')"></div>
                                <div class="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-full shadow-md cursor-nesw-resize z-30" (pointerdown)="onHandlePointerDown($event, 'ne', 'SAFE')"></div>
                                <div class="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-full shadow-md cursor-nesw-resize z-30" (pointerdown)="onHandlePointerDown($event, 'sw', 'SAFE')"></div>
                                <div class="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-full shadow-md cursor-nwse-resize z-30" (pointerdown)="onHandlePointerDown($event, 'se', 'SAFE')"></div>
                                <div class="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-full shadow-md cursor-ns-resize z-30" (pointerdown)="onHandlePointerDown($event, 'n', 'SAFE')"></div>
                                <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-full shadow-md cursor-ns-resize z-30" (pointerdown)="onHandlePointerDown($event, 's', 'SAFE')"></div>
                                <div class="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-full shadow-md cursor-ew-resize z-30" (pointerdown)="onHandlePointerDown($event, 'w', 'SAFE')"></div>
                                <div class="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-full shadow-md cursor-ew-resize z-30" (pointerdown)="onHandlePointerDown($event, 'e', 'SAFE')"></div>
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Synchronized Numeric Controls -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-purple-100">
                      <!-- Print Area (% Mockup) -->
                      <div class="space-y-2 p-2.5 rounded-lg bg-purple-50/50 border border-purple-200">
                        <div class="flex items-center justify-between">
                          <span class="text-[11px] font-bold text-[#7C3AED] flex items-center gap-1">
                            <span class="w-2.5 h-2.5 rounded-xs bg-[#7C3AED] inline-block"></span>
                            Tọa độ Vùng In (Print Area %)
                          </span>
                          <span class="text-[10px] text-purple-700 font-mono font-bold">
                            {{ productForm.get('printAreaWidth')?.value }}% × {{ productForm.get('printAreaHeight')?.value }}%
                          </span>
                        </div>
                        <div class="grid grid-cols-4 gap-1.5 text-[10px]">
                          <div>
                            <label class="text-slate-600 font-medium block">X (%)</label>
                            <input type="number" formControlName="printAreaX" min="0" max="100" class="w-full px-2 py-1 border rounded bg-white font-mono text-center font-bold text-purple-700" />
                          </div>
                          <div>
                            <label class="text-slate-600 font-medium block">Y (%)</label>
                            <input type="number" formControlName="printAreaY" min="0" max="100" class="w-full px-2 py-1 border rounded bg-white font-mono text-center font-bold text-purple-700" />
                          </div>
                          <div>
                            <label class="text-slate-600 font-medium block">Rộng (%)</label>
                            <input type="number" formControlName="printAreaWidth" min="10" max="100" class="w-full px-2 py-1 border rounded bg-white font-mono text-center font-bold text-purple-700" />
                          </div>
                          <div>
                            <label class="text-slate-600 font-medium block">Cao (%)</label>
                            <input type="number" formControlName="printAreaHeight" min="10" max="100" class="w-full px-2 py-1 border rounded bg-white font-mono text-center font-bold text-purple-700" />
                          </div>
                        </div>
                      </div>

                      <!-- Safe Area (% Mockup) -->
                      <div class="space-y-2 p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-200">
                        <div class="flex items-center justify-between">
                          <span class="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                            <span class="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block"></span>
                            Tọa độ Vùng An Toàn (Safe Area %)
                          </span>
                          <span class="text-[10px] text-emerald-800 font-mono font-bold">
                            {{ productForm.get('safeAreaWidth')?.value }}% × {{ productForm.get('safeAreaHeight')?.value }}%
                          </span>
                        </div>
                        <div class="grid grid-cols-4 gap-1.5 text-[10px]">
                          <div>
                            <label class="text-slate-600 font-medium block">X (%)</label>
                            <input type="number" formControlName="safeAreaX" min="0" max="100" class="w-full px-2 py-1 border rounded bg-white font-mono text-center font-bold text-emerald-700" />
                          </div>
                          <div>
                            <label class="text-slate-600 font-medium block">Y (%)</label>
                            <input type="number" formControlName="safeAreaY" min="0" max="100" class="w-full px-2 py-1 border rounded bg-white font-mono text-center font-bold text-emerald-700" />
                          </div>
                          <div>
                            <label class="text-slate-600 font-medium block">Rộng (%)</label>
                            <input type="number" formControlName="safeAreaWidth" min="10" max="100" class="w-full px-2 py-1 border rounded bg-white font-mono text-center font-bold text-emerald-700" />
                          </div>
                          <div>
                            <label class="text-slate-600 font-medium block">Cao (%)</label>
                            <input type="number" formControlName="safeAreaHeight" min="10" max="100" class="w-full px-2 py-1 border rounded bg-white font-mono text-center font-bold text-emerald-700" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              }
                </div>
              }

              <!-- Buttons -->
              <div class="flex justify-end gap-3 pt-4 border-t border-giftory-border/40">
                <button type="button" (click)="isModalOpen.set(false)" class="px-5 py-2 rounded-xl text-xs font-bold text-giftory-ink/60 hover:bg-[#F3EBF9] cursor-pointer">
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  [disabled]="productForm.invalid || isSaving()"
                  class="px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-gray-300 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span *ngIf="isSaving()" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {{ isSaving() ? 'Đang Đẩy Vào Database...' : (editingProduct() ? 'Cập Nhật Phôi & Quà Tặng' : 'Đẩy Sản Phẩm Vào Database') }}
                </button>
              </div>
            </form>

            <!-- ================= SUB-DRAWER: ADD / EDIT COLOR VARIANT ================= -->
            @if (isVariantDrawerOpen()) {
              <div class="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                <div class="bg-white rounded-3xl p-6 max-w-lg w-full border border-purple-200 shadow-2xl space-y-4 animate-fade-in max-h-[90vh] overflow-y-auto">
                  <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 class="font-bold text-sm text-[#1E1B4B] flex items-center gap-2">
                      <span class="material-symbols-outlined text-[#7C3AED]">palette</span>
                      {{ editingVariantIndex() !== null ? 'Chỉnh Sửa Biến Thể Màu' : 'Thêm Biến Thể Màu Mới' }}
                    </h4>
                    <button type="button" (click)="isVariantDrawerOpen.set(false)" class="text-slate-400 hover:text-slate-600 cursor-pointer">
                      <span class="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  <form [formGroup]="variantForm" (ngSubmit)="saveVariantFromDrawer()" class="space-y-4">
                    <div class="space-y-1.5">
                      <label class="text-xs font-bold text-giftory-ink">Tên màu *</label>
                      <input
                        type="text"
                        formControlName="name"
                        (input)="onVariantColorNameInput($any($event.target).value)"
                        placeholder="VD: Navy Blue, Deep Slate, Pure White..."
                        class="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#7C3AED]"
                      />
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                      <div class="space-y-1.5">
                        <label class="text-xs font-bold text-giftory-ink">Mã màu Swatch (Hex) *</label>
                        <div class="flex items-center gap-2">
                          <input type="color" formControlName="colorHex" class="w-9 h-9 p-0.5 rounded-lg border border-slate-300 cursor-pointer shrink-0" />
                          <input type="text" formControlName="colorHex" placeholder="#1E1B4B" class="flex-1 px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 font-mono text-xs font-bold text-slate-800" />
                        </div>
                      </div>

                      <div class="space-y-1.5">
                        <div class="flex items-center justify-between">
                          <label class="text-xs font-bold text-giftory-ink">Mã SKU riêng *</label>
                          <button type="button" (click)="onVariantColorNameInput(variantForm.get('name')?.value)" class="text-[10px] text-[#7C3AED] font-bold hover:underline cursor-pointer">
                            Gợi ý lại
                          </button>
                        </div>
                        <input type="text" formControlName="sku" placeholder="GF-BESPOKE-01-NVY" class="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 font-mono text-xs font-bold text-purple-700 uppercase" />
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                      <div class="space-y-1.5">
                        <div class="flex items-center justify-between">
                          <label class="text-xs font-bold text-giftory-ink">Giá biến thể (đ) *</label>
                          <button type="button" (click)="variantForm.patchValue({ price: productForm.get('price')?.value })" class="text-[10px] text-slate-500 hover:underline cursor-pointer">
                            Lấy giá gốc
                          </button>
                        </div>
                        <input type="number" formControlName="price" class="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#7C3AED]" />
                      </div>

                      <div class="space-y-1.5">
                        <label class="text-xs font-bold text-giftory-ink">Số lượng tồn kho riêng *</label>
                        <input type="number" formControlName="stock" class="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#7C3AED]" />
                        <span class="text-[10px] text-slate-400 block">Nếu tồn kho = 0 sẽ tự chuyển "Hết hàng"</span>
                      </div>
                    </div>

                    <!-- Variant Mockup Image (Mandatory for Studio) -->
                    <div class="space-y-1.5">
                      <div class="flex items-center justify-between">
                        <label class="text-xs font-bold text-giftory-ink flex items-center gap-1">
                          <span>Ảnh Mockup Riêng Của Màu Này *</span>
                          <span class="text-[10px] text-red-500 font-bold">(Bắt buộc cho studio)</span>
                        </label>
                        <label class="cursor-pointer text-[11px] font-bold text-[#7C3AED] hover:underline flex items-center gap-1 bg-purple-50 px-2 py-0.5 rounded-lg">
                          <span class="material-symbols-outlined text-[13px]">upload</span>
                          <span>{{ isVariantUploading() ? 'Đang tải...' : 'Tải ảnh mockup' }}</span>
                          <input type="file" accept="image/*" (change)="onVariantFileSelected($event)" class="hidden" [disabled]="isVariantUploading()" />
                        </label>
                      </div>
                      <div class="flex gap-2 items-center">
                        <input type="text" formControlName="image" placeholder="URL ảnh mockup riêng cho màu này..." class="flex-1 px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#7C3AED]" />
                        @if (variantForm.get('image')?.value) {
                          <img [src]="variantForm.get('image')?.value" alt="Variant Preview" class="w-10 h-10 rounded-xl object-cover border border-slate-300 shadow-2xs shrink-0" />
                        }
                      </div>
                      <p class="text-[10px] text-slate-500 italic">Đúng nguyên tắc: Khi khách đổi màu vỏ phôi trong studio, phôi canvas sẽ đổi sang ảnh mockup này.</p>
                    </div>

                    <div class="space-y-1.5">
                      <label class="text-xs font-bold text-giftory-ink">Trạng thái biến thể</label>
                      <select formControlName="status" class="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#7C3AED]">
                        <option value="ACTIVE">Đang bán (Hiển thị đầy đủ)</option>
                        <option value="HIDDEN">Ẩn (Không hiện trên cửa hàng & studio)</option>
                        <option value="OUT_OF_STOCK">Hết hàng (Hiển thị nhãn hết hàng, vô hiệu hóa)</option>
                      </select>
                    </div>

                    <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
                      <button type="button" (click)="isVariantDrawerOpen.set(false)" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">
                        Đóng
                      </button>
                      <button type="submit" [disabled]="variantForm.invalid" class="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-gray-300 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer">
                        {{ editingVariantIndex() !== null ? 'Cập Nhật Màu' : 'Lưu Màu Mới' }}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- ================= MODAL: ADD STUDIO ASSET / ICON ================= -->
      @if (isAssetModalOpen()) {
        <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-white rounded-3xl p-6 max-w-md w-full border border-purple-200 shadow-2xl space-y-4 animate-fade-in">
            <div class="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 class="font-bold text-base text-[#1E1B4B]">Thêm Icon / Sticker Mới Vào Studio</h3>
              <button (click)="isAssetModalOpen.set(false)" class="text-slate-400 hover:text-slate-600 cursor-pointer">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="space-y-3">
              <div>
                <label class="text-xs font-bold text-slate-700 block mb-1">Ký tự Icon / Biểu tượng Emoji *</label>
                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    [(ngModel)]="newAssetIcon"
                    placeholder="VD: 🧸 hoặc 🌟 hoặc 🍷"
                    class="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-lg font-bold text-center focus:outline-none focus:border-[#7C3AED]"
                  />
                  <!-- Common emoji suggestions -->
                  <div class="flex items-center gap-1">
                    <button *ngFor="let em of ['🧸', '🌟', '🍷', '💍', '🕊️', '💐']" (click)="newAssetIcon = em" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-purple-100 text-base cursor-pointer">
                      {{ em }}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label class="text-xs font-bold text-slate-700 block mb-1">Tên biểu tượng *</label>
                <input
                  type="text"
                  [(ngModel)]="newAssetName"
                  placeholder="VD: Gấu bông kỷ niệm"
                  class="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div>
                <label class="text-xs font-bold text-slate-700 block mb-1">Danh mục biểu tượng</label>
                <select
                  [(ngModel)]="newAssetCategory"
                  class="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#7C3AED]"
                >
                  <option value="Tình yêu">Tình yêu</option>
                  <option value="Sinh nhật">Sinh nhật</option>
                  <option value="Sang trọng">Sang trọng</option>
                  <option value="Kỷ niệm">Kỷ niệm</option>
                  <option value="Hoa cỏ">Hoa cỏ</option>
                  <option value="May mắn">May mắn</option>
                  <option value="Phổ biến">Phổ biến</option>
                </select>
              </div>

              <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button (click)="isAssetModalOpen.set(false)" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">
                  Hủy
                </button>
                <button
                  (click)="saveAsset()"
                  [disabled]="!newAssetIcon || !newAssetName"
                  class="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-slate-300 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Lưu Icon Vào Studio
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AdminProductsComponent implements OnInit {
  private productService = inject(ProductService);
  private customStudioService = inject(CustomStudioService);
  private adminService = inject(AdminService);
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  activeTab = signal<'PRODUCTS' | 'STUDIO_ASSETS'>('PRODUCTS');
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  studioAssets = signal<StudioAsset[]>([]);
  searchQuery = '';

  isModalOpen = signal<boolean>(false);
  isAssetModalOpen = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isUploading = signal<boolean>(false);
  editingProduct = signal<Product | null>(null);

  // Modal 3-tab navigation
  modalTab = signal<'GENERAL' | 'VARIANTS' | 'STUDIO'>('GENERAL');

  // Variants state (SKU)
  variants = signal<ProductVariant[]>([]);
  selectedVariantIndexes = signal<number[]>([]);
  isVariantDrawerOpen = signal<boolean>(false);
  editingVariantIndex = signal<number | null>(null);
  isVariantUploading = signal<boolean>(false);
  variantForm!: FormGroup;

  totalVariantStock = computed(() => {
    return this.variants().reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  });

  hasVariantMissingImage = computed(() => {
    return this.variants().some(v => !v.image || v.image.trim() === '');
  });

  // Asset creation form state
  newAssetIcon = '🧸';
  newAssetName = '';
  newAssetCategory = 'Tình yêu';

  productForm!: FormGroup;

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
    this.loadStudioAssets();
    this.initForm();
    this.initVariantForm();
  }

  initVariantForm() {
    this.variantForm = this.fb.group({
      name: ['', Validators.required],
      colorHex: ['#1E1B4B', Validators.required],
      sku: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      stock: [10, [Validators.required, Validators.min(0)]],
      image: ['', Validators.required],
      status: ['ACTIVE']
    });
  }

  suggestSkuForColor(colorName: string): string {
    const baseSku = (this.productForm?.get('sku')?.value || 'GF-BESPOKE-01').trim().toUpperCase();
    const cleanColor = colorName.trim().toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]/g, '');
    const code = cleanColor.slice(0, 3) || 'CLR';
    return `${baseSku}-${code}`;
  }

  onVariantColorNameInput(name: string) {
    if (this.editingVariantIndex() === null) {
      const suggested = this.suggestSkuForColor(name);
      this.variantForm.patchValue({ sku: suggested });
    }
  }

  openAddVariantDrawer() {
    this.editingVariantIndex.set(null);
    const basePrice = Number(this.productForm?.get('price')?.value) || 250000;
    const baseSku = (this.productForm?.get('sku')?.value || 'GF-BESPOKE-01').trim();
    const count = this.variants().length + 1;
    this.variantForm.reset({
      name: `Màu mới #${count}`,
      colorHex: '#1E3A8A',
      sku: `${baseSku}-C${count}`,
      price: basePrice,
      stock: 50,
      image: this.productForm?.get('imageUrl')?.value || '',
      status: 'ACTIVE'
    });
    this.isVariantDrawerOpen.set(true);
  }

  openEditVariantDrawer(index: number) {
    const v = this.variants()[index];
    if (!v) return;
    this.editingVariantIndex.set(index);
    this.variantForm.patchValue({
      name: v.name,
      colorHex: v.colorHex || '#1E1B4B',
      sku: v.sku || '',
      price: v.price ?? (this.productForm?.get('price')?.value || 0),
      stock: v.stock ?? 0,
      image: v.image || '',
      status: v.status || (v.stock && v.stock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK')
    });
    this.isVariantDrawerOpen.set(true);
  }

  saveVariantFromDrawer() {
    if (this.variantForm.invalid) {
      alert('Vui lòng điền đủ tên màu, mã SKU, giá, số lượng tồn kho và ảnh mockup!');
      return;
    }
    const val = this.variantForm.value;
    const stockNum = Number(val.stock) || 0;
    const status = stockNum <= 0 ? 'OUT_OF_STOCK' : (val.status || 'ACTIVE');

    const newVar: ProductVariant = {
      name: val.name.trim(),
      colorHex: val.colorHex || '#1E1B4B',
      sku: val.sku.trim().toUpperCase(),
      price: Number(val.price) || 0,
      stock: stockNum,
      image: val.image ? val.image.trim() : '',
      status: status as any
    };

    const current = [...this.variants()];
    const idx = this.editingVariantIndex();
    if (idx !== null && idx >= 0 && idx < current.length) {
      current[idx] = newVar;
    } else {
      const targetSku = (newVar.sku || '').toUpperCase();
      if (current.some(item => (item.sku || '').toUpperCase() === targetSku)) {
        alert('Mã SKU biến thể đã tồn tại! Vui lòng nhập SKU khác để đảm bảo tính duy nhất toàn hệ thống.');
        return;
      }
      current.push(newVar);
    }

    this.variants.set(current);
    this.isVariantDrawerOpen.set(false);
  }

  deleteVariant(index: number) {
    const v = this.variants()[index];
    if (!v) return;
    if (confirm(`Bạn có chắc muốn xóa biến thể "${v.name}" (${v.sku})?\n\nLưu ý: Không xóa biến thể đang dính đơn hàng chưa hoàn thành (hãy chọn ẩn).`)) {
      const current = this.variants().filter((_, i) => i !== index);
      this.variants.set(current);
      this.selectedVariantIndexes.set(this.selectedVariantIndexes().filter(i => i !== index));
    }
  }

  toggleVariantSelect(index: number) {
    const current = [...this.selectedVariantIndexes()];
    const found = current.indexOf(index);
    if (found > -1) {
      current.splice(found, 1);
    } else {
      current.push(index);
    }
    this.selectedVariantIndexes.set(current);
  }

  toggleAllVariants(checked: boolean) {
    if (checked) {
      this.selectedVariantIndexes.set(this.variants().map((_, i) => i));
    } else {
      this.selectedVariantIndexes.set([]);
    }
  }

  isVariantSelected(index: number): boolean {
    return this.selectedVariantIndexes().includes(index);
  }

  isAllVariantsSelected(): boolean {
    return this.variants().length > 0 && this.selectedVariantIndexes().length === this.variants().length;
  }

  bulkUpdatePrice() {
    const str = prompt('Nhập giá bán mới (đ) cho tất cả biến thể đã chọn:');
    if (!str || isNaN(Number(str))) return;
    const newPrice = Math.max(0, Number(str));
    const current = [...this.variants()];
    this.selectedVariantIndexes().forEach(idx => {
      if (current[idx]) {
        current[idx] = { ...current[idx], price: newPrice };
      }
    });
    this.variants.set(current);
  }

  bulkUpdateStock() {
    const str = prompt('Nhập số lượng tồn kho mới cho tất cả biến thể đã chọn:');
    if (!str || isNaN(Number(str))) return;
    const newStock = Math.max(0, Number(str));
    const current = [...this.variants()];
    this.selectedVariantIndexes().forEach(idx => {
      if (current[idx]) {
        current[idx] = {
          ...current[idx],
          stock: newStock,
          status: newStock === 0 ? 'OUT_OF_STOCK' : current[idx].status === 'OUT_OF_STOCK' ? 'ACTIVE' : current[idx].status
        };
      }
    });
    this.variants.set(current);
  }

  bulkUpdateStatus(status: 'ACTIVE' | 'HIDDEN' | 'OUT_OF_STOCK') {
    const current = [...this.variants()];
    this.selectedVariantIndexes().forEach(idx => {
      if (current[idx]) {
        current[idx] = { ...current[idx], status };
      }
    });
    this.variants.set(current);
  }

  bulkDeleteVariants() {
    if (confirm(`Bạn có chắc muốn xóa ${this.selectedVariantIndexes().length} biến thể đã chọn?`)) {
      const selected = new Set(this.selectedVariantIndexes());
      const current = this.variants().filter((_, i) => !selected.has(i));
      this.variants.set(current);
      this.selectedVariantIndexes.set([]);
    }
  }

  onVariantFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.isVariantUploading.set(true);
      this.adminService.uploadImage(file).subscribe({
        next: (res: any) => {
          this.isVariantUploading.set(false);
          const uploadedUrl = res?.url || res?.data?.url || (typeof res === 'string' ? res : '');
          if (uploadedUrl) {
            this.variantForm.patchValue({ image: uploadedUrl });
          }
        },
        error: (err) => {
          this.isVariantUploading.set(false);
          alert('Không thể tải ảnh biến thể: ' + (err?.error?.message || err.message));
        }
      });
    }
  }

  loadStudioAssets() {
    this.customStudioService.getAdminAssets().subscribe({
      next: (assets: any) => {
        this.studioAssets.set(Array.isArray(assets) ? assets : []);
      },
      error: err => console.error('Error loading studio assets:', err)
    });
  }

  loadCategories() {
    this.api.get<any>('categories').subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        this.categories.set(list);
      }
    });
  }

  loadProducts() {
    this.productService.getProducts({ limit: 100 }).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
        this.products.set(list);
      }
    });
  }

  filteredProducts(): Product[] {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.products();
    return this.products().filter(p => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
  }

  openCreateModal() {
    this.editingProduct.set(null);
    this.modalTab.set('GENERAL');
    this.variants.set([]);
    this.selectedVariantIndexes.set([]);
    this.initForm();
    if (this.categories().length > 0) {
      this.productForm.patchValue({ category: this.categories()[0]._id });
    }
    this.isModalOpen.set(true);
  }

  openEditModal(p: Product) {
    this.editingProduct.set(p);
    this.modalTab.set('GENERAL');
    this.selectedVariantIndexes.set([]);

    if (p.variants && p.variants.length > 0) {
      this.variants.set(p.variants.map(v => ({
        name: v.name,
        colorHex: v.colorHex || '#1E1B4B',
        sku: v.sku || '',
        price: v.price ?? p.price,
        stock: v.stock ?? 0,
        image: v.image || '',
        status: (v.status as any) || (v.stock && v.stock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK')
      })));
    } else {
      this.variants.set([{
        name: 'Mặc định',
        colorHex: '#1E1B4B',
        sku: p.sku || 'GF-01',
        price: p.price,
        stock: p.stock,
        image: p.images && p.images[0] ? p.images[0] : '',
        status: p.stock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK'
      }]);
    }

    const catId = typeof p.category === 'object' && p.category ? (p.category as any)._id : p.category;
    this.productForm.patchValue({
      name: p.name,
      category: catId || '',
      price: p.price,
      salePrice: p.salePrice,
      stock: p.stock,
      sku: p.sku || '',
      imageUrl: p.images && p.images[0] ? p.images[0] : '',
      description: p.description || '',
      isCustomizable: p.isCustomizable,
      customBaseFee: p.customBaseFee || 30000,
      frontBlankImage: p.customConfig?.frontBlankImage || (p.images && p.images[0] ? p.images[0] : ''),
      backBlankImage: p.customConfig?.backBlankImage || (p.images && p.images[1] ? p.images[1] : ''),
      backEngraveFee: p.customConfig?.backEngraveFee || 20000,
      photoPrintFee: p.customConfig?.photoPrintFee || 30000,
      maxTextLength: p.customConfig?.maxTextLength || 35,
      printAreaX: p.customConfig?.printArea?.x ?? 20,
      printAreaY: p.customConfig?.printArea?.y ?? 20,
      printAreaWidth: p.customConfig?.printArea?.width ?? 60,
      printAreaHeight: p.customConfig?.printArea?.height ?? 60,
      safeAreaX: p.customConfig?.safeArea?.x ?? 26,
      safeAreaY: p.customConfig?.safeArea?.y ?? 25,
      safeAreaWidth: p.customConfig?.safeArea?.width ?? 48,
      safeAreaHeight: p.customConfig?.safeArea?.height ?? 50
    });
    this.isModalOpen.set(true);
  }

  applyAreaPreset(preset: 'tumbler' | 'mug' | 'flat') {
    if (preset === 'tumbler') {
      this.productForm.patchValue({
        printAreaX: 20,
        printAreaY: 20,
        printAreaWidth: 60,
        printAreaHeight: 60,
        safeAreaX: 28,
        safeAreaY: 25,
        safeAreaWidth: 44,
        safeAreaHeight: 50
      });
    } else if (preset === 'mug') {
      this.productForm.patchValue({
        printAreaX: 20,
        printAreaY: 25,
        printAreaWidth: 60,
        printAreaHeight: 50,
        safeAreaX: 26,
        safeAreaY: 30,
        safeAreaWidth: 48,
        safeAreaHeight: 40
      });
    } else {
      this.productForm.patchValue({
        printAreaX: 15,
        printAreaY: 15,
        printAreaWidth: 70,
        printAreaHeight: 70,
        safeAreaX: 20,
        safeAreaY: 20,
        safeAreaWidth: 60,
        safeAreaHeight: 60
      });
    }
  }

  // ================= DIRECT VISUAL AREA EDITING ON PHÔI (BP-02) =================
  activeAreaMode = signal<'PRINT' | 'SAFE'>('PRINT');
  private dragOperation: {
    type: 'MOVE' | 'RESIZE';
    target: 'PRINT' | 'SAFE';
    handle?: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
    containerRect: DOMRect;
  } | null = null;

  getAdminPreviewBlankImage(): string {
    return this.productForm?.get('frontBlankImage')?.value || 
           this.productForm?.get('imageUrl')?.value || 
           'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600';
  }

  setAreaMode(mode: 'PRINT' | 'SAFE'): void {
    this.activeAreaMode.set(mode);
  }

  centerCurrentArea(): void {
    const prefix = this.activeAreaMode() === 'PRINT' ? 'printArea' : 'safeArea';
    const w = Number(this.productForm.get(`${prefix}Width`)?.value) || 60;
    const h = Number(this.productForm.get(`${prefix}Height`)?.value) || 60;
    this.productForm.patchValue({
      [`${prefix}X`]: Math.max(0, Math.round((100 - w) / 2)),
      [`${prefix}Y`]: Math.max(0, Math.round((100 - h) / 2))
    });
  }

  fitSafeAreaToPrintArea(): void {
    const px = Number(this.productForm.get('printAreaX')?.value) ?? 20;
    const py = Number(this.productForm.get('printAreaY')?.value) ?? 20;
    const pw = Number(this.productForm.get('printAreaWidth')?.value) ?? 60;
    const ph = Number(this.productForm.get('printAreaHeight')?.value) ?? 60;
    this.productForm.patchValue({
      safeAreaX: Math.min(90, px + 4),
      safeAreaY: Math.min(90, py + 4),
      safeAreaWidth: Math.max(10, pw - 8),
      safeAreaHeight: Math.max(10, ph - 8)
    });
  }

  onBoxPointerDown(event: PointerEvent, target: 'PRINT' | 'SAFE'): void {
    event.preventDefault();
    event.stopPropagation();
    this.activeAreaMode.set(target);

    const el = event.currentTarget as HTMLElement;
    if (el && typeof el.setPointerCapture === 'function') {
      try { el.setPointerCapture(event.pointerId); } catch (_) {}
    }

    const container = el.closest('.admin-area-container') as HTMLElement;
    if (!container) return;

    const prefix = target === 'PRINT' ? 'printArea' : 'safeArea';
    this.dragOperation = {
      type: 'MOVE',
      target,
      startX: event.clientX,
      startY: event.clientY,
      initialX: Number(this.productForm.get(`${prefix}X`)?.value) ?? 20,
      initialY: Number(this.productForm.get(`${prefix}Y`)?.value) ?? 20,
      initialW: Number(this.productForm.get(`${prefix}Width`)?.value) ?? 60,
      initialH: Number(this.productForm.get(`${prefix}Height`)?.value) ?? 60,
      containerRect: container.getBoundingClientRect()
    };
  }

  onHandlePointerDown(event: PointerEvent, handle: string, target: 'PRINT' | 'SAFE'): void {
    event.preventDefault();
    event.stopPropagation();
    this.activeAreaMode.set(target);

    const el = event.currentTarget as HTMLElement;
    if (el && typeof el.setPointerCapture === 'function') {
      try { el.setPointerCapture(event.pointerId); } catch (_) {}
    }

    const container = el.closest('.admin-area-container') as HTMLElement;
    if (!container) return;

    const prefix = target === 'PRINT' ? 'printArea' : 'safeArea';
    this.dragOperation = {
      type: 'RESIZE',
      target,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      initialX: Number(this.productForm.get(`${prefix}X`)?.value) ?? 20,
      initialY: Number(this.productForm.get(`${prefix}Y`)?.value) ?? 20,
      initialW: Number(this.productForm.get(`${prefix}Width`)?.value) ?? 60,
      initialH: Number(this.productForm.get(`${prefix}Height`)?.value) ?? 60,
      containerRect: container.getBoundingClientRect()
    };
  }

  onAreaPointerMove(event: PointerEvent): void {
    if (!this.dragOperation) return;
    event.preventDefault();

    const { type, target, handle, startX, startY, initialX, initialY, initialW, initialH, containerRect } = this.dragOperation;
    if (containerRect.width === 0 || containerRect.height === 0) return;

    const deltaX = ((event.clientX - startX) / containerRect.width) * 100;
    const deltaY = ((event.clientY - startY) / containerRect.height) * 100;
    const prefix = target === 'PRINT' ? 'printArea' : 'safeArea';

    if (type === 'MOVE') {
      let newX = Math.round(initialX + deltaX);
      let newY = Math.round(initialY + deltaY);
      newX = Math.max(0, Math.min(100 - initialW, newX));
      newY = Math.max(0, Math.min(100 - initialH, newY));

      this.productForm.patchValue({
        [`${prefix}X`]: newX,
        [`${prefix}Y`]: newY
      });
    } else if (type === 'RESIZE' && handle) {
      let x = initialX;
      let y = initialY;
      let w = initialW;
      let h = initialH;

      if (handle.includes('e')) {
        w = Math.max(10, Math.min(100 - x, Math.round(initialW + deltaX)));
      }
      if (handle.includes('s')) {
        h = Math.max(10, Math.min(100 - y, Math.round(initialH + deltaY)));
      }
      if (handle.includes('w')) {
        const rawX = Math.round(initialX + deltaX);
        x = Math.max(0, Math.min(initialX + initialW - 10, rawX));
        w = initialW - (x - initialX);
      }
      if (handle.includes('n')) {
        const rawY = Math.round(initialY + deltaY);
        y = Math.max(0, Math.min(initialY + initialH - 10, rawY));
        h = initialH - (y - initialY);
      }

      this.productForm.patchValue({
        [`${prefix}X`]: x,
        [`${prefix}Y`]: y,
        [`${prefix}Width`]: w,
        [`${prefix}Height`]: h
      });
    }
  }

  onAreaPointerUp(event: PointerEvent): void {
    this.dragOperation = null;
  }

  onFileSelected(event: Event, targetControl: string) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.isUploading.set(true);
      this.adminService.uploadImage(file).subscribe({
        next: (res: any) => {
          this.isUploading.set(false);
          const uploadedUrl = res?.url || res?.data?.url || (typeof res === 'string' ? res : '');
          if (uploadedUrl) {
            this.productForm.patchValue({ [targetControl]: uploadedUrl });
          }
        },
        error: (err) => {
          this.isUploading.set(false);
          console.error('Lỗi tải ảnh:', err);
          alert('Không thể tải ảnh lên: ' + (err?.error?.message || err.message));
        }
      });
    }
  }

  initForm() {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      category: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      salePrice: [null],
      stock: [100, [Validators.required, Validators.min(0)]],
      sku: [''],
      imageUrl: ['https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600'],
      description: [''],
      isCustomizable: [false],
      customBaseFee: [30000],
      frontBlankImage: [''],
      backBlankImage: [''],
      backEngraveFee: [20000],
      photoPrintFee: [30000],
      maxTextLength: [35],
      printAreaX: [20],
      printAreaY: [20],
      printAreaWidth: [60],
      printAreaHeight: [60],
      safeAreaX: [26],
      safeAreaY: [25],
      safeAreaWidth: [48],
      safeAreaHeight: [50]
    });
  }

  saveProduct() {
    if (this.productForm.invalid) return;

    if (this.hasVariantMissingImage()) {
      const proceed = confirm('Cảnh báo: Có biến thể màu chưa có ảnh mockup riêng! Custom Studio bắt buộc cần ảnh mockup để hiển thị chuẩn xác khi khách đổi màu. Bạn có muốn tiếp tục lưu không?');
      if (!proceed) {
        this.modalTab.set('VARIANTS');
        return;
      }
    }

    this.isSaving.set(true);

    const val = this.productForm.value;
    const images = [val.imageUrl || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600'];
    if (val.backBlankImage && !images.includes(val.backBlankImage)) {
      images.push(val.backBlankImage);
    }

    // Auto-compute total stock from variants if defined
    const computedStock = this.variants().length > 0 ? this.totalVariantStock() : Number(val.stock);
    const supportedColors = this.variants().length > 0 
      ? this.variants().map(v => v.name) 
      : ['Navy Blue', 'Deep Slate', 'Sand Beige', 'Terracotta', 'Pure White', 'Emerald Green'];

    const payload: any = {
      name: val.name,
      category: val.category || (this.categories()[0]?._id),
      price: Number(val.price),
      salePrice: val.salePrice ? Number(val.salePrice) : undefined,
      stock: computedStock,
      sku: val.sku || ('SKU-' + Date.now().toString().slice(-6)),
      images,
      description: val.description || val.name,
      variants: this.variants(),
      isCustomizable: val.isCustomizable,
      customBaseFee: Number(val.customBaseFee) || 30000,
      customConfig: val.isCustomizable ? {
        frontBlankImage: val.frontBlankImage || images[0],
        backBlankImage: val.backBlankImage || '',
        backEngraveFee: Number(val.backEngraveFee) || 20000,
        photoPrintFee: Number(val.photoPrintFee) || 30000,
        maxTextLength: Number(val.maxTextLength) || 35,
        printArea: {
          x: Math.max(0, Math.min(90, Number(val.printAreaX) || 20)),
          y: Math.max(0, Math.min(90, Number(val.printAreaY) || 20)),
          width: Math.max(10, Math.min(100 - Math.max(0, Math.min(90, Number(val.printAreaX) || 20)), Number(val.printAreaWidth) || 60)),
          height: Math.max(10, Math.min(100 - Math.max(0, Math.min(90, Number(val.printAreaY) || 20)), Number(val.printAreaHeight) || 60))
        },
        safeArea: {
          x: Math.max(0, Math.min(90, Number(val.safeAreaX) || 26)),
          y: Math.max(0, Math.min(90, Number(val.safeAreaY) || 25)),
          width: Math.max(10, Math.min(100 - Math.max(0, Math.min(90, Number(val.safeAreaX) || 26)), Number(val.safeAreaWidth) || 48)),
          height: Math.max(10, Math.min(100 - Math.max(0, Math.min(90, Number(val.safeAreaY) || 25)), Number(val.safeAreaHeight) || 50))
        },
        supportedColors
      } : null,
      status: 'ACTIVE'
    };

    if (this.editingProduct()) {
      this.adminService.updateProduct(this.editingProduct()!._id, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isModalOpen.set(false);
          alert('Cập nhật phôi & sản phẩm thành công!');
          this.loadProducts();
        },
        error: (err: any) => {
          this.isSaving.set(false);
          alert('Lỗi cập nhật sản phẩm: ' + (err.error?.message || err.message));
        }
      });
    } else {
      this.adminService.createProduct(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isModalOpen.set(false);
          alert('Đã thêm mẫu quà vào Database thành công!');
          this.loadProducts();
        },
        error: (err: any) => {
          this.isSaving.set(false);
          alert('Lỗi thêm sản phẩm: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  deleteProduct(id: string) {
    if (confirm('Bạn có chắc muốn xóa món quà này khỏi Database?')) {
      this.adminService.deleteProduct(id).subscribe({
        next: () => {
          alert('Đã xóa sản phẩm khỏi Database thành công!');
          this.loadProducts();
        },
        error: (err: any) => {
          alert('Lỗi xóa sản phẩm: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  // Asset Modal Actions
  openAddAssetModal() {
    this.newAssetIcon = '🧸';
    this.newAssetName = '';
    this.newAssetCategory = 'Tình yêu';
    this.isAssetModalOpen.set(true);
  }

  saveAsset() {
    if (!this.newAssetIcon || !this.newAssetName) return;

    this.customStudioService.createAdminAsset({
      name: this.newAssetName.trim(),
      icon: this.newAssetIcon.trim(),
      type: 'STICKER',
      category: this.newAssetCategory,
      surcharge: 0,
      isActive: true
    }).subscribe({
      next: () => {
        alert('Đã thêm icon vào thư viện Custom Studio thành công!');
        this.isAssetModalOpen.set(false);
        this.loadStudioAssets();
      },
      error: err => alert('Lỗi thêm icon: ' + (err?.error?.message || err.message))
    });
  }

  deleteAsset(id: string) {
    if (confirm('Bạn có chắc muốn xóa icon này khỏi thư viện Custom Studio?')) {
      this.customStudioService.deleteAdminAsset(id).subscribe({
        next: () => {
          this.loadStudioAssets();
        },
        error: err => alert('Lỗi xóa icon: ' + (err?.error?.message || err.message))
      });
    }
  }
}
