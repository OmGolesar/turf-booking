import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { FirebaseAuthGuard } from '../../shared/auth/auth.guard';
import { Auth } from '../../shared/auth/auth-context.decorator';
import { Idempotent } from '../../shared/idempotency/idempotency.decorator';
import type { AuthContext } from '../../shared/auth/auth-context';
import { BookingSessionService } from './booking-session.service';
import { CreateBookingSessionDto } from './dtos/create-session.dto';

function meta(req: Request): { requestId?: string; route?: string; sourceIp?: string; userAgent?: string } {
  const id = (req as unknown as { id?: string | number }).id;
  return {
    requestId: id != null ? String(id) : undefined,
    route: req.originalUrl ?? req.url,
    sourceIp: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

@Controller('booking-sessions')
@UseGuards(FirebaseAuthGuard)
export class BookingSessionController {
  constructor(private readonly svc: BookingSessionService) {}

  @Post()
  @HttpCode(201)
  @Idempotent() // required — network retries must not create parallel sessions
  create(@Auth() ctx: AuthContext, @Body() dto: CreateBookingSessionDto, @Req() req: Request) {
    return this.svc.create(ctx, dto, meta(req));
  }

  @Get(':id')
  get(@Auth() ctx: AuthContext, @Param('id') id: string) {
    return this.svc.getOwn(ctx, id);
  }

  @Post(':id/actions/cancel')
  @HttpCode(200)
  cancel(@Auth() ctx: AuthContext, @Param('id') id: string, @Req() req: Request) {
    return this.svc.cancel(ctx, id, meta(req));
  }
}
