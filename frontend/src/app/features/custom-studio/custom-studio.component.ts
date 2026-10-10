import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, HostListener, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import Konva from 'konva';
import { CustomStudioService } from '../../core/services/custom-studio.service';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { Product, StudioAsset, AreaBox } from '../../core/models';

interface CustomPattern {
  id: string;
  name: string;
  surcharge: number;
  icon: string;
  cssPattern: string;
}

interface SurchargeBreakdown {
  label: string;
  amount: number;
}

type StudioToolTab = 'COLOR' | 'TEXT' | 'IMAGE' | 'STICKER' | 'PATTERN' | 'SUMMARY';

@Component({
  selector: 'app-custom-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1 1 0%;
      height: 100%;
      min-height: 0;
      width: 100%;
      overflow: hidden;
    }
  `],
  template: `
    <div class="w-full h-full flex flex-col gap-2 min-h-0 overflow-hidden select-none">
      
      <!-- TOP STUDIO APP BAR -->
      <header class="bg-white rounded-2xl px-3.5 py-2 shadow-xs border border-[#DDD6FE]/70 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <!-- Left: Product switcher & Breadcrumb -->
        <div class="flex items-center gap-2.5">
          <a routerLink="/products" class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-[#7C3AED] flex items-center justify-center transition" title="Quay lại danh mục">
            <span class="material-symbols-outlined text-[17px]">arrow_back</span>
          </a>

          <div>
            <div class="flex items-center gap-1.5">
              <span class="text-[11px] font-bold text-[#7C3AED] uppercase tracking-wider flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">palette</span>
                Konva 2D Design Studio
              </span>
              <span class="text-slate-300">•</span>
              <span class="text-[11px] text-slate-500 font-medium hidden sm:inline">Phôi Chế Tác Độc Bản</span>
            </div>
            <div class="flex items-center gap-2">
              <h1 class="font-bold text-xs sm:text-sm text-[#1E1B4B] truncate max-w-[240px] sm:max-w-md">
                {{ activeTemplate()?.name || 'Bình Giữ Nhiệt Nordic' }}
              </h1>
              @if (isEditingCartItem()) {
                <span class="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                  Sửa món #{{ editingCartItemIndex()! + 1 }}
                </span>
              }
            </div>
          </div>
        </div>

        <!-- Center: Blank Template Quick Rail -->
        <div class="hidden xl:flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-sm py-0.5">
          @for (tpl of templates(); track tpl._id) {
            <button 
              (click)="selectTemplate(tpl)"
              class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-semibold shrink-0 cursor-pointer transition-all"
              [ngClass]="activeTemplate()?._id === tpl._id ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-2xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-purple-200'"
            >
              <img [src]="tpl.images[0]" [alt]="tpl.name" class="w-4 h-4 rounded-md object-cover bg-white">
              <span class="truncate max-w-[100px]">{{ tpl.name.split('&')[0].trim() }}</span>
            </button>
          }
        </div>

        <!-- Right: Status & Quick Actions -->
        <div class="flex items-center gap-2">
          @if (lastAutoSavedTime()) {
            <div class="hidden md:flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded-full border border-slate-200">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Đã lưu {{ lastAutoSavedTime() }}</span>
            </div>
          }

          <div class="flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 text-[11px] font-bold text-[#10B981]">
            <span class="material-symbols-outlined text-[14px]">verified</span>
            <span>Cọc 50%</span>
          </div>

          <button 
            (click)="onSaveDesignClick()"
            class="px-3 py-1 rounded-xl border border-[#DDD6FE] bg-white hover:bg-purple-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Lưu bản thiết kế này (AC12)"
          >
            <span class="material-symbols-outlined text-[15px] text-[#7C3AED]">bookmark</span>
            <span class="hidden sm:inline">Lưu Nháp</span>
          </button>
        </div>
      </header>

      <!-- RESTORED DRAFT TOAST (Floating, Auto-dismissing, Non-intrusive) -->
      @if (hasRestoredDraft() && !isEditingCartItem()) {
        <div class="fixed bottom-6 right-6 z-50 bg-slate-900/90 text-white backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-xl border border-slate-700 text-xs flex items-center gap-3 animate-fade-in max-w-xs">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-purple-400 text-base shrink-0">history</span>
            <span class="text-[11px] text-slate-200">Đã nạp lại bản thiết kế trước đó</span>
          </div>
          <div class="flex items-center gap-2 ml-auto shrink-0">
            <button (click)="resetToDefaults()" class="text-[11px] font-bold text-purple-300 hover:text-white underline cursor-pointer">
              Làm mới
            </button>
            <button (click)="hasRestoredDraft.set(false)" class="text-slate-400 hover:text-white text-xs cursor-pointer ml-1" title="Đóng">
              ✕
            </button>
          </div>
        </div>
      }

      <!-- ================= MAIN 3-ZONE STUDIO WORKSPACE ================= -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-2.5 flex-1 min-h-0 h-full overflow-hidden" style="grid-template-rows: minmax(0, 1fr);">
        
        <!-- ================= ZONE 1: TOOL NAVIGATION & DRAWER (5 COLS) ================= -->
        <div class="lg:col-span-5 flex bg-white rounded-2xl sm:rounded-3xl border border-[#DDD6FE] shadow-shop-card overflow-hidden h-full min-h-0 flex-col sm:flex-row">
          
          <!-- Slim Left Tool Dock -->
          <div class="w-full sm:w-16 md:w-18 bg-slate-50 border-b sm:border-b-0 sm:border-r border-slate-200 flex sm:flex-col items-center py-2 sm:py-3 gap-1 shrink-0 overflow-x-auto sm:overflow-y-auto overflow-y-hidden no-scrollbar justify-around sm:justify-start h-full">
            <!-- Tool 1: Colors -->
            <button
              (click)="activeToolTab.set('COLOR')"
              class="w-11 sm:w-13 py-1.5 sm:py-2 rounded-xl flex flex-col items-center gap-0.5 transition-all cursor-pointer"
              [ngClass]="activeToolTab() === 'COLOR' ? 'bg-[#7C3AED] text-white shadow-md' : 'text-slate-600 hover:bg-slate-200/70'"
              title="Phối màu vỏ phôi"
            >
              <span class="material-symbols-outlined text-[18px]">palette</span>
              <span class="text-[8.5px] font-bold">Màu phôi</span>
            </button>

            <!-- Tool 2: Text / Engraving -->
            <button
              (click)="activeToolTab.set('TEXT')"
              class="w-12 sm:w-14 py-2 sm:py-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all cursor-pointer"
              [ngClass]="activeToolTab() === 'TEXT' ? 'bg-[#7C3AED] text-white shadow-md' : 'text-slate-600 hover:bg-slate-200/70'"
              title="Nội dung khắc laser"
            >
              <span class="material-symbols-outlined text-[19px] sm:text-[20px]">format_shapes</span>
              <span class="text-[9px] font-bold">Khắc chữ</span>
            </button>

            <!-- Tool 3: Photo Upload -->
            <button
              (click)="activeToolTab.set('IMAGE')"
              class="w-12 sm:w-14 py-2 sm:py-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all cursor-pointer relative"
              [ngClass]="activeToolTab() === 'IMAGE' ? 'bg-[#7C3AED] text-white shadow-md' : 'text-slate-600 hover:bg-slate-200/70'"
              title="Tải ảnh cá nhân"
            >
              <span class="material-symbols-outlined text-[19px] sm:text-[20px]">add_photo_alternate</span>
              <span class="text-[9px] font-bold">Tải ảnh</span>
              @if (uploadedImage()) {
                <span class="w-2 h-2 rounded-full bg-emerald-500 absolute top-1.5 right-1.5 sm:top-2 sm:right-2 border-2 border-white"></span>
              }
            </button>

            <!-- Tool 4: Stickers (From Admin) -->
            <button
              (click)="activeToolTab.set('STICKER')"
              class="w-12 sm:w-14 py-2 sm:py-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all cursor-pointer relative"
              [ngClass]="activeToolTab() === 'STICKER' ? 'bg-[#7C3AED] text-white shadow-md' : 'text-slate-600 hover:bg-slate-200/70'"
              title="Sticker & Icon"
            >
              <span class="material-symbols-outlined text-[19px] sm:text-[20px]">sentiment_satisfied</span>
              <span class="text-[9px] font-bold">Sticker</span>
              @if (activeStickers().length > 0) {
                <span class="w-2 h-2 rounded-full bg-pink-500 absolute top-1.5 right-1.5 sm:top-2 sm:right-2 border-2 border-white"></span>
              }
            </button>

            <!-- Tool 5: Patterns -->
            <button
              (click)="activeToolTab.set('PATTERN')"
              class="w-12 sm:w-14 py-2 sm:py-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all cursor-pointer"
              [ngClass]="activeToolTab() === 'PATTERN' ? 'bg-[#7C3AED] text-white shadow-md' : 'text-slate-600 hover:bg-slate-200/70'"
              title="Hoa văn phủ"
            >
              <span class="material-symbols-outlined text-[19px] sm:text-[20px]">texture</span>
              <span class="text-[9px] font-bold">Họa tiết</span>
            </button>

            <div class="hidden sm:block w-8 border-t border-slate-200 my-0.5"></div>

            <!-- Tool 6: Price & Specs -->
            <button
              (click)="activeToolTab.set('SUMMARY')"
              class="w-12 sm:w-14 py-2 sm:py-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all cursor-pointer"
              [ngClass]="activeToolTab() === 'SUMMARY' ? 'bg-[#7C3AED] text-white shadow-md' : 'text-slate-600 hover:bg-slate-200/70'"
              title="Bảng giá & Đặt hàng"
            >
              <span class="material-symbols-outlined text-[19px] sm:text-[20px]">receipt_long</span>
              <span class="text-[9px] font-bold">Bảng giá</span>
            </button>
          </div>

          <!-- Active Tool Drawer Content Panel (Fixed Header + Internal Scrollable Body + Fixed Bottom CTA) -->
          <div class="flex-1 flex flex-col h-full min-h-0 bg-white overflow-hidden">
            
            <!-- A. STICKY DRAWER HEADER -->
            <div class="px-4 py-2.5 border-b border-slate-100 bg-white/95 backdrop-blur-xs shrink-0 flex items-center justify-between z-10">
              @if (activeToolTab() === 'COLOR') {
                <div>
                  <h3 class="font-bold text-xs sm:text-sm text-[#1E1B4B] flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[#7C3AED] text-[18px]">palette</span>
                    Phối Màu Vỏ Phôi
                  </h3>
                  <p class="text-[10px] text-slate-500 mt-0.5">Sơn tĩnh điện vi sinh bền màu chuẩn Giftory</p>
                </div>
                <span class="text-[11px] font-bold text-[#7C3AED] bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  {{ selectedColor() }}
                </span>
              }
              @if (activeToolTab() === 'TEXT') {
                <div>
                  <h3 class="font-bold text-xs sm:text-sm text-[#1E1B4B] flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[#7C3AED] text-[18px]">format_shapes</span>
                    Khắc Laser 2 Mặt
                  </h3>
                  <p class="text-[10px] text-slate-500 mt-0.5">Khắc vi điểm sắc nét tên & lời chúc</p>
                </div>
                <span class="text-[11px] font-bold text-[#7C3AED] bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  {{ isFrontFace() ? 'Mặt Trước' : 'Mặt Sau' }}
                </span>
              }
              @if (activeToolTab() === 'IMAGE') {
                <div>
                  <h3 class="font-bold text-xs sm:text-sm text-[#1E1B4B] flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[#7C3AED] text-[18px]">add_photo_alternate</span>
                    In Ảnh Cá Nhân
                  </h3>
                  <p class="text-[10px] text-slate-500 mt-0.5">Công nghệ in Nano UV HD chống bay màu</p>
                </div>
                @if (uploadedImage()) {
                  <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Đã tải ảnh
                  </span>
                }
              }
              @if (activeToolTab() === 'STICKER') {
                <div>
                  <h3 class="font-bold text-xs sm:text-sm text-[#1E1B4B] flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[#7C3AED] text-[18px]">sentiment_satisfied</span>
                    Kho Sticker & Icon
                  </h3>
                  <p class="text-[10px] text-slate-500 mt-0.5">Icon bản quyền đồng bộ từ Admin</p>
                </div>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-[#7C3AED]">
                  {{ activeStickers().length }}/3 icon
                </span>
              }
              @if (activeToolTab() === 'PATTERN') {
                <div>
                  <h3 class="font-bold text-xs sm:text-sm text-[#1E1B4B] flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[#7C3AED] text-[18px]">texture</span>
                    Họa Tiết Phủ Mặt
                  </h3>
                  <p class="text-[10px] text-slate-500 mt-0.5">Hoa văn chìm tinh tế quanh thân phôi</p>
                </div>
              }
              @if (activeToolTab() === 'SUMMARY') {
                <div>
                  <h3 class="font-bold text-xs sm:text-sm text-[#1E1B4B] flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[#7C3AED] text-[18px]">receipt_long</span>
                    Bảng Kê Chi Phí & Chính Sách Cọc
                  </h3>
                  <p class="text-[10px] text-slate-500 mt-0.5">Minh bạch giá & chính sách cọc 50%</p>
                </div>
              }
            </div>

            <!-- B. INTERNAL SCROLLABLE DRAWER BODY (overflow-y: auto) -->
            <div class="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 custom-scrollbar">
              
              <!-- DRAWER 1: COLORS -->
              @if (activeToolTab() === 'COLOR') {
                <div class="space-y-4 animate-fade-in">
                  <div class="grid grid-cols-2 gap-2.5">
                    @for (c of availableColorOptions(); track c.name) {
                      <div 
                        (click)="!c.isOutOfStock && setColor(c.name)"
                        class="p-3 rounded-2xl border-2 flex items-center gap-3 transition-all"
                        [ngClass]="{
                          'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200': c.isOutOfStock,
                          'cursor-pointer hover:border-[#7C3AED]/70': !c.isOutOfStock,
                          'border-[#7C3AED] bg-purple-50/60 shadow-xs': selectedColor() === c.name && !c.isOutOfStock,
                          'border-slate-200 bg-white': selectedColor() !== c.name && !c.isOutOfStock
                        }"
                      >
                        <div 
                          class="w-8 h-8 rounded-full border shadow-inner flex items-center justify-center shrink-0"
                          [style.backgroundColor]="c.hex"
                        >
                          @if (selectedColor() === c.name && !c.isOutOfStock) {
                            <span class="material-symbols-outlined text-xs font-bold" [style.color]="c.hex === '#FFFFFF' ? '#000' : '#FFF'">check</span>
                          }
                        </div>
                        <div class="min-w-0 flex-1">
                          <span class="text-xs font-bold text-slate-800 block leading-tight truncate">{{ c.name }}</span>
                          @if (c.isOutOfStock) {
                            <span class="text-[9px] font-bold text-red-600 bg-red-100 px-1.5 py-0.2 rounded-md inline-block mt-0.5">Hết hàng</span>
                          } @else if (c.sku) {
                            <span class="text-[9px] font-mono text-purple-600 block truncate font-medium">{{ c.sku }}</span>
                          } @else {
                            <span class="text-[10px] text-slate-400">Sơn tĩnh điện</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- DRAWER 2: TEXT & ENGRAVING -->
              @if (activeToolTab() === 'TEXT') {
                <div class="space-y-4 animate-fade-in">
                  <!-- Face Active Switch Tab in Text Drawer -->
                  <div class="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
                    <button 
                      (click)="switchFace(true)"
                      class="flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1"
                      [ngClass]="isFrontFace() ? 'bg-white text-[#7C3AED] shadow-xs' : 'text-slate-600'"
                    >
                      <span>Mặt Trước (Front)</span>
                    </button>
                    <button 
                      (click)="switchFace(false)"
                      class="flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1"
                      [ngClass]="!isFrontFace() ? 'bg-white text-[#7C3AED] shadow-xs' : 'text-slate-600'"
                    >
                      <span>Mặt Sau (Back)</span>
                    </button>
                  </div>

                  <!-- Input for Active Face -->
                  @if (isFrontFace()) {
                    <div class="space-y-1">
                      <div class="flex items-center justify-between">
                        <label class="text-xs font-bold text-slate-700">Lời nhắn mặt trước: <span class="text-red-500">*</span></label>
                        <span class="text-[10px] text-slate-400 font-mono">{{ frontMessage().length }}/{{ maxTextLength() }}</span>
                      </div>
                      <div class="relative">
                        <input 
                          [(ngModel)]="frontMessage"
                          (ngModelChange)="onFrontMessageChange($event)"
                          [maxlength]="maxTextLength()"
                          class="w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-none text-slate-800 pr-8"
                          [ngClass]="formErrors.frontMessage ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-[#7C3AED]'"
                          placeholder="VD: Happy Anniversary Minh Anh ❤️"
                        />
                        @if (frontMessage()) {
                          <button (click)="onFrontMessageChange('')" class="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                            <span class="material-symbols-outlined text-[15px]">close</span>
                          </button>
                        }
                      </div>
                      @if (formErrors.frontMessage) {
                        <span class="text-[10px] text-red-500">{{ formErrors.frontMessage }}</span>
                      }
                    </div>
                  } @else {
                    <div class="space-y-1">
                      <div class="flex items-center justify-between">
                        <label class="text-xs font-bold text-slate-700">Lời nhắn mặt sau (Ngày kỷ niệm, ký tên):</label>
                        <span class="text-[10px] text-slate-400 font-mono">{{ backMessage().length }}/{{ maxTextLength() }}</span>
                      </div>
                      <div class="relative">
                        <input 
                          [(ngModel)]="backMessage"
                          (ngModelChange)="onBackMessageChange($event)"
                          [maxlength]="maxTextLength()"
                          class="w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-none text-slate-800 pr-8"
                          [ngClass]="formErrors.backMessage ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-[#7C3AED]'"
                          placeholder="VD: 14.02.2024 • Yêu Em Mãi Mãi"
                        />
                        @if (backMessage()) {
                          <button (click)="onBackMessageChange('')" class="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                            <span class="material-symbols-outlined text-[15px]">close</span>
                          </button>
                        }
                      </div>
                      <span class="text-[10px] text-[#7C3AED] font-medium">+20.000đ phụ phí khắc laser mặt sau nếu có chữ</span>
                    </div>
                  }

                  <!-- Font Selection -->
                  <div>
                    <label class="text-xs font-bold text-slate-700 block mb-1.5">Font chữ nghệ thuật:</label>
                    <div class="grid grid-cols-2 gap-2">
                      @for (f of fontOptions; track f.name) {
                        <button 
                          (click)="setFont(f.name)"
                          class="p-2.5 rounded-xl border text-left transition-all cursor-pointer"
                          [ngClass]="selectedFont() === f.name ? 'border-[#7C3AED] bg-purple-50 text-[#7C3AED] font-bold shadow-2xs' : 'border-slate-200 hover:border-slate-300 text-slate-700'"
                        >
                          <div class="text-[10px] font-semibold text-slate-500">{{ f.name }}</div>
                          <div class="text-xs mt-0.5 truncate" [ngClass]="f.class">Minh Anh & Hoàng</div>
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Engrave Color -->
                  <div>
                    <label class="text-xs font-bold text-slate-700 block mb-1.5">Màu lớp phủ khắc laser:</label>
                    <div class="flex items-center gap-1.5 flex-wrap">
                      @for (ec of engraveColors; track ec.name) {
                        <button 
                          (click)="setEngraveColor(ec.name)"
                          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all"
                          [ngClass]="selectedEngraveColor() === ec.name ? 'border-[#7C3AED] bg-purple-50 text-[#7C3AED]' : 'border-slate-200 text-slate-600'"
                        >
                          <span class="w-3 h-3 rounded-full border border-slate-300 shrink-0" [style.backgroundColor]="ec.hex"></span>
                          <span class="text-[11px]">{{ ec.name }}</span>
                          @if (ec.surcharge > 0) {
                            <span class="text-[9px] text-amber-600 font-bold">+10k</span>
                          }
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Text Typography & Styling Controls (Konva Text Properties) -->
                  <div class="space-y-2 pt-3 border-t border-slate-100">
                    <div class="flex items-center justify-between">
                      <label class="text-xs font-bold text-slate-700">Kích thước chữ ({{ textSize() }}px):</label>
                      <div class="flex items-center gap-1.5">
                        <button 
                          (click)="setTextSize(textSize() - 2)"
                          [disabled]="textSize() <= 10"
                          class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer disabled:opacity-40"
                        >-</button>
                        <button 
                          (click)="setTextSize(textSize() + 2)"
                          [disabled]="textSize() >= 32"
                          class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer disabled:opacity-40"
                        >+</button>
                      </div>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="32" 
                      [ngModel]="textSize()" 
                      (ngModelChange)="setTextSize($event)"
                      class="w-full accent-[#7C3AED] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />

                    <div class="flex items-center justify-between pt-1">
                      <!-- Text Align -->
                      <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        <button 
                          (click)="setTextAlign('left')"
                          class="w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer"
                          [ngClass]="textAlign() === 'left' ? 'bg-white text-[#7C3AED] shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'"
                          title="Căn trái"
                        >
                          <span class="material-symbols-outlined text-[16px]">format_align_left</span>
                        </button>
                        <button 
                          (click)="setTextAlign('center')"
                          class="w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer"
                          [ngClass]="textAlign() === 'center' ? 'bg-white text-[#7C3AED] shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'"
                          title="Căn giữa"
                        >
                          <span class="material-symbols-outlined text-[16px]">format_align_center</span>
                        </button>
                        <button 
                          (click)="setTextAlign('right')"
                          class="w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer"
                          [ngClass]="textAlign() === 'right' ? 'bg-white text-[#7C3AED] shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'"
                          title="Căn phải"
                        >
                          <span class="material-symbols-outlined text-[16px]">format_align_right</span>
                        </button>
                      </div>

                      <!-- Bold & Italic -->
                      <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        <button 
                          (click)="toggleBold()"
                          class="w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer"
                          [ngClass]="isTextBold() ? 'bg-white text-[#7C3AED] shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'"
                          title="Chữ in đậm"
                        >
                          <span class="material-symbols-outlined text-[16px]">format_bold</span>
                        </button>
                        <button 
                          (click)="toggleItalic()"
                          class="w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer"
                          [ngClass]="isTextItalic() ? 'bg-white text-[#7C3AED] shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'"
                          title="Chữ nghiêng"
                        >
                          <span class="material-symbols-outlined text-[16px]">format_italic</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              }

              <!-- DRAWER 3: PHOTO UPLOAD -->
              @if (activeToolTab() === 'IMAGE') {
                <div class="space-y-4 animate-fade-in">
                  @if (!uploadedImage()) {
                    <label class="border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors hover:border-[#7C3AED] hover:bg-purple-50/40 text-center"
                           [ngClass]="formErrors.image ? 'border-red-400 bg-red-50/20' : 'border-slate-300'">
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/jpg" 
                        (change)="onImageFileSelected($event)" 
                        class="hidden"
                      />
                      <span class="material-symbols-outlined text-4xl text-[#7C3AED]">cloud_upload</span>
                      <div>
                        <p class="text-xs font-bold text-slate-700">Tải ảnh kỷ niệm (.JPG, .PNG)</p>
                        <p class="text-[10px] text-slate-400 mt-0.5">Dung lượng tối đa 5MB • Phụ phí in ảnh HD: 30.000đ</p>
                      </div>
                    </label>
                  } @else {
                    <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div class="flex items-center gap-3">
                        <img [src]="uploadedImage()" alt="Preview" class="w-14 h-14 rounded-xl object-cover border border-slate-300 shadow-xs">
                        <div class="flex-1">
                          <span class="text-xs font-bold text-slate-800 block">Ảnh đã đưa lên Canvas</span>
                          <span class="text-[10px] text-emerald-600 font-medium">Kéo thả & xoay chỉnh tự do trên Canvas</span>
                        </div>
                        <button (click)="removeImage()" class="w-8 h-8 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 flex items-center justify-center text-red-600 cursor-pointer" title="Xóa ảnh">
                          <span class="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>

                      <div class="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-[#7C3AED] text-[11px] font-medium flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[15px]">touch_app</span>
                        <span>Chạm vào ảnh trên canvas để phóng to, thu nhỏ và xoay bằng khung Transformer!</span>
                      </div>
                    </div>
                  }

                  @if (formErrors.image) {
                    <div class="text-[11px] text-red-600 font-medium flex items-center gap-1">
                      <span class="material-symbols-outlined text-[14px]">error</span>
                      <span>{{ formErrors.image }}</span>
                    </div>
                  }
                </div>
              }

              <!-- DRAWER 4: STICKERS (DYNAMIC FROM ADMIN & DATABASE) -->
              @if (activeToolTab() === 'STICKER') {
                <div class="space-y-4 animate-fade-in">
                  <!-- Sticker Grid -->
                  <div class="grid grid-cols-4 sm:grid-cols-5 gap-2 pr-1">
                    @for (stk of dynamicStickers(); track stk._id || stk.name) {
                      <button 
                        (click)="toggleSticker(stk)"
                        class="p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition-all cursor-pointer"
                        [ngClass]="isStickerActive(stk.name) ? 'border-[#7C3AED] bg-purple-50 shadow-xs ring-2 ring-purple-200' : 'border-slate-100 hover:border-purple-200 bg-slate-50/70'"
                      >
                        <span class="text-2xl select-none">{{ stk.icon }}</span>
                        <span class="text-[9px] text-slate-600 truncate w-full text-center">{{ stk.name }}</span>
                      </button>
                    }
                  </div>
                </div>
              }

              <!-- DRAWER 5: PATTERNS -->
              @if (activeToolTab() === 'PATTERN') {
                <div class="space-y-4 animate-fade-in">
                  <div class="grid grid-cols-2 gap-2.5">
                    @for (pat of patternLibrary; track pat.id) {
                      <button 
                        (click)="setPattern(pat.id)"
                        class="p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between"
                        [ngClass]="selectedPattern() === pat.id ? 'border-[#7C3AED] bg-purple-50 text-[#7C3AED] font-bold shadow-xs' : 'border-slate-200 hover:border-slate-300 text-slate-700'"
                      >
                        <div class="flex items-center gap-2">
                          <span class="material-symbols-outlined text-[18px] text-[#7C3AED]">{{ pat.icon }}</span>
                          <span class="text-xs font-semibold">{{ pat.name }}</span>
                        </div>
                        <div class="text-[10px] text-slate-500 mt-2">
                          {{ pat.surcharge === 0 ? 'Miễn phí' : '+15.000đ' }}
                        </div>
                      </button>
                    }
                  </div>
                </div>
              }

              <!-- DRAWER 6: PRICE SUMMARY & SPECIFICATION -->
              @if (activeToolTab() === 'SUMMARY') {
                <div class="space-y-4 animate-fade-in">
                  <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div class="flex items-center justify-between text-slate-600">
                      <span>Giá phôi gốc ({{ activeTemplate()?.name }}):</span>
                      <strong class="text-slate-800">{{ baseProductPrice() | number:'1.0-0' }}đ</strong>
                    </div>
                    @for (sc of surchargeList(); track sc.label) {
                      <div class="flex items-center justify-between text-[#7C3AED]">
                        <span>+ {{ sc.label }}:</span>
                        <strong class="font-bold">+{{ sc.amount | number:'1.0-0' }}đ</strong>
                      </div>
                    }
                    <div class="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-sm text-[#1E1B4B]">
                      <span>Giá cuối cùng:</span>
                      <span class="text-[#7C3AED] font-extrabold text-base">{{ finalProductPrice() | number:'1.0-0' }}đ</span>
                    </div>
                    <div class="flex items-center justify-between font-bold text-xs text-[#10B981]">
                      <span>Cọc trước 50%:</span>
                      <span>{{ depositPrice() | number:'1.0-0' }}đ</span>
                    </div>
                    <div class="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Còn lại COD nhận hàng:</span>
                      <span>{{ (finalProductPrice() - depositPrice()) | number:'1.0-0' }}đ</span>
                    </div>
                  </div>
                </div>
              }

            </div>

            <!-- C. STICKY BOTTOM CHECKOUT CTA BAR (Always Visible) -->
            <div class="p-3.5 sm:p-4 border-t border-slate-200 bg-gradient-to-t from-purple-50/40 via-white to-white shrink-0 shadow-[0_-4px_14px_rgba(0,0,0,0.05)] z-10">
              <!-- Realtime Price & Deposit callout -->
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-baseline gap-1.5">
                  <span class="text-xs text-slate-500 font-medium">Giá sản phẩm:</span>
                  <span class="text-base sm:text-lg font-black text-[#7C3AED] leading-none">
                    {{ finalProductPrice() | number:'1.0-0' }}đ
                  </span>
                  @if (surchargeList().length > 0) {
                    <span class="text-[10px] text-purple-600 bg-purple-100 font-bold px-1.5 py-0.5 rounded-md hidden sm:inline">
                      +{{ (finalProductPrice() - baseProductPrice()) | number:'1.0-0' }}đ
                    </span>
                  }
                </div>
                
                <div class="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span class="material-symbols-outlined text-[13px]">payments</span>
                  <span>Cọc 50%: {{ depositPrice() | number:'1.0-0' }}đ</span>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex items-center gap-2">
                <button 
                  (click)="onPrimaryActionClick()"
                  class="flex-1 py-2.5 px-3 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer active:scale-[0.99]"
                  [ngClass]="isFormInvalid() ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-[#7C3AED] to-[#9333EA] hover:from-[#6D28D9] hover:to-[#7E22CE] shadow-purple-300'"
                >
                  <span class="material-symbols-outlined text-[17px]">shopping_bag</span>
                  <span>{{ isEditingCartItem() ? 'Cập Nhật Giỏ Hàng' : 'Thêm Vào Giỏ & Cọc 50%' }}</span>
                </button>

                <button 
                  (click)="activeToolTab.set('SUMMARY')"
                  class="px-2.5 py-2.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-slate-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                  title="Xem bảng chiết tính giá chi tiết"
                >
                  <span class="material-symbols-outlined text-[16px] text-[#7C3AED]">receipt_long</span>
                  <span class="hidden sm:inline">Bảng giá</span>
                </button>
              </div>

              <!-- Trust Assurance Note -->
              <div class="flex items-center justify-between text-[10px] text-slate-400 mt-1 px-0.5">
                <span class="flex items-center gap-1">
                  <span class="material-symbols-outlined text-[11px] text-emerald-500">verified</span>
                  <span>Chuẩn phôi 100%</span>
                </span>
                <span>Cọc 50% an tâm</span>
              </div>
            </div>

          </div>
        </div>

        <!-- ================= ZONE 2: CENTRAL INTERACTIVE KONVA.JS STAGE (7 COLS) ================= -->
        <div class="lg:col-span-7 flex flex-col h-full min-h-0 overflow-hidden">
          <div class="bg-white rounded-2xl sm:rounded-3xl p-2 sm:p-2.5 shadow-shop-card border border-[#DDD6FE] flex flex-col items-center justify-between relative overflow-hidden h-full min-h-0">
            
            <!-- Canvas Floating Controls Header -->
            <div class="w-full flex flex-wrap items-center justify-between gap-1.5 mb-1 shrink-0 z-10">
              <!-- Front / Back Face Switcher (AC8 & AC9) -->
              <div class="flex items-center gap-1 bg-slate-100 p-0.5 sm:p-1 rounded-2xl shadow-inner border border-slate-200">
                <button 
                  (click)="switchFace(true)"
                  class="flex items-center gap-1 text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 rounded-xl transition cursor-pointer"
                  [ngClass]="isFrontFace() ? 'bg-white text-[#7C3AED] shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
                >
                  <span class="material-symbols-outlined text-[15px]">flip_to_front</span>
                  <span>Mặt Trước</span>
                </button>
                <button 
                  (click)="switchFace(false)"
                  class="flex items-center gap-1 text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 rounded-xl transition cursor-pointer"
                  [ngClass]="!isFrontFace() ? 'bg-white text-[#7C3AED] shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
                >
                  <span class="material-symbols-outlined text-[15px]">flip_to_back</span>
                  <span>Mặt Sau</span>
                </button>
              </div>

              <!-- SLIM WARNING PILL IN TOOLBAR (DOES NOT OVERLAP CANVAS) -->
              @if (isOverflowWarning()) {
                <div class="flex items-center gap-1.5 bg-amber-50 border border-amber-300 text-amber-900 px-2.5 py-0.5 rounded-full text-[11px] shadow-2xs animate-fade-in shrink-0">
                  <span class="material-symbols-outlined text-amber-600 text-[14px] shrink-0">warning</span>
                  <span class="font-bold text-amber-800 text-[10.5px] truncate max-w-[180px] sm:max-w-none">{{ overflowWarningTarget() || 'Phần tử' }} chạm mép cong</span>
                  <button 
                    (click)="fitIntoSafeArea()" 
                    class="ml-0.5 px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[9px] rounded-md cursor-pointer transition flex items-center gap-0.5 shrink-0"
                    title="Căn phần tử vừa vặn trong Vùng An Toàn"
                  >
                    <span class="material-symbols-outlined text-[11px]">fit_screen</span>
                    <span>Căn an toàn</span>
                  </button>
                </div>
              }

              <!-- Quick action icon buttons -->
              <div class="flex items-center gap-1 flex-wrap">
                @if (selectedNodeName()) {
                  <div class="flex items-center gap-1 bg-purple-50 text-[#7C3AED] px-2 py-0.5 rounded-lg text-[11px] font-bold border border-purple-200 animate-fade-in">
                    <span class="material-symbols-outlined text-[13px]">touch_app</span>
                    <span class="truncate max-w-[80px]">{{ selectedNodeName() }}</span>
                  </div>
                  <!-- Layer order buttons -->
                  <button 
                    (click)="bringForward()" 
                    class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-[#7C3AED] flex items-center justify-center transition cursor-pointer" 
                    title="Đưa lên trên (Bring Forward)"
                  >
                    <span class="material-symbols-outlined text-[15px]">vertical_align_top</span>
                  </button>
                  <button 
                    (click)="sendBackward()" 
                    class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-[#7C3AED] flex items-center justify-center transition cursor-pointer" 
                    title="Đưa xuống dưới (Send Backward)"
                  >
                    <span class="material-symbols-outlined text-[15px]">vertical_align_bottom</span>
                  </button>
                }

                <!-- Zoom Controls -->
                <div class="hidden sm:flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button 
                    (click)="setZoom(0.85)" 
                    class="px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer"
                    [ngClass]="canvasZoom() === 0.85 ? 'bg-white text-[#7C3AED] shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
                    title="Thu nhỏ 85%"
                  >85%</button>
                  <button 
                    (click)="setZoom(1.0)" 
                    class="px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer"
                    [ngClass]="canvasZoom() === 1.0 ? 'bg-white text-[#7C3AED] shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
                    title="Kích thước chuẩn"
                  >100%</button>
                  <button 
                    (click)="setZoom(1.15)" 
                    class="px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer"
                    [ngClass]="canvasZoom() === 1.15 ? 'bg-white text-[#7C3AED] shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
                    title="Phóng to 115%"
                  >115%</button>
                </div>

                <!-- Guides & Safe Area Controls -->
                <button 
                  (click)="toggleGuides()" 
                  class="w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer"
                  [ngClass]="showGuides() ? 'bg-purple-100 text-[#7C3AED]' : 'bg-slate-100 text-slate-400 hover:text-slate-600'"
                  [title]="showGuides() ? 'Đang hiện Khung in (Bấm để ẩn)' : 'Đang ẩn Khung in (Bấm để hiện)'"
                >
                  <span class="material-symbols-outlined text-[15px]">{{ showGuides() ? 'crop_free' : 'crop' }}</span>
                </button>
                <button 
                  (click)="fitIntoSafeArea()" 
                  class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 flex items-center justify-center transition cursor-pointer"
                  title="Căn phần tử vào Vùng An Toàn"
                >
                  <span class="material-symbols-outlined text-[15px]">aspect_ratio</span>
                </button>

                <button 
                  (click)="centerSelectedNode()" 
                  class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-[#7C3AED] flex items-center justify-center transition cursor-pointer"
                  title="Căn giữa đối tượng"
                >
                  <span class="material-symbols-outlined text-[15px]">filter_center_focus</span>
                </button>
                <button 
                  (click)="deleteSelectedNode()" 
                  class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 flex items-center justify-center transition cursor-pointer"
                  title="Xóa đối tượng đang chọn"
                >
                  <span class="material-symbols-outlined text-[15px]">delete</span>
                </button>
                <button 
                  (click)="downloadSnapshot()" 
                  class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-600 flex items-center justify-center transition cursor-pointer"
                  title="Tải ảnh mô phỏng 1:1"
                >
                  <span class="material-symbols-outlined text-[15px]">download</span>
                </button>
                <button 
                  (click)="resetToDefaults()" 
                  class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
                  title="Đặt lại mặc định"
                >
                  <span class="material-symbols-outlined text-[15px]">restart_alt</span>
                </button>
              </div>
            </div>

            <!-- KONVA.JS CANVAS STAGE CONTAINER (Flex-1 Responsive wrapper) -->
            <div #stageWrapper class="relative w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden my-0.5">
              <div 
                #konvaContainer
                id="konva-container"
                class="rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-2 relative cursor-crosshair transition-all"
                [ngClass]="isOverflowWarning() ? 'border-amber-400 ring-2 ring-amber-200' : 'border-purple-100'"
                [style.backgroundColor]="getColorCanvasBackground()"
                [style.backgroundImage]="getActivePatternCss()"
              >
              </div>

              <!-- Canvas floating watermark -->
              <div class="absolute top-2 right-2 bg-white/90 backdrop-blur-md rounded-md px-2 py-0.5 text-[9px] font-bold text-slate-700 border border-slate-200/80 shadow-2xs flex items-center gap-1 pointer-events-none z-10">
                <span class="w-1.5 h-1.5 rounded-full" [ngClass]="isOverflowWarning() ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'"></span>
                <span>Konva • {{ isFrontFace() ? 'Mặt Trước' : 'Mặt Sau' }}</span>
              </div>
            </div>

            <!-- PRINT AREA & SAFE AREA GUIDES LEGEND -->
            <div class="w-full flex items-center justify-between text-[10px] text-slate-500 pt-0.5 pb-0.5 px-1 shrink-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="inline-flex items-center gap-1 text-[#7C3AED] font-semibold text-[9.5px]">
                  <span class="w-2 h-2 border border-dashed border-[#7C3AED] rounded-xs inline-block"></span>
                  Vùng in: {{ currentPrintArea().width }}% × {{ currentPrintArea().height }}%
                </span>
                <span>•</span>
                <span class="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[9.5px]">
                  <span class="w-2 h-2 border border-dashed border-emerald-600 rounded-xs inline-block"></span>
                  Vùng an toàn: {{ currentSafeArea().width }}% × {{ currentSafeArea().height }}%
                </span>
              </div>
              <button 
                (click)="toggleGuides()" 
                class="text-[9.5px] font-bold text-[#7C3AED] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span class="material-symbols-outlined text-[12px]">{{ showGuides() ? 'visibility' : 'visibility_off' }}</span>
                <span>{{ showGuides() ? 'Ẩn khung' : 'Hiện khung' }}</span>
              </button>
            </div>

            <!-- Canvas Bottom Meta Info Bar -->
            <div class="w-full flex items-center justify-between text-xs pt-1.5 border-t border-slate-100 text-slate-500 shrink-0">
              <div class="flex items-center gap-2.5 text-[10px] sm:text-[11px]">
                <span>Vỏ: <strong class="text-[#7C3AED]">{{ selectedColor() }}</strong></span>
                <span>•</span>
                <span>Font: <strong class="text-[#7C3AED]">{{ selectedFont() }}</strong></span>
                <span>•</span>
                <span>Khắc: <strong class="text-[#7C3AED]">{{ selectedEngraveColor() }}</strong></span>
              </div>
              <div class="text-[10px] text-slate-400 hidden sm:block">
                Kéo thả / xoay chỉnh trực quan
              </div>
            </div>

          </div>
        </div>

      </div>

      <!-- ================= MODALS ================= -->

      <!-- MODAL 1: Save Design Login Modal (AC12 / AF2) -->
      @if (showSaveLoginModal()) {
        <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-purple-200 relative">
            <button (click)="showSaveLoginModal.set(false)" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <span class="material-symbols-outlined">close</span>
            </button>

            <div class="w-12 h-12 rounded-2xl bg-purple-100 text-[#7C3AED] flex items-center justify-center mb-4">
              <span class="material-symbols-outlined text-2xl">loyalty</span>
            </div>

            <h3 class="text-lg font-bold text-[#1E1B4B] mb-1">Lưu Vĩnh Viễn & Nhận +50 Điểm Thưởng</h3>
            <p class="text-xs text-slate-500 mb-5 leading-relaxed">
              Bạn đang ở chế độ Khách vãng lai. Đăng nhập 1-Click để lưu bản thiết kế vào tài khoản vĩnh viễn và nhận ngay <strong class="text-[#7C3AED]">+50 điểm tích lũy Giftory</strong>!
            </p>

            <div class="space-y-3">
              <button 
                (click)="performQuickLoginAndSync('google')"
                class="w-full py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="Google" class="w-4 h-4">
                <span>Đăng nhập 1-Click với Google</span>
              </button>

              <button 
                (click)="performQuickLoginAndSync('otp')"
                class="w-full py-3 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#7C3AED] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span class="material-symbols-outlined text-[18px]">smartphone</span>
                <span>Xác thực nhanh bằng Số điện thoại OTP</span>
              </button>

              <div class="text-center pt-2">
                <a routerLink="/login" class="text-xs text-slate-500 hover:text-[#7C3AED] font-medium underline">
                  Đến trang Đăng nhập / Đăng ký chi tiết
                </a>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- MODAL 2: Guest Add to Cart Choice Modal (AC13 / AF3) -->
      @if (showGuestChoiceModal()) {
        <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-purple-200 relative">
            <button (click)="showGuestChoiceModal.set(false)" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <span class="material-symbols-outlined">close</span>
            </button>

            <div class="w-12 h-12 rounded-2xl bg-[#7C3AED] text-white flex items-center justify-center mb-4 shadow-md">
              <span class="material-symbols-outlined text-2xl">verified</span>
            </div>

            <h3 class="text-xl font-bold text-[#1E1B4B] mb-2">Đưa Thiết Kế Vào Giỏ Hàng</h3>
            <p class="text-xs text-slate-500 mb-6 leading-relaxed">
              Bản thiết kế độc bản đã được tạo thành công! Hãy lựa chọn cách thức tiếp tục theo mong muốn của bạn:
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <!-- Choice 1: 1-Click Login & Sync (AC 13.1) -->
              <div 
                (click)="handleGuestLoginAndSync()"
                class="p-4 rounded-2xl border-2 border-[#7C3AED] bg-purple-50/50 hover:bg-purple-50 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-bold text-[#7C3AED]">13.1. Đăng Nhập 1-Click</span>
                    <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold">+50 Điểm</span>
                  </div>
                  <p class="text-[11px] text-slate-600 leading-snug">
                    Kích hoạt <strong>SyncDesignDraft()</strong>, đồng bộ thiết kế vào tài khoản thành Member Cart Item.
                  </p>
                </div>
                <button class="mt-4 w-full py-2 bg-[#7C3AED] text-white rounded-xl text-xs font-bold">
                  Đăng nhập & Đồng bộ
                </button>
              </div>

              <!-- Choice 2: Continue as Guest (AC 13.2 / AF3) -->
              <div 
                (click)="handleContinueAsGuest()"
                class="p-4 rounded-2xl border-2 border-slate-200 hover:border-slate-300 bg-white transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-bold text-slate-700">13.2. Mua Dưới Dạng Khách</span>
                    <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold">Nhanh chóng</span>
                  </div>
                  <p class="text-[11px] text-slate-600 leading-snug">
                    Giữ nguyên thiết kế trong <strong>Guest Cart</strong> và chuyển thẳng sang luồng Checkout mà không cần tài khoản.
                  </p>
                </div>
                <button class="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold">
                  Tiếp tục làm Khách
                </button>
              </div>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class CustomStudioComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('konvaContainer') konvaContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('stageWrapper') stageWrapperRef?: ElementRef<HTMLDivElement>;
  private resizeObserver: ResizeObserver | null = null;

  private studioService = inject(CustomStudioService);
  private cartService = inject(CartService);
  authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Active Tool Tab in Left Drawer
  activeToolTab = signal<StudioToolTab>('TEXT');

  templates = signal<Product[]>([]);
  activeTemplate = signal<Product | null>(null);

  isFrontFace = signal<boolean>(true);
  frontMessage = signal<string>('');
  backMessage = signal<string>('');
  selectedColor = signal<string>('Navy Blue');
  selectedFont = signal<string>('Signature');
  selectedEngraveColor = signal<string>('Vàng Kim (Gold)');
  selectedPattern = signal<string>('none');
  uploadedImage = signal<string>('');
  imageScale = signal<number>(1);
  activeStickers = signal<Array<{ id: string; icon: string; name: string }>>([]);

  // Dynamic Stickers from Admin Asset API
  dynamicStickers = signal<StudioAsset[]>([]);

  // Editing state (AC14)
  isEditingCartItem = signal<boolean>(false);
  editingCartItemIndex = signal<number | null>(null);

  // Auto-save state (AC11)
  lastAutoSavedTime = signal<string>('');
  hasRestoredDraft = signal<boolean>(false);

  // Modals state
  showSaveLoginModal = signal<boolean>(false);
  showGuestChoiceModal = signal<boolean>(false);

  // Validation Form Errors (AC6, AC7, EF1)
  formErrors = {
    frontMessage: '',
    backMessage: '',
    image: ''
  };

  colorOptions = [
    { name: 'Navy Blue', hex: '#1E3A8A' },
    { name: 'Deep Slate', hex: '#0F172A' },
    { name: 'Sand Beige', hex: '#FEF3C7' },
    { name: 'Terracotta', hex: '#99443D' },
    { name: 'Pure White', hex: '#FFFFFF' },
    { name: 'Emerald Green', hex: '#065F46' }
  ];

  fontOptions = [
    { name: 'Signature', class: 'font-serif italic', fontFamily: 'Georgia, serif' },
    { name: 'Serif Elegant', class: 'font-serif font-bold uppercase', fontFamily: 'Times New Roman, serif' },
    { name: 'Sans Minimal', class: 'font-sans font-bold', fontFamily: 'Arial, sans-serif' },
    { name: 'Vintage Typewriter', class: 'font-mono', fontFamily: 'Courier New, monospace' },
    { name: 'Romantic Script', class: 'font-serif italic font-semibold', fontFamily: 'Brush Script MT, cursive, Georgia' },
    { name: 'Royal Calligraphy', class: 'font-serif uppercase tracking-widest', fontFamily: 'Palatino Linotype, serif' }
  ];

  engraveColors = [
    { name: 'Vàng Kim (Gold)', hex: '#F59E0B', surcharge: 10000 },
    { name: 'Bạc Ánh Kim (Silver)', hex: '#E2E8F0', surcharge: 0 },
    { name: 'Đen Huyền Bí', hex: '#0F172A', surcharge: 0 },
    { name: 'Đỏ Ruby', hex: '#DC2626', surcharge: 0 },
    { name: 'Vàng Hồng (Rose Gold)', hex: '#FB7185', surcharge: 10000 }
  ];

  patternLibrary: CustomPattern[] = [
    { id: 'none', name: 'Trơn Tối Giản', surcharge: 0, icon: 'crop_square', cssPattern: 'none' },
    { id: 'royal', name: 'Cung Đình Hoàng Gia', surcharge: 15000, icon: 'shield', cssPattern: 'radial-gradient(circle, #f59e0b 10%, transparent 20%), radial-gradient(circle, #f59e0b 10%, transparent 20%)' },
    { id: 'artdeco', name: 'Art Deco Hiện Đại', surcharge: 15000, icon: 'widgets', cssPattern: 'repeating-linear-gradient(45deg, #7c3aed 0, #7c3aed 1px, transparent 0, transparent 50%)' },
    { id: 'ginkgo', name: 'Lá Bạch Quả Ginkgo', surcharge: 15000, icon: 'eco', cssPattern: 'radial-gradient(circle at 50% 50%, #10b981 1px, transparent 1px)' },
    { id: 'floral', name: 'Vintage Floral', surcharge: 15000, icon: 'local_florist', cssPattern: 'repeating-radial-gradient(circle, #ec4899 0, #ec4899 1px, transparent 2px, transparent 100%)' },
    { id: 'stars', name: 'Thiên Hà Celestial', surcharge: 15000, icon: 'auto_awesome', cssPattern: 'radial-gradient(2px 2px at 20px 30px, #eee, rgba(0,0,0,0)), radial-gradient(2px 2px at 40px 70px, #fff, rgba(0,0,0,0))' }
  ];

  // ================= KONVA.JS STATE & SIGNALS =================
  textSize = signal<number>(14);
  textAlign = signal<'left' | 'center' | 'right'>('center');
  isTextBold = signal<boolean>(false);
  isTextItalic = signal<boolean>(true);
  selectedNodeName = signal<string | null>(null);
  canvasZoom = signal<number>(1);

  // Print Area & Safe Area Guides (BP-02 & Curved Edge error prevention)
  showGuides = signal<boolean>(true);
  isOverflowWarning = signal<boolean>(false);
  overflowWarningTarget = signal<string>('');
  overflowWarningMessage = signal<string>('');

  currentPrintArea = computed<AreaBox>(() => {
    const raw = this.activeTemplate()?.customConfig?.printArea;
    const x = Math.max(0, Math.min(90, raw?.x ?? 20));
    const y = Math.max(0, Math.min(90, raw?.y ?? 20));
    const width = Math.max(10, Math.min(100 - x, raw?.width ?? 60));
    const height = Math.max(10, Math.min(100 - y, raw?.height ?? 60));
    return { x, y, width, height };
  });

  currentSafeArea = computed<AreaBox>(() => {
    const raw = this.activeTemplate()?.customConfig?.safeArea;
    const x = Math.max(0, Math.min(90, raw?.x ?? 26));
    const y = Math.max(0, Math.min(90, raw?.y ?? 25));
    const width = Math.max(10, Math.min(100 - x, raw?.width ?? 48));
    const height = Math.max(10, Math.min(100 - y, raw?.height ?? 50));
    return { x, y, width, height };
  });

  // Kích thước và tọa độ hiển thị chuẩn của phôi trên canvas (bảo toàn tỷ lệ gốc aspect ratio)
  private currentMockupBounds = { x: 20, y: 20, width: 420, height: 420 };

  getGuideCoordinates(): { paPx: AreaBox; saPx: AreaBox } {
    const b = this.currentMockupBounds;
    const pa = this.currentPrintArea();
    const sa = this.currentSafeArea();

    const paPx = {
      x: Math.round(b.x + (pa.x / 100) * b.width),
      y: Math.round(b.y + (pa.y / 100) * b.height),
      width: Math.round((pa.width / 100) * b.width),
      height: Math.round((pa.height / 100) * b.height)
    };

    const saPx = {
      x: Math.round(b.x + (sa.x / 100) * b.width),
      y: Math.round(b.y + (sa.y / 100) * b.height),
      width: Math.round((sa.width / 100) * b.width),
      height: Math.round((sa.height / 100) * b.height)
    };

    return { paPx, saPx };
  }

  private stage: Konva.Stage | null = null;
  private bgLayer: Konva.Layer | null = null;
  private drawLayer: Konva.Layer | null = null;
  private guidesLayer: Konva.Layer | null = null;
  private uiLayer: Konva.Layer | null = null;

  private printAreaRect: Konva.Rect | null = null;
  private printAreaLabel: Konva.Text | null = null;
  private safeAreaRect: Konva.Rect | null = null;
  private safeAreaLabel: Konva.Text | null = null;

  private bgRectNode: Konva.Rect | null = null;
  private productImgNode: Konva.Image | null = null;
  private textNode: Konva.Text | null = null;
  private photoNode: Konva.Image | null = null;
  private stickerNodes: Konva.Text[] = [];
  private transformer: Konva.Transformer | null = null;

  maxTextLength = computed(() => {
    return this.activeTemplate()?.customConfig?.maxTextLength || 35;
  });

  availableColorOptions = computed(() => {
    const tpl = this.activeTemplate();
    if (tpl?.variants && tpl.variants.length > 0) {
      return tpl.variants
        .filter(v => v.status !== 'HIDDEN')
        .map(v => ({
          name: v.name,
          hex: v.colorHex || '#1E1B4B',
          sku: v.sku || '',
          price: v.price,
          stock: v.stock ?? 0,
          image: v.image,
          isOutOfStock: (v.stock ?? 0) <= 0 || v.status === 'OUT_OF_STOCK'
        }));
    }
    const supported = tpl?.customConfig?.supportedColors;
    if (supported && supported.length > 0) {
      return this.colorOptions
        .filter(c => supported.includes(c.name))
        .map(c => ({ ...c, sku: '', isOutOfStock: false }));
    }
    return this.colorOptions.map(c => ({ ...c, sku: '', isOutOfStock: false }));
  });

  baseProductPrice = computed(() => {
    const tpl = this.activeTemplate();
    const matchedVariant = tpl?.variants?.find(v => v.name === this.selectedColor());
    if (matchedVariant?.price && matchedVariant.price > 0) {
      return matchedVariant.price;
    }
    return tpl?.salePrice && tpl.salePrice > 0 ? tpl.salePrice : (tpl?.price || 250000);
  });

  surchargeList = computed<SurchargeBreakdown[]>(() => {
    const list: SurchargeBreakdown[] = [];
    const tpl = this.activeTemplate();

    const backFee = tpl?.customConfig?.backEngraveFee || 20000;
    if (this.backMessage().trim().length > 0) {
      list.push({ label: 'Khắc laser mặt sau', amount: backFee });
    }

    const pat = this.patternLibrary.find(p => p.id === this.selectedPattern());
    if (pat && pat.surcharge > 0) {
      list.push({ label: `Họa tiết ${pat.name}`, amount: pat.surcharge });
    }

    const photoFee = tpl?.customConfig?.photoPrintFee || 30000;
    if (this.uploadedImage()) {
      list.push({ label: 'In ảnh cá nhân chuẩn HD', amount: photoFee });
    }

    const ec = this.engraveColors.find(e => e.name === this.selectedEngraveColor());
    if (ec && ec.surcharge > 0) {
      list.push({ label: `Phủ ánh kim ${ec.name}`, amount: ec.surcharge });
    }

    return list;
  });

  totalSurcharges = computed(() => {
    return this.surchargeList().reduce((sum, item) => sum + item.amount, 0);
  });

  finalProductPrice = computed(() => {
    return this.baseProductPrice() + this.totalSurcharges();
  });

  depositPrice = computed(() => Math.round(this.finalProductPrice() * 0.5));

  constructor() {
    effect(() => {
      const tpl = this.activeTemplate();
      const front = this.frontMessage();
      const back = this.backMessage();
      const col = this.selectedColor();
      const font = this.selectedFont();
      const engCol = this.selectedEngraveColor();
      const pat = this.selectedPattern();
      const img = this.uploadedImage();
      const scale = this.imageScale();
      const stks = this.activeStickers();

      if (tpl && !this.isEditingCartItem()) {
        const draft = {
          productId: tpl._id,
          frontMessage: front,
          backMessage: back,
          selectedColor: col,
          selectedFont: font,
          selectedEngraveColor: engCol,
          selectedPattern: pat,
          uploadedImage: img,
          imageScale: scale,
          stickers: stks
        };
        this.studioService.saveDraftToStorage(draft);
        const now = new Date();
        this.lastAutoSavedTime.set(`${now.getHours()}:${now.getMinutes() < 10 ? '0' : ''}${now.getMinutes()}`);
      }
    });
  }

  ngOnInit(): void {
    this.loadStudioAssets();

    this.studioService.getTemplates().subscribe({
      next: tpls => {
        this.templates.set(tpls);
        if (tpls.length > 0) {
          this.route.queryParams.subscribe(params => {
            const pid = params['productId'];
            const cartIndex = params['cartItemIndex'];

            if (cartIndex !== undefined && cartIndex !== null) {
              const idx = parseInt(cartIndex, 10);
              this.isEditingCartItem.set(true);
              this.editingCartItemIndex.set(idx);

              const cartItem = this.cartService.items()[idx];
              if (cartItem) {
                const matched = tpls.find(t => t._id === (typeof cartItem.productId === 'object' ? cartItem.productId._id : cartItem.productId));
                if (matched) this.activeTemplate.set(matched);

                if (cartItem.customDetails) {
                  const cd = cartItem.customDetails;
                  if (cd.frontMessage !== undefined) this.frontMessage.set(cd.frontMessage);
                  if (cd.backMessage !== undefined) this.backMessage.set(cd.backMessage);
                  if (cd.selectedColor) this.selectedColor.set(cd.selectedColor);
                  if (cd.fontFamily) this.selectedFont.set(cd.fontFamily);
                  if (cd.engraveColor) this.selectedEngraveColor.set(cd.engraveColor);
                  if (cd.pattern) this.selectedPattern.set(cd.pattern);
                  if (cd.uploadedImage) this.uploadedImage.set(cd.uploadedImage);
                  if (cd.imageScale) this.imageScale.set(cd.imageScale);
                  if (cd.stickers) this.activeStickers.set(cd.stickers);
                }
                this.updateKonvaCanvas();
                return;
              }
            }

            let chosenTpl = tpls[0];
            if (pid) {
              const matched = tpls.find(t => t._id === pid);
              if (matched) chosenTpl = matched;
            }

            this.activeTemplate.set(chosenTpl);

            const savedDraft = this.studioService.getDraftFromStorage();
            if (savedDraft && (!pid || savedDraft.productId === pid)) {
              if (savedDraft.frontMessage === 'Happy Anniversary Minh Anh ❤️') {
                this.studioService.clearDraftFromStorage();
              } else {
                if (savedDraft.frontMessage !== undefined) this.frontMessage.set(savedDraft.frontMessage);
                if (savedDraft.backMessage !== undefined) this.backMessage.set(savedDraft.backMessage);
                if (savedDraft.selectedColor) this.selectedColor.set(savedDraft.selectedColor);
                if (savedDraft.selectedFont) this.selectedFont.set(savedDraft.selectedFont);
                if (savedDraft.selectedEngraveColor) this.selectedEngraveColor.set(savedDraft.selectedEngraveColor);
                if (savedDraft.selectedPattern) this.selectedPattern.set(savedDraft.selectedPattern);
                if (savedDraft.uploadedImage) this.uploadedImage.set(savedDraft.uploadedImage);
                if (savedDraft.imageScale) this.imageScale.set(savedDraft.imageScale);
                if (savedDraft.stickers) this.activeStickers.set(savedDraft.stickers);
                this.hasRestoredDraft.set(true);
                setTimeout(() => this.hasRestoredDraft.set(false), 4500);
              }
            }

            this.updateKonvaCanvas();
          });
        }
      }
    });
  }

  ngAfterViewInit(): void {
    this.initKonvaStage();
    this.fitStageToWrapper();

    if (typeof ResizeObserver !== 'undefined' && this.stageWrapperRef) {
      this.resizeObserver = new ResizeObserver(() => {
        this.fitStageToWrapper();
      });
      this.resizeObserver.observe(this.stageWrapperRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.stage) {
      this.stage.destroy();
    }
  }

  fitStageToWrapper(): void {
    if (!this.stage || !this.stageWrapperRef) return;
    const wrapper = this.stageWrapperRef.nativeElement;
    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;
    if (w <= 0 || h <= 0) return;

    // Available size for square canvas (leave 8px padding)
    const availableSize = Math.max(160, Math.min(w - 8, h - 8, 460));
    const baseScale = availableSize / 460;
    const zoom = this.canvasZoom();
    const finalScale = baseScale * zoom;

    this.stage.width(availableSize);
    this.stage.height(availableSize);
    this.stage.scale({ x: finalScale, y: finalScale });
    this.stage.batchDraw();
  }

  // ================= KONVA.JS INITIALIZATION =================
  private initKonvaStage(): void {
    if (!this.konvaContainerRef) return;
    const container = this.konvaContainerRef.nativeElement;

    const width = 460;
    const height = 460;

    this.stage = new Konva.Stage({
      container: container,
      width: width,
      height: height
    });

    this.bgLayer = new Konva.Layer();
    this.drawLayer = new Konva.Layer();
    this.guidesLayer = new Konva.Layer({ listening: false });
    this.uiLayer = new Konva.Layer();

    this.stage.add(this.bgLayer);
    this.stage.add(this.drawLayer);
    this.stage.add(this.guidesLayer);
    this.stage.add(this.uiLayer);

    // Transformer for interactive dragging, scaling, rotating
    this.transformer = new Konva.Transformer({
      borderStroke: '#7C3AED',
      borderStrokeWidth: 1.5,
      anchorStroke: '#7C3AED',
      anchorFill: '#FFFFFF',
      anchorSize: 10,
      anchorCornerRadius: 3,
      padding: 4,
      rotateEnabled: true,
      rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
    });
    this.uiLayer.add(this.transformer);

    // Update overflow check when transforming
    this.transformer.on('transform transformend', () => {
      this.checkOverflowWarning();
    });

    // Deselect when clicking on stage empty area or background
    this.stage.on('click tap', (e) => {
      if (e.target === this.stage || e.target === this.productImgNode || e.target === this.bgRectNode) {
        this.transformer?.nodes([]);
        this.selectedNodeName.set(null);
        this.uiLayer?.batchDraw();
      }
    });

    // Initial render of product blank and text
    this.updateKonvaCanvas();
  }

  private updateKonvaCanvas(): void {
    if (!this.stage || !this.bgLayer || !this.drawLayer) return;

    // 0. Render Canvas Background Base on bgLayer
    if (!this.bgRectNode) {
      this.bgRectNode = new Konva.Rect({
        x: 0,
        y: 0,
        width: 460,
        height: 460,
        fill: this.getColorCanvasBackground(),
        cornerRadius: 24,
        listening: false
      });
      this.bgLayer.add(this.bgRectNode);
    } else {
      this.bgRectNode.fill(this.getColorCanvasBackground());
    }

    // 1. Render Product Blank Image on bgLayer
    const blankUrl = this.getCurrentBlankImage();
    const imageObj = new Image();
    imageObj.crossOrigin = 'Anonymous';
    imageObj.onload = () => {
      if (!this.bgLayer) return;

      const stageW = 460;
      const stageH = 460;
      const padding = 15;
      const maxW = stageW - padding * 2;
      const maxH = stageH - padding * 2;

      const natW = imageObj.naturalWidth || 420;
      const natH = imageObj.naturalHeight || 420;

      // Giữ nguyên kích thước và tỉ lệ chuẩn của phôi (aspect-ratio contain, không làm méo phôi)
      const scale = Math.min(maxW / natW, maxH / natH);
      const dispW = Math.round(natW * scale);
      const dispH = Math.round(natH * scale);
      const dispX = Math.round((stageW - dispW) / 2);
      const dispY = Math.round((stageH - dispH) / 2);

      this.currentMockupBounds = { x: dispX, y: dispY, width: dispW, height: dispH };

      if (!this.productImgNode) {
        this.productImgNode = new Konva.Image({
          x: dispX,
          y: dispY,
          image: imageObj,
          width: dispW,
          height: dispH,
          listening: true
        });
        this.bgLayer.add(this.productImgNode);
      } else {
        this.productImgNode.setAttrs({
          x: dispX,
          y: dispY,
          image: imageObj,
          width: dispW,
          height: dispH
        });
      }
      this.bgLayer.batchDraw();

      // Đồng bộ vẽ khung hướng dẫn theo kích thước chuẩn của phôi
      this.renderGuidesOnKonva();
      this.checkOverflowWarning();
    };
    imageObj.src = blankUrl;

    // 2. Render Laser Engraved Text on drawLayer
    const engraveColorCode = this.getEngraveColorCode();
    const fontObj = this.fontOptions.find(f => f.name === this.selectedFont());
    const fontFamily = fontObj ? fontObj.fontFamily : 'Georgia, serif';
    const message = (this.isFrontFace() ? this.frontMessage() : this.backMessage()).trim();
    const fontStyleStr = ((this.isTextBold() ? 'bold ' : '') + (this.isTextItalic() ? 'italic' : 'normal')).trim();

    if (this.textNode) {
      if (message) {
        this.textNode.text(message);
        this.textNode.fontFamily(fontFamily);
        this.textNode.fontSize(this.textSize());
        this.textNode.align(this.textAlign());
        this.textNode.fontStyle(fontStyleStr);
        this.textNode.fill(engraveColorCode);
        this.textNode.shadowColor(engraveColorCode);
        this.textNode.show();
      } else {
        this.textNode.text('');
        this.textNode.hide();
        if (this.transformer?.nodes().includes(this.textNode)) {
          this.transformer.nodes([]);
        }
      }
    } else if (message) {
      const { saPx } = this.getGuideCoordinates();
      const textWidth = Math.min(220, saPx.width * 0.85);
      const textX = Math.round(saPx.x + (saPx.width - textWidth) / 2);
      const textY = Math.round(saPx.y + saPx.height * 0.5 - 12);

      this.textNode = new Konva.Text({
        x: textX,
        y: textY,
        text: message,
        fontSize: this.textSize(),
        fontFamily: fontFamily,
        fontStyle: fontStyleStr,
        fill: engraveColorCode,
        width: textWidth,
        align: this.textAlign(),
        shadowColor: engraveColorCode,
        shadowBlur: 3,
        shadowOpacity: 0.4,
        draggable: true
      });
      this.makeDraggableAndSelectable(this.textNode, 'Chữ Khắc');
      this.drawLayer.add(this.textNode);
    }

    // 3. Render Photo Node if uploaded
    if (this.uploadedImage()) {
      const photoImg = new Image();
      photoImg.onload = () => {
        if (!this.drawLayer) return;

        if (!this.photoNode) {
          this.photoNode = new Konva.Image({
            x: 180,
            y: 90,
            image: photoImg,
            width: 100,
            height: 90,
            stroke: 'rgba(245, 158, 11, 0.7)',
            strokeWidth: 1.5,
            cornerRadius: 12,
            shadowColor: 'black',
            shadowBlur: 8,
            shadowOpacity: 0.4,
            draggable: true
          });
          this.makeDraggableAndSelectable(this.photoNode, 'Ảnh Cá Nhân');
          this.drawLayer.add(this.photoNode);
        } else {
          this.photoNode.image(photoImg);
          this.photoNode.show();
        }
        this.drawLayer.batchDraw();
        this.checkOverflowWarning();
      };
      photoImg.src = this.uploadedImage();
    } else if (this.photoNode) {
      this.photoNode.hide();
    }

    // 4. Render Stickers
    this.renderStickersOnKonva();

    // 5. Render Print Area & Safe Area Guides
    this.renderGuidesOnKonva();
    this.checkOverflowWarning();

    this.drawLayer.batchDraw();
    this.uiLayer?.batchDraw();
  }

  private renderGuidesOnKonva(): void {
    if (!this.guidesLayer) return;

    if (!this.showGuides()) {
      this.guidesLayer.hide();
      this.guidesLayer.batchDraw();
      return;
    }
    this.guidesLayer.show();

    const { paPx, saPx } = this.getGuideCoordinates();

    // 1. Print Area Outline & Label
    if (!this.printAreaRect) {
      this.printAreaRect = new Konva.Rect({
        x: paPx.x,
        y: paPx.y,
        width: paPx.width,
        height: paPx.height,
        stroke: 'rgba(124, 58, 237, 0.45)',
        strokeWidth: 1.5,
        dash: [6, 4],
        cornerRadius: 8,
        listening: false
      });
      this.guidesLayer.add(this.printAreaRect);
    } else {
      this.printAreaRect.setAttrs({
        x: paPx.x,
        y: paPx.y,
        width: paPx.width,
        height: paPx.height
      });
    }

    if (!this.printAreaLabel) {
      this.printAreaLabel = new Konva.Text({
        x: paPx.x + 6,
        y: paPx.y + 4,
        text: 'VÙNG IN (PRINT AREA)',
        fontSize: 8,
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        fill: '#7C3AED',
        opacity: 0.7,
        listening: false
      });
      this.guidesLayer.add(this.printAreaLabel);
    } else {
      this.printAreaLabel.setAttrs({
        x: paPx.x + 6,
        y: paPx.y + 4
      });
    }

    // 2. Safe Area Outline & Label (Curved Edge boundaries)
    const safeStroke = this.isOverflowWarning() ? '#EF4444' : 'rgba(16, 185, 129, 0.75)';
    const safeWidth = this.isOverflowWarning() ? 2 : 1.5;

    if (!this.safeAreaRect) {
      this.safeAreaRect = new Konva.Rect({
        x: saPx.x,
        y: saPx.y,
        width: saPx.width,
        height: saPx.height,
        stroke: safeStroke,
        strokeWidth: safeWidth,
        dash: [4, 4],
        cornerRadius: 6,
        listening: false
      });
      this.guidesLayer.add(this.safeAreaRect);
    } else {
      this.safeAreaRect.setAttrs({
        x: saPx.x,
        y: saPx.y,
        width: saPx.width,
        height: saPx.height,
        stroke: safeStroke,
        strokeWidth: safeWidth
      });
    }

    const safeLabelY = Math.max(saPx.y + 12, saPx.y + saPx.height - 14);
    if (!this.safeAreaLabel) {
      this.safeAreaLabel = new Konva.Text({
        x: saPx.x + 6,
        y: safeLabelY,
        text: 'VÙNG AN TOÀN (TRÁNH MÉP CONG)',
        fontSize: 7.5,
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        fill: this.isOverflowWarning() ? '#EF4444' : '#10B981',
        opacity: 0.85,
        listening: false
      });
      this.guidesLayer.add(this.safeAreaLabel);
    } else {
      this.safeAreaLabel.setAttrs({
        x: saPx.x + 6,
        y: safeLabelY,
        fill: this.isOverflowWarning() ? '#EF4444' : '#10B981'
      });
    }

    this.guidesLayer.batchDraw();
  }

  checkOverflowWarning(): void {
    if (!this.drawLayer) return;

    const { saPx } = this.getGuideCoordinates();

    const tolerance = 4;
    let hasOverflow = false;
    let overflowingName = '';

    const nodesToCheck: Array<{ node: Konva.Node | null; name: string }> = [
      { node: this.textNode, name: 'Chữ Khắc' },
      { node: this.photoNode, name: 'Ảnh Cá Nhân' }
    ];
    this.stickerNodes.forEach((stk, idx) => {
      nodesToCheck.push({ node: stk, name: `Sticker #${idx + 1}` });
    });

    for (const item of nodesToCheck) {
      if (!item.node || !item.node.isVisible()) continue;
      if (item.node === this.textNode && !this.textNode.text().trim()) continue;

      const box = item.node.getClientRect({ skipTransform: false });
      const isLeft = box.x < (saPx.x - tolerance);
      const isRight = (box.x + box.width) > (saPx.x + saPx.width + tolerance);
      const isTop = box.y < (saPx.y - tolerance);
      const isBottom = (box.y + box.height) > (saPx.y + saPx.height + tolerance);

      if (isLeft || isRight || isTop || isBottom) {
        hasOverflow = true;
        overflowingName = item.name;
        break;
      }
    }

    if (hasOverflow) {
      this.isOverflowWarning.set(true);
      this.overflowWarningTarget.set(overflowingName);
      this.overflowWarningMessage.set(`${overflowingName} chạm mép cong ngoài Vùng An Toàn`);
      if (this.safeAreaRect) {
        this.safeAreaRect.stroke('#EF4444');
        this.safeAreaRect.strokeWidth(2);
      }
      if (this.safeAreaLabel) {
        this.safeAreaLabel.fill('#EF4444');
      }
    } else {
      this.isOverflowWarning.set(false);
      this.overflowWarningTarget.set('');
      this.overflowWarningMessage.set('');
      if (this.safeAreaRect) {
        this.safeAreaRect.stroke('rgba(16, 185, 129, 0.75)');
        this.safeAreaRect.strokeWidth(1.5);
      }
      if (this.safeAreaLabel) {
        this.safeAreaLabel.fill('#10B981');
      }
    }

    this.guidesLayer?.batchDraw();
  }

  fitIntoSafeArea(): void {
    const selected = this.transformer?.nodes()[0] || this.textNode;
    if (!selected || !this.stage) return;

    const { saPx } = this.getGuideCoordinates();

    // If node is wider/taller than safe area, scale it down
    const box = selected.getClientRect({ skipTransform: false });
    if (box.width > saPx.width * 0.95 || box.height > saPx.height * 0.95) {
      const scaleX = selected.scaleX();
      const scaleY = selected.scaleY();
      const ratio = Math.min((saPx.width * 0.85) / box.width, (saPx.height * 0.85) / box.height);
      selected.scaleX(scaleX * ratio);
      selected.scaleY(scaleY * ratio);
    }

    // Center node in safeArea
    const newBox = selected.getClientRect({ skipTransform: false });
    const shiftX = (saPx.x + saPx.width / 2) - (newBox.x + newBox.width / 2);
    const shiftY = (saPx.y + saPx.height / 2) - (newBox.y + newBox.height / 2);

    selected.x(selected.x() + shiftX);
    selected.y(selected.y() + shiftY);

    this.drawLayer?.batchDraw();
    this.uiLayer?.batchDraw();
    this.checkOverflowWarning();
  }

  toggleGuides(): void {
    this.showGuides.set(!this.showGuides());
    this.renderGuidesOnKonva();
  }

  private renderStickersOnKonva(): void {
    if (!this.drawLayer) return;

    // Clear old sticker nodes
    this.stickerNodes.forEach(n => n.destroy());
    this.stickerNodes = [];

    const stickers = this.activeStickers();
    stickers.forEach((stk, index) => {
      const stickerText = new Konva.Text({
        x: 170 + index * 40,
        y: 170,
        text: stk.icon,
        fontSize: 26,
        draggable: true
      });
      this.makeDraggableAndSelectable(stickerText, `Sticker ${stk.name}`);
      this.drawLayer?.add(stickerText);
      this.stickerNodes.push(stickerText);
    });
  }

  private makeDraggableAndSelectable(node: Konva.Node, name: string): void {
    const selectNode = () => {
      this.selectedNodeName.set(name);
      if (this.transformer) {
        if (name === 'Ảnh Cá Nhân' || name.startsWith('Sticker')) {
          this.transformer.keepRatio(true);
        } else {
          this.transformer.keepRatio(false);
        }
        this.transformer.nodes([node]);
        this.uiLayer?.batchDraw();
      }
      if (name.includes('Chữ') || name.includes('Khung')) {
        this.activeToolTab.set('TEXT');
      } else if (name === 'Ảnh Cá Nhân') {
        this.activeToolTab.set('IMAGE');
      } else if (name.startsWith('Sticker')) {
        this.activeToolTab.set('STICKER');
      }
    };

    node.on('click tap', selectNode);
    node.on('dragstart', selectNode);
    node.on('dragmove', () => this.checkOverflowWarning());
    node.on('dragend', () => this.checkOverflowWarning());
  }

  // Canvas Action Toolbars
  centerSelectedNode(): void {
    const selected = this.transformer?.nodes()[0];
    if (selected) {
      selected.x((460 - (selected.width() * selected.scaleX())) / 2);
      this.drawLayer?.batchDraw();
      this.uiLayer?.batchDraw();
      this.checkOverflowWarning();
    } else if (this.textNode) {
      this.textNode.x((460 - this.textNode.width()) / 2);
      this.drawLayer?.batchDraw();
      this.uiLayer?.batchDraw();
      this.checkOverflowWarning();
    }
  }

  deleteSelectedNode(): void {
    const selected = this.transformer?.nodes()[0];
    if (!selected) return;

    if (selected === this.photoNode) {
      this.removeImage();
    } else if (this.stickerNodes.includes(selected as Konva.Text)) {
      const idx = this.stickerNodes.indexOf(selected as Konva.Text);
      if (idx > -1) {
        const current = [...this.activeStickers()];
        current.splice(idx, 1);
        this.activeStickers.set(current);
        this.renderStickersOnKonva();
      }
    } else if (selected === this.textNode) {
      if (this.isFrontFace()) {
        this.frontMessage.set('');
      } else {
        this.backMessage.set('');
      }
      this.updateKonvaCanvas();
    }
    this.transformer?.nodes([]);
    this.selectedNodeName.set(null);
    this.uiLayer?.batchDraw();
    this.checkOverflowWarning();
  }

  bringForward(): void {
    const selected = this.transformer?.nodes()[0];
    if (selected) {
      selected.moveUp();
      this.drawLayer?.batchDraw();
      this.uiLayer?.batchDraw();
    }
  }

  sendBackward(): void {
    const selected = this.transformer?.nodes()[0];
    if (selected) {
      selected.moveDown();
      this.drawLayer?.batchDraw();
      this.uiLayer?.batchDraw();
    }
  }

  setTextSize(size: number): void {
    const clamped = Math.max(10, Math.min(32, size));
    this.textSize.set(clamped);
    if (this.textNode) {
      this.textNode.fontSize(clamped);
      this.drawLayer?.batchDraw();
      this.uiLayer?.batchDraw();
      this.checkOverflowWarning();
    }
  }

  setTextAlign(align: 'left' | 'center' | 'right'): void {
    this.textAlign.set(align);
    if (this.textNode) {
      this.textNode.align(align);
      this.drawLayer?.batchDraw();
      this.uiLayer?.batchDraw();
      this.checkOverflowWarning();
    }
  }

  toggleBold(): void {
    this.isTextBold.set(!this.isTextBold());
    if (this.textNode) {
      const style = ((this.isTextBold() ? 'bold ' : '') + (this.isTextItalic() ? 'italic' : 'normal')).trim();
      this.textNode.fontStyle(style);
      this.drawLayer?.batchDraw();
      this.uiLayer?.batchDraw();
      this.checkOverflowWarning();
    }
  }

  toggleItalic(): void {
    this.isTextItalic.set(!this.isTextItalic());
    if (this.textNode) {
      const style = ((this.isTextBold() ? 'bold ' : '') + (this.isTextItalic() ? 'italic' : 'normal')).trim();
      this.textNode.fontStyle(style);
      this.drawLayer?.batchDraw();
      this.uiLayer?.batchDraw();
      this.checkOverflowWarning();
    }
  }

  setZoom(zoom: number): void {
    this.canvasZoom.set(zoom);
    this.fitStageToWrapper();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }
    const selected = this.transformer?.nodes()[0];
    if (!selected) return;

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.deleteSelectedNode();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      selected.y(selected.y() - (event.shiftKey ? 10 : 2));
      this.drawLayer?.batchDraw();
      this.uiLayer?.batchDraw();
      this.checkOverflowWarning();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      selected.y(selected.y() + (event.shiftKey ? 10 : 2));
      this.drawLayer?.batchDraw();
      this.uiLayer?.batchDraw();
      this.checkOverflowWarning();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      selected.x(selected.x() - (event.shiftKey ? 10 : 2));
      this.drawLayer?.batchDraw();
      this.uiLayer?.batchDraw();
      this.checkOverflowWarning();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      selected.x(selected.x() + (event.shiftKey ? 10 : 2));
      this.drawLayer?.batchDraw();
      this.uiLayer?.batchDraw();
      this.checkOverflowWarning();
    }
  }

  downloadSnapshot(): void {
    if (!this.stage) return;
    this.transformer?.nodes([]);
    this.uiLayer?.batchDraw();

    const wasGuidesShown = this.showGuides();
    if (this.guidesLayer) {
      this.guidesLayer.hide();
      this.guidesLayer.batchDraw();
    }

    const currentScale = this.stage.scaleX() || 1;
    const pixelRatio = Math.max(1, 2 / currentScale);
    const dataUrl = this.stage.toDataURL({ pixelRatio });

    if (wasGuidesShown && this.guidesLayer) {
      this.guidesLayer.show();
      this.guidesLayer.batchDraw();
    }

    const link = document.createElement('a');
    link.download = `giftory_custom_${this.activeTemplate()?.slug || 'bespoke'}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }

  // Synchronizers for Text & Options
  onFrontMessageChange(val: string): void {
    this.frontMessage.set(val);
    this.updateKonvaCanvas();
  }

  onBackMessageChange(val: string): void {
    this.backMessage.set(val);
    this.updateKonvaCanvas();
  }

  setFont(fontName: string): void {
    this.selectedFont.set(fontName);
    this.updateKonvaCanvas();
  }

  setEngraveColor(colorName: string): void {
    this.selectedEngraveColor.set(colorName);
    this.updateKonvaCanvas();
  }

  setColor(colorName: string): void {
    const opt = this.availableColorOptions().find(c => c.name === colorName);
    if (opt?.isOutOfStock) {
      alert(`Màu "${colorName}" hiện đã hết hàng trong kho. Vui lòng chọn màu khác!`);
      return;
    }
    this.selectedColor.set(colorName);
    this.updateKonvaCanvas();
  }

  setPattern(patternId: string): void {
    this.selectedPattern.set(patternId);
  }

  switchFace(isFront: boolean): void {
    this.isFrontFace.set(isFront);
    this.updateKonvaCanvas();
  }

  loadStudioAssets(): void {
    this.studioService.getAssets('STICKER').subscribe({
      next: (assets: any) => {
        if (Array.isArray(assets) && assets.length > 0) {
          this.dynamicStickers.set(assets);
        } else {
          this.dynamicStickers.set([
            { _id: '1', name: 'Trái tim', icon: '❤️', type: 'STICKER' },
            { _id: '2', name: 'Tim đôi', icon: '💖', type: 'STICKER' },
            { _id: '3', name: 'Tinh tú', icon: '✨', type: 'STICKER' },
            { _id: '4', name: 'Crown', icon: '👑', type: 'STICKER' },
            { _id: '5', name: 'Nơ quà', icon: '🎀', type: 'STICKER' },
            { _id: '6', name: 'Bánh kem', icon: '🎂', type: 'STICKER' },
            { _id: '7', name: 'Hộp quà', icon: '🎁', type: 'STICKER' },
            { _id: '8', name: 'Nâng ly', icon: '🥂', type: 'STICKER' },
            { _id: '9', name: 'Cỏ 4 lá', icon: '🍀', type: 'STICKER' },
            { _id: '10', name: 'Hoa đào', icon: '🌸', type: 'STICKER' },
            { _id: '11', name: 'Kim cương', icon: '💎', type: 'STICKER' },
            { _id: '12', name: 'Ngọn lửa', icon: '🔥', type: 'STICKER' }
          ]);
        }
      },
      error: () => {
        this.dynamicStickers.set([
          { _id: '1', name: 'Trái tim', icon: '❤️', type: 'STICKER' },
          { _id: '2', name: 'Tim đôi', icon: '💖', type: 'STICKER' },
          { _id: '3', name: 'Tinh tú', icon: '✨', type: 'STICKER' }
        ]);
      }
    });
  }

  getCurrentBlankImage(): string {
    const tpl = this.activeTemplate();
    if (!tpl) return 'https://placehold.co/400';

    if (this.isFrontFace()) {
      // Find variant corresponding to selectedColor
      const matchedVariant = tpl.variants?.find(v => v.name === this.selectedColor());
      if (matchedVariant?.image) {
        return matchedVariant.image;
      }
      return tpl.customConfig?.frontBlankImage || tpl.images[0] || 'https://placehold.co/400';
    } else {
      return tpl.customConfig?.backBlankImage || tpl.images[1] || tpl.images[0] || 'https://placehold.co/400';
    }
  }

  selectTemplate(tpl: Product): void {
    this.activeTemplate.set(tpl);
    if (tpl.variants && tpl.variants.length > 0) {
      const activeVar = tpl.variants.find(v => v.status !== 'HIDDEN' && (v.stock ?? 0) > 0) || tpl.variants[0];
      if (activeVar) {
        this.selectedColor.set(activeVar.name);
      }
    }
    this.updateKonvaCanvas();
  }

  resetToDefaults(): void {
    this.studioService.clearDraftFromStorage();
    this.frontMessage.set('');
    this.backMessage.set('');
    this.selectedColor.set('Navy Blue');
    this.selectedFont.set('Signature');
    this.selectedEngraveColor.set('Vàng Kim (Gold)');
    this.selectedPattern.set('none');
    this.uploadedImage.set('');
    this.imageScale.set(1);
    this.activeStickers.set([]);
    this.hasRestoredDraft.set(false);
    this.updateKonvaCanvas();
  }

  getEngraveColorCode(): string {
    const ec = this.engraveColors.find(o => o.name === this.selectedEngraveColor());
    return ec ? ec.hex : '#F59E0B';
  }

  getActivePatternCss(): string {
    const p = this.patternLibrary.find(item => item.id === this.selectedPattern());
    return p ? p.cssPattern : 'none';
  }

  getColorCanvasBackground(): string {
    switch (this.selectedColor()) {
      case 'Navy Blue': return '#162b50';
      case 'Deep Slate': return '#1a2233';
      case 'Sand Beige': return '#e6dac8';
      case 'Terracotta': return '#8c433b';
      case 'Pure White': return '#f3f4f6';
      case 'Emerald Green': return '#133e31';
      default: return '#F5ECE9';
    }
  }

  isStickerActive(name: string): boolean {
    return this.activeStickers().some(s => s.name === name);
  }

  toggleSticker(stk: any): void {
    const current = [...this.activeStickers()];
    const idx = current.findIndex(s => s.name === stk.name);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      if (current.length >= 3) {
        current.shift();
      }
      current.push({ id: String(Date.now()), icon: stk.icon, name: stk.name });
    }
    this.activeStickers.set(current);
    this.renderStickersOnKonva();
  }

  onImageFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    this.formErrors.image = '';
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      this.formErrors.image = 'Định dạng không hợp lệ. Chỉ hỗ trợ .JPG hoặc .PNG.';
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.formErrors.image = 'Dung lượng tệp vượt quá 5MB. Vui lòng nén nhỏ hơn 5MB.';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.uploadedImage.set(e.target.result);
      this.imageScale.set(1);
      this.updateKonvaCanvas();
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.uploadedImage.set('');
    this.imageScale.set(1);
    this.formErrors.image = '';
    this.updateKonvaCanvas();
  }

  validateInputs(): boolean {
    let isValid = true;
    const maxLen = this.maxTextLength();

    if (this.frontMessage().length > maxLen) {
      this.formErrors.frontMessage = `Độ dài tối đa không quá ${maxLen} ký tự.`;
      isValid = false;
    } else {
      this.formErrors.frontMessage = '';
    }

    if (this.backMessage().length > maxLen) {
      this.formErrors.backMessage = `Độ dài mặt sau tối đa không quá ${maxLen} ký tự.`;
      isValid = false;
    } else {
      this.formErrors.backMessage = '';
    }

    return isValid && !this.formErrors.image;
  }

  isFormInvalid(): boolean {
    return false;
  }

  private getConfirmedCustomDetails() {
    const tpl = this.activeTemplate();
    const surchargesObj: Record<string, number> = {};
    this.surchargeList().forEach(s => {
      surchargesObj[s.label] = s.amount;
    });

    // Generate real Konva high-res render for preview
    let renderedPreview = this.getCurrentBlankImage();
    if (this.stage) {
      this.transformer?.nodes([]);
      this.uiLayer?.batchDraw();
      const wasGuidesShown = this.showGuides();
      if (this.guidesLayer) {
        this.guidesLayer.hide();
        this.guidesLayer.batchDraw();
      }
      try {
        renderedPreview = this.stage.toDataURL({ pixelRatio: 0.6, mimeType: 'image/jpeg', quality: 0.7 });
      } catch (e) {
        console.warn('Canvas toDataURL fallback', e);
      }
      if (wasGuidesShown && this.guidesLayer) {
        this.guidesLayer.show();
        this.guidesLayer.batchDraw();
      }
    }

    const msg = this.frontMessage().trim() || (tpl ? tpl.name : 'Giftory Custom');

    return {
      frontMessage: msg,
      backMessage: this.backMessage(),
      customText: msg,
      fontFamily: this.selectedFont(),
      engraveColor: this.selectedEngraveColor(),
      selectedColor: this.selectedColor(),
      pattern: this.selectedPattern(),
      uploadedImage: this.uploadedImage(),
      imageScale: this.imageScale(),
      stickers: this.activeStickers(),
      previewImage: renderedPreview,
      customFee: this.totalSurcharges(),
      surcharges: surchargesObj
    };
  }

  onPrimaryActionClick(): void {
    if (!this.validateInputs()) {
      this.activeToolTab.set('TEXT');
      return;
    }

    const tpl = this.activeTemplate();
    if (!tpl) return;

    const customDetails = this.getConfirmedCustomDetails();

    if (this.isEditingCartItem() && this.editingCartItemIndex() !== null) {
      this.cartService.updateCustomDetails(
        this.editingCartItemIndex()!,
        customDetails,
        this.selectedColor()
      ).subscribe({
        next: () => {
          this.studioService.clearDraftFromStorage();
          this.router.navigate(['/cart']);
        },
        error: (err) => {
          alert(err.error?.message || 'Có lỗi xảy ra khi cập nhật sản phẩm.');
        }
      });
      return;
    }

    // Directly add item to cart for both logged in and guest users
    this.cartService.addItem(tpl._id, 1, this.selectedColor(), customDetails).subscribe({
      next: () => {
        this.studioService.clearDraftFromStorage();
        this.router.navigate(['/cart']);
      },
      error: (err) => {
        alert(err.error?.message || 'Có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng.');
      }
    });
  }

  handleGuestLoginAndSync(): void {
    this.showGuestChoiceModal.set(false);
    this.showSaveLoginModal.set(true);
  }

  handleContinueAsGuest(): void {
    this.showGuestChoiceModal.set(false);
    const tpl = this.activeTemplate();
    if (!tpl) return;

    const customDetails = this.getConfirmedCustomDetails();
    this.cartService.addItem(tpl._id, 1, this.selectedColor(), customDetails).subscribe({
      next: () => {
        this.router.navigate(['/cart']);
      }
    });
  }

  onSaveDesignClick(): void {
    if (!this.validateInputs()) {
      this.activeToolTab.set('TEXT');
      return;
    }

    if (this.authService.isAuthenticated()) {
      this.saveDesignToCloud();
    } else {
      this.showSaveLoginModal.set(true);
    }
  }

  performQuickLoginAndSync(type: 'google' | 'otp'): void {
    const tpl = this.activeTemplate();
    if (!tpl) return;

    const demoEmail = type === 'google' ? 'google.guest@giftory.vn' : '0912345678@giftory.vn';
    const demoPassword = 'Password123!';

    this.authService.login({ email: demoEmail, password: demoPassword }).subscribe({
      next: () => {
        this.showSaveLoginModal.set(false);
        this.syncDraftToServer();
      },
      error: () => {
        this.authService.register({
          email: demoEmail,
          password: demoPassword,
          name: type === 'google' ? 'Google Guest Member' : 'Khách Hàng OTP',
          phone: '0912345678'
        }).subscribe({
          next: () => {
            this.showSaveLoginModal.set(false);
            this.syncDraftToServer();
          },
          error: () => {
            this.showSaveLoginModal.set(false);
            this.saveDesignToCloud();
          }
        });
      }
    });
  }

  private syncDraftToServer(): void {
    const tpl = this.activeTemplate();
    if (!tpl) return;

    const customDetails = this.getConfirmedCustomDetails();
    this.studioService.syncDesignDraft({
      productId: tpl._id,
      title: `Thiết kế ${tpl.name}`,
      ...customDetails
    }).subscribe({
      next: res => {
        alert(res.message || 'Đã đồng bộ bản thiết kế vào tài khoản và cộng 50 điểm thưởng thành công!');
        this.authService.refreshProfile();
        this.router.navigate(['/wishlist']);
      },
      error: () => {
        this.saveDesignToCloud();
      }
    });
  }

  private saveDesignToCloud(): void {
    const tpl = this.activeTemplate();
    if (!tpl) return;

    const customDetails = this.getConfirmedCustomDetails();
    this.studioService.saveDesign({
      productId: tpl._id,
      title: `Thiết kế ${tpl.name}`,
      ...customDetails
    }).subscribe({
      next: () => {
        alert('Đã lưu bản thiết kế vào bộ sưu tập của bạn thành công!');
        this.router.navigate(['/wishlist']);
      }
    });
  }
}
