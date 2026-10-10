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

  // ==========================================
  // ADMIN & BP-04 ENDPOINTS (Placed before :orderCode)
  // ==========================================

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin xem tất cả đơn hàng kèm phân trang, tìm kiếm và lọc trạng thái' })
  async findAllOrders(@Query() query: any) {
    return this.ordersService.findAllOrders(query);
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin xem chi tiết đơn hàng theo ID hoặc Mã Đơn Hàng' })
  async findOrderById(@Param('id') id: string) {
    return this.ordersService.findOrderById(id);
  }

  // US-04.01 – Xác nhận đơn hàng
  @Post('admin/:id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin xác nhận đơn hàng sau thời gian chờ (US-04.01, BR-01 -> BR-04)' })
  async confirmOrder(
    @Param('id') id: string,
    @Body() body: { bypassWaitTime?: boolean },
    @CurrentUser() user: any
  ) {
    return this.ordersService.confirmOrder(id, user, !!body?.bypassWaitTime);
  }

  // US-04.02 – Admin lấy Ready-made Gift
  @Post('admin/:id/items/:itemId/pick')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin lấy sản phẩm Ready-made Gift theo thông tin đơn hàng (US-04.02, BR-06)' })
  async pickReadyMadeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: any
  ) {
    return this.ordersService.pickReadyMadeItem(id, itemId, user);
  }

  // US-04.03 – Bắt đầu sản xuất Custom Gift
  @Post('admin/:id/items/:itemId/produce')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Nhân viên sản xuất truy xuất cấu hình và gia công Custom Gift (US-04.03, BR-07)' })
  async startCustomItemProduction(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: any
  ) {
    return this.ordersService.startCustomItemProduction(id, itemId, user);
  }

  // US-04.03 & EF1 – Kiểm tra chất lượng (QC) Custom Gift
  @Post('admin/:id/items/:itemId/qc')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kiểm tra chất lượng và làm lại Custom Gift nếu chưa đạt (US-04.03, EF1, BR-08)' })
  async inspectCustomItemQuality(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: { passed: boolean; note?: string; inspector?: string },
    @CurrentUser() user: any
  ) {
    return this.ordersService.inspectCustomItemQuality(id, itemId, body, user);
  }

  // US-04.04 – Đóng gói đơn hàng khi tất cả item đã sẵn sàng & đạt yêu cầu
  @Post('admin/:id/package')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin đóng gói đơn hàng khi toàn bộ item đã sẵn sàng và đạt yêu cầu (US-04.04, BR-09)' })
  async packageOrder(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return this.ordersService.packageOrder(id, user);
  }

  // US-04.04 – Bàn giao cho Shipper (In transit)
  @Post('admin/:id/dispatch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin bàn giao đơn hàng cho Shipper và chuyển sang Delivery Service (US-04.04, BR-10)' })
  async dispatchToShipper(
    @Param('id') id: string,
    @Body() body: { carrier?: string; trackingCode?: string; note?: string },
    @CurrentUser() user: any
  ) {
    return this.ordersService.dispatchToShipper(id, body, user);
  }

  // US-04.05 & US-04.06 – Delivery Service xác nhận kết quả giao hàng
  @Post('admin/:id/delivery-result')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delivery Service báo cáo kết quả giao hàng: thành công hoặc không thành công (US-04.05, US-04.06, BR-11 -> BR-15)' })
  async reportDeliveryResult(
    @Param('id') id: string,
    @Body() body: { success: boolean; failureReason?: string; allowRetry?: boolean; note?: string },
    @CurrentUser() user: any
  ) {
    return this.ordersService.reportDeliveryResult(id, body, user);
  }

  // US-04.07 – Admin tiếp nhận hàng trả về từ Delivery Service
  @Post('admin/:id/receive-return')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin tiếp nhận hàng được Delivery Service trả về kho Giftory (US-04.07, BR-15)' })
  async receiveReturnedOrder(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return this.ordersService.receiveReturnedOrder(id, user);
  }

  // US-04.07 – Chuyển thông tin đơn hàng sang BP-06
  @Post('admin/:id/transfer-bp06')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin chuyển thông tin đơn hàng sang BP-06 để tiếp tục xử lý (US-04.07, BR-16)' })
  async transferToBp06(
    @Param('id') id: string,
    @Body() body: { bp06Note?: string },
    @CurrentUser() user: any
  ) {
    return this.ordersService.transferToBp06(id, body, user);
  }

  @Patch('admin/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin cập nhật trạng thái đơn hàng thủ công' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.ordersService.updateOrderStatus(id, body);
  }

  // ==========================================
  // CUSTOMER / PUBLIC ENDPOINTS
  // ==========================================

  @Get(':orderCode')
  @ApiOperation({ summary: 'Tra cứu tiến trình và lộ trình vận chuyển theo Mã Đơn Hàng' })
  async getOrderByCode(@Param('orderCode') orderCode: string) {
    return this.ordersService.getOrderByCode(orderCode);
  }

  @Post(':orderCode/pay')
  @ApiOperation({ summary: 'Xử lý phản hồi từ Payment Gateway (Simulated Payment Gateway)' })
  async processPaymentSimulation(
    @Param('orderCode') orderCode: string,
    @Body() body: { success: boolean; paymentType?: 'DEPOSIT_50' | 'FULL_100' }
  ) {
    return this.ordersService.processPaymentSimulation(orderCode, body);
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
}
