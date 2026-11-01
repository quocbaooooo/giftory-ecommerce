import { Component, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { CartService } from '../../core/services/cart.service';
import { CartItem, GiftPackaging } from '../../core/models';

interface GiftBox {
  id: string;
  name: string;
  image: string;
  fee: number;
  size: 'S' | 'M' | 'L';
  capacity: number;
  dimensions: string;
  available: boolean;
  shortDescription: string;
}
interface Row {
  selected: boolean;
  quantity: number;
  boxStyle: string;
}
const RANK: Record<string, number> = {
  SMALL: 1,
  MEDIUM: 2,
  LARGE: 3,
  OVERSIZED: 4,
  S: 1,
  M: 2,
  L: 3,
};
const UNITS: Record<string, number> = { SMALL: 1, MEDIUM: 3, LARGE: 6, OVERSIZED: 0 };
const OVERSIZED =
  'Sản phẩm này có kích thước đặc thù, đã được đóng gói chuyên dụng và không áp dụng hộp quà nắp gập.';

@Component({
  selector: 'app-cart-packaging',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section aria-label="Đóng gói quà tặng" class="overflow-hidden rounded-3xl border border-[#E8D7DD] bg-[#FAF7F2] shadow-sm">
          <header
            class="border-b border-[#ECE2E4] bg-white p-5 sm:px-7"
          >
            <div>
              <p class="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#A77888]">
                Giftory · Gói ghém yêu thương
              </p>
              <h2 class="text-lg font-extrabold leading-snug text-[#42202E]">
                Bạn muốn gói những món này làm quà tặng?
              </h2>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-2" role="group" aria-label="Có đóng gói quà tặng không?">
              <button type="button" (click)="choosePackaging(false)" [attr.aria-pressed]="!enabled()"
                [disabled]="saving() || cart.packagingSyncPending() || cart.quantitySyncPending()"
                class="rounded-xl border px-3 py-3 text-left text-xs font-semibold disabled:opacity-50"
                [class.border-[#800020]]="!enabled()" [class.bg-[#FCF2F5]]="!enabled()"
                [class.text-[#800020]]="!enabled()" [class.border-[#E7DBDF]]="enabled()">
                Không đóng gói
                <span class="mt-1 block text-[10px] font-normal text-slate-500">Giữ bao bì tiêu chuẩn · Miễn phí</span>
              </button>
              <button type="button" (click)="choosePackaging(true)" [attr.aria-pressed]="enabled()"
                [disabled]="saving() || cart.packagingSyncPending() || cart.quantitySyncPending()"
                class="rounded-xl border px-3 py-3 text-left text-xs font-semibold disabled:opacity-50"
                [class.border-[#800020]]="enabled()" [class.bg-[#FCF2F5]]="enabled()"
                [class.text-[#800020]]="enabled()" [class.border-[#E7DBDF]]="!enabled()">
                Đóng gói quà tặng
                <span class="mt-1 block text-[10px] font-normal text-slate-500">Chọn cách gói và mẫu hộp bên dưới</span>
              </button>
            </div>
          </header>
          @if (error()) {
            <p role="alert" class="mx-5 my-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-800">{{ error() }}</p>
          }
          @if (!enabled() && oversizedItems().length) {
            <p class="p-5 text-xs leading-relaxed text-[#765965]">{{ oversizedNotice }}</p>
          }
          @if (enabled()) {
          <div class="p-4 sm:p-6">
            <fieldset [disabled]="saving() || cart.packagingSyncPending() || cart.quantitySyncPending()" class="min-w-0"><legend class="sr-only">Cách đóng gói</legend>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="Cách đóng gói">
              @for (choice of modes; track choice.id) {
                <button
                  type="button"
                  (click)="setMode(choice.id)"
                  [attr.aria-pressed]="mode() === choice.id"
                  class="rounded-2xl border bg-white p-3 text-left"
                  [class.border-[#800020]]="mode() === choice.id"
                  [class.ring-1]="mode() === choice.id"
                  [class.ring-[#800020]]="mode() === choice.id"
                  [class.border-[#E7DBDF]]="mode() !== choice.id"
                >
                  <span class="material-symbols-outlined mb-2 text-[#800020]" aria-hidden="true">{{
                    choice.icon
                  }}</span
                  ><strong class="block text-xs text-[#42202E]">{{ choice.title }}</strong
                  ><span class="mt-1 block text-[10px] leading-relaxed text-[#90747E]">{{
                    choice.description
                  }}</span>
                </button>
              }
            </div>
            @if (loading()) {
              <p role="status" class="py-10 text-center text-sm text-slate-500">
                Đang tải mẫu hộp…
              </p>
            } @else {
              @if (oversizedItems().length) {
                <div class="mt-4 rounded-xl border border-[#E5DEE0] bg-white p-3">
                  <p class="text-xs font-bold text-[#765965]">
                    Đóng gói chuyên dụng · {{ oversizedItems().length }} sản phẩm
                  </p>
                  <p class="mt-1 text-xs leading-relaxed text-slate-500">{{ oversizedNotice }}</p>
                  @for (special of oversizedItems(); track special._id) {
                    <p class="mt-1 text-[11px] font-semibold text-[#765965]">
                      {{ special.productId?.name }} × {{ special.quantity }}
                    </p>
                  }
                </div>
              }
              @if (mode() === 'BUNDLED') {
                <div class="mb-3 mt-6 flex items-center justify-between gap-3">
                  <h3 class="text-sm font-bold text-[#42202E]">
                    Một hộp cho những món quà của bạn
                  </h3>
                  <span class="text-[10px] text-slate-500"
                    >{{ bundleUnits() }} đơn vị dung tích</span
                  >
                </div>
                <p class="mb-4 text-xs leading-relaxed text-slate-500">
                  Xem tất cả mẫu hộp bên dưới. Hộp không vừa sẽ được đánh dấu; phí tính một lần cho cả hộp.
                </p>
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  @for (box of catalogBoxes(); track box.id) {
                    <button
                      type="button"
                      (click)="chooseBundle(box.id)"
                      [disabled]="!!boxIssue(box)"
                      [attr.aria-pressed]="bundleStyle() === box.id"
                      class="overflow-hidden rounded-2xl border bg-white p-2 text-left disabled:cursor-not-allowed"
                      [class.border-[#800020]]="bundleStyle() === box.id"
                      [class.ring-1]="bundleStyle() === box.id"
                      [class.ring-[#800020]]="bundleStyle() === box.id"
                      [class.border-[#E7DBDF]]="bundleStyle() !== box.id"
                    >
                      <img
                        [src]="box.image"
                        [alt]="box.name"
                        class="h-28 w-full rounded-xl bg-[#FAF7F2] object-contain p-2"
                      /><span class="mt-2 block text-[10px] text-[#967581]"
                        >Size {{ box.size }} · {{ box.dimensions }}</span
                      ><strong class="mt-1 block text-xs text-[#42202E]">{{ box.name }}</strong
                      ><span class="mt-1 block text-xs font-bold text-[#800020]"
                        >{{ box.fee | number }}đ / hộp</span
                      >
                      @if (boxIssue(box)) {
                        <span class="mt-2 block text-[10px] leading-relaxed text-slate-500">{{ boxIssue(box) }}</span>
                      } @else if (box.id === bundleBoxes()[0]?.id) {
                        <span
                          class="mt-2 inline-block rounded-full bg-[#F5E7EC] px-2 py-1 text-[9px] font-bold text-[#800020]"
                          >Gợi ý vừa vặn nhất</span
                        >
                      }
                    </button>
                  } @empty {
                    <p class="col-span-full text-xs text-slate-500">Chưa có mẫu hộp quà.</p>
                  }
                </div>
                @if (!bundleBoxes().length) {
                  <p class="mt-3 rounded-xl border border-dashed border-[#D9C4CC] p-3 text-xs text-slate-500">Chưa có hộp đủ lớn cho các món này. Bạn có thể chọn đóng riêng từng hộp hoặc chỉ đóng gói một phần.</p>
                }
              } @else {
                <h3 class="mb-3 mt-6 text-sm font-bold text-[#42202E]">
                  {{
                    mode() === 'PARTIAL'
                      ? 'Chọn những món cần đóng hộp'
                      : 'Mỗi món một hộp quà riêng'
                  }}
                </h3>
                <p class="mb-4 text-xs leading-relaxed text-slate-500">
                  {{
                    mode() === 'PARTIAL'
                      ? 'Các món không chọn được giữ nguyên bao bì tiêu chuẩn của sản phẩm, không tính phí hộp quà.'
                      : 'Mỗi đơn vị sản phẩm được đóng trong một hộp riêng. Xem tất cả mẫu hộp và chọn mẫu vừa món đó.'
                  }}
                </p>
                <div class="space-y-3">
                  @for (item of eligibleItems(); track item._id) {
                    <div class="rounded-2xl border border-[#E7DBDF] bg-white p-3">
                      <div class="flex items-center gap-3">
                        @if (mode() === 'PARTIAL') {
                          <input
                            type="checkbox"
                            [attr.aria-label]="'Đóng hộp ' + item.productId?.name"
                            [ngModel]="row(item).selected"
                            (ngModelChange)="updateRow(item, { selected: $event })"
                            class="h-4 w-4 shrink-0 accent-[#800020]"
                          />
                        }
                        <img
                          [src]="item.image || item.productId?.images?.[0]"
                          alt=""
                          class="h-12 w-12 shrink-0 rounded-xl object-cover"
                        />
                        <div class="min-w-0">
                          <strong class="line-clamp-2 text-xs text-[#42202E]">{{
                            item.productId?.name
                          }}</strong>
                          <p class="mt-1 text-[10px] text-slate-500">
                            {{ item.variantName }} · {{ item.quantity }} món · {{ sizeName(item) }}
                          </p>
                        </div>
                      </div>
                      @if (row(item).selected) {
                        <div class="mt-3 flex flex-wrap items-end gap-3">
                          <div class="w-full">
                            <p class="mb-2 text-[10px] text-slate-500">Chọn mẫu hộp</p>
                            <div class="grid grid-cols-2 gap-2">
                              @for (box of catalogBoxes(); track box.id) {
                                <button type="button" (click)="updateRow(item, { boxStyle: box.id })"
                                  [disabled]="!!boxIssue(box, item)" [attr.aria-pressed]="row(item).boxStyle === box.id"
                                  [attr.aria-label]="box.name + ' cho ' + item.productId?.name"
                                  class="rounded-xl border bg-white p-2 text-left disabled:cursor-not-allowed"
                                  [class.border-[#800020]]="row(item).boxStyle === box.id"
                                  [class.ring-1]="row(item).boxStyle === box.id"
                                  [class.ring-[#800020]]="row(item).boxStyle === box.id"
                                  [class.border-[#E7DBDF]]="row(item).boxStyle !== box.id">
                                  <img [src]="box.image" [alt]="box.name" class="h-20 w-full rounded-lg bg-[#FAF7F2] object-contain p-1" />
                                  <span class="mt-2 block text-[10px] text-[#967581]">Size {{ box.size }} · {{ box.dimensions }}</span>
                                  <strong class="mt-1 block text-xs text-[#42202E]">{{ box.name }}</strong>
                                  <span class="mt-1 block text-xs font-bold text-[#800020]">{{ box.fee | number }}đ / hộp</span>
                                  @if (boxIssue(box, item)) {
                                    <span class="mt-2 block text-[10px] leading-relaxed text-slate-500">{{ boxIssue(box, item) }}</span>
                                  }
                                </button>
                              }
                            </div>
                          </div>
                          @if (mode() === 'PARTIAL' && item.quantity > 1) {
                            <label class="text-[10px] text-slate-500"
                              >Số món đóng hộp<input
                                type="number"
                                min="1"
                                [max]="item.quantity"
                                [ngModel]="row(item).quantity"
                                (ngModelChange)="updateRow(item, { quantity: $event })"
                                [attr.aria-label]="'Số món đóng hộp ' + item.productId?.name"
                                class="mt-1 block w-20 rounded-xl border border-[#E1D2D8] p-2.5 text-xs"
                            /></label>
                          }
                        </div>
                        @if (!fits(item).length) {
                          <p class="mt-2 text-xs text-rose-700">
                            Chưa có hộp vừa món này. Vui lòng bỏ chọn hoặc liên hệ Giftory.
                          </p>
                        }
                      }
                    </div>
                  }
                </div>
              }
              <p class="mt-5 text-[10px] leading-relaxed text-[#99818A]">
                Kích thước và dung tích được đối chiếu tự động theo cấu hình đóng gói của kho.
              </p>
            }
            </fieldset>
            @if (cart.cart()?.packaging?.valid === false) {
              <p role="alert" class="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-800">{{ cart.cart()?.packaging?.notice }}</p>
            }
          </div>
          <footer class="border-t border-[#ECE2E4] bg-white p-4 sm:px-7">
            <p role="status" aria-live="polite" class="mb-3 text-xs text-[#765965]">{{ saving() ? 'Đang cập nhật phí hộp quà…' : 'Phí hộp quà được tự động cập nhật vào tổng đơn hàng.' }}</p>
            <div class="mb-3 flex items-center justify-between">
              <span class="text-xs text-slate-500"
                >{{ draftBoxCount() }} hộp quà · Phí đóng gói</span
              ><strong class="text-xl text-[#800020]">{{ draftFee() | number }}đ</strong>
            </div>
          </footer>
          }
    </section>
  `,
})
export class CartPackagingComponent implements OnInit {
  cart = inject(CartService);
  private api = inject(ApiService);
  enabled = signal(false);
  mode = signal<'BUNDLED' | 'INDIVIDUAL' | 'PARTIAL'>('BUNDLED');
  boxes = signal<GiftBox[]>([]);
  rows = signal<Record<string, Row>>({});
  bundleStyle = signal('');
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  private fingerprint = '';
  oversizedNotice = OVERSIZED;
  modes = [
    {
      id: 'BUNDLED' as const,
      title: 'Gộp chung 1 hộp',
      description: 'Cùng một hộp, trọn vẹn yêu thương',
      icon: 'inventory_2',
    },
    {
      id: 'INDIVIDUAL' as const,
      title: 'Đóng riêng từng hộp',
      description: 'Mỗi món một hộp, dễ dàng trao tặng',
      icon: 'redeem',
    },
    {
      id: 'PARTIAL' as const,
      title: 'Đóng gói một phần',
      description: 'Chỉ đóng hộp những món bạn chọn',
      icon: 'checklist',
    },
  ];
  constructor() {
    effect(() => {
      const fingerprint = this.currentFingerprint();
      const loaded = !this.loading();
      if (loaded && fingerprint !== this.fingerprint) untracked(() => this.initialize());
    });
  }
  ngOnInit() {
    this.loadBoxes();
  }
  size(item: CartItem): string {
    return item.packagingSize || item.productId?.packagingSize || 'MEDIUM';
  }
  units(item: CartItem) {
    return item.packagingUnits || item.productId?.packagingUnits || UNITS[this.size(item)] || 3;
  }
  sizeName(item: CartItem) {
    return (
      { SMALL: 'Small', MEDIUM: 'Medium', LARGE: 'Large', OVERSIZED: 'Oversized' } as Record<
        string,
        string
      >
    )[this.size(item)];
  }
  eligibleItems() {
    return this.cart.items().filter((item) => this.size(item) !== 'OVERSIZED');
  }
  oversizedItems() {
    return this.cart.items().filter((item) => this.size(item) === 'OVERSIZED');
  }
  catalogBoxes() {
    return this.boxes().filter((box) => box.id !== 'NONE')
      .sort((a, b) => a.capacity - b.capacity || a.fee - b.fee);
  }
  boxIssue(box: GiftBox, item?: CartItem): string {
    if (!box.available) return 'Tạm hết hộp';
    const items = item ? [item] : this.eligibleItems();
    if (!items.length) return 'Không áp dụng cho sản phẩm quá cỡ';
    if (items.some((i) => RANK[box.size] < RANK[this.size(i)]))
      return 'Không vừa kích thước sản phẩm';
    const units = item ? this.units(item) : this.bundleUnits();
    return box.capacity < units ? 'Không đủ dung tích' : '';
  }
  sortedBoxes() {
    return this.boxes()
      .filter((b) => b.id !== 'NONE' && b.available)
      .sort((a, b) => a.capacity - b.capacity || a.fee - b.fee);
  }
  fits(item: CartItem) {
    return this.sortedBoxes().filter(
      (b) => RANK[b.size] >= RANK[this.size(item)] && b.capacity >= this.units(item),
    );
  }
  bundleUnits() {
    return this.eligibleItems().reduce((sum, item) => sum + this.units(item) * item.quantity, 0);
  }
  bundleBoxes() {
    return this.eligibleItems().length
      ? this.sortedBoxes().filter(
          (b) =>
            b.capacity >= this.bundleUnits() &&
            this.eligibleItems().every((i) => RANK[b.size] >= RANK[this.size(i)]),
        )
      : [];
  }
  row(item: CartItem): Row {
    return (
      this.rows()[item._id || ''] || { selected: false, quantity: item.quantity, boxStyle: '' }
    );
  }
  updateRow(item: CartItem, patch: Partial<Row>, persist = true) {
    this.rows.update((rows) => ({ ...rows, [item._id!]: { ...this.row(item), ...patch } }));
    this.error.set('');
    if (persist) this.saveSelection();
  }
  currentFingerprint() {
    return JSON.stringify(
      this.cart.items().map((i) => [i._id, i.quantity, this.size(i), this.units(i)]),
    );
  }
  initialize() {
    const plan = this.cart.cart()?.packaging;
    this.enabled.set(!!plan?.mode && plan.mode !== 'NONE');
    this.mode.set(plan?.mode && plan.mode !== 'NONE' ? plan.mode : 'BUNDLED');
    const rows: Record<string, Row> = {};
    this.eligibleItems().forEach((item, index) => {
      const saved = plan?.allocations?.find((a) => a.itemId === item._id);
      rows[item._id!] = {
        selected: this.mode() === 'PARTIAL' ? !!saved : true,
        quantity: this.mode() === 'INDIVIDUAL' ? item.quantity : Math.min(saved?.quantity || item.quantity, item.quantity),
        boxStyle: saved?.boxStyle || this.fits(item)[0]?.id || '',
      };
    });
    this.rows.set(rows);
    this.bundleStyle.set(
      this.bundleBoxes().find((b) => b.id === plan?.boxStyle)?.id ||
        this.bundleBoxes()[0]?.id ||
        '',
    );
    this.fingerprint = this.currentFingerprint();
  }
  loadBoxes() {
    this.error.set('');
    this.loading.set(true);
    this.api.get<GiftBox[]>('cart/gift-boxes').subscribe({
      next: (boxes) => {
        this.boxes.set(boxes);
        this.initialize();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.boxes.set([]);
        this.error.set('Chưa tải được mẫu hộp. Vui lòng tải lại trang để thử lại.');
      },
    });
  }
  choosePackaging(enabled: boolean) {
    if (this.saving() || this.cart.packagingSyncPending() || this.cart.quantitySyncPending()) return;
    this.error.set('');
    if (enabled) {
      this.enabled.set(true);
      this.saveSelection();
      return;
    }
    this.enabled.set(false);
    this.save(true);
  }
  setMode(mode: 'BUNDLED' | 'INDIVIDUAL' | 'PARTIAL') {
    this.mode.set(mode);
    this.error.set('');
    if (mode === 'INDIVIDUAL')
      this.eligibleItems().forEach((item) =>
        this.updateRow(item, { selected: true, quantity: item.quantity }, false),
      );
    if (mode === 'PARTIAL' && this.eligibleItems().every((i) => this.row(i).selected))
      this.eligibleItems().forEach((item, index) =>
        this.updateRow(item, { selected: index === 0 }, false),
      );
    this.saveSelection();
  }
  chooseBundle(style: string) {
    if (!this.bundleBoxes().some(box => box.id === style)) return;
    this.bundleStyle.set(style);
    this.saveSelection();
  }
  saveSelection() {
    if (!this.enabled()) return;
    if (this.mode() === 'PARTIAL' && !this.eligibleItems().some(item => this.row(item).selected)) {
      this.save(true, true);
    } else this.save();
  }
  draftBoxCount() {
    return this.mode() === 'BUNDLED'
      ? this.bundleStyle()
        ? 1
        : 0
      : this.eligibleItems().reduce(
          (sum, item) =>
            sum +
            (this.row(item).selected
              ? this.mode() === 'INDIVIDUAL'
                ? item.quantity
                : this.row(item).quantity
              : 0),
          0,
        );
  }
  draftFee() {
    return this.mode() === 'BUNDLED'
      ? this.boxes().find((b) => b.id === this.bundleStyle())?.fee || 0
      : this.eligibleItems().reduce(
          (sum, i) =>
            sum +
            (this.row(i).selected
              ? (this.boxes().find((b) => b.id === this.row(i).boxStyle)?.fee || 0) *
                (this.mode() === 'INDIVIDUAL' ? i.quantity : this.row(i).quantity)
              : 0),
          0,
        );
  }
  validDraft() {
    if (this.mode() === 'BUNDLED')
      return this.bundleBoxes().some((b) => b.id === this.bundleStyle());
    const selected = this.eligibleItems().filter((i) => this.row(i).selected);
    return (
      selected.length > 0 &&
      selected.every(
        (i) =>
          this.fits(i).some((b) => b.id === this.row(i).boxStyle) &&
          Number.isInteger(this.row(i).quantity) &&
          this.row(i).quantity > 0 &&
          this.row(i).quantity <= i.quantity,
      )
    );
  }
  save(clear = false, keepEditor = false) {
    if (
      this.saving() ||
      (!clear && this.loading()) ||
      this.cart.quantitySyncPending() ||
      (!clear && !this.validDraft())
    )
      return;
    if (!clear && this.currentFingerprint() !== this.fingerprint) {
      this.initialize();
      this.error.set(
        'Giỏ hàng vừa thay đổi. Vui lòng chọn lại mẫu hộp phù hợp.',
      );
      return;
    }
    const request: GiftPackaging = clear
      ? { mode: 'NONE' }
      : {
          mode: this.mode(),
          boxStyle: this.bundleStyle(),
          allocations: this.eligibleItems()
            .filter((i) => this.row(i).selected)
            .map((i) => ({
              itemId: i._id!,
              boxStyle: this.row(i).boxStyle,
              quantity: this.mode() === 'INDIVIDUAL' ? i.quantity : this.row(i).quantity,
            })),
        };
    this.saving.set(true);
    this.error.set('');
    this.cart.updatePackaging(request).subscribe({
      next: () => {
        this.saving.set(false);
        if (!keepEditor) this.initialize();
      },
      error: (error) => {
        this.saving.set(false);
        this.initialize();
        this.error.set(error.error?.message || 'Không lưu được cách đóng gói. Vui lòng thử lại.');
      },
    });
  }
}
