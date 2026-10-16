import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Voucher, VoucherDocument } from '../../database/schemas/voucher.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { LoyaltyTransaction, LoyaltyTransactionDocument } from '../../database/schemas/loyalty-transaction.schema';
import { evaluateVoucher } from './voucher.rules';

@Injectable()
export class VouchersService {
  constructor(
    @InjectModel(Voucher.name) private vouchers: Model<VoucherDocument>,
    @InjectModel(User.name) private users: Model<UserDocument>,
    @InjectModel(LoyaltyTransaction.name) private transactions: Model<LoyaltyTransactionDocument>,
  ) {}
  normalize(code: unknown): string {
    if (typeof code !== 'string' || code.length > 80) throw new BadRequestException('Mã ưu đãi không hợp lệ');
    return code.trim().toUpperCase();
  }
  private async unlocked(v: any, userId?: string) {
    return !v.requiredPoints || !!(userId && await this.transactions.exists({ userId: new Types.ObjectId(userId), type: 'REDEEM', referenceId: v.code,
      $or: [{ voucherOrderCode: '' }, { voucherOrderCode: { $exists: false } }],
    }));
  }
  async quote(code: string, total: number, shipping: number, userId?: string) {
    const v = await this.vouchers.findOne({ code: this.normalize(code) }).lean();
    if (!v) throw new BadRequestException('Mã ưu đãi không tồn tại');
    return evaluateVoucher(v, total, shipping, await this.unlocked(v, userId));
  }
  async list(total = 0, shipping = 0, userId?: string) {
    const [vouchers, user] = await Promise.all([
      this.vouchers.find({ isActive: true, expiresAt: { $gt: new Date() } }).sort({ code: 1 }).lean(),
      userId ? this.users.findById(userId).select('savedVoucherCodes').lean() : null,
    ]);
    const quotes = await Promise.all(vouchers.map(async v => ({
      ...evaluateVoucher(v, total, shipping, await this.unlocked(v, userId)),
      saved: user?.savedVoucherCodes?.includes(v.code) || false,
    })));
    quotes.sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.savings - a.savings || Number(b.saved) - Number(a.saved) || a.code.localeCompare(b.code));
    const best = quotes.find(v => v.eligible && v.savings > 0)?.code;
    return quotes.map(v => ({ ...v, recommended: v.code === best }));
  }
  async save(code: string, userId: string) {
    const normalized = this.normalize(code);
    const v = await this.vouchers.findOne({ code: normalized, isActive: true, expiresAt: { $gt: new Date() } });
    if (!v || v.usedCount >= v.usageLimit) throw new BadRequestException('Mã không còn khả dụng');
    await this.users.updateOne({ _id: userId }, { $addToSet: { savedVoucherCodes: normalized } });
    return { code: normalized, saved: true };
  }
  async reserve(code: string, total: number, shipping: number, userId?: string, orderCode?: string) {
    const quote = await this.quote(code, total, shipping, userId);
    if (!quote.eligible) throw new BadRequestException(quote.reason);
    const reserved = await this.vouchers.findOneAndUpdate({ code: quote.code, isActive: true,
      expiresAt: { $gt: new Date() }, $expr: { $lt: ['$usedCount', '$usageLimit'] },
    }, { $inc: { usedCount: 1 } }, { new: true });
    if (!reserved) throw new BadRequestException('Mã vừa hết lượt hoặc hết hạn. Vui lòng chọn mã khác.');
    if (quote.requiredPoints) {
      try {
        if (!orderCode) throw new BadRequestException('Thiếu mã đơn hàng cho lượt đổi điểm');
        const redemption = await this.transactions.findOneAndUpdate({ userId: new Types.ObjectId(userId), type: 'REDEEM', referenceId: quote.code,
          $or: [{ voucherOrderCode: '' }, { voucherOrderCode: { $exists: false } }],
        }, { $set: { voucherOrderCode: orderCode } });
        if (!redemption) throw new BadRequestException('Lượt đổi điểm này đã được dùng. Vui lòng đổi mã mới.');
      } catch (error) {
        await this.release(quote.code);
        throw error;
      }
    }
    return quote;
  }
  async release(code: string, orderCode?: string) {
    await this.vouchers.updateOne({ code, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
    if (orderCode) await this.transactions.updateOne({ referenceId: code, voucherOrderCode: orderCode }, { $set: { voucherOrderCode: '' } });
  }
}
