import '../../domain/repositories/turf_detail_repository.dart';
import '../../domain/entities/turf_detail.dart';
import '../../domain/entities/review.dart';
import '../../domain/entities/time_slot.dart';
import '../../../../core/errors/failures.dart';

class TurfDetailRepositoryImpl implements TurfDetailRepository {
  @override
  Future<({TurfDetail? data, Failure? failure})> getTurfDetail(
      String turfId) async {
    throw UnimplementedError();
  }

  @override
  Future<({List<Review>? data, Failure? failure})> getReviews(String turfId,
      {int page = 1}) async {
    throw UnimplementedError();
  }

  @override
  Future<({List<TimeSlot>? data, Failure? failure})> getAvailableSlots(
      String turfId,
      {required DateTime date}) async {
    throw UnimplementedError();
  }
}
