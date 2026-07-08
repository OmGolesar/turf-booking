import '../../../../shared/domain/usecases/usecase.dart';
import '../../../../core/errors/failures.dart';
import '../../../booking/domain/entities/booking.dart';
import '../repositories/my_bookings_repository.dart';

class GetCompletedBookingsUseCase implements UseCase<List<Booking>, NoParams> {
  final MyBookingsRepository repository;
  const GetCompletedBookingsUseCase(this.repository);
  @override
  Future<({List<Booking>? data, Failure? failure})> call(NoParams params) =>
      repository.getCompletedBookings();
}
