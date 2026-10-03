import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Wishlist & Saved Designs')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách các món quà và bản thiết kế đã lưu' })
  async getWishlist(@CurrentUser('sub') userId: string) {
    return this.wishlistService.getWishlist(userId);
  }

  @Post('toggle/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thêm hoặc xóa sản phẩm khỏi Wishlist' })
  async toggleProduct(
    @Param('productId') productId: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.wishlistService.toggleProduct(userId, productId);
  }
}
