import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  constructor(private api: ApiService) {}

  getDashboard(): Observable<any> {
    return this.api.get('admin/dashboard');
  }

  getDashboardKpis(): Observable<any> {
    return this.getDashboard();
  }

  getUsers(params?: any): Observable<any> {
    return this.api.get('admin/users', params);
  }

  getAdminUsers(params?: any): Observable<any> {
    return this.getUsers(params);
  }

  updateUserRole(userId: string, role: string): Observable<any> {
    return this.api.patch(`admin/users/${userId}/role`, { role });
  }

  updateUserStatus(userId: string, isActive: boolean): Observable<any> {
    return this.api.patch(`admin/users/${userId}/status`, { isActive });
  }

  getAllOrders(params?: any): Observable<any> {
    return this.api.get('orders', params);
  }

  getAdminOrders(params?: any): Observable<any> {
    return this.getAllOrders(params);
  }

  updateOrderStatus(orderId: string, orderStatusOrPayload: any, fulfillmentStatus?: string): Observable<any> {
    const payload = typeof orderStatusOrPayload === 'string'
      ? { orderStatus: orderStatusOrPayload, fulfillmentStatus }
      : orderStatusOrPayload;

    return this.api.patch(`orders/${orderId}/status`, payload);
  }

  createProduct(productData: any): Observable<any> {
    return this.api.post('products', productData);
  }

  updateProduct(id: string, productData: any): Observable<any> {
    return this.api.patch(`products/${id}`, productData);
  }

  deleteProduct(id: string): Observable<any> {
    return this.api.delete(`products/${id}`);
  }

  uploadImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post('upload/image', formData);
  }
}
