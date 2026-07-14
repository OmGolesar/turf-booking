import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { FirebaseAuthGuard } from '../../shared/auth/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { Auth } from '../../shared/auth/auth-context.decorator';
import type { AuthContext } from '../../shared/auth/auth-context';
import { GroundService } from './ground.service';
import { CreateGroundDto } from './dtos/create-ground.dto';
import { UpdateGroundDto } from './dtos/update-ground.dto';
import { UpsertGroundConfigurationDto } from './dtos/upsert-configuration.dto';
import { SetMaintenanceDto } from './dtos/set-maintenance.dto';
import { AttachGroundMediaDto, UpdateGroundMediaDto } from './dtos/attach-media.dto';

function meta(req: Request): { requestId?: string; route?: string; sourceIp?: string; userAgent?: string } {
  const id = (req as unknown as { id?: string | number }).id;
  return {
    requestId: id != null ? String(id) : undefined,
    route: req.originalUrl ?? req.url,
    sourceIp: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

// The Part 3.2 spec nests ground creation/list under /venues/:venue_id/grounds
// and puts everything else under /grounds/:id. Two controllers keep the routes flat.

@Controller('venues/:venue_id/grounds')
@UseGuards(FirebaseAuthGuard)
export class VenueGroundsController {
  constructor(private readonly svc: GroundService) {}

  @Post()
  @HttpCode(201)
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  create(
    @Auth() ctx: AuthContext,
    @Param('venue_id') venueId: string,
    @Body() dto: CreateGroundDto,
    @Req() req: Request,
  ) {
    return this.svc.create(ctx, venueId, dto, meta(req));
  }

  @Get()
  @Roles(Role.PARTNER, Role.MANAGER, Role.STAFF, Role.ADMIN)
  list(@Auth() ctx: AuthContext, @Param('venue_id') venueId: string) {
    return this.svc.listForVenue(ctx, venueId);
  }
}

@Controller('grounds')
@UseGuards(FirebaseAuthGuard)
export class GroundController {
  constructor(private readonly svc: GroundService) {}

  @Get(':id')
  @Roles(Role.PARTNER, Role.MANAGER, Role.STAFF, Role.ADMIN)
  detail(@Auth() ctx: AuthContext, @Param('id') id: string) {
    return this.svc.getDetail(ctx, id);
  }

  @Patch(':id')
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  update(@Auth() ctx: AuthContext, @Param('id') id: string, @Body() dto: UpdateGroundDto, @Req() req: Request) {
    return this.svc.update(ctx, id, dto, meta(req));
  }

  @Put(':id/configuration')
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  upsertConfiguration(
    @Auth() ctx: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpsertGroundConfigurationDto,
    @Req() req: Request,
  ) {
    return this.svc.upsertConfiguration(ctx, id, dto, meta(req));
  }

  @Post(':id/actions/activate')
  @HttpCode(200)
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  activate(@Auth() ctx: AuthContext, @Param('id') id: string, @Req() req: Request) {
    return this.svc.activate(ctx, id, meta(req));
  }

  @Post(':id/actions/set-maintenance')
  @HttpCode(200)
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  setMaintenance(
    @Auth() ctx: AuthContext,
    @Param('id') id: string,
    @Body() dto: SetMaintenanceDto,
    @Req() req: Request,
  ) {
    return this.svc.setMaintenance(ctx, id, dto, meta(req));
  }

  @Post(':id/actions/resume')
  @HttpCode(200)
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  resume(@Auth() ctx: AuthContext, @Param('id') id: string, @Req() req: Request) {
    return this.svc.resume(ctx, id, meta(req));
  }

  @Post(':id/actions/archive')
  @HttpCode(200)
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  archive(@Auth() ctx: AuthContext, @Param('id') id: string, @Req() req: Request) {
    return this.svc.archive(ctx, id, meta(req));
  }

  @Post(':id/media')
  @HttpCode(201)
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  attachMedia(
    @Auth() ctx: AuthContext,
    @Param('id') id: string,
    @Body() dto: AttachGroundMediaDto,
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
    @Body() dto: UpdateGroundMediaDto,
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
