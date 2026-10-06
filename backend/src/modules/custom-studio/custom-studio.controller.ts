import {
  Controller,
  Get,
  Post,
  Delete,
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

  @Get('assets')
  @ApiOperation({ summary: 'Lấy danh sách icon/sticker/họa tiết dùng trong Custom Studio' })
  async getStudioAssets(@Query('type') type?: string) {
    return this.studioService.getStudioAssets(type);
  }

  @Get('admin/assets')
  @ApiOperation({ summary: 'Admin lấy danh sách toàn bộ icon/sticker/họa tiết' })
  async getAllAssetsAdmin() {
    return this.studioService.getAllStudioAssetsAdmin();
  }

  @Post('admin/assets')
  @ApiOperation({ summary: 'Admin thêm mới icon/sticker/họa tiết vào thư viện' })
  async createStudioAsset(@Body() body: any) {
    return this.studioService.createStudioAsset(body);
  }

  @Delete('admin/assets/:id')
  @ApiOperation({ summary: 'Admin xóa icon/sticker khỏi thư viện' })
  async deleteStudioAsset(@Param('id') id: string) {
    return this.studioService.deleteStudioAsset(id);
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

  @Post('sync-draft')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đồng bộ bản thiết kế từ LocalStorage vào CSDL tài khoản khi Đăng nhập 1-click (SyncDesignDraft)' })
  async syncDraft(
    @Body() dto: SaveDesignDto,
    @CurrentUser('sub') userId?: string
  ) {
    return this.studioService.syncDesignDraft(dto, userId || '');
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
