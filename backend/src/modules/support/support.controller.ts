import { Body, Controller, Get, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { FirebaseAuthGuard } from '../../shared/auth/auth.guard';
import { Auth } from '../../shared/auth/auth-context.decorator';
import type { AuthContext } from '../../shared/auth/auth-context';
import { SupportService } from './support.service';
import { CreateSupportTicketDto, SupportLookupDto } from './dtos/support.dto';

function meta(req: Request): { requestId?: string; route?: string; sourceIp?: string; userAgent?: string } {
  const id = (req as unknown as { id?: string | number }).id;
  return {
    requestId: id != null ? String(id) : undefined,
    route: req.originalUrl ?? req.url,
    sourceIp: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

@Controller('support')
@UseGuards(FirebaseAuthGuard)
export class SupportController {
  constructor(private readonly svc: SupportService) {}

  @Get('lookup')
  lookup(@Auth() ctx: AuthContext, @Query() dto: SupportLookupDto) {
    return this.svc.lookup(ctx, dto.code);
  }

  @Post('tickets')
  @HttpCode(202)
  createTicket(@Auth() ctx: AuthContext, @Body() dto: CreateSupportTicketDto, @Req() req: Request) {
    return this.svc.createTicket(ctx, dto, meta(req));
  }
}
