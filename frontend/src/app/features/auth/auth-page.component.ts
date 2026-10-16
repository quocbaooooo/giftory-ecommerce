import { Component, OnInit, OnDestroy, ElementRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, Subscription, finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { passwordPolicy, passwordsMatch, safeReturnUrl } from './auth.utils';

export type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

@Component({
  standalone: true,
  selector: 'app-auth-page',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.css',
})
export class AuthPageComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private element = inject(ElementRef);

  mode: AuthMode = this.route.snapshot.data['authMode'] || 'login';
  busy = signal(false);
  showPassword = signal(false);
  showConfirm = signal(false);
  error = signal('');
  success = signal('');
  submitted = signal(false);
  rememberMe = signal(true);
  ssoNotice = signal('');

  private request?: Subscription;
  private routeSub?: Subscription;
  private resetToken = '';

  returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '';
  linkParams = this.returnUrl ? { returnUrl: safeReturnUrl(this.returnUrl, true) } : {};
  expired = this.route.snapshot.queryParamMap.get('reason') === 'expired';
  adminNotice = this.route.snapshot.queryParamMap.get('error') === 'admin_only';

  form = this.fb.nonNullable.group({
    name: [''],
    phone: [''],
    email: [''],
    password: [''],
    confirmPassword: [''],
    agreeTerms: [true],
  });

  get isRegister() {
    return this.mode === 'register';
  }

  get hasPassword() {
    return ['login', 'register', 'reset'].includes(this.mode);
  }

  get title() {
    return {
      login: 'Đăng Nhập Tài Khoản',
      register: 'Bắt Đầu Cùng Giftory',
      forgot: 'Quên Mật Khẩu?',
      reset: 'Thiết Lập Mật Khẩu Mới',
    }[this.mode];
  }

  get subtitle() {
    return {
      login: 'Đăng nhập để theo dõi quà tặng và đồng bộ bản thiết kế riêng.',
      register: 'Đăng ký ngay để nhận 50 điểm thưởng và lưu trữ thiết kế vĩnh viễn.',
      forgot: 'Nhập email đã đăng ký để nhận liên kết khôi phục mật khẩu.',
      reset: 'Nhập mật khẩu mới an toàn cho tài khoản của bạn.',
    }[this.mode];
  }

  get submitLabel() {
    return {
      login: 'Đăng Nhập Ngay',
      register: 'Tạo Tài Khoản & Nhận 50 Điểm',
      forgot: 'Gửi Liên Kết Đặt Lại',
      reset: 'Lưu Mật Khẩu Mới',
    }[this.mode];
  }

  ngOnInit() {
    if (this.auth.isAuthenticated() && ['login', 'register'].includes(this.mode)) {
      void this.router.navigateByUrl(safeReturnUrl(this.returnUrl, this.auth.isAdmin()));
      return;
    }

    const savedEmail = localStorage.getItem('giftory_remembered_email');
    if (savedEmail) {
      this.form.controls.email.setValue(savedEmail);
      this.rememberMe.set(true);
    }

    this.applyValidators();

    this.routeSub = this.route.data.subscribe(data => {
      const routeMode = data['authMode'] as AuthMode;
      if (routeMode && routeMode !== this.mode) {
        this.mode = routeMode;
        this.error.set('');
        this.success.set('');
        this.submitted.set(false);
        this.applyValidators();
      }
    });

    if (this.mode === 'reset') {
      this.resetToken = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
      if (!/^[a-f0-9]{64}$/.test(this.resetToken)) {
        this.error.set('Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.');
      }
    }
  }

  ngOnDestroy() {
    this.request?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  switchAuthTab(tab: 'login' | 'register') {
    if (this.mode === tab) return;
    this.mode = tab;
    this.error.set('');
    this.success.set('');
    this.submitted.set(false);
    this.applyValidators();
    const targetUrl = tab === 'login' ? '/login' : '/register';
    void this.router.navigate([targetUrl], {
      queryParams: this.linkParams,
      replaceUrl: true,
    });
  }

  setMode(newMode: AuthMode) {
    this.mode = newMode;
    this.error.set('');
    this.success.set('');
    this.submitted.set(false);
    this.applyValidators();
    const targetPath = newMode === 'forgot' ? '/forgot-password' : newMode === 'reset' ? '/reset-password' : `/${newMode}`;
    void this.router.navigate([targetPath], {
      queryParams: this.linkParams,
      replaceUrl: true,
    });
  }

  applyValidators() {
    this.form.controls.email.clearValidators();
    this.form.controls.password.clearValidators();
    this.form.controls.name.clearValidators();
    this.form.controls.phone.clearValidators();
    this.form.controls.confirmPassword.clearValidators();
    this.form.clearValidators();

    if (this.mode !== 'reset') {
      this.form.controls.email.setValidators([Validators.required, Validators.email, Validators.maxLength(254)]);
    }

    if (this.hasPassword) {
      this.form.controls.password.setValidators(
        this.mode === 'login' ? [Validators.required, Validators.maxLength(256)] : [Validators.required, passwordPolicy]
      );
    }

    if (this.isRegister) {
      this.form.controls.name.setValidators([Validators.required, Validators.minLength(2), Validators.maxLength(80)]);
      this.form.controls.phone.setValidators([Validators.pattern(/^(?:0[35789]\d{8})?$/)]);
      this.form.controls.confirmPassword.setValidators([Validators.required]);
      this.form.setValidators(passwordsMatch);
    } else if (this.mode === 'reset') {
      this.form.controls.confirmPassword.setValidators([Validators.required]);
      this.form.setValidators(passwordsMatch);
    }

    Object.values(this.form.controls).forEach(control => control.updateValueAndValidity());
    this.form.updateValueAndValidity();
  }

  invalid(field: keyof typeof this.form.controls) {
    const c = this.form.controls[field];
    return c.invalid && (c.touched || this.submitted());
  }

  mismatch() {
    return (this.submitted() || this.form.controls.confirmPassword.touched) && this.form.hasError('passwordMismatch');
  }

  normalize(field: 'email' | 'phone' | 'name') {
    const c = this.form.controls[field];
    c.setValue(
      field === 'email'
        ? c.value.trim().toLowerCase()
        : field === 'phone'
        ? c.value.replace(/[\s().-]/g, '').replace(/^\+84/, '0')
        : c.value.trim().replace(/\s+/g, ' ')
    );
  }

  onSocialLogin(provider: 'Google' | 'Facebook') {
    this.ssoNotice.set(`Đang chuyển hướng kết nối an toàn với ${provider}...`);
    setTimeout(() => {
      this.ssoNotice.set('');
    }, 4000);
  }

  guestCheckout() {
    const dest = this.returnUrl ? safeReturnUrl(this.returnUrl, false) : '/products';
    void this.router.navigateByUrl(dest);
  }

  onSubmit() {
    if (this.busy()) return;
    this.normalize('email');
    this.normalize('name');
    this.normalize('phone');
    this.submitted.set(true);
    this.error.set('');
    this.ssoNotice.set('');

    if (this.isRegister && !this.form.controls.agreeTerms.value) {
      this.error.set('Vui lòng đồng ý với Điều khoản sử dụng và Chính sách hội viên để tiếp tục.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      setTimeout(() => this.element.nativeElement.querySelector('input[aria-invalid="true"]')?.focus());
      return;
    }

    if (this.mode === 'reset' && !/^[a-f0-9]{64}$/.test(this.resetToken)) {
      this.error.set('Liên kết không hợp lệ. Vui lòng yêu cầu liên kết mới.');
      return;
    }

    const { name, phone, email, password } = this.form.getRawValue();

    if (this.mode === 'login') {
      if (this.rememberMe()) {
        localStorage.setItem('giftory_remembered_email', email);
      } else {
        localStorage.removeItem('giftory_remembered_email');
      }
    }

    this.busy.set(true);
    const action: Observable<any> =
      this.mode === 'login'
        ? this.auth.login(email, password)
        : this.isRegister
        ? this.auth.register({ name, phone, email, password })
        : this.mode === 'forgot'
        ? this.auth.forgotPassword(email)
        : this.auth.resetPassword(this.resetToken, password);

    this.request = action.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: (result: any) => {
        if (this.mode === 'login' || this.isRegister) {
          void this.router.navigateByUrl(safeReturnUrl(this.returnUrl, this.auth.isAdmin()));
        } else {
          this.success.set(result.message);
          if (this.mode === 'reset') {
            this.auth.clearSession();
            this.form.reset();
            this.resetToken = '';
            history.replaceState(history.state, '', location.pathname);
          }
        }
      },
      error: (err: any) => {
        const value = err.error?.message;
        this.error.set(
          err.status === 0
            ? 'Không thể kết nối máy chủ. Kiểm tra kết nối mạng rồi thử lại.'
            : (Array.isArray(value) ? value.join(' ') : value) || 'Chưa thể thực hiện lúc này. Vui lòng thử lại.'
        );
        setTimeout(() => this.element.nativeElement.querySelector('#auth-error')?.focus());
      },
    });
  }
}
