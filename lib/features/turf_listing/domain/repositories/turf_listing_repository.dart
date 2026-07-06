import '../entities/turf_filter.dart';
import '../entities/turf_sort.dart';
import '../../../../core/errors/failures.dart';
import '../../../../shared/data/models/pagination.dart';
import '../../../home/domain/entities/turf_summary.dart';

abstract class TurfListingRepository {
  Future<({Pagination<TurfSummary>? data, Failure? failure})> getTurfs({
    required int page,
    int pageSize = 20,
    TurfFilter? filter,
    TurfSortBy sortBy = TurfSortBy.nearest,
    String? searchQuery,
  });
}
