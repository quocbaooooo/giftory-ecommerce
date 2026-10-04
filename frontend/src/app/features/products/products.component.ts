import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { ProductService } from '../../core/services/product.service';
import { AiChatbotService } from '../../core/services/ai-chatbot.service';
import { Product, Category } from '../../core/models';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ProductCardComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 md:px-8 py-6">
      <!-- Breadcrumb & Header -->
      <div class="mb-6">
        <div class="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <a routerLink="/" class="hover:text-[#7C3AED] transition-colors">Trang chủ</a>
          <span>/</span>
          <span class="text-[#1E1B4B] font-semibold">Tất cả sản phẩm quà tặng</span>
        </div>
        
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-2xl md:text-3xl font-extrabold text-[#1E1B4B] tracking-tight">
              Bộ Sưu Tập Quà Tặng Giftory
            </h1>
            <p class="text-xs md:text-sm text-slate-500 mt-1">
              Khám phá quà tặng chế tác theo yêu cầu, khắc laser cá nhân hóa và các set quà độc bản
            </p>
          </div>

          <!-- Total count & Sort Dropdown -->
          <div class="flex items-center gap-3 self-end md:self-auto flex-wrap">
            <span class="text-xs font-medium text-slate-500">
              Tìm thấy <strong class="text-[#7C3AED]">{{ total() }}</strong> sản phẩm
            </span>
            <div class="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#DDD6FE] shadow-2xs">
              <span class="material-symbols-outlined text-[16px] text-[#7C3AED]">sort</span>
              <select 
                [(ngModel)]="selectedSort" 
                (change)="onFilterChange(true)"
                class="bg-transparent border-none text-xs font-semibold text-[#1E1B4B] focus:outline-none cursor-pointer"
              >
                <option value="popular">Bán chạy nhất</option>
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá: Thấp đến Cao</option>
                <option value="price_desc">Giá: Cao đến Thấp</option>
                <option value="rating">Đánh giá cao nhất</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Category Filter Tabs -->
      <div class="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
        <button 
          (click)="selectCategory('')"
          class="px-4 py-2 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
          [ngClass]="!selectedCategory ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-300' : 'bg-white text-slate-700 border border-[#DDD6FE] hover:bg-purple-50'"
        >
          <span>🎁</span>
          <span>Tất cả danh mục</span>
        </button>
        @for (cat of categories(); track cat._id) {
          <button 
            (click)="selectCategory(cat.slug)"
            class="px-4 py-2 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
            [ngClass]="selectedCategory === cat.slug ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-300' : 'bg-white text-slate-700 border border-[#DDD6FE] hover:bg-purple-50'"
          >
            <span>{{ cat.emoji || '✨' }}</span>
            <span>{{ cat.name }}</span>
          </button>
        }
      </div>

      <!-- MAIN LAYOUT: Sidebar Filters + Products Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        <!-- SIDEBAR MULTI-FACET FILTER (US-PD-02) -->
        <aside class="lg:col-span-1 space-y-6">
          <div class="bg-white rounded-3xl p-5 border border-[#DDD6FE]/80 shadow-xs space-y-6">
            <div class="flex items-center justify-between border-b border-purple-50 pb-3">
              <h2 class="font-bold text-sm text-[#1E1B4B] flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px] text-[#7C3AED]">tune</span>
                Bộ Lọc Đa Tiêu Chí
              </h2>
              @if (hasActiveFilters()) {
                <button 
                  (click)="resetFilters()" 
                  class="text-[11px] font-bold text-rose-500 hover:text-rose-700 hover:underline cursor-pointer"
                >
                  Xóa tất cả
                </button>
              }
            </div>

            <!-- Facet 1: Khoảng giá (Budget range) -->
            <div class="space-y-2.5">
              <label class="text-xs font-bold text-slate-700 uppercase tracking-wider block">Khoảng Ngân Sách</label>
              <div class="space-y-1.5 text-xs">
                @for (range of priceRanges; track range.label) {
                  <label class="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-purple-50/60 cursor-pointer select-none">
                    <input 
                      type="radio" 
                      name="priceRange" 
                      [checked]="isPriceRangeSelected(range.min, range.max)"
                      (change)="selectPriceRange(range.min, range.max)"
                      class="text-[#7C3AED] focus:ring-[#7C3AED] accent-[#7C3AED]"
                    >
                    <span class="text-slate-700">{{ range.label }}</span>
                  </label>
                }
              </div>
            </div>

            <!-- Facet 2: Dịp tặng (Occasion) -->
            <div class="space-y-2.5">
              <label class="text-xs font-bold text-slate-700 uppercase tracking-wider block">Dịp Tặng Quà</label>
              <div class="flex flex-wrap gap-1.5">
                @for (occ of occasions; track occ) {
                  <button 
                    type="button"
                    (click)="toggleOccasion(occ)"
                    class="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer"
                    [ngClass]="selectedOccasion === occ ? 'bg-[#7C3AED] text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-purple-100 hover:text-[#7C3AED]'"
                  >
                    {{ occ }}
                  </button>
                }
              </div>
            </div>

            <!-- Facet 3: Đối tượng người nhận (Recipient) -->
            <div class="space-y-2.5">
              <label class="text-xs font-bold text-slate-700 uppercase tracking-wider block">Đối Tượng Người Nhận</label>
              <div class="flex flex-wrap gap-1.5">
                @for (rec of recipients; track rec) {
                  <button 
                    type="button"
                    (click)="toggleRecipient(rec)"
                    class="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer"
                    [ngClass]="selectedRecipient === rec ? 'bg-[#7C3AED] text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-purple-100 hover:text-[#7C3AED]'"
                  >
                    {{ rec }}
                  </button>
                }
              </div>
            </div>

            <!-- Facet 4: Hình thức chế tác & Khuyến mãi -->
            <div class="space-y-2.5">
              <label class="text-xs font-bold text-slate-700 uppercase tracking-wider block">Loại Hình Quà Tặng</label>
              <div class="space-y-2 text-xs">
                <label class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-purple-50/60 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    [(ngModel)]="filterBespoke" 
                    (change)="onFilterChange(true)"
                    class="w-4 h-4 rounded text-[#7C3AED] focus:ring-[#7C3AED] accent-[#7C3AED]"
                  >
                  <span class="text-emerald-700 font-bold flex items-center gap-1">
                    <span class="material-symbols-outlined text-[15px]">palette</span>
                    Khắc tên / Custom cọc 50%
                  </span>
                </label>

                <label class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-purple-50/60 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    [(ngModel)]="filterFlashSale" 
                    (change)="onFilterChange(true)"
                    class="w-4 h-4 rounded text-[#7C3AED] focus:ring-[#7C3AED] accent-[#7C3AED]"
                  >
                  <span class="text-rose-600 font-bold flex items-center gap-1">
                    <span class="material-symbols-outlined text-[15px]">bolt</span>
                    Đang Flash Sale
                  </span>
                </label>
              </div>
            </div>

            <!-- Facet 5: Đánh giá sao (Rating) -->
            <div class="space-y-2.5">
              <label class="text-xs font-bold text-slate-700 uppercase tracking-wider block">Đánh Giá</label>
              <div class="space-y-1.5 text-xs">
                <label class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-purple-50/60 cursor-pointer select-none">
                  <input 
                    type="radio" 
                    name="minRating" 
                    [checked]="!minRating" 
                    (change)="setMinRating(undefined)"
                    class="text-[#7C3AED] focus:ring-[#7C3AED] accent-[#7C3AED]"
                  >
                  <span class="text-slate-700">Tất cả đánh giá</span>
                </label>
                <label class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-purple-50/60 cursor-pointer select-none">
                  <input 
                    type="radio" 
                    name="minRating" 
                    [checked]="minRating === 4" 
                    (change)="setMinRating(4)"
                    class="text-[#7C3AED] focus:ring-[#7C3AED] accent-[#7C3AED]"
                  >
                  <span class="text-amber-500 font-bold flex items-center gap-1">
                    ★★★★☆ <span class="text-slate-700 font-normal">Từ 4 sao trở lên</span>
                  </span>
                </label>
                <label class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-purple-50/60 cursor-pointer select-none">
                  <input 
                    type="radio" 
                    name="minRating" 
                    [checked]="minRating === 5" 
                    (change)="setMinRating(5)"
                    class="text-[#7C3AED] focus:ring-[#7C3AED] accent-[#7C3AED]"
                  >
                  <span class="text-amber-500 font-bold flex items-center gap-1">
                    ★★★★★ <span class="text-slate-700 font-normal">5 sao tuyệt đối</span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </aside>

        <!-- PRODUCT GRID & ACTIVE FILTERS -->
        <main class="lg:col-span-3 space-y-6">
          
          <!-- Active Filter Tags Bar (US-PD-02.3) -->
          @if (hasActiveFilters()) {
            <div class="flex items-center gap-2 flex-wrap bg-white/70 backdrop-blur-sm p-3 rounded-2xl border border-purple-100 text-xs">
              <span class="text-slate-500 font-medium flex items-center gap-1">
                <span class="material-symbols-outlined text-[15px] text-[#7C3AED]">filter_alt</span>
                Đang lọc:
              </span>

              @if (searchKeyword) {
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 text-[#7C3AED] font-semibold">
                  Từ khóa: "{{ searchKeyword }}"
                  <button (click)="removeSearch()" class="hover:text-purple-900 cursor-pointer text-sm">×</button>
                </span>
              }

              @if (selectedCategory) {
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 text-[#7C3AED] font-semibold">
                  Danh mục: {{ getCategoryName(selectedCategory) }}
                  <button (click)="selectCategory('')" class="hover:text-purple-900 cursor-pointer text-sm">×</button>
                </span>
              }

              @if (selectedPriceLabel) {
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 text-[#7C3AED] font-semibold">
                  Giá: {{ selectedPriceLabel }}
                  <button (click)="selectPriceRange(undefined, undefined)" class="hover:text-purple-900 cursor-pointer text-sm">×</button>
                </span>
              }

              @if (selectedOccasion) {
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 text-[#7C3AED] font-semibold">
                  Dịp: {{ selectedOccasion }}
                  <button (click)="selectedOccasion = ''; onFilterChange(true)" class="hover:text-purple-900 cursor-pointer text-sm">×</button>
                </span>
              }

              @if (selectedRecipient) {
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 text-[#7C3AED] font-semibold">
                  Người nhận: {{ selectedRecipient }}
                  <button (click)="selectedRecipient = ''; onFilterChange(true)" class="hover:text-purple-900 cursor-pointer text-sm">×</button>
                </span>
              }

              @if (filterBespoke) {
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                  Chỉ Custom cọc 50%
                  <button (click)="filterBespoke = false; onFilterChange(true)" class="hover:text-emerald-950 cursor-pointer text-sm">×</button>
                </span>
              }

              @if (filterFlashSale) {
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-semibold">
                  Flash Sale
                  <button (click)="filterFlashSale = false; onFilterChange(true)" class="hover:text-rose-950 cursor-pointer text-sm">×</button>
                </span>
              }

              @if (minRating) {
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold">
                  ★ {{ minRating }} sao trở lên
                  <button (click)="setMinRating(undefined)" class="hover:text-amber-950 cursor-pointer text-sm">×</button>
                </span>
              }

              <button 
                (click)="resetFilters()" 
                class="ml-auto text-[11px] font-bold text-[#7C3AED] hover:underline cursor-pointer"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          }

          <!-- Products Content Area -->
          @if (loading()) {
            <div class="py-24 flex flex-col items-center justify-center gap-3">
              <div class="w-10 h-10 border-4 border-purple-200 border-t-[#7C3AED] rounded-full animate-spin"></div>
              <span class="text-xs text-slate-500">Đang tìm kiếm quà tặng phù hợp...</span>
            </div>
          } @else if (products().length === 0) {
            
            <!-- ZERO RESULTS WITH BEST-SELLERS FALLBACK (US-PD-01.3 & US-PD-02 Edge Cases) -->
            <div class="space-y-8">
              <div class="py-12 px-6 bg-white rounded-3xl text-center border border-[#DDD6FE] shadow-xs space-y-4">
                <div class="w-16 h-16 rounded-full bg-purple-50 text-[#7C3AED] flex items-center justify-center mx-auto">
                  <span class="material-symbols-outlined text-3xl">search_off</span>
                </div>
                <div class="space-y-1">
                  <h3 class="font-bold text-lg text-[#1E1B4B]">Không tìm thấy món quà phù hợp</h3>
                  <p class="text-xs text-slate-500 max-w-md mx-auto">
                    Rất tiếc, không có sản phẩm nào khớp với tiêu chí bạn chọn. Bạn có thể xóa bộ lọc hoặc nhờ Trợ lý AI tư vấn món quà độc bản phù hợp nhất!
                  </p>
                </div>

                <div class="flex items-center justify-center gap-3 pt-2">
                  <button 
                    (click)="resetFilters()" 
                    class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Xóa tất cả bộ lọc
                  </button>

                  <!-- CTA AI Chatbot (US-PD-01.3) -->
                  <button 
                    (click)="askAiAssistant()" 
                    class="px-5 py-2.5 bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white text-xs font-bold rounded-xl shadow-md shadow-purple-300 hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span class="material-symbols-outlined text-[17px] animate-spin">auto_awesome</span>
                    Nhờ AI Chatbot tư vấn ngay
                  </button>
                </div>
              </div>

              <!-- 4 Best-sellers Fallback Grid (US-PD-01.3) -->
              @if (bestSellers().length > 0) {
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <h4 class="font-bold text-base text-[#1E1B4B] flex items-center gap-2">
                        <span class="material-symbols-outlined text-[#7C3AED]">stars</span>
                        Gợi ý 4 Quà Tặng Bán Chạy Nhất (Best-sellers)
                      </h4>
                      <p class="text-xs text-slate-500">Các món quà độc bản được hàng nghìn khách hàng lựa chọn</p>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    @for (prod of bestSellers(); track prod._id) {
                      <app-product-card [product]="prod"></app-product-card>
                    }
                  </div>
                </div>
              }
            </div>

          } @else {
            
            <!-- Standard Grid of Products -->
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              @for (prod of products(); track prod._id) {
                <app-product-card [product]="prod"></app-product-card>
              }
            </div>

            <!-- Pagination (US-PD-02 DoD) -->
            @if (totalPages() > 1) {
              <div class="flex items-center justify-center gap-2 pt-8">
                <button 
                  [disabled]="currentPage === 1"
                  (click)="changePage(currentPage - 1)"
                  class="w-9 h-9 rounded-xl border border-[#DDD6FE] bg-white text-slate-700 disabled:opacity-40 hover:bg-purple-50 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <span class="material-symbols-outlined text-sm">chevron_left</span>
                </button>

                @for (p of pagesArray(); track p) {
                  <button 
                    (click)="changePage(p)"
                    class="w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    [ngClass]="currentPage === p ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-300' : 'bg-white border border-[#DDD6FE] text-slate-700 hover:bg-purple-50'"
                  >
                    {{ p }}
                  </button>
                }

                <button 
                  [disabled]="currentPage === totalPages()"
                  (click)="changePage(currentPage + 1)"
                  class="w-9 h-9 rounded-xl border border-[#DDD6FE] bg-white text-slate-700 disabled:opacity-40 hover:bg-purple-50 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <span class="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            }

          }
        </main>
      </div>
    </div>
  `
})
export class ProductsComponent implements OnInit {
  private productService = inject(ProductService);
  private aiChatbotService = inject(AiChatbotService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  products = signal<Product[]>([]);
  bestSellers = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  loading = signal<boolean>(true);
  total = signal<number>(0);
  totalPages = signal<number>(1);

  // Filters state
  selectedCategory: string = '';
  selectedSort: string = 'popular';
  filterBespoke: boolean = false;
  filterFlashSale: boolean = false;
  searchKeyword: string = '';
  minPrice?: number;
  maxPrice?: number;
  selectedPriceLabel: string = '';
  selectedOccasion: string = '';
  selectedRecipient: string = '';
  minRating?: number;
  currentPage: number = 1;
  limit: number = 12;

  // Facet options (US-PD-02)
  priceRanges = [
    { label: 'Tất cả mức giá', min: undefined, max: undefined },
    { label: 'Dưới 200.000đ', min: 0, max: 200000 },
    { label: '200.000đ - 500.000đ', min: 200000, max: 500000 },
    { label: '500.000đ - 1.000.000đ', min: 500000, max: 1000000 },
    { label: 'Trên 1.000.000đ', min: 1000000, max: undefined },
  ];

  occasions = [
    'Sinh nhật', 'Kỷ niệm', 'Tri ân', 'Tình yêu', '8/3 - 20/10', 'Tân gia', 'Giáng sinh'
  ];

  recipients = [
    'Người yêu', 'Mẹ', 'Bố', 'Bạn bè', 'Đồng nghiệp', 'Sếp', 'Bé yêu'
  ];

  ngOnInit(): void {
    // Load categories
    this.productService.getCategories().subscribe(cats => this.categories.set(cats));

    // Load best-sellers upfront for instant zero-results fallback
    this.productService.getBestSellers(4).subscribe(res => this.bestSellers.set(res));

    // Subscribe to query params to restore state (US-PD-02 DoD)
    this.route.queryParams.subscribe(params => {
      this.selectedCategory = params['category'] || '';
      this.searchKeyword = params['search'] || '';
      this.filterBespoke = params['customizable'] === 'true';
      this.filterFlashSale = params['flashSale'] === 'true';
      this.selectedSort = params['sort'] || 'popular';
      this.selectedOccasion = params['occasion'] || '';
      this.selectedRecipient = params['recipient'] || '';
      this.minRating = params['minRating'] ? Number(params['minRating']) : undefined;
      this.currentPage = params['page'] ? Number(params['page']) : 1;

      if (params['minPrice'] !== undefined) this.minPrice = Number(params['minPrice']);
      else this.minPrice = undefined;

      if (params['maxPrice'] !== undefined) this.maxPrice = Number(params['maxPrice']);
      else this.maxPrice = undefined;

      this.updatePriceLabel();
      this.loadProducts();
    });
  }

  loadProducts(): void {
    this.loading.set(true);
    const query: any = {
      sort: this.selectedSort,
      page: this.currentPage,
      limit: this.limit
    };

    if (this.selectedCategory) query.category = this.selectedCategory;
    if (this.searchKeyword) query.search = this.searchKeyword;
    if (this.filterBespoke) query.isCustomizable = 'true';
    if (this.filterFlashSale) query.isFlashSale = 'true';
    if (this.minPrice !== undefined) query.minPrice = this.minPrice;
    if (this.maxPrice !== undefined) query.maxPrice = this.maxPrice;
    if (this.selectedOccasion) query.occasion = this.selectedOccasion;
    if (this.selectedRecipient) query.recipient = this.selectedRecipient;
    if (this.minRating) query.minRating = this.minRating;

    this.productService.getProducts(query).subscribe({
      next: res => {
        this.products.set(res.items || []);
        this.total.set(res.meta?.total || 0);
        this.totalPages.set(res.meta?.totalPages || 1);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onFilterChange(resetPage: boolean = true): void {
    if (resetPage) {
      this.currentPage = 1;
    }
    this.syncUrlParams();
  }

  selectCategory(slug: string): void {
    this.selectedCategory = slug;
    this.onFilterChange(true);
  }

  selectPriceRange(min?: number, max?: number): void {
    this.minPrice = min;
    this.maxPrice = max;
    this.updatePriceLabel();
    this.onFilterChange(true);
  }

  isPriceRangeSelected(min?: number, max?: number): boolean {
    return this.minPrice === min && this.maxPrice === max;
  }

  private updatePriceLabel(): void {
    const found = this.priceRanges.find(r => r.min === this.minPrice && r.max === this.maxPrice);
    this.selectedPriceLabel = found && found.min !== undefined ? found.label : (this.minPrice !== undefined ? `Từ ${this.minPrice.toLocaleString()}đ` : '');
  }

  toggleOccasion(occ: string): void {
    this.selectedOccasion = this.selectedOccasion === occ ? '' : occ;
    this.onFilterChange(true);
  }

  toggleRecipient(rec: string): void {
    this.selectedRecipient = this.selectedRecipient === rec ? '' : rec;
    this.onFilterChange(true);
  }

  setMinRating(val?: number): void {
    this.minRating = val;
    this.onFilterChange(true);
  }

  removeSearch(): void {
    this.searchKeyword = '';
    this.onFilterChange(true);
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.syncUrlParams();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  pagesArray(): number[] {
    const count = this.totalPages();
    return Array.from({ length: Math.min(5, count) }, (_, i) => i + 1);
  }

  hasActiveFilters(): boolean {
    return !!(
      this.selectedCategory ||
      this.searchKeyword ||
      this.filterBespoke ||
      this.filterFlashSale ||
      this.minPrice !== undefined ||
      this.maxPrice !== undefined ||
      this.selectedOccasion ||
      this.selectedRecipient ||
      this.minRating
    );
  }

  resetFilters(): void {
    this.selectedCategory = '';
    this.filterBespoke = false;
    this.filterFlashSale = false;
    this.searchKeyword = '';
    this.minPrice = undefined;
    this.maxPrice = undefined;
    this.selectedPriceLabel = '';
    this.selectedOccasion = '';
    this.selectedRecipient = '';
    this.minRating = undefined;
    this.selectedSort = 'popular';
    this.currentPage = 1;
    this.syncUrlParams();
  }

  getCategoryName(slug: string): string {
    const cat = this.categories().find(c => c.slug === slug);
    return cat ? cat.name : slug;
  }

  askAiAssistant(): void {
    let prompt = 'Tư vấn quà tặng phù hợp';
    if (this.selectedRecipient) prompt += ` cho ${this.selectedRecipient}`;
    if (this.selectedOccasion) prompt += ` dịp ${this.selectedOccasion}`;
    if (this.searchKeyword) prompt += ` từ khóa "${this.searchKeyword}"`;
    this.aiChatbotService.openWithPrompt(prompt);
  }

  private syncUrlParams(): void {
    const queryParams: any = {};
    if (this.selectedCategory) queryParams.category = this.selectedCategory;
    if (this.searchKeyword) queryParams.search = this.searchKeyword;
    if (this.filterBespoke) queryParams.customizable = 'true';
    if (this.filterFlashSale) queryParams.flashSale = 'true';
    if (this.selectedSort !== 'popular') queryParams.sort = this.selectedSort;
    if (this.minPrice !== undefined) queryParams.minPrice = this.minPrice;
    if (this.maxPrice !== undefined) queryParams.maxPrice = this.maxPrice;
    if (this.selectedOccasion) queryParams.occasion = this.selectedOccasion;
    if (this.selectedRecipient) queryParams.recipient = this.selectedRecipient;
    if (this.minRating) queryParams.minRating = this.minRating;
    if (this.currentPage > 1) queryParams.page = this.currentPage;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: ''
    });
  }
}
