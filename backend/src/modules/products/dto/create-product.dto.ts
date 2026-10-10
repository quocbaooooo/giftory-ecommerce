import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Bình Giữ Nhiệt Nordic Bọc Da & Khắc Laser Cá Nhân' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'binh-giu-nhiet-nordic-khac-laser', required: false })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ example: 'Bình giữ nhiệt phong cách Bắc Âu...', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 250000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 220000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @ApiProperty({ example: '6741314524921336108...', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ type: [String], example: ['https://example.com/image1.jpg'], required: false })
  @IsOptional()
  @IsArray()
  images: string[];

  @ApiProperty({ required: false, default: 100 })
  @IsOptional()
  @IsNumber()
  stock?: number;

  @ApiProperty({ required: false, default: '' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ required: false, default: [] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isCustomizable?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isFlashSale?: boolean;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  flashSaleDiscountPercent?: number;

  @ApiProperty({ required: false, default: 30000 })
  @IsOptional()
  @IsNumber()
  customBaseFee?: number;

  @ApiProperty({ required: false, default: [] })
  @IsOptional()
  @IsArray()
  variants?: Array<{
    name: string;
    colorHex?: string;
    price: number;
    stock: number;
    sku?: string;
    image?: string;
    status?: string;
  }>;

  @ApiProperty({ required: false, default: [] })
  @IsOptional()
  @IsArray()
  specs?: Array<{
    key: string;
    value: string;
  }>;

  @ApiProperty({ required: false })
  @IsOptional()
  customConfig?: {
    frontBlankImage?: string;
    backBlankImage?: string;
    supportedColors?: string[];
    maxTextLength?: number;
    backEngraveFee?: number;
    photoPrintFee?: number;
    printArea?: { x: number; y: number; width: number; height: number };
    safeArea?: { x: number; y: number; width: number; height: number };
  };
}
