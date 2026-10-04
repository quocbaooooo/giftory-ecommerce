import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AiChatbotService } from './ai-chatbot.service';
import { ChatMessageDto } from './dto/chat-message.dto';

@ApiTags('AI Chatbot')
@Controller('ai')
export class AiChatbotController {
  constructor(private readonly aiChatbotService: AiChatbotService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Gửi tin nhắn hội thoại đến Trợ lý AI (US-PD-03 & US-PD-04)' })
  async sendMessage(@Body() dto: ChatMessageDto) {
    return this.aiChatbotService.processMessage(dto);
  }

  @Get('quick-chips')
  @ApiOperation({ summary: 'Lấy danh sách Thẻ chọn nhanh 3 bước (US-PD-03.3)' })
  async getQuickChips(@Query('step') step?: number) {
    return this.aiChatbotService.getQuickChipsByStep(Number(step || 1));
  }
}
