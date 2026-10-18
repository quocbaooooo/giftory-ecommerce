import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from '../../database/schemas/category.schema';
import { Product, ProductDocument } from '../../database/schemas/product.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryDisplaySettings, CategoryDisplaySettingsDocument } from '../../database/schemas/category-display-settings.schema';
import { CategoryDisplaySettingsDto } from './dto/category-display-settings.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(CategoryDisplaySettings.name) private readonly displaySettingsModel: Model<CategoryDisplaySettingsDocument>,
  ) {}

  async getDisplaySettings() {
    const settings = await this.displaySettingsModel.findOne({ key: 'storefront' }).lean().exec();
    return { allCategoriesIcon: settings?.allCategoriesIcon || '🎁' };
  }

  async updateDisplaySettings(dto: CategoryDisplaySettingsDto) {
    const settings = await this.displaySettingsModel.findOneAndUpdate(
      { key: 'storefront' },
      { $set: { allCategoriesIcon: dto.allCategoriesIcon.trim() } },
      { new: true, upsert: true, runValidators: true },
    ).lean().exec();
    return { allCategoriesIcon: settings.allCategoriesIcon };
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async findAll() {
    return this.categoryModel.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).exec();
  }

  async findAllAdmin(): Promise<any[]> {
    const categories = await this.categoryModel.find().sort({ order: 1, createdAt: 1 }).lean().exec();

    // Aggregate product counts per category
    const productCounts = await this.productModel.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const countMap = new Map<string, number>();
    for (const item of productCounts) {
      if (item._id) {
        countMap.set(item._id.toString(), item.count);
      }
    }

    return categories.map((cat) => ({
      ...cat,
      productCount: countMap.get(cat._id.toString()) || 0,
    }));
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID danh mục không hợp lệ');
    }
    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục với ID: ${id}`);
    }
    return category;
  }

  async findBySlug(slug: string) {
    const category = await this.categoryModel.findOne({ slug, isActive: true }).exec();
    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục: ${slug}`);
    }
    return category;
  }

  async create(createDto: CreateCategoryDto) {
    let slug = createDto.slug ? this.slugify(createDto.slug) : this.slugify(createDto.name);
    if (!slug) {
      slug = 'category-' + Date.now().toString().slice(-6);
    }

    const existing = await this.categoryModel.findOne({ slug }).exec();
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const newCategory = new this.categoryModel({
      name: createDto.name.trim(),
      slug,
      emoji: createDto.emoji?.trim() || '🎁',
      icon: createDto.icon?.trim() || 'category',
      description: createDto.description?.trim() || '',
      imageUrl: createDto.imageUrl?.trim() || '',
      order: createDto.order !== undefined ? Number(createDto.order) : 0,
      isActive: createDto.isActive !== undefined ? createDto.isActive : true,
    });

    return newCategory.save();
  }

  async update(id: string, updateDto: UpdateCategoryDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID danh mục không hợp lệ');
    }

    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục với ID: ${id}`);
    }

    if (updateDto.slug && updateDto.slug !== category.slug) {
      const cleanSlug = this.slugify(updateDto.slug);
      const existing = await this.categoryModel.findOne({ slug: cleanSlug, _id: { $ne: id } }).exec();
      if (existing) {
        throw new ConflictException(`Đường dẫn slug "${cleanSlug}" đã tồn tại trên một danh mục khác`);
      }
      category.slug = cleanSlug;
    } else if (updateDto.name && !updateDto.slug && !category.slug) {
      category.slug = this.slugify(updateDto.name);
    }

    if (updateDto.name !== undefined) category.name = updateDto.name.trim();
    if (updateDto.emoji !== undefined) category.emoji = updateDto.emoji.trim();
    if (updateDto.icon !== undefined) category.icon = updateDto.icon.trim();
    if (updateDto.description !== undefined) category.description = updateDto.description.trim();
    if (updateDto.imageUrl !== undefined) category.imageUrl = updateDto.imageUrl.trim();
    if (updateDto.order !== undefined) category.order = Number(updateDto.order);
    if (updateDto.isActive !== undefined) category.isActive = updateDto.isActive;

    return category.save();
  }

  async toggleActive(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID danh mục không hợp lệ');
    }
    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục với ID: ${id}`);
    }
    category.isActive = !category.isActive;
    return category.save();
  }

  async delete(id: string, force: boolean = false) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID danh mục không hợp lệ');
    }
    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục với ID: ${id}`);
    }

    const productCount = await this.productModel.countDocuments({ category: new Types.ObjectId(id) }).exec();
    if (productCount > 0 && !force) {
      throw new BadRequestException(
        `Không thể xóa danh mục "${category.name}" vì đang có ${productCount} sản phẩm liên kết. Vui lòng chuyển các sản phẩm sang danh mục khác trước khi xóa!`
      );
    }

    await this.categoryModel.findByIdAndDelete(id).exec();
    return { success: true, message: `Đã xóa danh mục "${category.name}" thành công` };
  }
}
