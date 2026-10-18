import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, HostListener, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import Konva from 'konva';
import { filterGraphics, graphicsForFace } from './graphics-library';
import { CustomStudioService } from '../../core/services/custom-studio.service';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { Product, StudioAsset, StudioGraphic, StudioTextBlock, AreaBox } from '../../core/models';

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

type StudioToolTab = 'COLOR' | 'TEXT' | 'IMAGE' | 'GRAPHICS' | 'SUMMARY';

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

            <!-- Tool 4: Clipart library -->
            <button
              (click)="activeToolTab.set('GRAPHICS')"
              class="w-12 sm:w-14 py-2 sm:py-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all cursor-pointer relative"
              [ngClass]="activeToolTab() === 'GRAPHICS' ? 'bg-[#7C3AED] text-white shadow-md' : 'text-slate-600 hover:bg-slate-200/70'"
              title="Thư viện đồ họa"
            >
              <span class="material-symbols-outlined text-[19px] sm:text-[20px]">collections</span>
              <span class="text-[9px] font-bold">Đồ họa</span>
              @if (activeStickers().length > 0) {
                <span class="w-2 h-2 rounded-full bg-pink-500 absolute top-1.5 right-1.5 sm:top-2 sm:right-2 border-2 border-white"></span>
              }
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
                  <p class="text-[10px] text-slate-500 mt-0.5">Chọn màu phôi riêng cho thiết kế của bạn</p>
                </div>
                <span class="text-[11px] font-bold text-[#7C3AED] bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  {{ selectedColor() }}
                </span>
              }
              @if (activeToolTab() === 'TEXT') {
                <div>
                  <h3 class="font-bold text-xs sm:text-sm text-[#1E1B4B] flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[#7C3AED] text-[18px]">format_shapes</span>
                    Khắc Chữ Đa Tầng
                  </h3>
                  <p class="text-[10px] text-slate-500 mt-0.5">Nhiều khối chữ độc lập · Tự do xuống dòng và định dạng</p>
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
              @if (activeToolTab() === 'GRAPHICS') {
                <div>
                  <h3 class="font-bold text-xs sm:text-sm text-[#1E1B4B] flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[#7C3AED] text-[18px]">collections</span>
                    Thư viện Đồ họa
                  </h3>
                  <p class="text-[10px] text-slate-500 mt-0.5">Thêm clipart vào mặt đang chỉnh</p>
                </div>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-[#7C3AED]">
                  {{ activeStickers().length }} hình
                </span>
              }
              @if (activeToolTab() === 'SUMMARY' && activeTemplate()) {
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
                  <p class="text-[11px] text-slate-500">Các màu phôi dùng chung vùng in và vùng an toàn của phôi gốc.</p>
                  @if (blankImageNotice()) { <p role="alert" class="text-xs text-amber-700">{{ blankImageNotice() }}</p> }
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
                            <span class="text-[10px] text-slate-400">Phôi thiết kế</span>
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

                  <div class="flex items-center justify-between text-xs text-slate-500">
                    <span>{{ faceTextBlocks().length }} khối chữ · Không giới hạn số khối</span>
                    <span>Mỗi khối có định dạng riêng</span>
                  </div>
                  <button type="button" (click)="addTextBlock()" class="w-full py-3 border-2 border-dashed border-purple-200 rounded-xl text-xs font-bold text-purple-600 hover:bg-purple-50 flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-lg">add</span> Thêm khối chữ / thông điệp mới
                  </button>
                  <div class="space-y-2">
                    @for (block of faceTextBlocks(); track block.id; let idx = $index) {
                      <div class="rounded-xl border-2 overflow-hidden" [ngClass]="selectedTextBlockId() === block.id ? 'border-purple-500 bg-purple-50/40' : 'border-slate-100 bg-white'">
                        <div class="flex items-center gap-1 px-2 py-2">
                          <button type="button" (click)="selectTextBlock(block.id)" class="flex-1 min-w-0 flex items-center gap-2 text-left text-xs font-semibold text-slate-700">
                            <span class="rounded bg-purple-100 text-purple-600 w-5 h-5 flex items-center justify-center shrink-0">{{ idx + 1 }}</span>
                            <span class="truncate" [class.opacity-40]="!block.visible">{{ block.text.trim() || 'Khối chữ mới' }}</span>
                          </button>
                          <button type="button" (click)="updateTextBlock(block.id, {visible: !block.visible})" [attr.aria-label]="block.visible ? 'Ẩn khối chữ' : 'Hiện khối chữ'" class="p-1 text-slate-400 hover:text-purple-600"><span class="material-symbols-outlined text-base">{{ block.visible ? 'visibility' : 'visibility_off' }}</span></button>
                          <button type="button" (click)="duplicateTextBlock(block.id)" aria-label="Nhân bản khối chữ" class="p-1 text-slate-400 hover:text-purple-600"><span class="material-symbols-outlined text-base">content_copy</span></button>
                          <button type="button" (click)="removeTextBlock(block.id)" aria-label="Xóa khối chữ" class="p-1 text-red-400 hover:text-red-600"><span class="material-symbols-outlined text-base">delete</span></button>
                        </div>
                        <div class="px-3 pb-2 grid grid-cols-[minmax(0,1fr)_90px] gap-2">
                          <label class="text-[10px] text-slate-500 space-y-1">Font chữ
                            <select [attr.aria-label]="'Font chữ khối ' + (idx + 1)" [ngModel]="block.fontFamily" (ngModelChange)="setBlockFont(block.id, $event)" [style.font-family]="fontFamilyFor(block.fontFamily)" class="block w-full rounded-lg border border-purple-200 bg-white px-2 py-2 text-xs text-slate-800 outline-none focus:border-purple-500">
                              @for (font of fontOptions; track font.name) { <option [value]="font.name">{{ font.label }}</option> }
                            </select>
                          </label>
                          <label class="text-[10px] text-slate-500 space-y-1">Cỡ chữ (px)
                            <input type="number" min="8" max="120" step="1" [attr.aria-label]="'Cỡ chữ khối ' + (idx + 1)" [ngModel]="block.fontSize" (ngModelChange)="setBlockFontSize(block.id, $event)" class="block w-full rounded-lg border border-purple-200 bg-white px-2 py-2 text-xs text-slate-800 outline-none focus:border-purple-500" />
                          </label>
                        </div>
                        @if (selectedTextBlockId() === block.id) {
                          <div class="px-3 pb-3 space-y-2">
                            <div class="flex justify-between text-[10px] text-slate-500"><label [for]="'text-' + block.id">Nội dung khắc · hỗ trợ nhiều dòng</label><span>{{ block.text.length }} ký tự</span></div>
                            <textarea [id]="'text-' + block.id" [style.font-family]="fontFamilyFor(block.fontFamily)" [style.font-weight]="block.bold ? '700' : '400'" [style.font-style]="block.italic ? 'italic' : 'normal'" rows="3" [ngModel]="block.text" (ngModelChange)="updateTextBlock(block.id, {text: $event})" placeholder="Nhập lời nhắn, xuống dòng tùy ý…" class="w-full rounded-lg border border-purple-200 bg-white p-2 text-xs outline-none focus:border-purple-500 resize-y"></textarea>
                            <div class="flex items-center justify-between gap-2 border-t border-purple-100 pt-2">
                              <div class="flex items-center gap-1 rounded-xl bg-slate-100 p-1" role="group" [attr.aria-label]="'Căn lề khối ' + (idx + 1)">
                                @for (alignment of textAlignments; track alignment.value) {
                                  <button type="button" (click)="editTextBlock(block.id, {align: alignment.value})" [attr.aria-label]="alignment.label + ' khối ' + (idx + 1)" [attr.aria-pressed]="block.align === alignment.value" class="w-7 h-7 rounded-lg flex items-center justify-center" [ngClass]="block.align === alignment.value ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'">
                                    <span class="material-symbols-outlined text-[18px]">{{ alignment.icon }}</span>
                                  </button>
                                }
                              </div>
                              <div class="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                                <button type="button" (click)="editTextBlock(block.id, {bold: !block.bold})" [attr.aria-label]="'Chữ đậm khối ' + (idx + 1)" [attr.aria-pressed]="block.bold" class="w-7 h-7 rounded-lg font-bold" [ngClass]="block.bold ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'">B</button>
                                <button type="button" (click)="editTextBlock(block.id, {italic: !block.italic})" [attr.aria-label]="'Chữ nghiêng khối ' + (idx + 1)" [attr.aria-pressed]="block.italic" class="w-7 h-7 rounded-lg italic font-bold" [ngClass]="block.italic ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'">I</button>
                              </div>
                            </div>
                            <div class="grid grid-cols-2 gap-3 border-t border-purple-100 pt-2">
                              <label class="text-[10px] text-slate-500">Giãn ký tự: {{ block.letterSpacing }}px
                                <input type="range" min="-2" max="12" step="0.5" [attr.aria-label]="'Giãn ký tự khối ' + (idx + 1)" [ngModel]="block.letterSpacing" (ngModelChange)="editTextBlock(block.id, {letterSpacing: +$event})" class="w-full accent-purple-600" />
                              </label>
                              <label class="text-[10px] text-slate-500">Giãn dòng: {{ block.lineHeight }}×
                                <input type="range" min="0.8" max="3" step="0.1" [attr.aria-label]="'Giãn dòng khối ' + (idx + 1)" [ngModel]="block.lineHeight" (ngModelChange)="editTextBlock(block.id, {lineHeight: +$event})" class="w-full accent-purple-600" />
                              </label>
                            </div>
                            <div class="space-y-2 border-t border-purple-100 pt-2">
                              <div class="flex items-center justify-between gap-2">
                                <span class="text-[11px] font-semibold text-slate-600">Màu chữ</span>
                                <label class="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                                  <input type="color" [attr.aria-label]="'Màu chữ khối ' + (idx + 1)" [ngModel]="block.color" (ngModelChange)="editTextBlock(block.id, {color: $event})" class="h-7 w-9 rounded border border-slate-200 bg-white cursor-pointer" />
                                  {{ block.color }}
                                </label>
                              </div>
                              <div class="flex flex-wrap gap-2">
                                @for (color of textColors; track color.hex) {
                                  <button type="button" (click)="editTextBlock(block.id, {color: color.hex})" [attr.aria-label]="color.name + ' cho khối ' + (idx + 1)" [attr.aria-pressed]="block.color === color.hex" class="w-6 h-6 rounded-full border-2 shadow-sm" [style.background-color]="color.hex" [ngClass]="block.color === color.hex ? 'border-purple-600 ring-2 ring-purple-200' : 'border-slate-200'"></button>
                                }
                              </div>
                            </div>
                            <p class="text-[10px] text-slate-500">{{ block.visible ? 'Đang hiển thị' : 'Đã ẩn' }} · Hỗ trợ đầy đủ dấu tiếng Việt</p>
                          </div>
                        }
                      </div>
                    } @empty {
                      <div class="text-center py-6 rounded-xl bg-slate-50 text-xs text-slate-500">Thêm khối chữ đầu tiên để bắt đầu.<br/>Kéo, co giãn và xoay từng khối trên phôi.</div>
                    }
                  </div>
                  @if (pendingTextFonts()) {
                    <p role="status" class="text-xs text-purple-600">Đang tải font tiếng Việt…</p>
                  }
                  @if (textFontNotice()) {
                    <div role="alert" class="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{{ textFontNotice() }} <button type="button" (click)="retryTextFonts()" class="font-bold underline">Thử lại</button></div>
                  }
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

              @if (activeToolTab() === 'GRAPHICS') {
                <div class="space-y-3 animate-fade-in">
                  <input type="search" [ngModel]="graphicsQuery()" (ngModelChange)="graphicsQuery.set($event)"
                    aria-label="Tìm đồ họa" placeholder="Tìm hoa, trái tim, sinh nhật…"
                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-500">
                  <select [ngModel]="graphicsCategory()" (ngModelChange)="graphicsCategory.set($event)" aria-label="Chủ đề đồ họa"
                    class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
                    <option value="">Tất cả chủ đề</option>
                    @for (category of graphicsCategories(); track category) { <option [value]="category">{{ category }}</option> }
                  </select>
                  @if (selectedPattern() !== 'none') {
                    <div class="text-xs text-amber-700 bg-amber-50 rounded-xl p-2">
                      Thiết kế này đang giữ họa tiết cũ và phụ phí tương ứng.
                      <button (click)="setPattern('none')" class="underline font-bold cursor-pointer">Bỏ họa tiết cũ</button>
                    </div>
                  }
                  <p class="text-[11px] text-slate-500">Bấm để thêm hình vào {{ isFrontFace() ? 'mặt trước' : 'mặt sau' }}. Có thể thêm cùng một hình nhiều lần. Miễn phí.</p>
                  @if (pendingGraphicAdds()) { <p role="status" class="text-xs text-purple-600">Đang tải clipart…</p> }
                  @if (graphicsNotice()) { <p role="status" class="text-xs text-amber-700">{{ graphicsNotice() }}</p> }
                  @if (graphicsLibraryLoading()) {
                    <p role="status" class="text-xs text-purple-600">Đang tải thư viện clipart…</p>
                  }
                  @if (graphicsLibraryError()) {
                    <p role="alert" class="text-xs text-amber-700">Không tải được thư viện clipart. <button type="button" (click)="loadStudioAssets()" class="underline font-bold">Thử lại</button></p>
                  }
                  <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    @for (asset of filteredGraphics(); track asset._id) {
                      <button (click)="addGraphic(asset)" [title]="'Thêm ' + asset.name" [disabled]="activeStickers().length >= 30"
                        class="p-2 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50 disabled:opacity-40 flex flex-col items-center gap-1 cursor-pointer">
                          <img [src]="asset.thumbnailUrl || asset.imageUrl || asset.icon" [alt]="asset.name" loading="lazy" class="w-12 h-12 object-contain">
                        <span class="text-[10px] text-slate-600 truncate w-full text-center">{{ asset.name }}</span>
                      </button>
                    } @empty {
                      @if (!graphicsLibraryLoading() && !graphicsLibraryError()) {
                        <p class="col-span-full text-xs text-slate-500 py-4">{{ graphicsAssets().length ? 'Không tìm thấy clipart phù hợp.' : 'Thư viện chưa có clipart đang hoạt động.' }}</p>
                      }
                    }
                  </div>
                  <p class="text-[10px] text-slate-400">{{ activeStickers().length }}/30 hình trong thiết kế • Kéo, thu phóng và xoay trên canvas.</p>
                  @if (activeStickers().length) {
                    <div class="space-y-1 border-t border-slate-100 pt-2">
                      <p class="text-[11px] font-bold text-slate-700">Hình trong thiết kế</p>
                      @for (graphic of activeStickers(); track graphic.id) {
                        <div class="flex items-center justify-between gap-2 text-[11px] text-slate-600">
                          <span class="truncate">{{ graphic.name }} · {{ graphic.face === 'back' ? 'Mặt sau' : graphic.face === 'front' ? 'Mặt trước' : 'Hai mặt' }}</span>
                          <button (click)="removeGraphic(graphic.id)" [attr.aria-label]="'Xóa ' + graphic.name" class="text-red-600 cursor-pointer px-2 py-1">Xóa</button>
                        </div>
                      }
                    </div>
                  }
                  @if (selectedNodeName()?.startsWith('Đồ họa')) {
                    <div class="flex gap-2">
                      <button (click)="duplicateGraphic()" class="px-3 py-2 bg-purple-50 rounded-xl text-xs cursor-pointer">Nhân bản</button>
                      <button (click)="flipGraphic()" class="px-3 py-2 bg-purple-50 rounded-xl text-xs cursor-pointer">Lật ngang</button>
                      <button (click)="deleteSelectedNode()" class="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs cursor-pointer">Xóa</button>
                    </div>
                  }
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
                    @if (activeTemplate()) {
                      {{ finalProductPrice() | number:'1.0-0' }}đ
                    } @else {
                      <span class="text-xs" role="status">Đang tải giá…</span>
                    }
                  </span>
                  @if (surchargeList().length > 0) {
                    <span class="text-[10px] text-purple-600 bg-purple-100 font-bold px-1.5 py-0.5 rounded-md hidden sm:inline">
                      +{{ (finalProductPrice() - baseProductPrice()) | number:'1.0-0' }}đ
                    </span>
                  }
                </div>
                
                <div class="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span class="material-symbols-outlined text-[13px]">payments</span>
                  <span>Cọc 50%: @if (activeTemplate()) { {{ depositPrice() | number:'1.0-0' }}đ } @else { — }</span>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex items-center gap-2">
                <button 
                  (click)="onPrimaryActionClick()"
                  [disabled]="isFormInvalid()"
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
                class="rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-2 border-purple-100 relative cursor-crosshair"
                [style.backgroundColor]="getColorCanvasBackground()"
                [style.backgroundImage]="getActivePatternCss()"
              >
              </div>

              <!-- Canvas floating watermark -->
              <div class="absolute top-2 right-2 bg-white/90 backdrop-blur-md rounded-md px-2 py-0.5 text-[9px] font-bold text-slate-700 border border-slate-200/80 shadow-2xs flex items-center gap-1 pointer-events-none z-10">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
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
                <span>Màu chữ: <strong class="text-[#7C3AED]">{{ selectedTextColor() }}</strong></span>
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

            <h3 class="text-lg font-bold text-[#1E1B4B] mb-1">Lưu thiết kế vào tài khoản</h3>
            <p class="text-xs text-slate-500 mb-5 leading-relaxed">
              Đăng nhập để lưu thiết kế của riêng bạn. Bản nháp được giữ trên thiết bị này để bạn tiếp tục sau khi đăng nhập.
            </p>

            <div class="space-y-3">
              <button 
                (click)="goToAccount('login')"
                class="w-full py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span class="material-symbols-outlined text-[18px]">login</span>
                <span>Đăng nhập bằng email</span>
              </button>

              <button 
                (click)="goToAccount('register')"
                class="w-full py-3 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#7C3AED] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span class="material-symbols-outlined text-[18px]">smartphone</span>
                <span>Tạo tài khoản mới</span>
              </button>


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
  textBlocks = signal<StudioTextBlock[]>([]);
  selectedTextBlockId = signal<string | null>(null);
  faceTextBlocks = computed(() => this.textBlocks().filter(block => block.face === (this.isFrontFace() ? 'front' : 'back')));
  selectedTextBlock = computed(() => this.textBlocks().find(block => block.id === this.selectedTextBlockId()));
  frontMessage = signal<string>('');
  backMessage = signal<string>('');
  selectedColor = signal<string>('Mặc định');
  selectedFont = signal<string>('Signature');
  selectedTextColor = signal<string>('#0F172A');
  selectedPattern = signal<string>('none');
  uploadedImage = signal<string>('');
  imageScale = signal<number>(1);
  activeStickers = signal<StudioGraphic[]>([]);

  // Cliparts from Admin Asset API
  dynamicStickers = signal<StudioAsset[]>([]);
  graphicsLibraryLoading = signal(false);
  graphicsLibraryError = signal(false);

  graphicsQuery = signal('');
  graphicsCategory = signal('');
  graphicsNotice = signal('');
  pendingGraphicAdds = signal(0);
  graphicsAssets = computed(() => this.dynamicStickers().filter(asset => asset.type === 'CLIPART' && asset.isActive !== false));
  filteredGraphics = computed(() => filterGraphics(this.graphicsAssets(), this.graphicsCategory(), this.graphicsQuery()));
  graphicsCategories = computed(() => [...new Set(this.graphicsAssets().map(a => a.category || 'Phổ biến'))]);
  private graphicImages = new Map<string, HTMLImageElement>();
  private graphicLoads = new Map<string, Promise<HTMLImageElement>>();
  private graphicsRenderVersion = 0;

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
    { name: 'Signature', label: 'Dancing Script · Chữ ký', family: 'Dancing Script', fontFamily: 'Dancing Script, "Giftory Card Serif", serif' },
    { name: 'Serif Elegant', label: 'Noto Serif · Thanh lịch', family: 'Giftory Card Serif', fontFamily: '"Giftory Card Serif", serif' },
    { name: 'Sans Minimal', label: 'Be Vietnam Pro · Tối giản', family: 'Be Vietnam Pro', fontFamily: 'Be Vietnam Pro, "Giftory Card Serif", sans-serif' },
    { name: 'Vintage Typewriter', label: 'Roboto Mono · Máy chữ', family: 'Roboto Mono', fontFamily: 'Roboto Mono, "Giftory Card Serif", monospace' },
    { name: 'Romantic Script', label: 'Mali · Viết tay', family: 'Mali', fontFamily: 'Mali, "Giftory Card Serif", cursive' },
    { name: 'Royal Calligraphy', label: 'Lora · Cổ điển', family: 'Lora', fontFamily: 'Lora, "Giftory Card Serif", serif' }
  ];
  pendingTextFonts = signal(0);
  textFontNotice = signal('');
  private loadedTextFonts = new Set<string>();
  private loadingTextFonts = new Set<string>();
  private failedTextFonts = new Set<string>();
  private studioDestroyed = false;

  textAlignments: { value: 'left' | 'center' | 'right'; label: string; icon: string }[] = [
    { value: 'left', label: 'Căn trái', icon: 'format_align_left' },
    { value: 'center', label: 'Căn giữa', icon: 'format_align_center' },
    { value: 'right', label: 'Căn phải', icon: 'format_align_right' }
  ];
  textColors = [
    { name: 'Đen', hex: '#0F172A' }, { name: 'Trắng', hex: '#FFFFFF' },
    { name: 'Đỏ', hex: '#DC2626' }, { name: 'Cam', hex: '#F97316' },
    { name: 'Vàng', hex: '#F59E0B' }, { name: 'Xanh lá', hex: '#16A34A' },
    { name: 'Xanh dương', hex: '#2563EB' }, { name: 'Tím', hex: '#7C3AED' },
    { name: 'Hồng', hex: '#EC4899' }
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
  private blankImages = new Map<string, Promise<HTMLImageElement>>();
  private blankRenderVersion = 0;
  blankImageNotice = signal('');

  private getGuideReferenceImage(): string {
    const config = this.activeTemplate()?.customConfig;
    // The admin area editor uses the original front image as its coordinate reference.
    return config?.frontBlankImage || config?.backBlankImage
      || config?.blanks?.[0]?.frontBlankImage || config?.blanks?.[0]?.backBlankImage
      || this.getCurrentBlankImage();
  }

  private fitBlankImage(image: HTMLImageElement): AreaBox {
    const width = image.naturalWidth || 420;
    const height = image.naturalHeight || 420;
    const scale = Math.min(430 / width, 430 / height);
    const displayWidth = Math.round(width * scale);
    const displayHeight = Math.round(height * scale);
    return { x: Math.round((460 - displayWidth) / 2), y: Math.round((460 - displayHeight) / 2), width: displayWidth, height: displayHeight };
  }

  private loadBlankImage(url: string): Promise<HTMLImageElement> {
    const cached = this.blankImages.get(url);
    if (cached) return cached;
    const request = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'Anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Không tải được ảnh phôi'));
      image.src = url;
    }).catch(error => {
      this.blankImages.delete(url);
      throw error;
    });
    this.blankImages.set(url, request);
    return request;
  }

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
  private textNodes = new Map<string, Konva.Text>();
  private get textNode(): Konva.Text | null {
    return this.textNodes.get(this.selectedTextBlockId() || '') || null;
  }
  private photoNode: Konva.Image | null = null;
  private stickerNodes: Konva.Shape[] = [];
  private transformer: Konva.Transformer | null = null;

  maxTextLength = computed(() => {
    return this.activeTemplate()?.customConfig?.maxTextLength || 35;
  });

  studioBlankOptions = computed(() => {
    const config = this.activeTemplate()?.customConfig;
    const blanks = config?.blanks || [];
    const front = config?.frontBlankImage?.trim() || '';
    const back = config?.backBlankImage?.trim() || '';
    const hasOriginal = !!(front || back);
    const originalListed = blanks.some(blank =>
      (blank.frontBlankImage?.trim() || '') === front && (blank.backBlankImage?.trim() || '') === back);
    if ((hasOriginal && !originalListed) || !blanks.length) {
      const names = new Set(blanks.map(blank => blank.name));
      let name = 'Mặc định';
      for (let suffix = 1; names.has(name); suffix++) {
        name = suffix === 1 ? 'Phôi gốc' : `Phôi gốc (${suffix})`;
      }
      return [{ name, colorHex: '#FFFFFF', frontBlankImage: front, backBlankImage: back }, ...blanks];
    }
    return blanks;
  });

  availableColorOptions = computed(() => {
    return this.studioBlankOptions().map(blank => ({
      name: blank.name, hex: blank.colorHex || '#FFFFFF',
      sku: '', isOutOfStock: false
    }));
  });

  baseProductPrice = computed(() => {
    const tpl = this.activeTemplate();
    return tpl?.salePrice && tpl.salePrice > 0 ? tpl.salePrice : (tpl?.price ?? 0);
  });

  surchargeList = computed<SurchargeBreakdown[]>(() => {
    const list: SurchargeBreakdown[] = [];
    const tpl = this.activeTemplate();

    const backFee = tpl?.customConfig?.backEngraveFee ?? 20000;
    if (this.textBlocks().some(block => block.face === 'back' && block.visible && block.text.trim())) {
      list.push({ label: 'Khắc laser mặt sau', amount: backFee });
    }

    const pat = this.patternLibrary.find(p => p.id === this.selectedPattern());
    if (pat && pat.surcharge > 0) {
      list.push({ label: `Họa tiết ${pat.name}`, amount: pat.surcharge });
    }

    const photoFee = tpl?.customConfig?.photoPrintFee ?? 30000;
    if (this.uploadedImage()) {
      list.push({ label: 'In ảnh cá nhân chuẩn HD', amount: photoFee });
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
      const blocks = this.textBlocks();
      const front = this.frontMessage();
      const back = this.backMessage();
      const col = this.selectedColor();
      const font = this.selectedFont();
      const engCol = this.selectedTextColor();
      const pat = this.selectedPattern();
      const img = this.uploadedImage();
      const scale = this.imageScale();
      const stks = this.activeStickers();

      if (tpl && !this.isEditingCartItem()) {
        const draft = {
          productId: tpl._id,
          textBlocks: blocks,
          frontMessage: front,
          backMessage: back,
          selectedColor: col,
          selectedFont: font,
          selectedTextColor: engCol,
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
                if (matched) this.selectTemplate(matched);

                if (cartItem.customDetails) {
                  const cd = cartItem.customDetails;
                  this.restoreTextBlocks(cd);
                  if (cd.selectedColor) this.setColor(cd.selectedColor);
                  if (cd.fontFamily) this.selectedFont.set(cd.fontFamily);
                  this.syncTextControls();
                  if (cd.pattern) this.selectedPattern.set(cd.pattern);
                  if (cd.uploadedImage) this.uploadedImage.set(cd.uploadedImage);
                  if (cd.imageScale) this.imageScale.set(cd.imageScale);
                  if (cd.stickers) this.restoreGraphics(cd.stickers);
                }
                this.updateKonvaCanvas();
                return;
              }
            }

            if (params['editId']) {
              this.studioService.getDesignById(params['editId']).subscribe({
                next: design => {
                  const productId = typeof design.productId === 'object' ? design.productId._id : design.productId;
                  this.selectTemplate(tpls.find(t => t._id === productId) || tpls[0]);
                  this.restoreTextBlocks(design);
                  if (design.selectedColor) this.setColor(design.selectedColor);
                  this.selectedFont.set(design.fontFamily || 'Signature');
                  this.syncTextControls();
                  this.selectedPattern.set(design.pattern || 'none');
                  this.uploadedImage.set(design.uploadedImage || '');
                  this.imageScale.set(design.imageScale ?? 1);
                  this.restoreGraphics(design.stickers || []);
                  this.updateKonvaCanvas();
                },
                error: () => {
                  this.selectTemplate(tpls[0]);
                  this.activeToolTab.set('GRAPHICS');
                  this.graphicsNotice.set('Không mở được thiết kế đã lưu. Vui lòng thử lại.');
                  this.updateKonvaCanvas();
                }
              });
              return;
            }

            let chosenTpl = tpls[0];
            if (pid) {
              const matched = tpls.find(t => t._id === pid);
              if (matched) chosenTpl = matched;
            }

            this.selectTemplate(chosenTpl);

            const savedDraft = this.studioService.getDraftFromStorage();
            if (savedDraft && (!pid || savedDraft.productId === pid)) {
              if (savedDraft.frontMessage === 'Happy Anniversary Minh Anh ❤️') {
                this.studioService.clearDraftFromStorage();
              } else {
                this.restoreTextBlocks(savedDraft);
                if (savedDraft.selectedColor) this.setColor(savedDraft.selectedColor);
                if (savedDraft.selectedFont) this.selectedFont.set(savedDraft.selectedFont);
                this.syncTextControls();
                if (savedDraft.selectedPattern) this.selectedPattern.set(savedDraft.selectedPattern);
                if (savedDraft.uploadedImage) this.uploadedImage.set(savedDraft.uploadedImage);
                if (savedDraft.imageScale) this.imageScale.set(savedDraft.imageScale);
                if (savedDraft.stickers) this.restoreGraphics(savedDraft.stickers);
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
    this.studioDestroyed = true;
    ++this.graphicsRenderVersion;
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

    // Keep the artwork clip synchronized while transforming
    this.transformer.on('transform transformend', (event) => {
      if (event.type === 'transformend') this.transformer?.nodes().forEach(node => this.persistGraphic(node));
      this.syncSafeAreaClip();
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

    // Keep guides anchored to the original blank, regardless of the selected color image's aspect ratio.
    const blankUrl = this.getCurrentBlankImage();
    const referenceUrl = this.getGuideReferenceImage();
    const template = this.activeTemplate();
    const version = ++this.blankRenderVersion;
    this.blankImageNotice.set('');
    Promise.all([this.loadBlankImage(blankUrl), this.loadBlankImage(referenceUrl)]).then(([image, reference]) => {
      if (this.studioDestroyed || !this.bgLayer || version !== this.blankRenderVersion || template !== this.activeTemplate()) return;
      this.currentMockupBounds = this.fitBlankImage(reference);
      const bounds = this.fitBlankImage(image);
      const attrs = { ...bounds, image, visible: true, listening: true };
      if (!this.productImgNode) {
        this.productImgNode = new Konva.Image(attrs);
        this.bgLayer.add(this.productImgNode);
      } else {
        this.productImgNode.setAttrs(attrs);
      }
      this.bgLayer.batchDraw();
      this.renderGuidesOnKonva();
      this.renderTextBlocks();
      this.renderStickersOnKonva();
      this.syncSafeAreaClip();
    }).catch(() => {
      if (this.studioDestroyed || version !== this.blankRenderVersion || template !== this.activeTemplate()) return;
      this.productImgNode?.hide();
      this.bgLayer?.batchDraw();
      this.blankImageNotice.set('Không tải được ảnh phôi hoặc ảnh phôi gốc. Vui lòng chọn lại màu phôi.');
    });

    this.renderTextBlocks();

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
        this.syncSafeAreaClip();
      };
      photoImg.src = this.uploadedImage();
    } else if (this.photoNode) {
      this.photoNode.hide();
    }

    // 4. Render Stickers
    this.renderStickersOnKonva();

    // 5. Render Print Area & Safe Area Guides
    this.renderGuidesOnKonva();
    this.syncSafeAreaClip();

    this.drawLayer.batchDraw();
    this.uiLayer?.batchDraw();
  }

  private renderGuidesOnKonva(): void {
    this.syncSafeAreaClip();
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
    const safeStroke = 'rgba(16, 185, 129, 0.75)';
    const safeWidth = 1.5;

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
        fill: '#10B981',
        opacity: 0.85,
        listening: false
      });
      this.guidesLayer.add(this.safeAreaLabel);
    } else {
      this.safeAreaLabel.setAttrs({
        x: saPx.x + 6,
        y: safeLabelY,
        fill: '#10B981'
      });
    }

    this.guidesLayer.batchDraw();
  }

  private syncSafeAreaClip(): void {
    if (!this.drawLayer) return;
    // Clip artwork on both scene and hit canvases; keep background, guides and
    // transformer handles on their own layers so cropped items remain editable.
    const { saPx } = this.getGuideCoordinates();
    this.drawLayer.clip(saPx);
    this.drawLayer.batchDraw();
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
    this.persistGraphic(selected);

    this.drawLayer?.batchDraw();
    this.uiLayer?.batchDraw();
    this.syncSafeAreaClip();
  }

  toggleGuides(): void {
    this.showGuides.set(!this.showGuides());
    this.renderGuidesOnKonva();
  }

  removeGraphic(id: string): void {
    this.activeStickers.update(items => items.filter(item => item.id !== id));
    if (this.transformer?.nodes()[0]?.getAttr('graphicId') === id) {
      this.transformer.nodes([]);
      this.selectedNodeName.set(null);
    }
    this.graphicsNotice.set('');
    this.renderStickersOnKonva();
  }

  private restoreGraphics(items: StudioGraphic[]): void {
    this.activeStickers.set(items.map(item => ({ ...item })));
    items.forEach(item => {
      const url = item.imageUrl || (item.type === 'CLIPART' ? item.icon : '');
      if (url) this.loadGraphicImage(url).catch(() => this.graphicsNotice.set('Một clipart không tải được. Bạn có thể xóa hình trong danh sách đồ họa.'));
    });
  }

  private loadGraphicImage(url: string): Promise<HTMLImageElement> {
    const cached = this.graphicImages.get(url);
    if (cached) return Promise.resolve(cached);
    const pending = this.graphicLoads.get(url);
    if (pending) return pending;
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => { this.graphicImages.set(url, image); resolve(image); };
      image.onerror = () => { reject(new Error('Không tải được hình')); };
      image.src = url;
    }).finally(() => this.graphicLoads.delete(url));
    this.graphicLoads.set(url, promise);
    return promise;
  }

  private renderStickersOnKonva(): void {
    if (!this.drawLayer) return;
    const version = ++this.graphicsRenderVersion;
    const selectedId = this.transformer?.nodes()[0]?.getAttr('graphicId');
    if (selectedId) this.transformer?.nodes([]);
    this.stickerNodes.forEach(n => n.destroy());
    this.stickerNodes = [];
    const { saPx } = this.getGuideCoordinates();
    const items = graphicsForFace(this.activeStickers(), this.isFrontFace());
    items.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)).forEach(stk => {
      const create = (image?: HTMLImageElement) => {
        if (version !== this.graphicsRenderVersion || !this.drawLayer) return;
        const normalized = stk.coordinateSpace === 'safe-area';
        const config = {
          x: normalized ? saPx.x + (stk.x ?? 0.35) * saPx.width : (stk.x ?? saPx.x + saPx.width * 0.35),
          y: normalized ? saPx.y + (stk.y ?? 0.35) * saPx.height : (stk.y ?? saPx.y + saPx.height * 0.35),
          scaleX: stk.scaleX ?? 1, scaleY: stk.scaleY ?? 1, rotation: stk.rotation ?? 0,
          draggable: true, graphicId: stk.id,
        };
        const node: Konva.Shape = image
          ? new Konva.Image({ ...config, image, width: (stk.width ?? 0.3) * saPx.width, height: (stk.height ?? 0.3) * saPx.height })
          : new Konva.Text({ ...config, text: stk.icon, fontSize: 32 });
        if (!image && stk.width && stk.height) {
          node.width(stk.width * saPx.width);
          node.height(stk.height * saPx.height);
          (node as Konva.Text).fontSize(stk.height * saPx.height);
        }
        this.makeDraggableAndSelectable(node, `Đồ họa ${stk.name}`);
        node.on('dragend transformend', () => this.persistGraphic(node));
        this.drawLayer.add(node);
        this.stickerNodes.push(node);
        // Image load completion order must not change the saved stacking order.
        this.stickerNodes.sort((a, b) => items.findIndex(i => i.id === a.getAttr('graphicId')) - items.findIndex(i => i.id === b.getAttr('graphicId')));
        this.applyElementOrder();
        if (stk.id === selectedId) this.transformer?.nodes([node]);
        this.persistGraphic(node);
        this.drawLayer.batchDraw();
        this.uiLayer?.batchDraw();
        this.syncSafeAreaClip();
      };
      const url = stk.imageUrl || (stk.type === 'CLIPART' ? stk.icon : '');
      if (url) {
        const cached = this.graphicImages.get(url);
        if (cached) create(cached);
        else this.loadGraphicImage(url).then(create).catch(() => {
          if (version === this.graphicsRenderVersion) this.graphicsNotice.set('Không tải được một clipart. Hãy kiểm tra kết nối hoặc xóa hình bị lỗi.');
        });
      } else create();
    });
  }

  fontFamilyFor(name: string): string {
    return this.fontOptions.find(font => font.name === name)?.fontFamily || '"Giftory Card Serif", serif';
  }

  setBlockFont(id: string, name: string): void {
    if (!this.fontOptions.some(font => font.name === name)) return;
    this.selectTextBlock(id);
    this.updateTextBlock(id, { fontFamily: name });
  }

  setBlockFontSize(id: string, value: number | null): void {
    if (value === null || !Number.isFinite(Number(value))) return;
    this.selectTextBlock(id);
    this.updateTextBlock(id, { fontSize: Math.max(8, Math.min(120, Number(value))) });
  }

  retryTextFonts(): void {
    this.failedTextFonts.clear();
    this.textFontNotice.set('');
    this.renderTextBlocks();
  }

  private ensureTextFont(block: StudioTextBlock): boolean {
    if (!block.visible || !block.text.trim() || typeof document === 'undefined' || !document.fonts) return true;
    const font = this.fontOptions.find(font => font.name === block.fontFamily) || this.fontOptions[1];
    const spec = `${block.italic ? 'italic' : 'normal'} ${block.bold ? 700 : 400} 16px "${font.family}"`;
    if (this.loadedTextFonts.has(spec)) return true;
    if (this.loadingTextFonts.has(spec) || this.failedTextFonts.has(spec)) return false;
    this.loadingTextFonts.add(spec);
    this.pendingTextFonts.update(count => count + 1);
    const sample = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ĂÂĐÊÔƠƯ ăâđêôơư ÁÀẢÃẠẮẰẲẴẶẤẦẨẪẬÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ áàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ';
    document.fonts.load(spec, sample).then(faces => {
      if (!faces.length) throw new Error('Font unavailable');
      this.loadedTextFonts.add(spec);
    }).catch(() => {
      this.failedTextFonts.add(spec);
      this.textFontNotice.set('Chưa tải được font chữ. Vui lòng thử lại trước khi lưu hoặc xuất ảnh.');
    }).finally(() => {
      this.loadingTextFonts.delete(spec);
      this.pendingTextFonts.update(count => count - 1);
      if (!this.studioDestroyed) this.renderTextBlocks();
    });
    return false;
  }

  private textFontsReady(): boolean {
    const ready = this.faceTextBlocks().map(block => this.ensureTextFont(block)).every(Boolean);
    if (!ready || this.pendingTextFonts()) {
      this.activeToolTab.set('TEXT');
      return false;
    }
    return true;
  }

  private newTextBlock(face: 'front' | 'back', text = ''): StudioTextBlock {
    return {
      id: crypto.randomUUID(), face, text, fontFamily: 'Sans Minimal',
      color: '#0F172A', fontSize: 14, align: 'center', bold: false, italic: false,
      letterSpacing: 0, lineHeight: 1.3, visible: true,
      x: 0.1, y: 0.15, width: 0.8, scaleX: 1, scaleY: 1, rotation: 0,
      zIndex: Math.max(0, ...this.textBlocks().map(b => b.zIndex), ...this.activeStickers().map(b => b.zIndex || 0)) + 1
    };
  }

  addTextBlock(): void {
    const face = this.isFrontFace() ? 'front' : 'back';
    const block = this.newTextBlock(face);
    const previous = this.faceTextBlocks().at(-1);
    const previousNode = previous && this.textNodes.get(previous.id);
    if (previous && previousNode) {
      const { saPx } = this.getGuideCoordinates();
      block.y = Math.min(0.8, previous.y + previousNode.height() * Math.abs(previous.scaleY) / saPx.height + 0.06);
    }
    this.textBlocks.update(blocks => [...blocks, block]);
    this.syncTextSummaries();
    this.renderTextBlocks();
    this.selectTextBlock(block.id);
  }

  selectTextBlock(id: string, selectCanvas = true): void {
    const block = this.textBlocks().find(item => item.id === id);
    if (!block) return;
    this.selectedTextBlockId.set(id);
    this.activeToolTab.set('TEXT');
    this.syncTextControls();
    if (selectCanvas) {
      const node = this.textNodes.get(id);
      this.transformer?.nodes(node && block.visible ? [node] : []);
      this.transformer?.keepRatio(false);
      this.selectedNodeName.set('Chữ Khắc');
      this.uiLayer?.batchDraw();
    }
  }

  private syncTextControls(): void {
    const block = this.selectedTextBlock();
    if (!block) return;
    this.selectedFont.set(block.fontFamily);
    this.selectedTextColor.set(this.resolveTextColor(block.color));
    this.textSize.set(block.fontSize);
    this.textAlign.set(block.align);
    this.isTextBold.set(block.bold);
    this.isTextItalic.set(block.italic);
  }

  private resolveTextColor(value: unknown): string {
    if (typeof value !== 'string') return '#0F172A';
    if (/^#[0-9a-f]{6}$/i.test(value)) return value.toUpperCase();
    if (/^#[0-9a-f]{3}$/i.test(value)) return '#' + value.slice(1).split('').map(char => char + char).join('').toUpperCase();
    const legacy: Record<string, string> = {
      'Vàng Kim (Gold)': '#F59E0B', Gold: '#F59E0B',
      'Bạc Ánh Kim (Silver)': '#E2E8F0', Silver: '#E2E8F0',
      'Đen Huyền Bí': '#0F172A', 'Dark Slate': '#0F172A',
      'Đỏ Ruby': '#DC2626', Red: '#DC2626', 'Vàng Hồng (Rose Gold)': '#FB7185'
    };
    return legacy[value] || '#0F172A';
  }

  editTextBlock(id: string, patch: Partial<StudioTextBlock>): void {
    this.selectTextBlock(id);
    this.updateTextBlock(id, patch);
  }

  updateTextBlock(id: string, patch: Partial<StudioTextBlock>): void {
    const changes = patch.color !== undefined ? { ...patch, color: this.resolveTextColor(patch.color) } : patch;
    this.textBlocks.update(blocks => blocks.map(block => block.id === id ? { ...block, ...changes, id: block.id, face: block.face } : block));
    this.syncTextControls();
    this.syncTextSummaries();
    this.renderTextBlocks();
  }

  updateSelectedTextBlock(patch: Partial<StudioTextBlock>): void {
    const id = this.selectedTextBlockId();
    if (id) this.updateTextBlock(id, patch);
  }

  duplicateTextBlock(id: string): void {
    const source = this.textBlocks().find(block => block.id === id);
    if (!source) return;
    const block = { ...source, id: crypto.randomUUID(), x: source.x + 0.04, y: source.y + 0.04, zIndex: this.newTextBlock(source.face).zIndex };
    this.textBlocks.update(blocks => [...blocks, block]);
    this.syncTextSummaries();
    this.renderTextBlocks();
    this.selectTextBlock(block.id);
  }

  removeTextBlock(id: string): void {
    this.textBlocks.update(blocks => blocks.filter(block => block.id !== id));
    if (this.selectedTextBlockId() === id) {
      this.selectedTextBlockId.set(this.faceTextBlocks()[0]?.id || null);
      this.transformer?.nodes([]);
      this.selectedNodeName.set(null);
    }
    this.syncTextControls();
    this.syncTextSummaries();
    this.renderTextBlocks();
  }

  private syncTextSummaries(): void {
    const message = (face: 'front' | 'back') => this.textBlocks()
      .filter(block => block.face === face && block.visible && block.text.trim())
      .map(block => block.text).join('\n');
    this.frontMessage.set(message('front'));
    this.backMessage.set(message('back'));
  }

  private restoreTextBlocks(source: any): void {
    const legacy = () => (['front', 'back'] as const).flatMap(face => {
      const text = face === 'front' ? source.frontMessage : source.backMessage;
      if (!text) return [];
      return [{ ...this.newTextBlock(face, text), fontFamily: source.fontFamily || source.selectedFont || 'Signature',
        color: this.resolveTextColor(source.color || source.engraveColor || source.selectedTextColor || source.selectedEngraveColor), fontSize: 14, italic: true, y: 0.45 }];
    });
    const ids = new Set<string>();
    const blocks: StudioTextBlock[] = Array.isArray(source.textBlocks)
      ? source.textBlocks.filter((block: any) => block && typeof block.text === 'string').map((block: any) => {
        const base = this.newTextBlock(block.face === 'back' ? 'back' : 'front');
        const finite = (key: keyof StudioTextBlock, min: number, max: number) => Number.isFinite(block[key]) ? Math.max(min, Math.min(max, block[key])) : base[key];
        const id = typeof block.id === 'string' && block.id && !ids.has(block.id) ? block.id : base.id;
        ids.add(id);
        return { ...base, id, text: block.text,
          fontFamily: this.fontOptions.some(font => font.name === block.fontFamily) ? block.fontFamily : base.fontFamily,
          color: this.resolveTextColor(block.color || block.engraveColor),
          fontSize: finite('fontSize', 8, 120), align: ['left', 'center', 'right'].includes(block.align) ? block.align : 'center',
          bold: block.bold === true, italic: block.italic === true, visible: block.visible !== false,
          letterSpacing: finite('letterSpacing', -2, 12), lineHeight: finite('lineHeight', 0.8, 3),
          x: finite('x', -10, 10), y: finite('y', -10, 10), width: finite('width', 0.01, 10),
          scaleX: finite('scaleX', -100, 100), scaleY: finite('scaleY', -100, 100), rotation: finite('rotation', -36000, 36000),
          zIndex: finite('zIndex', 0, Number.MAX_SAFE_INTEGER)
        } as StudioTextBlock;
      }) : legacy();
    this.textBlocks.set(blocks);
    this.selectedTextBlockId.set(this.faceTextBlocks()[0]?.id || null);
    this.syncTextControls();
    this.syncTextSummaries();
    this.renderTextBlocks();
  }

  private renderTextBlocks(): void {
    if (!this.drawLayer) return;
    const { saPx } = this.getGuideCoordinates();
    const blocks = this.faceTextBlocks();
    let fontsReady = true;
    for (const [id, node] of this.textNodes) {
      if (!blocks.some(block => block.id === id)) {
        if (this.transformer?.nodes().includes(node)) this.transformer.nodes([]);
        node.destroy();
        this.textNodes.delete(id);
      }
    }
    for (const block of blocks) {
      let node = this.textNodes.get(block.id);
      if (!node) {
        node = new Konva.Text({ textBlockId: block.id, draggable: true });
        this.makeDraggableAndSelectable(node, 'Chữ Khắc');
        node.on('transformend', () => this.persistTextBlock(node!));
        this.textNodes.set(block.id, node);
        this.drawLayer.add(node);
      }
      const font = this.fontOptions.find(font => font.name === block.fontFamily);
      const color = this.resolveTextColor(block.color);
      const fontReady = this.ensureTextFont(block);
      fontsReady = fontsReady && fontReady;
      node.setAttrs({ text: block.text.normalize('NFC'), x: saPx.x + block.x * saPx.width, y: saPx.y + block.y * saPx.height,
        width: Math.max(1, block.width * saPx.width), fontSize: block.fontSize,
        fontFamily: font?.fontFamily || '"Giftory Card Serif", serif', fontStyle: `${block.bold ? 'bold ' : ''}${block.italic ? 'italic' : 'normal'}`,
        fill: color, align: block.align, lineHeight: block.lineHeight, letterSpacing: block.letterSpacing,
        visible: block.visible && fontReady, scaleX: block.scaleX, scaleY: block.scaleY, rotation: block.rotation,
      });
      if (!block.visible && this.transformer?.nodes().includes(node)) this.transformer.nodes([]);
    }
    if (fontsReady && !this.pendingTextFonts()) this.textFontNotice.set('');
    this.applyElementOrder();
    this.transformer?.forceUpdate();
    this.drawLayer.batchDraw();
    this.uiLayer?.batchDraw();
    this.syncSafeAreaClip();
  }

  private persistTextBlock(node: Konva.Node, saveOrder = false): void {
    const id = node.getAttr('textBlockId');
    if (!id) return;
    const { saPx } = this.getGuideCoordinates();
    this.textBlocks.update(blocks => blocks.map(block => block.id === id ? { ...block,
      x: (node.x() - saPx.x) / saPx.width, y: (node.y() - saPx.y) / saPx.height,
      width: node.width() / saPx.width, scaleX: node.scaleX(), scaleY: node.scaleY(), rotation: node.rotation(),
      zIndex: saveOrder ? node.zIndex() : block.zIndex
    } : block));
  }

  private applyElementOrder(): void {
    const text = [...(this.textNodes?.values() || [])].map(node => ({ node, order: this.textBlocks().find(block => block.id === node.getAttr('textBlockId'))?.zIndex || 0 }));
    const graphics = this.stickerNodes.map(node => ({ node, order: this.activeStickers().find(block => block.id === node.getAttr('graphicId'))?.zIndex || 0 }));
    [...text, ...graphics].sort((a, b) => a.order - b.order).forEach(item => item.node.moveToTop());
  }

  private persistGraphic(node: Konva.Node, saveOrder = false): void {
    if (node.getAttr('textBlockId')) { this.persistTextBlock(node, saveOrder); return; }
    const id = node.getAttr('graphicId');
    if (!id) return;
    const { saPx } = this.getGuideCoordinates();
    this.activeStickers.update(items => items.map(item => item.id === id ? {
      ...item, coordinateSpace: 'safe-area',
      x: (node.x() - saPx.x) / saPx.width, y: (node.y() - saPx.y) / saPx.height,
      width: node.width() / saPx.width, height: node.height() / saPx.height,
      scaleX: node.scaleX(), scaleY: node.scaleY(), rotation: node.rotation(), zIndex: saveOrder ? node.zIndex() : item.zIndex,
    } : item));
  }

  duplicateGraphic(): void {
    const node = this.transformer?.nodes()[0];
    const item = this.activeStickers().find(i => i.id === node?.getAttr('graphicId'));
    if (!item || this.activeStickers().length >= 30) return;
    this.activeStickers.update(items => [...items, { ...item, id: crypto.randomUUID(), x: (item.x ?? 0.35) + 0.04, y: (item.y ?? 0.35) + 0.04, zIndex: Math.max(0, ...items.map(item => item.zIndex ?? 0)) + 1 }]);
    this.renderStickersOnKonva();
  }

  flipGraphic(): void {
    const node = this.transformer?.nodes()[0];
    if (!node?.getAttr('graphicId')) return;
    const angle = node.rotation() * Math.PI / 180;
    const distance = node.width() * node.scaleX();
    node.x(node.x() + Math.cos(angle) * distance);
    node.y(node.y() + Math.sin(angle) * distance);
    node.scaleX(-node.scaleX());
    this.persistGraphic(node);
    this.drawLayer?.batchDraw();
    this.syncSafeAreaClip();
  }

  private makeDraggableAndSelectable(node: Konva.Node, name: string): void {
    const selectNode = () => {
      this.selectedNodeName.set(name);
      if (node.getAttr('textBlockId')) this.selectTextBlock(node.getAttr('textBlockId'), false);
      if (this.transformer) {
        if (name === 'Ảnh Cá Nhân' || name.startsWith('Đồ họa')) {
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
      } else if (name.startsWith('Đồ họa')) {
        this.activeToolTab.set('GRAPHICS');
      }
    };

    node.on('click tap', selectNode);
    node.on('dragstart', selectNode);
    node.on('dragmove', () => this.syncSafeAreaClip());
    node.on('dragend', () => { this.persistGraphic(node); this.syncSafeAreaClip(); });
  }

  // Canvas Action Toolbars
  centerSelectedNode(): void {
    const selected = this.transformer?.nodes()[0];
    if (selected) {
      selected.x((460 - (selected.width() * selected.scaleX())) / 2);
      this.persistGraphic(selected);
      this.drawLayer?.batchDraw();
      this.uiLayer?.batchDraw();
      this.syncSafeAreaClip();
    } else if (this.textNode) {
      this.textNode.x((460 - this.textNode.width()) / 2);
      this.persistTextBlock(this.textNode);
      this.drawLayer?.batchDraw();
      this.uiLayer?.batchDraw();
      this.syncSafeAreaClip();
    }
  }

  deleteSelectedNode(): void {
    const selected = this.transformer?.nodes()[0];
    if (!selected) return;

    if (selected === this.photoNode) {
      this.removeImage();
    } else if (selected.getAttr('graphicId')) {
      this.activeStickers.update(items => items.filter(item => item.id !== selected.getAttr('graphicId')));
      this.renderStickersOnKonva();
    } else if (selected.getAttr('textBlockId')) {
      this.removeTextBlock(selected.getAttr('textBlockId'));
    }
    this.transformer?.nodes([]);
    this.selectedNodeName.set(null);
    this.uiLayer?.batchDraw();
    this.syncSafeAreaClip();
  }

  bringForward(): void {
    const selected = this.transformer?.nodes()[0];
    if (selected) {
      selected.moveUp();
      this.stickerNodes.forEach(node => this.persistGraphic(node, true));
      this.textNodes.forEach(node => this.persistTextBlock(node, true));
      this.drawLayer?.batchDraw();
      this.uiLayer?.batchDraw();
    }
  }

  sendBackward(): void {
    const selected = this.transformer?.nodes()[0];
    if (selected) {
      selected.moveDown();
      this.stickerNodes.forEach(node => this.persistGraphic(node, true));
      this.textNodes.forEach(node => this.persistTextBlock(node, true));
      this.drawLayer?.batchDraw();
      this.uiLayer?.batchDraw();
    }
  }

  setTextSize(size: number): void {
    this.updateSelectedTextBlock({ fontSize: Math.max(8, Math.min(120, Number(size))) });
  }

  setTextAlign(align: 'left' | 'center' | 'right'): void {
    this.updateSelectedTextBlock({ align });
  }

  toggleBold(): void {
    this.updateSelectedTextBlock({ bold: !this.selectedTextBlock()?.bold });
  }

  toggleItalic(): void {
    this.updateSelectedTextBlock({ italic: !this.selectedTextBlock()?.italic });
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
      this.syncSafeAreaClip();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      selected.y(selected.y() + (event.shiftKey ? 10 : 2));
      this.drawLayer?.batchDraw();
      this.uiLayer?.batchDraw();
      this.syncSafeAreaClip();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      selected.x(selected.x() - (event.shiftKey ? 10 : 2));
      this.drawLayer?.batchDraw();
      this.uiLayer?.batchDraw();
      this.syncSafeAreaClip();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      selected.x(selected.x() + (event.shiftKey ? 10 : 2));
      this.drawLayer?.batchDraw();
      this.uiLayer?.batchDraw();
      this.syncSafeAreaClip();
    }
    this.persistGraphic(selected);
  }

  downloadSnapshot(): void {
    if (!this.stage || !this.textFontsReady()) return;
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
  setFont(fontName: string): void {
    this.updateSelectedTextBlock({ fontFamily: fontName });
  }

  setColor(colorName: string): void {
    const opt = this.availableColorOptions().find(c => c.name === colorName);
    if (!opt) return;
    if (opt.isOutOfStock) {
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
    this.transformer?.nodes([]);
    this.selectedNodeName.set(null);
    const first = this.faceTextBlocks()[0];
    this.selectedTextBlockId.set(first?.id || null);
    this.syncTextControls();
    this.updateKonvaCanvas();
  }

  loadStudioAssets(): void {
    this.graphicsLibraryLoading.set(true);
    this.graphicsLibraryError.set(false);
    this.studioService.getAssets('CLIPART').subscribe({
      next: assets => {
        this.dynamicStickers.set(Array.isArray(assets) ? assets : []);
        this.graphicsLibraryLoading.set(false);
      },
      error: () => {
        this.dynamicStickers.set([]);
        this.graphicsLibraryLoading.set(false);
        this.graphicsLibraryError.set(true);
      },
    });
  }

  getCurrentBlankImage(): string {
    const tpl = this.activeTemplate();
    if (!tpl) return 'https://placehold.co/400';

    const blank = this.studioBlankOptions().find(b => b.name === this.selectedColor());
    return (this.isFrontFace()
      ? blank?.frontBlankImage || tpl.customConfig?.frontBlankImage
      : blank?.backBlankImage || tpl.customConfig?.backBlankImage) || 'https://placehold.co/400?text=Chua+co+anh+phoi';
  }

  selectTemplate(tpl: Product): void {
    this.activeTemplate.set(tpl);
    this.selectedColor.set(this.availableColorOptions()[0]?.name || 'Mặc định');
    this.updateKonvaCanvas();
  }

  resetToDefaults(): void {
    this.studioService.clearDraftFromStorage();
    this.textBlocks.set([]);
    this.selectedTextBlockId.set(null);
    this.syncTextSummaries();
    this.renderTextBlocks();
    this.selectedColor.set(this.availableColorOptions()[0]?.name || 'Mặc định');
    this.selectedFont.set('Signature');
    this.selectedTextColor.set('#0F172A');
    this.selectedPattern.set('none');
    this.uploadedImage.set('');
    this.imageScale.set(1);
    this.activeStickers.set([]);
    this.hasRestoredDraft.set(false);
    this.updateKonvaCanvas();
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

  async addGraphic(asset: StudioAsset): Promise<void> {
    if (asset.type !== 'CLIPART' || !(asset.imageUrl || asset.icon)) return;
    if (this.activeStickers().length >= 30) return;
    this.graphicsNotice.set('');
    const face = this.isFrontFace() ? 'front' : 'back';
    this.pendingGraphicAdds.update(count => count + 1);
    const url = asset.imageUrl || (asset.type === 'CLIPART' ? asset.icon : '');
    try {
      const image = url ? await this.loadGraphicImage(url) : null;
      if (this.activeStickers().length >= 30) return;
      const { saPx } = this.getGuideCoordinates();
      const ratio = image ? image.naturalHeight / image.naturalWidth : 1;
      const width = Math.min(saPx.width * 0.3, saPx.height * 0.3 / ratio);
      this.activeStickers.update(items => [...items, {
        id: crypto.randomUUID(), assetId: asset._id, name: asset.name, icon: asset.icon,
        type: 'CLIPART', imageUrl: url || undefined, face,
        coordinateSpace: 'safe-area', x: 0.35, y: 0.35,
        ...(image ? { width: width / saPx.width, height: width * ratio / saPx.height } : {}),
        zIndex: Math.max(0, ...items.map(item => item.zIndex ?? 0)) + 1,
      }]);
      this.renderStickersOnKonva();
    } catch { this.graphicsNotice.set('Không tải được hình. Vui lòng kiểm tra kết nối và thử lại.'); }
    finally { this.pendingGraphicAdds.update(count => count - 1); }
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
    if (!this.activeTemplate()) return false;
    if (!this.textFontsReady()) return false;
    if (this.pendingGraphicAdds()) {
      this.graphicsNotice.set('Vui lòng chờ clipart tải xong trước khi lưu.');
      this.activeToolTab.set('GRAPHICS');
      return false;
    }
    if (this.activeStickers().some(item => item.imageUrl && !this.graphicImages.has(item.imageUrl))) {
      this.graphicsNotice.set('Clipart chưa tải xong hoặc bị lỗi. Hãy chờ tải xong hoặc xóa hình bị lỗi trước khi lưu.');
      this.activeToolTab.set('GRAPHICS');
      return false;
    }
    if (this.formErrors.image) this.activeToolTab.set('IMAGE');
    return !this.formErrors.image;
  }

  isFormInvalid(): boolean {
    return !this.activeTemplate();
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

    const msg = this.frontMessage();

    return {
      textBlocks: this.textBlocks().map(block => ({ ...block })),
      frontMessage: msg,
      backMessage: this.backMessage(),
      customText: msg,
      fontFamily: this.selectedFont(),
      engraveColor: this.selectedTextColor(),
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
      return;
    }

    const tpl = this.activeTemplate();
    if (!tpl) return;

    const customDetails = this.getConfirmedCustomDetails();

    if (this.isEditingCartItem() && this.editingCartItemIndex() !== null) {
      this.cartService.updateCustomDetails(
        this.editingCartItemIndex()!,
        customDetails
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
    this.cartService.addItem(tpl._id, 1, undefined, customDetails).subscribe({
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
    this.cartService.addItem(tpl._id, 1, undefined, customDetails).subscribe({
      next: () => {
        this.router.navigate(['/cart']);
      }
    });
  }

  onSaveDesignClick(): void {
    if (!this.validateInputs()) {
      return;
    }

    if (this.authService.isAuthenticated()) {
      this.saveDesignToCloud();
    } else {
      this.showSaveLoginModal.set(true);
    }
  }

  goToAccount(page: 'login' | 'register'): void {
    this.showSaveLoginModal.set(false);
    this.router.navigate(['/' + page], { queryParams: { returnUrl: this.router.url } });
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
