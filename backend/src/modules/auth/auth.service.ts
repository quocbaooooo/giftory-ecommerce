import { Injectable, ConflictException, UnauthorizedException, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { RefreshToken, RefreshTokenDocument } from '../../database/schemas/refresh-token.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '../../common/enums/role.enum';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name) private readonly refreshTokenModel: Model<RefreshTokenDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}
  private publicUser(user: UserDocument) {
    const object = user.toObject();
    delete object.password; delete object.passwordResetHash; delete object.passwordResetExpiresAt; delete object.passwordResetRequestedAt;
    return object;
  }
  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.userModel.exists({ email })) throw new ConflictException('Email này đã được sử dụng. Bạn có thể đăng nhập hoặc đặt lại mật khẩu.');
    let user: UserDocument;
    try {
      user = await this.userModel.create({ name: dto.name.trim(), email, password: await bcrypt.hash(dto.password, 12), phone: dto.phone || '', role: UserRole.CUSTOMER, loyaltyPoints: 100, loyaltyTier: 'BRONZE' });
    } catch (error) {
      if (error.code === 11000) throw new ConflictException('Email này đã được sử dụng. Vui lòng đăng nhập.');
      throw error;
    }
    return { user: this.publicUser(user), ...await this.generateTokens(user) };
  }
  async login(dto: LoginDto) {
    const user = await this.userModel.findOne({ email: dto.email.trim().toLowerCase() });
    // Perform a comparable hash operation for unknown accounts as well.
    const matched = user ? await bcrypt.compare(dto.password, user.password) : (await bcrypt.hash(dto.password, 12), false);
    if (!user || !matched || !user.isActive) throw new UnauthorizedException('Email hoặc mật khẩu không chính xác, hoặc tài khoản không khả dụng.');
    return { user: this.publicUser(user), ...await this.generateTokens(user) };
  }
  async refreshTokens(value: string) {
    let payload: any;
    try { payload = this.jwtService.verify(value, { secret: this.configService.get('JWT_REFRESH_SECRET', 'giftory_refresh_token_super_secret_key_2026') }); }
    catch { throw new UnauthorizedException('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'); }
    if (payload.kind && payload.kind !== 'refresh') throw new UnauthorizedException();
    // Atomic consumption prevents two requests from reusing the same refresh token.
    // Raw-token fallback supports sessions issued before this migration, until expiry.
    const token = await this.refreshTokenModel.findOneAndDelete({ token: { $in: [digest(value), value] }, expiresAt: { $gt: new Date() } });
    if (!token || String(token.userId) !== payload.sub) throw new UnauthorizedException('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
    const user = await this.userModel.findById(token.userId);
    if (!user || !user.isActive || (user.tokenVersion || 0) !== (payload.tokenVersion || 0)) throw new UnauthorizedException('Phiên đăng nhập không còn hợp lệ.');
    return { user: this.publicUser(user), ...await this.generateTokens(user) };
  }
  async logout(userId?: string, refreshToken?: string) {
    if (!userId && typeof refreshToken === 'string') {
      try {
        const payload = this.jwtService.verify(refreshToken, { secret: this.configService.get('JWT_REFRESH_SECRET', 'giftory_refresh_token_super_secret_key_2026') });
        const token = await this.refreshTokenModel.findOne({ token: { $in: [digest(refreshToken), refreshToken] }, expiresAt: { $gt: new Date() } });
        if (token && String(token.userId) === payload.sub) userId = payload.sub;
      } catch { /* Idempotent logout: already expired credentials are harmless. */ }
    }
    if (!userId) return { message: 'Đã kết thúc phiên đăng nhập.' };

    await this.userModel.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
    await this.refreshTokenModel.deleteMany({ userId: new Types.ObjectId(userId) });
    return { message: 'Đã đăng xuất khỏi các phiên trên tài khoản này.' };
  }
  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).select('-password');
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    return user;
  }
  async forgotPassword(email: string) {
    const endpoint = this.configService.get<string>('AUTH_EMAIL_URL');
    const apiToken = this.configService.get<string>('AUTH_EMAIL_TOKEN');
    const frontend = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');
    if (!endpoint?.startsWith('https://') || !apiToken) throw new ServiceUnavailableException('Dịch vụ gửi email chưa sẵn sàng. Vui lòng thử lại sau.');
    const response = { message: 'Nếu email có tài khoản phù hợp, bạn sẽ nhận được liên kết đặt lại mật khẩu. Vui lòng kiểm tra cả thư rác.' };
    const token = randomBytes(32).toString('hex');
    const user = await this.userModel.findOneAndUpdate({ email: email.trim().toLowerCase(), isActive: true, $or: [{ passwordResetRequestedAt: { $lt: new Date(Date.now() - 60000) } }, { passwordResetRequestedAt: null }] }, { $set: { passwordResetHash: digest(token), passwordResetExpiresAt: new Date(Date.now() + 30 * 60000), passwordResetRequestedAt: new Date() } }, { new: true });
    if (!user) return response;
    try {
      const url = new URL('/reset-password', frontend); url.hash = `token=${token}`;
      const sent = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ to: user.email, subject: 'Đặt lại mật khẩu Giftory', text: `Bạn vừa yêu cầu đặt lại mật khẩu Giftory. Mở liên kết sau trong 30 phút: ${url.toString()}\nNếu không phải bạn yêu cầu, hãy bỏ qua email này.` }), signal: AbortSignal.timeout(10000), redirect: 'error' });
      if (!sent.ok) throw new Error('Email delivery rejected');
    } catch {
      await this.userModel.updateOne({ _id: user._id, passwordResetHash: digest(token) }, { $unset: { passwordResetHash: 1, passwordResetExpiresAt: 1, passwordResetRequestedAt: 1 } });
      // Never include email/token/provider response in errors or logs.
    }
    return response;
  }
  async resetPassword(token: string, password: string) {
    const user = await this.userModel.findOneAndUpdate({ passwordResetHash: digest(token), passwordResetExpiresAt: { $gt: new Date() }, isActive: true }, { $set: { password: await bcrypt.hash(password, 12) }, $unset: { passwordResetHash: 1, passwordResetExpiresAt: 1 }, $inc: { tokenVersion: 1 } }, { new: true });
    if (!user) throw new BadRequestException('Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.');
    await this.refreshTokenModel.deleteMany({ userId: user._id });
    return { message: 'Đã đổi mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.' };
  }
  private async generateTokens(user: UserDocument) {
    const payload = { sub: user._id.toString(), email: user.email, role: user.role, tokenVersion: user.tokenVersion || 0 };
    const accessToken = this.jwtService.sign({ ...payload, kind: 'access' }, { secret: this.configService.get('JWT_ACCESS_SECRET', 'giftory_access_token_super_secret_key_2026'), expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m') as any, jwtid: randomUUID() });
    const refreshToken = this.jwtService.sign({ ...payload, kind: 'refresh' }, { secret: this.configService.get('JWT_REFRESH_SECRET', 'giftory_refresh_token_super_secret_key_2026'), expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d') as any, jwtid: randomUUID() });
    const expiry = this.jwtService.decode(refreshToken) as { exp: number };
    await this.refreshTokenModel.create({ userId: user._id, token: digest(refreshToken), expiresAt: new Date(expiry.exp * 1000) });
    return { accessToken, refreshToken };
  }
}
