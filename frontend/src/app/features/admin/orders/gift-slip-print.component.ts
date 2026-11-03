import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { GreetingCardPreviewComponent } from '../../../shared/components/greeting-card-preview.component';
@Component({ selector: 'app-gift-slip-print', standalone: true, imports: [CommonModule, RouterModule, GreetingCardPreviewComponent], template: `
  <section class="mx-auto max-w-3xl space-y-5 px-4 py-8">
    <a routerLink="/admin/orders" class="text-sm text-[#800020] underline">← Quản lý đơn hàng</a>
    <h1 class="text-xl font-bold">Phiếu giao quà & thiệp dành cho người nhận</h1>
    <p class="text-xs text-slate-500">Không in hóa đơn có giá vào kiện quà. Chọn in, tắt đầu/chân trang trình duyệt.</p>
    @if (error()) { <p role="alert" class="text-rose-700">{{ error() }}</p> }
    @if (slip(); as s) {
      <button (click)="print()" class="rounded-xl bg-[#800020] px-5 py-3 text-sm font-bold text-white">In phiếu và thiệp</button>
      <div class="gift-slip-sheet rounded-2xl border bg-white p-6">
        <div class="flex items-start justify-between gap-4"><div><h2 class="text-2xl font-bold text-[#800020]">Giftory</h2><p class="mt-2 text-xs">#{{ s.orderCode }}</p></div><strong class="rounded-xl border p-3 text-xs">QUÀ TẶNG · KHÔNG THU TIỀN</strong></div>
        <p class="mt-5 text-sm">Người gửi: <strong>{{ s.senderLabel }}</strong></p>
        <h3 class="mt-4 text-lg font-bold">{{ s.recipient.name }}</h3><p class="text-sm">{{ s.recipient.phone }}</p><p class="mt-1 text-sm">{{ s.recipient.address }}</p>
        @for (item of s.items; track $index) { <p class="mt-3 text-sm">{{ item.name }} · {{ item.variant }} × {{ item.quantity }}</p> }
        <p class="mt-4 text-xs">Gói quà · Ruy băng · Thiệp chúc mừng</p>
        @if (s.greetingCard; as card) { <div class="mt-5"><app-greeting-card-preview [templateId]="card.templateId" [heading]="card.heading" [message]="card.message" [senderName]="card.senderName || ''" [recipientName]="card.recipientName || ''" /></div> }
        <div class="mt-5 flex items-center gap-4"><img [src]="s.qrImage" alt="QR nhận quà và yêu cầu bảo hành" class="h-28 w-28" /><div><strong class="text-sm">Giftory luôn ở đây để hỗ trợ bạn</strong><p class="mt-2 text-xs">Quét mã để hẹn nhận quà hoặc yêu cầu bảo hành/đổi sản phẩm lỗi.</p><a [href]="s.recipientUrl" class="mt-2 block break-all text-[10px] text-[#800020]">{{ s.recipientUrl }}</a></div></div>
      </div>
    }
  </section>
` })
export class GiftSlipPrintComponent implements OnInit {
  private api = inject(ApiService); private route = inject(ActivatedRoute);
  slip = signal<any>(null); error = signal('');
  ngOnInit() { this.api.get(`orders/admin/${encodeURIComponent(this.route.snapshot.paramMap.get('code') || '')}/gift-slip`).subscribe({ next: value => this.slip.set(value), error: () => this.error.set('Không mở được phiếu giao quà. Vui lòng kiểm tra quyền quản trị và đơn hàng.') }); }
  print() { window.print(); }
}
