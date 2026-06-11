import '../../../../shared/domain/usecases/usecase.dart';
import '../../../../core/errors/failures.dart';
import '../entities/turf_summary.dart';
import '../repositories/home_repository.dart';

class GetPopularTurfsUseCase implements UseCase<List<TurfSummary>, NoParams> {
  final HomeRepository repository;
  const GetPopularTurfsUseCase(this.repository);

  @override
  Future<({List<TurfSummary>? data, Failure? failure})> call(NoParams params) {
    return repository.getPopularTurfs();
  }
}
