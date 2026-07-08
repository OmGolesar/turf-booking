import '../entities/user_profile.dart';
import '../../../../core/errors/failures.dart';

abstract class ProfileRepository {
  Future<({UserProfile? data, Failure? failure})> getProfile();
  Future<({UserProfile? data, Failure? failure})> updateProfile(
      {String? name, String? phone, String? avatarUrl});
}
