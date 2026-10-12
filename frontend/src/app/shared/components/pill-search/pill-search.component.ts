import { Component, Input, EventEmitter, Output, OnInit, OnDestroy, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, filter } from 'rxjs/operators';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-pill-search',
  standalone: true,
  host: { class: 'block w-full max-w-3xl mx-auto relative z-30' },
  imports: [CommonModule, FormsModule],
  styles: [`
    .floating-search { padding: 0; }
    .floating-search form {
      border-radius: 999px; padding: 8px 10px 8px 26px;
      background: rgba(255,255,255,.94); backdrop-filter: blur(20px);
      border-color: rgba(226,232,240,.85);
      box-shadow: 0 12px 48px rgba(30,27,75,.18), 0 2px 8px rgba(30,27,75,.06);
    }
    .floating-search .search-icon, .floating-search .submit-label { display: none; }
    .floating-search .search-submit {
      width: 40px; height: 40px; padding: 0; border-radius: 50%;
      color: #64748b; background: #f1f0f4; box-shadow: none;
    }
    .floating-search .search-submit:hover { color: #7c3aed; background: #ede9fe; }
    .floating-search .suggestions {
      top: auto; bottom: calc(100% + 12px); left: 0; right: 0; margin-top: 0;
      max-height: min(440px, 60dvh); overflow-y: auto;
    }
  `],
  template: `
    <div class="relative w-full px-4 sm:px-6" [class.floating-search]="floating">
      <form role="search" (ngSubmit)="onSearch()" class="relative flex items-center gap-2 sm:gap-3 bg-white rounded-2xl sm:rounded-full shadow-[0_8px_32px_rgba(124,58,237,0.10)] border border-purple-200/80 hover:border-purple-300 focus-within:border-[#7C3AED] focus-within:ring-4 focus-within:ring-purple-100 transition-all duration-200 p-1.5 pl-4 sm:pl-6">
        <span class="search-icon material-symbols-outlined text-purple-400 text-2xl shrink-0 select-none" aria-hidden="true">search</span>
        
        <input 
          [(ngModel)]="searchTerm" 
          (ngModelChange)="onInputChange($event)"
          (focus)="onInputFocus()"
          name="searchTerm"
          autocomplete="off"
          class="flex-1 min-w-0 bg-transparent border-none focus:outline-none focus:ring-0 text-slate-700 text-sm sm:text-base placeholder:text-slate-400 font-normal py-2.5 px-0"
          placeholder="Tìm kiếm quà tặng…"
          aria-label="Tìm kiếm quà tặng"
          type="text"
        >

        <!-- Loading indicator -->
        <div *ngIf="isLoading" class="w-5 h-5 shrink-0 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-2"></div>

        <button type="submit" aria-label="Tìm kiếm" title="Tìm kiếm" class="search-submit shrink-0 h-10 w-10 sm:h-11 sm:w-auto sm:px-6 rounded-xl sm:rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 shadow-sm border-none cursor-pointer">
          <span class="submit-label hidden sm:inline text-sm font-semibold">Tìm quà</span>
          <span class="material-symbols-outlined text-xl" aria-hidden="true">arrow_forward</span>
        </button>
      </form>

      <!-- LIVE AUTO-COMPLETE DROPDOWN (US-PD-01.1) -->
      <div 
        *ngIf="showDropdown && (suggestedProducts.length > 0 || suggestedKeywords.length > 0)"
        class="suggestions absolute left-4 right-4 sm:left-6 sm:right-6 top-full mt-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-purple-100 overflow-hidden z-50 animate-fade-in"
      >
        <!-- Suggested Keywords Section -->
        <div *ngIf="suggestedKeywords.length > 0" class="p-3 border-b border-purple-50 bg-purple-50/40">
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 px-2">
            <span class="material-symbols-outlined text-xs text-[#7C3AED]">trending_up</span>
            Từ khóa gợi ý phổ biến
          </div>
          <div class="flex flex-wrap gap-1.5 px-1">
            <button
              *ngFor="let kw of suggestedKeywords"
              type="button"
              (click)="selectKeyword(kw)"
              class="px-3 py-1.5 rounded-full text-xs font-medium bg-white text-slate-700 hover:bg-purple-100 hover:text-[#7C3AED] border border-purple-100/80 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span class="material-symbols-outlined text-xs text-purple-400">search</span>
              {{ kw }}
            </button>
          </div>
        </div>

        <!-- Matching Products Section -->
        <div *ngIf="suggestedProducts.length > 0" class="p-3">
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 px-2">
            <span class="material-symbols-outlined text-xs text-[#7C3AED]">auto_awesome</span>
            Sản phẩm gợi ý liên quan
          </div>
          <div class="space-y-1">
            <div
              *ngFor="let prod of suggestedProducts"
              (click)="selectProduct(prod.slug)"
              class="flex items-center gap-3 p-2 rounded-xl hover:bg-purple-50/70 transition-all cursor-pointer group"
            >
              <img 
                [src]="prod.images?.[0] || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200'" 
                [alt]="prod.name"
                class="w-12 h-12 rounded-lg object-cover border border-purple-100 flex-shrink-0 group-hover:scale-105 transition-transform"
              />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold text-slate-800 truncate group-hover:text-[#7C3AED] transition-colors">
                  {{ prod.name }}
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-xs font-bold text-[#7C3AED]">
                    {{ (prod.salePrice || prod.price) | number:'1.0-0' }}đ
                  </span>
                  <span *ngIf="prod.salePrice" class="text-[10px] text-slate-400 line-through">
                    {{ prod.price | number:'1.0-0' }}đ
                  </span>
                  <span *ngIf="prod.isCustomizable" class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-pink-50 text-pink-600 border border-pink-100">
                    Khắc tên
                  </span>
                  <span class="text-[11px] text-amber-500 font-medium flex items-center gap-0.5">
                    ★ {{ prod.rating || 5 }}
                  </span>
                </div>
              </div>
              <span class="material-symbols-outlined text-slate-300 group-hover:text-[#7C3AED] text-sm flex-shrink-0">
                arrow_forward_ios
              </span>
            </div>
          </div>
        </div>

        <!-- Footer Call to Action -->
        <div class="p-2.5 bg-slate-50 border-t border-purple-50 text-center">
          <button 
            type="button" 
            (click)="onSearch()"
            class="text-xs font-semibold text-[#7C3AED] hover:text-[#6D28D9] hover:underline flex items-center justify-center gap-1 mx-auto"
          >
            Xem tất cả kết quả cho "{{ searchTerm }}"
            <span class="material-symbols-outlined text-xs">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class PillSearchComponent implements OnInit, OnDestroy {
  @Input() floating = false;
  searchTerm: string = '';
  @Output() search = new EventEmitter<string>();

  suggestedProducts: any[] = [];
  suggestedKeywords: string[] = [];
  showDropdown = false;
  isLoading = false;

  private searchSubject = new Subject<string>();
  private sub?: Subscription;
  private routeSub?: Subscription;

  constructor(
    private router: Router,
    private productService: ProductService,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.syncSearchFromUrl();
    this.routeSub = this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      this.syncSearchFromUrl();
      this.showDropdown = false;
      this.searchSubject.next('');
    });
    // US-PD-01: Debounce 250ms & cancel previous request
    this.sub = this.searchSubject.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.trim().length < 2) {
          this.suggestedProducts = [];
          this.suggestedKeywords = [];
          this.isLoading = false;
          return of({ products: [], keywords: [] });
        }
        this.isLoading = true;
        return this.productService.getSearchSuggestions(query.trim()).pipe(
          catchError(() => of({ products: [], keywords: [] }))
        );
      })
    ).subscribe(res => {
      this.isLoading = false;
      this.suggestedProducts = res.products || [];
      this.suggestedKeywords = res.keywords || [];
      this.showDropdown = (this.suggestedProducts.length > 0 || this.suggestedKeywords.length > 0) && this.searchTerm.trim().length >= 2;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  onInputChange(val: string): void {
    this.searchSubject.next(val);
  }

  onInputFocus(): void {
    if (this.searchTerm.trim().length >= 2 && (this.suggestedProducts.length > 0 || this.suggestedKeywords.length > 0)) {
      this.showDropdown = true;
    }
  }

  selectKeyword(kw: string): void {
    this.searchTerm = kw;
    this.showDropdown = false;
    this.onSearch();
  }

  selectProduct(slug: string): void {
    this.showDropdown = false;
    this.router.navigate(['/products', slug]);
  }

  private syncSearchFromUrl(): void {
    const url = this.router.parseUrl(this.router.url);
    this.searchTerm = url.queryParams['search'] || '';
  }

  onSearch(): void {
    const keyword = this.searchTerm.trim();
    const current = this.router.parseUrl(this.router.url);
    const isListing = current.root.children['primary']?.segments.map(segment => segment.path).join('/') === 'products';
    if (!keyword && !isListing) return;
    this.showDropdown = false;
    this.searchSubject.next('');
    this.search.emit(keyword);
    this.router.navigate(['/products'], {
      queryParams: { ...(isListing ? current.queryParams : {}), search: keyword || null, page: null }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showDropdown = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.showDropdown = false;
  }
}
