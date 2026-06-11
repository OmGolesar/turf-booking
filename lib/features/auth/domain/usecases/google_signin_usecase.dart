import '../../../../shared/domain/usecases/usecase.dart';
import '../../../../core/errors/failures.dart';
import '../entities/user.dart';
import '../repositories/auth_repository.dart';

/// Handles Google Sign-In authentication.
class GoogleSignInUseCase implements UseCase<User, NoParams> {
  final AuthRepository repository;

  const GoogleSignInUseCase(this.repository);

  @override
  Future<({User? data, Failure? failure})> call(NoParams params) {
    return repository.googleSignIn();
  }
}
