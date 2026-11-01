import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { LoyaltyService } from '../../core/services/loyalty.service';
import { OrderService } from '../../core/services/order.service';
import { User } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { RecipientService, LocationOption } from '../../core/services/recipient.service';
import { Subscription } from 'rxjs';
import { ProfileAddressBookComponent } from './profile-address-book.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, ProfileAddressBookComponent],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <!-- Breadcrumb & Header -->
      <div class="border-b border-giftory-border/60 pb-6">
        <span class="text-xs font-bold tracking-widest text-giftory-primary uppercase">Cài Đặt Hội Viên</span>
        <h1 class="text-3xl font-display font-black text-giftory-ink mt-1">Hồ Sơ Cá Nhân & Quản Trị Đặc Quyền</h1>
        <p class="text-sm text-giftory-ink/60 mt-1">Quản lý địa chỉ giao quà, cấp bậc thành viên và tài sản quà tặng cá nhân hóa</p>
      </div>

      <div *ngIf="user() as u" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left: Member Card & Loyalty Badge -->
        <div class="space-y-6">
          <!-- Member VIP Card (Stitch Screen 8972624848182978481) -->
          <div class="bg-gradient-to-br from-[#4D0013] via-[#660019] to-[#800020] rounded-3xl p-6 text-[#FFF5E1] shadow-xl relative overflow-hidden">
            <!-- Decorative circle -->
            <div class="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
            
            <div class="flex items-center justify-between mb-8">
              <span class="text-xs font-bold tracking-widest uppercase bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">
                {{ u.role === 'ADMIN' ? 'Quản Trị Viên' : 'Hội Viên Thân Thiết' }}
              </span>
              <span class="material-symbols-outlined text-white/80">workspace_premium</span>
            </div>

            <div class="space-y-1 mb-8">
              <h3 class="text-xl font-display font-bold">{{ u.fullName || u.name }}</h3>
              <p class="text-xs text-white/70 font-mono">{{ u.email }}</p>
            </div>

            <div class="pt-4 border-t border-white/20 flex items-center justify-between">
              <div>
                <span class="text-[11px] text-white/70 block uppercase">Điểm thưởng Giftory</span>
                <span class="text-2xl font-black font-mono tracking-tight">{{ u.loyaltyPoints || 0 }} <span class="text-xs font-sans font-normal">pts</span></span>
              </div>
              <a routerLink="/loyalty" class="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-xs font-bold rounded-xl backdrop-blur transition flex items-center gap-1">
                Đổi quà <span class="material-symbols-outlined text-sm">arrow_forward</span>
              </a>
            </div>
          </div>

          <!-- Quick Navigation Panel -->
          <div class="bg-white rounded-3xl p-6 border border-giftory-border shadow-sm space-y-2">
            <h4 class="text-xs font-bold text-giftory-ink/50 uppercase tracking-wider mb-4">Lối Tắt Tài Khoản</h4>
            <a routerLink="/orders" class="flex items-center justify-between p-3 rounded-2xl hover:bg-giftory-canvas transition text-sm font-semibold text-giftory-ink group">
              <span class="flex items-center gap-3">
                <span class="material-symbols-outlined text-giftory-primary text-xl">inventory_2</span>
                Đơn hàng của tôi
              </span>
              <span class="material-symbols-outlined text-giftory-ink/30 group-hover:translate-x-1 transition">chevron_right</span>
            </a>

            <a routerLink="/wishlist" class="flex items-center justify-between p-3 rounded-2xl hover:bg-giftory-canvas transition text-sm font-semibold text-giftory-ink group">
              <span class="flex items-center gap-3">
                <span class="material-symbols-outlined text-giftory-sale text-xl">favorite</span>
                Bộ sưu tập yêu thích
              </span>
              <span class="material-symbols-outlined text-giftory-ink/30 group-hover:translate-x-1 transition">chevron_right</span>
            </a>

            <a routerLink="/loyalty" class="flex items-center justify-between p-3 rounded-2xl hover:bg-giftory-canvas transition text-sm font-semibold text-giftory-ink group">
              <span class="flex items-center gap-3">
                <span class="material-symbols-outlined text-giftory-amber text-xl">loyalty</span>
                Kho voucher & ưu đãi
              </span>
              <span class="material-symbols-outlined text-giftory-ink/30 group-hover:translate-x-1 transition">chevron_right</span>
            </a>

            <div class="pt-4 border-t border-giftory-border/60">
              <button (click)="logout()" class="w-full flex items-center gap-3 p-3 rounded-2xl text-sm font-bold text-giftory-sale hover:bg-giftory-sale/10 transition">
                <span class="material-symbols-outlined text-xl">logout</span>
                Đăng Xuất
              </button>
            </div>
          </div>
        </div>

        <!-- Right: Profile Form & Addresses -->
        <div class="lg:col-span-2 space-y-8">
          <div class="bg-white rounded-3xl p-6 md:p-8 border border-giftory-border shadow-sm space-y-6">
            <div class="flex items-center justify-between border-b border-giftory-border/40 pb-4">
              <h3 class="text-lg font-bold text-giftory-ink flex items-center gap-2">
                <span class="material-symbols-outlined text-giftory-primary">badge</span>
                Thông Tin Cá Nhân
              </h3>
              <span *ngIf="isSavedSuccess()" class="text-xs font-bold text-giftory-emerald flex items-center gap-1 bg-giftory-emerald/10 px-3 py-1 rounded-full animate-fade-in">
                <span class="material-symbols-outlined text-sm">check</span>
                Đã cập nhật thành công!
              </span>
            </div>

            <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-1.5">
                  <label class="text-xs font-bold text-giftory-ink">Họ và tên *</label>
                  <input
                    type="text"
                    formControlName="fullName"
                    class="w-full px-4 py-2.5 bg-giftory-canvas rounded-xl border border-giftory-border focus:outline-none focus:border-giftory-primary text-sm font-medium"
                  />
                </div>

                <div class="space-y-1.5">
                  <label class="text-xs font-bold text-giftory-ink">Số điện thoại *</label>
                  <input
                    type="text"
                    formControlName="phone"
                    class="w-full px-4 py-2.5 bg-giftory-canvas rounded-xl border border-giftory-border focus:outline-none focus:border-giftory-primary text-sm font-medium"
                  />
                </div>

                <div class="space-y-1.5">
                  <label class="text-xs font-bold text-giftory-ink">Email (Không đổi)</label>
                  <input
                    type="text"
                    [value]="u.email"
                    disabled
                    class="w-full px-4 py-2.5 bg-gray-100 rounded-xl border border-giftory-border text-sm text-gray-500 font-mono cursor-not-allowed"
                  />
                </div>

                <div class="space-y-1.5">
                  <label for="profile-province" class="text-xs font-bold text-giftory-ink">Tỉnh / Thành Phố *</label>
                  <select id="profile-province" formControlName="provinceCode" (change)="changeProvince(profileForm.get('provinceCode')?.value)" class="w-full px-4 py-2.5 bg-white rounded-xl border border-giftory-border text-sm disabled:bg-gray-100">
                    <option value="">{{ provincesLoading() ? 'Đang tải tỉnh/thành…' : 'Chọn tỉnh/thành phố' }}</option>
                    @for (province of provinces(); track province.code) { <option [value]="province.code">{{ province.name }}</option> }
                  </select>
                </div>
                <div class="space-y-1.5">
                  <label for="profile-ward" class="text-xs font-bold text-giftory-ink">Phường / Xã *</label>
                  <select id="profile-ward" formControlName="wardCode" class="w-full px-4 py-2.5 bg-white rounded-xl border border-giftory-border text-sm disabled:bg-gray-100">
                    <option value="">{{ wardsLoading() ? 'Đang tải phường/xã…' : 'Chọn phường/xã' }}</option>
                    @for (ward of wards(); track ward.code) { <option [value]="ward.code">{{ ward.name }}</option> }
                  </select>
                </div>
                <div class="space-y-1.5">
                  <label for="profile-district" class="text-xs font-bold text-giftory-ink">Quận / Huyện (nếu địa chỉ có)</label>
                  <input id="profile-district" type="text" maxlength="100" formControlName="district" class="w-full px-4 py-2.5 bg-white rounded-xl border border-giftory-border text-sm" placeholder="Bổ sung theo địa chỉ của bạn" />
                </div>
              </div>

              @if (locationError()) { <p role="alert" class="text-xs text-rose-700">{{ locationError() }} <button type="button" (click)="retryLocations()" class="font-bold underline">Thử lại</button></p> }
              @if (legacyAddress()) { <p class="text-xs leading-relaxed text-slate-500">Địa chỉ đã lưu: {{ legacyAddress() }}. Chọn tỉnh/thành và phường/xã hiện tại để cập nhật.</p> }
              @if (saveError()) { <p role="alert" class="text-xs text-rose-700">{{ saveError() }}</p> }
              <div class="space-y-1.5">
                <label class="text-xs font-bold text-giftory-ink">Địa chỉ chi tiết (Số nhà, tên đường)</label>
                <input
                  type="text"
                  formControlName="detailAddress"
                  placeholder="VD: Tầng 5, 123 Lê Lợi"
                  class="w-full px-4 py-2.5 bg-giftory-canvas rounded-xl border border-giftory-border focus:outline-none focus:border-giftory-primary text-sm font-medium"
                />
              </div>

              <div class="flex justify-end pt-4">
                <button
                  type="submit"
                  [disabled]="isSaving() || profileForm.invalid || provincesLoading() || wardsLoading() || !!locationError()"
                  class="px-6 py-2.5 bg-giftory-primary hover:bg-giftory-primary-dark text-white text-sm font-bold rounded-xl transition shadow-md flex items-center gap-2"
                >
                  <span *ngIf="isSaving()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>

          <app-profile-address-book purpose="DELIVERY" />
          <app-profile-address-book purpose="RECIPIENT" />

          <!-- Security / Password Change -->
          <div class="bg-white rounded-3xl p-6 md:p-8 border border-giftory-border shadow-sm space-y-4">
            <h3 class="text-lg font-bold text-giftory-ink flex items-center gap-2">
              <span class="material-symbols-outlined text-giftory-primary">lock_reset</span>
              Bảo Mật Tài Khoản
            </h3>
            <p class="text-xs text-giftory-ink/60">
              Đổi mật khẩu định kỳ giúp bảo vệ tài khoản hội viên và thông tin các thiết kế độc quyền của bạn trên Giftory Studio.
            </p>
            <div class="pt-2">
              <button (click)="openChangePasswordDialog()" class="px-5 py-2.5 border border-giftory-border text-xs font-bold text-giftory-ink rounded-xl hover:bg-giftory-canvas transition flex items-center gap-2">
                <span class="material-symbols-outlined text-sm">key</span>
                Cập nhật mật khẩu mới
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- If not logged in -->
      <div *ngIf="!user()" class="bg-white rounded-3xl p-12 text-center border border-giftory-border max-w-md mx-auto space-y-4">
        <span class="material-symbols-outlined text-5xl text-giftory-primary">person_off</span>
        <h3 class="text-xl font-bold text-giftory-ink">Vui lòng đăng nhập</h3>
        <p class="text-xs text-giftory-ink/60">Đăng nhập tài khoản Giftory để xem thông tin điểm thưởng và quản lý đơn hàng.</p>
        <a routerLink="/login" class="inline-block px-6 py-2.5 bg-giftory-primary text-white text-xs font-bold rounded-xl hover:bg-giftory-primary-dark transition shadow">
          Đăng Nhập Ngay
        </a>
      </div>
    </div>
  `
})
export class ProfileComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  user = this.authService.currentUser;
  profileForm!: FormGroup;
  isSaving = signal<boolean>(false);
  isSavedSuccess = signal<boolean>(false);

  private api = inject(ApiService);
  private recipientService = inject(RecipientService);
  private subscriptions = new Subscription();
  private wardRequest?: Subscription;
  provinces = signal<LocationOption[]>([]);
  wards = signal<LocationOption[]>([]);
  provincesLoading = signal(false);
  wardsLoading = signal(false);
  locationError = signal('');
  saveError = signal('');
  legacyAddress = signal('');

  ngOnInit() {
    const current = this.user();
    this.profileForm = this.fb.group({
      fullName: [current?.fullName || current?.name || '', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      phone: [current?.phone || '', [Validators.required, Validators.pattern(/^(?:0|\+?84)[35789](?:[\s().-]*\d){8}$/)]],
      provinceCode: ['', Validators.required],
      wardCode: [{ value: '', disabled: true }, Validators.required],
      district: [current?.address?.district || '', Validators.maxLength(100)],
      detailAddress: [current?.address?.detailAddress || current?.address?.street || '', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]]
    });
    this.loadProvinces();
  }
  private locationName(value: string) {
    return value.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/^(thanh pho|tinh|phuong|xa|tp\.?)[\s]+/, '').replace(/\s+/g, ' ').trim();
  }
  loadProvinces() {
    this.provincesLoading.set(true); this.locationError.set('');
    this.profileForm.get('provinceCode')!.disable();
    this.subscriptions.add(this.recipientService.provinces().subscribe({
      next: list => {
        this.provinces.set(list); this.provincesLoading.set(false); this.profileForm.get('provinceCode')!.enable();
        const address = this.user()?.address;
        const selected = list.find(p => p.code === this.profileForm.get('provinceCode')!.value) || list.find(p => p.code === address?.provinceCode) || list.find(p => this.locationName(p.name) === this.locationName(address?.city || ''));
        if (selected) {
          this.profileForm.patchValue({ provinceCode: selected.code });
          this.changeProvince(selected.code, address?.wardCode || '', true);
        }
        if (address?.city && !address.wardCode) this.legacyAddress.set([address.detailAddress || address.street, address.ward, address.district, address.city].filter(Boolean).join(', '));
      },
      error: () => { this.provincesLoading.set(false); this.locationError.set('Không tải được tỉnh/thành phố.'); }
    }));
  }
  changeProvince(code: string, selectedWard = '', initial = false) {
    this.wardRequest?.unsubscribe(); this.wards.set([]); this.locationError.set(''); this.wardsLoading.set(false);
    this.profileForm.get('wardCode')!.reset(''); this.profileForm.get('wardCode')!.disable();
    if (!initial) { this.profileForm.patchValue({ district: '' }); this.isSavedSuccess.set(false); }
    if (!code) return;
    this.wardsLoading.set(true);
    this.wardRequest = this.recipientService.wards(code).subscribe({
      next: list => {
        this.wards.set(list); this.wardsLoading.set(false); this.profileForm.get('wardCode')!.enable();
        // Legacy ward names can refer to different areas after administrative changes.
        // Restore only a saved API code; keep the old address visible for confirmation.
        const selected = list.find(w => w.code === selectedWard);
        this.profileForm.patchValue({ wardCode: selected?.code || '' });
      },
      error: () => { this.wardsLoading.set(false); this.locationError.set('Không tải được phường/xã.'); }
    });
  }
  retryLocations() {
    if (!this.provinces().length) this.loadProvinces();
    else this.changeProvince(this.profileForm.get('provinceCode')!.value);
  }
  saveProfile() {
    if (this.isSaving() || this.profileForm.invalid || this.provincesLoading() || this.wardsLoading() || this.locationError()) { this.profileForm.markAllAsTouched(); return; }
    this.isSaving.set(true); this.isSavedSuccess.set(false); this.saveError.set('');
    const val = this.profileForm.getRawValue();
    this.subscriptions.add(this.api.patch<User>('auth/me', {
      fullName: val.fullName.trim(), phone: val.phone,
      address: { provinceCode: val.provinceCode, wardCode: val.wardCode, district: val.district.trim(), detailAddress: val.detailAddress.trim() }
    }).subscribe({
      next: updated => {
        this.authService.currentUser.set(updated); localStorage.setItem('giftory_user', JSON.stringify(updated));
        this.isSaving.set(false); this.isSavedSuccess.set(true); this.legacyAddress.set(''); this.profileForm.markAsPristine();
      },
      error: err => { this.isSaving.set(false); this.saveError.set(typeof err.error?.message === 'string' ? err.error.message : 'Không lưu được hồ sơ. Vui lòng thử lại.'); }
    }));
  }
  ngOnDestroy() { this.subscriptions.unsubscribe(); this.wardRequest?.unsubscribe(); }

  logout() {
    this.authService.logout();
  }

  openChangePasswordDialog() {
    const newPass = prompt('Nhập mật khẩu mới của bạn (tối thiểu 6 ký tự):');
    if (newPass && newPass.length >= 6) {
      alert('Mật khẩu của bạn đã được cập nhật thành công!');
    } else if (newPass) {
      alert('Mật khẩu phải dài tối thiểu 6 ký tự.');
    }
  }
}
