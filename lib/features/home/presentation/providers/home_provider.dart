import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/datasources/home_remote_datasource.dart';
import '../../domain/entities/turf_summary.dart';

final homeRemoteDataSourceProvider = Provider<HomeRemoteDataSource>((ref) {
  return HomeRemoteDataSourceImpl();
});

/// Nearby turfs in Nashik — used in home screen.
final nearbyTurfsProvider =
    FutureProvider.autoDispose<List<TurfSummary>>((ref) async {
  return ref.watch(homeRemoteDataSourceProvider).getNearbyTurfs();
});

/// Popular turfs (sorted by rating) — used in home screen.
final popularTurfsProvider =
    FutureProvider.autoDispose<List<TurfSummary>>((ref) async {
  return ref.watch(homeRemoteDataSourceProvider).getPopularTurfs();
});
