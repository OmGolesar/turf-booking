import { Body, Controller, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { FirebaseAuthGuard } from '../../shared/auth/auth.guard';
import { Auth } from '../../shared/auth/auth-context.decorator';
import { Idempotent } from '../../shared/idempotency/idempotency.decorator';
import type { AuthContext } from '../../shared/auth/auth-context';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dtos/create-review.dto';

function meta(req: Request): { requestId?: string; route?: string; sourceIp?: string; userAgent?: string } {
  const id = (req as unknown as { id?: string | number }).id;
  return {
    requestId: id != null ? String(id) : undefined,
    route: req.originalUrl ?? req.url,
    sourceIp: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

@Controller('bookings')
@UseGuards(FirebaseAuthGuard)
export class ReviewController {
  constructor(private readonly svc: ReviewService) {}

  @Post(':id/review')
  @HttpCode(201)
  @Idempotent()
  create(@Auth() ctx: AuthContext, @Param('id') id: string, @Body() dto: CreateReviewDto, @Req() req: Request) {
    return this.svc.create(ctx, id, dto, meta(req));
  }
}
