import '../../../../shared/domain/usecases/usecase.dart';
import '../../../../core/errors/failures.dart';
import '../entities/booking.dart';
import '../repositories/booking_repository.dart';

class GetBookingSummaryUseCase implements UseCase<Booking, String> {
  final BookingRepository repository;
  const GetBookingSummaryUseCase(this.repository);
  @override
  Future<({Booking? data, Failure? failure})> call(String params) => repository.getBookingSummary(params);
}
