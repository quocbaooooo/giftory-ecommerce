import { Component, OnInit, OnDestroy, ElementRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, Subscription, finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { passwordPolicy, passwordsMatch, safeReturnUrl } from './auth.utils';
type AuthMode = 'login' | 'register' | 'forgot' | 'reset';
@Component({
  standalone: true, selector: 'app-auth-page', imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './auth-page.component.html', styleUrl: './auth-page.component.css',
})
export class AuthPageComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService); private fb = inject(FormBuilder); private router = inject(Router); private route = inject(ActivatedRoute); private element = inject(ElementRef);
  mode: AuthMode = this.route.snapshot.data['authMode'] || 'login';
  busy = signal(false); showPassword = signal(false); showConfirm = signal(false); error = signal(''); success = signal(''); submitted = signal(false);
  private request?: Subscription; private resetToken = '';
  returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '';
  linkParams = this.returnUrl ? { returnUrl: safeReturnUrl(this.returnUrl, true) } : {};
  expired = this.route.snapshot.queryParamMap.get('reason') === 'expired';
  adminNotice = this.route.snapshot.queryParamMap.get('error') === 'admin_only';
  form = this.fb.nonNullable.group({ name: [''], phone: [''], email: [''], password: [''], confirmPassword: [''] });
  get isRegister() { return this.mode === 'register'; }
  get hasPassword() { return ['login', 'register', 'reset'].includes(this.mode); }
  get title() { return { login: 'Thật vui khi gặp lại bạn.', register: 'Bắt đầu câu chuyện của bạn.', forgot: 'Bạn quên mật khẩu?', reset: 'Đặt mật khẩu mới.' }[this.mode]; }
  get subtitle() { return { login: 'Đăng nhập để tiếp tục chọn quà và theo dõi đơn hàng.', register: 'Tạo tài khoản để lưu những món quà yêu thích và nhận điểm thưởng.', forgot: 'Nhập email đã đăng ký. Chúng mình sẽ gửi liên kết giúp bạn đặt lại mật khẩu.', reset: 'Chọn mật khẩu mới cho tài khoản Giftory của bạn.' }[this.mode]; }
  get submitLabel() { return { login: 'Đăng nhập', register: 'Tạo tài khoản', forgot: 'Gửi liên kết đặt lại', reset: 'Lưu mật khẩu mới' }[this.mode]; }
  ngOnInit() {
    if (this.auth.isAuthenticated() && ['login', 'register'].includes(this.mode)) { void this.router.navigateByUrl(safeReturnUrl(this.returnUrl, this.auth.isAdmin())); return; }
    if (this.mode !== 'reset') this.form.controls.email.setValidators([Validators.required, Validators.email, Validators.maxLength(254)]);
    if (this.hasPassword) this.form.controls.password.setValidators(this.mode === 'login' ? [Validators.required, Validators.maxLength(256)] : [Validators.required, passwordPolicy]);
    if (this.isRegister) {
      this.form.controls.name.setValidators([Validators.required, Validators.minLength(2), Validators.maxLength(80)]);
      this.form.controls.phone.setValidators([Validators.pattern(/^(?:0[35789]\d{8})?$/)]);
    }
    if (this.isRegister || this.mode === 'reset') { this.form.controls.confirmPassword.setValidators([Validators.required]); this.form.setValidators(passwordsMatch); }
    Object.values(this.form.controls).forEach(control => control.updateValueAndValidity());
    if (this.mode === 'reset') {
      this.resetToken = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
      if (!/^[a-f0-9]{64}$/.test(this.resetToken)) this.error.set('Liên kết không hợp lệ. Vui lòng yêu cầu liên kết đặt lại mật khẩu mới.');
    }
  }
  ngOnDestroy() { this.request?.unsubscribe(); }
  invalid(field: keyof typeof this.form.controls) { const c = this.form.controls[field]; return c.invalid && (c.touched || this.submitted()); }
  mismatch() { return (this.submitted() || this.form.controls.confirmPassword.touched) && this.form.hasError('passwordMismatch'); }
  normalize(field: 'email' | 'phone' | 'name') {
    const c = this.form.controls[field];
    c.setValue(field === 'email' ? c.value.trim().toLowerCase() : field === 'phone' ? c.value.replace(/[\s().-]/g, '').replace(/^\+84/, '0') : c.value.trim().replace(/\s+/g, ' '));
  }
  onSubmit() {
    if (this.busy()) return;
    this.normalize('email'); this.normalize('name'); this.normalize('phone'); this.submitted.set(true); this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      setTimeout(() => this.element.nativeElement.querySelector('input[aria-invalid="true"]')?.focus()); return;
    }
    if (this.mode === 'reset' && !/^[a-f0-9]{64}$/.test(this.resetToken)) { this.error.set('Liên kết không hợp lệ. Vui lòng yêu cầu liên kết mới.'); return; }
    const { name, phone, email, password } = this.form.getRawValue();
    this.busy.set(true);
    const action: Observable<any> = this.mode === 'login' ? this.auth.login(email, password)
      : this.isRegister ? this.auth.register({ name, phone, email, password })
      : this.mode === 'forgot' ? this.auth.forgotPassword(email) : this.auth.resetPassword(this.resetToken, password);
    this.request = action.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: (result: any) => {
        if (this.mode === 'login' || this.isRegister) { void this.router.navigateByUrl(safeReturnUrl(this.returnUrl, this.auth.isAdmin())); }
        else {
          this.success.set(result.message);
          if (this.mode === 'reset') { this.auth.clearSession(); this.form.reset(); this.resetToken = ''; history.replaceState(history.state, '', location.pathname); }
        }
      },
      error: (err: any) => {
        const value = err.error?.message;
        this.error.set(err.status === 0 ? 'Không thể kết nối máy chủ. Kiểm tra kết nối mạng rồi thử lại.' : (Array.isArray(value) ? value.join(' ') : value) || 'Chưa thể thực hiện lúc này. Vui lòng thử lại.');
        setTimeout(() => this.element.nativeElement.querySelector('#auth-error')?.focus());
      },
    });
  }
}
