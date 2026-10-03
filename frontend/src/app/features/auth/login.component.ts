import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="min-h-[80vh] flex items-center justify-center px-4 py-12 animate-fade-in">
      <div class="max-w-md w-full bg-white rounded-3xl p-8 border border-giftory-border shadow-xl space-y-6">
        <!-- Logo & Header (Stitch Screen 15677325011445543384) -->
        <div class="text-center space-y-2">
          <a routerLink="/" class="inline-flex items-center gap-2 justify-center">
            <span class="w-10 h-10 rounded-2xl bg-giftory-primary text-white flex items-center justify-center font-display font-black text-xl shadow">
              G
            </span>
            <span class="font-display font-black text-2xl text-giftory-ink tracking-tight">Giftory</span>
          </a>
          <h2 class="text-xl font-bold text-giftory-ink">Đăng Nhập Hội Viên</h2>
          <p class="text-xs text-giftory-ink/60">Truy cập tài khoản để tích điểm quà tặng và theo dõi đơn hàng</p>
        </div>

        <!-- Quick Demo Account Fill -->
        <div class="p-3 bg-giftory-canvas rounded-2xl border border-giftory-border space-y-2">
          <span class="text-[11px] font-bold text-giftory-ink/60 block uppercase tracking-wider">Đăng Nhập Nhanh (Dữ Liệu Mẫu)</span>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              (click)="fillDemo('admin')"
              class="px-3 py-1.5 bg-white border border-giftory-border text-giftory-primary hover:border-giftory-primary text-xs font-bold rounded-xl shadow-xs transition"
            >
              Admin Quản Trị
            </button>
            <button
              type="button"
              (click)="fillDemo('customer')"
              class="px-3 py-1.5 bg-white border border-giftory-border text-giftory-emerald hover:border-giftory-emerald text-xs font-bold rounded-xl shadow-xs transition"
            >
              Khách Hàng Mẫu
            </button>
          </div>
        </div>

        <!-- Error Alert -->
        <div *ngIf="errorMessage()" class="p-3 rounded-xl bg-giftory-sale/10 border border-giftory-sale/20 text-xs font-medium text-giftory-sale animate-fade-in">
          {{ errorMessage() }}
        </div>

        <!-- Login Form -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-giftory-ink">Email đăng nhập *</label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-giftory-ink/40 text-lg">mail</span>
              <input
                type="email"
                formControlName="email"
                placeholder="name@example.com"
                class="w-full pl-9 pr-4 py-2.5 bg-giftory-canvas rounded-xl border border-giftory-border focus:outline-none focus:border-giftory-primary text-sm font-medium"
              />
            </div>
            <span *ngIf="loginForm.get('email')?.touched && loginForm.get('email')?.invalid" class="text-[11px] text-giftory-sale">
              Email không hợp lệ
            </span>
          </div>

          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-giftory-ink">Mật khẩu *</label>
              <a href="javascript:void(0)" (click)="forgotPassword()" class="text-xs text-giftory-primary font-semibold hover:underline">Quên mật khẩu?</a>
            </div>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-giftory-ink/40 text-lg">lock</span>
              <input
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                placeholder="Tối thiểu 6 ký tự"
                class="w-full pl-9 pr-10 py-2.5 bg-giftory-canvas rounded-xl border border-giftory-border focus:outline-none focus:border-giftory-primary text-sm font-medium"
              />
              <button
                type="button"
                (click)="showPassword.set(!showPassword())"
                class="absolute right-3 top-2.5 text-giftory-ink/40 hover:text-giftory-ink"
              >
                <span class="material-symbols-outlined text-lg">{{ showPassword() ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
            <span *ngIf="loginForm.get('password')?.touched && loginForm.get('password')?.invalid" class="text-[11px] text-giftory-sale">
              Mật khẩu phải tối thiểu 6 ký tự
            </span>
          </div>

          <button
            type="submit"
            [disabled]="loginForm.invalid || isLoading()"
            class="w-full py-3 bg-giftory-primary hover:bg-giftory-primary-dark disabled:bg-gray-300 text-white text-sm font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2 mt-2"
          >
            <span *ngIf="isLoading()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Đăng Nhập
          </button>
        </form>

        <div class="text-center pt-2 border-t border-giftory-border/60">
          <p class="text-xs text-giftory-ink/70">
            Chưa có tài khoản hội viên?
            <a routerLink="/register" class="text-giftory-primary font-bold hover:underline ml-1">Đăng ký ngay</a>
          </p>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isLoading = signal<boolean>(false);
  showPassword = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  fillDemo(type: 'admin' | 'customer') {
    if (type === 'admin') {
      this.loginForm.patchValue({
        email: 'admin@giftory.vn',
        password: 'Admin@Giftory2026'
      });
    } else {
      this.loginForm.patchValue({
        email: 'customer@giftory.vn',
        password: 'Giftory@2026'
      });
    }
  }

  onSubmit() {
    if (this.loginForm.invalid) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;
    this.authService.login(email, password).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
        } else if (res.data?.user?.role === 'ADMIN') {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại email hoặc mật khẩu.');
      }
    });
  }

  forgotPassword() {
    alert('Vui lòng liên hệ hotline cskh@giftory.vn để được cấp lại mật khẩu hoặc sử dụng tài khoản mẫu.');
  }
}
