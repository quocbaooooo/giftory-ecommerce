import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Product, CustomDesign } from '../models';

@Injectable({
  providedIn: 'root'
})
export class CustomStudioService {
  constructor(private api: ApiService) {}

  getTemplates(): Observable<Product[]> {
    return this.api.get<Product[]>('custom-studio/templates');
  }

  saveDesign(design: CustomDesign, sessionId?: string): Observable<CustomDesign> {
    return this.api.post<CustomDesign>('custom-studio/save-design', {
      ...design,
      sessionId
    });
  }

  getMyDesigns(sessionId?: string): Observable<any> {
    return this.api.get<any>('custom-studio/my-designs', { sessionId });
  }

  getMySavedDesigns(sessionId?: string): Observable<any> {
    return this.getMyDesigns(sessionId);
  }

  getDesignById(id: string): Observable<CustomDesign> {
    return this.api.get<CustomDesign>(`custom-studio/${id}`);
  }

  syncDesignDraft(design: CustomDesign): Observable<any> {
    return this.api.post<any>('custom-studio/sync-draft', design);
  }

  getAssets(type?: string): Observable<any[]> {
    return this.api.get<any[]>('custom-studio/assets', type ? { type } : {});
  }

  getAdminAssets(): Observable<any[]> {
    return this.api.get<any[]>('custom-studio/admin/assets');
  }

  createAdminAsset(data: any): Observable<any> {
    return this.api.post<any>('custom-studio/admin/assets', data);
  }

  deleteAdminAsset(id: string): Observable<any> {
    return this.api.delete<any>(`custom-studio/admin/assets/${id}`);
  }

  private readonly DRAFT_STORAGE_KEY = 'giftory_custom_design_draft';

  saveDraftToStorage(draft: any): void {
    try {
      localStorage.setItem(this.DRAFT_STORAGE_KEY, JSON.stringify({
        ...draft,
        savedAt: Date.now()
      }));
    } catch (e) {
      console.warn('Failed to save design draft to localStorage', e);
    }
  }

  getDraftFromStorage(): any | null {
    try {
      const data = localStorage.getItem(this.DRAFT_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  clearDraftFromStorage(): void {
    try {
      localStorage.removeItem(this.DRAFT_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear design draft from localStorage', e);
    }
  }
}
