import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../home/domain/entities/turf_summary.dart';
import '../../../home/data/models/turf_summary_model.dart';

/// Remote data source for turf listing — supports filtering and sorting.
abstract class TurfListingRemoteDataSource {
  Future<List<TurfSummary>> getTurfs({String? sport, String sortBy = 'rating'});
}

class TurfListingRemoteDataSourceImpl implements TurfListingRemoteDataSource {
  final FirebaseFirestore _db;

  TurfListingRemoteDataSourceImpl({FirebaseFirestore? db})
      : _db = db ?? FirebaseFirestore.instance;

  @override
  Future<List<TurfSummary>> getTurfs({
    String? sport,
    String sortBy = 'rating',
  }) async {
    Query<Map<String, dynamic>> query = _db
        .collection('turfs')
        .where('isActive', isEqualTo: true);

    // Sport filter
    if (sport != null && sport.isNotEmpty && sport != 'All') {
      query = query.where('sports', arrayContains: sport);
    }

    // Sort
    switch (sortBy) {
      case 'priceAsc':
        query = query.orderBy('pricePerHour', descending: false);
        break;
      case 'priceDesc':
        query = query.orderBy('pricePerHour', descending: true);
        break;
      case 'rating':
      default:
        query = query.orderBy('rating', descending: true);
    }

    final snap = await query.limit(50).get();
    return snap.docs.map(TurfSummaryModel.fromFirestore).toList();
  }
}
