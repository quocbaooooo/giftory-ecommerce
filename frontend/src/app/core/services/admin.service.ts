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
    return this.api.get('orders/admin/all', params);
  }

  getAdminOrders(params?: any): Observable<any> {
    return this.getAllOrders(params);
  }

  getOrderById(id: string): Observable<any> {
    return this.api.get(`orders/admin/${id}`);
  }

  // BP-04 Actions
  confirmOrder(orderId: string, bypassWaitTime: boolean = false): Observable<any> {
    return this.api.post(`orders/admin/${orderId}/confirm`, { bypassWaitTime });
  }

  pickReadyMadeItem(orderId: string, itemId: string): Observable<any> {
    return this.api.post(`orders/admin/${orderId}/items/${itemId}/pick`, {});
  }

  startCustomItemProduction(orderId: string, itemId: string): Observable<any> {
    return this.api.post(`orders/admin/${orderId}/items/${itemId}/produce`, {});
  }

  inspectCustomItemQuality(orderId: string, itemId: string, payload: { passed: boolean; note?: string; inspector?: string }): Observable<any> {
    return this.api.post(`orders/admin/${orderId}/items/${itemId}/qc`, payload);
  }

  packageOrder(orderId: string): Observable<any> {
    return this.api.post(`orders/admin/${orderId}/package`, {});
  }

  dispatchToShipper(orderId: string, payload: { carrier?: string; trackingCode?: string; note?: string }): Observable<any> {
    return this.api.post(`orders/admin/${orderId}/dispatch`, payload);
  }

  reportDeliveryResult(orderId: string, payload: { success: boolean; failureReason?: string; allowRetry?: boolean; note?: string }): Observable<any> {
    return this.api.post(`orders/admin/${orderId}/delivery-result`, payload);
  }

  receiveReturnedOrder(orderId: string): Observable<any> {
    return this.api.post(`orders/admin/${orderId}/receive-return`, {});
  }

  transferToBp06(orderId: string, payload: { bp06Note?: string }): Observable<any> {
    return this.api.post(`orders/admin/${orderId}/transfer-bp06`, payload);
  }

  updateOrderStatus(orderId: string, orderStatusOrPayload: any, fulfillmentStatus?: string): Observable<any> {
    const payload = typeof orderStatusOrPayload === 'string'
      ? { orderStatus: orderStatusOrPayload, fulfillmentStatus }
      : orderStatusOrPayload;

    return this.api.patch(`orders/admin/${orderId}/status`, payload);
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
