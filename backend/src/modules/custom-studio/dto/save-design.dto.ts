import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class SaveDesignDto {
  @ApiProperty({ example: '6741314524921336108...' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 'Bình Giữ Nhiệt Khắc Tên Kỷ Niệm', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'Happy Anniversary Minh Anh ❤️', required: false })
  @IsOptional()
  @IsString()
  frontMessage?: string;

  @ApiProperty({ example: '14.02.2024 • Bespoke', required: false })
  @IsOptional()
  @IsString()
  backMessage?: string;

  @ApiProperty({ example: 'Signature', required: false })
  @IsOptional()
  @IsString()
  fontFamily?: string;

  @ApiProperty({ example: 'Gold', required: false })
  @IsOptional()
  @IsString()
  engraveColor?: string;

  @ApiProperty({ example: 'Navy Blue', required: false })
  @IsOptional()
  @IsString()
  selectedColor?: string;

  @ApiProperty({ required: false, default: [] })
  @IsOptional()
  @IsArray()
  stickers?: any[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  previewImage?: string;

  @ApiProperty({ required: false, default: 30000 })
  @IsOptional()
  @IsNumber()
  customFee?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sessionId?: string;
}
