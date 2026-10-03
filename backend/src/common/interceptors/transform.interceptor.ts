import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode || 200;

    return next.handle().pipe(
      map(data => {
        // If data is already an ApiResponse format
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          return data;
        }

        let meta: any = undefined;
        let finalData = data;

        if (data && typeof data === 'object' && 'items' in data && 'meta' in data) {
          finalData = data.items;
          meta = data.meta;
        }

        return {
          success: true,
          statusCode,
          message: 'Success',
          data: finalData,
          meta
        };
      })
    );
  }
}
