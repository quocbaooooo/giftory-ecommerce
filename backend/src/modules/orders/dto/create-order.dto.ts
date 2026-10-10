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
}

