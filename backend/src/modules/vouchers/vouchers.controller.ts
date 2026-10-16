import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VouchersService } from './vouchers.service';
@Controller('vouchers')
export class VouchersController {
  constructor(private service: VouchersService) {}
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  list(@CurrentUser('sub') userId?: string) { return this.service.list(0, 0, userId); }
  @Post(':code/save')
  @UseGuards(JwtAuthGuard)
  save(@Param('code') code: string, @CurrentUser('sub') userId: string) { return this.service.save(code, userId); }
}
