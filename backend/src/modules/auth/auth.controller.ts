import { Body, Controller, Get, Headers, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthSessionDto } from './dtos/auth-session.dto';
import { FirebaseAuthGuard } from '../../shared/auth/auth.guard';
import { Auth } from '../../shared/auth/auth-context.decorator';
import type { AuthContext } from '../../shared/auth/auth-context';

@Controller('auth')
export class AuthController {
  constructor(private readonly svc: AuthService) {}

  // POST /v1/auth/session — provisioning path, so the FirebaseAuthGuard is
  // NOT applied here (it would reject unprovisioned identities).
  @Post('session')
  @HttpCode(200)
  session(
    @Req() req: Request,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-app-variant') appVariant: string | undefined,
    @Body() dto: AuthSessionDto,
  ) {
    const rawId = (req as unknown as { id?: string | number }).id;
    return this.svc.session({
      bearerToken: authorization ?? '',
      intendedRole: dto.intended_role,
      appVariant,
      requestId: rawId != null ? String(rawId) : undefined,
      route: req.originalUrl ?? req.url,
      sourceIp: req.ip,
      userAgent: req.get('user-agent') ?? undefined,
    });
  }

  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  me(@Auth() ctx: AuthContext) {
    return this.svc.me(ctx);
  }
}
