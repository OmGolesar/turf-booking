import 'package:cloud_firestore/cloud_firestore.dart';

import '../../domain/entities/turf_detail.dart';
import '../../domain/entities/time_slot.dart';
import '../models/turf_detail_model.dart';

/// Remote data source for turf detail — reads from Firestore.
abstract class TurfDetailRemoteDataSource {
  Future<TurfDetail> getTurfDetail(String turfId);
  Stream<List<TimeSlot>> getSlotsStream(String turfId, String date);
}

class TurfDetailRemoteDataSourceImpl implements TurfDetailRemoteDataSource {
  final FirebaseFirestore _db;

  TurfDetailRemoteDataSourceImpl({FirebaseFirestore? db})
      : _db = db ?? FirebaseFirestore.instance;

  @override
  Future<TurfDetail> getTurfDetail(String turfId) async {
    final doc = await _db.collection('turfs').doc(turfId).get();
    if (!doc.exists) throw Exception('Turf not found');
    return TurfDetailModel.fromFirestore(doc);
  }

  /// Returns a real-time stream of all slots for a given turf on a given date.
  ///
  /// This is the core of real-time sync: any change by the admin or another
  /// user booking a slot is immediately reflected in this stream.
  @override
  Stream<List<TimeSlot>> getSlotsStream(String turfId, String date) {
    return _db
        .collection('turfs')
        .doc(turfId)
        .collection('slots')
        .where('date', isEqualTo: date)
        .snapshots()
        .map((snap) {
      final slots = snap.docs.map(TimeSlot.fromFirestore).toList()
        ..sort((a, b) => a.startTime.compareTo(b.startTime));
      return slots;
    });
  }
}
