import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:uuid/uuid.dart';

import '../../domain/entities/booking.dart';

/// Booking request data — passed from UI to create a booking.
class BookingRequest {
  final String turfId;
  final String turfName;
  final String turfImage;
  final String turfLocation;
  final String userId;
  final String userName;
  final String? userPhone;
  final String date;
  final List<String> slotIds; // Firestore slot doc IDs
  final String startTime;
  final String endTime;
  final String sport;
  final int groundNumber;
  final double turfCharge;
  final String paymentMethod;
  final BookingSource bookingSource;
  final String? adminNote;

  const BookingRequest({
    required this.turfId,
    required this.turfName,
    required this.turfImage,
    required this.turfLocation,
    required this.userId,
    required this.userName,
    this.userPhone,
    required this.date,
    required this.slotIds,
    required this.startTime,
    required this.endTime,
    required this.sport,
    this.groundNumber = 1,
    required this.turfCharge,
    required this.paymentMethod,
    this.bookingSource = BookingSource.app,
    this.adminNote,
  });
}

/// Remote data source for bookings — backed by Firestore.
abstract class BookingRemoteDataSource {
  /// Creates a booking using an atomic Firestore transaction.
  ///
  /// This guarantees that:
  /// 1. All requested slots are still available at booking time.
  /// 2. No two users can book the same slot simultaneously.
  Future<Booking> createBooking(BookingRequest request);

  /// Cancels a booking and restores all slots to "available".
  Future<void> cancelBooking(
      String bookingId, String turfId, List<String> slotIds);

  Future<List<Booking>> getUpcomingBookings(String userId);
  Future<List<Booking>> getCompletedBookings(String userId);
  Stream<List<Booking>> getBookingsForTurf(String turfId, String date);
}

class BookingRemoteDataSourceImpl implements BookingRemoteDataSource {
  final FirebaseFirestore _db;
  final _uuid = const Uuid();

  BookingRemoteDataSourceImpl({FirebaseFirestore? db})
      : _db = db ?? FirebaseFirestore.instance;

  @override
  Future<Booking> createBooking(BookingRequest req) async {
    final bookingId = 'BKG-${_uuid.v4().substring(0, 8).toUpperCase()}';
    final bookingRef = _db.collection('bookings').doc(bookingId);

    // Slot document references
    final slotRefs = req.slotIds
        .map((id) =>
            _db.collection('turfs').doc(req.turfId).collection('slots').doc(id))
        .toList();

    // Calculate price breakdown
    final bookingFee = 20.0;
    final gst = (req.turfCharge + bookingFee) * 0.18;
    final total = req.turfCharge + bookingFee + gst;

    late Booking booking;

    await _db.runTransaction((tx) async {
      // ── 1. Read all slot docs within the transaction ──────────────────────
      final slotSnaps = await Future.wait(slotRefs.map((r) => tx.get(r)));

      // ── 2. Verify all slots are still "available" ─────────────────────────
      for (final snap in slotSnaps) {
        if (!snap.exists) throw Exception('Slot no longer exists.');
        final status = snap.data()!['status'] as String?;
        if (status != 'available') {
          final start = snap.data()!['startTime'] as String? ?? '';
          throw Exception(
              'Slot $start is no longer available. Please choose a different slot.');
        }
      }

      // ── 3. Write booking document ─────────────────────────────────────────
      booking = Booking(
        id: bookingId,
        turfId: req.turfId,
        turfName: req.turfName,
        turfImage: req.turfImage,
        turfLocation: req.turfLocation,
        userId: req.userId,
        userName: req.userName,
        userPhone: req.userPhone,
        date: req.date,
        slotIds: req.slotIds,
        startTime: req.startTime,
        endTime: req.endTime,
        sport: req.sport,
        groundNumber: req.groundNumber,
        turfCharge: req.turfCharge,
        bookingFee: bookingFee,
        gst: gst,
        totalAmount: total,
        paymentMethod: req.paymentMethod,
        paymentStatus:
            req.bookingSource == BookingSource.app ? 'paid' : 'pending',
        bookingSource: req.bookingSource,
        status: BookingStatus.confirmed,
        adminNote: req.adminNote,
        createdAt: DateTime.now(),
      );
      tx.set(bookingRef, booking.toFirestore());

      // ── 4. Mark all slots as "booked" ─────────────────────────────────────
      for (final ref in slotRefs) {
        tx.update(ref, {
          'status': 'booked',
          'bookingId': bookingId,
        });
      }
    });

    return booking;
  }

  @override
  Future<void> cancelBooking(
    String bookingId,
    String turfId,
    List<String> slotIds,
  ) async {
    final slotRefs = slotIds
        .map((id) =>
            _db.collection('turfs').doc(turfId).collection('slots').doc(id))
        .toList();

    await _db.runTransaction((tx) async {
      // Update booking status
      tx.update(_db.collection('bookings').doc(bookingId), {
        'status': BookingStatus.cancelled.name,
      });

      // Restore slots to available
      for (final ref in slotRefs) {
        tx.update(ref, {'status': 'available', 'bookingId': null});
      }
    });
  }

  @override
  Future<List<Booking>> getUpcomingBookings(String userId) async {
    final today = DateTime.now();
    final todayStr =
        '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';
    final snap = await _db
        .collection('bookings')
        .where('userId', isEqualTo: userId)
        .where('date', isGreaterThanOrEqualTo: todayStr)
        .where('status', whereIn: ['confirmed', 'pending'])
        .orderBy('date')
        .orderBy('startTime')
        .get();
    return snap.docs.map(Booking.fromFirestore).toList();
  }

  @override
  Future<List<Booking>> getCompletedBookings(String userId) async {
    final today = DateTime.now();
    final todayStr =
        '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';
    final snap = await _db
        .collection('bookings')
        .where('userId', isEqualTo: userId)
        .where('date', isLessThan: todayStr)
        .orderBy('date', descending: true)
        .limit(30)
        .get();
    return snap.docs.map(Booking.fromFirestore).toList();
  }

  @override
  Stream<List<Booking>> getBookingsForTurf(String turfId, String date) {
    return _db
        .collection('bookings')
        .where('turfId', isEqualTo: turfId)
        .where('date', isEqualTo: date)
        .orderBy('startTime')
        .snapshots()
        .map((snap) => snap.docs.map(Booking.fromFirestore).toList());
  }
}
