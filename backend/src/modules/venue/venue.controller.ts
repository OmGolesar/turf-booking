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
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { FirebaseAuthGuard } from '../../shared/auth/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { Auth } from '../../shared/auth/auth-context.decorator';
import type { AuthContext } from '../../shared/auth/auth-context';
import { VenueService } from './venue.service';
import { CreateVenueDto } from './dtos/create-venue.dto';
import { UpdateVenueDto } from './dtos/update-venue.dto';
import { AttachVenueMediaDto, UpdateVenueMediaDto } from './dtos/attach-media.dto';
import { ListMyVenuesDto } from './dtos/list-venues.dto';

function meta(req: Request): { requestId?: string; route?: string; sourceIp?: string; userAgent?: string } {
  const id = (req as unknown as { id?: string | number }).id;
  return {
    requestId: id != null ? String(id) : undefined,
    route: req.originalUrl ?? req.url,
    sourceIp: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

@Controller('venues')
@UseGuards(FirebaseAuthGuard)
export class VenueController {
  constructor(private readonly svc: VenueService) {}

  @Post()
  @HttpCode(201)
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  create(@Auth() ctx: AuthContext, @Body() dto: CreateVenueDto, @Req() req: Request) {
    return this.svc.create(ctx, dto, meta(req));
  }

  @Get('mine')
  @Roles(Role.PARTNER, Role.MANAGER, Role.STAFF, Role.ADMIN)
  listMine(@Auth() ctx: AuthContext, @Query() q: ListMyVenuesDto) {
    return this.svc.listMine(ctx, q);
  }

  @Get(':id')
  @Roles(Role.PARTNER, Role.MANAGER, Role.STAFF, Role.ADMIN)
  detail(@Auth() ctx: AuthContext, @Param('id') id: string) {
    return this.svc.getDetail(ctx, id);
  }

  @Patch(':id')
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  update(
    @Auth() ctx: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateVenueDto,
    @Headers('if-match') ifMatch: string | undefined,
    @Req() req: Request,
  ) {
    return this.svc.update(ctx, id, dto, ifMatch, meta(req));
  }

  @Post(':id/actions/submit-for-review')
  @HttpCode(200)
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  submit(@Auth() ctx: AuthContext, @Param('id') id: string, @Req() req: Request) {
    return this.svc.submitForReview(ctx, id, meta(req));
  }

  @Post(':id/actions/suspend')
  @HttpCode(200)
  @Roles(Role.PARTNER, Role.ADMIN)
  suspend(@Auth() ctx: AuthContext, @Param('id') id: string, @Req() req: Request) {
    return this.svc.suspend(ctx, id, meta(req));
  }

  @Post(':id/actions/archive')
  @HttpCode(200)
  @Roles(Role.PARTNER, Role.ADMIN)
  archive(@Auth() ctx: AuthContext, @Param('id') id: string, @Req() req: Request) {
    return this.svc.archive(ctx, id, meta(req));
  }

  @Post(':id/media')
  @HttpCode(201)
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  attachMedia(
    @Auth() ctx: AuthContext,
    @Param('id') id: string,
    @Body() dto: AttachVenueMediaDto,
    @Req() req: Request,
  ) {
    return this.svc.attachMedia(ctx, id, dto, meta(req));
  }

  @Patch(':id/media/:media_id')
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  updateMedia(
    @Auth() ctx: AuthContext,
    @Param('id') id: string,
    @Param('media_id') mediaId: string,
    @Body() dto: UpdateVenueMediaDto,
    @Req() req: Request,
  ) {
    return this.svc.updateMedia(ctx, id, mediaId, dto, meta(req));
  }

  @Delete(':id/media/:media_id')
  @HttpCode(200)
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  removeMedia(
    @Auth() ctx: AuthContext,
    @Param('id') id: string,
    @Param('media_id') mediaId: string,
    @Req() req: Request,
  ) {
    return this.svc.removeMedia(ctx, id, mediaId, meta(req));
  }
}
