import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
    if (type && type !== 'CLIPART') return [];
    return this.assetModel.find({ type: 'CLIPART', isActive: true }).sort({ order: 1, createdAt: -1 }).exec();
  }

  async getAllStudioAssetsAdmin() {
    return this.assetModel.find({ type: 'CLIPART' }).sort({ order: 1, createdAt: -1 }).exec();
  }

  async createStudioAsset(data: Partial<StudioAsset>) {
    const imageUrl = (data.imageUrl || data.icon || '').trim();
    if ((data.type && data.type !== 'CLIPART') || !/^(https:\/\/|data:image\/png;base64,)/i.test(imageUrl)) {
      throw new BadRequestException('Thư viện chỉ hỗ trợ clipart bằng hình ảnh.');
    }
    if (!data.name?.trim()) throw new BadRequestException('Vui lòng nhập tên clipart.');
    return this.assetModel.create({ ...data, name: data.name.trim(), type: 'CLIPART', icon: imageUrl, imageUrl });
  }

  async deleteStudioAsset(id: string) {
    const res = await this.assetModel.findByIdAndDelete(id);
    if (!res) throw new NotFoundException('Không tìm thấy clipart này');
    return { success: true, message: 'Đã xóa clipart thành công' };
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
