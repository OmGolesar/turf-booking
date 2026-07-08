import 'package:cloud_firestore/cloud_firestore.dart';

import '../../domain/entities/turf_summary.dart';
import '../models/turf_summary_model.dart';

/// Remote data source for home screen data.
abstract class HomeRemoteDataSource {
  Future<List<TurfSummary>> getNearbyTurfs({String city = 'Nashik'});
  Future<List<TurfSummary>> getPopularTurfs({String city = 'Nashik'});
}

class HomeRemoteDataSourceImpl implements HomeRemoteDataSource {
  final FirebaseFirestore _db;

  HomeRemoteDataSourceImpl({FirebaseFirestore? db})
      : _db = db ?? FirebaseFirestore.instance;

  @override
  Future<List<TurfSummary>> getNearbyTurfs({String city = 'Nashik'}) async {
    final snap = await _db
        .collection('turfs')
        .where('isActive', isEqualTo: true)
        .where('city', isEqualTo: city)
        .limit(10)
        .get();
    return snap.docs.map(TurfSummaryModel.fromFirestore).toList();
  }

  @override
  Future<List<TurfSummary>> getPopularTurfs({String city = 'Nashik'}) async {
    // Client-side sort avoids requiring a Firestore composite index.
    final snap = await _db
        .collection('turfs')
        .where('isActive', isEqualTo: true)
        .where('city', isEqualTo: city)
        .limit(30)
        .get();
    final all = snap.docs.map(TurfSummaryModel.fromFirestore).toList()
      ..sort((a, b) => b.rating.compareTo(a.rating));
    return all.take(6).toList();
  }
}
