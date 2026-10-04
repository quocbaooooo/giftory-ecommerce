import { Component, signal, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AiChatbotService, AiChatResponse, AiProductCard } from '../../../core/services/ai-chatbot.service';

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
  intent?: 'RECOMMENDATION' | 'SUPPORT_ORDER' | 'SUPPORT_POLICY' | 'HANDOVER_HUMAN' | 'AMBIGUOUS' | 'SAFETY_GUARD';
  products?: AiProductCard[];
  orderInfo?: any;
  handoverInfo?: any;
  quickChips?: { label: string; value: string; step?: number }[];
  isProximateFallback?: boolean;
}

@Component({
  selector: 'app-ai-concierge',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <!-- Floating AI Trigger Button (When minimized) -->
    @if (!isOpen()) {
      <button 
        (click)="openWidget()"
        class="relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#F43F5E] text-white font-semibold text-sm shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-white cursor-pointer group"
        title="Mở trợ lý AI tư vấn quà tặng và tra cứu đơn hàng"
      >
        <span class="material-symbols-outlined text-[20px] animate-bounce">auto_awesome</span>
        <span>AI Tư Vấn Quà Tặng</span>
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white animate-pulse"></span>
        @if (messages().length > 1) {
          <span class="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold border border-white shadow-xs">
            {{ messages().length }}
          </span>
        }
      </button>
    }

    <!-- AI Chat Window Dialog: Unified Window (US-PD-03.2) -->
    @if (isOpen()) {
      <div 
        class="fixed bottom-6 right-6 z-50 bg-white rounded-3xl shadow-2xl border border-purple-200/90 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-all"
        [ngClass]="isExpanded() 
          ? 'w-[94vw] sm:w-[680px] md:w-[780px] h-[88vh] max-h-[860px]' 
          : 'w-[94vw] sm:w-[480px] md:w-[500px] h-[80vh] sm:h-[730px] max-h-[calc(100vh-2.5rem)]'"
      >
        <!-- Header -->
        <div class="px-5 py-3.5 bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#EC4899] text-white flex items-center justify-between shadow-sm shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md shadow-inner border border-white/20">
              <span class="material-symbols-outlined text-[22px]">psychology</span>
            </div>
            <div>
              <div class="font-bold text-sm sm:text-base leading-tight flex items-center gap-1.5">
                <span>Giftory AI Concierge</span>
                <span class="text-[9px] px-1.5 py-0.5 rounded-md bg-white/25 font-bold uppercase tracking-wider">Hợp Nhất</span>
              </div>
              <div class="text-[11px] text-purple-100 flex items-center gap-1.5 mt-0.5">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Tư vấn quà tặng & Tra cứu đơn hàng 24/7</span>
              </div>
            </div>
          </div>
          
          <div class="flex items-center gap-1">
            <!-- Reset Conversation Button -->
            <button 
              (click)="resetConversation()" 
              class="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              title="Làm mới cuộc trò chuyện"
            >
              <span class="material-symbols-outlined text-[17px]">restart_alt</span>
            </button>
            <!-- Expand / Minimize Window Size Button -->
            <button 
              (click)="isExpanded.set(!isExpanded())" 
              class="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              [title]="isExpanded() ? 'Thu nhỏ kích thước' : 'Mở rộng toàn màn hình'"
            >
              <span class="material-symbols-outlined text-[18px]">
                {{ isExpanded() ? 'close_fullscreen' : 'open_in_full' }}
              </span>
            </button>
            <!-- Minimize Button (US-PD-05.1: Context Retention) -->
            <button 
              (click)="isOpen.set(false)" 
              class="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              title="Thu nhỏ cửa sổ chat"
            >
              <span class="material-symbols-outlined text-[18px]">remove</span>
            </button>
          </div>
        </div>

        <!-- Guided 3-Step Flow Status Bar (US-PD-03.3) -->
        <div class="bg-purple-50/70 border-b border-purple-100/70 px-4 py-2 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[15px] text-[#7C3AED]">assistant</span>
            <span class="font-semibold text-slate-700">Tư vấn 3 bước:</span>
            <span class="px-1.5 py-0.5 rounded font-bold" [ngClass]="currentContext.recipient ? 'bg-purple-200 text-[#7C3AED]' : 'bg-slate-200 text-slate-500'">1. Người nhận</span>
            <span>→</span>
            <span class="px-1.5 py-0.5 rounded font-bold" [ngClass]="currentContext.occasion ? 'bg-purple-200 text-[#7C3AED]' : 'bg-slate-200 text-slate-500'">2. Dịp tặng</span>
            <span>→</span>
            <span class="px-1.5 py-0.5 rounded font-bold" [ngClass]="currentContext.budget ? 'bg-purple-200 text-[#7C3AED]' : 'bg-slate-200 text-slate-500'">3. Mức giá</span>
          </div>
          <button (click)="startGuidedFlow()" class="text-[#7C3AED] hover:underline font-bold text-[10px] cursor-pointer">
            Bắt đầu lại
          </button>
        </div>

        <!-- Messages Area: Auto-scroll with Rich Message Cards -->
        <div #messagesContainer class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs sm:text-sm bg-gradient-to-b from-[#F3EBF9]/25 to-white">
          @for (msg of messages(); track msg.id) {
            @if (msg.sender === 'ai') {
              <div class="flex items-start gap-2.5 max-w-[96%] sm:max-w-[90%]">
                <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#EC4899] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm text-xs font-bold">
                  ✨
                </div>
                <div class="bg-white text-slate-800 p-4 rounded-2xl rounded-tl-sm border border-purple-100 shadow-sm leading-relaxed space-y-3 w-full">
                  <!-- Text content -->
                  <div class="whitespace-pre-line text-slate-700 font-normal leading-relaxed">{{ msg.text }}</div>

                  <!-- Fallback Proximate Notice Badge (BR-REC05) -->
                  @if (msg.isProximateFallback) {
                    <div class="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                      <span class="material-symbols-outlined text-[16px] text-amber-600">info</span>
                      <span>Đang hiển thị các lựa chọn tiệm cận tốt nhất do tiêu chí tìm kiếm chưa có sản phẩm khớp 100%.</span>
                    </div>
                  }

                  <!-- 1. PRODUCT RECOMMENDATION CAROUSEL (US-PD-04 & US-PD-05) -->
                  @if (msg.products && msg.products.length > 0) {
                    <div class="pt-2 border-t border-purple-50">
                      <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <span class="material-symbols-outlined text-xs text-[#7C3AED]">recommend</span>
                        Sản phẩm thực tế trong catalog (Còn hàng)
                      </div>
                      
                      <!-- Cards Grid/Carousel -->
                      <div class="grid grid-cols-1 gap-3" [ngClass]="isExpanded() ? 'sm:grid-cols-2' : ''">
                        @for (prod of msg.products; track prod.id) {
                          <div class="bg-purple-50/40 hover:bg-purple-50/80 rounded-2xl p-3 border border-purple-100/90 transition-all flex flex-col justify-between shadow-2xs group">
                            <div class="flex gap-3">
                              <!-- Thumbnail click navigates to Product Detail (US-PD-05) -->
                              <a 
                                [routerLink]="['/products', prod.slug]" 
                                [queryParams]="{ ref: 'ai_recommendation', session_id: sessionId }"
                                (click)="minimizeChat()"
                                class="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-purple-100 block group-hover:scale-105 transition-transform"
                              >
                                <img [src]="prod.image" [alt]="prod.name" class="w-full h-full object-cover">
                              </a>
                              
                              <div class="flex-1 min-w-0">
                                <a 
                                  [routerLink]="['/products', prod.slug]" 
                                  [queryParams]="{ ref: 'ai_recommendation', session_id: sessionId }"
                                  (click)="minimizeChat()"
                                  class="font-bold text-slate-800 hover:text-[#7C3AED] transition-colors truncate block text-xs sm:text-sm"
                                  [title]="prod.name"
                                >
                                  {{ prod.name }}
                                </a>

                                <div class="flex items-center gap-2 mt-1">
                                  <span class="text-xs font-bold text-[#7C3AED]">
                                    {{ (prod.salePrice || prod.price) | number:'1.0-0' }}đ
                                  </span>
                                  @if (prod.salePrice) {
                                    <span class="text-[10px] text-slate-400 line-through">
                                      {{ prod.price | number:'1.0-0' }}đ
                                    </span>
                                  }
                                  @if (prod.isCustomizable) {
                                    <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-pink-100 text-pink-700 border border-pink-200">
                                      Cọc 50%
                                    </span>
                                  }
                                </div>

                                <div class="text-[11px] text-slate-500 mt-1.5 line-clamp-2 italic">
                                  "{{ prod.fitReason }}"
                                </div>
                              </div>
                            </div>

                            <!-- Action Buttons CTA (US-PD-04.2 & US-PD-05.1) -->
                            <div class="flex items-center gap-2 mt-3 pt-2 border-t border-purple-100/60">
                              <a 
                                [routerLink]="['/products', prod.slug]"
                                [queryParams]="{ ref: 'ai_recommendation', session_id: sessionId }"
                                (click)="minimizeChat()"
                                class="flex-1 py-1.5 px-2 rounded-xl bg-white border border-[#DDD6FE] text-[#7C3AED] hover:bg-purple-100 font-bold text-[11px] text-center transition-colors shadow-2xs"
                              >
                                Xem chi tiết
                              </a>
                              <a 
                                [routerLink]="['/custom-studio']"
                                [queryParams]="{ product: prod.slug, ref: 'ai_recommendation' }"
                                (click)="minimizeChat()"
                                class="flex-1 py-1.5 px-2 rounded-xl bg-[#7C3AED] text-white hover:bg-[#6D28D9] font-bold text-[11px] text-center transition-colors shadow-2xs"
                              >
                                Tùy chỉnh ngay
                              </a>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- 2. ORDER LOOKUP STATUS CARD (US-PD-03.1 Support Intent) -->
                  @if (msg.orderInfo) {
                    <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                      <div class="flex items-center justify-between">
                        <span class="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          <span class="material-symbols-outlined text-[16px] text-[#7C3AED]">local_shipping</span>
                          Đơn hàng #{{ msg.orderInfo.orderCode }}
                        </span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-[#7C3AED] border border-purple-200">
                          {{ msg.orderInfo.status }}
                        </span>
                      </div>
                      
                      <div class="text-[11px] text-slate-600 space-y-1">
                        <div><strong class="text-slate-700">Khách hàng:</strong> {{ msg.orderInfo.customerName }} ({{ msg.orderInfo.phone }})</div>
                        <div><strong class="text-slate-700">Tổng thanh toán:</strong> {{ msg.orderInfo.totalAmount | number:'1.0-0' }}đ</div>
                      </div>

                      @if (msg.orderInfo.items && msg.orderInfo.items.length > 0) {
                        <div class="pt-2 border-t border-slate-200 space-y-1.5">
                          <div class="text-[10px] uppercase font-bold text-slate-400">Sản phẩm trong đơn:</div>
                          @for (it of msg.orderInfo.items; track it.productName) {
                            <div class="flex items-center justify-between text-[11px] text-slate-700">
                              <span>• {{ it.productName }}</span>
                              <span class="font-semibold text-slate-900">x{{ it.quantity }} ({{ it.unitPrice | number:'1.0-0' }}đ)</span>
                            </div>
                          }
                        </div>
                      }

                      <div class="pt-2">
                        <a routerLink="/orders" (click)="minimizeChat()" class="text-xs text-[#7C3AED] font-bold hover:underline flex items-center gap-1">
                          Xem chi tiết tiến trình đơn hàng
                          <span class="material-symbols-outlined text-xs">arrow_forward</span>
                        </a>
                      </div>
                    </div>
                  }

                  <!-- 3. SEAMLESS HUMAN HANDOVER CARD (BR-REC07 & US-PD-03.4) -->
                  @if (msg.handoverInfo) {
                    <div class="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 space-y-3">
                      <div class="flex items-center gap-3">
                        <img [src]="msg.handoverInfo.avatar" alt="Agent" class="w-12 h-12 rounded-full object-cover border-2 border-[#7C3AED]">
                        <div>
                          <div class="font-bold text-slate-900 text-xs sm:text-sm">{{ msg.handoverInfo.agentName }}</div>
                          <div class="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                            Trực tuyến (Chờ kết nối: {{ msg.handoverInfo.queueTime }})
                          </div>
                        </div>
                      </div>

                      <div class="flex items-center gap-2">
                        <a 
                          [href]="'tel:' + msg.handoverInfo.hotline" 
                          class="flex-1 py-2 px-3 rounded-xl bg-white border border-[#DDD6FE] text-[#7C3AED] font-bold text-xs text-center flex items-center justify-center gap-1.5 hover:bg-purple-100 transition shadow-xs"
                        >
                          <span class="material-symbols-outlined text-[16px]">call</span>
                          Hotline 1900 8888
                        </a>
                        <a 
                          [href]="msg.handoverInfo.zaloUrl" 
                          target="_blank"
                          class="flex-1 py-2 px-3 rounded-xl bg-[#0068FF] text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 hover:bg-blue-600 transition shadow-xs"
                        >
                          <span class="material-symbols-outlined text-[16px]">chat</span>
                          Zalo CSKH Trực Tiếp
                        </a>
                      </div>
                    </div>
                  }

                  <!-- Quick Chips attached to message -->
                  @if (msg.quickChips && msg.quickChips.length > 0) {
                    <div class="pt-2 border-t border-purple-50 flex flex-wrap gap-1.5">
                      @for (chip of msg.quickChips; track chip.label) {
                        <button 
                          (click)="onChipClick(chip)"
                          class="px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-50 text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white border border-purple-200 transition-all cursor-pointer shadow-2xs"
                        >
                          {{ chip.label }}
                        </button>
                      }
                    </div>
                  }
                </div>
              </div>
            } @else {
              <!-- User Message Bubble -->
              <div class="flex justify-end">
                <div class="bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white p-3.5 sm:p-4 rounded-2xl rounded-tr-sm max-w-[85%] leading-relaxed font-medium shadow-sm text-xs sm:text-sm">
                  {{ msg.text }}
                </div>
              </div>
            }
          }

          <!-- Thinking Spinner -->
          @if (isThinking()) {
            <div class="flex items-center gap-2.5 text-slate-500 text-xs italic">
              <div class="w-7 h-7 rounded-full bg-purple-100 text-[#7C3AED] flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[16px] animate-spin">autorenew</span>
              </div>
              <span>Giftory AI đang phân tích dữ liệu và catalog thực tế...</span>
            </div>
          }
        </div>

        <!-- Sticky Quick Suggestion Chips (US-PD-03.3) -->
        <div class="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-[11px] sm:text-xs no-scrollbar shrink-0">
          <button (click)="sendPreset('Gợi ý quà sinh nhật tặng mẹ tinh tế')" class="px-3 py-1.5 rounded-full bg-white border border-purple-200 text-[#7C3AED] hover:bg-purple-50 shrink-0 font-medium transition-colors shadow-2xs cursor-pointer">
            🌸 Quà tặng mẹ
          </button>
          <button (click)="sendPreset('Quà kỷ niệm tình yêu khắc tên dưới 500k')" class="px-3 py-1.5 rounded-full bg-white border border-purple-200 text-[#7C3AED] hover:bg-purple-50 shrink-0 font-medium transition-colors shadow-2xs cursor-pointer">
            💖 Kỷ niệm tình yêu
          </button>
          <button (click)="sendPreset('Kiểm tra trạng thái đơn hàng của tôi')" class="px-3 py-1.5 rounded-full bg-white border border-purple-200 text-[#7C3AED] hover:bg-purple-50 shrink-0 font-medium transition-colors shadow-2xs cursor-pointer">
            📦 Tra cứu đơn hàng
          </button>
          <button (click)="sendPreset('Chính sách giao hàng hỏa tốc 2 giờ')" class="px-3 py-1.5 rounded-full bg-white border border-purple-200 text-[#7C3AED] hover:bg-purple-50 shrink-0 font-medium transition-colors shadow-2xs cursor-pointer">
            ⚡ Giao hỏa tốc 2h
          </button>
          <button (click)="sendPreset('Cho mình gặp nhân viên tư vấn')" class="px-3 py-1.5 rounded-full bg-white border border-purple-200 text-[#7C3AED] hover:bg-purple-50 shrink-0 font-medium transition-colors shadow-2xs cursor-pointer">
            📞 Gặp nhân viên CSKH
          </button>
        </div>

        <!-- Input Bar with Security & Validation -->
        <div class="p-3 sm:p-4 bg-white border-t border-slate-100 flex items-center gap-2.5 shrink-0">
          <input 
            [(ngModel)]="inputText" 
            (keyup.enter)="sendMessage()"
            placeholder="Nhập nhu cầu tìm quà, mã đơn hàng hoặc câu hỏi chính sách..." 
            class="flex-1 px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-slate-50/50"
          >
          <button 
            (click)="sendMessage()"
            [disabled]="!inputText.trim() || isThinking()"
            class="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-slate-200 text-white flex items-center justify-center shrink-0 transition-all shadow-sm active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            title="Gửi tin nhắn"
          >
            <span class="material-symbols-outlined text-[18px] sm:text-[20px]">send</span>
          </button>
        </div>
      </div>
    }
  `
})
export class AiConciergeComponent implements OnInit, OnDestroy {
  isOpen = signal<boolean>(false);
  isExpanded = signal<boolean>(false);
  isThinking = signal<boolean>(false);
  inputText: string = '';

  sessionId: string = '';
  currentContext: {
    recipient?: string;
    occasion?: string;
    budget?: number;
    preferences?: string;
  } = {};

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;

  messages = signal<ChatMessage[]>([]);

  private openSub?: Subscription;

  constructor(
    private aiChatbotService: AiChatbotService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Generate or retrieve session ID
    this.sessionId = sessionStorage.getItem('giftory_ai_session_id') || ('sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
    sessionStorage.setItem('giftory_ai_session_id', this.sessionId);

    // Restore conversation from sessionStorage if present (US-PD-05.1 Context Retention)
    const saved = sessionStorage.getItem('giftory_ai_chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.messages.set(parsed);
        }
      } catch (e) {
        // Fallback default
      }
    }

    if (this.messages().length === 0) {
      this.initDefaultGreeting();
    }

    // Subscribe to external open events (e.g. from Products zero results CTA)
    this.openSub = this.aiChatbotService.openChat$.subscribe(data => {
      this.isOpen.set(true);
      if (data.prompt) {
        this.inputText = data.prompt;
        this.sendMessage();
      }
    });
  }

  ngOnDestroy(): void {
    this.openSub?.unsubscribe();
  }

  private initDefaultGreeting(): void {
    this.messages.set([
      {
        id: 'msg_welcome',
        sender: 'ai',
        text: 'Xin chào bạn! Mình là Trợ lý AI Hợp nhất của Giftory. Mình có thể giúp bạn:\n• Tư vấn gợi ý quà tặng theo người nhận, dịp và ngân sách\n• Tra cứu trạng thái đơn hàng nhanh qua Mã đơn hoặc SĐT\n• Giải đáp chính sách hỏa tốc 2h, bảo hành 7 ngày & đặt cọc Bespoke 50%',
        timestamp: new Date(),
        quickChips: [
          { label: '✨ Tư vấn quà tặng', value: 'Tư vấn quà tặng', step: 1 },
          { label: '📦 Tra cứu đơn hàng', value: 'Tra cứu đơn hàng' },
          { label: '⚡ Giao hỏa tốc 2h', value: 'Chính sách giao hàng hỏa tốc' },
          { label: '📞 Kết nối nhân viên', value: 'Cho mình gặp nhân viên tư vấn' }
        ]
      }
    ]);
    this.saveSession();
  }

  openWidget(): void {
    this.isOpen.set(true);
    this.scrollToBottom();
  }

  minimizeChat(): void {
    this.isOpen.set(false);
  }

  startGuidedFlow(): void {
    this.currentContext = {};
    this.messages.update(msgs => [
      ...msgs,
      {
        id: 'msg_' + Date.now(),
        sender: 'ai',
        text: 'Bước 1/3: Bạn đang muốn tìm quà tặng cho ai thế ạ?',
        timestamp: new Date(),
        quickChips: [
          { label: 'Người yêu / Bạn gái', value: 'Tặng người yêu', step: 1 },
          { label: 'Mẹ', value: 'Tặng mẹ', step: 1 },
          { label: 'Bố', value: 'Tặng bố', step: 1 },
          { label: 'Bạn thân', value: 'Tặng bạn thân', step: 1 },
          { label: 'Sếp / Đồng nghiệp', value: 'Tặng đồng nghiệp', step: 1 }
        ]
      }
    ]);
    this.saveSession();
    this.scrollToBottom();
  }

  sendPreset(text: string): void {
    this.inputText = text;
    this.sendMessage();
  }

  onChipClick(chip: { label: string; value: string; step?: number }): void {
    this.inputText = chip.value;
    this.sendMessage();
  }

  sendMessage(): void {
    const text = this.inputText.trim();
    if (!text || this.isThinking()) return;

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date()
    };

    this.messages.update(msgs => [...msgs, userMsg]);
    this.inputText = '';
    this.isThinking.set(true);
    this.scrollToBottom();
    this.saveSession();

    this.aiChatbotService.sendMessage(text, this.currentContext, this.sessionId).subscribe({
      next: (res: AiChatResponse) => {
        this.isThinking.set(false);

        // Update context if provided
        if (res.contextUpdate) {
          this.currentContext = {
            ...this.currentContext,
            ...res.contextUpdate
          };
        }

        const aiMsg: ChatMessage = {
          id: 'msg_' + Date.now(),
          sender: 'ai',
          text: res.reply,
          timestamp: new Date(),
          intent: res.intent,
          products: res.products,
          orderInfo: res.orderInfo,
          handoverInfo: res.handoverInfo,
          quickChips: res.quickChips,
          isProximateFallback: res.isProximateFallback
        };

        this.messages.update(msgs => [...msgs, aiMsg]);
        this.scrollToBottom();
        this.saveSession();
      },
      error: () => {
        this.isThinking.set(false);
        const errorMsg: ChatMessage = {
          id: 'msg_' + Date.now(),
          sender: 'ai',
          text: 'Xin lỗi bạn, đường truyền máy chủ đang tạm thời gián đoạn. Bạn có thể nhấn thử lại hoặc kết nối ngay với Chuyên viên CSKH nhé ạ!',
          timestamp: new Date(),
          quickChips: [
            { label: '📞 Kết nối nhân viên', value: 'Cho mình gặp nhân viên tư vấn' },
            { label: 'Thử lại', value: text }
          ]
        };
        this.messages.update(msgs => [...msgs, errorMsg]);
        this.scrollToBottom();
        this.saveSession();
      }
    });
  }

  resetConversation(): void {
    this.currentContext = {};
    sessionStorage.removeItem('giftory_ai_chat_history');
    this.initDefaultGreeting();
  }

  private saveSession(): void {
    try {
      sessionStorage.setItem('giftory_ai_chat_history', JSON.stringify(this.messages()));
    } catch (e) {
      // Ignore quota error
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer?.nativeElement) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 60);
  }
}
