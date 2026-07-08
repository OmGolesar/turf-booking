import '../../domain/entities/user_profile.dart';

class UserProfileModel extends UserProfile {
  const UserProfileModel(
      {required super.id,
      required super.name,
      required super.email,
      super.phone,
      super.avatarUrl,
      super.totalBookings,
      super.memberSince});
  factory UserProfileModel.fromJson(Map<String, dynamic> json) {
    return UserProfileModel(
        id: json['id'] as String,
        name: json['name'] as String,
        email: json['email'] as String,
        phone: json['phone'] as String?,
        avatarUrl: json['avatar_url'] as String?,
        totalBookings: json['total_bookings'] as int? ?? 0,
        memberSince: json['member_since'] != null
            ? DateTime.parse(json['member_since'] as String)
            : null);
  }
}
