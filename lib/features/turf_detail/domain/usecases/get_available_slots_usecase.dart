import '../../../../shared/domain/usecases/usecase.dart';
import '../../../../core/errors/failures.dart';
import '../entities/time_slot.dart';
import '../repositories/turf_detail_repository.dart';

class GetAvailableSlotsParams {
  final String turfId;
  final DateTime date;
  const GetAvailableSlotsParams({required this.turfId, required this.date});
}

class GetAvailableSlotsUseCase
    implements UseCase<List<TimeSlot>, GetAvailableSlotsParams> {
  final TurfDetailRepository repository;
  const GetAvailableSlotsUseCase(this.repository);
  @override
  Future<({List<TimeSlot>? data, Failure? failure})> call(
          GetAvailableSlotsParams params) =>
      repository.getAvailableSlots(params.turfId, date: params.date);
}
