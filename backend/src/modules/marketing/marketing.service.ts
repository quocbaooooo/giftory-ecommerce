import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MarketingCampaign, MarketingCampaignDocument } from '../../database/schemas/marketing-campaign.schema';

@Injectable()
export class MarketingService {
  constructor(@InjectModel(MarketingCampaign.name) private readonly campaigns: Model<MarketingCampaignDocument>) {}

  private cleanImageSources(items: any[]) {
    return items.map(item => ({ ...item, imageUrl: item.imageUrl?.startsWith('https://res.cloudinary.com/') || item.imageUrl?.startsWith('/assets/') ? item.imageUrl : '' }));
  }

  async listActive() {
    const now = new Date();
    const campaigns = await this.campaigns.find({ isActive: true,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $exists: false } }, { endsAt: { $gt: now } }] },
      ],
    }).sort({ sortOrder: 1, createdAt: -1 }).lean();
    return this.cleanImageSources(campaigns);
  }

  async listAll() {
    const campaigns = await this.campaigns.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
    return this.cleanImageSources(campaigns);
  }

  private validate(input: any) {
    if (!input || typeof input !== 'object') throw new BadRequestException('Thông tin chiến dịch không hợp lệ');
    for (const field of ['title', 'eyebrow', 'description', 'primaryLabel', 'primaryLink']) {
      if (typeof input[field] !== 'string' || !input[field].trim()) throw new BadRequestException(`Vui lòng nhập ${field}`);
    }
    for (const field of ['primaryLink', 'secondaryLink']) {
      const value = input[field];
      if (value && (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//'))) {
        throw new BadRequestException('Đường dẫn CTA phải là đường dẫn nội bộ bắt đầu bằng /');
      }
    }
    if (input.imageUrl && !(input.imageUrl.startsWith('https://res.cloudinary.com/') || input.imageUrl.startsWith('/assets/'))) {
      throw new BadRequestException('Ảnh campaign cần tải trực tiếp lên Cloudinary');
    }
    if (input.startsAt && input.endsAt && new Date(input.startsAt) >= new Date(input.endsAt)) throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu');
  }

  async create(input: any) {
    this.validate(input);
    return this.campaigns.create({ ...input, startsAt: input.startsAt || null, endsAt: input.endsAt || null });
  }

  async update(id: string, input: any) {
    this.validate(input);
    const updated = await this.campaigns.findByIdAndUpdate(id, { ...input, startsAt: input.startsAt || null, endsAt: input.endsAt || null }, { new: true, runValidators: true });
    if (!updated) throw new NotFoundException('Không tìm thấy chiến dịch');
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.campaigns.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Không tìm thấy chiến dịch');
    return { deleted: true };
  }
}
