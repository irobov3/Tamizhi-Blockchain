import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

@Injectable()
export class CustomThrottleGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: any,
  ): Promise<void> {
    throw new ThrottlerException(
      `Rate limit exceeded. Too many requests. Please wait before retrying.`,
    );
  }

  protected getTracker(req: Record<string, any>): Promise<string> {
    // Use X-Forwarded-For header if behind a proxy, fallback to ip
    const forwarded = req.headers?.['x-forwarded-for'];
    const ip = Array.isArray(forwarded) ? forwarded[0] : (forwarded || req.ip || '0.0.0.0');
    return Promise.resolve(ip.toString().split(',')[0].trim());
  }
}
