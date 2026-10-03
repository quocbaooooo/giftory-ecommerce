import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CustomDesign, CustomDesignDocument } from '../../database/schemas/custom-design.schema';
import { Product, ProductDocument } from '../../database/schemas/product.schema';
import { SaveDesignDto } from './dto/save-design.dto';

@Injectable()
export class CustomStudioService {
  constructor(
    @InjectModel(CustomDesign.name) private readonly designModel: Model<CustomDesignDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

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
      stickers: dto.stickers || [],
      previewImage: dto.previewImage || product.images[0] || '',
      customFee: dto.customFee || product.customBaseFee || 30000
    });

    return design;
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
