import { Body, Controller, Get, HttpCode, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { FirebaseAuthGuard } from '../../shared/auth/auth.guard';
import { Auth } from '../../shared/auth/auth-context.decorator';
import { Roles } from '../../shared/auth/roles.decorator';
import type { AuthContext } from '../../shared/auth/auth-context';
import { PartnerService } from './partner.service';
import { CreatePartnerDto } from './dtos/create-partner.dto';
import { UpdatePartnerDto } from './dtos/update-partner.dto';
import { DashboardQueryDto } from './dtos/dashboard.dto';

function meta(req: Request): { requestId?: string; route?: string; sourceIp?: string; userAgent?: string } {
  const id = (req as unknown as { id?: string | number }).id;
  return {
    requestId: id != null ? String(id) : undefined,
    route: req.originalUrl ?? req.url,
    sourceIp: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

@Controller('partners')
@UseGuards(FirebaseAuthGuard)
export class PartnerController {
  constructor(private readonly svc: PartnerService) {}

  // Any authenticated identity may self-register as PARTNER — the service
  // enforces email/phone verification and the 1:1 rule.
  @Post()
  @HttpCode(201)
  create(@Auth() ctx: AuthContext, @Body() dto: CreatePartnerDto, @Req() req: Request) {
    return this.svc.create(ctx, dto, meta(req));
  }

  @Get('me')
  @Roles(Role.PARTNER, Role.MANAGER, Role.STAFF, Role.ADMIN)
  me(@Auth() ctx: AuthContext) {
    return this.svc.me(ctx);
  }

  @Patch('me')
  @Roles(Role.PARTNER, Role.ADMIN)
  update(@Auth() ctx: AuthContext, @Body() dto: UpdatePartnerDto, @Req() req: Request) {
    return this.svc.update(ctx, dto, meta(req));
  }

  @Post('me/actions/submit-for-review')
  @HttpCode(200)
  @Roles(Role.PARTNER)
  submitForReview(@Auth() ctx: AuthContext, @Req() req: Request) {
    return this.svc.submitForReview(ctx, meta(req));
  }

  @Get('me/dashboard')
  @Roles(Role.PARTNER, Role.MANAGER, Role.STAFF, Role.ADMIN)
  dashboard(@Auth() ctx: AuthContext, @Query() q: DashboardQueryDto) {
    return this.svc.dashboard(ctx, q.range ?? 'today');
  }
}
