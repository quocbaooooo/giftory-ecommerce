import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ApiService } from './api.service';

export interface AiProductCard {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  image: string;
  isCustomizable: boolean;
  rating: number;
  fitReason: string;
  categoryName?: string;
}

export interface AiChatResponse {
  reply: string;
  intent: 'RECOMMENDATION' | 'SUPPORT_ORDER' | 'SUPPORT_POLICY' | 'HANDOVER_HUMAN' | 'AMBIGUOUS' | 'SAFETY_GUARD';
  products?: AiProductCard[];
  orderInfo?: {
    orderCode: string;
    status: string;
    rawStatus: string;
    customerName: string;
    phone: string;
    totalAmount: number;
    itemsCount: number;
    items: {
      productName: string;
      quantity: number;
      unitPrice: number;
      productImage?: string;
    }[];
  };
  quickChips?: { label: string; value: string; step?: number }[];
  handoverInfo?: {
    agentName: string;
    avatar: string;
    hotline: string;
    zaloUrl: string;
    queueTime: string;
  };
  contextUpdate?: {
    recipient?: string;
    occasion?: string;
    budget?: number;
    preferences?: string;
  };
  isProximateFallback?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AiChatbotService {
  private openChatSubject = new Subject<{ prompt?: string }>();
  public openChat$ = this.openChatSubject.asObservable();

  constructor(private api: ApiService) {}

  openWithPrompt(prompt?: string): void {
    this.openChatSubject.next({ prompt });
  }

  sendMessage(message: string, context?: any, sessionId?: string): Observable<AiChatResponse> {
    return this.api.post<AiChatResponse>('ai/chat', {
      message,
      context,
      sessionId
    });
  }

  getQuickChips(step: number = 1): Observable<{ label: string; value: string; step?: number }[]> {
    return this.api.get<{ label: string; value: string; step?: number }[]>('ai/quick-chips', { step });
  }
}

