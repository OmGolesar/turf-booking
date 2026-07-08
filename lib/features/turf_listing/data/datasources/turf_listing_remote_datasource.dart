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
    // Firestore composite indexes are avoided by sorting client-side.
    Query<Map<String, dynamic>> query =
        _db.collection('turfs').where('isActive', isEqualTo: true);

    if (sport != null && sport.isNotEmpty && sport != 'All') {
      query = query.where('sports', arrayContains: sport);
    }

    final snap = await query.limit(50).get();
    final turfs = snap.docs.map(TurfSummaryModel.fromFirestore).toList();

    switch (sortBy) {
      case 'priceAsc':
        turfs.sort((a, b) => a.pricePerHour.compareTo(b.pricePerHour));
        break;
      case 'priceDesc':
        turfs.sort((a, b) => b.pricePerHour.compareTo(a.pricePerHour));
        break;
      case 'rating':
      default:
        turfs.sort((a, b) => b.rating.compareTo(a.rating));
    }
    return turfs;
  }
}
