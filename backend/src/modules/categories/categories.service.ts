import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from '../../database/schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async findAll() {
    return this.categoryModel.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).exec();
  }

  async findBySlug(slug: string) {
    const category = await this.categoryModel.findOne({ slug, isActive: true }).exec();
    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục: ${slug}`);
    }
    return category;
  }

  async create(createDto: CreateCategoryDto) {
    return this.categoryModel.create(createDto);
  }
}
