import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomStudioService } from './custom-studio.service';
import { SaveDesignDto } from './dto/save-design.dto';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Custom Studio')
@Controller('custom-studio')
export class CustomStudioController {
  constructor(private readonly studioService: CustomStudioService) {}

  @Get('templates')
  @ApiOperation({ summary: 'Lấy danh sách các dòng sản phẩm phôi chế tác cá nhân hóa' })
  async getTemplates() {
    return this.studioService.getCustomizableTemplates();
  }

  @Post('save-design')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lưu bản thiết kế cá nhân hóa (Hỗ trợ cả Guest và User)' })
  async saveDesign(
    @Body() dto: SaveDesignDto,
    @CurrentUser('sub') userId?: string
  ) {
    return this.studioService.saveDesign(dto, userId);
  }

  @Get('my-designs')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy các bản thiết kế đã lưu của người dùng hoặc theo sessionId' })
  async getMyDesigns(
    @Query('sessionId') sessionId?: string,
    @CurrentUser('sub') userId?: string
  ) {
    return this.studioService.getMyDesigns(userId, sessionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết một bản thiết kế chế tác' })
  async getDesignById(@Param('id') id: string) {
    return this.studioService.getDesignById(id);
  }
}
