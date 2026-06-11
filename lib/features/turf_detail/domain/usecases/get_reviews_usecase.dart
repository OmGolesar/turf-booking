import '../../../../shared/domain/usecases/usecase.dart';
import '../../../../core/errors/failures.dart';
import '../entities/review.dart';
import '../repositories/turf_detail_repository.dart';

class GetReviewsUseCase implements UseCase<List<Review>, String> {
  final TurfDetailRepository repository;
  const GetReviewsUseCase(this.repository);
  @override
  Future<({List<Review>? data, Failure? failure})> call(String params) => repository.getReviews(params);
}
