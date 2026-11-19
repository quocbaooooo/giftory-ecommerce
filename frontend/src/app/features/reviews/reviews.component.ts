import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';

interface ReviewItem { productId: string | { _id: string }; productName?: string; name?: string; productImage?: string; }
interface ReviewOrder { _id: string; orderCode: string; orderStatus: string; items: ReviewItem[]; }
interface ProductReview { _id: string; orderId: string; productId: string; rating: number; content: string; attachments: string[]; status: string; moderationNote?: string; }

@Component({
  standalone: true,
  selector: 'app-reviews',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reviews.component.html',
})
export class ReviewsComponent implements OnInit {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  orders = signal<ReviewOrder[]>([]);
  reviews = signal<ProductReview[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  message = signal('');
  orderId = '';
  productId = '';
  rating = 5;
  content = '';
  attachments: string[] = [];

  get selectedOrder() { return this.orders().find(order => order._id === this.orderId); }
  get selectedItem() { return this.selectedOrder?.items.find(item => this.itemId(item) === this.productId); }
  get selectedReview() { return this.reviews().find(review => review.orderId === this.orderId && review.productId === this.productId); }
  get readOnly() { return !!this.selectedReview && this.selectedReview.status !== 'REJECTED'; }
  get canSubmit() { return !this.loading() && !this.busy() && !!this.selectedItem && !this.readOnly && this.content.trim().length >= 10 && this.content.trim().length <= 3000; }
  itemId(item: ReviewItem) { return typeof item.productId === 'string' ? item.productId : item.productId?._id || ''; }
  reviewLabel(status: string) { return ({ PENDING: 'Chờ kiểm duyệt', APPROVED: 'Đã xuất bản', REJECTED: 'Cần chỉnh sửa' } as Record<string, string>)[status] || status; }

  ngOnInit() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!this.loading()) this.applyLinkedSelection();
    });
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    forkJoin({ orders: this.api.get<ReviewOrder[]>('orders'), reviews: this.api.get<ProductReview[]>('care/reviews') })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: data => {
          this.orders.set(data.orders.filter(order => order.orderStatus === 'DELIVERED').map(order => ({
            ...order,
            items: order.items.filter((item, index, items) => items.findIndex(other => this.itemId(other) === this.itemId(item)) === index),
          })));
          this.reviews.set(data.reviews || []);
          this.loading.set(false);
          this.applyLinkedSelection();
        },
        error: error => { this.loading.set(false); this.fail(error); },
      });
  }
  private applyLinkedSelection() {
    const linkedOrder = this.route.snapshot.queryParamMap.get('orderId');
    const linkedProduct = this.route.snapshot.queryParamMap.get('productId');
    const order = this.orders().find(order => order._id === (linkedOrder || this.orderId)) || (!linkedOrder ? this.orders()[0] : undefined);
    if (!order || (linkedProduct && !order.items.some(item => this.itemId(item) === linkedProduct))) {
      this.orderId = '';
      this.productId = '';
      if (linkedOrder || linkedProduct) this.error.set('Chỉ có thể đánh giá sản phẩm thuộc đơn của bạn đã giao thành công.');
      return;
    }
    this.selectOrder(order._id);
    if (linkedProduct) this.selectProduct(linkedProduct);
  }
  selectOrder(id: string) {
    this.error.set('');
    this.orderId = id;
    const items = this.selectedOrder?.items || [];
    const unreviewed = items.find(item => !this.reviews().some(review => review.orderId === id && review.productId === this.itemId(item) && review.status !== 'REJECTED'));
    this.selectProduct(items.length ? this.itemId(unreviewed || items[0]) : '');
  }
  selectProduct(id: string) {
    this.error.set('');
    this.message.set('');
    this.productId = id;
    const existing = this.selectedReview;
    this.rating = existing?.rating || 5;
    this.content = existing?.content || '';
    this.attachments = [...(existing?.attachments || [])];
  }
  submitReview() {
    if (!this.canSubmit) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.api.post<ProductReview>('care/reviews', {
      orderId: this.orderId, productId: this.productId, rating: this.rating,
      content: this.content.trim(), attachments: this.attachments,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: review => {
        this.reviews.update(reviews => [...reviews.filter(item => item.orderId !== review.orderId || item.productId !== review.productId), review]);
        this.busy.set(false);
        this.message.set('Đã gửi đánh giá. Giftory sẽ kiểm duyệt trước khi hiển thị công khai.');
      },
      error: error => this.fail(error),
    });
  }
  upload(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length || this.busy() || this.readOnly) return;
    if (this.attachments.length + files.length > 5 || files.some(file => file.size > 10 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp', 'video/mp4'].includes(file.type))) {
      this.error.set('Chọn tối đa 5 ảnh/video PNG, JPEG, WEBP hoặc MP4, mỗi tệp không quá 10 MB.');
      input.value = '';
      return;
    }
    this.busy.set(true);
    this.error.set('');
    forkJoin(files.map(file => {
      const form = new FormData();
      form.append('file', file);
      return this.http.post<{ data: { _id: string } }>(`${environment.apiUrl}/care/attachments`, form);
    })).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: results => { this.attachments = [...this.attachments, ...results.map(result => result.data._id)]; this.busy.set(false); input.value = ''; },
      error: error => { input.value = ''; this.fail(error); },
    });
  }
  private fail(error: { error?: { message?: string | string[] } }) {
    const message = error.error?.message;
    this.error.set(Array.isArray(message) ? message.join('; ') : message || 'Không thể tải hoặc gửi đánh giá. Vui lòng thử lại.');
    this.busy.set(false);
  }
}
