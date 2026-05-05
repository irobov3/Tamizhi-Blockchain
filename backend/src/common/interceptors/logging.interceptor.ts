import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(
      `→ [${requestId}] ${method} ${url} | IP: ${ip} | UA: ${userAgent.substring(0, 100)}`,
    );

    return next.handle().pipe(
      tap(() => {
        const statusCode = response.statusCode;
        const duration = Date.now() - startTime;

        this.logger.log(
          `← [${requestId}] ${method} ${url} | ${statusCode} | ${duration}ms`,
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.error(
          `← [${requestId}] ${method} ${url} | ERROR | ${duration}ms | ${error.message}`,
        );
        return throwError(() => error);
      }),
    );
  }
}
