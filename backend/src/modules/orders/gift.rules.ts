import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export const giftPhone = (value: unknown) => typeof value === 'string' ? value.replace(/[\s().-]/g, '').replace(/^\+?84/, '0') : '';
export function normalizeGift(input: any, recipient: any, card: any, method: string) {
  if (input == null || input.enabled === false) return null;
  if (input.enabled !== true) throw new BadRequestException('Lựa chọn gửi quà không hợp lệ');
  const name = typeof input.sender?.name === 'string' ? input.sender.name.trim().replace(/\s+/g, ' ') : '';
  const phone = giftPhone(input.sender?.phone);
  const email = typeof input.sender?.email === 'string' ? input.sender.email.trim().toLowerCase() : '';
  if (name.length < 2 || name.length > 100 || !/^0[35789]\d{8}$/.test(phone) || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new BadRequestException('Cần họ tên, số điện thoại và email hợp lệ của người đặt');
  if (typeof recipient?.name !== 'string' || recipient.name.trim().length < 2 || !/^0[35789]\d{8}$/.test(giftPhone(recipient?.phone)))
    throw new BadRequestException('Cần họ tên và số điện thoại hợp lệ của người nhận');
  if (phone === giftPhone(recipient?.phone)) throw new BadRequestException('Người nhận quà cần có số điện thoại riêng, khác người đặt');
  if (method === 'COD') throw new BadRequestException('Đơn gửi quà trực tiếp không hỗ trợ COD. Người đặt phải thanh toán trước 100%');
  if (!card || Array.from(card.message).length > 200) throw new BadRequestException('Đơn gửi quà cần thiệp và lời chúc tối đa 200 ký tự');
  const anonymous = input.anonymous === true;
  if (anonymous && `${card.heading} ${card.message}`.toLocaleLowerCase('vi').includes(name.toLocaleLowerCase('vi')))
    throw new BadRequestException('Thiệp ẩn danh không được chứa họ tên người đặt');
  const token = randomBytes(32).toString('base64url');
  return { enabled: true, sender: { name, phone, email }, anonymous, senderLabel: anonymous ? 'Giftory' : name,
    blindShipping: true, wrapIncluded: true, ribbonIncluded: true, financialOwner: 'BUYER',
    recipientAccessHash: giftTokenHash(token), recipientAccessToken: token, notifications: [], exception: null };
}
export function giftTokenHash(token: string) { return createHash('sha256').update(token).digest('hex'); }
export function validateGiftToken(order: any, token: string) {
  if (!order?.gift?.enabled || typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new NotFoundException('Link nhận quà không hợp lệ');
  const expected = Buffer.from(order.gift.recipientAccessHash || '', 'hex');
  const actual = Buffer.from(giftTokenHash(token), 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(expected, actual)) throw new NotFoundException('Link nhận quà không hợp lệ');
}
export function requireGiftPrepaid(order: any) {
  if (order.gift?.enabled && (order.paymentStatus !== 'PAID_FULL' || order.pricing.remainingCodAmount !== 0))
    throw new BadRequestException('Chưa thể bàn giao quà: người đặt phải thanh toán đủ 100%, người nhận không trả COD');
}
export function giftNotice(order: any, kind: string, text: string, audience: 'BUYER' | 'RECIPIENT' = 'BUYER') {
  if (!order.gift?.enabled) return;
  order.gift.notifications ||= [];
  order.gift.notifications.push({ id: randomBytes(8).toString('hex'), kind, text, audience,
    destination: audience === 'BUYER' ? order.gift.sender.email : order.customerInfo.phone,
    status: 'SIMULATED', timestamp: new Date() });
  order.markModified?.('gift');
}
// Deliberately whitelist fields. Never spread an order into a recipient or courier response.
export function giftRecipientView(order: any) {
  return { orderCode: order.orderCode, orderStatus: order.orderStatus,
    recipient: { name: order.customerInfo.name, phone: order.customerInfo.phone, address: order.customerInfo.address },
    senderLabel: order.gift.anonymous ? 'Giftory' : order.gift.sender.name,
    greetingCard: order.greetingCard ? { templateId: order.greetingCard.templateId, heading: order.greetingCard.heading, message: order.greetingCard.message } : null,
    items: order.items.map((item: any) => ({ id: String(item.productId), name: item.productName, image: item.productImage, variant: item.variantName, quantity: item.quantity })),
    wrapping: { giftWrap: true, ribbon: true }, hidePrices: true, collectPayment: false,
    delivery: { carrier: order.deliveryInfo?.carrier || order.shippingCarrier, trackingCode: ['IN_TRANSIT','SHIPPING','DELIVERED'].includes(order.orderStatus) ? order.trackingCode : '',
      needsReschedule: order.gift.exception?.status === 'AWAITING_BUYER' || order.gift.exception?.status === 'AWAITING_RECIPIENT',
      requestedWindow: order.gift.exception?.requestedWindow || '' } };
}
