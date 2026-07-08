import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../booking/data/datasources/booking_remote_datasource.dart';
import '../../../booking/domain/entities/booking.dart';
import '../../../turf_detail/data/datasources/turf_detail_remote_datasource.dart';
import '../../../turf_detail/domain/entities/time_slot.dart';

// ── Admin Data Source ─────────────────────────────────────────────────────────

class AdminDataSource {
  final FirebaseFirestore _db;

  AdminDataSource({FirebaseFirestore? db})
      : _db = db ?? FirebaseFirestore.instance;

  /// Blocks a specific slot (e.g., maintenance, private event).
  Future<void> blockSlot(String turfId, String slotId, String reason) async {
    await _db
        .collection('turfs')
        .doc(turfId)
        .collection('slots')
        .doc(slotId)
        .update({'status': 'blocked', 'blockReason': reason});
  }

  /// Unblocks a slot — restores it to available.
  Future<void> unblockSlot(String turfId, String slotId) async {
    await _db
        .collection('turfs')
        .doc(turfId)
        .collection('slots')
        .doc(slotId)
        .update({'status': 'available', 'blockReason': null});
  }

  /// Updates turf information.
  Future<void> updateTurfInfo(
      String turfId, Map<String, dynamic> updates) async {
    await _db.collection('turfs').doc(turfId).update({
      ...updates,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  /// Returns today's bookings for a turf as a stream.
  Stream<List<Booking>> getTodayBookingsStream(String turfId) {
    final today = DateTime.now();
    final dateStr =
        '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';
    return FirebaseFirestore.instance
        .collection('bookings')
        .where('turfId', isEqualTo: turfId)
        .where('date', isEqualTo: dateStr)
        .where('status', whereIn: ['confirmed', 'pending'])
        .orderBy('startTime')
        .snapshots()
        .map((snap) => snap.docs.map(Booking.fromFirestore).toList());
  }

  /// Returns a stream of all bookings for a turf on a given date (admin view).
  Stream<List<Booking>> getBookingsByDate(String turfId, String date) {
    return FirebaseFirestore.instance
        .collection('bookings')
        .where('turfId', isEqualTo: turfId)
        .where('date', isEqualTo: date)
        .orderBy('startTime')
        .snapshots()
        .map((snap) => snap.docs.map(Booking.fromFirestore).toList());
  }
}

// ── Admin Providers ───────────────────────────────────────────────────────────

final adminDataSourceProvider =
    Provider<AdminDataSource>((ref) => AdminDataSource());

final bookingDataSourceForAdminProvider =
    Provider<BookingRemoteDataSource>((ref) {
  return BookingRemoteDataSourceImpl();
});

final turfDetailDataSourceForAdminProvider =
    Provider<TurfDetailRemoteDataSource>((ref) {
  return TurfDetailRemoteDataSourceImpl();
});

/// Today's bookings for the admin's turf — real-time stream.
final adminTodayBookingsProvider =
    StreamProvider.autoDispose<List<Booking>>((ref) {
  final user = ref.watch(authNotifierProvider).user;
  final turfId = user?.managedTurfId;
  if (turfId == null) return const Stream.empty();
  return ref.watch(adminDataSourceProvider).getTodayBookingsStream(turfId);
});

/// Slots for admin's turf on a selected date — real-time stream.
final adminSelectedDateProvider = StateProvider<String>((ref) {
  final now = DateTime.now();
  return '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
});

final adminSlotsStreamProvider =
    StreamProvider.autoDispose<List<TimeSlot>>((ref) {
  final user = ref.watch(authNotifierProvider).user;
  final turfId = user?.managedTurfId;
  final date = ref.watch(adminSelectedDateProvider);
  if (turfId == null) return const Stream.empty();
  return ref
      .watch(turfDetailDataSourceForAdminProvider)
      .getSlotsStream(turfId, date);
});

final adminBookingsByDateProvider =
    StreamProvider.autoDispose<List<Booking>>((ref) {
  final user = ref.watch(authNotifierProvider).user;
  final turfId = user?.managedTurfId;
  final date = ref.watch(adminSelectedDateProvider);
  if (turfId == null) return const Stream.empty();
  return ref.watch(adminDataSourceProvider).getBookingsByDate(turfId, date);
});
