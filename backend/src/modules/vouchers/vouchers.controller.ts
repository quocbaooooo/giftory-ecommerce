import { Body, Controller, Delete, Get, Patch, Post, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VouchersService } from './vouchers.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';

@ApiTags('Vouchers')
@UseInterceptors(TransformInterceptor)
@Controller('vouchers')
export class VouchersController {
  constructor(private service: VouchersService) {}
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  list(@CurrentUser('sub') userId?: string) { return this.service.list(0, 0, userId); }
  @Post(':code/save')
  @UseGuards(JwtAuthGuard)
  save(@Param('code') code: string, @CurrentUser('sub') userId: string) { return this.service.save(code, userId); }

  @Get('admin/manage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  listForAdmin() { return this.service.listForAdmin(); }

  @Post('admin/manage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  create(@Body() body: any) { return this.service.createPromotion(body); }

  @Patch('admin/manage/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() body: any) { return this.service.updatePromotion(id, body); }

  @Delete('admin/manage/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  remove(@Param('id') id: string) { return this.service.removePromotion(id); }
}
