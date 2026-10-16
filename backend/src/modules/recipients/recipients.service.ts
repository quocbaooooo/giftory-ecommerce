import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash, randomUUID } from 'crypto';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { RecipientDto } from './recipient.dto';
import { normalizeAddress } from './address.rules';

@Injectable()
export class RecipientsService {
  constructor(@InjectModel(User.name) private readonly users: Model<UserDocument>) {}

  async list(userId: string) {
    const user = await this.users.findOne({ _id: userId, isActive: true }).select('recipients').exec();
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    return user.recipients || [];
  }

  async save(userId: string, dto: RecipientDto) {
    const address = normalizeAddress(dto);
    const key = createHash('sha256').update(JSON.stringify([
      dto.name.toLocaleLowerCase('vi'), dto.phone,
      address.provinceCode, address.wardCode, address.street.toLocaleLowerCase('vi'),
    ])).digest('hex');
    const recipient = { id: randomUUID(), key, name: dto.name, phone: dto.phone, ...address };
    const user = await this.users.findOneAndUpdate(
      { _id: userId, isActive: true, 'recipients.key': { $ne: key }, 'recipients.49': { $exists: false } },
      { $push: { recipients: recipient } }, { new: true },
    ).select('recipients').exec();
    if (user) return user.recipients;
    const existing = await this.list(userId);
    if (existing.some(item => item.key === key)) return existing;
    throw new BadRequestException('Danh bạ tối đa 50 người nhận. Vui lòng xóa người nhận không còn sử dụng.');
  }

  async remove(userId: string, id: string) {
    const user = await this.users.findOneAndUpdate(
      { _id: userId, isActive: true }, { $pull: { recipients: { id } } }, { new: true },
    ).select('recipients').exec();
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    return user.recipients || [];
  }
}
