import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { ProductService } from '../../core/services/product.service';
import { Product, Category } from '../../core/models';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ProductCardComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 md:px-8 py-8">
      <!-- Breadcrumb & Header -->
      <div class="mb-6">
        <div class="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <a routerLink="/" class="hover:text-[#7C3AED]">Trang chủ</a>
          <span>/</span>
          <span class="text-[#1E1B4B] font-semibold">Tất cả sản phẩm quà tặng</span>
        </div>
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold text-[#1E1B4B]">Bộ Sưu Tập Quà Tặng Giftory</h1>
            <p class="text-xs md:text-sm text-slate-500 mt-1">Khám phá các sản phẩm có sẵn và phôi quà cá nhân hóa theo yêu cầu</p>
          </div>

          <!-- Sort dropdown -->
          <div class="flex items-center gap-3 self-end md:self-auto">
            <span class="text-xs text-slate-500">Sắp xếp:</span>
            <select 
              [(ngModel)]="selectedSort" 
              (change)="onFilterChange()"
              class="px-3 py-2 rounded-xl bg-white border border-[#DDD6FE] text-xs font-semibold text-[#1E1B4B] focus:outline-none focus:border-[#7C3AED]"
            >
              <option value="latest">Mới nhất</option>
              <option value="popular">Bán chạy nhất</option>
              <option value="price_asc">Giá: Thấp đến Cao</option>
              <option value="price_desc">Giá: Cao đến Thấp</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Category Filter Tabs -->
      <div class="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
        <button 
          (click)="selectCategory('')"
          class="px-4 py-2 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer"
          [ngClass]="!selectedCategory ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-300' : 'bg-white text-slate-700 border border-[#DDD6FE] hover:bg-purple-50'"
        >
          Tất cả danh mục
        </button>
        @for (cat of categories(); track cat._id) {
          <button 
            (click)="selectCategory(cat.slug)"
            class="px-4 py-2 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
            [ngClass]="selectedCategory === cat.slug ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-300' : 'bg-white text-slate-700 border border-[#DDD6FE] hover:bg-purple-50'"
          >
            <span>{{ cat.emoji }}</span>
            <span>{{ cat.name }}</span>
          </button>
        }
      </div>

      <!-- Quick Toggles -->
      <div class="flex items-center gap-3 mb-8 flex-wrap">
        <label class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#DDD6FE] cursor-pointer text-xs font-semibold select-none hover:border-purple-300">
          <input 
            type="checkbox" 
            [(ngModel)]="filterBespoke" 
            (change)="onFilterChange()"
            class="w-4 h-4 rounded text-[#7C3AED] focus:ring-[#7C3AED] accent-[#7C3AED]"
          >
          <span class="text-emerald-700 font-bold flex items-center gap-1">
            <span class="material-symbols-outlined text-[15px]">palette</span>
            Chỉ sản phẩm Custom cọc 50%
          </span>
        </label>

        <label class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#DDD6FE] cursor-pointer text-xs font-semibold select-none hover:border-purple-300">
          <input 
            type="checkbox" 
            [(ngModel)]="filterFlashSale" 
            (change)="onFilterChange()"
            class="w-4 h-4 rounded text-[#7C3AED] focus:ring-[#7C3AED] accent-[#7C3AED]"
          >
          <span class="text-[#F43F5E] font-bold flex items-center gap-1">
            <span class="material-symbols-outlined text-[15px]">bolt</span>
            Đang Flash Sale
          </span>
        </label>
      </div>

      <!-- Products Grid -->
      @if (loading()) {
        <div class="py-20 flex flex-col items-center justify-center gap-3">
          <div class="w-10 h-10 border-4 border-purple-200 border-t-[#7C3AED] rounded-full animate-spin"></div>
          <span class="text-xs text-slate-500">Đang tải sản phẩm Giftory...</span>
        </div>
      } @else if (products().length === 0) {
        <div class="py-20 bg-white rounded-3xl p-8 text-center border border-[#DDD6FE]">
          <span class="material-symbols-outlined text-5xl text-slate-300 mb-2">search_off</span>
          <h3 class="font-bold text-base text-[#1E1B4B]">Không tìm thấy món quà phù hợp</h3>
          <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Vui lòng thử tìm với từ khóa khác hoặc bỏ bớt các bộ lọc đang chọn.</p>
          <button (click)="resetFilters()" class="mt-4 px-4 py-2 bg-[#7C3AED] text-white text-xs font-semibold rounded-xl">Xóa bộ lọc</button>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          @for (prod of products(); track prod._id) {
            <app-product-card [product]="prod"></app-product-card>
          }
        </div>
      }
    </div>
  `
})
export class ProductsComponent implements OnInit {
  private productService = inject(ProductService);
  private route = inject(ActivatedRoute);

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  loading = signal<boolean>(true);

  selectedCategory: string = '';
  selectedSort: string = 'latest';
  filterBespoke: boolean = false;
  filterFlashSale: boolean = false;
  searchKeyword: string = '';

  ngOnInit(): void {
    this.productService.getCategories().subscribe(cats => this.categories.set(cats));

    this.route.queryParams.subscribe(params => {
      if (params['category']) this.selectedCategory = params['category'];
      if (params['search']) this.searchKeyword = params['search'];
      if (params['customizable'] === 'true') this.filterBespoke = true;
      if (params['flashSale'] === 'true') this.filterFlashSale = true;
      this.loadProducts();
    });
  }

  loadProducts(): void {
    this.loading.set(true);
    const query: any = {
      sort: this.selectedSort,
      limit: 24
    };

    if (this.selectedCategory) query.category = this.selectedCategory;
    if (this.searchKeyword) query.search = this.searchKeyword;
    if (this.filterBespoke) query.isCustomizable = 'true';
    if (this.filterFlashSale) query.isFlashSale = 'true';

    this.productService.getProducts(query).subscribe({
      next: res => {
        this.products.set(res.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  selectCategory(slug: string): void {
    this.selectedCategory = slug;
    this.loadProducts();
  }

  onFilterChange(): void {
    this.loadProducts();
  }

  resetFilters(): void {
    this.selectedCategory = '';
    this.filterBespoke = false;
    this.filterFlashSale = false;
    this.searchKeyword = '';
    this.selectedSort = 'latest';
    this.loadProducts();
  }
}
