import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { GreetingCardPreviewComponent } from '../../shared/components/greeting-card-preview.component';

@Component({ selector: 'app-gift-recipient', standalone: true, imports: [CommonModule, FormsModule, GreetingCardPreviewComponent], template: `
  <main class="mx-auto max-w-2xl space-y-5 px-4 py-8 text-[#42202E]">
    <div class="text-center"><p class="text-xs font-bold uppercase tracking-widest text-[#A77888]">Một món quà dành riêng cho bạn</p><h1 class="mt-2 text-3xl font-bold">Giftory gửi bạn yêu thương</h1></div>
    @if (loading()) { <p role="status" class="text-center text-sm text-slate-500">Đang mở món quà…</p> }
    @if (error()) { <p role="alert" class="rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">{{ error() }}</p> }
    @if (gift(); as g) {
      <section class="rounded-3xl border border-[#E8D7DD] bg-white p-6">
        <p class="text-xs text-slate-500">Dành tặng</p><h2 class="mt-1 text-xl font-bold">{{ g.recipient.name }}</h2>
        <p class="mt-2 text-sm">Người gửi: <strong>{{ g.senderLabel }}</strong></p>
        <p class="mt-3 rounded-xl bg-[#FCF7F9] p-3 text-xs leading-relaxed text-[#765965]">Bạn không cần thanh toán khi nhận quà. Giftory hỗ trợ bạn xác nhận thời gian giao và bảo hành/đổi sản phẩm bị lỗi.</p>
        @for (item of g.items; track $index) { <div class="mt-4 flex items-center gap-3"><img [src]="item.image" [alt]="item.name" class="h-16 w-16 rounded-xl object-cover" /><div><strong class="text-sm">{{ item.name }}</strong><p class="mt-1 text-xs text-slate-500">{{ item.variant }} · {{ item.quantity }} món</p></div></div> }
      </section>
      @if (g.greetingCard; as card) { <app-greeting-card-preview [templateId]="card.templateId" [heading]="card.heading" [message]="card.message" /> }
      @if (g.delivery.needsReschedule) {
        <section class="rounded-3xl border border-[#E8D7DD] bg-white p-6"><h2 class="font-bold">Chọn thời gian nhận quà thuận tiện</h2><p class="mt-2 text-xs text-slate-500">Giftory sẽ chuyển thời gian bạn chọn cho bộ phận giao hàng.</p><label class="mt-4 block text-xs">Thời gian nhận quà<input type="datetime-local" [(ngModel)]="deliveryWindow" class="mt-2 block w-full rounded-xl border p-3 text-sm" /></label><button (click)="schedule()" [disabled]="busy() || !deliveryWindow" class="mt-4 rounded-xl bg-[#800020] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Xác nhận thời gian nhận</button></section>
      }
      @if (g.orderStatus === 'DELIVERED' || g.orderStatus === 'IN_TRANSIT' || g.orderStatus === 'SHIPPING') {
        <section class="rounded-3xl border border-[#E8D7DD] bg-white p-6"><h2 class="font-bold">Bảo hành / Đổi sản phẩm lỗi</h2><p class="mt-2 text-xs leading-relaxed text-slate-500">Bạn có thể gửi yêu cầu trực tiếp, không cần báo lại người đặt.</p>
          <label class="mt-4 block text-xs">Sản phẩm<select [(ngModel)]="productId" class="mt-1 block w-full rounded-xl border p-3 text-sm"><option value="">Chọn sản phẩm</option>@for (item of g.items; track $index) { <option [value]="item.id">{{ item.name }} · {{ item.variant }}</option> }</select></label>
          <label class="mt-3 block text-xs">Tình trạng<select [(ngModel)]="reason" class="mt-1 block w-full rounded-xl border p-3 text-sm"><option value="SCRATCHED">Trầy xước</option><option value="BROKEN">Vỡ / Hư hỏng</option><option value="WRONG_CUSTOM">Sai mẫu tùy chỉnh</option></select></label>
          <label class="mt-3 block text-xs">Mô tả lỗi<textarea [(ngModel)]="description" maxlength="1000" rows="4" class="mt-1 block w-full rounded-xl border p-3 text-sm" placeholder="Mô tả tình trạng sản phẩm (ít nhất 10 ký tự)"></textarea></label>
          <button (click)="warranty()" [disabled]="busy() || !productId || description.trim().length < 10" class="mt-4 rounded-xl bg-[#800020] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Gửi yêu cầu hỗ trợ</button>
          @for (c of g.cases; track c.id) { <p class="mt-3 rounded-xl bg-[#FAF7F2] p-3 text-xs">Yêu cầu #{{ c.id.slice(-6) }} · {{ caseStatus(c.status) }}</p> }
        </section>
      }
    }
    @if (notice()) { <p role="status" class="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">{{ notice() }}</p> }
  </main>
` })
export class GiftRecipientComponent implements OnInit {
  private api = inject(ApiService); private route = inject(ActivatedRoute);
  gift = signal<any>(null); loading = signal(true); busy = signal(false); error = signal(''); notice = signal('');
  private token = ''; private code = '';
  deliveryWindow = ''; productId = ''; reason = 'SCRATCHED'; description = '';
  ngOnInit() { this.code = this.route.snapshot.paramMap.get('code') || ''; this.token = this.route.snapshot.fragment || ''; this.load(); }
  load() { this.api.post<any>(`orders/gift/${encodeURIComponent(this.code)}/access`, { token: this.token }).subscribe({ next: data => { this.gift.set(data); this.loading.set(false); }, error: () => { this.error.set('Link nhận quà không hợp lệ hoặc không còn khả dụng. Vui lòng liên hệ Giftory.'); this.loading.set(false); } }); }
  schedule() { const date = new Date(this.deliveryWindow); if (!Number.isFinite(date.getTime())) return; this.submit('schedule', { window: date.toISOString() }, 'Đã ghi nhận thời gian nhận quà của bạn.'); }
  warranty() { this.submit('warranty', { type: 'WARRANTY', productId: this.productId, reason: this.reason, description: this.description.trim() }, 'Đã ghi nhận yêu cầu. Giftory sẽ liên hệ trực tiếp với bạn để hỗ trợ.'); }
  private submit(action: string, body: any, notice: string) { if (this.busy()) return; this.busy.set(true); this.error.set(''); this.api.post(`orders/gift/${encodeURIComponent(this.code)}/${action}`, { token: this.token, ...body }).subscribe({ next: () => { this.busy.set(false); this.notice.set(notice); this.load(); }, error: err => { this.busy.set(false); this.error.set(err.error?.message || 'Chưa gửi được thông tin, vui lòng thử lại.'); } }); }
  caseStatus(status: string) { return ({ OPEN: 'Đã tiếp nhận', QUEUED: 'Chờ bộ phận hỗ trợ', INVESTIGATING: 'Đang xác minh', NEEDS_INFO: 'Cần bổ sung thông tin', RESOLVING: 'Đang xử lý', CLOSED: 'Đã hoàn tất' } as Record<string,string>)[status] || status; }
}
