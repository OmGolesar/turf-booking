import '../../domain/repositories/turf_listing_repository.dart';
import '../../domain/entities/turf_filter.dart';
import '../../domain/entities/turf_sort.dart';
import '../../../../core/errors/failures.dart';
import '../../../../shared/data/models/pagination.dart';
import '../../../home/domain/entities/turf_summary.dart';

class TurfListingRepositoryImpl implements TurfListingRepository {
  @override
  Future<({Pagination<TurfSummary>? data, Failure? failure})> getTurfs({
    required int page,
    int pageSize = 20,
    TurfFilter? filter,
    TurfSortBy sortBy = TurfSortBy.nearest,
    String? searchQuery,
  }) async {
    throw UnimplementedError();
  }
}
