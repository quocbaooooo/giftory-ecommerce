import { Injectable, signal, computed } from '@angular/core';
import { catchError, defer, finalize, firstValueFrom, from, Observable, of, switchMap, tap } from 'rxjs';
import { ApiService } from './api.service';
import { Cart, CartItem, Product } from '../models';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly SESSION_KEY = 'giftory_cart_session_id';
  private readonly BUY_NOW_KEY = 'giftory_buy_now_item';

  quickProduct = signal<Product | null>(null);
  openQuick: (product: Product) => void = () => {};
  miniCartOpen = signal(false);
  toast = signal('');
  private toastTimer?: ReturnType<typeof setTimeout>;
  notify(message: string) { this.toast.set(message); clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => this.toast.set(''), 4000); }
  added() { this.notify('Đã thêm vào giỏ'); }
  cart = signal<Cart | null>(null);
  buyNowItem = signal<any | null>(this.getStoredBuyNowItem());
  
  items = computed(() => this.cart()?.items || []);
  productCount = computed(() => this.items().length);
  itemsCount = computed(() => this.items().reduce((sum, i) => sum + i.quantity, 0));
  itemCount = computed(() => this.itemsCount()); // alias for template compatibility
  pricing = computed(() => this.cart()?.pricing || {
    itemsTotal: 0,
    voucherDiscount: 0,
    shippingFee: 0,
    giftWrapFee: 0,
    totalAmount: 0,
    depositAmount: 0,
    remainingCodAmount: 0,
    totalCustomItems: 0
  });
  paymentMode = computed(() => this.cart()?.paymentMode || 'DEPOSIT_50');
  quantitySyncPending = signal(false);
  voucherSyncPending = signal(false);
  quantityError = signal<string | null>(null);
  private confirmedCart: Cart | null = null;
  private mutationTail: Promise<void> = Promise.resolve();
  private quantityDrafts = new Map<string, { quantity: number; version: number }>();
  private quantityVersion = 0;
  private quantityTimer?: ReturnType<typeof setTimeout>;
  private quantitySyncActive = false;
  private quantityIdleWaiters = new Set<() => void>();

  private itemKey(item: CartItem): string {
    return item._id || JSON.stringify([item.productId?._id || item.productId, item.variantSku || item.variantName, item.customDesignId, item.customDetails]);
  }

  // Serialize cart requests so a slow response cannot overwrite a newer edit.
  private mutate(request: () => Observable<Cart>): Observable<Cart> {
    return defer(() => {
      const task = this.mutationTail.then(async () => {
        const cart = await firstValueFrom(request());
        this.confirmedCart = cart;
        const keys = new Set(cart.items.map(item => this.itemKey(item)));
        for (const key of this.quantityDrafts.keys()) if (!keys.has(key)) this.quantityDrafts.delete(key);
        this.publishCart();
        return cart;
      });
      this.mutationTail = task.then(() => undefined, () => undefined);
      return from(task);
    });
  }

  private publishCart(): void {
    const confirmed = this.confirmedCart;
    this.quantitySyncPending.set(this.quantityDrafts.size > 0 || this.quantitySyncActive);
    if (!this.quantitySyncPending()) {
      for (const resolve of this.quantityIdleWaiters) resolve();
      this.quantityIdleWaiters.clear();
    }
    if (!confirmed) return;
    if (!this.quantityDrafts.size) { this.cart.set(confirmed); return; }
    const items = confirmed.items.map(item => {
      const draft = this.quantityDrafts.get(this.itemKey(item));
      return draft ? { ...item, quantity: draft.quantity, depositRequired: item.isCustom ? Math.round(item.price * 0.5) * draft.quantity : 0 } : item;
    });
    const itemsTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalCustomItems = items.reduce((sum, item) => sum + (item.isCustom ? item.quantity : 0), 0);
    const baseShippingFee = itemsTotal === 0 ? 0 : confirmed.shippingMethod === 'EXPRESS' ? 50000 : itemsTotal >= 250000 ? 0 : 30000;
    const applied = confirmed.appliedVoucher;
    const eligible = !!applied && itemsTotal >= applied.minOrderValue;
    let savings = eligible ? (applied.discountType === 'PERCENT' ? Math.round(itemsTotal * applied.discountValue / 100) : applied.discountValue) : 0;
    if (applied?.maxDiscount) savings = Math.min(savings, applied.maxDiscount);
    const shippingDiscount = applied?.discountType === 'FREESHIP' ? Math.min(baseShippingFee, savings) : 0;
    const shippingFee = baseShippingFee - shippingDiscount;
    const voucherDiscount = applied ? (applied.discountType === 'FREESHIP' ? 0 : Math.min(itemsTotal, savings)) : 0;
    const giftWrapFee = confirmed.pricing.giftWrapFee;
    const totalAmount = Math.max(0, itemsTotal - voucherDiscount + shippingFee + giftWrapFee);
    const rawDepositAmount = confirmed.paymentMode === 'FULL_PAYMENT' ? totalAmount
      : items.reduce((sum, item) => sum + (item.isCustom ? Math.round(item.price * item.quantity * 0.5) : 0), 0);
    const depositAmount = Math.min(totalAmount, rawDepositAmount);
    this.cart.set({ ...confirmed, items, pricing: { ...confirmed.pricing, itemsTotal, totalCustomItems, shippingFee, baseShippingFee, shippingDiscount, voucherDiscount, totalAmount, depositAmount, remainingCodAmount: Math.max(0, totalAmount - depositAmount) } });
  }

  private flushQuantityUpdates(): void {
    if (this.quantitySyncActive || !this.quantityDrafts.size) return;
    this.quantitySyncActive = true;
    this.mutate(() => {
      const entry = this.quantityDrafts.entries().next().value;
      const confirmed = this.confirmedCart!;
      if (!entry) return of(confirmed);
      const [key, draft] = entry;
      const index = confirmed.items.findIndex(item => this.itemKey(item) === key);
      if (index < 0) { this.quantityDrafts.delete(key); return of(confirmed); }
      const sessionId = this.getSessionId();
      return this.api.patch<Cart>(`cart/items/${index}?sessionId=${encodeURIComponent(sessionId)}`, { quantity: draft.quantity, sessionId }).pipe(
        tap(() => { if (this.quantityDrafts.get(key)?.version === draft.version) this.quantityDrafts.delete(key); }),
        catchError(error => {
          if (this.quantityDrafts.get(key)?.version === draft.version) this.quantityDrafts.delete(key);
          this.quantityError.set(error.error?.message || 'Không cập nhật được số lượng. Vui lòng thử lại.');
          return of(confirmed);
        }),
      );
    }).subscribe({
      next: () => {
        this.quantitySyncActive = false;
        this.publishCart();
        this.flushQuantityUpdates();
      },
      error: () => {
        this.quantitySyncActive = false;
        this.quantityDrafts.clear();
        this.quantityError.set('Không cập nhật được giỏ hàng. Vui lòng thử lại.');
        this.publishCart();
      },
    });
  }

  private waitForQuantityUpdates(): Promise<void> {
    if (!this.quantitySyncPending()) return Promise.resolve();
    clearTimeout(this.quantityTimer);
    const completion = new Promise<void>(resolve => this.quantityIdleWaiters.add(resolve));
    this.flushQuantityUpdates();
    return completion;
  }

  setBuyNowItem(item: any): void {
    this.buyNowItem.set(item);
    sessionStorage.setItem(this.BUY_NOW_KEY, JSON.stringify(item));
  }

  clearBuyNowItem(): void {
    this.buyNowItem.set(null);
    sessionStorage.removeItem(this.BUY_NOW_KEY);
  }

  private getStoredBuyNowItem(): any | null {
    try {
      const data = sessionStorage.getItem(this.BUY_NOW_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  constructor(private api: ApiService) {
    this.ensureSessionId();
    this.loadCart();
  }

  getSessionId(): string {
    return localStorage.getItem(this.SESSION_KEY) || this.ensureSessionId();
  }

  loadCart(): void {
    const sessionId = this.getSessionId();
    this.mutate(() => this.api.get<Cart>('cart', { sessionId })).subscribe({
      error: err => console.error('Failed to load cart', err)
    });
  }

  addItem(param: any, quantity: number = 1, variantName?: string, customDetails?: any) {
    const sessionId = this.getSessionId();
    let payload: any;

    if (typeof param === 'object' && param !== null && param.productId) {
      payload = {
        productId: typeof param.productId === 'object' ? param.productId._id : param.productId,
        quantity: param.quantity || 1,
        variantName: param.variantName,
        variantSku: param.variantSku,
        customDesignId: param.customDesignId,
        customDetails: param.customDetails,
        sessionId
      };
    } else {
      payload = {
        productId: param,
        quantity,
        variantName,
        customDetails,
        sessionId
      };
    }

    return defer(() => from(this.waitForQuantityUpdates()).pipe(
      switchMap(() => this.mutate(() => this.api.post<Cart>('cart/items', payload))),
    ));
  }

  updateQuantity(index: number, quantity: number) {
    return defer(() => {
      const item = this.items()[index];
      if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity === item.quantity) return of(this.cart()!);
      this.quantityError.set(null);
      this.quantityDrafts.set(this.itemKey(item), { quantity, version: ++this.quantityVersion });
      this.publishCart();
      clearTimeout(this.quantityTimer);
      this.quantityTimer = setTimeout(() => this.flushQuantityUpdates(), 200);
      return of(this.cart()!);
    });
  }

  updateCustomDetails(index: number, customDetails: any, variantName?: string, customDesignId?: string) {
    const sessionId = this.getSessionId();
    const item = this.items()[index];
    const key = item && this.itemKey(item);
    return this.mutate(() => {
      const currentIndex = this.confirmedCart?.items.findIndex(candidate => this.itemKey(candidate) === key) ?? -1;
      if (currentIndex < 0) return of(this.confirmedCart!);
      return this.api.patch<Cart>(`cart/items/${currentIndex}/custom?sessionId=${encodeURIComponent(sessionId)}`, { customDetails, variantName, customDesignId });
    });
  }

  removeItem(index: number) {
    const sessionId = this.getSessionId();
    const item = this.items()[index];
    const key = item && this.itemKey(item);
    return this.mutate(() => {
      const currentIndex = this.confirmedCart?.items.findIndex(candidate => this.itemKey(candidate) === key) ?? -1;
      if (currentIndex < 0) return of(this.confirmedCart!);
      return this.api.delete<Cart>(`cart/items/${currentIndex}?sessionId=${encodeURIComponent(sessionId)}`);
    });
  }

  applyVoucher(code: string) {
    const sessionId = this.getSessionId();
    return defer(() => {
      this.voucherSyncPending.set(true);
      return from(this.waitForQuantityUpdates()).pipe(
        switchMap(() => this.mutate(() => this.api.post<Cart>('cart/apply-voucher', { code, sessionId }))),
        finalize(() => this.voucherSyncPending.set(false)),
      );
    });
  }

  setShippingMethod(method: 'STANDARD' | 'EXPRESS') {
    return this.mutate(() => this.api.post<Cart>('cart/shipping-method', { method, sessionId: this.getSessionId() }));
  }

  setPaymentMode(mode: 'DEPOSIT_50' | 'FULL_PAYMENT') {
    const sessionId = this.getSessionId();
    return this.mutate(() => this.api.post<Cart>('cart/payment-mode', { mode, sessionId }));
  }

  clearCart() {
    const sessionId = this.getSessionId();
    return this.mutate(() => this.api.post<Cart>('cart/clear', { sessionId }));
  }

  private ensureSessionId(): string {
    let id = localStorage.getItem(this.SESSION_KEY);
    if (!id) {
      id = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(this.SESSION_KEY, id);
    }
    return id;
  }
}
