import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { FirebaseAuthGuard } from '../../shared/auth/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { Auth } from '../../shared/auth/auth-context.decorator';
import type { AuthContext } from '../../shared/auth/auth-context';
import { PricingService } from './pricing.service';
import { CreatePricingRuleDto, UpdatePricingRuleDto } from './dtos/pricing-rule.dto';

function meta(req: Request): { requestId?: string; route?: string; sourceIp?: string; userAgent?: string } {
  const id = (req as unknown as { id?: string | number }).id;
  return {
    requestId: id != null ? String(id) : undefined,
    route: req.originalUrl ?? req.url,
    sourceIp: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

@Controller('grounds/:id/pricing-rules')
@UseGuards(FirebaseAuthGuard)
export class GroundPricingController {
  constructor(private readonly svc: PricingService) {}

  @Get()
  @Roles(Role.PARTNER, Role.MANAGER, Role.STAFF, Role.ADMIN)
  list(@Auth() ctx: AuthContext, @Param('id') id: string) {
    return this.svc.list(ctx, id);
  }

  @Post()
  @HttpCode(201)
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  create(@Auth() ctx: AuthContext, @Param('id') id: string, @Body() dto: CreatePricingRuleDto, @Req() req: Request) {
    return this.svc.create(ctx, id, dto, meta(req));
  }
}

@Controller('pricing-rules')
@UseGuards(FirebaseAuthGuard)
export class PricingController {
  constructor(private readonly svc: PricingService) {}

  @Patch(':id')
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  update(@Auth() ctx: AuthContext, @Param('id') id: string, @Body() dto: UpdatePricingRuleDto, @Req() req: Request) {
    return this.svc.update(ctx, id, dto, meta(req));
  }

  @Delete(':id')
  @HttpCode(200)
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  deactivate(@Auth() ctx: AuthContext, @Param('id') id: string, @Req() req: Request) {
    return this.svc.deactivate(ctx, id, meta(req));
  }
}
