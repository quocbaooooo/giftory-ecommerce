import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';
@Component({
  standalone: true,
  selector: 'app-care',
  imports: [CommonModule, FormsModule, RouterModule],
  styles: [
    `
      :host {
        display: block;
      }
      section,
      article {
        background: white;
        border: 1px solid #ddd6fe;
        border-radius: 18px;
        padding: 20px;
        margin: 16px 0;
      }
      h1 {
        font-size: 28px;
        font-weight: 800;
      }
      h2 {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 12px;
      }
      h3 {
        font-weight: 700;
      }
      label {
        display: block;
        margin: 12px 0;
      }
      input,
      select,
      textarea {
        display: block;
        width: 100%;
        padding: 10px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        margin-top: 5px;
      }
      textarea {
        min-height: 90px;
      }
      button,
      .link {
        display: inline-block;
        background: #7c3aed;
        color: white;
        padding: 9px 14px;
        border-radius: 9px;
        margin: 6px 8px 0 0;
      }
      button:disabled {
        opacity: 0.5;
      }
      p {
        margin: 8px 0;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      .muted {
        color: #64748b;
      }
      .error {
        color: #b91c1c;
      }
      small {
        color: #64748b;
      }
      details {
        margin-top: 12px;
      }
      pre {
        overflow: auto;
        max-height: 300px;
        font-size: 12px;
      }
      a {
        color: #6d28d9;
      }
    `,
  ],
  template: ` <div class="max-w-5xl mx-auto p-4">
    <h1>{{ admin ? 'Chăm sóc khách hàng & kiểm duyệt' : 'Hậu mãi & hỗ trợ' }}</h1>
    <p class="muted">
      CSKH hoạt động 08:00–22:00 (giờ Việt Nam). Yêu cầu ngoài giờ được tiếp nhận cho ca làm việc
      tiếp theo.
    </p>
    <button (click)="load()" [disabled]="busy()">Làm mới</button
    ><a routerLink="/orders"> Theo dõi đơn hàng</a>
    <p role="alert" class="error">{{ error() }}</p>
    <p role="status">{{ message() }}</p>
    @if (loading()) {
      <p>Đang tải dữ liệu…</p>
    }
    @if (!admin) {
      <section>
        <h2>Thông báo của bạn</h2>
        @for (n of notices(); track n._id) {
          <article>
            <p>{{ n.text }}</p>
            @if (n.href?.startsWith('https://zalo.me/')) {
              <a [href]="n.href" target="_blank" rel="noopener">Liên hệ Zalo CSKH</a>
            }
            <small>{{ n.sentAt | date: 'dd/MM/yyyy HH:mm' }}</small>
            @if (n.status === 'SENT') {
              @if (n.kind === 'REVIEW_INVITE') {
                <button (click)="selectOrder(n.orderId)">Viết đánh giá</button>
              }
              <button [disabled]="busy()" (click)="dismiss(n)">
                {{ n.kind === 'REVIEW_INVITE' ? 'Bỏ qua' : 'Đã đọc' }}
              </button>
            } @else {
              <p class="muted">Đã đọc / bỏ qua</p>
            }
          </article>
        } @empty {
          <p>Chưa có thông báo.</p>
        }
      </section>
      <section>
        <h2>Chọn đơn hàng</h2>
        <label
          >Đơn hàng<select [(ngModel)]="orderId" (ngModelChange)="selectOrder($event)">
            <option value="">Chọn đơn hàng của bạn</option>
            @for (o of orders(); track o._id) {
              <option [value]="o._id">{{ o.orderCode }} — {{ label(o.orderStatus) }}</option>
            }
          </select></label
        >
        @if (selectedOrder; as o) {
          <p>{{ o.pricing.totalAmount | number }}đ · {{ label(o.orderStatus) }}</p>
          @if (o.refundPending) {
            <p>Đang chờ hoàn tiền. Đơn chỉ được hủy khi cổng thanh toán xác nhận thành công.</p>
          } @else if (canCancel(o)) {
            <p>Hủy đơn đã thanh toán sẽ tạo yêu cầu hoàn tiền và chờ cổng thanh toán xác nhận.</p>
            <button [disabled]="busy()" (click)="cancel(o)">Yêu cầu hủy đơn</button>
          } @else {
            <p>Đơn này không thể hủy trực tiếp. Bạn có thể gửi yêu cầu hỗ trợ bên dưới.</p>
          }
          <label
            >Sản phẩm liên quan<select [(ngModel)]="productId">
              <option value="">Toàn bộ đơn hàng</option>
              @for (i of o.items; track $index) {
                <option [value]="i.productId">{{ i.productName }}</option>
              }
            </select></label
          >
          @if (o.orderStatus === 'DELIVERED') {
            <h2>Đánh giá sản phẩm</h2>
            <p class="muted">
              Chọn sản phẩm, chia sẻ trải nghiệm và gửi kiểm duyệt. Điểm mua hàng không phụ thuộc
              vào đánh giá.
            </p>
            <label
              >Số sao<select [(ngModel)]="rating">
                @for (r of [5, 4, 3, 2, 1]; track r) {
                  <option [ngValue]="r">{{ r }} sao</option>
                }
              </select></label
            >
            <label
              >Nội dung<textarea
                [(ngModel)]="reviewContent"
                maxlength="3000"
                placeholder="Ít nhất 10 ký tự"
              ></textarea>
            </label>
            <label
              >Ảnh / video (tối đa 5 tệp, mỗi tệp 10 MB)<input
                type="file"
                accept="image/png,image/jpeg,image/webp,video/mp4"
                multiple
                (change)="upload($event, 'review')"
                [disabled]="busy()"
            /></label>
            <p>
              {{ reviewFiles.length }} tệp đã đính kèm
              <button (click)="reviewFiles = []">Xóa tệp đính kèm</button>
            </p>
            <button
              [disabled]="busy() || !productId || reviewContent.trim().length < 10"
              (click)="submitReview()"
            >
              Gửi đánh giá
            </button>
          }
          <h2 class="mt-6">Gửi yêu cầu hỗ trợ</h2>
          <label
            >Loại yêu cầu<select [(ngModel)]="caseType">
              <option value="SUPPORT">Hỗ trợ</option>
              <option value="RETURN">Đổi trả</option>
              <option value="COMPLAINT">Khiếu nại</option>
            </select></label
          >
          @if (caseType !== 'SUPPORT') {
            <label>Lý do bắt buộc<input [(ngModel)]="reason" maxlength="1000" /></label>
          }
          <label
            >Mô tả vấn đề<textarea [(ngModel)]="description" maxlength="5000"></textarea>
          </label>
          <label
            >Bằng chứng: PNG, JPG, WEBP, MP4, PDF<input
              type="file"
              accept="image/png,image/jpeg,image/webp,video/mp4,application/pdf"
              multiple
              (change)="upload($event, 'case')"
              [disabled]="busy()"
          /></label>
          <p>
            {{ caseFiles.length }} tệp đã đính kèm
            <button (click)="caseFiles = []">Xóa tệp đính kèm</button>
          </p>
          <button
            [disabled]="
              busy() ||
              description.trim().length < 10 ||
              (caseType !== 'SUPPORT' && reason.trim().length < 3)
            "
            (click)="createCase()"
          >
            Gửi yêu cầu
          </button>
        } @else {
          <p>Chọn đơn hàng để đánh giá, hủy hoặc gửi yêu cầu hỗ trợ.</p>
        }
      </section>
    }
    <section>
      <h2>{{ admin ? 'Đánh giá chờ kiểm duyệt' : 'Đánh giá đã gửi' }}</h2>
      @for (r of reviews(); track r._id) {
        <article>
          <h3>{{ r.author }} · {{ r.rating }} sao · {{ label(r.status) }}</h3>
          <p>{{ r.content }}</p>
          @for (file of r.attachments; track file) {
            <button (click)="download(file)">Xem tệp đính kèm</button>
          }
          @if (r.moderationNote) {
            <p class="error">{{ r.moderationNote }}</p>
          }
          @if (admin) {
            <label>Lý do từ chối<input [(ngModel)]="r.note" /></label>
            <button [disabled]="busy()" (click)="moderate(r, 'APPROVED')">Duyệt & xuất bản</button>
            <button [disabled]="busy() || !r.note?.trim()" (click)="moderate(r, 'REJECTED')">
              Yêu cầu chỉnh sửa
            </button>
          } @else if (r.status === 'REJECTED') {
            <button (click)="editReview(r)">Sửa và gửi lại</button>
          }
        </article>
      } @empty {
        <p>Chưa có đánh giá {{ admin ? 'chờ duyệt' : 'đã gửi' }}.</p>
      }
    </section>
    <section>
      <h2>Hồ sơ hỗ trợ</h2>
      @for (c of cases(); track c._id) {
        <article>
          <h3>{{ label(c.type) }} · {{ label(c.status) }} · {{ c.orderId?.orderCode || c._id }}</h3>
          <p>{{ c.reason }}</p>
          <p>{{ c.description }}</p>
          @if (c.status === 'QUEUED') {
            <p>Tiếp nhận xử lý từ {{ c.availableAt | date: 'dd/MM/yyyy HH:mm' : '+0700' }}</p>
          }
          @for (file of c.attachments; track file) {
            <button (click)="download(file)">Xem bằng chứng</button>
          }
          @for (m of c.messages; track $index) {
            <p>
              <strong>{{ m.author }}:</strong> {{ m.text }}
            </p>
          }
          @if (c.resolution) {
            <p>Phương án: {{ label(c.resolution) }} — {{ c.result || 'Đang xử lý' }}</p>
          }
          @if (admin) {
            <details>
              <summary>Dữ liệu đơn, thanh toán, giao hàng và cấu hình tùy chỉnh</summary>
              <pre>{{ c.orderId | json }}</pre>
            </details>
            @if (c.status !== 'CLOSED') {
              <label>Yêu cầu khách hàng bổ sung<textarea [(ngModel)]="c.message"></textarea></label>
              <button
                [disabled]="busy() || !c.message?.trim()"
                (click)="updateCase(c, 'NEEDS_INFO')"
              >
                Yêu cầu bổ sung
              </button>
              <label>Kết quả xác minh<textarea [(ngModel)]="c.investigation"></textarea></label>
              <label>Nguyên nhân / trách nhiệm<input [(ngModel)]="c.responsibility" /></label>
              <label
                ><input
                  type="checkbox"
                  [(ngModel)]="c.customizationChecked"
                  style="display:inline;width:auto"
                />
                Đã đối chiếu cấu hình tùy chỉnh đã xác nhận (nếu có)</label
              >
              <label
                >Phương án<select [(ngModel)]="c.resolution">
                  <option value="">Chọn phương án</option>
                  @for (r of resolutions; track r) {
                    <option [value]="r">{{ label(r) }}</option>
                  }
                </select></label
              >
              <label>Kết quả thực hiện<textarea [(ngModel)]="c.result"></textarea></label>
              <button [disabled]="busy()" (click)="updateCase(c, 'INVESTIGATING')">
                Lưu xác minh
              </button>
              <button [disabled]="busy()" (click)="updateCase(c, 'RESOLVING')">
                Thực hiện phương án
              </button>
              <button [disabled]="busy()" (click)="updateCase(c, 'CLOSED')">
                Hoàn tất & đóng hồ sơ
              </button>
            }
          } @else if (c.status !== 'CLOSED') {
            <label>Bổ sung thông tin<textarea [(ngModel)]="c.reply"></textarea></label>
            <label
              >Bằng chứng bổ sung<input
                type="file"
                accept="image/png,image/jpeg,image/webp,video/mp4,application/pdf"
                multiple
                (change)="upload($event, c)"
                [disabled]="busy()"
            /></label>
            <small>{{ c.replyFiles?.length || 0 }} tệp đã đính kèm</small>
            <button [disabled]="busy() || !c.reply?.trim()" (click)="reply(c)">Gửi bổ sung</button>
          }
        </article>
      } @empty {
        <p>Chưa có hồ sơ hỗ trợ.</p>
      }
    </section>
    @if (admin) {
      <section>
        <h2>Theo dõi hoàn tiền</h2>
        @for (r of refunds(); track r._id) {
          <article>
            <h3>{{ r.key }}</h3>
            <p>{{ r.amount | number }}đ · {{ label(r.status) }}</p>
            <p>{{ r.error }}</p>
            <p>Mã cổng thanh toán: {{ r.gatewayReference || 'Chưa có xác nhận' }}</p>
          </article>
        } @empty {
          <p>Chưa có yêu cầu hoàn tiền.</p>
        }
      </section>
    }
  </div>`,
})
export class CareComponent implements OnInit {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  admin = this.route.snapshot.data['admin'] === true;
  orders = signal<any[]>([]);
  notices = signal<any[]>([]);
  reviews = signal<any[]>([]);
  cases = signal<any[]>([]);
  refunds = signal<any[]>([]);
  busy = signal(false);
  loading = signal(false);
  error = signal('');
  message = signal('');
  orderId = '';
  productId = '';
  rating = 5;
  reviewContent = '';
  reviewFiles: string[] = [];
  caseType = 'SUPPORT';
  reason = '';
  description = '';
  caseFiles: string[] = [];
  resolutions = ['REFUND', 'REPLACEMENT', 'REPRODUCTION', 'REDELIVERY', 'REJECT', 'OTHER'];
  get selectedOrder() {
    return this.orders().find((o) => o._id === this.orderId);
  }
  ngOnInit() {
    this.load();
  }
  label(value: string) {
    return (
      (
        {
          PENDING: 'Chờ xử lý',
          AWAITING_CONFIRMATION: 'Chờ xác nhận',
          CONFIRMED: 'Đã xác nhận',
          DELIVERED: 'Đã giao',
          CANCELLED: 'Đã hủy',
          APPROVED: 'Đã xuất bản',
          REJECTED: 'Cần chỉnh sửa',
          OPEN: 'Đã tiếp nhận',
          QUEUED: 'Chờ ca làm việc',
          INVESTIGATING: 'Đang xác minh',
          NEEDS_INFO: 'Cần bổ sung',
          RESOLVING: 'Đang xử lý',
          CLOSED: 'Đã đóng',
          RETURN: 'Đổi trả',
          COMPLAINT: 'Khiếu nại',
          SUPPORT: 'Hỗ trợ',
          REFUND: 'Hoàn tiền',
          REPLACEMENT: 'Đổi sản phẩm',
          REPRODUCTION: 'Làm lại',
          REDELIVERY: 'Giao lại',
          REJECT: 'Từ chối yêu cầu',
          OTHER: 'Hỗ trợ khác',
          SUCCESS: 'Thành công',
          FAILED: 'Chưa thành công',
        } as Record<string, string>
      )[value] || value
    );
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    const paths = this.admin
      ? ['care/admin/reviews', 'care/admin/cases', 'care/admin/refunds']
      : ['care/reviews', 'care/cases', 'orders', 'care/notifications'];
    forkJoin(paths.map((p) => this.api.get<any[]>(p))).subscribe({
      next: (data) => {
        this.reviews.set(data[0]);
        this.cases.set(data[1]);
        if (this.admin) this.refunds.set(data[2]);
        else {
          this.orders.set(data[2]);
          this.notices.set(data[3]);
        }
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.fail(e);
      },
    });
  }
  fail(e: any) {
    const msg = e.error?.message;
    this.error.set(
      Array.isArray(msg) ? msg.join('; ') : msg || 'Không thể thực hiện. Vui lòng thử lại.',
    );
    this.busy.set(false);
  }
  act(path: string, body: any, patch = false, done?: () => void) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    (patch ? this.api.patch(path, body) : this.api.post(path, body)).subscribe({
      next: () => {
        this.busy.set(false);
        this.message.set('Đã ghi nhận thành công.');
        done?.();
        this.load();
      },
      error: (e) => this.fail(e),
    });
  }
  selectOrder(id: string) {
    this.orderId = id;
    this.productId = '';
    this.reviewContent = '';
    this.reviewFiles = [];
  }
  canCancel(o: any) {
    return (
      ['PENDING', 'AWAITING_CONFIRMATION'].includes(o.orderStatus) &&
      !o.confirmationWait?.confirmedAt
    );
  }
  cancel(o: any) {
    this.act(`orders/${o._id}/cancel`, {}, true);
  }
  dismiss(n: any) {
    this.act(`care/notifications/${n._id}/dismiss`, {}, true);
  }
  submitReview() {
    this.act(
      'care/reviews',
      {
        orderId: this.orderId,
        productId: this.productId,
        rating: this.rating,
        content: this.reviewContent,
        attachments: this.reviewFiles,
      },
      false,
      () => {
        this.reviewContent = '';
        this.reviewFiles = [];
      },
    );
  }
  editReview(r: any) {
    this.orderId = r.orderId;
    this.productId = r.productId;
    this.rating = r.rating;
    this.reviewContent = r.content;
    this.reviewFiles = [...r.attachments];
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  createCase() {
    this.act(
      'care/cases',
      {
        orderId: this.orderId,
        productId: this.productId || undefined,
        type: this.caseType,
        reason: this.reason,
        description: this.description,
        attachments: this.caseFiles,
      },
      false,
      () => {
        this.description = '';
        this.reason = '';
        this.caseFiles = [];
      },
    );
  }
  reply(c: any) {
    this.act(`care/cases/${c._id}/replies`, { text: c.reply, attachments: c.replyFiles || [] });
  }
  moderate(r: any, status: string) {
    this.act(`care/admin/reviews/${r._id}`, { status, note: r.note }, true);
  }
  updateCase(c: any, status: string) {
    this.act(
      `care/admin/cases/${c._id}`,
      {
        status,
        message: c.message,
        investigation: c.investigation,
        responsibility: c.responsibility,
        customizationChecked: c.customizationChecked,
        resolution: c.resolution,
        result: c.result,
      },
      true,
    );
  }
  upload(event: Event, target: any) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    const existing =
      target === 'review'
        ? this.reviewFiles
        : target === 'case'
          ? this.caseFiles
          : target.replyFiles || [];
    if (!files.length) return;
    if (existing.length + files.length > 5 || files.some((f) => f.size > 10 * 1024 * 1024)) {
      this.error.set('Tối đa 5 tệp, mỗi tệp không quá 10 MB.');
      input.value = '';
      return;
    }
    this.busy.set(true);
    forkJoin(
      files.map((file) => {
        const form = new FormData();
        form.append('file', file);
        return this.http.post<any>(`${environment.apiUrl}/care/attachments`, form);
      }),
    ).subscribe({
      next: (results) => {
        const ids = [...existing, ...results.map((r) => r.data._id)];
        if (target === 'review') this.reviewFiles = ids;
        else if (target === 'case') this.caseFiles = ids;
        else target.replyFiles = ids;
        this.busy.set(false);
        input.value = '';
      },
      error: (e) => this.fail(e),
    });
  }
  download(id: string) {
    this.http
      .get(`${environment.apiUrl}/care/attachments/${id}`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `giftory-${id}.${({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'video/mp4': 'mp4', 'application/pdf': 'pdf' } as Record<string, string>)[blob.type] || 'bin'}`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
        error: (e) => this.fail(e),
      });
  }
}
