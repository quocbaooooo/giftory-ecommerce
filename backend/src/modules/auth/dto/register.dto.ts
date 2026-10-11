import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength, ValidateBy } from 'class-validator';
export const cleanEmail = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value;
export const cleanPhone = ({ value }: { value: unknown }) => typeof value === 'string' ? value.replace(/[\s().-]/g, '').replace(/^\+84/, '0') : value;
export function PasswordPolicy() {
  return ValidateBy({ name: 'passwordPolicy', validator: {
    validate: value => typeof value === 'string' && value.length >= 8 && Buffer.byteLength(value, 'utf8') <= 72 && /\S/.test(value),
    defaultMessage: () => 'Mật khẩu cần ít nhất 8 ký tự và không vượt quá 72 byte UTF-8',
  }});
}
export class RegisterDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value)
  @IsString() @Length(2, 80, { message: 'Họ tên cần từ 2 đến 80 ký tự' }) name: string;
  @Transform(cleanEmail) @IsEmail({}, { message: 'Email không đúng định dạng' }) @MaxLength(254) email: string;
  @IsString() @PasswordPolicy() password: string;
  @IsOptional() @Transform(cleanPhone) @IsString()
  @Matches(/^(?:0[35789]\d{8})?$/, { message: 'Số điện thoại di động Việt Nam gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09' }) phone?: string;
}
export class ForgotPasswordDto {
  @Transform(cleanEmail) @IsEmail({}, { message: 'Email không đúng định dạng' }) @MaxLength(254) email: string;
}
export class ResetPasswordDto {
  @IsString() @Matches(/^[a-f0-9]{64}$/, { message: 'Liên kết đặt lại mật khẩu không hợp lệ' }) token: string;
  @IsString() @PasswordPolicy() password: string;
}
