import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface MarketingCampaign {
  _id: string;
  title: string;
  eyebrow: string;
  description: string;
  imageUrl?: string;
  imageAlt?: string;
  primaryLabel: string;
  primaryLink: string;
  secondaryLabel?: string;
  secondaryLink?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class MarketingService {
  constructor(private api: ApiService) {}
  getActiveCampaigns() { return this.api.get<MarketingCampaign[]>('campaigns/active'); }
}
