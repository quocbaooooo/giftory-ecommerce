import { BadRequestException } from '@nestjs/common';
export const BEFORE_CONFIRMATION = ['PENDING', 'AWAITING_CONFIRMATION'];
export function canCancel(order: any) {
  return (
    BEFORE_CONFIRMATION.includes(order.orderStatus) &&
    !order.confirmationWait?.confirmedAt
  );
}
export function paidAmount(order: any) {
  if (order.paymentStatus === 'PAID_FULL') return order.pricing.totalAmount;
  if (order.paymentStatus === 'PARTIALLY_PAID_DEPOSIT_50')
    return order.pricing.depositAmount;
  return 0;
}
export function reviewDueAt(deliveredAt: Date) {
  return new Date(deliveredAt.getTime() + 48 * 3600000);
}
export function supportAvailability(now = new Date()) {
  const local = new Date(now.getTime() + 7 * 3600000);
  const hour = local.getUTCHours();
  if (hour >= 8 && hour < 22) return { status: 'OPEN', availableAt: now };
  if (hour >= 22) local.setUTCDate(local.getUTCDate() + 1);
  local.setUTCHours(8, 0, 0, 0);
  return {
    status: 'QUEUED',
    availableAt: new Date(local.getTime() - 7 * 3600000),
  };
}
export function requiredText(
  value: unknown,
  name: string,
  min = 1,
  max = 5000,
): string {
  if (
    typeof value !== 'string' ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw new BadRequestException(`${name}: cần từ ${min} đến ${max} ký tự`);
  return value.trim();
}
export function attachmentMime(buffer: Buffer): string {
  if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return 'image/png';
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255)
    return 'image/jpeg';
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  )
    return 'image/webp';
  if (buffer.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf';
  if (
    buffer.toString('ascii', 4, 8) === 'ftyp' &&
    ['isom', 'mp42', 'mp41', 'avc1', 'M4V '].includes(
      buffer.toString('ascii', 8, 12),
    )
  )
    return 'video/mp4';
  throw new BadRequestException(
    'Chỉ nhận PNG, JPEG, WEBP, MP4 hoặc PDF có định dạng hợp lệ',
  );
}
