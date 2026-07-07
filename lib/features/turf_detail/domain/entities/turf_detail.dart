/// Status of a booking slot.
enum SlotStatus { available, booked, blocked }

/// Detailed turf information entity.
class TurfDetail {
  final String id;
  final String name;
  final String description;
  final String location;
  final String address;
  final String city;
  final double latitude;
  final double longitude;
  final List<String> images;
  final double rating;
  final int reviewCount;
  final double pricePerHour;
  final double? priceWeekday;
  final double? priceWeekend;
  final List<String> sports;
  final List<String> amenities;
  final String ownerUid;
  final String ownerName;
  final String ownerPhone;
  final String openTime;
  final String closeTime;
  final int slotDurationMinutes;
  final int numberOfGrounds;
  final Map<String, double>? sportPricing;
  final bool isVerified;
  final bool isActive;
  final String? contactPhone;

  const TurfDetail({
    required this.id,
    required this.name,
    required this.description,
    required this.location,
    required this.address,
    required this.city,
    required this.latitude,
    required this.longitude,
    required this.images,
    required this.rating,
    required this.reviewCount,
    required this.pricePerHour,
    this.priceWeekday,
    this.priceWeekend,
    required this.sports,
    required this.amenities,
    required this.ownerUid,
    required this.ownerName,
    required this.ownerPhone,
    required this.openTime,
    required this.closeTime,
    this.slotDurationMinutes = 60,
    this.numberOfGrounds = 1,
    this.sportPricing,
    this.isVerified = false,
    this.isActive = true,
    this.contactPhone,
  });
}
