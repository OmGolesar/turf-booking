import '../../domain/repositories/home_repository.dart';
import '../../domain/entities/turf_summary.dart';
import '../../domain/entities/category.dart';
import '../../../../core/errors/failures.dart';

class HomeRepositoryImpl implements HomeRepository {
  @override
  Future<({List<TurfSummary>? data, Failure? failure})> getNearbyTurfs({
    required double latitude,
    required double longitude,
    double radius = 10.0,
  }) async {
    throw UnimplementedError();
  }

  @override
  Future<({List<TurfSummary>? data, Failure? failure})>
      getPopularTurfs() async {
    throw UnimplementedError();
  }

  @override
  Future<({List<Category>? data, Failure? failure})> getCategories() async {
    throw UnimplementedError();
  }
}
