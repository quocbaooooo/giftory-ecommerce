import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  wishlist = signal<any>(null);
  productIds = signal<string[]>([]);

  constructor(private api: ApiService) {}

  getWishlist(): Observable<any> {
    return this.api.get('wishlist').pipe(
      tap((res: any) => {
        this.wishlist.set(res);
        const data = res?.data || res;
        const ids = (data?.productIds || []).map((p: any) => typeof p === 'string' ? p : p._id);
        this.productIds.set(ids);
      })
    );
  }

  toggleProduct(productId: string): Observable<any> {
    return this.api.post(`wishlist/toggle/${productId}`, {}).pipe(
      tap((res: any) => {
        const current = [...this.productIds()];
        const idx = current.indexOf(productId);
        if (idx > -1) {
          current.splice(idx, 1);
        } else {
          current.push(productId);
        }
        this.productIds.set(current);
      })
    );
  }

  toggleWishlist(productId: string): Observable<any> {
    return this.toggleProduct(productId);
  }

  isWishlisted(productId: string): boolean {
    return this.productIds().includes(productId);
  }
}
