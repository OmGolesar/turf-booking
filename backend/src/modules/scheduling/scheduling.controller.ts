import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { FirebaseAuthGuard } from '../../shared/auth/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { Auth } from '../../shared/auth/auth-context.decorator';
import type { AuthContext } from '../../shared/auth/auth-context';
import { SchedulingService } from './scheduling.service';
import { PutOperatingHoursDto } from './dtos/operating-hours.dto';
import { CreateExceptionDto } from './dtos/exception.dto';
import { CreateMaintenanceBlockDto } from './dtos/maintenance-block.dto';

function meta(req: Request): { requestId?: string; route?: string; sourceIp?: string; userAgent?: string } {
  const id = (req as unknown as { id?: string | number }).id;
  return {
    requestId: id != null ? String(id) : undefined,
    route: req.originalUrl ?? req.url,
    sourceIp: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

@Controller('grounds/:id')
@UseGuards(FirebaseAuthGuard)
export class SchedulingController {
  constructor(private readonly svc: SchedulingService) {}

  @Put('operating-hours')
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  putHours(@Auth() ctx: AuthContext, @Param('id') id: string, @Body() dto: PutOperatingHoursDto, @Req() req: Request) {
    return this.svc.putOperatingHours(ctx, id, dto, meta(req));
  }

  @Get('operating-hours')
  @Roles(Role.PARTNER, Role.MANAGER, Role.STAFF, Role.ADMIN)
  listHours(@Auth() ctx: AuthContext, @Param('id') id: string) {
    return this.svc.listOperatingHours(ctx, id);
  }

  @Post('exceptions')
  @HttpCode(201)
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  createException(@Auth() ctx: AuthContext, @Param('id') id: string, @Body() dto: CreateExceptionDto, @Req() req: Request) {
    return this.svc.createException(ctx, id, dto, meta(req));
  }

  @Get('exceptions')
  @Roles(Role.PARTNER, Role.MANAGER, Role.STAFF, Role.ADMIN)
  listExceptions(
    @Auth() ctx: AuthContext,
    @Param('id') id: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
  ) {
    return this.svc.listExceptions(ctx, id, from, to);
  }

  @Delete('exceptions/:exception_id')
  @HttpCode(200)
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  removeException(
    @Auth() ctx: AuthContext,
    @Param('id') id: string,
    @Param('exception_id') exceptionId: string,
    @Req() req: Request,
  ) {
    return this.svc.removeException(ctx, id, exceptionId, meta(req));
  }

  @Post('maintenance-blocks')
  @HttpCode(201)
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  createMaintenanceBlock(
    @Auth() ctx: AuthContext,
    @Param('id') id: string,
    @Query('force') force: string | undefined,
    @Body() dto: CreateMaintenanceBlockDto,
    @Req() req: Request,
  ) {
    return this.svc.createMaintenanceBlock(ctx, id, dto, force === 'true', meta(req));
  }

  @Get('maintenance-blocks')
  @Roles(Role.PARTNER, Role.MANAGER, Role.STAFF, Role.ADMIN)
  listMaintenance(@Auth() ctx: AuthContext, @Param('id') id: string) {
    return this.svc.listMaintenanceBlocks(ctx, id);
  }

  @Delete('maintenance-blocks/:block_id')
  @HttpCode(200)
  @Roles(Role.PARTNER, Role.MANAGER, Role.ADMIN)
  removeMaintenance(
    @Auth() ctx: AuthContext,
    @Param('id') id: string,
    @Param('block_id') blockId: string,
    @Req() req: Request,
  ) {
    return this.svc.removeMaintenanceBlock(ctx, id, blockId, meta(req));
  }
}
