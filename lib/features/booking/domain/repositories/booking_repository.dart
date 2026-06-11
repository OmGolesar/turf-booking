import '../entities/booking.dart';
import '../../../core/errors/failures.dart';

abstract class BookingRepository {
  Future<({Booking? data, Failure? failure})> createBooking({
    required String turfId, required DateTime date,
    required String startTime, required String endTime,
  });
  Future<({bool? data, Failure? failure})> cancelBooking(String bookingId);
  Future<({Booking? data, Failure? failure})> getBookingSummary(String bookingId);
}
