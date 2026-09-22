import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { FirebaseAuthGuard } from '../../shared/auth/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { Auth } from '../../shared/auth/auth-context.decorator';
import type { AuthContext } from '../../shared/auth/auth-context';
import { RefundService } from './refund.service';
import { ListRefundRequestsDto } from './dtos/list-refund-requests.dto';
import { ApproveRefundRequestDto, RejectRefundRequestDto } from './dtos/decide-refund-request.dto';

function meta(req: Request): { requestId?: string; route?: string; sourceIp?: string; userAgent?: string } {
  const id = (req as unknown as { id?: string | number }).id;
  return {
    requestId: id != null ? String(id) : undefined,
    route: req.originalUrl ?? req.url,
    sourceIp: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

// Admin-only refund queue.
// GET  /admin/refunds                       — list, default status=PENDING_ADMIN
// GET  /admin/refunds/:id                   — fetch one
// POST /admin/refunds/:id/actions/approve   — execute Razorpay refund (idempotent via notes.idempotency_key)
// POST /admin/refunds/:id/actions/reject    — mark REJECTED with admin notes
@Controller('admin/refunds')
@UseGuards(FirebaseAuthGuard)
@Roles(Role.ADMIN)
export class RefundAdminController {
  constructor(private readonly svc: RefundService) {}

  @Get()
  list(@Auth() ctx: AuthContext, @Query() dto: ListRefundRequestsDto) {
    return this.svc.listPending(ctx, dto);
  }

  @Get(':id')
  getOne(@Auth() ctx: AuthContext, @Param('id') id: string) {
    return this.svc.getOne(ctx, id);
  }

  @Post(':id/actions/approve')
  @HttpCode(200)
  approve(
    @Auth() ctx: AuthContext,
    @Param('id') id: string,
    @Body() dto: ApproveRefundRequestDto,
    @Req() req: Request,
  ) {
    return this.svc.approve(ctx, id, dto.admin_notes, meta(req));
  }

  @Post(':id/actions/reject')
  @HttpCode(200)
  reject(
    @Auth() ctx: AuthContext,
    @Param('id') id: string,
    @Body() dto: RejectRefundRequestDto,
    @Req() req: Request,
  ) {
    return this.svc.reject(ctx, id, dto.admin_notes, meta(req));
  }
}
