import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-50/50 via-white to-purple-100/40 relative overflow-hidden">
      <!-- Ambient Decorative Blur Blobs -->
      <div class="absolute -top-24 -left-24 w-96 h-96 bg-purple-300/30 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-300/30 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Main Login Card Container -->
      <div class="max-w-4xl w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-purple-100 overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">
        
        <!-- Left Hero Branding Section -->
        <div class="lg:col-span-5 bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-950 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div class="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-2xl pointer-events-none"></div>
          
          <!-- Brand Logo -->
          <div class="relative z-10 space-y-6">
            <a routerLink="/" class="inline-flex items-center gap-3 group">
              <div class="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <img src="/logo.png" alt="Giftory Logo" class="w-7 h-7 object-contain drop-shadow" />
              </div>
              <div>
                <span class="font-display font-black text-2xl text-white tracking-tight block leading-none">Giftory</span>
                <span class="text-[10px] text-purple-200 font-semibold tracking-wider uppercase">Studio & Gift Store</span>
              </div>
            </a>

            <div class="pt-4 space-y-3">
              <h2 class="text-2xl font-bold tracking-tight text-white leading-tight">
                Nơi Quà Tặng Trở Thành Kỷ Niệm 🎁
              </h2>
              <p class="text-xs text-purple-200/90 leading-relaxed">
                Đăng nhập để tùy chỉnh quà tặng 3D độc bản, tích điểm đổi quà và quản lý đơn hàng của bạn.
              </p>
            </div>
          </div>

          <!-- Feature Bullets -->
          <div class="relative z-10 my-8 space-y-3">
            <div class="flex items-center gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 shadow-xs">
              <div class="w-8 h-8 rounded-xl bg-purple-500/30 flex items-center justify-center text-amber-300">
                <span class="material-symbols-outlined text-lg">view_in_ar</span>
              </div>
              <div class="text-xs">
                <p class="font-bold text-white">Custom Studio 3D</p>
                <p class="text-[11px] text-purple-200/80">Xem trước sản phẩm thời gian thực</p>
              </div>
            </div>

            <div class="flex items-center gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 shadow-xs">
              <div class="w-8 h-8 rounded-xl bg-purple-500/30 flex items-center justify-center text-emerald-300">
                <span class="material-symbols-outlined text-lg">workspace_premium</span>
              </div>
              <div class="text-xs">
                <p class="font-bold text-white">Giftory Club</p>
                <p class="text-[11px] text-purple-200/80">Tích điểm nhận mã giảm giá độc quyền</p>
              </div>
            </div>

            <div class="flex items-center gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 shadow-xs">
              <div class="w-8 h-8 rounded-xl bg-purple-500/30 flex items-center justify-center text-purple-200">
                <span class="material-symbols-outlined text-lg">local_shipping</span>
              </div>
              <div class="text-xs">
                <p class="font-bold text-white">Đóng Gói & Hỏa Tốc</p>
                <p class="text-[11px] text-purple-200/80">Gửi trọn tình cảm trong từng chi tiết</p>
              </div>
            </div>
          </div>

          <!-- Footer Note -->
          <div class="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-purple-200/70">
            <span>© 2026 Giftory Studio</span>
            <span class="inline-flex items-center gap-1 text-emerald-400 font-semibold">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Hệ thống sẵn sàng
            </span>
          </div>
        </div>

        <!-- Right Form Section -->
        <div class="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
          <div>
            <!-- Top Segmented Switcher -->
            <div class="flex items-center p-1 bg-gray-100 rounded-2xl mb-8 max-w-xs border border-gray-200/60">
              <a
                routerLink="/login"
                class="flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all shadow-xs bg-purple-600 text-white"
              >
                Đăng Nhập
              </a>
              <a
                routerLink="/register"
                class="flex-1 py-2 text-center text-xs font-medium text-gray-600 hover:text-purple-600 rounded-xl transition-all"
              >
                Đăng Ký
              </a>
            </div>

            <!-- Form Header -->
            <div class="space-y-1.5 mb-6">
              <h3 class="text-2xl font-bold text-gray-900 tracking-tight">Chào mừng bạn trở lại! 👋</h3>
              <p class="text-xs text-gray-500">Vui lòng nhập tài khoản email và mật khẩu của bạn</p>
            </div>

            <!-- Admin Only Notice -->
            <div *ngIf="adminNotice()" class="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-start gap-2.5 shadow-xs">
              <span class="material-symbols-outlined text-amber-600 text-lg flex-shrink-0 mt-0.5">admin_panel_settings</span>
              <div>
                <p class="font-bold">Yêu cầu quyền Quản Trị Viên</p>
                <p class="text-[11px] text-amber-700">Vui lòng đăng nhập bằng tài khoản Admin để tiếp tục vào trang quản trị.</p>
              </div>
            </div>

            <!-- Error Alert -->
            <div *ngIf="errorMessage()" class="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5 shadow-xs animate-fade-in">
              <span class="material-symbols-outlined text-rose-500 text-lg flex-shrink-0 mt-0.5">error</span>
              <div class="flex-1">
                <p class="font-semibold">{{ errorMessage() }}</p>
              </div>
            </div>

            <!-- Login Form -->
            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-5">
              <!-- Email Field -->
              <div class="space-y-1.5">
                <label class="text-xs font-bold text-gray-700 uppercase tracking-wider block">Email Đăng Nhập *</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400 text-xl pointer-events-none">mail</span>
                  <input
                    type="email"
                    formControlName="email"
                    placeholder="name@example.com"
                    class="w-full pl-11 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-purple-600 focus:ring-4 focus:ring-purple-500/15 transition-all"
                  />
                </div>
                <div *ngIf="loginForm.get('email')?.touched && loginForm.get('email')?.invalid" class="text-[11px] text-rose-500 font-medium flex items-center gap-1 pl-1">
                  <span class="material-symbols-outlined text-xs">info</span>
                  <span>Vui lòng nhập email hợp lệ</span>
                </div>
              </div>

              <!-- Password Field -->
              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <label class="text-xs font-bold text-gray-700 uppercase tracking-wider block">Mật Khẩu *</label>
                  <a href="javascript:void(0)" (click)="forgotPassword()" class="text-xs text-purple-600 font-semibold hover:text-purple-700 hover:underline">
                    Quên mật khẩu?
                  </a>
                </div>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400 text-xl pointer-events-none">lock</span>
                  <input
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="password"
                    placeholder="Nhập mật khẩu của bạn"
                    class="w-full pl-11 pr-11 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-purple-600 focus:ring-4 focus:ring-purple-500/15 transition-all"
                  />
                  <button
                    type="button"
                    (click)="showPassword.set(!showPassword())"
                    class="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 p-1 rounded-lg transition"
                    title="Hiển thị mật khẩu"
                  >
                    <span class="material-symbols-outlined text-xl">{{ showPassword() ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
                <div *ngIf="loginForm.get('password')?.touched && loginForm.get('password')?.invalid" class="text-[11px] text-rose-500 font-medium flex items-center gap-1 pl-1">
                  <span class="material-symbols-outlined text-xs">info</span>
                  <span>Mật khẩu tối thiểu 6 ký tự</span>
                </div>
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                [disabled]="loginForm.invalid || isLoading()"
                class="w-full py-3.5 px-6 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 transform active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed mt-4"
              >
                <span *ngIf="isLoading()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>{{ isLoading() ? 'Đang xác thực...' : 'Đăng Nhập Ngay' }}</span>
                <span *ngIf="!isLoading()" class="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            </form>
          </div>

          <!-- Bottom Footer Switch -->
          <div class="pt-6 mt-6 border-t border-gray-100 text-center">
            <p class="text-xs text-gray-600">
              Chưa có tài khoản hội viên?
              <a routerLink="/register" class="text-purple-600 font-bold hover:text-purple-700 hover:underline ml-1 inline-flex items-center gap-0.5">
                Đăng ký ngay
                <span class="material-symbols-outlined text-xs">chevron_right</span>
              </a>
            </p>
          </div>
        </div>

      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isLoading = signal<boolean>(false);
  showPassword = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  adminNotice = signal<boolean>(false);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit(): void {
    const errorParam = this.route.snapshot.queryParams['error'];
    if (errorParam === 'admin_only') {
      this.adminNotice.set(true);
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;
    this.authService.login(email, password).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const currentUser = this.authService.currentUser() || res.data?.user || res.user;
        const isAdmin = currentUser?.role === 'ADMIN' || this.authService.isAdmin();

        const returnUrl = this.route.snapshot.queryParams['returnUrl'];

        if (isAdmin) {
          // Admin account ALWAYS redirects directly to admin portal
          if (returnUrl && returnUrl.startsWith('/admin')) {
            this.router.navigateByUrl(returnUrl);
          } else {
            this.router.navigate(['/admin/dashboard']);
          }
        } else {
          // Standard customer account redirect
          if (returnUrl && !returnUrl.startsWith('/admin')) {
            this.router.navigateByUrl(returnUrl);
          } else {
            this.router.navigate(['/']);
          }
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại email hoặc mật khẩu.'
        );
      }
    });
  }

  forgotPassword(): void {
    alert('Vui lòng liên hệ hotline CSKH hoặc email cskh@giftory.vn để được hỗ trợ khôi phục mật khẩu.');
  }
}

