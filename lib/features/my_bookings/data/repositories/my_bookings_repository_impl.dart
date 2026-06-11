import '../../domain/repositories/my_bookings_repository.dart';
import '../../../booking/domain/entities/booking.dart';
import '../../../../core/errors/failures.dart';

class MyBookingsRepositoryImpl implements MyBookingsRepository {
  @override
  Future<({List<Booking>? data, Failure? failure})> getUpcomingBookings() async { throw UnimplementedError(); }
  @override
  Future<({List<Booking>? data, Failure? failure})> getCompletedBookings() async { throw UnimplementedError(); }
}
