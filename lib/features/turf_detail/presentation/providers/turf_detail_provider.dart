import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/datasources/turf_detail_remote_datasource.dart';
import '../../domain/entities/turf_detail.dart';
import '../../domain/entities/time_slot.dart';

// ── Dependency Providers ───────────────────────────────────────────────────────

final turfDetailRemoteDataSourceProvider =
    Provider<TurfDetailRemoteDataSource>((ref) {
  return TurfDetailRemoteDataSourceImpl();
});

// ── Turf Detail Provider ───────────────────────────────────────────────────────

/// FutureProvider for a single turf's full details.
final turfDetailProvider =
    FutureProvider.autoDispose.family<TurfDetail, String>((ref, turfId) async {
  return ref.watch(turfDetailRemoteDataSourceProvider).getTurfDetail(turfId);
});

// ── Real-time Slots Stream ────────────────────────────────────────────────────

/// StreamProvider for real-time slot availability for a turf on a given date.
///
/// This is a [family] provider keyed by (turfId, date) — any time a slot
/// changes in Firestore (booked by a user or blocked by admin), all listeners
/// on this provider are automatically updated.
final turfSlotsStreamProvider = StreamProvider.autoDispose
    .family<List<TimeSlot>, ({String turfId, String date})>((ref, args) {
  return ref
      .watch(turfDetailRemoteDataSourceProvider)
      .getSlotsStream(args.turfId, args.date);
});
