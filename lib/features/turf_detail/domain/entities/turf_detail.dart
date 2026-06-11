/// Detailed turf information entity.
class TurfDetail {
  final String id;
  final String name;
  final String description;
  final String location;
  final String address;
  final double latitude;
  final double longitude;
  final List<String> images;
  final double rating;
  final int reviewCount;
  final double pricePerHour;
  final List<String> sports;
  final List<String> amenities;
  final String ownerName;
  final String ownerPhone;
  final String openTime;
  final String closeTime;
  final Map<String, double>? sportPricing;

  const TurfDetail({
    required this.id, required this.name, required this.description,
    required this.location, required this.address,
    required this.latitude, required this.longitude,
    required this.images, required this.rating, required this.reviewCount,
    required this.pricePerHour, required this.sports, required this.amenities,
    required this.ownerName, required this.ownerPhone,
    required this.openTime, required this.closeTime,
    this.sportPricing,
  });
}
