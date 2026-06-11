/// Turf summary entity for home screen display.
class TurfSummary {
  final String id;
  final String name;
  final String location;
  final String imageUrl;
  final double rating;
  final int reviewCount;
  final double pricePerHour;
  final double distance;
  final List<String> sports;
  final bool isPopular;

  const TurfSummary({
    required this.id,
    required this.name,
    required this.location,
    required this.imageUrl,
    required this.rating,
    required this.reviewCount,
    required this.pricePerHour,
    required this.distance,
    required this.sports,
    this.isPopular = false,
  });
}
