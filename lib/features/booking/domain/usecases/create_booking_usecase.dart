import '../../../../shared/domain/usecases/usecase.dart';
import '../../../../core/errors/failures.dart';
import '../entities/booking.dart';
import '../repositories/booking_repository.dart';

class CreateBookingParams {
  final String turfId;
  final DateTime date;
  final String startTime;
  final String endTime;
  const CreateBookingParams({required this.turfId, required this.date, required this.startTime, required this.endTime});
}

class CreateBookingUseCase implements UseCase<Booking, CreateBookingParams> {
  final BookingRepository repository;
  const CreateBookingUseCase(this.repository);
  @override
  Future<({Booking? data, Failure? failure})> call(CreateBookingParams params) =>
    repository.createBooking(turfId: params.turfId, date: params.date, startTime: params.startTime, endTime: params.endTime);
}
