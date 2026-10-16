export function shippingPrice(itemsTotal: number, method = 'STANDARD'): number {
  return itemsTotal <= 0 ? 0 : method === 'EXPRESS' ? 50000 : itemsTotal >= 250000 ? 0 : 30000;
}

export function evaluateVoucher(v: any, itemsTotal: number, shippingFee: number, unlocked = true, now = new Date()) {
  // Compatibility with the original seeded shipping voucher, without rewriting customer data.
  const discountType = v.code === 'FREESHIP' && v.discountType === 'FIXED' ? 'FREESHIP' : v.discountType;
  const missingAmount = Math.max(0, (v.minOrderValue || 0) - itemsTotal);
  let reason = '';
  if (!v.isActive) reason = 'Mã đã ngừng áp dụng';
  else if (new Date(v.expiresAt) <= now) reason = 'Mã đã hết hạn';
  else if (v.usedCount >= v.usageLimit) reason = 'Mã đã hết lượt sử dụng';
  else if (!unlocked) reason = `Cần đổi ${v.requiredPoints} điểm tại trang Ưu đãi thành viên`;
  else if (missingAmount) reason = `Mua thêm ${missingAmount.toLocaleString('vi-VN')}đ để dùng mã`;
  else if (itemsTotal <= 0) reason = 'Thêm sản phẩm vào giỏ để dùng mã';
  else if (discountType === 'FREESHIP' && shippingFee === 0) reason = 'Đơn hàng đã được miễn phí vận chuyển';
  let amount = discountType === 'PERCENT' ? Math.round(itemsTotal * Math.min(100, v.discountValue) / 100) : v.discountValue;
  if (v.maxDiscount > 0) amount = Math.min(amount, v.maxDiscount);
  amount = Math.max(0, Math.min(amount, discountType === 'FREESHIP' ? shippingFee : itemsTotal));
  const savings = reason ? 0 : amount;
  return { code: v.code, title: v.title, description: v.description, discountType,
    discountValue: v.discountValue, minOrderValue: v.minOrderValue, maxDiscount: v.maxDiscount,
    expiresAt: v.expiresAt, usageLimit: v.usageLimit, usedCount: v.usedCount, requiredPoints: v.requiredPoints,
    eligible: !reason, reason, missingAmount, savings,
    itemDiscount: discountType === 'FREESHIP' ? 0 : savings,
    shippingDiscount: discountType === 'FREESHIP' ? savings : 0,
    totalAmount: Math.max(0, itemsTotal + shippingFee - savings) };
}
