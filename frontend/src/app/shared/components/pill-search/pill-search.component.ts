import { Component, EventEmitter, Output, OnInit, OnDestroy, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-pill-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="relative z-30 w-full max-w-2xl mx-auto px-4">
      <form (ngSubmit)="onSearch()" class="relative flex items-center bg-white rounded-full shadow-pill border border-[#DDD6FE] hover:border-purple-400 focus-within:border-[#7C3AED] focus-within:ring-2 focus-within:ring-purple-200 transition-all p-1.5 pl-3">
        <!-- Giftory Brand Emblem -->
        <div class="w-8 h-8 flex items-center justify-center mr-2 flex-shrink-0 bg-transparent border-none">
          <img src="/logo.png" alt="Giftory" class="w-full h-full object-contain">
        </div>

        <span class="material-symbols-outlined text-slate-400 text-2xl mr-2 select-none">search</span>
        
        <input 
          [(ngModel)]="searchTerm" 
          (ngModelChange)="onInputChange($event)"
          (focus)="onInputFocus()"
          name="searchTerm"
          autocomplete="off"
          class="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-slate-700 text-sm md:text-base placeholder:text-slate-400 font-medium py-1" 
          placeholder="Bạn đang tìm kiếm món quà gì hôm nay?" 
          type="text"
        >

        <!-- Loading indicator -->
        <div *ngIf="isLoading" class="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-2"></div>

        <div class="flex items-center gap-1 flex-shrink-0">
          <button type="button" (click)="openVoiceSearch()" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-[#7C3AED] hover:bg-slate-100 transition cursor-pointer" title="Tìm kiếm bằng giọng nói">
            <span class="material-symbols-outlined text-[20px]">mic</span>
          </button>
          <button type="button" routerLink="/custom-studio" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-[#7C3AED] hover:bg-slate-100 transition cursor-pointer" title="Tùy chỉnh quà Bespoke">
            <span class="material-symbols-outlined text-[20px]">draw</span>
          </button>
        </div>

        <button type="submit" class="flex-shrink-0 w-10 h-10 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white flex items-center justify-center transition-all ml-2 shadow-md shadow-purple-300 border-none cursor-pointer">
          <span class="material-symbols-outlined text-xl">arrow_forward</span>
        </button>
      </form>

      <!-- LIVE AUTO-COMPLETE DROPDOWN (US-PD-01.1) -->
      <div 
        *ngIf="showDropdown && (suggestedProducts.length > 0 || suggestedKeywords.length > 0)"
        class="absolute left-4 right-4 top-full mt-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-purple-100 overflow-hidden z-50 animate-fade-in"
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
  searchTerm: string = '';
  @Output() search = new EventEmitter<string>();

  suggestedProducts: any[] = [];
  suggestedKeywords: string[] = [];
  showDropdown = false;
  isLoading = false;

  private searchSubject = new Subject<string>();
  private sub?: Subscription;

  constructor(
    private router: Router,
    private productService: ProductService,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
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

  onSearch(): void {
    if (this.searchTerm.trim()) {
      this.showDropdown = false;
      this.search.emit(this.searchTerm.trim());
      this.router.navigate(['/products'], { queryParams: { search: this.searchTerm.trim() } });
    }
  }

  openVoiceSearch(): void {
    // Check speech recognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.searchTerm = transcript;
        this.onInputChange(transcript);
      };
      recognition.start();
    } else {
      this.searchTerm = 'Bình giữ nhiệt';
      this.onInputChange(this.searchTerm);
    }
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
