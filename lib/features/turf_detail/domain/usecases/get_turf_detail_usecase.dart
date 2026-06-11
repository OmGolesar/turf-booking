import '../../../../shared/domain/usecases/usecase.dart';
import '../../../../core/errors/failures.dart';
import '../entities/turf_detail.dart';
import '../repositories/turf_detail_repository.dart';

class GetTurfDetailUseCase implements UseCase<TurfDetail, String> {
  final TurfDetailRepository repository;
  const GetTurfDetailUseCase(this.repository);
  @override
  Future<({TurfDetail? data, Failure? failure})> call(String params) => repository.getTurfDetail(params);
}
