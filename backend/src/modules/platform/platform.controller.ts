import { Controller, Get, Query } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { VersionCheckDto } from './dtos/version-check.dto';

// Public endpoints — no auth guard. Part 3.5 §9, §10.
@Controller('platform')
export class PlatformController {
  constructor(private readonly svc: PlatformService) {}

  @Get('config')
  config() {
    return this.svc.config_();
  }

  @Get('version-check')
  versionCheck(@Query() dto: VersionCheckDto) {
    return this.svc.versionCheck(dto);
  }
}
