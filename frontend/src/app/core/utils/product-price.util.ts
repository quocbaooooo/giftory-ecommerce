/** Whole-percent discount based on the same prices shown to the customer. */
export function calculateDiscountPercent(price: number, salePrice?: number): number {
  if (!Number.isFinite(price) || price <= 0 || typeof salePrice !== 'number' ||
      !Number.isFinite(salePrice) || salePrice <= 0 || salePrice >= price) return 0;
  return Math.round(((price - salePrice) / price) * 100);
}
