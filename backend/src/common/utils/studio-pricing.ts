import { BadRequestException } from '@nestjs/common';

type StudioProduct = { price: number; salePrice?: number; customBaseFee?: number };

export function customizationFee(product: StudioProduct, details: any, isCustom = true): number {
  // Zero is an explicit quote from Studio, not a missing fee.
  const fee = details?.customFee ?? (isCustom ? product.customBaseFee ?? 0 : 0);
  if (typeof fee !== 'number' || !Number.isFinite(fee) || fee < 0) {
    throw new BadRequestException('Phụ phí chế tác không hợp lệ');
  }
  return fee;
}

export function studioUnitPrice(product: StudioProduct, details: any): number {
  const base = product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;
  return base + customizationFee(product, details);
}
