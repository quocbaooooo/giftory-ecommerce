import { Component, Input, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { RecipientService, Recipient, LocationOption } from '../../core/services/recipient.service';

@Component({ selector: 'app-profile-address-book', standalone: true, host: { class: 'block' }, imports: [CommonModule, ReactiveFormsModule], template: `
  <section class="scroll-mt-6 rounded-3xl border border-giftory-border bg-white p-6 shadow-sm md:p-8" [id]="purpose === 'DELIVERY' ? 'delivery-addresses' : 'recipient-addresses'">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-giftory-border/40 pb-4">
      <h3 class="flex items-center gap-2 text-lg font-bold text-giftory-ink"><span class="material-symbols-outlined text-giftory-primary">{{ purpose === 'DELIVERY' ? 'location_on' : 'contacts' }}</span>{{ title }}</h3>
      <button type="button" (click)="openEditor()" [disabled]="busy()" class="rounded-xl bg-[#800020] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{{ purpose === 'DELIVERY' ? '+ Thêm địa chỉ' : '+ Thêm người nhận' }}</button>
    </header>
    <p class="mt-3 text-xs leading-relaxed text-slate-500">{{ purpose === 'DELIVERY' ? 'Các địa chỉ giao cho bạn, đồng bộ với lựa chọn địa chỉ tại checkout. Địa chỉ chính được cập nhật ở phần Thông tin cá nhân.' : 'Lưu người thân, bạn bè để chọn nhanh khi gửi quà trực tiếp. Thêm người nhận ở checkout cũng xuất hiện tại đây.' }}</p>
    @if (purpose === 'DELIVERY' && primaryAddress()) { <div class="mt-4 rounded-2xl border border-[#EADFE3] bg-[#FCF7F9] p-4 text-xs"><strong class="text-[#800020]">Địa chỉ chính trong hồ sơ</strong><p class="mt-2 leading-relaxed text-slate-600">{{ primaryAddress() }}</p></div> }
    @if (loading()) { <p role="status" class="mt-4 text-sm text-slate-500">Đang tải…</p> }
    @if (error()) { <p role="alert" class="mt-4 text-xs text-rose-700">{{ error() }} <button type="button" (click)="load()" class="underline">Tải lại</button></p> }
    @if (notice()) { <p role="status" class="mt-4 text-xs text-emerald-700">{{ notice() }}</p> }
    <div class="mt-4 space-y-3">
      @for (entry of entries(); track entry.id) {
        <article class="rounded-2xl border border-[#EADFE3] p-4 text-sm">
          <div class="flex flex-wrap justify-between gap-3"><strong>{{ entry.name }}</strong><span class="text-xs text-slate-500">{{ entry.phone }}</span></div>
          <p class="mt-2 text-xs leading-relaxed text-slate-500">{{ entry.address }}</p>
          <div class="mt-3 flex items-center gap-4 text-xs font-semibold"><button type="button" (click)="openEditor(entry)" [disabled]="busy()" class="text-[#800020]">Chỉnh sửa</button><button type="button" (click)="deleteId.set(entry.id)" [disabled]="busy()" class="text-rose-600">Xóa</button></div>
          @if (deleteId() === entry.id) { <div class="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-rose-50 p-3 text-xs"><span>Xóa mục này khỏi hồ sơ? Đơn hàng đã đặt vẫn giữ thông tin cũ.</span><button type="button" (click)="remove(entry.id)" [disabled]="busy()" class="font-bold text-rose-700">Xác nhận xóa</button><button type="button" (click)="deleteId.set('')" [disabled]="busy()">Giữ lại</button></div> }
        </article>
      } @empty { @if (!loading() && !error()) { <p class="rounded-2xl border border-dashed p-5 text-center text-xs text-slate-500">{{ purpose === 'DELIVERY' ? 'Chưa có địa chỉ giao hàng bổ sung.' : 'Danh bạ người nhận còn trống.' }}</p> } }
    </div>
    @if (editing()) {
      <form [formGroup]="form" (ngSubmit)="save()" class="mt-5 space-y-4 rounded-2xl border border-[#E8D2DA] bg-[#FCF9FA] p-4 sm:p-5">
        <h4 class="font-bold text-[#42202E]">{{ editingId ? 'Chỉnh sửa' : purpose === 'DELIVERY' ? 'Địa chỉ giao hàng mới' : 'Người nhận mới' }}</h4>
        <fieldset [disabled]="busy()" class="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
          <label class="font-semibold">Họ tên *<input formControlName="name" maxlength="100" class="mt-1 w-full rounded-xl border bg-white px-3 py-3 font-normal" /></label>
          <label class="font-semibold">Số điện thoại *<input formControlName="phone" type="tel" maxlength="20" class="mt-1 w-full rounded-xl border bg-white px-3 py-3 font-normal" /></label>
          <label class="font-semibold">Tỉnh/Thành phố *<select formControlName="provinceCode" (change)="changeProvince(form.get('provinceCode')!.value || '')" class="mt-1 w-full rounded-xl border bg-white px-3 py-3 font-normal"><option value="">{{ provincesLoading() ? 'Đang tải…' : 'Chọn tỉnh/thành phố' }}</option>@for (p of provinces(); track p.code) { <option [value]="p.code">{{ p.name }}</option> }</select></label>
          <label class="font-semibold">Phường/Xã *<select formControlName="wardCode" class="mt-1 w-full rounded-xl border bg-white px-3 py-3 font-normal"><option value="">{{ wardsLoading() ? 'Đang tải…' : 'Chọn phường/xã' }}</option>@for (w of wards(); track w.code) { <option [value]="w.code">{{ w.name }}</option> }</select></label>
          <label class="font-semibold sm:col-span-2">Số nhà, tên đường *<input formControlName="street" maxlength="200" class="mt-1 w-full rounded-xl border bg-white px-3 py-3 font-normal" /></label>
        </fieldset>
        @if (locationError()) { <p role="alert" class="text-xs text-rose-700">{{ locationError() }} <button type="button" (click)="retryLocations()" class="underline">Thử lại</button></p> }
        @if (editorError()) { <p role="alert" class="text-xs text-rose-700">{{ editorError() }}</p> }
        <div class="flex gap-3"><button type="submit" [disabled]="busy() || form.invalid || !form.get('wardCode')!.value || provincesLoading() || wardsLoading() || !!locationError()" class="rounded-xl bg-[#800020] px-5 py-3 text-xs font-bold text-white disabled:opacity-50">{{ busy() ? 'Đang lưu…' : 'Lưu vào hồ sơ' }}</button><button type="button" (click)="closeEditor()" [disabled]="busy()" class="rounded-xl border bg-white px-4 py-3 text-xs font-semibold">Hủy</button></div>
      </form>
    }
  </section>
` })
export class ProfileAddressBookComponent implements OnInit, OnDestroy {
  @Input() purpose: 'DELIVERY' | 'RECIPIENT' = 'RECIPIENT';
  private service = inject(RecipientService); private auth = inject(AuthService); private fb = inject(FormBuilder);
  private subscriptions = new Subscription(); private wardRequest?: Subscription;
  all = signal<Recipient[]>([]); loading = signal(false); busy = signal(false); error = signal(''); notice = signal('');
  editing = signal(false); editingId = ''; deleteId = signal(''); editorError = signal(''); locationError = signal('');
  provinces = signal<LocationOption[]>([]); wards = signal<LocationOption[]>([]); provincesLoading = signal(false); wardsLoading = signal(false);
  entries = computed(() => this.all().filter(entry => (entry.purpose || 'RECIPIENT') === this.purpose));
  primaryAddress = computed(() => { const a = this.auth.currentUser()?.address; return a ? [a.detailAddress || a.street, a.ward, a.district, a.city].filter(Boolean).join(', ') : ''; });
  get title() { return this.purpose === 'DELIVERY' ? 'Địa chỉ giao hàng' : 'Danh bạ người nhận'; }
  form = this.fb.group({ name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]], phone: ['', [Validators.required]], provinceCode: ['', Validators.required], wardCode: [{value:'', disabled:true}, Validators.required], street: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]] });
  ngOnInit() { this.load(); this.loadProvinces(); }
  load() { this.loading.set(true); this.error.set(''); this.subscriptions.add(this.service.list().subscribe({ next: list => { this.all.set(list); this.loading.set(false); }, error: () => { this.loading.set(false); this.error.set('Không tải được dữ liệu trong hồ sơ.'); } })); }
  loadProvinces() { this.provincesLoading.set(true); this.locationError.set(''); this.subscriptions.add(this.service.provinces().subscribe({ next: list => { this.provinces.set(list); this.provincesLoading.set(false); }, error: () => { this.provincesLoading.set(false); this.locationError.set('Không tải được tỉnh/thành phố.'); } })); }
  openEditor(entry?: Recipient) {
    if (this.busy()) return;
    this.wardRequest?.unsubscribe(); this.deleteId.set(''); this.editorError.set(''); this.notice.set(''); this.editingId = entry?.id || ''; this.editing.set(true);
    const u = this.auth.currentUser();
    this.form.reset({name: entry?.name || (this.purpose === 'DELIVERY' ? u?.fullName || u?.name || '' : ''), phone: entry?.phone || (this.purpose === 'DELIVERY' ? u?.phone || '' : ''), provinceCode: entry?.provinceCode || '', wardCode: '', street: entry?.street || ''});
    this.changeProvince(entry?.provinceCode || '', entry?.wardCode || '');
    if (!this.provinces().length && !this.provincesLoading()) this.loadProvinces();
  }
  closeEditor() { if (this.busy()) return; this.wardRequest?.unsubscribe(); this.editing.set(false); }
  changeProvince(code: string, selected = '') {
    this.wardRequest?.unsubscribe(); this.wards.set([]); this.form.get('wardCode')!.reset(''); this.form.get('wardCode')!.disable(); this.wardsLoading.set(false);
    if (!code) return;
    this.locationError.set(''); this.wardsLoading.set(true);
    this.wardRequest = this.service.wards(code).subscribe({ next: list => { this.wards.set(list); this.wardsLoading.set(false); this.form.get('wardCode')!.enable(); this.form.patchValue({wardCode:list.some(w => w.code === selected) ? selected : ''}); }, error: () => { this.wardsLoading.set(false); this.locationError.set('Không tải được phường/xã.'); } });
  }
  retryLocations() { if (!this.provinces().length) this.loadProvinces(); else this.changeProvince(this.form.get('provinceCode')!.value || ''); }
  save() {
    if (this.busy() || this.form.invalid || this.provincesLoading() || this.wardsLoading() || this.locationError()) return;
    const v = this.form.getRawValue(), phone = (v.phone || '').replace(/[\s().-]/g,'').replace(/^\+?84/,'0');
    if (!/^0\d{9}$/.test(phone) || !v.wardCode || (v.name || '').trim().length < 2 || (v.street || '').trim().length < 3) { this.editorError.set('Nhập đủ họ tên, số điện thoại 10 số và địa chỉ hợp lệ.'); return; }
    const input = {purpose:this.purpose, name:v.name!.trim(), phone, provinceCode:v.provinceCode!, wardCode:v.wardCode, street:v.street!.trim()};
    this.busy.set(true); this.editorError.set('');
    this.subscriptions.add((this.editingId ? this.service.update(this.editingId,input) : this.service.save(input)).subscribe({ next: list => { this.all.set(list); this.busy.set(false); this.editing.set(false); this.notice.set('Đã lưu vào hồ sơ. Bạn có thể chọn tại checkout.'); }, error: err => { this.busy.set(false); this.editorError.set(typeof err.error?.message === 'string' ? err.error.message : 'Không lưu được, vui lòng thử lại.'); } }));
  }
  remove(id: string) { if (this.busy()) return; this.busy.set(true); this.error.set(''); this.subscriptions.add(this.service.remove(id).subscribe({ next: list => { this.all.set(list); this.busy.set(false); this.deleteId.set(''); if (this.editingId === id) this.editing.set(false); this.notice.set('Đã xóa khỏi hồ sơ.'); }, error: () => { this.busy.set(false); this.error.set('Không xóa được mục này.'); } })); }
  ngOnDestroy() { this.subscriptions.unsubscribe(); this.wardRequest?.unsubscribe(); }
}
