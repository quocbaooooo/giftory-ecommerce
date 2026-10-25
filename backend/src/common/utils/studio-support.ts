import { removeVietnameseAccents } from './vietnamese.util';

const VERIFIED_STUDIO_SLUGS = new Set([
  'binh-giu-nhiet-nordic-boc-da-khac-laser',
  'binh-giu-nhiet-khac-laser-ca-nhan-500ml',
  'ao-thun-custom-unisex',
]);

const VERIFIED_STUDIO_NAMES = new Set([
  'binh giu nhiet khac laser ca nhan 500ml',
  'binh giu nhiet nordic boc da khac laser ca nhan 500ml',
  'ao thun custom unisex',
]);

export function supportsCustomization(product: any): boolean {
  return product?.supportsCustomization === true || product?.isCustomizable === true;
}

export function isStudioSupportedProduct(product: any): boolean {
  if (product?.studioSupported === true) return true;
  const slug = String(product?.slug || '').toLowerCase().trim();
  if (VERIFIED_STUDIO_SLUGS.has(slug)) return true;
  const name = removeVietnameseAccents(String(product?.name || ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  return VERIFIED_STUDIO_NAMES.has(name)
    || name.startsWith('binh giu nhiet khac laser ca nhan ');
}
