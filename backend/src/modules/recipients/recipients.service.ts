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

  private entry(dto: RecipientDto, id: string = randomUUID()) {
    const address = normalizeAddress(dto);
    const key = createHash('sha256').update(JSON.stringify([
      dto.name.toLocaleLowerCase('vi'), dto.phone,
      address.provinceCode, address.wardCode, address.street.toLocaleLowerCase('vi'),
      ...(dto.purpose === 'DELIVERY' ? ['DELIVERY'] : []),
    ])).digest('hex');
    return { id, key, purpose: dto.purpose || 'RECIPIENT', name: dto.name, phone: dto.phone, ...address };
  }

  async save(userId: string, dto: RecipientDto) {
    const recipient = this.entry(dto);
    const key = recipient.key;
    const user = await this.users.findOneAndUpdate(
      { _id: userId, isActive: true, 'recipients.key': { $ne: key }, 'recipients.49': { $exists: false } },
      { $push: { recipients: recipient } }, { new: true },
    ).select('recipients').exec();
    if (user) return user.recipients;
    const existing = await this.list(userId);
    if (existing.some(item => item.key === key)) return existing;
    throw new BadRequestException('Hồ sơ tối đa 50 địa chỉ và người nhận. Vui lòng xóa mục không còn sử dụng.');
  }

  async update(userId: string, id: string, dto: RecipientDto) {
    const recipient = this.entry(dto, id);
    const user = await this.users.findOneAndUpdate(
      { _id: userId, isActive: true, 'recipients.id': id, recipients: { $not: { $elemMatch: { key: recipient.key, id: { $ne: id } } } } },
      { $set: { 'recipients.$': recipient } }, { new: true, runValidators: true },
    ).select('recipients').exec();
    if (user) return user.recipients;
    const existing = await this.list(userId);
    if (!existing.some(item => item.id === id)) throw new NotFoundException('Không tìm thấy địa chỉ trong hồ sơ của bạn');
    throw new BadRequestException('Địa chỉ này đã có trong hồ sơ');
  }

  async remove(userId: string, id: string) {
    const user = await this.users.findOneAndUpdate(
      { _id: userId, isActive: true }, { $pull: { recipients: { id } } }, { new: true },
    ).select('recipients').exec();
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    return user.recipients || [];
  }
}
