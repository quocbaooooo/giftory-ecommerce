import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminService } from '../../../core/services/admin.service';
import { Order } from '../../../core/models';
import { GreetingCardPreviewComponent } from '../../../shared/components/greeting-card-preview.component';

@Component({
  selector: 'app-greeting-card-print',
  standalone: true,
  imports: [RouterModule, GreetingCardPreviewComponent],
  template: `
    <section class="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div class="space-y-3">
        <a routerLink="/admin/orders" class="text-sm text-purple-700 underline">← Quản lý đơn hàng</a>
        <h1 class="text-xl font-bold text-slate-900">In thiệp chúc mừng @if (order()) { · #{{ order()?.orderCode }} }</h1>
        <p class="text-sm text-slate-500">Khổ A6 ngang (148 × 105 mm). Chọn tỷ lệ 100%, tắt đầu/chân trang của trình duyệt. Mã đơn chỉ hiển thị trên màn hình để đối chiếu.</p>
      </div>
      @if (loading()) {
        <p role="status" class="text-slate-500">Đang tải nội dung thiệp…</p>
      } @else if (error()) {
        <p role="alert" class="text-rose-700">{{ error() }}</p>
        <button type="button" (click)="load()" class="text-purple-700 underline">Thử lại</button>
      } @else if (order()?.greetingCard; as card) {
        <button type="button" (click)="printCard()" class="px-5 py-3 rounded-xl bg-purple-700 text-white font-bold">In thiệp</button>
        <div class="overflow-x-auto pb-4">
          <div class="greeting-card-sheet">
            <app-greeting-card-preview [templateId]="card.templateId" [heading]="card.heading" [message]="card.message" />
          </div>
        </div>
      } @else {
        <p class="text-slate-500">Đơn hàng này không yêu cầu thiệp chúc mừng.</p>
      }
    </section>
  `,
  styles: [`.greeting-card-sheet { width: 148mm; height: 105mm; }`],
})
export class GreetingCardPrintComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly order = signal<Order | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.admin.getOrderById(this.route.snapshot.paramMap.get('code') || '')
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: order => { this.order.set(order); this.loading.set(false); },
        error: () => { this.loading.set(false); this.error.set('Không tải được thiệp. Vui lòng kiểm tra quyền truy cập và thử lại.'); },
      });
  }
  printCard(): void { if (this.order()?.greetingCard) window.print(); }
}
