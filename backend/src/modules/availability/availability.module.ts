import { Global, Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { AvailabilityCache } from './availability.cache';

@Global()
@Module({
  providers: [AvailabilityService, AvailabilityCache],
  exports: [AvailabilityService, AvailabilityCache],
})
export class AvailabilityModule {}
