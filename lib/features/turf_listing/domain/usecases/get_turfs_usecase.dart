import '../../../../shared/domain/usecases/usecase.dart';
import '../../../../core/errors/failures.dart';
import '../../../../shared/data/models/pagination.dart';
import '../../../home/domain/entities/turf_summary.dart';
import '../entities/turf_filter.dart';
import '../entities/turf_sort.dart';
import '../repositories/turf_listing_repository.dart';

class GetTurfsParams {
  final int page;
  final TurfFilter? filter;
  final TurfSortBy sortBy;
  final String? searchQuery;
  const GetTurfsParams({this.page = 1, this.filter, this.sortBy = TurfSortBy.nearest, this.searchQuery});
}

class GetTurfsUseCase implements UseCase<Pagination<TurfSummary>, GetTurfsParams> {
  final TurfListingRepository repository;
  const GetTurfsUseCase(this.repository);

  @override
  Future<({Pagination<TurfSummary>? data, Failure? failure})> call(GetTurfsParams params) {
    return repository.getTurfs(page: params.page, filter: params.filter, sortBy: params.sortBy, searchQuery: params.searchQuery);
  }
}
