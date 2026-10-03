import { Component, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface Message {
  sender: 'ai' | 'user';
  text: string;
  recommendations?: Array<{
    name: string;
    price: string;
    slug: string;
    image: string;
    tag: string;
  }>;
}

@Component({
  selector: 'app-ai-concierge',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <!-- Floating AI Trigger Button -->
    @if (!isOpen()) {
      <button 
        (click)="isOpen.set(true)"
        class="relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#F43F5E] text-white font-semibold text-sm shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-white cursor-pointer"
        title="Mở trợ lý AI tư vấn quà tặng"
      >
        <span class="material-symbols-outlined text-[20px] animate-bounce">auto_awesome</span>
        <span>AI Tư Vấn Quà Tặng</span>
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white animate-pulse"></span>
      </button>
    }

    <!-- AI Chat Window Dialog: Significantly Increased Height & Expandable Layout -->
    @if (isOpen()) {
      <div 
        class="fixed bottom-6 right-6 z-50 bg-white rounded-3xl shadow-2xl border border-purple-200/80 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-all"
        [ngClass]="isExpanded() 
          ? 'w-[94vw] sm:w-[680px] md:w-[760px] h-[86vh] max-h-[850px]' 
          : 'w-[94vw] sm:w-[460px] md:w-[480px] h-[78vh] sm:h-[720px] max-h-[calc(100vh-3rem)]'"
      >
        <!-- Header -->
        <div class="px-5 py-4 bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#EC4899] text-white flex items-center justify-between shadow-sm shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md shadow-inner border border-white/20">
              <span class="material-symbols-outlined text-[22px]">psychology</span>
            </div>
            <div>
              <div class="font-bold text-sm sm:text-base leading-tight flex items-center gap-1.5">
                <span>Giftory AI Concierge</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-md bg-white/25 font-bold uppercase tracking-wider">GPT-4o</span>
              </div>
              <div class="text-[11px] text-purple-100 flex items-center gap-1.5 mt-0.5">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Trợ lý thấu hiểu gu & dịp quà tặng riêng</span>
              </div>
            </div>
          </div>
          
          <div class="flex items-center gap-1.5">
            <!-- Expand / Minimize Window Size Button -->
            <button 
              (click)="isExpanded.set(!isExpanded())" 
              class="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              [title]="isExpanded() ? 'Thu nhỏ cửa sổ' : 'Mở rộng cửa sổ toàn diện'"
            >
              <span class="material-symbols-outlined text-[18px]">
                {{ isExpanded() ? 'close_fullscreen' : 'open_in_full' }}
              </span>
            </button>
            <!-- Close Button -->
            <button 
              (click)="isOpen.set(false)" 
              class="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              title="Đóng cửa sổ"
            >
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        <!-- Messages Area: Fully Stretched, Generous Height with Auto-Scroll -->
        <div #messagesContainer class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs sm:text-sm bg-gradient-to-b from-[#F3EBF9]/30 to-white">
          @for (msg of messages(); track $index) {
            @if (msg.sender === 'ai') {
              <div class="flex items-start gap-2.5 max-w-[92%] sm:max-w-[85%]">
                <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#EC4899] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm text-xs font-bold">
                  ✨
                </div>
                <div class="bg-white text-slate-800 p-4 rounded-2xl rounded-tl-sm border border-purple-100/80 shadow-xs leading-relaxed space-y-3">
                  <div class="whitespace-pre-line">{{ msg.text }}</div>

                  @if (msg.recommendations && msg.recommendations.length) {
                    <div class="pt-2 border-t border-purple-50 grid grid-cols-1 gap-2.5" [ngClass]="isExpanded() ? 'sm:grid-cols-2' : ''">
                      @for (item of msg.recommendations; track item.name) {
                        <a 
                          [routerLink]="['/products', item.slug]" 
                          (click)="isOpen.set(false)" 
                          class="flex items-center gap-3 p-2.5 bg-[#F3EBF9]/40 hover:bg-[#F3EBF9] rounded-xl border border-[#DDD6FE]/60 hover:border-[#7C3AED] transition-all group cursor-pointer shadow-xs"
                        >
                          <img [src]="item.image" [alt]="item.name" class="w-14 h-14 rounded-xl object-cover shrink-0 border border-purple-100 group-hover:scale-105 transition-transform">
                          <div class="flex-1 min-w-0">
                            <div class="font-bold text-slate-900 group-hover:text-[#7C3AED] transition-colors truncate text-xs sm:text-sm">{{ item.name }}</div>
                            <div class="text-[#7C3AED] font-bold text-xs mt-0.5 flex items-center gap-2">
                              <span>{{ item.price }}</span>
                              <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">{{ item.tag }}</span>
                            </div>
                          </div>
                          <span class="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-[#7C3AED] group-hover:translate-x-0.5 transition-all">chevron_right</span>
                        </a>
                      }
                    </div>
                  }
                </div>
              </div>
            } @else {
              <div class="flex justify-end">
                <div class="bg-[#7C3AED] text-white p-3.5 sm:p-4 rounded-2xl rounded-tr-sm max-w-[85%] leading-relaxed font-medium shadow-sm text-xs sm:text-sm">
                  {{ msg.text }}
                </div>
              </div>
            }
          }

          @if (isThinking()) {
            <div class="flex items-center gap-2.5 text-slate-400 text-xs italic">
              <div class="w-7 h-7 rounded-full bg-purple-100 text-[#7C3AED] flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[16px] animate-spin">autorenew</span>
              </div>
              <span>Giftory AI đang tìm kiếm món quà phù hợp nhất...</span>
            </div>
          }
        </div>

        <!-- Quick Prompt Chips -->
        <div class="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-[11px] sm:text-xs no-scrollbar shrink-0">
          <button (click)="sendPreset('Gợi ý quà kỷ niệm yêu nhau ý nghĩa')" class="px-3 py-1.5 rounded-full bg-white border border-purple-200 text-[#7C3AED] hover:bg-purple-50 shrink-0 font-medium transition-colors shadow-2xs">
            ❤️ Quà kỷ niệm tình yêu
          </button>
          <button (click)="sendPreset('Gợi ý quà sinh nhật tặng mẹ tinh tế')" class="px-3 py-1.5 rounded-full bg-white border border-purple-200 text-[#7C3AED] hover:bg-purple-50 shrink-0 font-medium transition-colors shadow-2xs">
            🌸 Quà tặng mẹ tinh tế
          </button>
          <button (click)="sendPreset('Quà khắc tên laser dưới 300k')" class="px-3 py-1.5 rounded-full bg-white border border-purple-200 text-[#7C3AED] hover:bg-purple-50 shrink-0 font-medium transition-colors shadow-2xs">
            ⚡ Quà khắc laser < 300k
          </button>
          <button (click)="sendPreset('Gợi ý set quà tặng sếp sang trọng')" class="px-3 py-1.5 rounded-full bg-white border border-purple-200 text-[#7C3AED] hover:bg-purple-50 shrink-0 font-medium transition-colors shadow-2xs">
            💼 Quà tặng sếp & đối tác
          </button>
        </div>

        <!-- Input Bar -->
        <div class="p-3 sm:p-4 bg-white border-t border-slate-100 flex items-center gap-2.5 shrink-0">
          <input 
            [(ngModel)]="inputText" 
            (keyup.enter)="sendMessage()"
            placeholder="Mô tả dịp tặng quà, người nhận, tính cách, ngân sách..." 
            class="flex-1 px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-slate-50/50"
          >
          <button 
            (click)="sendMessage()"
            [disabled]="!inputText.trim()"
            class="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-slate-200 text-white flex items-center justify-center shrink-0 transition-all shadow-sm active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            title="Gửi câu hỏi cho AI"
          >
            <span class="material-symbols-outlined text-[18px] sm:text-[20px]">send</span>
          </button>
        </div>
      </div>
    }
  `
})
export class AiConciergeComponent {
  isOpen = signal<boolean>(false);
  isExpanded = signal<boolean>(false);
  isThinking = signal<boolean>(false);
  inputText: string = '';

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;

  messages = signal<Message[]>([
    {
      sender: 'ai',
      text: 'Xin chào bạn! Mình là AI Concierge của Giftory. Bạn đang chuẩn bị quà tặng cho ai, nhân dịp gì và mức ngân sách dự kiến thế nào? Mình sẽ gợi ý ngay món quà cá nhân hóa ưng ý nhất nhé!'
    }
  ]);

  sendPreset(text: string): void {
    this.inputText = text;
    this.sendMessage();
  }

  sendMessage(): void {
    if (!this.inputText.trim()) return;

    const userText = this.inputText.trim();
    this.messages.update(msgs => [...msgs, { sender: 'user', text: userText }]);
    this.inputText = '';
    this.isThinking.set(true);
    this.scrollToBottom();

    setTimeout(() => {
      this.generateAiResponse(userText);
      this.isThinking.set(false);
      this.scrollToBottom();
    }, 600);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer?.nativeElement) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 60);
  }

  private generateAiResponse(query: string): void {
    const q = query.toLowerCase();
    let reply = 'Giftory xin gợi ý các dòng quà tặng chế tác riêng biệt rất được ưa chuộng:';
    let recommendations = [
      {
        name: 'Bình Giữ Nhiệt Nordic Bọc Da & Khắc Laser Cá Nhân (500ml)',
        price: '220.000đ',
        slug: 'binh-giu-nhiet-nordic-boc-da-khac-laser',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCKTkcqYCzqbTubW6b24R7ddPlXnKvpUh3sevKFt9aZ2IubRObqHaXhYGWuJgfkN55yzlfM9E_5fCBjSSjiU053-Xl1klSE7ynrNox5NTwMc_I0Frts8wXqny2HopN0raGUJLqzu4cSp7HATWpSGAuvm3lcrPja7yxnOqkKK_RjmQiRJfOFfmeGbqF3STibU3rtbT-52xamfqVwTvLVVn50VHX2PYyjrxhv0rEaLKVW2LlkaztehscPSCwAKluEJn-GtN4',
        tag: 'Cọc 50%'
      },
      {
        name: "Hộp Quà Ly Sứ Cao Cấp 'Good Things Take Time' & Thìa Vàng",
        price: '300.000đ',
        slug: 'hop-qua-ly-su-good-things-take-time-thia-vang',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCAEHf4MVMsrFVCiqEQZiMtZCxXXCtcd6QWKqrJ0Z-TkD3AgaGCW4tBAZNCJcrfTkJCVs4J8z_214U_1dlJmb8GAxtoS173O3PYqdDSFDv3je0gOSfkh_dgGZmNyrtM1x99klY63Oz5AblgYiQIiILjt2egRi89p3xyUhl1Z42l1SNh9WNJBhrMFAkGUMOg6BYF7Xt4gP9YbzsptMmikdtwL8TU9Jc5S9MYaWg_SV8SJRzbV_ux409ZY0_VUdcjxnYJsvQ',
        tag: 'Cọc 50%'
      }
    ];

    if (q.includes('mẹ') || q.includes('phụ nữ')) {
      reply = 'Với mẹ hoặc phái đẹp, một set ly sứ Good Things Take Time kèm thìa vàng khắc tên và nến thơm hoa khô thư giãn là lựa chọn ấm áp và ý nghĩa nhất:';
    } else if (q.includes('yêu') || q.includes('kỷ niệm')) {
      reply = 'Dịp kỷ niệm yêu nhau, bạn nên chọn Bình Nordic khắc ngày kỷ niệm hoặc Móc Khóa Thỏ Gỗ đôi khắc hình chibi 2 bạn:';
    }

    this.messages.update(msgs => [
      ...msgs,
      {
        sender: 'ai',
        text: reply,
        recommendations
      }
    ]);
  }
}
