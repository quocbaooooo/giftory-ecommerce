import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface LocationOption { code: string; name: string; }
export interface RecipientInput {
  purpose?: 'DELIVERY' | 'RECIPIENT';
  name: string; phone: string; provinceCode: string; wardCode: string; street: string;
}
export interface Recipient extends RecipientInput {
  id: string; provinceName: string; wardName: string; address: string;
}

@Injectable({ providedIn: 'root' })
export class RecipientService {
  constructor(private readonly api: ApiService) {}
  provinces() { return this.api.get<LocationOption[]>('locations/provinces'); }
  wards(provinceCode: string) { return this.api.get<LocationOption[]>(`locations/provinces/${encodeURIComponent(provinceCode)}/wards`); }
  list() { return this.api.get<Recipient[]>('recipients'); }
  save(input: RecipientInput) { return this.api.post<Recipient[]>('recipients', input); }
  update(id: string, input: RecipientInput) { return this.api.patch<Recipient[]>(`recipients/${encodeURIComponent(id)}`, input); }
  remove(id: string) { return this.api.delete<Recipient[]>(`recipients/${encodeURIComponent(id)}`); }
}
