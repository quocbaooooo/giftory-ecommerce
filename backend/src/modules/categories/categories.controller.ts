import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { CategoryDisplaySettingsDto } from './dto/category-display-settings.dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả danh mục sản phẩm đang hoạt động' })
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy toàn bộ danh mục cho Admin (kèm số lượng sản phẩm)' })
  async findAllAdmin(): Promise<any[]> {
    return this.categoriesService.findAllAdmin();
  }

  @Get('display-settings')
  @ApiOperation({ summary: 'Lấy cấu hình biểu tượng nút Tất cả danh mục' })
  getDisplaySettings() {
    return this.categoriesService.getDisplaySettings();
  }

  @Patch('display-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  updateDisplaySettings(@Body() dto: CategoryDisplaySettingsDto) {
    return this.categoriesService.updateDisplaySettings(dto);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Lấy chi tiết danh mục theo slug hoặc ID' })
  async findBySlug(@Param('slug') slug: string) {
    if (Types.ObjectId.isValid(slug)) {
      try {
        return await this.categoriesService.findById(slug);
      } catch {}
    }
    return this.categoriesService.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo danh mục mới (Chỉ Admin)' })
  async create(@Body() createDto: CreateCategoryDto) {
    return this.categoriesService.create(createDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật danh mục (Chỉ Admin)' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bật/tắt trạng thái hoạt động danh mục (Chỉ Admin)' })
  async toggleStatus(@Param('id') id: string) {
    return this.categoriesService.toggleActive(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa danh mục (Chỉ Admin)' })
  async delete(@Param('id') id: string, @Query('force') force?: string) {
    return this.categoriesService.delete(id, force === 'true');
  }
}
