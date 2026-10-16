import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class RecipientDto {
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  name: string;

  @Transform(({ value }) => typeof value === 'string' ? value.replace(/[\s().-]/g, '').replace(/^\+?84/, '0') : value)
  @IsString()
  @Matches(/^0\d{9}$/)
  phone: string;

  @IsString()
  @Matches(/^\d{1,2}$/)
  provinceCode: string;

  @IsString()
  @Matches(/^\d{1,5}$/)
  wardCode: string;

  @Transform(trim)
  @IsString()
  @Length(3, 200)
  street: string;
}
