import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Minh Anh', description: 'Họ và tên' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập họ và tên' })
  name: string;

  @ApiProperty({ example: 'customer@giftory.vn', description: 'Email đăng ký' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @ApiProperty({ example: 'Giftory@2026', description: 'Mật khẩu (tối thiểu 6 ký tự)' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @ApiProperty({ example: '0901234567', required: false, description: 'Số điện thoại' })
  @IsOptional()
  @IsString()
  phone?: string;
}
