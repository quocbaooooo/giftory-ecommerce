import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';
@Component({
  standalone: true,
  selector: 'app-product-reviews',
  imports: [CommonModule, RouterModule],
  template: ` <section class="bg-white border border-purple-100 rounded-3xl p-6 my-8">
    <h2 class="text-xl font-bold">Đánh giá từ khách đã mua</h2>
    <a routerLink="/care" class="text-purple-700">Viết đánh giá sau khi nhận hàng</a>
    <p role="alert">{{ error() }}</p>
    @for (r of reviews(); track r._id) {
      <article class="border-t py-4 mt-3">
        <strong>{{ r.author }} · {{ r.rating }}/5 sao</strong>
        <p class="whitespace-pre-wrap">{{ r.content }}</p>
        <small>{{ r.publishedAt | date: 'dd/MM/yyyy' }}</small>
        @for (file of r.attachments; track file) {
          <a
            class="block text-purple-700"
            [href]="attachmentUrl(file)"
            target="_blank"
            rel="noopener"
            >Xem ảnh / video đính kèm</a
          >
        }
      </article>
    } @empty {
      <p class="text-slate-500 mt-4">Chưa có đánh giá đã được duyệt.</p>
    }
  </section>`,
})
export class ProductReviewsComponent implements OnChanges {
  @Input({ required: true }) productId = '';
  private api = inject(ApiService);
  reviews = signal<any[]>([]);
  error = signal('');
  ngOnChanges() {
    this.reviews.set([]);
    this.error.set('');
    if (this.productId)
      this.api
        .get<any[]>(`care/products/${this.productId}/reviews`)
        .subscribe({
          next: (r) => this.reviews.set(r),
          error: () => this.error.set('Không thể tải đánh giá. Vui lòng thử lại sau.'),
        });
  }
  attachmentUrl(id: string) {
    return `${environment.apiUrl}/care/attachments/${id}`;
  }
}
