import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đặt hàng và tính toán tiền cọc 50% theo chính sách Giftory' })
  async createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser('sub') userId?: string
  ) {
    return this.ordersService.createOrder(dto, userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy lịch sử đơn hàng của người dùng đang đăng nhập' })
  async getMyOrders(@CurrentUser('sub') userId: string) {
    return this.ordersService.getMyOrders(userId);
  }

  @Get(':orderCode')
  @ApiOperation({ summary: 'Tra cứu tiến trình và lộ trình vận chuyển theo Mã Đơn Hàng' })
  async getOrderByCode(@Param('orderCode') orderCode: string) {
    return this.ordersService.getOrderByCode(orderCode);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hủy đơn hàng nếu chưa đưa vào xưởng chế tác' })
  async cancelOrder(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.ordersService.cancelOrder(id, userId);
  }

  // Admin endpoints
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin xem tất cả đơn hàng kèm phân trang, tìm kiếm và lọc trạng thái' })
  async findAllOrders(@Query() query: any) {
    return this.ordersService.findAllOrders(query);
  }

  @Patch('admin/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin cập nhật trạng thái đơn hàng và lộ trình xưởng chế tác' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.ordersService.updateOrderStatus(id, body);
  }
}
