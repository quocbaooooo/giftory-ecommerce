import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { Category } from '../../../core/models';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6 animate-fade-in pb-12">
      <!-- Toast Alert Notification -->
      @if (toastMessage()) {
        <div
          class="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-xs font-bold transition-all transform duration-300"
          [ngClass]="toastType() === 'success' ? 'bg-emerald-900 text-emerald-100 border-emerald-700' : 'bg-rose-900 text-rose-100 border-rose-700'"
        >
          <span class="material-symbols-outlined text-base">
            {{ toastType() === 'success' ? 'check_circle' : 'error' }}
          </span>
          <span>{{ toastMessage() }}</span>
        </div>
      }

      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-giftory-border/60 pb-6">
        <div>
          <span class="text-xs font-bold tracking-widest text-[#7C3AED] uppercase">Cấu Trúc Cửa Hàng & Phân Loại Quà</span>
          <h1 class="text-2xl md:text-3xl font-display font-black text-giftory-ink mt-1">Quản Lý Danh Mục Sản Phẩm</h1>
          <p class="text-xs text-giftory-ink/60 mt-1">
            Thiết lập biểu tượng, emoji, thứ tự ưu tiên và trạng thái hiển thị cho từng nhóm quà tặng
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            (click)="openCreateModal()"
            class="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span class="material-symbols-outlined text-base">add_circle</span>
            Thêm Danh Mục Mới
          </button>
        </div>
      </div>

      <!-- KPI Overview Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-3xl border border-giftory-border shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-giftory-ink/60">Tổng Danh Mục</span>
            <div class="w-8 h-8 rounded-xl bg-purple-100 text-[#7C3AED] flex items-center justify-center">
              <span class="material-symbols-outlined text-base">category</span>
            </div>
          </div>
          <div class="text-2xl font-black text-giftory-ink mt-2">{{ categories().length }}</div>
          <div class="text-[11px] text-giftory-ink/40 font-medium mt-0.5">Phân loại quà tặng</div>
        </div>

        <div class="bg-white p-5 rounded-3xl border border-giftory-border shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-giftory-ink/60">Đang Hoạt Động</span>
            <div class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <span class="material-symbols-outlined text-base">visibility</span>
            </div>
          </div>
          <div class="text-2xl font-black text-emerald-600 mt-2">{{ activeCount() }}</div>
          <div class="text-[11px] text-emerald-700/60 font-medium mt-0.5">Hiển thị cho khách hàng</div>
        </div>

        <div class="bg-white p-5 rounded-3xl border border-giftory-border shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-giftory-ink/60">Đang Tạm Ẩn</span>
            <div class="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <span class="material-symbols-outlined text-base">visibility_off</span>
            </div>
          </div>
          <div class="text-2xl font-black text-amber-600 mt-2">{{ inactiveCount() }}</div>
          <div class="text-[11px] text-amber-700/60 font-medium mt-0.5">Ẩn khỏi thanh điều hướng</div>
        </div>

        <div class="bg-white p-5 rounded-3xl border border-giftory-border shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-giftory-ink/60">Tổng Sản Phẩm</span>
            <div class="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <span class="material-symbols-outlined text-base">inventory_2</span>
            </div>
          </div>
          <div class="text-2xl font-black text-blue-600 mt-2">{{ totalProductsCount() }}</div>
          <div class="text-[11px] text-blue-700/60 font-medium mt-0.5">Món quà được phân loại</div>
        </div>
      </div>

      <!-- Main Category Table Section -->
      <div class="bg-white rounded-3xl p-6 border border-giftory-border shadow-xs space-y-4">
        <!-- Search & Filter Controls -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-giftory-border/40">
          <div class="flex items-center gap-2 flex-wrap">
            <button
              (click)="filterStatus.set('ALL')"
              class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
              [ngClass]="filterStatus() === 'ALL' ? 'bg-[#7C3AED] text-white shadow-xs' : 'bg-[#F4F0FA] text-giftory-ink/70 hover:bg-[#E9E3F5]'"
            >
              Tất cả ({{ categories().length }})
            </button>
            <button
              (click)="filterStatus.set('ACTIVE')"
              class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
              [ngClass]="filterStatus() === 'ACTIVE' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-[#F4F0FA] text-giftory-ink/70 hover:bg-[#E9E3F5]'"
            >
              Hoạt động ({{ activeCount() }})
            </button>
            <button
              (click)="filterStatus.set('INACTIVE')"
              class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
              [ngClass]="filterStatus() === 'INACTIVE' ? 'bg-amber-600 text-white shadow-xs' : 'bg-[#F4F0FA] text-giftory-ink/70 hover:bg-[#E9E3F5]'"
            >
              Tạm ẩn ({{ inactiveCount() }})
            </button>
          </div>

          <div class="flex items-center gap-3">
            <div class="relative max-w-xs w-full">
              <span class="material-symbols-outlined absolute left-3 top-2 text-giftory-ink/40 text-lg">search</span>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                placeholder="Tìm danh mục, slug, mô tả..."
                class="w-full pl-9 pr-4 py-1.5 bg-[#F4F0FA]/60 rounded-xl border border-giftory-border focus:outline-none focus:border-[#7C3AED] text-xs font-medium"
              />
            </div>

            <button
              (click)="loadCategories()"
              title="Tải lại danh sách"
              class="w-8 h-8 rounded-xl border border-giftory-border bg-white flex items-center justify-center text-giftory-ink/70 hover:text-[#7C3AED] hover:border-[#7C3AED] transition cursor-pointer"
            >
              <span class="material-symbols-outlined text-base" [class.animate-spin]="isLoading()">refresh</span>
            </button>
          </div>
        </div>

        <!-- Table View -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-giftory-border text-giftory-ink/50 font-bold uppercase tracking-wider">
                <th class="py-3 px-3 w-12 text-center">Thứ Tự</th>
                <th class="py-3 px-4">Tên & Biểu Tượng Danh Mục</th>
                <th class="py-3 px-4">Đường Dẫn (Slug)</th>
                <th class="py-3 px-4">Mô Tả Quà Tặng</th>
                <th class="py-3 px-3 text-center">Số Sản Phẩm</th>
                <th class="py-3 px-3 text-center">Trạng Thái</th>
                <th class="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-giftory-border/40">
              @if (isLoading()) {
                <tr>
                  <td colspan="7" class="py-12 text-center text-giftory-ink/50">
                    <div class="flex flex-col items-center justify-center gap-2">
                      <span class="material-symbols-outlined animate-spin text-2xl text-[#7C3AED]">progress_activity</span>
                      <span>Đang tải danh mục sản phẩm...</span>
                    </div>
                  </td>
                </tr>
              } @else if (filteredCategories().length === 0) {
                <tr>
                  <td colspan="7" class="py-12 text-center text-giftory-ink/50">
                    <div class="flex flex-col items-center justify-center gap-2">
                      <span class="material-symbols-outlined text-3xl text-giftory-ink/30">category</span>
                      <span>Không tìm thấy danh mục nào phù hợp</span>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (cat of filteredCategories(); track cat._id) {
                  <tr class="hover:bg-[#F4F0FA]/40 transition group">
                    <!-- Order number -->
                    <td class="py-3 px-3 text-center">
                      <span class="inline-block px-2 py-0.5 rounded-lg bg-slate-100 font-mono font-bold text-slate-700 text-[11px]">
                        {{ cat.order ?? 0 }}
                      </span>
                    </td>

                    <!-- Icon & Name & Image -->
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-3">
                        <div class="relative w-10 h-10 rounded-2xl bg-[#F4F0FA] border border-giftory-border/60 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                          @if (cat.imageUrl) {
                            <img [src]="cat.imageUrl" [alt]="cat.name" class="w-full h-full object-cover" />
                          } @else {
                            <span class="text-xl select-none">{{ cat.emoji || '🎁' }}</span>
                          }
                          <span class="absolute -bottom-1 -right-1 text-[11px] bg-white rounded-full px-0.5 border border-slate-200">
                            {{ cat.emoji || '🎁' }}
                          </span>
                        </div>
                        <div>
                          <div class="font-bold text-giftory-ink flex items-center gap-1.5">
                            <span>{{ cat.name }}</span>
                            @if (cat.icon) {
                              <span class="material-symbols-outlined text-[14px] text-[#7C3AED]" [title]="cat.icon">
                                {{ cat.icon }}
                              </span>
                            }
                          </div>
                          <span class="text-[10px] text-giftory-ink/40">ID: {{ cat._id }}</span>
                        </div>
                      </div>
                    </td>

                    <!-- Slug -->
                    <td class="py-3 px-4">
                      <span class="font-mono text-[11px] bg-slate-50 text-slate-600 px-2 py-1 rounded-lg border border-slate-200/60 block truncate max-w-[180px]">
                        /products?category={{ cat.slug }}
                      </span>
                    </td>

                    <!-- Description -->
                    <td class="py-3 px-4">
                      <p class="text-[11px] text-giftory-ink/70 line-clamp-2 max-w-xs" [title]="cat.description || 'Không có mô tả'">
                        {{ cat.description || '—' }}
                      </p>
                    </td>

                    <!-- Product Count -->
                    <td class="py-3 px-3 text-center">
                      <span
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                        [ngClass]="(cat.productCount ?? 0) > 0 ? 'bg-purple-100 text-[#7C3AED]' : 'bg-slate-100 text-slate-400'"
                      >
                        <span class="material-symbols-outlined text-[13px]">inventory_2</span>
                        {{ cat.productCount ?? 0 }} món
                      </span>
                    </td>

                    <!-- Status Toggle -->
                    <td class="py-3 px-3 text-center">
                      <button
                        (click)="toggleActive(cat)"
                        class="px-2.5 py-1 rounded-full text-[10px] font-bold transition flex items-center gap-1 mx-auto cursor-pointer"
                        [ngClass]="cat.isActive !== false ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'"
                      >
                        <span class="material-symbols-outlined text-[12px]">
                          {{ cat.isActive !== false ? 'check_circle' : 'do_not_disturb_on' }}
                        </span>
                        {{ cat.isActive !== false ? 'Hoạt động' : 'Tạm ẩn' }}
                      </button>
                    </td>

                    <!-- Actions -->
                    <td class="py-3 px-4 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <button
                          (click)="openEditModal(cat)"
                          title="Chỉnh sửa danh mục"
                          class="p-1.5 rounded-lg text-slate-600 hover:text-[#7C3AED] hover:bg-[#F4F0FA] transition cursor-pointer"
                        >
                          <span class="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button
                          (click)="confirmDelete(cat)"
                          title="Xóa danh mục"
                          class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <span class="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- ================= MODAL: CREATE / EDIT CATEGORY ================= -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div class="bg-white rounded-3xl max-w-xl w-full border border-giftory-border shadow-2xl overflow-hidden my-8 animate-scale-up">
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-giftory-border flex items-center justify-between bg-[#FAF7FC]">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[#7C3AED] text-xl">
                  {{ isEditMode() ? 'edit_note' : 'add_circle' }}
                </span>
                <h3 class="font-display font-black text-giftory-ink text-base">
                  {{ isEditMode() ? 'Chỉnh Sửa Danh Mục Quà Tặng' : 'Thêm Danh Mục Mới' }}
                </h3>
              </div>
              <button
                (click)="closeModal()"
                class="w-8 h-8 rounded-xl hover:bg-slate-200/60 flex items-center justify-center text-giftory-ink/60 transition cursor-pointer"
              >
                <span class="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <!-- Modal Body Form -->
            <form [formGroup]="categoryForm" (ngSubmit)="saveCategory()" class="p-6 space-y-5">
              <!-- Name & Slug -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="text-[11px] font-bold text-giftory-ink uppercase tracking-wider block">
                    Tên Danh Mục <span class="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    formControlName="name"
                    (input)="onNameChange()"
                    placeholder="VD: Bình Giữ Nhiệt & Cốc Sứ"
                    class="w-full px-3.5 py-2 rounded-xl border border-giftory-border focus:outline-none focus:border-[#7C3AED] text-xs font-semibold"
                  />
                  @if (categoryForm.get('name')?.invalid && categoryForm.get('name')?.touched) {
                    <span class="text-[10px] text-rose-500 font-medium">Vui lòng nhập tên danh mục</span>
                  }
                </div>

                <div class="space-y-1">
                  <div class="flex items-center justify-between">
                    <label class="text-[11px] font-bold text-giftory-ink uppercase tracking-wider">
                      Đường Dẫn Slug
                    </label>
                    <button
                      type="button"
                      (click)="autoGenerateSlug = !autoGenerateSlug"
                      class="text-[10px] text-[#7C3AED] font-bold hover:underline cursor-pointer"
                    >
                      {{ autoGenerateSlug ? 'Khóa tự động' : 'Tự động theo tên' }}
                    </button>
                  </div>
                  <input
                    type="text"
                    formControlName="slug"
                    [readonly]="autoGenerateSlug"
                    placeholder="VD: binh-giu-nhiet-coc-su"
                    class="w-full px-3.5 py-2 rounded-xl border border-giftory-border focus:outline-none focus:border-[#7C3AED] text-xs font-mono"
                    [ngClass]="autoGenerateSlug ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'"
                  />
                </div>
              </div>

              <!-- Emoji & Icon & Order -->
              <div class="grid grid-cols-3 gap-3">
                <div class="space-y-1">
                  <label class="text-[11px] font-bold text-giftory-ink uppercase tracking-wider block">
                    Emoji Quà
                  </label>
                  <div class="relative">
                    <input
                      type="text"
                      formControlName="emoji"
                      placeholder="🎁"
                      maxlength="4"
                      class="w-full text-center py-2 rounded-xl border border-giftory-border focus:outline-none focus:border-[#7C3AED] text-base"
                    />
                  </div>
                </div>

                <div class="space-y-1">
                  <label class="text-[11px] font-bold text-giftory-ink uppercase tracking-wider block">
                    Material Icon
                  </label>
                  <div class="relative flex items-center">
                    <input
                      type="text"
                      formControlName="icon"
                      placeholder="local_cafe"
                      class="w-full pl-3 pr-8 py-2 rounded-xl border border-giftory-border focus:outline-none focus:border-[#7C3AED] text-xs font-mono"
                    />
                    <span class="material-symbols-outlined absolute right-2 text-sm text-[#7C3AED]">
                      {{ categoryForm.get('icon')?.value || 'category' }}
                    </span>
                  </div>
                </div>

                <div class="space-y-1">
                  <label class="text-[11px] font-bold text-giftory-ink uppercase tracking-wider block">
                    Thứ Tự (Order)
                  </label>
                  <input
                    type="number"
                    formControlName="order"
                    min="0"
                    placeholder="0"
                    class="w-full px-3 py-2 rounded-xl border border-giftory-border focus:outline-none focus:border-[#7C3AED] text-xs font-bold text-center"
                  />
                </div>
              </div>

              <!-- Quick Emoji Pickers -->
              <div class="space-y-1.5 bg-[#FAF7FC] p-3 rounded-2xl border border-giftory-border/50">
                <span class="text-[10px] font-bold text-giftory-ink/60 uppercase tracking-wider block">
                  Gợi Ý Nhanh Biểu Tượng & Icon Quà Tặng:
                </span>
                <div class="flex items-center gap-1.5 flex-wrap">
                  @for (preset of presetIcons; track preset.emoji) {
                    <button
                      type="button"
                      (click)="applyPreset(preset)"
                      class="px-2 py-1 rounded-lg bg-white border border-giftory-border text-xs flex items-center gap-1 hover:border-[#7C3AED] hover:bg-purple-50 transition cursor-pointer"
                    >
                      <span>{{ preset.emoji }}</span>
                      <span class="text-[10px] text-giftory-ink/70">{{ preset.label }}</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Description -->
              <div class="space-y-1">
                <label class="text-[11px] font-bold text-giftory-ink uppercase tracking-wider block">
                  Mô Tả Danh Mục
                </label>
                <textarea
                  formControlName="description"
                  rows="2"
                  placeholder="Mô tả phong cách quà tặng và thông điệp gửi gắm..."
                  class="w-full px-3.5 py-2 rounded-xl border border-giftory-border focus:outline-none focus:border-[#7C3AED] text-xs resize-none"
                ></textarea>
              </div>

              <!-- Image URL & Upload -->
              <div class="space-y-1">
                <label class="text-[11px] font-bold text-giftory-ink uppercase tracking-wider block">
                  Ảnh Đại Diện Danh Mục
                </label>
                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    formControlName="imageUrl"
                    placeholder="https://... hoặc tải ảnh từ máy tính"
                    class="flex-1 px-3.5 py-2 rounded-xl border border-giftory-border focus:outline-none focus:border-[#7C3AED] text-xs"
                  />
                  <label class="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0">
                    <span class="material-symbols-outlined text-sm">upload</span>
                    <span>Tải ảnh</span>
                    <input type="file" (change)="onUploadImage($event)" accept="image/*" class="hidden" />
                  </label>
                </div>
                @if (isUploadingImage()) {
                  <div class="flex items-center gap-2 text-[10px] text-[#7C3AED] font-bold mt-1">
                    <span class="material-symbols-outlined animate-spin text-xs">progress_activity</span>
                    <span>Đang tải ảnh lên Cloudinary...</span>
                  </div>
                }
              </div>

              <!-- Active Status Switch -->
              <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span class="text-xs font-bold text-giftory-ink block">Kích Hoạt Danh Mục</span>
                  <span class="text-[10px] text-giftory-ink/50">Cho phép hiển thị trên thanh tìm kiếm và trang sản phẩm</span>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" formControlName="isActive" class="sr-only peer" />
                  <div class="w-10 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7C3AED]"></div>
                </label>
              </div>

              <!-- Live Preview Card -->
              <div class="border border-dashed border-[#7C3AED]/40 rounded-2xl p-3 bg-purple-50/40">
                <span class="text-[10px] font-bold text-[#7C3AED] uppercase tracking-wider block mb-2">
                  Xem Trước (Live Preview):
                </span>
                <div class="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white border border-giftory-border shadow-xs">
                  <div class="w-8 h-8 rounded-xl bg-[#F4F0FA] flex items-center justify-center text-lg overflow-hidden shrink-0">
                    @if (categoryForm.get('imageUrl')?.value) {
                      <img [src]="categoryForm.get('imageUrl')?.value" alt="Preview" class="w-full h-full object-cover" />
                    } @else {
                      {{ categoryForm.get('emoji')?.value || '🎁' }}
                    }
                  </div>
                  <div>
                    <div class="text-xs font-bold text-giftory-ink flex items-center gap-1">
                      <span>{{ categoryForm.get('name')?.value || 'Tên Danh Mục Quà Tặng' }}</span>
                      <span class="material-symbols-outlined text-[13px] text-[#7C3AED]">
                        {{ categoryForm.get('icon')?.value || 'category' }}
                      </span>
                    </div>
                    <span class="text-[10px] text-giftory-ink/50 font-mono">
                      /products?category={{ categoryForm.get('slug')?.value || 'slug-danh-muc' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Form Actions -->
              <div class="flex items-center justify-end gap-3 pt-4 border-t border-giftory-border">
                <button
                  type="button"
                  (click)="closeModal()"
                  class="px-4 py-2 rounded-xl text-xs font-bold text-giftory-ink/70 hover:bg-slate-100 transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  [disabled]="categoryForm.invalid || isSaving()"
                  class="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer"
                >
                  @if (isSaving()) {
                    <span class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                    <span>Đang lưu...</span>
                  } @else {
                    <span class="material-symbols-outlined text-sm">check</span>
                    <span>{{ isEditMode() ? 'Lưu Thay Đổi' : 'Tạo Danh Mục' }}</span>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ================= MODAL: DELETE CONFIRMATION ================= -->
      @if (deletingCategory()) {
        <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-white rounded-3xl max-w-md w-full border border-giftory-border shadow-2xl p-6 space-y-4 animate-scale-up">
            <div class="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <span class="material-symbols-outlined text-2xl">warning</span>
            </div>

            <div class="text-center space-y-1">
              <h3 class="font-display font-black text-giftory-ink text-base">
                Xác Nhận Xóa Danh Mục?
              </h3>
              <p class="text-xs text-giftory-ink/70">
                Bạn có chắc chắn muốn xóa danh mục
                <strong class="text-giftory-ink">"{{ deletingCategory()?.name }}"</strong>?
              </p>
            </div>

            @if ((deletingCategory()?.productCount ?? 0) > 0) {
              <div class="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                <div class="font-bold flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-sm text-amber-600">report_problem</span>
                  Cảnh báo an toàn dữ liệu
                </div>
                <p class="text-[11px] leading-relaxed">
                  Danh mục này hiện đang có <strong>{{ deletingCategory()?.productCount }}</strong> sản phẩm liên kết.
                  Bạn nên chuyển các sản phẩm sang danh mục khác trước khi xóa, hoặc bật tùy chọn xóa cưỡng bức.
                </p>
                <label class="flex items-center gap-2 pt-1 font-bold text-[11px] text-rose-700 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="forceDelete" class="rounded text-rose-600 focus:ring-0" />
                  <span>Tôi hiểu và vẫn muốn xóa cưỡng bức danh mục này</span>
                </label>
              </div>
            }

            <div class="flex items-center justify-end gap-3 pt-3">
              <button
                (click)="cancelDelete()"
                class="px-4 py-2 rounded-xl text-xs font-bold text-giftory-ink/70 hover:bg-slate-100 transition cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                (click)="executeDelete()"
                [disabled]="isDeleting() || ((deletingCategory()?.productCount ?? 0) > 0 && !forceDelete)"
                class="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                @if (isDeleting()) {
                  <span class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  <span>Đang xóa...</span>
                } @else {
                  <span class="material-symbols-outlined text-sm">delete_forever</span>
                  <span>Xóa Ngay</span>
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AdminCategoriesComponent implements OnInit {
  private adminService = inject(AdminService);
  private fb = inject(FormBuilder);

  categories = signal<Category[]>([]);
  isLoading = signal(true);
  isSaving = signal(false);
  isDeleting = signal(false);
  isUploadingImage = signal(false);

  searchQuery = '';
  filterStatus = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State
  showModal = signal(false);
  isEditMode = signal(false);
  editingId: string | null = null;
  autoGenerateSlug = true;

  // Delete State
  deletingCategory = signal<Category | null>(null);
  forceDelete = false;

  // Toast feedback
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error'>('success');

  // Preset suggestions for emojis and Material icons
  presetIcons = [
    { emoji: '☕', icon: 'local_cafe', label: 'Cốc Sứ / Bình Giữ Nhiệt' },
    { emoji: '✒️', icon: 'edit_note', label: 'Bút Ký / Sổ Da' },
    { emoji: '🕯️', icon: 'spa', label: 'Nến Thơm / Spa' },
    { emoji: '🐰', icon: 'key', label: 'Móc Khóa / Gỗ' },
    { emoji: '👕', icon: 'apparel', label: 'Áo Thun / Vải' },
    { emoji: '🎁', icon: 'featured_seasonal_and_gifts', label: 'Set Quà Tặng' },
    { emoji: '🌸', icon: 'local_florist', label: 'Hoa & Thiệp' },
    { emoji: '🍫', icon: 'cookie', label: 'Bánh Kẹo & Socola' },
    { emoji: '🎨', icon: 'palette', label: 'Custom Tự Thiết Kế' },
  ];

  categoryForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    slug: [''],
    emoji: ['🎁'],
    icon: ['category'],
    description: [''],
    imageUrl: [''],
    order: [0],
    isActive: [true],
  });

  // Computed metrics
  activeCount = computed(() => this.categories().filter(c => c.isActive !== false).length);
  inactiveCount = computed(() => this.categories().filter(c => c.isActive === false).length);
  totalProductsCount = computed(() =>
    this.categories().reduce((sum, c) => sum + (c.productCount ?? 0), 0)
  );

  filteredCategories = computed(() => {
    let list = this.categories();

    // Filter by status
    if (this.filterStatus() === 'ACTIVE') {
      list = list.filter(c => c.isActive !== false);
    } else if (this.filterStatus() === 'INACTIVE') {
      list = list.filter(c => c.isActive === false);
    }

    // Filter by search query
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
      );
    }

    return list;
  });

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.isLoading.set(true);
    this.adminService.getAdminCategories().subscribe({
      next: (data) => {
        this.categories.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showToast(err.error?.message || 'Không thể tải danh sách danh mục', 'error');
      }
    });
  }

  // Open Create Modal
  openCreateModal() {
    this.isEditMode.set(false);
    this.editingId = null;
    this.autoGenerateSlug = true;
    this.categoryForm.reset({
      name: '',
      slug: '',
      emoji: '🎁',
      icon: 'category',
      description: '',
      imageUrl: '',
      order: this.categories().length,
      isActive: true,
    });
    this.showModal.set(true);
  }

  // Open Edit Modal
  openEditModal(cat: Category) {
    this.isEditMode.set(true);
    this.editingId = cat._id;
    this.autoGenerateSlug = false;
    this.categoryForm.patchValue({
      name: cat.name,
      slug: cat.slug,
      emoji: cat.emoji || '🎁',
      icon: cat.icon || 'category',
      description: cat.description || '',
      imageUrl: cat.imageUrl || '',
      order: cat.order ?? 0,
      isActive: cat.isActive !== false,
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.isEditMode.set(false);
    this.editingId = null;
  }

  // Auto generate slug from name
  onNameChange() {
    if (this.autoGenerateSlug) {
      const name = this.categoryForm.get('name')?.value || '';
      const slug = this.slugify(name);
      this.categoryForm.patchValue({ slug }, { emitEvent: false });
    }
  }

  applyPreset(preset: { emoji: string; icon: string; label: string }) {
    this.categoryForm.patchValue({
      emoji: preset.emoji,
      icon: preset.icon,
    });
  }

  onUploadImage(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.isUploadingImage.set(true);
    this.adminService.uploadImage(file).subscribe({
      next: (res) => {
        this.isUploadingImage.set(false);
        if (res?.url) {
          this.categoryForm.patchValue({ imageUrl: res.url });
          this.showToast('Tải ảnh danh mục lên thành công!', 'success');
        }
      },
      error: (err) => {
        this.isUploadingImage.set(false);
        this.showToast(err.error?.message || 'Không thể tải ảnh lên', 'error');
      }
    });
  }

  saveCategory() {
    if (this.categoryForm.invalid) return;

    this.isSaving.set(true);
    const formValue = this.categoryForm.value;

    if (this.isEditMode() && this.editingId) {
      this.adminService.updateCategory(this.editingId, formValue).subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.closeModal();
          this.showToast(`Đã cập nhật danh mục "${formValue.name}"`, 'success');
          this.loadCategories();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.showToast(err.error?.message || 'Không thể cập nhật danh mục', 'error');
        }
      });
    } else {
      this.adminService.createCategory(formValue).subscribe({
        next: (created) => {
          this.isSaving.set(false);
          this.closeModal();
          this.showToast(`Đã thêm danh mục mới "${formValue.name}"`, 'success');
          this.loadCategories();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.showToast(err.error?.message || 'Không thể tạo danh mục mới', 'error');
        }
      });
    }
  }

  toggleActive(cat: Category) {
    this.adminService.toggleCategoryStatus(cat._id).subscribe({
      next: (updated) => {
        const nextStatus = updated.isActive;
        this.categories.update(list =>
          list.map(c => c._id === cat._id ? { ...c, isActive: nextStatus } : c)
        );
        this.showToast(
          `Đã ${nextStatus ? 'kích hoạt' : 'tạm ẩn'} danh mục "${cat.name}"`,
          'success'
        );
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Không thể thay đổi trạng thái', 'error');
      }
    });
  }

  confirmDelete(cat: Category) {
    this.deletingCategory.set(cat);
    this.forceDelete = false;
  }

  cancelDelete() {
    this.deletingCategory.set(null);
    this.forceDelete = false;
  }

  executeDelete() {
    const cat = this.deletingCategory();
    if (!cat) return;

    this.isDeleting.set(true);
    this.adminService.deleteCategory(cat._id, this.forceDelete).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.cancelDelete();
        this.showToast(`Đã xóa danh mục "${cat.name}" thành công`, 'success');
        this.loadCategories();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.showToast(err.error?.message || 'Không thể xóa danh mục này', 'error');
      }
    });
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private showToast(message: string, type: 'success' | 'error' = 'success') {
    this.toastMessage.set(message);
    this.toastType.set(type);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }
}
