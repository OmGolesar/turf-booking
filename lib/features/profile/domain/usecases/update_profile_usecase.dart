import '../../../../shared/domain/usecases/usecase.dart';
import '../../../../core/errors/failures.dart';
import '../entities/user_profile.dart';
import '../repositories/profile_repository.dart';

class UpdateProfileParams {
  final String? name;
  final String? phone;
  final String? avatarUrl;
  const UpdateProfileParams({this.name, this.phone, this.avatarUrl});
}

class UpdateProfileUseCase implements UseCase<UserProfile, UpdateProfileParams> {
  final ProfileRepository repository;
  const UpdateProfileUseCase(this.repository);
  @override
  Future<({UserProfile? data, Failure? failure})> call(UpdateProfileParams params) =>
    repository.updateProfile(name: params.name, phone: params.phone, avatarUrl: params.avatarUrl);
}
