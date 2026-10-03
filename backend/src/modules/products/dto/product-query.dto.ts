import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductQueryDto {
  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm (hỗ trợ tiếng Việt)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Slug danh mục hoặc Category ID' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Lọc sản phẩm Bespoke (Customizable)' })
  @IsOptional()
  @IsString()
  isCustomizable?: string;

  @ApiPropertyOptional({ description: 'Lọc sản phẩm Flash Sale' })
  @IsOptional()
  @IsString()
  isFlashSale?: string;

  @ApiPropertyOptional({ description: 'Giá tối thiểu' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Giá tối đa' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Sắp xếp: latest, price_asc, price_desc, popular' })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 12;
}
