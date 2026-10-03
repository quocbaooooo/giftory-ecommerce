import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'customer@giftory.vn', description: 'Email đăng nhập' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @ApiProperty({ example: 'Giftory@2026', description: 'Mật khẩu' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' })
  password: string;
}
