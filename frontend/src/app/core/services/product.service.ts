import { Injectable } from '@angular/core';
import { Observable, catchError, defer, shareReplay, tap, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { Product, Category } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly catalogTtl = 60_000;
  private readonly catalogCache = new Map<string, { expiresAt: number; request: Observable<any> }>();

  constructor(private api: ApiService) {}

  private cached<T>(endpoint: string, params: any, request: () => Observable<T>): Observable<T> {
    const query = Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
      .sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, String(value)]);
    const key = endpoint + JSON.stringify(query);
    return defer(() => {
      const cached = this.catalogCache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        this.catalogCache.delete(key);
        this.catalogCache.set(key, cached);
        return cached.request;
      }
      const entry = { expiresAt: Infinity, request: undefined as unknown as Observable<T> };
      entry.request = defer(request).pipe(
        tap(() => { entry.expiresAt = Date.now() + this.catalogTtl; }),
        catchError(error => {
          if (this.catalogCache.get(key) === entry) this.catalogCache.delete(key);
          return throwError(() => error);
        }),
        // Keep an in-flight catalog fetch reusable when its original page is left.
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.catalogCache.set(key, entry);
      while (this.catalogCache.size > 40) this.catalogCache.delete(this.catalogCache.keys().next().value!);
      return entry.request;
    });
  }

  invalidateCatalog(): void {
    this.catalogCache.clear();
  }

  getCatalogProducts(params?: any): Observable<{ items: Product[]; meta: any }> {
    const query = { ...params, view: 'catalog' };
    return this.cached('products', query, () => this.api.getWithMeta<Product[]>('products', query));
  }

  prefetchProductList(): void {
    this.getCatalogProducts({ sort: 'popular', page: 1, limit: 12 }).subscribe({ error: () => {} });
  }

  getProducts(params?: any): Observable<{ items: Product[]; meta: any }> {
    return this.api.getWithMeta<Product[]>('products', params);
  }

  getProductBySlug(slug: string): Observable<Product> {
    return this.api.get<Product>(`products/slug/${slug}`);
  }

  getFlashSaleProducts(): Observable<Product[]> {
    return this.cached('products/flash-sale', {}, () => this.api.get<Product[]>('products/flash-sale', { view: 'catalog' }));
  }

  getSearchSuggestions(keyword: string): Observable<{ products: any[]; keywords: string[] }> {
    return this.api.get<{ products: any[]; keywords: string[] }>('products/search-suggest', { keyword });
  }

  getBestSellers(limit = 4): Observable<Product[]> {
    return this.cached('products/best-sellers', { limit }, () => this.api.get<Product[]>('products/best-sellers', { limit, view: 'catalog' }));
  }

  getCategories(): Observable<Category[]> {
    return this.cached('categories', {}, () => this.api.get<Category[]>('categories'));
  }

  getCategoryDisplaySettings(): Observable<{ allCategoriesIcon: string }> {
    return this.cached('categories/display-settings', {}, () => this.api.get<{ allCategoriesIcon: string }>('categories/display-settings'));
  }
}

