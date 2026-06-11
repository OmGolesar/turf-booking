import '../../../booking/domain/entities/booking.dart';
import '../../../core/errors/failures.dart';

abstract class MyBookingsRepository {
  Future<({List<Booking>? data, Failure? failure})> getUpcomingBookings();
  Future<({List<Booking>? data, Failure? failure})> getCompletedBookings();
}
