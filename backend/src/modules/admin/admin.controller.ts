import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Admin Management')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Lấy các số liệu KPI Bento Grid và doanh thu thực tế cho Admin Dashboard' })
  async getDashboard() {
    return this.adminService.getDashboardKpis();
  }

  @Get('users')
  @ApiOperation({ summary: 'Lấy danh sách người dùng kèm phân trang và tìm kiếm' })
  async getAllUsers(@Query() query: any) {
    return this.adminService.getAllUsers(query);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Thay đổi quyền hạn vai trò người dùng (CUSTOMER/ADMIN)' })
  async updateUserRole(@Param('id') id: string, @Body('role') role: UserRole) {
    return this.adminService.updateUserRole(id, role);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Kích hoạt hoặc vô hiệu hóa tài khoản' })
  async updateUserStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.adminService.updateUserStatus(id, isActive);
  }
}
