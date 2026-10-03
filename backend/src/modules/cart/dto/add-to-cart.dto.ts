import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddToCartDto {
  @ApiProperty({ example: '6741314524921336108...' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 'Navy Blue • 500ml', required: false })
  @IsOptional()
  @IsString()
  variantName?: string;

  @ApiProperty({ example: 1, default: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customDesignId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  customDetails?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sessionId?: string;
}
