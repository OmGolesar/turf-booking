import { Module } from '@nestjs/common';
import { RazorpayModule } from '../../shared/razorpay/razorpay.module';
import { AvailabilityModule } from '../availability/availability.module';
import { RazorpayWebhookController } from './razorpay.controller';
import { RazorpayWebhookHandlerService } from './razorpay-handler.service';

@Module({
  imports: [RazorpayModule, AvailabilityModule],
  controllers: [RazorpayWebhookController],
  providers: [RazorpayWebhookHandlerService],
})
export class WebhookModule {}
