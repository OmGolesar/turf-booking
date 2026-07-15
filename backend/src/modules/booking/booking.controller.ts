import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { FirebaseAuthGuard } from '../../shared/auth/auth.guard';
import { Auth } from '../../shared/auth/auth-context.decorator';
import { Idempotent } from '../../shared/idempotency/idempotency.decorator';
import type { AuthContext } from '../../shared/auth/auth-context';
import { BookingService } from './booking.service';
import { ConfirmBookingDto } from './dtos/confirm-booking.dto';
import { CancelBookingDto } from './dtos/cancel-booking.dto';

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
export class BookingController {
  constructor(private readonly svc: BookingService) {}

  @Post()
  @HttpCode(201)
  @Idempotent()
  confirm(@Auth() ctx: AuthContext, @Body() dto: ConfirmBookingDto, @Req() req: Request) {
    return this.svc.confirm(ctx, dto, meta(req));
  }

  @Get(':idOrRef')
  getOne(@Auth() ctx: AuthContext, @Param('idOrRef') idOrRef: string) {
    return this.svc.getOne(ctx, idOrRef);
  }

  @Post(':id/actions/cancel')
  @HttpCode(200)
  @Idempotent()
  cancel(@Auth() ctx: AuthContext, @Param('id') id: string, @Body() dto: CancelBookingDto, @Req() req: Request) {
    return this.svc.cancel(ctx, id, dto, meta(req));
  }

  @Post(':id/actions/request-refund')
  @HttpCode(202)
  requestRefund(@Auth() ctx: AuthContext, @Param('id') id: string, @Body() dto: CancelBookingDto, @Req() req: Request) {
    return this.svc.requestRefund(ctx, id, dto.reason, meta(req));
  }
}
