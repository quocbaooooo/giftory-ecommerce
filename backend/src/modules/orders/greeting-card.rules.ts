import { BadRequestException } from '@nestjs/common';

export const GREETING_CARD_TEMPLATES = [
  { id: 'BIRTHDAY', name: 'Thanh lịch' },
  { id: 'LOVE', name: 'Lãng mạn' },
  { id: 'THANK_YOU', name: 'Tự nhiên' },
];

export function normalizeGreetingCard(input?: { templateId: string; heading?: string; message: string } | null) {
  if (input == null) return null;
  const template = GREETING_CARD_TEMPLATES.find(item => item.id === input.templateId);
  const message = typeof input.message === 'string' ? input.message.replace(/\r\n?/g, '\n').trim() : '';
  if (!template) throw new BadRequestException('Vui lòng chọn mẫu thiệp hợp lệ');
  // Older clients without a heading get a neutral default, independent of the style.
  const heading = input.heading === undefined ? 'Gửi bạn thật nhiều yêu thương'
    : typeof input.heading === 'string' ? input.heading.trim().replace(/\s+/g, ' ') : '';
  if (!heading || Array.from(heading).length > 80) {
    throw new BadRequestException('Tiêu đề thiệp cần từ 1 đến 80 ký tự');
  }
  if (!message || Array.from(message).length > 300 || message.split('\n').length > 6) {
    throw new BadRequestException('Lời chúc cần từ 1 đến 300 ký tự và tối đa 6 dòng');
  }
  return { templateId: template.id, templateName: template.name, heading, message };
}
