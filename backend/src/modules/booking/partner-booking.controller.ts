import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { FirebaseAuthGuard } from '../../shared/auth/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { Auth } from '../../shared/auth/auth-context.decorator';
import { Idempotent } from '../../shared/idempotency/idempotency.decorator';
import type { AuthContext } from '../../shared/auth/auth-context';
import { OfflineBookingService } from './offline-booking.service';
import { CreateOfflineBookingDto } from './dtos/offline-booking.dto';

function meta(req: Request): { requestId?: string; route?: string; sourceIp?: string; userAgent?: string } {
  const id = (req as unknown as { id?: string | number }).id;
  return {
    requestId: id != null ? String(id) : undefined,
    route: req.originalUrl ?? req.url,
    sourceIp: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

@Controller('partners/me/bookings')
@UseGuards(FirebaseAuthGuard)
export class PartnerBookingController {
  constructor(private readonly offline: OfflineBookingService) {}

  @Post('offline')
  @HttpCode(201)
  @Idempotent()
  @Roles(Role.PARTNER, Role.MANAGER, Role.STAFF, Role.ADMIN)
  createOffline(@Auth() ctx: AuthContext, @Body() dto: CreateOfflineBookingDto, @Req() req: Request) {
    return this.offline.create(ctx, dto, meta(req));
  }
}
