import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ProductService } from '../../../core/services/product.service';
import { ApiService } from '../../../core/services/api.service';
import { Product, Category } from '../../../core/models';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="space-y-8 animate-fade-in">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-giftory-border/60 pb-6">
        <div>
          <span class="text-xs font-bold tracking-widest text-[#7C3AED] uppercase">Quản Trị Kho Quà</span>
          <h1 class="text-2xl md:text-3xl font-display font-black text-giftory-ink mt-1">Danh Mục & Sản Phẩm Quà Tặng</h1>
          <p class="text-xs text-giftory-ink/60 mt-1">Cấu hình mẫu quà, gắn cờ Bespoke (yêu cầu cọc 50%) và quản lý giá bán</p>
        </div>

        <button
          (click)="openCreateModal()"
          class="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl transition shadow-md flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <span class="material-symbols-outlined text-base">add</span>
          Thêm Sản Phẩm Mới
        </button>
      </div>

      <!-- Products Data Table -->
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
                <th class="py-3 px-4">Kho</th>
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
                      <span class="font-bold text-giftory-ink block line-clamp-1 max-w-[280px]">{{ p.name }}</span>
                      <span class="text-[10px] text-giftory-ink/50 font-mono">SKU: {{ p.sku || 'N/A' }}</span>
                    </div>
                  </div>
                </td>
                <td class="py-3 px-4 font-medium text-giftory-ink/80">{{ p.category?.name || 'Quà Cao Cấp' }}</td>
                <td class="py-3 px-4">
                  <span class="font-bold font-mono text-giftory-ink">{{ (p.salePrice || p.price) | number }} đ</span>
                  <span *ngIf="p.salePrice" class="text-[10px] text-giftory-ink/40 line-through block">{{ p.price | number }} đ</span>
                </td>
                <td class="py-3 px-4 font-mono font-semibold">{{ p.stock }}</td>
                <td class="py-3 px-4">
                  <span *ngIf="p.isCustomizable" class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold text-[10px] flex items-center gap-1 w-max">
                    <span class="material-symbols-outlined text-xs">brush</span>
                    Bespoke
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
                  <button (click)="openEditModal(p)" class="text-[#7C3AED] hover:underline font-bold text-xs cursor-pointer">Sửa</button>
                  <button (click)="deleteProduct(p._id)" class="text-rose-500 hover:underline font-bold text-xs cursor-pointer">Xóa</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Create / Edit Product Modal -->
      <div *ngIf="isModalOpen()" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full border border-giftory-border shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-fade-in">
          <div class="flex items-center justify-between border-b border-giftory-border/40 pb-4">
            <h3 class="text-lg font-bold text-giftory-ink">
              {{ editingProduct() ? 'Cập Nhật Mẫu Quà' : 'Thêm Mẫu Quà Tặng Mới Vào Database' }}
            </h3>
            <button (click)="isModalOpen.set(false)" class="text-giftory-ink/50 hover:text-giftory-ink cursor-pointer">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <form [formGroup]="productForm" (ngSubmit)="saveProduct()" class="space-y-4">
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-giftory-ink">Tên món quà *</label>
              <input type="text" formControlName="name" placeholder="VD: Hộp Quà Trà Hoa Dưỡng Nhan..." class="w-full px-4 py-2 bg-[#F3EBF9]/50 rounded-xl border border-giftory-border text-sm font-medium focus:outline-none focus:border-[#7C3AED]" />
            </div>

            <!-- Category Dropdown Select -->
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-giftory-ink">Danh mục quà tặng *</label>
              <select formControlName="category" class="w-full px-4 py-2 bg-[#F3EBF9]/50 rounded-xl border border-giftory-border text-sm font-medium focus:outline-none focus:border-[#7C3AED]">
                <option value="">-- Chọn danh mục quà --</option>
                <option *ngFor="let cat of categories()" [value]="cat._id">{{ cat.name }}</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-xs font-bold text-giftory-ink">Giá gốc (đ) *</label>
                <input type="number" formControlName="price" placeholder="350000" class="w-full px-4 py-2 bg-[#F3EBF9]/50 rounded-xl border border-giftory-border text-sm font-medium focus:outline-none focus:border-[#7C3AED]" />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-bold text-giftory-ink">Giá khuyến mãi (đ)</label>
                <input type="number" formControlName="salePrice" placeholder="290000" class="w-full px-4 py-2 bg-[#F3EBF9]/50 rounded-xl border border-giftory-border text-sm font-medium focus:outline-none focus:border-[#7C3AED]" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-xs font-bold text-giftory-ink">Số lượng tồn kho *</label>
                <input type="number" formControlName="stock" class="w-full px-4 py-2 bg-[#F3EBF9]/50 rounded-xl border border-giftory-border text-sm font-medium focus:outline-none focus:border-[#7C3AED]" />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-bold text-giftory-ink">Mã SKU</label>
                <input type="text" formControlName="sku" placeholder="GFT-PROD-01" class="w-full px-4 py-2 bg-[#F3EBF9]/50 rounded-xl border border-giftory-border text-sm font-medium focus:outline-none focus:border-[#7C3AED]" />
              </div>
            </div>

            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-giftory-ink">Ảnh sản phẩm (Cloudinary / CDN)</label>
                <label class="cursor-pointer text-[11px] font-bold text-[#7C3AED] hover:underline flex items-center gap-1 bg-[#7C3AED]/10 px-2 py-0.5 rounded-lg transition-all">
                  <span class="material-symbols-outlined text-[14px]">cloud_upload</span>
                  <span>{{ isUploading() ? 'Đang tải lên...' : 'Tải ảnh từ máy' }}</span>
                  <input type="file" accept="image/*" (change)="onFileSelected($event)" class="hidden" [disabled]="isUploading()" />
                </label>
              </div>
              <div class="flex gap-2 items-center">
                <input type="text" formControlName="imageUrl" placeholder="https://images.unsplash.com/... hoặc tải ảnh lên" class="flex-1 px-4 py-2 bg-[#F3EBF9]/50 rounded-xl border border-giftory-border text-sm font-medium focus:outline-none focus:border-[#7C3AED]" />
                @if (productForm.get('imageUrl')?.value) {
                  <img [src]="productForm.get('imageUrl')?.value" alt="Preview" class="w-10 h-10 rounded-xl object-cover border border-giftory-border shadow-sm shrink-0" />
                }
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-bold text-giftory-ink">Mô tả sản phẩm</label>
              <textarea rows="3" formControlName="description" placeholder="Mô tả chất liệu, quy cách quà tặng..." class="w-full px-4 py-2 bg-[#F3EBF9]/50 rounded-xl border border-giftory-border text-sm font-medium focus:outline-none focus:border-[#7C3AED]"></textarea>
            </div>

            <!-- Bespoke Toggle Switch -->
            <div class="p-4 bg-[#F3EBF9]/60 rounded-2xl border border-giftory-border flex items-center justify-between">
              <div>
                <span class="text-xs font-bold text-giftory-ink block">Hỗ Trợ Tùy Biến Bespoke (BR-PAY05)</span>
                <span class="text-[11px] text-giftory-ink/60">Cho phép khách khắc tên laser, phối màu tại Custom Studio và bắt buộc cọc 50%</span>
              </div>
              <input type="checkbox" formControlName="isCustomizable" class="w-5 h-5 accent-[#7C3AED] rounded cursor-pointer" />
            </div>

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
                {{ isSaving() ? 'Đang Đẩy Vào Database...' : (editingProduct() ? 'Cập Nhật Sản Phẩm' : 'Đẩy Sản Phẩm Vào Database') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class AdminProductsComponent implements OnInit {
  private productService = inject(ProductService);
  private adminService = inject(AdminService);
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  searchQuery = '';
  isModalOpen = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isUploading = signal<boolean>(false);
  editingProduct = signal<Product | null>(null);

  productForm!: FormGroup;

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
    this.initForm();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.isUploading.set(true);
      this.adminService.uploadImage(file).subscribe({
        next: (res: any) => {
          this.isUploading.set(false);
          const uploadedUrl = res?.url || res?.data?.url || (typeof res === 'string' ? res : '');
          if (uploadedUrl) {
            this.productForm.patchValue({ imageUrl: uploadedUrl });
          }
        },
        error: (err) => {
          this.isUploading.set(false);
          console.error('Lỗi tải ảnh:', err);
          alert('Không thể tải ảnh lên Cloudinary: ' + (err?.error?.message || err.message));
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
      isCustomizable: [false]
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
    this.initForm();
    if (this.categories().length > 0) {
      this.productForm.patchValue({ category: this.categories()[0]._id });
    }
    this.isModalOpen.set(true);
  }

  openEditModal(p: Product) {
    this.editingProduct.set(p);
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
      isCustomizable: p.isCustomizable
    });
    this.isModalOpen.set(true);
  }

  saveProduct() {
    if (this.productForm.invalid) return;
    this.isSaving.set(true);

    const val = this.productForm.value;
    const payload = {
      name: val.name,
      category: val.category || (this.categories()[0]?._id),
      price: Number(val.price),
      salePrice: val.salePrice ? Number(val.salePrice) : undefined,
      stock: Number(val.stock),
      sku: val.sku || ('SKU-' + Date.now().toString().slice(-6)),
      images: [val.imageUrl || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600'],
      description: val.description || val.name,
      isCustomizable: val.isCustomizable,
      status: 'ACTIVE'
    };

    if (this.editingProduct()) {
      // Call backend API PATCH
      this.adminService.updateProduct(this.editingProduct()!._id, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isModalOpen.set(false);
          alert('Cập nhật sản phẩm trong MongoDB thành công!');
          this.loadProducts();
        },
        error: (err: any) => {
          this.isSaving.set(false);
          alert('Lỗi cập nhật sản phẩm: ' + (err.error?.message || err.message));
        }
      });
    } else {
      // Call backend API POST
      this.adminService.createProduct(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isModalOpen.set(false);
          alert('Đã thêm sản phẩm thành công vào Database MongoDB!');
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
}
