import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../../database/schemas/product.schema';
import { Category, CategoryDocument } from '../../database/schemas/category.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async findAll(query: ProductQueryDto) {
    const filter: any = { status: 'ACTIVE' };

    // Search by Vietnamese keyword in name, description, or tags
    if (query.search && query.search.trim()) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { tags: searchRegex }
      ];
    }

    // Category filter (support slug or ObjectId)
    if (query.category) {
      if (Types.ObjectId.isValid(query.category)) {
        filter.category = new Types.ObjectId(query.category);
      } else {
        const cat = await this.categoryModel.findOne({ slug: query.category });
        if (cat) {
          filter.category = cat._id;
        }
      }
    }

    // Customizable filter
    if (query.isCustomizable !== undefined) {
      filter.isCustomizable = query.isCustomizable === 'true' || query.isCustomizable === true as any;
    }

    // Flash sale filter
    if (query.isFlashSale !== undefined) {
      filter.isFlashSale = query.isFlashSale === 'true' || query.isFlashSale === true as any;
    }

    // Price range
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.price = {};
      if (query.minPrice !== undefined) filter.price.$gte = Number(query.minPrice);
      if (query.maxPrice !== undefined) filter.price.$lte = Number(query.maxPrice);
    }

    // Sort
    let sortOption: any = { createdAt: -1 };
    if (query.sort === 'price_asc') sortOption = { price: 1 };
    else if (query.sort === 'price_desc') sortOption = { price: -1 };
    else if (query.sort === 'popular') sortOption = { soldCount: -1, rating: -1 };

    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query.limit || 12)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate('category', 'name slug emoji icon')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findBySlug(slug: string) {
    const product = await this.productModel
      .findOne({ slug, status: 'ACTIVE' })
      .populate('category', 'name slug emoji icon')
      .exec();

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm: ${slug}`);
    }

    // Get related products in same category
    const related = await this.productModel
      .find({
        category: product.category,
        _id: { $ne: product._id },
        status: 'ACTIVE'
      })
      .limit(4)
      .exec();

    return {
      ...product.toObject(),
      relatedProducts: related
    };
  }

  async findById(id: string) {
    const product = await this.productModel.findById(id).populate('category').exec();
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm ID: ${id}`);
    }
    return product;
  }

  async getFlashSaleProducts() {
    return this.productModel
      .find({ isFlashSale: true, status: 'ACTIVE' })
      .populate('category', 'name slug emoji icon')
      .sort({ flashSaleDiscountPercent: -1 })
      .limit(10)
      .exec();
  }

  async create(createDto: CreateProductDto) {
    let slug = createDto.slug;
    if (!slug || !slug.trim()) {
      slug = createDto.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4);
    }

    let categoryId: any;
    if (createDto.category && Types.ObjectId.isValid(createDto.category)) {
      categoryId = new Types.ObjectId(createDto.category);
    } else if (createDto.category) {
      const foundCat = await this.categoryModel.findOne({ slug: createDto.category });
      categoryId = foundCat ? foundCat._id : (await this.categoryModel.findOne())?._id;
    } else {
      const firstCat = await this.categoryModel.findOne();
      categoryId = firstCat?._id;
    }

    const images = createDto.images && createDto.images.length > 0
      ? createDto.images
      : ['https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600'];

    return this.productModel.create({
      ...createDto,
      slug,
      category: categoryId,
      images,
      status: 'ACTIVE'
    });
  }

  async update(id: string, updateDto: any) {
    const updated = await this.productModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Không tìm thấy sản phẩm ID: ${id}`);
    }
    return updated;
  }

  async delete(id: string) {
    const deleted = await this.productModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Không tìm thấy sản phẩm ID: ${id}`);
    }
    return { message: 'Đã xóa sản phẩm thành công' };
  }
}
