import '../../../../shared/domain/usecases/usecase.dart';
import '../../../../core/errors/failures.dart';
import '../entities/turf_summary.dart';
import '../repositories/home_repository.dart';

class GetNearbyTurfsParams {
  final double latitude;
  final double longitude;
  final double radius;

  const GetNearbyTurfsParams({
    required this.latitude,
    required this.longitude,
    this.radius = 10.0,
  });
}

class GetNearbyTurfsUseCase
    implements UseCase<List<TurfSummary>, GetNearbyTurfsParams> {
  final HomeRepository repository;
  const GetNearbyTurfsUseCase(this.repository);

  @override
  Future<({List<TurfSummary>? data, Failure? failure})> call(
      GetNearbyTurfsParams params) {
    return repository.getNearbyTurfs(
      latitude: params.latitude,
      longitude: params.longitude,
      radius: params.radius,
    );
  }
}
