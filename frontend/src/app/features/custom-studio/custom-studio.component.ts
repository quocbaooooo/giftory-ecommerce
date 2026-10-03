import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CustomStudioService } from '../../core/services/custom-studio.service';
import { CartService } from '../../core/services/cart.service';
import { Product } from '../../core/models';

@Component({
  selector: 'app-custom-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="max-w-[1520px] mx-auto px-4 md:px-8 py-6">
      
      <!-- Studio Header Bar -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-[#DDD6FE]/60 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[#7C3AED]">palette</span>
          <span class="font-bold text-[#1E1B4B]">Studio Chế Tác Quà Tặng Giftory (BP-02)</span>
          <span class="text-slate-400">•</span>
          <span class="text-slate-600 font-medium">{{ activeTemplate()?.name || 'Bình Giữ Nhiệt Nordic' }}</span>
          <span class="bg-purple-100 text-[#7C3AED] text-xs font-semibold px-2 py-0.5 rounded-full">Bespoke 1:1</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Độ trễ render 3D: 12ms
          </div>
          <span class="text-xs font-bold text-[#10B981] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Áp dụng cọc 50% (BR-PAY05)
          </span>
        </div>
      </div>

      <!-- 7 Product Category Rail -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-[#DDD6FE]/60 mb-6">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-1.5 font-bold text-xs text-[#1E1B4B]">
            <span class="material-symbols-outlined text-[16px] text-[#7C3AED]">category</span>
            <span>Chọn Dòng Sản Phẩm Phôi Chế Tác:</span>
          </div>
          <span class="text-[11px] font-semibold text-[#7C3AED] bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
            Miễn phí khắc laser & thiết kế bản mẫu
          </span>
        </div>

        <div class="flex items-center gap-2.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          @for (tpl of templates(); track tpl._id) {
            <button 
              (click)="selectTemplate(tpl)"
              class="flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all shrink-0 font-medium cursor-pointer"
              [ngClass]="activeTemplate()?._id === tpl._id ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-purple-200'"
            >
              <img [src]="tpl.images[0]" [alt]="tpl.name" class="w-6 h-6 rounded-md object-cover bg-white">
              <span class="whitespace-nowrap">{{ tpl.name.split('&')[0].trim() }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Main Layout: 7 Cols Left (Interactive Preview Canvas) / 5 Cols Right (Controls) -->
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        <!-- LEFT: INTERACTIVE PREVIEW CANVAS -->
        <div class="xl:col-span-7 flex flex-col gap-6">
          <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-shop-card border border-[#DDD6FE] flex flex-col items-center relative overflow-hidden">
            
            <!-- Canvas Controls Header -->
            <div class="w-full flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <button 
                  (click)="isFrontFace.set(true)"
                  class="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all"
                  [ngClass]="isFrontFace() ? 'bg-[#7C3AED] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                >
                  <span class="material-symbols-outlined text-[16px]">flip_to_front</span>
                  Mặt Trước (Front)
                </button>
                <button 
                  (click)="isFrontFace.set(false)"
                  class="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all"
                  [ngClass]="!isFrontFace() ? 'bg-[#7C3AED] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                >
                  <span class="material-symbols-outlined text-[16px]">flip_to_back</span>
                  Mặt Sau (Back)
                </button>
              </div>

              <div class="flex items-center gap-1.5 text-xs font-semibold text-[#7C3AED] bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                <span class="w-1.5 h-1.5 rounded-full bg-[#7C3AED]"></span>
                Real-time Preview • Khắc Laser Thật 1:1
              </div>
            </div>

            <!-- Central Mockup Image with Live Engraving Overlay -->
            <div class="relative w-full max-w-[440px] my-3 flex flex-col items-center justify-center">
              <div class="relative w-full rounded-2xl overflow-hidden shadow-xl border-2 border-purple-100 bg-[#F5ECE9] flex items-center justify-center p-6 min-h-[460px]">
                <img 
                  [src]="activeTemplate()?.images?.[0] || 'https://placehold.co/400'" 
                  [alt]="activeTemplate()?.name" 
                  class="h-[380px] w-auto object-contain drop-shadow-2xl transition-all duration-300"
                >

                <!-- Live Laser Engraved Badge Overlay -->
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-12 flex flex-col items-center text-center pointer-events-none px-5 py-3 rounded-2xl bg-slate-900/40 backdrop-blur-[2px] border border-amber-300/40 shadow-inner max-w-[280px]">
                  <!-- Stickers Row -->
                  <div class="flex items-center gap-1.5 mb-1.5">
                    @for (stk of activeStickers(); track stk.id) {
                      <span class="text-base animate-bounce">{{ stk.icon }}</span>
                    }
                  </div>

                  <!-- Engraved Message -->
                  <div 
                    class="font-semibold text-sm tracking-wide drop-shadow break-words"
                    [ngClass]="getFontClass()"
                    [style.color]="getEngraveColorCode()"
                  >
                    {{ isFrontFace() ? (frontMessage() || 'Happy Anniversary') : (backMessage() || 'Bespoke 2026') }}
                  </div>

                  <div class="text-[9px] text-amber-100/70 tracking-widest mt-1.5 uppercase">
                    EST. 2026 • GIFTORY BESPOKE
                  </div>
                </div>

                <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1 text-[10px] font-bold text-slate-700 border border-slate-200/80 shadow-sm flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Khắc Laser Thật 1:1
                </div>
              </div>
            </div>

            <!-- Canvas Bottom Controls -->
            <div class="w-full flex items-center justify-between text-xs pt-4 border-t border-slate-100 text-slate-500">
              <span>Màu đang chọn: <strong class="text-[#7C3AED]">{{ selectedColor() }}</strong></span>
              <span>Font chữ: <strong class="text-[#7C3AED]">{{ selectedFont() }}</strong></span>
              <span>Màu khắc: <strong class="text-[#7C3AED]">{{ selectedEngraveColor() }}</strong></span>
            </div>
          </div>
        </div>

        <!-- RIGHT: CUSTOMIZER CONTROLS -->
        <div class="xl:col-span-5 flex flex-col gap-6">
          
          <!-- Control Step 1: Color Swatch -->
          <div class="bg-white rounded-3xl p-6 shadow-shop-card border border-[#DDD6FE]">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2 font-bold text-sm text-[#1E1B4B]">
                <span class="w-6 h-6 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-xs font-bold">1</span>
                <span>Chọn Phối Màu Vỏ Phôi:</span>
              </div>
              <span class="text-xs text-[#7C3AED] font-semibold">{{ selectedColor() }}</span>
            </div>

            <div class="grid grid-cols-5 gap-3 text-center text-xs">
              @for (c of colorOptions; track c.name) {
                <div 
                  (click)="selectedColor.set(c.name)"
                  class="flex flex-col items-center gap-1 cursor-pointer group"
                >
                  <div 
                    class="w-10 h-10 rounded-full border-2 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110"
                    [style.backgroundColor]="c.hex"
                    [class.border-[#7C3AED]]="selectedColor() === c.name"
                    [class.ring-2]="selectedColor() === c.name"
                    [class.ring-purple-300]="selectedColor() === c.name"
                    [class.border-slate-300]="selectedColor() !== c.name"
                  >
                    @if (selectedColor() === c.name) {
                      <span class="material-symbols-outlined text-xs font-bold" [style.color]="c.hex === '#FFFFFF' ? '#000' : '#FFF'">check</span>
                    }
                  </div>
                  <span class="text-[11px] font-medium" [class.text-[#7C3AED]]="selectedColor() === c.name">{{ c.name }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Control Step 2: Message & Font -->
          <div class="bg-white rounded-3xl p-6 shadow-shop-card border border-[#DDD6FE]">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2 font-bold text-sm text-[#1E1B4B]">
                <span class="w-6 h-6 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-xs font-bold">2</span>
                <span>Nội Dung Khắc Laser / Thông Điệp:</span>
              </div>
              <span class="text-xs text-emerald-600 font-bold">Miễn phí</span>
            </div>

            <!-- Front Message Input -->
            <div class="mb-3">
              <label class="text-xs font-bold text-slate-700 block mb-1">Mặt Trước (Tên người nhận / Lời chúc):</label>
              <div class="relative">
                <input 
                  [(ngModel)]="frontMessage"
                  maxlength="35"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] outline-none font-medium pr-16 text-slate-800"
                  placeholder="VD: Happy Anniversary Minh Anh ❤️"
                >
                <span class="absolute right-3 top-3 text-[11px] text-slate-400 font-medium">
                  {{ frontMessage().length }}/35
                </span>
              </div>
            </div>

            <!-- Back Message Input -->
            <div class="mb-4">
              <label class="text-xs font-bold text-slate-700 block mb-1">Mặt Sau (Ngày kỷ niệm / Tọa độ / Ký tên):</label>
              <div class="relative">
                <input 
                  [(ngModel)]="backMessage"
                  maxlength="35"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] outline-none font-medium pr-16 text-slate-800"
                  placeholder="VD: 14.02.2024 • Yêu Em Mãi Mãi"
                >
                <span class="absolute right-3 top-3 text-[11px] text-slate-400 font-medium">
                  {{ backMessage().length }}/35
                </span>
              </div>
            </div>

            <!-- Font Picker -->
            <div class="mb-4">
              <div class="text-xs font-bold text-slate-700 mb-2">Chọn Font Chữ Nghệ Thuật:</div>
              <div class="grid grid-cols-2 gap-2 text-xs">
                @for (f of fontOptions; track f.name) {
                  <button 
                    (click)="selectedFont.set(f.name)"
                    class="p-2.5 rounded-xl border text-left transition-all cursor-pointer"
                    [ngClass]="selectedFont() === f.name ? 'border-[#7C3AED] bg-purple-50 text-[#7C3AED] font-bold' : 'border-slate-200 hover:border-slate-300 text-slate-700'"
                  >
                    <div class="text-[11px] font-semibold">{{ f.name }}</div>
                    <div class="text-sm mt-0.5 truncate" [ngClass]="f.class">Minh Anh & Hoàng</div>
                  </button>
                }
              </div>
            </div>

            <!-- Engrave Color -->
            <div>
              <div class="text-xs font-bold text-slate-700 mb-2">Màu Lớp Khắc / Phủ Ánh Kim:</div>
              <div class="flex items-center gap-3">
                @for (ec of engraveColors; track ec.name) {
                  <button 
                    (click)="selectedEngraveColor.set(ec.name)"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all"
                    [ngClass]="selectedEngraveColor() === ec.name ? 'border-[#7C3AED] bg-purple-50 text-[#7C3AED]' : 'border-slate-200 text-slate-600'"
                  >
                    <span class="w-3.5 h-3.5 rounded-full border border-slate-300" [style.backgroundColor]="ec.hex"></span>
                    <span>{{ ec.name }}</span>
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- Control Step 3: Stickers Library -->
          <div class="bg-white rounded-3xl p-6 shadow-shop-card border border-[#DDD6FE]">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2 font-bold text-sm text-[#1E1B4B]">
                <span class="w-6 h-6 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-xs font-bold">3</span>
                <span>Thêm Icon / Sticker Đồ Họa:</span>
              </div>
              <span class="text-xs text-slate-400">Chọn tối đa 3 icon</span>
            </div>

            <div class="grid grid-cols-6 gap-2 text-center text-xs">
              @for (stk of stickerLibrary; track stk.name) {
                <button 
                  (click)="toggleSticker(stk)"
                  class="p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer"
                  [ngClass]="isStickerActive(stk.name) ? 'border-[#7C3AED] bg-purple-50 shadow-sm' : 'border-slate-100 hover:border-purple-200 bg-slate-50'"
                >
                  <span class="text-xl">{{ stk.icon }}</span>
                  <span class="text-[9px] text-slate-600 truncate w-full">{{ stk.name }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Checkout & Deposit Summary Action Card -->
          <div class="bg-gradient-to-br from-purple-50 to-white rounded-3xl p-6 shadow-shop-card border-2 border-[#7C3AED]/30">
            <div class="flex items-center justify-between mb-3">
              <div>
                <span class="text-xs font-bold text-slate-500 uppercase tracking-wide">Giá Sản Phẩm Chế Tác:</span>
                <div class="text-2xl font-extrabold text-[#7C3AED]">
                  {{ totalProductPrice() | number:'1.0-0' }}đ
                </div>
              </div>
              <div class="text-right">
                <span class="text-xs font-bold text-[#10B981] uppercase tracking-wide">CỌC 50% THANH TOÁN TRƯỚC:</span>
                <div class="text-xl font-bold text-[#10B981]">
                  {{ depositPrice() | number:'1.0-0' }}đ
                </div>
              </div>
            </div>

            <p class="text-[11px] text-slate-500 mb-4 leading-relaxed">
              Theo quy tắc <strong>BR-PAY05</strong>, xưởng tiếp nhận cọc 50% ({{ depositPrice() | number:'1.0-0' }}đ) để cắt phôi inox/nung men và khắc laser theo thiết kế riêng. Số tiền 50% còn lại thanh toán COD khi nhận hàng.
            </p>

            <div class="flex items-center gap-3">
              <button 
                (click)="addToCartAndCheckout()"
                class="flex-1 py-3.5 px-4 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-300 transition-all active:scale-95 cursor-pointer"
              >
                <span class="material-symbols-outlined text-[20px]">shopping_bag</span>
                <span>Thêm Vào Giỏ & Đặt Cọc 50%</span>
              </button>

              <button 
                (click)="saveDesignOnly()"
                class="px-4 py-3.5 rounded-xl border border-[#DDD6FE] bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                title="Lưu lại vào bộ sưu tập thiết kế"
              >
                <span class="material-symbols-outlined text-[18px]">bookmark</span>
                <span class="hidden sm:inline">Lưu</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
})
export class CustomStudioComponent implements OnInit {
  private studioService = inject(CustomStudioService);
  private cartService = inject(CartService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  templates = signal<Product[]>([]);
  activeTemplate = signal<Product | null>(null);

  isFrontFace = signal<boolean>(true);
  frontMessage = signal<string>('Happy Anniversary Minh Anh ❤️');
  backMessage = signal<string>('14.02.2024 • Bespoke');
  selectedColor = signal<string>('Navy Blue');
  selectedFont = signal<string>('Signature');
  selectedEngraveColor = signal<string>('Vàng Kim (Gold)');
  activeStickers = signal<Array<{ id: string; icon: string; name: string }>>([
    { id: '1', icon: '❤️', name: 'Trái tim' },
    { id: '2', icon: '✨', name: 'Tinh tú' }
  ]);

  colorOptions = [
    { name: 'Navy Blue', hex: '#1E3A8A' },
    { name: 'Deep Slate', hex: '#0F172A' },
    { name: 'Sand Beige', hex: '#FEF3C7' },
    { name: 'Terracotta', hex: '#99443D' },
    { name: 'Pure White', hex: '#FFFFFF' }
  ];

  fontOptions = [
    { name: 'Signature', class: 'font-serif italic' },
    { name: 'Serif Elegant', class: 'font-serif font-bold uppercase' },
    { name: 'Sans Minimal', class: 'font-sans font-bold' },
    { name: 'Vintage Typewriter', class: 'font-mono' }
  ];

  engraveColors = [
    { name: 'Vàng Kim (Gold)', hex: '#F59E0B' },
    { name: 'Bạc Ánh Kim (Silver)', hex: '#E2E8F0' },
    { name: 'Đen Huyền Bí', hex: '#0F172A' },
    { name: 'Đỏ Ruby', hex: '#DC2626' }
  ];

  stickerLibrary = [
    { name: 'Trái tim', icon: '❤️' },
    { name: 'Tim đôi', icon: '💖' },
    { name: 'Tinh tú', icon: '✨' },
    { name: 'Crown', icon: '👑' },
    { name: 'Nơ quà', icon: '🎀' },
    { name: 'Bánh kem', icon: '🎂' },
    { name: 'Hộp quà', icon: '🎁' },
    { name: 'Nâng ly', icon: '🥂' },
    { name: 'Cỏ 4 lá', icon: '🍀' },
    { name: 'Hoa đào', icon: '🌸' },
    { name: 'Kim cương', icon: '💎' },
    { name: 'Ngọn lửa', icon: '🔥' }
  ];

  totalProductPrice = computed(() => {
    const tpl = this.activeTemplate();
    const base = tpl?.salePrice && tpl.salePrice > 0 ? tpl.salePrice : (tpl?.price || 250000);
    return base;
  });

  depositPrice = computed(() => Math.round(this.totalProductPrice() * 0.5));

  ngOnInit(): void {
    this.studioService.getTemplates().subscribe({
      next: tpls => {
        this.templates.set(tpls);
        if (tpls.length > 0) {
          this.route.queryParams.subscribe(params => {
            const pid = params['productId'];
            if (pid) {
              const matched = tpls.find(t => t._id === pid);
              this.activeTemplate.set(matched || tpls[0]);
            } else {
              this.activeTemplate.set(tpls[0]);
            }
          });
        }
      }
    });
  }

  selectTemplate(tpl: Product): void {
    this.activeTemplate.set(tpl);
  }

  getFontClass(): string {
    const f = this.fontOptions.find(o => o.name === this.selectedFont());
    return f ? f.class : 'font-serif italic';
  }

  getEngraveColorCode(): string {
    const ec = this.engraveColors.find(o => o.name === this.selectedEngraveColor());
    return ec ? ec.hex : '#F59E0B';
  }

  isStickerActive(name: string): boolean {
    return this.activeStickers().some(s => s.name === name);
  }

  toggleSticker(stk: { name: string; icon: string }): void {
    const current = [...this.activeStickers()];
    const idx = current.findIndex(s => s.name === stk.name);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      if (current.length >= 3) {
        current.shift();
      }
      current.push({ id: String(Date.now()), ...stk });
    }
    this.activeStickers.set(current);
  }

  saveDesignOnly(): void {
    const tpl = this.activeTemplate();
    if (!tpl) return;

    this.studioService.saveDesign({
      productId: tpl._id,
      title: `Thiết kế ${tpl.name}`,
      frontMessage: this.frontMessage(),
      backMessage: this.backMessage(),
      fontFamily: this.selectedFont(),
      engraveColor: this.selectedEngraveColor(),
      selectedColor: this.selectedColor(),
      stickers: this.activeStickers(),
      previewImage: tpl.images[0]
    }).subscribe({
      next: () => {
        alert('Đã lưu bản thiết kế vào mục "Bản thiết kế của bạn" thành công!');
        this.router.navigate(['/wishlist']);
      }
    });
  }

  addToCartAndCheckout(): void {
    const tpl = this.activeTemplate();
    if (!tpl) return;

    const customDetails = {
      frontMessage: this.frontMessage(),
      backMessage: this.backMessage(),
      fontFamily: this.selectedFont(),
      engraveColor: this.selectedEngraveColor(),
      selectedColor: this.selectedColor(),
      stickers: this.activeStickers(),
      previewImage: tpl.images[0]
    };

    this.cartService.addItem(tpl._id, 1, this.selectedColor(), customDetails).subscribe({
      next: () => {
        this.router.navigate(['/cart']);
      }
    });
  }
}
