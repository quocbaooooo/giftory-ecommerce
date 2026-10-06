import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CustomDesign, CustomDesignDocument } from '../../database/schemas/custom-design.schema';
import { Product, ProductDocument } from '../../database/schemas/product.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { StudioAsset, StudioAssetDocument } from '../../database/schemas/studio-asset.schema';
import { SaveDesignDto } from './dto/save-design.dto';

@Injectable()
export class CustomStudioService {
  constructor(
    @InjectModel(CustomDesign.name) private readonly designModel: Model<CustomDesignDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(StudioAsset.name) private readonly assetModel: Model<StudioAssetDocument>,
  ) {}

  async getStudioAssets(type?: string) {
    const count = await this.assetModel.countDocuments();
    if (count === 0) {
      // Seed initial stickers
      const initialStickers = [
        { name: 'Trái tim', icon: '❤️', type: 'STICKER', category: 'Tình yêu', surcharge: 0 },
        { name: 'Tim đôi', icon: '💖', type: 'STICKER', category: 'Tình yêu', surcharge: 0 },
        { name: 'Tinh tú', icon: '✨', type: 'STICKER', category: 'Lấp lánh', surcharge: 0 },
        { name: 'Vương miện', icon: '👑', type: 'STICKER', category: 'Sang trọng', surcharge: 0 },
        { name: 'Nơ quà', icon: '🎀', type: 'STICKER', category: 'Kỷ niệm', surcharge: 0 },
        { name: 'Bánh kem', icon: '🎂', type: 'STICKER', category: 'Sinh nhật', surcharge: 0 },
        { name: 'Hộp quà', icon: '🎁', type: 'STICKER', category: 'Kỷ niệm', surcharge: 0 },
        { name: 'Nâng ly', icon: '🥂', type: 'STICKER', category: 'Tiệc tùng', surcharge: 0 },
        { name: 'Cỏ 4 lá', icon: '🍀', type: 'STICKER', category: 'May mắn', surcharge: 0 },
        { name: 'Hoa đào', icon: '🌸', type: 'STICKER', category: 'Hoa cỏ', surcharge: 0 },
        { name: 'Kim cương', icon: '💎', type: 'STICKER', category: 'Sang trọng', surcharge: 0 },
        { name: 'Ngọn lửa', icon: '🔥', type: 'STICKER', category: 'Nhiệt huyết', surcharge: 0 },
        { name: 'Hoa sen', icon: '🪷', type: 'STICKER', category: 'Thanh lịch', surcharge: 0 },
        { name: 'Cung trăng', icon: '🌙', type: 'STICKER', category: 'Thiên hà', surcharge: 0 },
        { name: 'Bướm xuân', icon: '🦋', type: 'STICKER', category: 'Hoa cỏ', surcharge: 0 }
      ];
      await this.assetModel.insertMany(initialStickers);
    }

    const query: any = { isActive: true };
    if (type) query.type = type;
    return this.assetModel.find(query).sort({ order: 1, createdAt: -1 }).exec();
  }

  async getAllStudioAssetsAdmin() {
    return this.assetModel.find().sort({ type: 1, order: 1, createdAt: -1 }).exec();
  }

  async createStudioAsset(data: Partial<StudioAsset>) {
    return this.assetModel.create(data);
  }

  async deleteStudioAsset(id: string) {
    const res = await this.assetModel.findByIdAndDelete(id);
    if (!res) throw new NotFoundException('Không tìm thấy icon/asset này');
    return { success: true, message: 'Đã xóa icon/asset thành công' };
  }

  async getCustomizableTemplates() {
    return this.productModel
      .find({ isCustomizable: true, status: 'ACTIVE' })
      .populate('category', 'name slug emoji icon')
      .exec();
  }

  async saveDesign(dto: SaveDesignDto, userId?: string) {
    const product = await this.productModel.findById(dto.productId);
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm phôi tương ứng');
    }

    const design = await this.designModel.create({
      userId: userId ? new Types.ObjectId(userId) : undefined,
      sessionId: dto.sessionId || '',
      productId: new Types.ObjectId(dto.productId),
      title: dto.title || `Thiết kế ${product.name}`,
      frontMessage: dto.frontMessage || '',
      backMessage: dto.backMessage || '',
      fontFamily: dto.fontFamily || 'Signature',
      engraveColor: dto.engraveColor || 'Gold',
      selectedColor: dto.selectedColor || 'Navy Blue',
      pattern: dto.pattern || 'none',
      uploadedImage: dto.uploadedImage || '',
      imageScale: dto.imageScale !== undefined ? dto.imageScale : 1,
      stickers: dto.stickers || [],
      previewImage: dto.previewImage || dto.frontPreviewImage || product.images[0] || '',
      frontPreviewImage: dto.frontPreviewImage || dto.previewImage || product.images[0] || '',
      backPreviewImage: dto.backPreviewImage || '',
      customFee: dto.customFee !== undefined ? dto.customFee : (product.customBaseFee || 30000),
      surcharges: dto.surcharges || {},
      isDraft: dto.isDraft || false
    });

    return design;
  }

  async syncDesignDraft(dto: SaveDesignDto, userId: string) {
    const design = await this.saveDesign({ ...dto, isDraft: false }, userId);
    
    // Cộng 50 điểm thưởng tích lũy theo AC12
    const bonusPoints = 50;
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $inc: { loyaltyPoints: bonusPoints } },
      { new: true }
    );

    return {
      success: true,
      design,
      bonusPoints,
      currentPoints: user?.loyaltyPoints || 0,
      message: 'Đã đồng bộ bản thiết kế thành công vào tài khoản và cộng 50 điểm thưởng!'
    };
  }

  async getMyDesigns(userId?: string, sessionId?: string) {
    const query: any = {};
    if (userId) {
      query.userId = new Types.ObjectId(userId);
    } else if (sessionId) {
      query.sessionId = sessionId;
    } else {
      return [];
    }

    return this.designModel
      .find(query)
      .populate('productId', 'name slug price images customBaseFee')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getDesignById(id: string) {
    const design = await this.designModel
      .findById(id)
      .populate('productId')
      .exec();
    if (!design) {
      throw new NotFoundException(`Không tìm thấy bản thiết kế ID: ${id}`);
    }
    return design;
  }
}
