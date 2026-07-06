import '../entities/turf_summary.dart';
import '../entities/category.dart';
import '../../../../core/errors/failures.dart';

/// Abstract home repository.
abstract class HomeRepository {
  Future<({List<TurfSummary>? data, Failure? failure})> getNearbyTurfs({
    required double latitude,
    required double longitude,
    double radius = 10.0,
  });

  Future<({List<TurfSummary>? data, Failure? failure})> getPopularTurfs();

  Future<({List<Category>? data, Failure? failure})> getCategories();
}
