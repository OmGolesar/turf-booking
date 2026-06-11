/// Review entity.
class Review {
  final String id;
  final String userId;
  final String userName;
  final String? userAvatar;
  final double rating;
  final String comment;
  final DateTime createdAt;

  const Review({
    required this.id, required this.userId, required this.userName,
    this.userAvatar, required this.rating, required this.comment,
    required this.createdAt,
  });
}
