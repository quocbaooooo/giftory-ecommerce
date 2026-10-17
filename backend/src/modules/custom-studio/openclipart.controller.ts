import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { ImportOpenClipartDto, SearchOpenClipartDto } from './dto/openclipart.dto';
import { OpenClipartService } from './openclipart.service';

@ApiTags('OpenClipart Import')
@ApiBearerAuth()
@Controller('custom-studio/admin/openclipart')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class OpenClipartController {
  constructor(private readonly service: OpenClipartService) {}

  @Get('search')
  @ApiOperation({ summary: 'Tìm kiếm clipart công khai từ OpenClipart' })
  search(@Query() query: SearchOpenClipartDto) {
    return this.service.search(query.query, query.page);
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập tối đa 20 clipart vào thư viện Studio' })
  import(@Body() dto: ImportOpenClipartDto) {
    return this.service.import(dto);
  }
}
