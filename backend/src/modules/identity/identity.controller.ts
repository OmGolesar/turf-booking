import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AppVariant } from '@prisma/client';
import type { Request } from 'express';
import { FirebaseAuthGuard } from '../../shared/auth/auth.guard';
import { Auth } from '../../shared/auth/auth-context.decorator';
import { Idempotent } from '../../shared/idempotency/idempotency.decorator';
import type { AuthContext } from '../../shared/auth/auth-context';
import { IdentityService } from './identity.service';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { RequestPhoneVerificationDto } from './dtos/request-phone-verification.dto';
import { RegisterDeviceTokenDto } from './dtos/register-device-token.dto';
import { LogoutDto } from './dtos/logout.dto';
import { ListNotificationsDto } from './dtos/list-notifications.dto';

function meta(req: Request): { requestId?: string; route?: string; sourceIp?: string; userAgent?: string } {
  const id = (req as unknown as { id?: string | number }).id;
  return {
    requestId: id != null ? String(id) : undefined,
    route: req.originalUrl ?? req.url,
    sourceIp: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

function resolveAppVariant(header: string | undefined): AppVariant {
  if (header === AppVariant.PARTNER || header === AppVariant.ADMIN) return header;
  return AppVariant.CUSTOMER;
}

@Controller('identity')
@UseGuards(FirebaseAuthGuard)
export class IdentityController {
  constructor(private readonly svc: IdentityService) {}

  @Patch('profile')
  updateProfile(@Auth() ctx: AuthContext, @Body() dto: UpdateProfileDto, @Req() req: Request) {
    return this.svc.updateProfile(ctx, dto, meta(req));
  }

  // 5 requests / hour / identity (Part 3.1 §6). Rate-limit key = identity via RateLimitGuard.
  @Post('phone/request-verification')
  @HttpCode(200)
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  requestPhoneVerification(@Auth() ctx: AuthContext, @Body() dto: RequestPhoneVerificationDto) {
    return this.svc.requestPhoneVerification(ctx, dto.phone);
  }

  @Post('phone/confirm')
  @HttpCode(200)
  confirmPhone(
    @Auth() ctx: AuthContext,
    @Headers('authorization') authorization: string | undefined,
    @Req() req: Request,
  ) {
    return this.svc.confirmPhone(ctx, authorization ?? '', meta(req));
  }

  @Get('customer-code')
  customerCode(@Auth() ctx: AuthContext) {
    return this.svc.customerCode(ctx);
  }

  @Post('device-tokens')
  @Idempotent({ optional: true })
  registerDeviceToken(
    @Auth() ctx: AuthContext,
    @Body() dto: RegisterDeviceTokenDto,
    @Headers('x-device-id') xDeviceId: string | undefined,
    @Headers('x-app-variant') xAppVariant: string | undefined,
    @Req() req: Request,
  ) {
    return this.svc.registerDeviceToken(ctx, dto, xDeviceId, resolveAppVariant(xAppVariant), meta(req));
  }

  @Delete('device-tokens/:id')
  @HttpCode(200)
  deactivateDeviceToken(@Auth() ctx: AuthContext, @Param('id') id: string, @Req() req: Request) {
    return this.svc.deactivateDeviceToken(ctx, id, meta(req));
  }

  @Get('notifications')
  listNotifications(@Auth() ctx: AuthContext, @Query() dto: ListNotificationsDto) {
    return this.svc.listNotifications(ctx, dto);
  }

  @Post('notifications/:id/actions/mark-read')
  @HttpCode(200)
  markRead(@Auth() ctx: AuthContext, @Param('id') id: string) {
    return this.svc.markNotificationRead(ctx, id);
  }

  @Post('notifications/actions/mark-all-read')
  @HttpCode(200)
  markAllRead(@Auth() ctx: AuthContext) {
    return this.svc.markAllNotificationsRead(ctx);
  }

  @Post('actions/logout')
  @HttpCode(200)
  logout(
    @Auth() ctx: AuthContext,
    @Body() dto: LogoutDto,
    @Headers('x-app-variant') xAppVariant: string | undefined,
    @Req() req: Request,
  ) {
    return this.svc.logout(ctx, dto.device_id, resolveAppVariant(xAppVariant), meta(req));
  }

  @Delete()
  @HttpCode(200)
  requestDeletion(@Auth() ctx: AuthContext, @Req() req: Request) {
    return this.svc.requestDeletion(ctx, meta(req));
  }
}
