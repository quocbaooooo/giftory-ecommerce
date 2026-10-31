import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AdminService } from '../../../core/services/admin.service';
import { timeout, finalize } from 'rxjs';

type MarketingTab = 'campaigns' | 'promotions';

@Component({
  selector: 'app-admin-marketing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mx-auto max-w-7xl space-y-6">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#800020]">Marketing Studio</p>
          <h1 class="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Chiến dịch & khuyến mãi</h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Quản lý banner trang chủ, lịch hiển thị và mã ưu đãi. Campaign không hoạt động sẽ không làm thay đổi giao diện mặc định.</p>
        </div>
        <button *ngIf="tab === 'campaigns'" type="button" (click)="newCampaign()" class="inline-flex items-center justify-center gap-2 rounded-xl bg-[#800020] px-5 py-3 text-sm font-bold text-[#FFF5E1] shadow-md transition hover:-translate-y-0.5 hover:bg-[#660019]">
          <span class="material-symbols-outlined text-lg">add</span> Tạo chiến dịch
        </button>
        <button *ngIf="tab === 'promotions'" type="button" (click)="newPromotion()" class="inline-flex items-center justify-center gap-2 rounded-xl bg-[#800020] px-5 py-3 text-sm font-bold text-[#FFF5E1] shadow-md transition hover:-translate-y-0.5 hover:bg-[#660019]">
          <span class="material-symbols-outlined text-lg">add</span> Tạo khuyến mãi
        </button>
      </header>

      <div class="flex gap-2 rounded-2xl border border-[#EBD3AE] bg-white p-1.5 shadow-sm">
        <button type="button" (click)="setTab('campaigns')" [class.bg-[#800020]]="tab === 'campaigns'" [class.text-white]="tab === 'campaigns'" [class.text-slate-600]="tab !== 'campaigns'" class="flex-1 rounded-xl px-4 py-3 text-sm font-bold transition">Chiến dịch trang chủ <span class="ml-1 opacity-70">{{ campaigns.length }}</span></button>
        <button type="button" (click)="setTab('promotions')" [class.bg-[#800020]]="tab === 'promotions'" [class.text-white]="tab === 'promotions'" [class.text-slate-600]="tab !== 'promotions'" class="flex-1 rounded-xl px-4 py-3 text-sm font-bold transition">Mã khuyến mãi <span class="ml-1 opacity-70">{{ promotions.length }}</span></button>
      </div>

      <p *ngIf="notice" class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{{ notice }}</p>
      <p *ngIf="error" role="alert" aria-live="assertive" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{{ error }}</p>

      @if (tab === 'campaigns') {
        <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section class="space-y-3">
            <div *ngIf="campaigns.length === 0" class="rounded-2xl border border-dashed border-[#EBD3AE] bg-white p-10 text-center">
              <span class="material-symbols-outlined text-4xl text-[#800020]/40">campaign</span>
              <h2 class="mt-3 text-lg font-bold text-slate-800">Chưa có chiến dịch</h2>
              <p class="mt-1 text-sm text-slate-500">Tạo campaign đầu tiên. Nếu chưa bật, trang chủ vẫn giữ giao diện mặc định.</p>
            </div>
            <article *ngFor="let campaign of campaigns" class="flex flex-col gap-4 rounded-2xl border border-[#EBD3AE] bg-white p-4 shadow-sm sm:flex-row sm:items-center">
              <img *ngIf="campaign.imageUrl" [src]="campaign.imageUrl" [alt]="campaign.imageAlt || campaign.title" class="h-28 w-full rounded-xl bg-[#FFF5E1] object-cover sm:w-40" />
              <div *ngIf="!campaign.imageUrl" class="flex h-28 w-full items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-rose-100 text-[#800020]/60 sm:w-40"><span class="material-symbols-outlined text-4xl">{{ campaign.icon || 'campaign' }}</span></div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2"><span class="rounded-full px-2.5 py-1 text-[11px] font-bold" [ngClass]="campaign.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'">{{ campaign.isActive ? 'Đang bật' : 'Bản nháp / đã tắt' }}</span><span class="text-xs text-slate-400">Ưu tiên {{ campaign.sortOrder || 0 }}</span></div>
                <h2 class="mt-2 truncate text-base font-bold text-slate-900">{{ campaign.title }}</h2>
                <p class="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{{ campaign.description }}</p>
                <p class="mt-2 text-[11px] font-medium text-slate-400">{{ campaign.startsAt ? (campaign.startsAt | date:'dd/MM/yyyy HH:mm') : 'Bắt đầu ngay' }} → {{ campaign.endsAt ? (campaign.endsAt | date:'dd/MM/yyyy HH:mm') : 'Không đặt ngày kết thúc' }}</p>
              </div>
              <div class="flex shrink-0 gap-2 sm:flex-col"><button type="button" (click)="editCampaign(campaign)" class="rounded-lg border border-[#EBD3AE] px-3 py-2 text-xs font-bold text-[#800020] hover:bg-[#FFF5E1]">Chỉnh sửa</button><button type="button" (click)="deleteCampaign(campaign)" class="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50">Xóa</button></div>
            </article>
          </section>

          <form *ngIf="campaignForm" (ngSubmit)="saveCampaign()" class="h-fit space-y-4 rounded-2xl border border-[#EBD3AE] bg-white p-5 shadow-sm">
            <div class="flex items-start justify-between gap-3"><div><p class="text-xs font-bold uppercase tracking-wider text-[#800020]">{{ editingCampaignId ? 'Cập nhật nội dung' : 'Campaign mới' }}</p><h2 class="mt-1 text-lg font-extrabold text-slate-900">Thiết lập hiển thị</h2></div><button type="button" (click)="campaignForm = null" aria-label="Đóng biểu mẫu" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><span class="material-symbols-outlined">close</span></button></div>
            <label class="block text-xs font-bold text-slate-700">Tiêu đề campaign<input name="title" [(ngModel)]="campaignForm.title" required maxlength="90" class="mt-1.5 w-full rounded-xl border-slate-200 text-sm focus:border-[#800020] focus:ring-[#800020]" placeholder="Món quà mang dấu ấn riêng" /></label>
            <label class="block text-xs font-bold text-slate-700">Nhãn phía trên<input name="eyebrow" [(ngModel)]="campaignForm.eyebrow" required maxlength="60" class="mt-1.5 w-full rounded-xl border-slate-200 text-sm focus:border-[#800020] focus:ring-[#800020]" placeholder="QUÀ TẶNG CÁ NHÂN HÓA" /></label>
            <label class="block text-xs font-bold text-slate-700">Thông điệp<textarea name="description" [(ngModel)]="campaignForm.description" required maxlength="280" rows="3" class="mt-1.5 w-full rounded-xl border-slate-200 text-sm focus:border-[#800020] focus:ring-[#800020]" placeholder="Mô tả ngắn, tập trung vào giá trị dành cho khách hàng"></textarea></label>
            <div class="rounded-2xl border border-dashed border-[#EBD3AE] bg-[#FFF5E1]/50 p-3">
              <div class="mb-2 flex items-center justify-between gap-3"><div><p class="text-xs font-bold text-slate-700">Ảnh banner</p><p class="mt-0.5 text-[11px] leading-4 text-slate-500">Cloudinary tự tối ưu chất lượng, định dạng và kích thước banner.</p></div><button type="button" (click)="campaignBannerInput.click()" [disabled]="campaignImageUploading" class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#800020] shadow-sm ring-1 ring-[#F5D9AF] transition hover:bg-[#FFF5E1] disabled:opacity-60"><span class="material-symbols-outlined text-base">{{ campaignImageUploading ? 'progress_activity' : 'cloud_upload' }}</span>{{ campaignImageUploading ? 'Đang tải…' : 'Tải ảnh lên' }}</button></div>
              <input #campaignBannerInput type="file" accept="image/png,image/jpeg,image/webp,image/avif" class="hidden" (change)="onCampaignBannerSelected($event)" />
              <p class="mt-1 text-[10px] text-slate-400">Chọn file ảnh từ máy của bạn. Ảnh tải trực tiếp lên Cloudinary; nếu backend không phản hồi, giao diện sẽ tự báo lỗi sau 45 giây.</p>
              <div *ngIf="campaignForm.imageUrl && !campaignPreviewFailed" class="relative mt-3 overflow-hidden rounded-xl bg-white"><img [src]="campaignForm.imageUrl" alt="Xem trước ảnh campaign" (error)="campaignPreviewFailed = true" class="h-36 w-full object-cover" /><button type="button" (click)="removeCampaignImage()" class="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 shadow" aria-label="Gỡ ảnh banner"><span class="material-symbols-outlined text-sm">delete</span>Gỡ ảnh</button></div>
              <p *ngIf="campaignPreviewFailed" class="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">Ảnh cũ không còn truy cập được. Chọn file mới để thay thế.</p>
              <p *ngIf="!campaignForm.imageUrl" class="rounded-xl bg-white px-3 py-4 text-center text-xs text-slate-400">Chọn ảnh ngang chất lượng cao để banner hiển thị đẹp trên desktop và mobile. Tối đa 8MB.</p>
            </div>
            <label class="block text-xs font-bold text-slate-700">Mô tả ảnh<input name="imageAlt" [(ngModel)]="campaignForm.imageAlt" class="mt-1.5 w-full rounded-xl border-slate-200 text-sm focus:border-[#800020] focus:ring-[#800020]" placeholder="Mô tả ảnh cho trình đọc màn hình" /></label>
            <div class="grid grid-cols-2 gap-3"><label class="block text-xs font-bold text-slate-700">Nhãn nút chính<input name="primaryLabel" [(ngModel)]="campaignForm.primaryLabel" required maxlength="45" class="mt-1.5 w-full rounded-xl border-slate-200 text-sm" /></label><label class="block text-xs font-bold text-slate-700">Đường dẫn chính<input name="primaryLink" [(ngModel)]="campaignForm.primaryLink" required class="mt-1.5 w-full rounded-xl border-slate-200 text-sm" placeholder="/products" /></label></div>
            <div class="grid grid-cols-2 gap-3"><label class="block text-xs font-bold text-slate-700">Nhãn nút phụ<input name="secondaryLabel" [(ngModel)]="campaignForm.secondaryLabel" class="mt-1.5 w-full rounded-xl border-slate-200 text-sm" /></label><label class="block text-xs font-bold text-slate-700">Đường dẫn phụ<input name="secondaryLink" [(ngModel)]="campaignForm.secondaryLink" class="mt-1.5 w-full rounded-xl border-slate-200 text-sm" placeholder="/shopping-guide" /></label></div>
            <div class="grid grid-cols-2 gap-3"><label class="block text-xs font-bold text-slate-700">Bắt đầu<input name="startsAt" type="datetime-local" [(ngModel)]="campaignForm.startsAt" class="mt-1.5 w-full rounded-xl border-slate-200 text-xs" /></label><label class="block text-xs font-bold text-slate-700">Kết thúc<input name="endsAt" type="datetime-local" [(ngModel)]="campaignForm.endsAt" class="mt-1.5 w-full rounded-xl border-slate-200 text-xs" /></label></div>
            <div class="flex items-center justify-between gap-3"><label class="flex items-center gap-2 text-sm font-semibold text-slate-700"><input name="isActive" type="checkbox" [(ngModel)]="campaignForm.isActive" class="rounded border-slate-300 text-[#800020] focus:ring-[#800020]" /> Bật campaign</label><label class="text-xs font-bold text-slate-700">Thứ tự<input name="sortOrder" type="number" [(ngModel)]="campaignForm.sortOrder" class="ml-2 w-20 rounded-lg border-slate-200 text-sm" /></label></div>
            <button type="submit" [disabled]="saving" class="w-full rounded-xl bg-[#800020] px-4 py-3 text-sm font-bold text-[#FFF5E1] transition hover:bg-[#660019] disabled:opacity-60">{{ saving ? 'Đang lưu…' : 'Lưu chiến dịch' }}</button>
          </form>
        </div>
      } @else {
        <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section class="space-y-3">
            <div *ngIf="promotions.length === 0" class="rounded-2xl border border-dashed border-[#EBD3AE] bg-white p-10 text-center"><span class="material-symbols-outlined text-4xl text-[#800020]/40">sell</span><h2 class="mt-3 text-lg font-bold text-slate-800">Chưa có mã khuyến mãi</h2><p class="mt-1 text-sm text-slate-500">Tạo mã giảm giá hoặc miễn phí vận chuyển cho khách hàng.</p></div>
            <article *ngFor="let promo of promotions" class="flex flex-col gap-3 rounded-2xl border border-[#EBD3AE] bg-white p-4 shadow-sm sm:flex-row sm:items-center">
              <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#FFF5E1] text-center text-xs font-black tracking-wide text-[#800020]">{{ promo.code }}</div>
              <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><h2 class="text-sm font-extrabold text-slate-900">{{ promo.title }}</h2><span class="rounded-full px-2 py-0.5 text-[10px] font-bold" [ngClass]="isPromotionLive(promo) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'">{{ isPromotionLive(promo) ? 'Đang bật' : 'Đã tắt / hết hạn' }}</span></div><p class="mt-1 text-xs text-slate-500">{{ promo.discountType === 'PERCENT' ? 'Giảm ' + promo.discountValue + '%' : promo.discountType === 'FREESHIP' ? 'Miễn phí vận chuyển' : 'Giảm ' + (promo.discountValue | number:'1.0-0') + '₫' }} · Đã dùng {{ promo.usedCount || 0 }}/{{ promo.usageLimit || 0 }} · Hạn {{ promo.expiresAt | date:'dd/MM/yyyy' }}</p><p class="mt-1 text-xs text-slate-400">Đơn tối thiểu {{ promo.minOrderValue | number:'1.0-0' }}₫</p></div>
              <div class="flex shrink-0 gap-2"><button type="button" (click)="editPromotion(promo)" class="rounded-lg border border-[#EBD3AE] px-3 py-2 text-xs font-bold text-[#800020] hover:bg-[#FFF5E1]">Chỉnh sửa</button><button type="button" (click)="deletePromotion(promo)" class="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50">Xóa</button></div>
            </article>
          </section>

          <form *ngIf="promotionForm" (ngSubmit)="savePromotion()" class="h-fit space-y-4 rounded-2xl border border-[#EBD3AE] bg-white p-5 shadow-sm">
            <div class="flex items-start justify-between gap-3"><div><p class="text-xs font-bold uppercase tracking-wider text-[#800020]">{{ editingPromotionId ? 'Cập nhật ưu đãi' : 'Ưu đãi mới' }}</p><h2 class="mt-1 text-lg font-extrabold text-slate-900">Mã khuyến mãi</h2></div><button type="button" (click)="promotionForm = null" aria-label="Đóng biểu mẫu" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><span class="material-symbols-outlined">close</span></button></div>
            <label class="block text-xs font-bold text-slate-700">Mã<input name="code" [(ngModel)]="promotionForm.code" required maxlength="80" class="mt-1.5 w-full rounded-xl border-slate-200 text-sm uppercase" placeholder="GIFTORY10" /></label>
            <label class="block text-xs font-bold text-slate-700">Tên chương trình<input name="promoTitle" [(ngModel)]="promotionForm.title" required class="mt-1.5 w-full rounded-xl border-slate-200 text-sm" placeholder="Ưu đãi khách hàng mới" /></label>
            <label class="block text-xs font-bold text-slate-700">Mô tả<textarea name="promoDescription" [(ngModel)]="promotionForm.description" rows="2" class="mt-1.5 w-full rounded-xl border-slate-200 text-sm"></textarea></label>
            <div class="grid grid-cols-2 gap-3"><label class="block text-xs font-bold text-slate-700">Loại ưu đãi<select name="discountType" [(ngModel)]="promotionForm.discountType" class="mt-1.5 w-full rounded-xl border-slate-200 text-sm"><option value="PERCENT">Theo phần trăm</option><option value="FIXED">Số tiền cố định</option><option value="FREESHIP">Miễn phí ship</option></select></label><label class="block text-xs font-bold text-slate-700">Giá trị<input name="discountValue" type="number" min="0" [(ngModel)]="promotionForm.discountValue" [disabled]="promotionForm.discountType === 'FREESHIP'" class="mt-1.5 w-full rounded-xl border-slate-200 text-sm" /></label></div>
            <div class="grid grid-cols-2 gap-3"><label class="block text-xs font-bold text-slate-700">Đơn tối thiểu<input name="minOrderValue" type="number" min="0" [(ngModel)]="promotionForm.minOrderValue" class="mt-1.5 w-full rounded-xl border-slate-200 text-sm" /></label><label class="block text-xs font-bold text-slate-700">Giảm tối đa<input name="maxDiscount" type="number" min="0" [(ngModel)]="promotionForm.maxDiscount" class="mt-1.5 w-full rounded-xl border-slate-200 text-sm" /></label></div>
            <div class="grid grid-cols-2 gap-3"><label class="block text-xs font-bold text-slate-700">Số lượt dùng<input name="usageLimit" type="number" min="1" [(ngModel)]="promotionForm.usageLimit" class="mt-1.5 w-full rounded-xl border-slate-200 text-sm" /></label><label class="block text-xs font-bold text-slate-700">Hết hạn<input name="expiresAt" type="date" [(ngModel)]="promotionForm.expiresAt" required class="mt-1.5 w-full rounded-xl border-slate-200 text-sm" /></label></div>
            <label class="flex items-center gap-2 text-sm font-semibold text-slate-700"><input name="promoActive" type="checkbox" [(ngModel)]="promotionForm.isActive" class="rounded border-slate-300 text-[#800020] focus:ring-[#800020]" /> Kích hoạt mã</label>
            <button type="submit" [disabled]="saving" class="w-full rounded-xl bg-[#800020] px-4 py-3 text-sm font-bold text-[#FFF5E1] transition hover:bg-[#660019] disabled:opacity-60">{{ saving ? 'Đang lưu…' : 'Lưu khuyến mãi' }}</button>
          </form>
        </div>
      }
    </div>
  `
})
export class AdminMarketingComponent implements OnInit {
  private api = inject(ApiService);
  private adminService = inject(AdminService);
  tab: MarketingTab = 'campaigns';
  campaigns: any[] = [];
  promotions: any[] = [];
  campaignForm: any = null;
  promotionForm: any = null;
  editingCampaignId?: string;
  editingPromotionId?: string;
  saving = false;
  campaignImageUploading = false;
  campaignPreviewFailed = false;
  notice = '';
  error = '';
  today = new Date();

  ngOnInit(): void { this.loadCampaigns(); this.loadPromotions(); }
  setTab(tab: MarketingTab): void { this.tab = tab; this.notice = ''; this.error = ''; }
  loadCampaigns(): void { this.api.get<any[]>('admin/campaigns').subscribe({ next: items => this.campaigns = items || [], error: err => this.error = this.message(err) }); }
  loadPromotions(): void { this.api.get<any[]>('vouchers/admin/manage').subscribe({ next: items => this.promotions = items || [], error: err => this.error = this.message(err) }); }

  newCampaign(): void {
    this.editingCampaignId = undefined;
    this.campaignForm = { title: 'Món quà mang dấu ấn riêng', eyebrow: 'QUÀ TẶNG CÁ NHÂN HÓA', description: 'Thêm tên, lời nhắn hoặc hình ảnh để biến món quà yêu thích thành kỷ niệm chỉ thuộc về người nhận.', imageUrl: '', imageAlt: 'Sản phẩm quà tặng cá nhân hóa từ Giftory', primaryLabel: 'Khám phá quà custom', primaryLink: '/products?customizable=true', secondaryLabel: 'Tự thiết kế trong Studio', secondaryLink: '/custom-studio', icon: 'draw', sortOrder: 0, isActive: false, startsAt: '', endsAt: '' };
    this.campaignPreviewFailed = false;
    this.error = ''; this.notice = '';
  }
  editCampaign(campaign: any): void {
    this.editingCampaignId = campaign._id;
    this.campaignForm = { ...campaign, startsAt: this.toLocalInput(campaign.startsAt), endsAt: this.toLocalInput(campaign.endsAt) };
    this.campaignPreviewFailed = false;
    this.error = ''; this.notice = '';
  }
  saveCampaign(): void {
    this.saving = true; this.error = ''; this.notice = '';
    const payload = { ...this.campaignForm, startsAt: this.fromLocalInput(this.campaignForm.startsAt), endsAt: this.fromLocalInput(this.campaignForm.endsAt) };
    const request = this.editingCampaignId ? this.api.patch(`admin/campaigns/${this.editingCampaignId}`, payload) : this.api.post('admin/campaigns', payload);
    request.subscribe({ next: () => { this.saving = false; this.campaignForm = null; this.notice = 'Đã lưu chiến dịch.'; this.loadCampaigns(); }, error: err => { this.saving = false; this.error = this.message(err); } });
  }
  onCampaignBannerSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.campaignForm) return;
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) {
      this.error = 'Chọn file ảnh PNG, JPG, WebP hoặc AVIF có dung lượng tối đa 8MB.';
      return;
    }
    this.error = ''; this.campaignImageUploading = true;
    this.adminService.uploadCampaignBanner(file).pipe(
      timeout({ first: 45000 }),
      finalize(() => this.campaignImageUploading = false),
    ).subscribe({
      next: (result: any) => {
        const url = result?.url || result?.data?.url;
        if (!url) { this.error = 'Cloudinary không trả về đường dẫn ảnh. Vui lòng thử lại.'; }
        else { this.campaignForm.imageUrl = url; this.campaignPreviewFailed = false; this.campaignForm.imageAlt ||= file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '); }
      },
      error: err => {
        this.error = err?.name === 'TimeoutError'
          ? 'Tải ảnh quá 45 giây chưa có phản hồi. Kiểm tra backend ở cổng 3000 và cấu hình Cloudinary rồi thử lại.'
          : this.message(err);
      },
    });
  }
  removeCampaignImage(): void {
    if (!this.campaignForm) return;
    this.campaignForm.imageUrl = '';
    this.campaignForm.imageAlt = '';
    this.campaignPreviewFailed = false;
  }
  deleteCampaign(campaign: any): void {
    if (!window.confirm(`Xóa chiến dịch “${campaign.title}”?`)) return;
    this.api.delete(`admin/campaigns/${campaign._id}`).subscribe({ next: () => { this.notice = 'Đã xóa chiến dịch.'; this.loadCampaigns(); }, error: err => this.error = this.message(err) });
  }

  newPromotion(): void {
    this.editingPromotionId = undefined;
    this.promotionForm = { code: '', title: '', description: '', discountType: 'PERCENT', discountValue: 10, minOrderValue: 0, maxDiscount: 0, usageLimit: 100, expiresAt: this.dateInput(new Date(Date.now() + 30 * 86400000)), isActive: false };
    this.error = ''; this.notice = '';
  }
  editPromotion(promo: any): void {
    this.editingPromotionId = promo._id;
    this.promotionForm = { ...promo, expiresAt: this.dateInput(new Date(promo.expiresAt)) };
    this.error = ''; this.notice = '';
  }
  savePromotion(): void {
    this.saving = true; this.error = ''; this.notice = '';
    const payload = { ...this.promotionForm, code: this.promotionForm.code.trim().toUpperCase(), expiresAt: new Date(`${this.promotionForm.expiresAt}T23:59:59`).toISOString() };
    const request = this.editingPromotionId ? this.api.patch(`vouchers/admin/manage/${this.editingPromotionId}`, payload) : this.api.post('vouchers/admin/manage', payload);
    request.subscribe({ next: () => { this.saving = false; this.promotionForm = null; this.notice = 'Đã lưu mã khuyến mãi.'; this.loadPromotions(); }, error: err => { this.saving = false; this.error = this.message(err); } });
  }
  deletePromotion(promo: any): void {
    if (!window.confirm(`Xóa mã khuyến mãi ${promo.code}?`)) return;
    this.api.delete(`vouchers/admin/manage/${promo._id}`).subscribe({ next: () => { this.notice = 'Đã xóa mã khuyến mãi.'; this.loadPromotions(); }, error: err => this.error = this.message(err) });
  }

  isPromotionLive(promo: any): boolean { return !!promo.isActive && new Date(promo.expiresAt).getTime() > Date.now(); }

  private toLocalInput(value?: string | Date | null): string {
    if (!value) return '';
    const date = new Date(value); const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }
  private fromLocalInput(value?: string | null): string | null { return value ? new Date(value).toISOString() : null; }
  private dateInput(date: Date): string { return date.toISOString().slice(0, 10); }
  private message(error: any): string {
    if (error?.status === 0) return 'Không kết nối được backend Giftory. Kiểm tra API đang chạy tại localhost:3000 rồi thử lại.';
    if (error?.status === 401 || error?.status === 403) return 'Phiên quản trị không hợp lệ hoặc tài khoản chưa có quyền tải ảnh.';
    return error?.error?.message || error?.message || 'Không thể hoàn tất thao tác. Vui lòng thử lại.';
  }
}
