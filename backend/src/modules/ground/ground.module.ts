import { Module } from '@nestjs/common';
import { GroundController, VenueGroundsController } from './ground.controller';
import { GroundService } from './ground.service';

@Module({
  controllers: [GroundController, VenueGroundsController],
  providers: [GroundService],
  exports: [GroundService],
})
export class GroundModule {}
