/// Role of the user — determines access level.
enum UserRole { user, admin }

/// User entity for the domain layer.
///
/// Represents the core user data used throughout the application.
/// The data layer maps [UserModel] to this entity.
class User {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String? avatarUrl;
  final UserRole role;
  final String? managedTurfId; // Non-null for admins
  final int totalBookings;
  final List<String> favouriteTurfs;
  final DateTime? createdAt;

  const User({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.avatarUrl,
    this.role = UserRole.user,
    this.managedTurfId,
    this.totalBookings = 0,
    this.favouriteTurfs = const [],
    this.createdAt,
  });

  bool get isAdmin => role == UserRole.admin;
}
