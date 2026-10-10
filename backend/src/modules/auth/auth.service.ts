import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { RefreshToken, RefreshTokenDocument } from '../../database/schemas/refresh-token.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '../../common/enums/role.enum';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name) private readonly refreshTokenModel: Model<RefreshTokenDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existing = await this.userModel.findOne({ email: registerDto.email.toLowerCase() });
    if (existing) {
      throw new ConflictException('Email này đã được sử dụng');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    const user = await this.userModel.create({
      name: registerDto.name,
      email: registerDto.email.toLowerCase(),
      password: hashedPassword,
      phone: registerDto.phone || '',
      role: UserRole.CUSTOMER,
      loyaltyPoints: 100, // Gift 100 welcome points
      loyaltyTier: 'BRONZE'
    });

    const tokens = await this.generateTokens(user);
    const userObj = user.toObject();
    delete userObj.password;

    return {
      user: userObj,
      ...tokens
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userModel.findOne({ email: loginDto.email.toLowerCase() });
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị vô hiệu hóa');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const tokens = await this.generateTokens(user);
    const userObj = user.toObject();
    delete userObj.password;

    return {
      user: userObj,
      ...tokens
    };
  }

  async refreshTokens(refreshTokenStr: string) {
    const tokenDoc = await this.refreshTokenModel.findOne({ token: refreshTokenStr });
    if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
    }

    const user = await this.userModel.findById(tokenDoc.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Người dùng không còn hợp lệ');
    }

    // Token rotation: remove old refresh token
    await this.refreshTokenModel.deleteOne({ _id: tokenDoc._id });

    const tokens = await this.generateTokens(user);
    const userObj = user.toObject();
    delete userObj.password;

    return {
      user: userObj,
      ...tokens
    };
  }

  async logout(userId: string) {
    await this.refreshTokenModel.deleteMany({ userId: new Types.ObjectId(userId) });
    return { message: 'Đăng xuất thành công' };
  }

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).select('-password');
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    return user;
  }

  private async generateTokens(user: UserDocument) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role
    };

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET', 'giftory_access_token_super_secret_key_2026');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET', 'giftory_refresh_token_super_secret_key_2026');
    const accessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '7d');
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn as any,
    });

    // Save refresh token to database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenModel.create({
      userId: user._id,
      token: refreshToken,
      expiresAt
    });

    return {
      accessToken,
      refreshToken
    };
  }
}
