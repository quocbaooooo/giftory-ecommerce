import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Product, Category } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  constructor(private api: ApiService) {}

  getProducts(params?: any): Observable<{ items: Product[]; meta: any }> {
    return this.api.getWithMeta<Product[]>('products', params);
  }

  getProductBySlug(slug: string): Observable<Product> {
    return this.api.get<Product>(`products/slug/${slug}`);
  }

  getFlashSaleProducts(): Observable<Product[]> {
    return this.api.get<Product[]>('products/flash-sale');
  }

  getSearchSuggestions(keyword: string): Observable<{ products: any[]; keywords: string[] }> {
    return this.api.get<{ products: any[]; keywords: string[] }>('products/search-suggest', { keyword });
  }

  getBestSellers(limit = 4): Observable<Product[]> {
    return this.api.get<Product[]>('products/best-sellers', { limit });
  }

  getCategories(): Observable<Category[]> {
    return this.api.get<Category[]>('categories');
  }
}

