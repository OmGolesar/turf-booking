import { Module } from '@nestjs/common';
import { RefundAdminController } from './refund-admin.controller';
import { RefundService } from './refund.service';

@Module({
  controllers: [RefundAdminController],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundModule {}
