import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RecipientsService } from './recipients.service';
import { RecipientDto } from './recipient.dto';
import { locations } from './locations.data';

@Controller('recipients')
@UseGuards(JwtAuthGuard)
export class RecipientsController {
  constructor(private readonly recipients: RecipientsService) {}

  @Get()
  list(@CurrentUser('sub') userId: string) { return this.recipients.list(userId); }

  @Post()
  save(@CurrentUser('sub') userId: string, @Body() dto: RecipientDto) { return this.recipients.save(userId, dto); }

  @Delete(':id')
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) { return this.recipients.remove(userId, id); }
}

@Controller('locations')
export class LocationsController {
  @Get('provinces')
  provinces() { return locations.map(({ code, name }) => ({ code, name })); }

  @Get('provinces/:code/wards')
  wards(@Param('code') code: string) { return locations.find(item => item.code === code)?.wards || []; }
}
