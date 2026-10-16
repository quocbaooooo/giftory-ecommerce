import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
export interface VoucherOffer {
  code: string; title: string; description: string;
  discountType: 'FIXED' | 'PERCENT' | 'FREESHIP';
  discountValue: number; minOrderValue: number; maxDiscount: number;
  expiresAt: string; usedCount: number; usageLimit: number; requiredPoints: number;
  eligible: boolean; reason: string; savings: number; missingAmount: number;
  itemDiscount: number; shippingDiscount: number; totalAmount: number;
  saved: boolean; recommended: boolean;
}
@Injectable({ providedIn: 'root' })
export class VoucherService {
  constructor(private api: ApiService) {}
  list() { return this.api.get<VoucherOffer[]>('vouchers'); }
  save(code: string) { return this.api.post(`vouchers/${encodeURIComponent(code)}/save`, {}); }
}
