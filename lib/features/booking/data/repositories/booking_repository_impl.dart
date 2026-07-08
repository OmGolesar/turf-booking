import '../../domain/repositories/booking_repository.dart';
import '../../domain/entities/booking.dart';
import '../../../../core/errors/failures.dart';

class BookingRepositoryImpl implements BookingRepository {
  @override
  Future<({Booking? data, Failure? failure})> createBooking(
      {required String turfId,
      required DateTime date,
      required String startTime,
      required String endTime}) async {
    throw UnimplementedError();
  }

  @override
  Future<({bool? data, Failure? failure})> cancelBooking(
      String bookingId) async {
    throw UnimplementedError();
  }

  @override
  Future<({Booking? data, Failure? failure})> getBookingSummary(
      String bookingId) async {
    throw UnimplementedError();
  }
}
