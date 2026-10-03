import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class LoyaltyService {
  constructor(private api: ApiService) {}

  getSummary(): Observable<any> {
    return this.api.get('loyalty/summary');
  }

  getAvailableVouchers(): Observable<any> {
    return this.api.get('vouchers');
  }

  getHistory(): Observable<any> {
    return this.api.get('loyalty/history');
  }

  claimCode(code: string): Observable<any> {
    return this.api.post('loyalty/claim-code', { code });
  }

  redeemVoucher(voucherCodeOrId: string): Observable<any> {
    return this.api.post('loyalty/redeem', { voucherCode: voucherCodeOrId, voucherId: voucherCodeOrId });
  }
}
