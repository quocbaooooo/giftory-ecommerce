import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../../database/schemas/product.schema';
import { Category, CategoryDocument } from '../../database/schemas/category.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { catalogMetadataRegex, normalizeProductMetadata } from '../../common/utils/catalog-metadata';
import { buildVietnameseRegex } from '../../common/utils/vietnamese.util';
import { isStudioSupportedProduct, supportsCustomization } from '../../common/utils/studio-support';

// Cards and deal lists do not need Studio images, SKU galleries, or category icon payloads.
const CATALOG_FIELDS = {
  name: 1, slug: 1, description: 1, price: 1, salePrice: 1, category: 1,
  stock: 1, isCustomizable: 1, isFlashSale: 1, flashSaleDiscountPercent: 1,
  supportsCustomization: 1, studioSupported: 1, audience: 1, occasions: 1,
  rating: 1, reviewCount: 1, soldCount: 1, customBaseFee: 1, createdAt: 1,
};
const CATALOG_PROJECTION = { ...CATALOG_FIELDS, images: { $slice: 1 } };

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async exportAll() {
    // Do not use the public, ACTIVE-only and paginated catalog for backups.
    return this.productModel.find().populate('category', 'name slug').lean().exec();
  }

  async importAll(rows: unknown) {
    if (!Array.isArray(rows) || !rows.length || rows.length > 5000) {
      throw new BadRequestException('Tệp phải chứa từ 1 đến 5000 sản phẩm.');
    }
    const categories = await this.categoryModel.find().lean().exec();
    const fields = Object.keys(this.productModel.schema.paths).filter(key => !['_id', '__v', 'createdAt', 'updatedAt'].includes(key));
    const prepared: Array<{ doc: any; existing: boolean; row: number }> = [];
    const errors: Array<{ row: number; message: string }> = [];
    const identities = new Set<string>();
    for (let index = 0; index < rows.length; index++) {
      try {
        const row = rows[index];
        if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Dữ liệu sản phẩm không hợp lệ.');
        const data = row as Record<string, any>;
        const category = categories.find((cat: any) => String(cat._id) === String(data.categoryId || data.category))
          || categories.find((cat: any) => data.categorySlug && cat.slug === data.categorySlug);
        if (!category) throw new Error('Danh mục không tồn tại. Hãy tạo danh mục trước khi nhập.');
        if (!data.name || !String(data.name).trim()) throw new Error('Thiếu tên sản phẩm.');
        if (typeof data.price !== 'number' || !Number.isFinite(data.price) || data.price < 0) throw new Error('Giá phải là số không âm.');
        if (data._id && !Types.ObjectId.isValid(data._id)) throw new Error('ID sản phẩm không hợp lệ.');
        let existing = data._id ? await this.productModel.findById(data._id) : null;
        if (!existing && data.slug) existing = await this.productModel.findOne({ slug: data.slug });
        if (!existing && data.sku) {
          const matches = await this.productModel.find({ sku: data.sku }).limit(2);
          if (matches.length > 1) throw new Error('SKU trùng nhiều sản phẩm; cần ID hoặc slug.');
          existing = matches[0] || null;
        }
        const payload: Record<string, any> = {};
        for (const field of fields) if (Object.prototype.hasOwnProperty.call(data, field)) payload[field] = data[field];
        // Older exports have blank optional enums. Blank means keep the stored value,
        // or use the schema default for a new/legacy product, never an empty enum.
        for (const field of ['packagingSize', 'status']) {
          if (payload[field] == null || (typeof payload[field] === 'string' && !payload[field].trim())) delete payload[field];
          else if (typeof payload[field] === 'string') payload[field] = payload[field].trim();
        }
        normalizeProductMetadata(payload);
        payload.category = category._id;
        if (!payload.slug && !existing) payload.slug = `${String(data.name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${new Types.ObjectId()}`;
        const doc = existing || new this.productModel(data._id ? { _id: data._id } : {});
        doc.set(payload);
        if (!doc.packagingSize) doc.packagingSize = 'MEDIUM';
        if (!doc.status) doc.status = 'ACTIVE';
        await doc.validate();
        const keys = [`id:${doc._id}`, `slug:${doc.slug}`];
        if (keys.some(key => identities.has(key))) throw new Error('Sản phẩm xuất hiện nhiều lần trong tệp.');
        const slugOwner = await this.productModel.findOne({ slug: doc.slug });
        if (slugOwner && String(slugOwner._id) !== String(doc._id)) throw new Error('Slug đã thuộc sản phẩm khác.');
        keys.forEach(key => identities.add(key));
        prepared.push({ doc, existing: !!existing, row: index + 2 });
      } catch (error: any) {
        errors.push({ row: index + 2, message: error.message });
      }
    }
    // Validate the entire file before writing any row.
    if (errors.length) return { created: 0, updated: 0, errors };
    let created = 0, updated = 0;
    for (const entry of prepared) {
      try {
        await entry.doc.save();
        entry.existing ? updated++ : created++;
      } catch (error: any) {
        errors.push({ row: entry.row, message: error.message });
      }
    }
    return { created, updated, errors };
  }

  async findAll(query: ProductQueryDto) {
    const catalog = query.view === 'catalog';
    const categoryFields = catalog ? 'name slug' : 'name slug emoji icon';
    const filter: any = { status: 'ACTIVE' };

    // Search by Vietnamese keyword in name, description, or tags with unaccented support
    if (query.search && query.search.trim()) {
      const searchRegex = buildVietnameseRegex(query.search.trim());
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
        { audience: searchRegex },
        { occasions: searchRegex }
      ];
    }

    // Structured metadata is authoritative for both storefront filters and chatbot matching.
    if (query.occasion?.trim()) filter.occasions = catalogMetadataRegex(query.occasion, 'occasion');
    if (query.recipient?.trim()) filter.audience = catalogMetadataRegex(query.recipient, 'audience');

    // Tags filter
    if (query.tags && query.tags.trim()) {
      const tagRegex = buildVietnameseRegex(query.tags.trim());
      filter.tags = tagRegex;
    }

    // Minimum rating filter
    if (query.minRating !== undefined && !isNaN(Number(query.minRating))) {
      filter.rating = { $gte: Number(query.minRating) };
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

    // Match the storefront: use a positive sale price, otherwise the base price.
    const sellingPrice = {
      $cond: [{ $gt: [{ $ifNull: ['$salePrice', 0] }, 0] }, '$salePrice', '$price'],
    };

    // Apply the same price expression to filtering and counting results.
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      const priceConditions: any[] = [];
      if (query.minPrice !== undefined) priceConditions.push({ $gte: [sellingPrice, Number(query.minPrice)] });
      if (query.maxPrice !== undefined) priceConditions.push({ $lte: [sellingPrice, Number(query.maxPrice)] });
      filter.$expr = { $and: priceConditions };
    }

    // Sort
    let sortOption: any = { createdAt: -1 };
    if (query.sort === 'price_asc') sortOption = { __sellingPrice: 1, _id: 1 };
    else if (query.sort === 'price_desc') sortOption = { __sellingPrice: -1, _id: 1 };
    else if (query.sort === 'popular') sortOption = { soldCount: -1, rating: -1 };
    else if (query.sort === 'rating') sortOption = { rating: -1, reviewCount: -1 };
    else if (query.sort === 'newest') sortOption = { createdAt: -1 };

    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query.limit || 12)));
    const skip = (page - 1) * limit;

    // Sort before pagination so prices remain ordered across page boundaries.
    const itemsQuery = query.sort === 'price_asc' || query.sort === 'price_desc'
      ? this.productModel.aggregate([
          { $match: filter },
          { $addFields: { __sellingPrice: sellingPrice } },
          { $sort: sortOption },
          { $skip: skip },
          { $limit: limit },
          { $project: catalog ? { ...CATALOG_FIELDS, images: { $slice: ['$images', 1] } } : { __sellingPrice: 0 } },
        ]).exec().then(products => this.productModel.populate(products, { path: 'category', select: categoryFields }))
      : this.productModel
        .find(filter)
        .select(catalog ? CATALOG_PROJECTION : undefined)
        .populate('category', categoryFields)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(catalog)
        .exec();

    const [items, total] = await Promise.all([
      itemsQuery,
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

  async getSearchSuggestions(keyword: string) {
    if (!keyword || keyword.trim().length < 2) {
      return { products: [], keywords: [] };
    }

    const regex = buildVietnameseRegex(keyword.trim());
    
    // Find up to 5 matching products
    const products = await this.productModel
      .find({
        status: 'ACTIVE',
        $or: [{ name: regex }, { description: regex }, { tags: regex }, { audience: regex }, { occasions: regex }]
      })
      .select('name slug price salePrice images rating isCustomizable category')
      .populate('category', 'name slug')
      .sort({ soldCount: -1, rating: -1 })
      .limit(5)
      .exec();

    // Suggest 3-5 popular keywords/tags matching
    const sampleKeywords = [
      'Bình giữ nhiệt khắc tên',
      'Hộp quà sinh nhật',
      'Bút ký kim loại cao cấp',
      'Ví da khắc tên',
      'Đèn ngủ 3D khắc chân dung',
      'Cốc sứ in hình',
      'Sổ tay bìa da khắc laser',
      'Set quà tặng doanh nghiệp',
      'Vòng tay handmade'
    ];

    const matchingKeywords = sampleKeywords
      .filter(k => regex.test(k))
      .slice(0, 4);

    // If matching keywords < 3, add popular default suggestions
    if (matchingKeywords.length < 3) {
      for (const kw of sampleKeywords) {
        if (!matchingKeywords.includes(kw)) {
          matchingKeywords.push(kw);
          if (matchingKeywords.length >= 3) break;
        }
      }
    }

    return {
      products,
      keywords: matchingKeywords
    };
  }

  async getBestSellers(limit = 4, catalog = false) {
    return this.productModel
      .find({ status: 'ACTIVE' })
      .select(catalog ? CATALOG_PROJECTION : undefined)
      .populate('category', catalog ? 'name slug' : 'name slug emoji icon')
      .sort({ soldCount: -1, rating: -1, createdAt: -1 })
      .limit(Number(limit) || 4)
      .lean(catalog)
      .exec();
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
      supportsCustomization: supportsCustomization(product),
      studioSupported: isStudioSupportedProduct(product),
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

  async getFlashSaleProducts(catalog = false) {
    return this.productModel
      .find({ isFlashSale: true, status: 'ACTIVE' })
      .select(catalog ? CATALOG_PROJECTION : undefined)
      .populate('category', catalog ? 'name slug' : 'name slug emoji icon')
      .sort({ flashSaleDiscountPercent: -1 })
      .limit(10)
      .lean(catalog)
      .exec();
  }

  async create(createDto: CreateProductDto) {
    normalizeProductMetadata(createDto);
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

    if (createDto.variants && createDto.variants.length > 0) {
      const totalStock = createDto.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
      createDto.stock = totalStock;
      createDto.variants = createDto.variants.map(v => ({
        ...v,
        stock: Number(v.stock) || 0,
        price: Number(v.price) || createDto.price,
        status: Number(v.stock) <= 0 ? (v.status === 'HIDDEN' ? 'HIDDEN' : 'OUT_OF_STOCK') : (v.status || 'ACTIVE')
      }));

    }

    return this.productModel.create({
      ...createDto,
      supportsCustomization: createDto.supportsCustomization ?? createDto.isCustomizable ?? false,
      studioSupported: createDto.studioSupported ?? false,
      audience: createDto.audience || [],
      occasions: createDto.occasions || [],
      slug,
      category: categoryId,
      images,
      status: 'ACTIVE'
    });
  }

  async update(id: string, updateDto: any) {
    normalizeProductMetadata(updateDto);
    if (updateDto.packagingSize !== undefined && !['SMALL', 'MEDIUM', 'LARGE', 'OVERSIZED'].includes(updateDto.packagingSize)) throw new BadRequestException('Kích thước đóng gói không hợp lệ.');
    if (updateDto.packagingUnits != null && (!Number.isFinite(Number(updateDto.packagingUnits)) || Number(updateDto.packagingUnits) < 1)) throw new BadRequestException('Dung tích quy đổi phải lớn hơn hoặc bằng 1.');
    if (updateDto.supportsCustomization === undefined && updateDto.isCustomizable !== undefined) {
      updateDto.supportsCustomization = updateDto.isCustomizable;
    }
    if (updateDto.variants && updateDto.variants.length > 0) {
      const totalStock = updateDto.variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
      updateDto.stock = totalStock;
      updateDto.variants = updateDto.variants.map((v: any) => ({
        ...v,
        stock: Number(v.stock) || 0,
        price: Number(v.price) || updateDto.price,
        status: Number(v.stock) <= 0 ? (v.status === 'HIDDEN' ? 'HIDDEN' : 'OUT_OF_STOCK') : (v.status || 'ACTIVE')
      }));

    }

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
