import { Module } from '@nestjs/common';
import { PricingController, GroundPricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { GroundModule } from '../ground/ground.module';

@Module({
  imports: [GroundModule],
  controllers: [PricingController, GroundPricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
