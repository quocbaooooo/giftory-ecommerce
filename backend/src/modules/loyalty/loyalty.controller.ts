import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Loyalty & Vouchers')
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin điểm thưởng, hạng thành viên và danh sách voucher' })
  async getSummary(@CurrentUser('sub') userId: string) {
    return this.loyaltyService.getLoyaltySummary(userId);
  }

  @Post('claim-code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Nhập mã tích điểm từ hóa đơn xưởng / thẻ quà tặng' })
  async claimCode(
    @Body('code') code: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.loyaltyService.claimCode(userId, code);
  }

  @Post('redeem')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đổi điểm thưởng lấy Voucher giảm giá' })
  async redeemVoucher(
    @Body('voucherId') voucherId: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.loyaltyService.redeemVoucher(userId, voucherId);
  }
}
