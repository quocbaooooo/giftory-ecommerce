import { Injectable } from '@angular/core';
import { EMPTY, Observable, catchError, concat, defer, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { Product, Category } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly catalogTtl = 60_000;
  private readonly storageKey = `giftory:catalog:v1:${environment.apiUrl}`;
  private readonly staleTtl = 30 * 60_000;
  private readonly catalogCache = new Map<string, { expiresAt: number; request: Observable<any> }>();

  constructor(private api: ApiService) {}

  private readStored(): Array<{ key: string; expiresAt: number; value: any }> {
    try {
      const entries = JSON.parse(sessionStorage.getItem(this.storageKey) || '[]');
      return Array.isArray(entries) ? entries.filter(entry => entry && typeof entry.key === 'string'
        && Number.isFinite(entry.expiresAt) && entry.expiresAt + this.staleTtl > Date.now()
        && entry.value !== undefined) : [];
    } catch { return []; }
  }

  private saveStored(key: string, value: any, expiresAt: number): void {
    try {
      const entries = [...this.readStored().filter(entry => entry.key !== key), { key, value, expiresAt }].slice(-12);
      // Base64 images can be large. Bound storage and keep the in-memory cache if storage is full.
      let serialized = JSON.stringify(entries);
      while (serialized.length > 1_000_000 && entries.length) {
        entries.shift();
        serialized = JSON.stringify(entries);
      }
      sessionStorage.setItem(this.storageKey, serialized);
    } catch { /* Storage may be disabled or full. Catalog requests still work. */ }
  }

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
      const stored = this.readStored().find(entry => entry.key === key);
      if (stored && stored.expiresAt > Date.now()) {
        const entry = { expiresAt: stored.expiresAt, request: of(stored.value as T) };
        this.catalogCache.set(key, entry);
        return entry.request;
      }
      const entry = { expiresAt: Infinity, request: undefined as unknown as Observable<T> };
      const refresh = defer(request).pipe(
        tap(value => {
          entry.expiresAt = Date.now() + this.catalogTtl;
          // A request started before an admin edit must not repopulate the cleared cache.
          if (this.catalogCache.get(key) === entry) this.saveStored(key, value, entry.expiresAt);
        }),
        catchError(error => {
          if (this.catalogCache.get(key) === entry) this.catalogCache.delete(key);
          return stored ? EMPTY : throwError(() => error);
        }),
      );
      entry.request = (stored ? concat(of(stored.value as T), refresh) : refresh).pipe(
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
    try { sessionStorage.removeItem(this.storageKey); } catch { /* Storage is optional. */ }
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

