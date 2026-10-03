import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { Voucher, VoucherDocument } from '../../database/schemas/voucher.schema';
import { LoyaltyTransaction, LoyaltyTransactionDocument } from '../../database/schemas/loyalty-transaction.schema';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Voucher.name) private readonly voucherModel: Model<VoucherDocument>,
    @InjectModel(LoyaltyTransaction.name) private readonly loyaltyModel: Model<LoyaltyTransactionDocument>,
  ) {}

  async getLoyaltySummary(userId: string) {
    const user = await this.userModel.findById(userId).select('name email loyaltyPoints loyaltyTier avatar');
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    const transactions = await this.loyaltyModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();

    const redeemableVouchers = await this.voucherModel.find({
      isActive: true,
      requiredPoints: { $gt: 0 },
      expiresAt: { $gte: new Date() }
    }).exec();

    return {
      points: user.loyaltyPoints,
      tier: user.loyaltyTier,
      user,
      transactions,
      redeemableVouchers
    };
  }

  async claimCode(userId: string, code: string) {
    const cleanCode = code.trim().toUpperCase();
    // Simulate valid points vouchers / gift codes from workshop
    let pointsToAdd = 50;
    if (cleanCode.startsWith('VIP')) pointsToAdd = 200;
    else if (cleanCode.startsWith('GIFT')) pointsToAdd = 100;

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    // Check if code was already claimed
    const existing = await this.loyaltyModel.findOne({
      userId: user._id,
      referenceId: cleanCode
    });
    if (existing) {
      throw new BadRequestException('Mã tích điểm này đã được sử dụng');
    }

    user.loyaltyPoints += pointsToAdd;
    // Auto upgrade tier
    if (user.loyaltyPoints >= 1000) user.loyaltyTier = 'DIAMOND';
    else if (user.loyaltyPoints >= 500) user.loyaltyTier = 'GOLD';
    else if (user.loyaltyPoints >= 200) user.loyaltyTier = 'SILVER';

    await user.save();

    const txn = await this.loyaltyModel.create({
      userId: user._id,
      type: 'CLAIM_CODE',
      points: pointsToAdd,
      balanceAfter: user.loyaltyPoints,
      description: `Nhập mã tích điểm thành công: ${cleanCode}`,
      referenceId: cleanCode
    });

    return {
      message: `Tích lũy thành công +${pointsToAdd} điểm vào tài khoản!`,
      currentPoints: user.loyaltyPoints,
      transaction: txn
    };
  }

  async redeemVoucher(userId: string, voucherId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    const voucher = await this.voucherModel.findById(voucherId);
    if (!voucher || !voucher.isActive) {
      throw new NotFoundException('Voucher không còn khả dụng');
    }

    if (voucher.requiredPoints <= 0) {
      throw new BadRequestException('Voucher này không yêu cầu đổi điểm');
    }

    if (user.loyaltyPoints < voucher.requiredPoints) {
      throw new BadRequestException(`Bạn cần tối thiểu ${voucher.requiredPoints} điểm để đổi voucher này (Hiện có: ${user.loyaltyPoints} điểm)`);
    }

    user.loyaltyPoints -= voucher.requiredPoints;
    await user.save();

    await this.loyaltyModel.create({
      userId: user._id,
      type: 'REDEEM',
      points: -voucher.requiredPoints,
      balanceAfter: user.loyaltyPoints,
      description: `Đổi voucher ${voucher.code} (-${voucher.requiredPoints} điểm)`,
      referenceId: voucher.code
    });

    return {
      message: `Đổi voucher ${voucher.code} thành công!`,
      voucherCode: voucher.code,
      remainingPoints: user.loyaltyPoints
    };
  }
}
