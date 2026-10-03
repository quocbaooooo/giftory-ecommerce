import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Bình Giữ Nhiệt & Cốc Sứ' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'binh-giu-nhiet-coc-su' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: '☕' })
  @IsOptional()
  @IsString()
  emoji?: string;

  @ApiProperty({ example: 'local_cafe' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ example: 'Dòng sản phẩm bình giữ nhiệt, cốc sứ cao cấp khắc laser theo yêu cầu' })
  @IsOptional()
  @IsString()
  description?: string;
}
