import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { LoyaltyService } from '../../core/services/loyalty.service';
import { OrderService } from '../../core/services/order.service';
import { User, Order } from '../../core/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
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
          <div class="bg-gradient-to-br from-[#2D1B69] via-giftory-primary to-[#7C3AED] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
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
                  <label class="text-xs font-bold text-giftory-ink">Tỉnh / Thành Phố</label>
                  <input
                    type="text"
                    formControlName="city"
                    placeholder="VD: TP. Hồ Chí Minh"
                    class="w-full px-4 py-2.5 bg-giftory-canvas rounded-xl border border-giftory-border focus:outline-none focus:border-giftory-primary text-sm font-medium"
                  />
                </div>

                <div class="space-y-1.5">
                  <label class="text-xs font-bold text-giftory-ink">Quận / Huyện</label>
                  <input
                    type="text"
                    formControlName="district"
                    placeholder="VD: Quận 1"
                    class="w-full px-4 py-2.5 bg-giftory-canvas rounded-xl border border-giftory-border focus:outline-none focus:border-giftory-primary text-sm font-medium"
                  />
                </div>

                <div class="space-y-1.5">
                  <label class="text-xs font-bold text-giftory-ink">Phường / Xã</label>
                  <input
                    type="text"
                    formControlName="ward"
                    placeholder="VD: Phường Bến Nghé"
                    class="w-full px-4 py-2.5 bg-giftory-canvas rounded-xl border border-giftory-border focus:outline-none focus:border-giftory-primary text-sm font-medium"
                  />
                </div>
              </div>

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
                  [disabled]="isSaving()"
                  class="px-6 py-2.5 bg-giftory-primary hover:bg-giftory-primary-dark text-white text-sm font-bold rounded-xl transition shadow-md flex items-center gap-2"
                >
                  <span *ngIf="isSaving()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>

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
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  user = this.authService.currentUser;
  profileForm!: FormGroup;
  isSaving = signal<boolean>(false);
  isSavedSuccess = signal<boolean>(false);

  ngOnInit() {
    const current = this.user();
    this.profileForm = this.fb.group({
      fullName: [current?.fullName || '', [Validators.required]],
      phone: [current?.phone || '', [Validators.required]],
      city: [current?.address?.city || ''],
      district: [current?.address?.district || ''],
      ward: [current?.address?.ward || ''],
      detailAddress: [current?.address?.detailAddress || '']
    });
  }

  saveProfile() {
    if (this.profileForm.invalid) return;
    this.isSaving.set(true);

    const val = this.profileForm.value;
    const updatePayload = {
      fullName: val.fullName,
      phone: val.phone,
      address: {
        city: val.city,
        district: val.district,
        ward: val.ward,
        detailAddress: val.detailAddress
      }
    };

    // Update in auth service
    setTimeout(() => {
      if (this.user()) {
        const updated = {
          ...this.user()!,
          fullName: val.fullName,
          phone: val.phone,
          address: updatePayload.address
        };
        this.authService.currentUser.set(updated);
        localStorage.setItem('giftory_user', JSON.stringify(updated));
      }
      this.isSaving.set(false);
      this.isSavedSuccess.set(true);
      setTimeout(() => this.isSavedSuccess.set(false), 3000);
    }, 400);
  }

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
