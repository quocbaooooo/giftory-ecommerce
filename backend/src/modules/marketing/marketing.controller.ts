import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { MarketingService } from './marketing.service';

@ApiTags('Marketing campaigns')
@Controller('campaigns')
export class MarketingController {
  constructor(private readonly marketing: MarketingService) {}
  @Get('active')
  @ApiOperation({ summary: 'Các campaign đang chạy trên trang chủ' })
  active() { return this.marketing.listActive(); }
}

@ApiTags('Admin marketing')
@Controller('admin/campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminMarketingController {
  constructor(private readonly marketing: MarketingService) {}
  @Get() list() { return this.marketing.listAll(); }
  @Post() create(@Body() body: any) { return this.marketing.create(body); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.marketing.update(id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.marketing.remove(id); }
}
