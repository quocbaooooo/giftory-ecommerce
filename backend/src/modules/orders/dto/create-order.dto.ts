import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { PaymentMethod, PaymentMode } from '../../../common/enums/role.enum';

export class CustomerInfoDto {
  @ApiProperty({ example: 'Nguyễn Minh Anh' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '0912345678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'minhanh@gmail.com', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ example: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP.HCM' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Giao giờ hành chính, gọi trước khi giao 15 phút', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class BuyNowItemDto {
  @ApiProperty({ example: '6ac9c5b3ad4350efff67bfc9' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 'Tiêu chuẩn', required: false })
  @IsOptional()
  @IsString()
  variantName?: string;

  @ApiProperty({ example: 1, default: 1, required: false })
  @IsOptional()
  quantity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  customDetails?: any;
}

export class CreateOrderDto {
  @ApiProperty({ type: CustomerInfoDto })
  @IsObject()
  @IsNotEmpty()
  customerInfo: CustomerInfoDto;

  @ApiProperty({ enum: PaymentMode, default: PaymentMode.DEPOSIT_50 })
  @IsEnum(PaymentMode)
  paymentMode: PaymentMode;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.VIETQR })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: 'STANDARD', required: false })
  @IsOptional()
  @IsString()
  shippingMethod?: 'STANDARD' | 'EXPRESS';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({ required: false, type: BuyNowItemDto })
  @IsOptional()
  buyNowItem?: BuyNowItemDto;
}

