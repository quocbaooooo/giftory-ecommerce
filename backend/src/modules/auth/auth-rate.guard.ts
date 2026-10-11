import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
@Injectable()
export class AuthRateGuard implements CanActivate {
  private buckets = new Map<string, { count: number; reset: number }>();
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const now = Date.now();
    for (const [key, value] of this.buckets) if (value.reset <= now) this.buckets.delete(key);
    const key = `${req.ip}:${req.route?.path || req.path}`;
    const bucket = this.buckets.get(key) || { count: 0, reset: now + 15 * 60000 };
    const limit = req.path.includes('forgot-password') ? 5 : 30;
    if (bucket.count >= limit || (!this.buckets.has(key) && this.buckets.size >= 10000)) {
      context.switchToHttp().getResponse().setHeader('Retry-After', Math.max(1, Math.ceil((bucket.reset - now) / 1000)));
      throw new HttpException('Bạn đã thử quá nhiều lần. Vui lòng chờ và thử lại sau.', HttpStatus.TOO_MANY_REQUESTS);
    }
    bucket.count++; this.buckets.set(key, bucket); return true;
  }
}
