import { IsString, Matches, MaxLength, MinLength, IsUUID } from 'class-validator';

export class GuestCodOtpRequestDto {
  @IsString()
  @Matches(/^(?:0[35789]\d{8}|\+?84[35789]\d{8})$/)
  phone: string;

  @IsString()
  @MinLength(8)
  @MaxLength(120)
  sessionId: string;
}

export class GuestCodOtpResendDto extends GuestCodOtpRequestDto {
  @IsUUID()
  challengeId: string;
}

export class GuestCodOtpVerifyDto extends GuestCodOtpResendDto {
  @IsString()
  @Matches(/^\d{6}$/)
  code: string;
}
