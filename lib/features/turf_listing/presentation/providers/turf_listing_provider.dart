import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/datasources/turf_listing_remote_datasource.dart';
import '../../../home/domain/entities/turf_summary.dart';

// ── Dependency ─────────────────────────────────────────────────────────────────

final turfListingRemoteDataSourceProvider =
    Provider<TurfListingRemoteDataSource>((ref) {
  return TurfListingRemoteDataSourceImpl();
});

// ── Filter / Sort State ────────────────────────────────────────────────────────

final selectedSportFilterProvider = StateProvider<String?>((ref) => null);
final selectedSortProvider = StateProvider<String>((ref) => 'rating');

// ── Turf Listing Provider ─────────────────────────────────────────────────────

/// Lists all turfs with current filter + sort applied.
final turfListingProvider =
    FutureProvider.autoDispose<List<TurfSummary>>((ref) async {
  final sport = ref.watch(selectedSportFilterProvider);
  final sort = ref.watch(selectedSortProvider);
  return ref
      .watch(turfListingRemoteDataSourceProvider)
      .getTurfs(sport: sport, sortBy: sort);
});
