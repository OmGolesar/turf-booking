import { Module } from '@nestjs/common';
import { BookingSessionController } from './booking-session.controller';
import { BookingSessionService } from './booking-session.service';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { PartnerBookingController } from './partner-booking.controller';
import { OfflineBookingService } from './offline-booking.service';
import { PartnerBookingService } from './partner-booking.service';

@Module({
  controllers: [BookingSessionController, BookingController, PartnerBookingController],
  providers: [BookingSessionService, BookingService, OfflineBookingService, PartnerBookingService],
  exports: [BookingService, BookingSessionService, OfflineBookingService, PartnerBookingService],
})
export class BookingModule {}
