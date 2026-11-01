import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Order, GreetingCardTemplate } from '../models';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  constructor(private api: ApiService) {}

  getGreetingCardTemplates(): Observable<GreetingCardTemplate[]> {
    return this.api.get<GreetingCardTemplate[]>('orders/greeting-card-templates');
  }

  createOrder(orderData: any): Observable<Order> {
    return this.api.post<Order>('orders', orderData);
  }

  sendGuestCodOtp(phone: string, sessionId: string): Observable<any> {
    return this.api.post<any>('orders/guest-cod-otp/send', { phone, sessionId });
  }

  resendGuestCodOtp(challengeId: string, phone: string, sessionId: string): Observable<any> {
    return this.api.post<any>('orders/guest-cod-otp/resend', { challengeId, phone, sessionId });
  }

  verifyGuestCodOtp(challengeId: string, phone: string, sessionId: string, code: string): Observable<any> {
    return this.api.post<any>('orders/guest-cod-otp/verify', { challengeId, phone, sessionId, code });
  }

  getOrderByCode(orderCode: string, phone?: string): Observable<Order> {
    return this.api.get<Order>(`orders/${encodeURIComponent(orderCode)}`, { phone });
  }

  getMyOrders(): Observable<Order[]> {
    return this.api.get<Order[]>('orders');
  }

  scheduleGift(orderCode: string, phone: string | undefined, window: string): Observable<any> { return this.api.post(`orders/${encodeURIComponent(orderCode)}/gift-schedule`, { phone, window }); }
  settleGiftDemo(orderCode: string, phone?: string): Observable<Order> { return this.api.post<Order>(`orders/${encodeURIComponent(orderCode)}/gift-settle-demo`, { phone }); }

  simulateDemoPayment(orderCode: string, phone?: string): Observable<Order> {
    return this.api.post<Order>(`orders/${encodeURIComponent(orderCode)}/demo-payment`, { phone });
  }

}
