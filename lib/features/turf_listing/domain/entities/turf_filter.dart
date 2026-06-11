/// Filter criteria for turf listing.
class TurfFilter {
  final String? categoryId;
  final double? minPrice;
  final double? maxPrice;
  final double? minRating;
  final double? maxDistance;
  final List<String>? amenities;

  const TurfFilter({
    this.categoryId, this.minPrice, this.maxPrice,
    this.minRating, this.maxDistance, this.amenities,
  });

  TurfFilter copyWith({
    String? categoryId, double? minPrice, double? maxPrice,
    double? minRating, double? maxDistance, List<String>? amenities,
  }) {
    return TurfFilter(
      categoryId: categoryId ?? this.categoryId,
      minPrice: minPrice ?? this.minPrice,
      maxPrice: maxPrice ?? this.maxPrice,
      minRating: minRating ?? this.minRating,
      maxDistance: maxDistance ?? this.maxDistance,
      amenities: amenities ?? this.amenities,
    );
  }

  Map<String, dynamic> toQueryParams() {
    final params = <String, dynamic>{};
    if (categoryId != null) params['category'] = categoryId;
    if (minPrice != null) params['min_price'] = minPrice;
    if (maxPrice != null) params['max_price'] = maxPrice;
    if (minRating != null) params['min_rating'] = minRating;
    if (maxDistance != null) params['max_distance'] = maxDistance;
    if (amenities != null && amenities!.isNotEmpty) params['amenities'] = amenities!.join(',');
    return params;
  }
}
