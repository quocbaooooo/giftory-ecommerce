import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pill-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative z-10 w-full max-w-2xl mx-auto px-4">
      <form (ngSubmit)="onSearch()" class="relative flex items-center bg-white rounded-full shadow-pill border border-[#DDD6FE] hover:border-purple-300 transition-all p-1.5 pl-3">
        <!-- Giftory Brand Emblem -->
        <div class="w-8 h-8 flex items-center justify-center mr-2 flex-shrink-0 bg-transparent border-none">
          <img src="/logo.png" alt="Giftory" class="w-full h-full object-contain">
        </div>

        <span class="material-symbols-outlined text-slate-400 text-2xl mr-2 select-none">search</span>
        
        <input 
          [(ngModel)]="searchTerm" 
          name="searchTerm"
          class="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-slate-700 text-sm md:text-base placeholder:text-slate-400 font-medium py-1" 
          placeholder="Bạn đang tìm kiếm món quà gì hôm nay?" 
          type="text"
        >

        <div class="flex items-center gap-1 flex-shrink-0">
          <button type="button" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-[#7C3AED] hover:bg-slate-100 transition cursor-pointer" title="Tìm kiếm bằng giọng nói">
            <span class="material-symbols-outlined text-[20px]">mic</span>
          </button>
          <button type="button" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-[#7C3AED] hover:bg-slate-100 transition cursor-pointer" title="Tìm kiếm bằng hình ảnh">
            <span class="material-symbols-outlined text-[20px]">photo_camera</span>
          </button>
          <button type="button" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-[#7C3AED] hover:bg-slate-100 transition cursor-pointer" title="Tải ảnh phôi lên">
            <span class="material-symbols-outlined text-[20px]">add</span>
          </button>
        </div>

        <button type="submit" class="flex-shrink-0 w-10 h-10 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white flex items-center justify-center transition-all ml-2 shadow-md shadow-purple-300 border-none cursor-pointer">
          <span class="material-symbols-outlined text-xl">arrow_forward</span>
        </button>
      </form>
    </div>
  `
})
export class PillSearchComponent {
  searchTerm: string = '';
  @Output() search = new EventEmitter<string>();

  constructor(private router: Router) {}

  onSearch(): void {
    if (this.searchTerm.trim()) {
      this.search.emit(this.searchTerm.trim());
      this.router.navigate(['/products'], { queryParams: { search: this.searchTerm.trim() } });
    }
  }
}
