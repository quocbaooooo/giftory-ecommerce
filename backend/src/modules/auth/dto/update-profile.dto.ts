import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

class ProfileAddressDto {
  @IsString() @IsNotEmpty() provinceCode: string;
  @IsString() @IsNotEmpty() wardCode: string;
  @IsString() @MaxLength(200) detailAddress: string;
  @IsOptional() @IsString() @MaxLength(100) district?: string;
}

export class UpdateProfileDto {
  @IsString() @IsNotEmpty() @MaxLength(100) fullName: string;
  @IsString() @IsNotEmpty() @MaxLength(20) phone: string;
  @IsOptional() @ValidateNested() @Type(() => ProfileAddressDto) address?: ProfileAddressDto;
}
