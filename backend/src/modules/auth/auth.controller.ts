import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { AuthRateGuard } from './auth-rate.guard';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/register.dto';
import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(AuthRateGuard)
  @ApiOperation({ summary: 'Đăng ký tài khoản hội viên Giftory' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công, trả về User & Tokens' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @UseGuards(AuthRateGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập hệ thống' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công, trả về User & Tokens' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('forgot-password')
  @UseGuards(AuthRateGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  forgotPassword(@Body() dto: ForgotPasswordDto) { return this.authService.forgotPassword(dto.email); }

  @Post('reset-password')
  @UseGuards(AuthRateGuard)
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) { return this.authService.resetPassword(dto.token, dto.password); }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới Access Token bằng Refresh Token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất và hủy bỏ refresh tokens' })
  async logout(@CurrentUser('sub') userId: string, @Body() body: { refreshToken?: string }) {
    return this.authService.logout(userId, body?.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin tài khoản hiện tại' })
  async getProfile(@CurrentUser('sub') userId: string) {
    return this.authService.getProfile(userId);
  }
}
