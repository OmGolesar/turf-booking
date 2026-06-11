import '../../../../shared/domain/usecases/usecase.dart';
import '../../../../core/errors/failures.dart';
import '../repositories/booking_repository.dart';

class CancelBookingUseCase implements UseCase<bool, String> {
  final BookingRepository repository;
  const CancelBookingUseCase(this.repository);
  @override
  Future<({bool? data, Failure? failure})> call(String params) => repository.cancelBooking(params);
}
