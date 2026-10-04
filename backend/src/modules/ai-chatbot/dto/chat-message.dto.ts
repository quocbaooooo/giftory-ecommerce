import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({ description: 'Nội dung tin nhắn người dùng gửi cho AI' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'ID phiên hội thoại (session ID)' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Ngữ cảnh trích xuất hiện tại nếu có' })
  @IsOptional()
  context?: {
    recipient?: string;
    occasion?: string;
    budget?: number;
    preferences?: string;
  };
}
