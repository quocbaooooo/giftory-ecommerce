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
}
