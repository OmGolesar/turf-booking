import '../../domain/repositories/profile_repository.dart';
import '../../domain/entities/user_profile.dart';
import '../../../../core/errors/failures.dart';

class ProfileRepositoryImpl implements ProfileRepository {
  @override
  Future<({UserProfile? data, Failure? failure})> getProfile() async {
    throw UnimplementedError();
  }

  @override
  Future<({UserProfile? data, Failure? failure})> updateProfile(
      {String? name, String? phone, String? avatarUrl}) async {
    throw UnimplementedError();
  }
}
