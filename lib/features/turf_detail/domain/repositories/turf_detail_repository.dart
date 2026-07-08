import '../entities/turf_detail.dart';
import '../entities/review.dart';
import '../entities/time_slot.dart';
import '../../../../core/errors/failures.dart';

abstract class TurfDetailRepository {
  Future<({TurfDetail? data, Failure? failure})> getTurfDetail(String turfId);
  Future<({List<Review>? data, Failure? failure})> getReviews(String turfId,
      {int page = 1});
  Future<({List<TimeSlot>? data, Failure? failure})> getAvailableSlots(
      String turfId,
      {required DateTime date});
}
