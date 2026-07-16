import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { FirebaseAuthGuard } from '../../shared/auth/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { Auth } from '../../shared/auth/auth-context.decorator';
import { Idempotent } from '../../shared/idempotency/idempotency.decorator';
import type { AuthContext } from '../../shared/auth/auth-context';
import { OfflineBookingService } from './offline-booking.service';
import { PartnerBookingService } from './partner-booking.service';
import { CreateOfflineBookingDto } from './dtos/offline-booking.dto';
import { PartnerCancelBookingDto } from './dtos/partner-cancel-booking.dto';
import { ListPartnerBookingsDto } from './dtos/list-partner-bookings.dto';
import { PartnerCalendarDto } from './dtos/partner-calendar.dto';

function meta(req: Request): { requestId?: string; route?: string; sourceIp?: string; userAgent?: string } {
  const id = (req as unknown as { id?: string | number }).id;
  return {
    requestId: id != null ? String(id) : undefined,
    route: req.originalUrl ?? req.url,
    sourceIp: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

@Controller('partners/me')
@UseGuards(FirebaseAuthGuard)
export class PartnerBookingController {
  constructor(
    private readonly offline: OfflineBookingService,
    private readonly partner: PartnerBookingService,
  ) {}

  @Post('bookings/offline')
  @HttpCode(201)
  @Idempotent()
  @Roles(Role.PARTNER, Role.MANAGER, Role.STAFF, Role.ADMIN)
  createOffline(@Auth() ctx: AuthContext, @Body() dto: CreateOfflineBookingDto, @Req() req: Request) {
    return this.offline.create(ctx, dto, meta(req));
  }

  @Get('bookings')
  @Roles(Role.PARTNER, Role.MANAGER, Role.STAFF, Role.ADMIN)
  listBookings(@Auth() ctx: AuthContext, @Query() dto: ListPartnerBookingsDto) {
    return this.partner.listBookings(ctx, dto);
  }

  @Get('calendar')
  @Roles(Role.PARTNER, Role.MANAGER, Role.STAFF, Role.ADMIN)
  calendar(@Auth() ctx: AuthContext, @Query() dto: PartnerCalendarDto) {
    return this.partner.calendar(ctx, dto);
  }

  @Post('bookings/:id/actions/check-in')
  @HttpCode(200)
  @Idempotent()
  @Roles(Role.PARTNER, Role.MANAGER, Role.STAFF, Role.ADMIN)
  checkIn(@Auth() ctx: AuthContext, @Param('id') id: string, @Req() req: Request) {
    return this.partner.checkIn(ctx, id, meta(req));
  }

  @Post('bookings/:id/actions/complete')
  @HttpCode(200)
  @Idempotent()
  @Roles(Role.PARTNER, Role.MANAGER, Role.STAFF, Role.ADMIN)
  complete(@Auth() ctx: AuthContext, @Param('id') id: string, @Req() req: Request) {
    return this.partner.complete(ctx, id, meta(req));
  }

  @Post('bookings/:id/actions/mark-no-show')
  @HttpCode(200)
  @Idempotent()
  @Roles(Role.PARTNER, Role.MANAGER, Role.STAFF, Role.ADMIN)
  markNoShow(@Auth() ctx: AuthContext, @Param('id') id: string, @Req() req: Request) {
    return this.partner.markNoShow(ctx, id, meta(req));
  }

  @Post('bookings/:id/actions/cancel')
  @HttpCode(200)
  @Idempotent()
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  cancel(@Auth() ctx: AuthContext, @Param('id') id: string, @Body() dto: PartnerCancelBookingDto, @Req() req: Request) {
    return this.partner.partnerCancel(ctx, id, dto, meta(req));
  }
}
