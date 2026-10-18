import { Component, OnInit, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OrderService } from '../../core/services/order.service';
import { Order } from '../../core/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-xl mx-auto my-12 p-6 sm:p-10 bg-white border border-purple-100 rounded-3xl text-center space-y-5">
      @if (loading()) {
        <p role="status" class="text-slate-500">Đang kiểm tra kết quả thanh toán…</p>
      } @else if (paid()) {
        <span class="material-symbols-outlined text-6xl text-emerald-600" aria-hidden="true">check_circle</span>
        <h1 class="text-2xl font-bold text-slate-900">Thanh toán thành công</h1>
        @if (demoPayment) {
          <p class="text-xs font-semibold text-amber-800 bg-amber-50 rounded-xl p-3">Kết quả mô phỏng cho đồ án • Không có giao dịch ngân hàng thực</p>
        }
        <p class="text-slate-600">{{ order()?.paymentStatus === 'PARTIALLY_PAID_DEPOSIT_50' ? 'Đã ghi nhận khoản cọc cho sản phẩm Custom. Phần còn lại thanh toán khi nhận hàng.' : 'Đã ghi nhận thanh toán 100% cho đơn hàng.' }}</p>
        <p class="font-mono font-bold text-purple-700">#{{ order()?.orderCode }}</p>
        <p class="text-xl font-bold">{{ order()?.pricing?.depositAmount | number:'1.0-0' }}đ</p>
        @if (order()?.paymentStatus === 'PARTIALLY_PAID_DEPOSIT_50') {
          <p class="text-sm text-slate-500">Còn lại thanh toán khi nhận hàng: {{ order()?.pricing?.remainingCodAmount | number:'1.0-0' }}đ</p>
        }
        <a [routerLink]="['/orders', order()?.orderCode]" [state]="{ lookupPhone: lookupPhone }" class="inline-block px-6 py-3 rounded-xl bg-purple-700 text-white font-semibold">Xem lộ trình đơn hàng</a>
      } @else {
        <h1 class="text-xl font-bold text-slate-900">Chưa xác nhận thanh toán</h1>
        <p role="alert" class="text-sm text-slate-600">{{ error() || 'Đơn hàng chưa có xác nhận thanh toán thành công từ hệ thống.' }}</p>
        <button type="button" (click)="loadResult()" class="px-5 py-3 rounded-xl bg-purple-700 text-white font-semibold">Kiểm tra lại</button>
        <a routerLink="/orders" class="block text-sm text-purple-700 underline">Tra cứu đơn hàng</a>
      }
    </div>
  `,
})
export class PaymentResultComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orders = inject(OrderService);
  private readonly destroyRef = inject(DestroyRef);
  readonly demoPayment = !environment.production;
  readonly order = signal<Order | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly lookupPhone: string | undefined = history.state?.lookupPhone;

  ngOnInit(): void { this.loadResult(); }

  paid(): boolean {
    return ['PAID_FULL', 'PARTIALLY_PAID_DEPOSIT_50'].includes(this.order()?.paymentStatus || '');
  }

  loadResult(): void {
    this.loading.set(true);
    this.error.set(null);
    this.orders.getOrderByCode(this.route.snapshot.paramMap.get('code') || '', this.lookupPhone)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: order => { this.order.set(order); this.loading.set(false); },
        error: () => {
          this.loading.set(false);
          this.error.set('Không thể kiểm tra kết quả. Vui lòng thử lại hoặc tra cứu bằng mã đơn và số điện thoại đặt hàng.');
        },
      });
  }
}
