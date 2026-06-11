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
  final DateTime? createdAt;

  const User({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.avatarUrl,
    this.createdAt,
  });
}
