import '../../domain/entities/review.dart';

class ReviewModel extends Review {
  const ReviewModel(
      {required super.id,
      required super.userId,
      required super.userName,
      super.userAvatar,
      required super.rating,
      required super.comment,
      required super.createdAt});
  factory ReviewModel.fromJson(Map<String, dynamic> json) {
    return ReviewModel(
        id: json['id'] as String,
        userId: json['user_id'] as String,
        userName: json['user_name'] as String,
        userAvatar: json['user_avatar'] as String?,
        rating: (json['rating'] as num).toDouble(),
        comment: json['comment'] as String,
        createdAt: DateTime.parse(json['created_at'] as String));
  }
}
