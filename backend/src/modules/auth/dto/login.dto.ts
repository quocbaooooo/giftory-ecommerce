import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { cleanEmail } from './register.dto';
export class LoginDto {
  @Transform(cleanEmail) @IsEmail({}, { message: 'Email không đúng định dạng' }) @MaxLength(254) email: string;
  @IsString() @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' }) @MaxLength(256) password: string;
}
