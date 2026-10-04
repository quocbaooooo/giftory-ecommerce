import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm có phân trang, tìm kiếm và bộ lọc' })
  async findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get('flash-sale')
  @ApiOperation({ summary: 'Lấy danh sách các sản phẩm đang Flash Sale' })
  async getFlashSale() {
    return this.productsService.getFlashSaleProducts();
  }

  @Get('search-suggest')
  @ApiOperation({ summary: 'Gợi ý từ khóa và sản phẩm tìm kiếm thời gian thực (US-PD-01)' })
  async getSearchSuggestions(@Query('keyword') keyword: string) {
    return this.productsService.getSearchSuggestions(keyword || '');
  }

  @Get('best-sellers')
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm bán chạy nhất làm fallback (US-PD-01.3)' })
  async getBestSellers(@Query('limit') limit?: number) {
    return this.productsService.getBestSellers(limit ? Number(limit) : 4);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Lấy chi tiết sản phẩm theo slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết sản phẩm theo ID' })
  async findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo sản phẩm mới (Chỉ Admin)' })
  async create(@Body() createDto: CreateProductDto) {
    return this.productsService.create(createDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật thông tin sản phẩm (Chỉ Admin)' })
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.productsService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa sản phẩm (Chỉ Admin)' })
  async delete(@Param('id') id: string) {
    return this.productsService.delete(id);
  }
}
