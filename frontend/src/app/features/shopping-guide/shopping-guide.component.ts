import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-shopping-guide',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-5xl mx-auto px-4 py-8 space-y-12 animate-fade-in">
      <!-- Guide Hero (Stitch Screen 13609092178183298075) -->
      <div class="text-center max-w-2xl mx-auto space-y-3">
        <span class="text-xs font-bold tracking-widest text-giftory-primary uppercase">Cẩm Nang Quà Tặng</span>
        <h1 class="text-3xl md:text-5xl font-display font-black text-giftory-ink">Quy Trình Đặt Quà & Chính Sách Bespoke</h1>
        <p class="text-sm text-giftory-ink/60">
          Tất cả những điều bạn cần biết khi đặt các sản phẩm quà tặng tiêu chuẩn hoặc chế tác theo yêu cầu riêng tại Giftory.
        </p>
      </div>

      <!-- 4-Step Bespoke Process Cards -->
      <div class="space-y-6">
        <h2 class="text-xl font-display font-black text-giftory-ink text-center">4 Bước Chế Tác Quà Tặng Độc Bản</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div *ngFor="let step of steps" class="bg-white rounded-3xl p-6 border border-giftory-border shadow-sm space-y-4 relative group hover:border-giftory-primary/40 transition">
            <div class="w-12 h-12 rounded-2xl bg-giftory-primary/10 text-giftory-primary flex items-center justify-center font-display font-black text-xl">
              {{ step.step }}
            </div>
            <div>
              <h3 class="text-base font-bold text-giftory-ink">{{ step.title }}</h3>
              <p class="text-xs text-giftory-ink/60 mt-1 leading-relaxed">{{ step.desc }}</p>
            </div>
            <div class="text-[11px] font-bold text-giftory-primary flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">{{ step.icon }}</span>
              {{ step.highlight }}
            </div>
          </div>
        </div>
      </div>

      <!-- Policy Clarification: 50% Deposit (BR-PAY05) -->
      <div class="bg-gradient-to-br from-giftory-canvas via-white to-giftory-canvas rounded-3xl p-8 border border-giftory-primary/30 shadow-sm space-y-6">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-giftory-emerald/10 text-giftory-emerald flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-3xl">verified</span>
          </div>
          <div>
            <h3 class="text-lg font-bold text-giftory-ink">Chính Sách Đặt Cọc 50% Cho Quà Bespoke</h3>
            <p class="text-xs text-giftory-ink/60">Đảm bảo quyền lợi khách hàng và nguồn nguyên liệu chế tác thủ công chất lượng cao</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-giftory-ink/70">
          <div class="p-4 bg-white rounded-2xl border border-giftory-border space-y-2">
            <h4 class="font-bold text-giftory-ink text-sm flex items-center gap-1.5">
              <span class="material-symbols-outlined text-giftory-emerald text-base">payments</span>
              Tại sao cần đặt cọc 50%?
            </h4>
            <p>
              Các sản phẩm khắc tên, in chân dung hoặc may đo theo số đo riêng mang tính độc bản duy nhất và không thể tái bán cho khách hàng khác. Khoản cọc 50% giúp xưởng nhập phôi cao cấp và phân công nghệ nhân chế tác ngay lập tức.
            </p>
          </div>

          <div class="p-4 bg-white rounded-2xl border border-giftory-border space-y-2">
            <h4 class="font-bold text-giftory-ink text-sm flex items-center gap-1.5">
              <span class="material-symbols-outlined text-giftory-primary text-base">lock</span>
              50% còn lại thanh toán khi nào?
            </h4>
            <p>
              Sau khi xưởng hoàn tất sản phẩm và chụp ảnh nghiệm thu gửi bạn duyệt, bạn có thể thanh toán 50% còn lại qua chuyển khoản VietQR hoặc chọn thanh toán tiền mặt (COD) khi bưu tá giao hàng tận tay.
            </p>
          </div>
        </div>
      </div>

      <!-- FAQ Accordion -->
      <div class="space-y-4 max-w-3xl mx-auto">
        <h3 class="text-xl font-display font-black text-giftory-ink text-center mb-6">Câu Hỏi Thường Gặp</h3>
        
        <div *ngFor="let faq of faqs; let i = index" class="bg-white rounded-2xl border border-giftory-border overflow-hidden">
          <button
            (click)="toggleFaq(i)"
            class="w-full p-5 text-left text-sm font-bold text-giftory-ink flex items-center justify-between hover:bg-giftory-canvas transition"
          >
            <span>{{ faq.q }}</span>
            <span class="material-symbols-outlined text-giftory-primary transition-transform duration-300" [ngClass]="expandedFaq() === i ? 'rotate-180' : ''">
              expand_more
            </span>
          </button>
          <div *ngIf="expandedFaq() === i" class="p-5 pt-0 text-xs text-giftory-ink/70 border-t border-giftory-border/40 leading-relaxed animate-fade-in">
            {{ faq.a }}
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="text-center pt-4">
        <a routerLink="/custom-studio" class="inline-flex items-center gap-2 px-8 py-3.5 bg-giftory-primary hover:bg-giftory-primary-dark text-white text-sm font-bold rounded-2xl shadow-lg transition">
          <span class="material-symbols-outlined">brush</span>
          Trải Nghiệm Tự Tay Thiết Kế Ngay
        </a>
      </div>
    </div>
  `
})
export class ShoppingGuideComponent {
  expandedFaq = signal<number | null>(0);

  steps = [
    {
      step: '01',
      title: 'Chọn Mẫu Quà',
      desc: 'Lựa chọn dòng sản phẩm từ danh mục hộp quà, cốc sứ, sổ da hoặc trang sức theo nhu cầu.',
      icon: 'inventory_2',
      highlight: 'Hàng trăm phôi quà'
    },
    {
      step: '02',
      title: 'Tùy Biến 2D/3D',
      desc: 'Nhập thông điệp khắc laser, chọn màu ruy băng, tải ảnh chân dung và xem giả lập tức thì.',
      icon: 'palette',
      highlight: 'Live preview trực quan'
    },
    {
      step: '03',
      title: 'Đặt Cọc 50%',
      desc: 'Xác nhận đơn và thanh toán 50% giá trị để xưởng may/khắc bắt đầu chế tác thủ công.',
      icon: 'receipt_long',
      highlight: 'Đặt cọc linh hoạt 50%'
    },
    {
      step: '04',
      title: 'Nghiệm Thu & Giao',
      desc: 'Kiểm tra ảnh sản phẩm thực tế, thanh toán 50% còn lại và nhận hộp quà đóng gói chỉn chu.',
      icon: 'redeem',
      highlight: 'Hộp nhung cao cấp'
    }
  ];

  faqs = [
    {
      q: 'Thời gian gia công một món quà tùy biến mất bao lâu?',
      a: 'Thông thường thời gian chế tác tại xưởng thủ công từ 24h đến 48h làm việc. Sau khi hoàn tất kiểm định chất lượng, quà sẽ được giao hỏa tốc trong 2-4h (nội thành TP.HCM/Hà Nội) hoặc 1-2 ngày đối với các tỉnh thành khác.'
    },
    {
      q: 'Tôi có thể đổi trả sản phẩm quà tặng không?',
      a: 'Đối với các sản phẩm quà tặng tiêu chuẩn (chưa qua khắc tên hoặc may đo), bạn có quyền đổi trả trong vòng 7 ngày nếu còn nguyên tem niêm phong. Đối với quà bespoke khắc tên cá nhân, Giftory cam kết chế tác lại 100% miễn phí nếu có lỗi sai chính tả từ phía xưởng so với bản thiết kế bạn đã duyệt.'
    },
    {
      q: 'Giftory có hỗ trợ viết thiệp tay và gói quà giấu giá không?',
      a: 'Có! 100% đơn hàng tại Giftory đều được giấu hóa đơn giá tiền bên trong hộp, đi kèm hộp cứng bọc ruy băng lụa và thiệp viết tay theo nội dung lời chúc bạn yêu cầu tại bước Thanh toán.'
    }
  ];

  toggleFaq(index: number) {
    if (this.expandedFaq() === index) {
      this.expandedFaq.set(null);
    } else {
      this.expandedFaq.set(index);
    }
  }
}
