import { Injectable, signal, computed } from '@angular/core';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import { Cart, CartItem } from '../models';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly SESSION_KEY = 'giftory_cart_session_id';

  cart = signal<Cart | null>(null);
  
  items = computed(() => this.cart()?.items || []);
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

  constructor(private api: ApiService) {
    this.ensureSessionId();
    this.loadCart();
  }

  getSessionId(): string {
    return localStorage.getItem(this.SESSION_KEY) || this.ensureSessionId();
  }

  loadCart(): void {
    const sessionId = this.getSessionId();
    this.api.get<Cart>('cart', { sessionId }).subscribe({
      next: cart => this.cart.set(cart),
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

    return this.api.post<Cart>('cart/items', payload).pipe(
      tap(cart => this.cart.set(cart))
    );
  }

  updateQuantity(index: number, quantity: number) {
    const sessionId = this.getSessionId();
    return this.api.patch<Cart>(`cart/items/${index}?sessionId=${sessionId}`, { quantity, sessionId }).pipe(
      tap(cart => this.cart.set(cart))
    );
  }

  updateCustomDetails(index: number, customDetails: any, variantName?: string) {
    const sessionId = this.getSessionId();
    return this.api.patch<Cart>(`cart/items/${index}/custom?sessionId=${sessionId}`, {
      customDetails,
      variantName
    }).pipe(
      tap(cart => this.cart.set(cart))
    );
  }

  removeItem(index: number) {
    const sessionId = this.getSessionId();
    return this.api.delete<Cart>(`cart/items/${index}?sessionId=${sessionId}`).pipe(
      tap(cart => this.cart.set(cart))
    );
  }

  applyVoucher(code: string) {
    const sessionId = this.getSessionId();
    return this.api.post<Cart>('cart/apply-voucher', { code, sessionId }).pipe(
      tap(cart => this.cart.set(cart))
    );
  }

  setPaymentMode(mode: 'DEPOSIT_50' | 'FULL_PAYMENT') {
    const sessionId = this.getSessionId();
    return this.api.post<Cart>('cart/payment-mode', { mode, sessionId }).pipe(
      tap(cart => this.cart.set(cart))
    );
  }

  clearCart() {
    const sessionId = this.getSessionId();
    return this.api.post<Cart>('cart/clear', { sessionId }).pipe(
      tap(cart => this.cart.set(cart))
    );
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
