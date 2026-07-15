import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { FirebaseAuthGuard } from '../../shared/auth/auth.guard';
import { Auth } from '../../shared/auth/auth-context.decorator';
import type { AuthContext } from '../../shared/auth/auth-context';
import { UploadService } from './upload.service';
import { SignUploadDto } from './dtos/sign-upload.dto';

function meta(req: Request): { requestId?: string; route?: string; sourceIp?: string; userAgent?: string } {
  const id = (req as unknown as { id?: string | number }).id;
  return {
    requestId: id != null ? String(id) : undefined,
    route: req.originalUrl ?? req.url,
    sourceIp: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

@Controller('uploads')
@UseGuards(FirebaseAuthGuard)
export class UploadController {
  constructor(private readonly svc: UploadService) {}

  @Post('sign')
  @HttpCode(200)
  sign(@Auth() ctx: AuthContext, @Body() dto: SignUploadDto, @Req() req: Request) {
    return this.svc.sign(ctx, dto, meta(req));
  }
}
