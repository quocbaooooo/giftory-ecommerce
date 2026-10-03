import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null && (res as any).message) {
        message = (res as any).message;
      } else if (typeof res === 'string') {
        message = res;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(`HTTP Status: ${status} - Error Message: ${JSON.stringify(message)}`);

    response.status(status).json({
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message,
      errors: Array.isArray(message) ? message : undefined,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
}
