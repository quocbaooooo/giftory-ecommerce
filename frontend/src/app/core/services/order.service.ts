import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Order } from '../models';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  constructor(private api: ApiService) {}

  createOrder(orderData: any): Observable<Order> {
    return this.api.post<Order>('orders', orderData);
  }

  getOrderByCode(orderCode: string): Observable<Order> {
    return this.api.get<Order>(`orders/${orderCode}`);
  }

  getMyOrders(): Observable<Order[]> {
    return this.api.get<Order[]>('orders');
  }

  cancelOrder(id: string): Observable<Order> {
    return this.api.patch<Order>(`orders/${id}/cancel`, {});
  }
}
