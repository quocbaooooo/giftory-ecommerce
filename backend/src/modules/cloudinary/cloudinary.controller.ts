import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CloudinaryService } from './cloudinary.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Upload')
@Controller('upload')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('image')
  @ApiOperation({ summary: 'Upload an image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file ảnh để tải lên');
    }

    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Định dạng file không hợp lệ (vui lòng chọn file hình ảnh)');
    }

    const url = await this.cloudinaryService.uploadImage(file.buffer, 'giftory/products', file.mimetype);
    return {
      success: true,
      url,
      message: 'Tải ảnh thành công',
    };
  }

  @Post('campaign-banner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Upload banner chiến dịch đã tối ưu qua Cloudinary (Admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  async uploadCampaignBanner(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Vui lòng chọn ảnh banner (tối đa 8MB)');
    if (!file.mimetype || !file.mimetype.startsWith('image/')) throw new BadRequestException('Chỉ chấp nhận file ảnh');
    const url = await this.cloudinaryService.uploadImage(
      file.buffer,
      'giftory/campaigns',
      file.mimetype,
      { transformation: [{ width: 1800, height: 1000, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }] },
      false,
      30000,
    );
    return { success: true, url, message: 'Ảnh campaign đã được tối ưu và tải lên Cloudinary' };
  }

}
