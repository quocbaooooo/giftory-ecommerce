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

  getOrderByCode(orderCode: string, phone?: string): Observable<Order> {
    return this.api.get<Order>(`orders/${encodeURIComponent(orderCode)}`, { phone });
  }

  getMyOrders(): Observable<Order[]> {
    return this.api.get<Order[]>('orders');
  }

  simulateDemoPayment(orderCode: string, phone?: string): Observable<Order> {
    return this.api.post<Order>(`orders/${encodeURIComponent(orderCode)}/demo-payment`, { phone });
  }

}
