import '../../domain/entities/turf_summary.dart';

class TurfSummaryModel extends TurfSummary {
  const TurfSummaryModel({
    required super.id, required super.name, required super.location,
    required super.imageUrl, required super.rating, required super.reviewCount,
    required super.pricePerHour, required super.distance, required super.sports,
    super.isPopular,
  });

  factory TurfSummaryModel.fromJson(Map<String, dynamic> json) {
    return TurfSummaryModel(
      id: json['id'] as String,
      name: json['name'] as String,
      location: json['location'] as String,
      imageUrl: json['image_url'] as String,
      rating: (json['rating'] as num).toDouble(),
      reviewCount: json['review_count'] as int,
      pricePerHour: (json['price_per_hour'] as num).toDouble(),
      distance: (json['distance'] as num).toDouble(),
      sports: List<String>.from(json['sports'] as List),
      isPopular: json['is_popular'] as bool? ?? false,
    );
  }
}
