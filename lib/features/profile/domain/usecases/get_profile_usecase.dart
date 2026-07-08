import '../../../../shared/domain/usecases/usecase.dart';
import '../../../../core/errors/failures.dart';
import '../entities/user_profile.dart';
import '../repositories/profile_repository.dart';

class GetProfileUseCase implements UseCase<UserProfile, NoParams> {
  final ProfileRepository repository;
  const GetProfileUseCase(this.repository);
  @override
  Future<({UserProfile? data, Failure? failure})> call(NoParams params) =>
      repository.getProfile();
}
