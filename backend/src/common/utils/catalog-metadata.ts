import { BadRequestException } from '@nestjs/common';
import { removeVietnameseAccents, buildVietnameseRegex } from './vietnamese.util';

export function normalizeCatalogTag(value: string): string {
  return removeVietnameseAccents(String(value || '')).toLowerCase().trim().replace(/\s+/g, ' ');
}

export function catalogTagAliases(value: string, kind: 'audience' | 'occasion'): Set<string> {
  const normalized = normalizeCatalogTag(value);
  const groups: Record<string, string[]> = kind === 'audience' ? {
    'ban than': ['ban than', 'ban be'],
    'ban trai': ['nguoi yeu'],
    'ban gai': ['nguoi yeu'],
    'vo': ['nguoi yeu'],
    'chong': ['nguoi yeu'],
    'crush': ['nguoi yeu'],
    'sep': ['sep', 'dong nghiep'],
    'dong nghiep / sep': ['sep', 'dong nghiep'],
  } : {
    'ngay phu nu': ['ngay phu nu', '8/3', '20/10'],
    'ky niem tinh yeu': ['ky niem', 'valentine'],
    'tet': ['tet', 'nam moi'],
    'nam moi': ['nam moi', 'tet'],
    '8/3 - 20/10': ['ngay phu nu', '8/3', '20/10'],
    '8/3 -20/10': ['ngay phu nu', '8/3', '20/10'],
    'giang sinh': ['giang sinh', 'noel'],
    'noel': ['giang sinh', 'noel'],
    'giang sinh / nam moi': ['giang sinh', 'noel', 'nam moi', 'tet'],
  };
  return new Set([normalized, ...(groups[normalized] || [])]);
}

export function catalogMetadataRegex(value: string, kind: 'audience' | 'occasion'): RegExp {
  const patterns = [...catalogTagAliases(value, kind)].map(alias => buildVietnameseRegex(alias).source.replace(/ /g, '\\s+'));
  return new RegExp('^\\s*(?:' + patterns.join('|') + ')\\s*$', 'i');
}

export function normalizeProductMetadata(data: Record<string, any>): void {
  for (const field of ['tags', 'audience', 'occasions']) {
    if (data[field] === undefined) continue;
    if (!Array.isArray(data[field]) || data[field].some((value: unknown) => typeof value !== 'string')) {
      throw new BadRequestException(`${field} phải là danh sách chuỗi.`);
    }
    const seen = new Set<string>();
    data[field] = data[field].map((value: string) => value.trim().replace(/\s+/g, ' ')).filter((value: string) => {
      const key = normalizeCatalogTag(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
