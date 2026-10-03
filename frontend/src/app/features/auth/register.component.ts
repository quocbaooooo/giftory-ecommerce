import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
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
          <h2 class="text-xl font-bold text-giftory-ink">Đăng Ký Hội Viên Mới</h2>
          <p class="text-xs text-giftory-ink/60">Gia nhập cộng đồng Giftory để nhận ngay 100 điểm thưởng đầu tiên</p>
        </div>

        <!-- Error Alert -->
        <div *ngIf="errorMessage()" class="p-3 rounded-xl bg-giftory-sale/10 border border-giftory-sale/20 text-xs font-medium text-giftory-sale animate-fade-in">
          {{ errorMessage() }}
        </div>

        <!-- Register Form -->
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-giftory-ink">Họ và tên *</label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-giftory-ink/40 text-lg">person</span>
              <input
                type="text"
                formControlName="fullName"
                placeholder="Nguyễn Văn A"
                class="w-full pl-9 pr-4 py-2.5 bg-giftory-canvas rounded-xl border border-giftory-border focus:outline-none focus:border-giftory-primary text-sm font-medium"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-bold text-giftory-ink">Số điện thoại *</label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-giftory-ink/40 text-lg">call</span>
              <input
                type="text"
                formControlName="phone"
                placeholder="0901234567"
                class="w-full pl-9 pr-4 py-2.5 bg-giftory-canvas rounded-xl border border-giftory-border focus:outline-none focus:border-giftory-primary text-sm font-medium"
              />
            </div>
          </div>

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
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-bold text-giftory-ink">Mật khẩu *</label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-giftory-ink/40 text-lg">lock</span>
              <input
                type="password"
                formControlName="password"
                placeholder="Tối thiểu 6 ký tự"
                class="w-full pl-9 pr-4 py-2.5 bg-giftory-canvas rounded-xl border border-giftory-border focus:outline-none focus:border-giftory-primary text-sm font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            [disabled]="registerForm.invalid || isLoading()"
            class="w-full py-3 bg-giftory-primary hover:bg-giftory-primary-dark disabled:bg-gray-300 text-white text-sm font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2 mt-4"
          >
            <span *ngIf="isLoading()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Tạo Tài Khoản & Nhận Quà
          </button>
        </form>

        <div class="text-center pt-2 border-t border-giftory-border/60">
          <p class="text-xs text-giftory-ink/70">
            Đã có tài khoản?
            <a routerLink="/login" class="text-giftory-primary font-bold hover:underline ml-1">Đăng nhập ngay</a>
          </p>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  registerForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required]],
    phone: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit() {
    if (this.registerForm.invalid) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password, fullName, phone } = this.registerForm.value;
    this.authService.register(email, password, fullName, phone).subscribe({
      next: () => {
        this.isLoading.set(false);
        alert('Đăng ký tài khoản thành công! Bạn nhận được 100 điểm thưởng chào mừng.');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Đăng ký thất bại. Email có thể đã được sử dụng.');
      }
    });
  }
}
