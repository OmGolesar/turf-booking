import '../../domain/entities/turf_detail.dart';
class TurfDetailModel extends TurfDetail {
  const TurfDetailModel({
    required super.id, required super.name, required super.description,
    required super.location, required super.address,
    required super.latitude, required super.longitude,
    required super.images, required super.rating, required super.reviewCount,
    required super.pricePerHour, required super.sports, required super.amenities,
    required super.ownerName, required super.ownerPhone,
    required super.openTime, required super.closeTime, super.sportPricing,
  });
  factory TurfDetailModel.fromJson(Map<String, dynamic> json) {
    return TurfDetailModel(
      id: json['id'] as String, name: json['name'] as String,
      description: json['description'] as String, location: json['location'] as String,
      address: json['address'] as String,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      images: List<String>.from(json['images'] as List),
      rating: (json['rating'] as num).toDouble(), reviewCount: json['review_count'] as int,
      pricePerHour: (json['price_per_hour'] as num).toDouble(),
      sports: List<String>.from(json['sports'] as List),
      amenities: List<String>.from(json['amenities'] as List),
      ownerName: json['owner_name'] as String, ownerPhone: json['owner_phone'] as String,
      openTime: json['open_time'] as String, closeTime: json['close_time'] as String,
    );
  }
}
