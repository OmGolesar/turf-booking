import 'package:cloud_firestore/cloud_firestore.dart';

import '../../domain/entities/turf_summary.dart';

/// Firestore DTO for TurfSummary (used in home screen and listing).
class TurfSummaryModel extends TurfSummary {
  const TurfSummaryModel({
    required super.id,
    required super.name,
    required super.location,
    required super.imageUrl,
    required super.rating,
    required super.reviewCount,
    required super.pricePerHour,
    required super.distance,
    required super.sports,
    super.isPopular,
  });

  factory TurfSummaryModel.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>;
    return TurfSummaryModel(
      id: doc.id,
      name: d['name'] as String? ?? '',
      location: d['location'] as String? ?? '',
      imageUrl: (d['images'] as List?)?.isNotEmpty == true
          ? (d['images'] as List).first as String
          : 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=400',
      rating: (d['rating'] as num? ?? 0.0).toDouble(),
      reviewCount: d['reviewCount'] as int? ?? 0,
      pricePerHour: (d['pricePerHour'] as num? ?? 0).toDouble(),
      distance: (d['distance'] as num? ?? 0).toDouble(),
      sports: List<String>.from(d['sports'] as List? ?? []),
      isPopular: d['isPopular'] as bool? ?? false,
    );
  }
}
