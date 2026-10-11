import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CareService } from './care.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';
@Controller('care')
export class CareController {
  constructor(private care: CareService) {}
  @Get('products/:id/reviews')
  publicReviews(@Param('id') id: string) {
    return this.care.publicReviews(id);
  }
  @Get('attachments/:id')
  @UseGuards(OptionalJwtAuthGuard)
  async attachment(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const file = await this.care.download(id, user);
    res.setHeader('Content-Type', file.mime);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    );
    res.send(file.data);
  }
  @Post('attachments')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  upload(@CurrentUser('sub') userId: string, @UploadedFile() file: any) {
    return this.care.upload(userId, file);
  }
  @Get('notifications')
  @UseGuards(JwtAuthGuard)
  inbox(@CurrentUser('sub') id: string) {
    return this.care.inbox(id);
  }
  @Patch('notifications/:id/dismiss')
  @UseGuards(JwtAuthGuard)
  dismiss(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.care.dismiss(id, userId);
  }
  @Get('reviews')
  @UseGuards(JwtAuthGuard)
  reviews(@CurrentUser('sub') id: string) {
    return this.care.myReviews(id);
  }
  @Post('reviews')
  @UseGuards(JwtAuthGuard)
  submit(@CurrentUser('sub') id: string, @Body() body: any) {
    return this.care.submitReview(id, body);
  }
  @Get('cases')
  @UseGuards(JwtAuthGuard)
  cases(@CurrentUser('sub') id: string) {
    return this.care.myCases(id);
  }
  @Post('cases')
  @UseGuards(JwtAuthGuard)
  createCase(@CurrentUser('sub') id: string, @Body() body: any) {
    return this.care.createCase(id, body);
  }
  @Post('cases/:id/replies')
  @UseGuards(JwtAuthGuard)
  reply(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() body: any,
  ) {
    return this.care.reply(id, userId, body);
  }
}
@Controller('care/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CareAdminController {
  constructor(private care: CareService) {}
  @Get('reviews') reviews() {
    return this.care.adminReviews();
  }
  @Patch('reviews/:id') moderate(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() body: any,
  ) {
    return this.care.moderate(id, userId, body);
  }
  @Get('cases') cases() {
    return this.care.adminCases();
  }
  @Patch('cases/:id') update(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() body: any,
  ) {
    return this.care.updateCase(id, userId, body);
  }
  @Get('refunds') refunds() {
    return this.care.adminRefunds();
  }
}
