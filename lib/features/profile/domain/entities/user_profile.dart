/// User profile entity with extended information.
class UserProfile {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String? avatarUrl;
  final int totalBookings;
  final DateTime? memberSince;

  const UserProfile({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.avatarUrl,
    this.totalBookings = 0,
    this.memberSince,
  });
}
