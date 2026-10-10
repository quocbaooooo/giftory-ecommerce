import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentMode } from '../../common/enums/role.enum';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin giỏ hàng và bảng tính chi tiết cọc 50%' })
  async getCart(
    @Query('sessionId') sessionId?: string,
    @CurrentUser('sub') userId?: string
  ) {
    return this.cartService.getCart(userId, sessionId);
  }

  @Post('items')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thêm sản phẩm hoặc quà thiết kế riêng vào giỏ hàng' })
  async addItem(
    @Body() dto: AddToCartDto,
    @CurrentUser('sub') userId?: string
  ) {
    return this.cartService.addItem(dto, userId);
  }

  @Patch('items/:index')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật số lượng của một sản phẩm trong giỏ hàng' })
  async updateQuantity(
    @Param('index') index: number,
    @Body('quantity') quantity: number,
    @Body('sessionId') bodySessionId?: string,
    @Query('sessionId') querySessionId?: string,
    @CurrentUser('sub') userId?: string
  ) {
    const sessionId = bodySessionId || querySessionId;
    return this.cartService.updateItemQuantity(Number(index), quantity, userId, sessionId);
  }

  @Patch('items/:index/custom')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật cấu hình tùy biến (customDetails) của sản phẩm trong giỏ hàng' })
  async updateCustomDetails(
    @Param('index') index: number,
    @Body('customDetails') customDetails: any,
    @Body('variantName') variantName?: string,
    @Body('sessionId') bodySessionId?: string,
    @Query('sessionId') querySessionId?: string,
    @CurrentUser('sub') userId?: string
  ) {
    const sessionId = bodySessionId || querySessionId;
    return this.cartService.updateItemCustomDetails(Number(index), customDetails, variantName, userId, sessionId);
  }

  @Delete('items/:index')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa sản phẩm khỏi giỏ hàng' })
  async removeItem(
    @Param('index') index: number,
    @Body('sessionId') bodySessionId?: string,
    @Query('sessionId') querySessionId?: string,
    @CurrentUser('sub') userId?: string
  ) {
    const sessionId = bodySessionId || querySessionId;
    return this.cartService.removeItem(Number(index), userId, sessionId);
  }

  @Post('apply-voucher')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Áp dụng mã ưu đãi/voucher cho giỏ hàng' })
  async applyVoucher(
    @Body('code') code: string,
    @Body('sessionId') bodySessionId?: string,
    @Query('sessionId') querySessionId?: string,
    @CurrentUser('sub') userId?: string
  ) {
    const sessionId = bodySessionId || querySessionId;
    return this.cartService.applyVoucher(code, userId, sessionId);
  }

  @Post('payment-mode')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chuyển đổi hình thức thanh toán (Cọc 50% hoặc 100% trọn gói)' })
  async setPaymentMode(
    @Body('mode') mode: PaymentMode,
    @Body('sessionId') bodySessionId?: string,
    @Query('sessionId') querySessionId?: string,
    @CurrentUser('sub') userId?: string
  ) {
    const sessionId = bodySessionId || querySessionId;
    return this.cartService.setPaymentMode(mode, userId, sessionId);
  }

  @Post('clear')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa toàn bộ giỏ hàng' })
  async clearCart(
    @Body('sessionId') bodySessionId?: string,
    @Query('sessionId') querySessionId?: string,
    @CurrentUser('sub') userId?: string
  ) {
    const sessionId = bodySessionId || querySessionId;
    return this.cartService.clearCart(userId, sessionId);
  }
}
