import { Component, signal } from '@angular/core';
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
    <div class="fixed bottom-6 right-6 z-40">
      @if (!isOpen()) {
        <button 
          (click)="isOpen.set(true)"
          class="relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#F43F5E] text-white font-semibold text-sm shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-white cursor-pointer"
        >
          <span class="material-symbols-outlined text-[20px] animate-bounce">auto_awesome</span>
          <span>AI Tư Vấn Quà Tặng</span>
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white animate-pulse"></span>
        </button>
      }
    </div>

    <!-- AI Chat Window Dialog -->
    @if (isOpen()) {
      <div class="fixed bottom-6 right-6 z-50 w-[380px] sm:w-[420px] max-h-[580px] bg-white rounded-3xl shadow-2xl border border-purple-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <!-- Header -->
        <div class="px-5 py-4 bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <span class="material-symbols-outlined text-[20px]">psychology</span>
            </div>
            <div>
              <div class="font-bold text-sm leading-tight">Giftory AI Concierge</div>
              <div class="text-[11px] text-purple-200 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Trợ lý gợi ý quà tặng thấu hiểu
              </div>
            </div>
          </div>
          <button (click)="isOpen.set(false)" class="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <!-- Messages Area -->
        <div class="flex-1 overflow-y-auto p-4 space-y-3.5 max-h-[380px] text-xs">
          @for (msg of messages(); track $index) {
            @if (msg.sender === 'ai') {
              <div class="flex items-start gap-2 max-w-[90%]">
                <div class="w-7 h-7 rounded-full bg-purple-100 text-[#7C3AED] flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                  ✨
                </div>
                <div class="bg-purple-50 text-slate-800 p-3 rounded-2xl rounded-tl-sm border border-purple-100/60 leading-relaxed">
                  {{ msg.text }}

                  @if (msg.recommendations) {
                    <div class="mt-2.5 space-y-2">
                      @for (item of msg.recommendations; track item.name) {
                        <a [routerLink]="['/products', item.slug]" (click)="isOpen.set(false)" class="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-purple-100 hover:border-purple-300 transition-all cursor-pointer">
                          <img [src]="item.image" [alt]="item.name" class="w-10 h-10 rounded-lg object-cover">
                          <div class="flex-1 min-w-0">
                            <div class="font-semibold text-slate-900 truncate text-[11px]">{{ item.name }}</div>
                            <div class="text-[#7C3AED] font-bold text-[10px]">{{ item.price }} • <span class="text-emerald-600">{{ item.tag }}</span></div>
                          </div>
                          <span class="material-symbols-outlined text-[16px] text-slate-400">chevron_right</span>
                        </a>
                      }
                    </div>
                  }
                </div>
              </div>
            } @else {
              <div class="flex justify-end">
                <div class="bg-[#7C3AED] text-white p-3 rounded-2xl rounded-tr-sm max-w-[85%] leading-relaxed font-medium">
                  {{ msg.text }}
                </div>
              </div>
            }
          }
        </div>

        <!-- Quick Prompt Chips -->
        <div class="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
          <button (click)="sendPreset('Gợi ý quà kỷ niệm yêu nhau ý nghĩa')" class="px-2.5 py-1 rounded-full bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 shrink-0">
            ❤️ Quà kỷ niệm tình yêu
          </button>
          <button (click)="sendPreset('Gợi ý quà sinh nhật tặng mẹ tinh tế')" class="px-2.5 py-1 rounded-full bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 shrink-0">
            🌸 Quà tặng sinh nhật mẹ
          </button>
          <button (click)="sendPreset('Quà khắc tên dưới 300k')" class="px-2.5 py-1 rounded-full bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 shrink-0">
            ⚡ Quà khắc laser < 300k
          </button>
        </div>

        <!-- Input Bar -->
        <div class="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
          <input 
            [(ngModel)]="inputText" 
            (keyup.enter)="sendMessage()"
            placeholder="Mô tả dịp tặng quà, người nhận, ngân sách..." 
            class="flex-1 px-3.5 py-2 rounded-full border border-slate-200 focus:outline-none focus:border-[#7C3AED] text-xs text-slate-800"
          >
          <button 
            (click)="sendMessage()"
            class="w-8 h-8 rounded-full bg-[#7C3AED] text-white flex items-center justify-center shrink-0 hover:bg-[#6D28D9] transition-all"
          >
            <span class="material-symbols-outlined text-[16px]">send</span>
          </button>
        </div>
      </div>
    }
  `
})
export class AiConciergeComponent {
  isOpen = signal<boolean>(false);
  inputText: string = '';

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

    setTimeout(() => {
      this.generateAiResponse(userText);
    }, 600);
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
