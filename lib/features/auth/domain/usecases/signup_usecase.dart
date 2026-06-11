import '../../../../shared/domain/usecases/usecase.dart';
import '../../../../core/errors/failures.dart';
import '../entities/user.dart';
import '../repositories/auth_repository.dart';

/// Signup use case parameters.
class SignupParams {
  final String name;
  final String email;
  final String password;

  const SignupParams({
    required this.name,
    required this.email,
    required this.password,
  });
}

/// Handles new user registration.
class SignupUseCase implements UseCase<User, SignupParams> {
  final AuthRepository repository;

  const SignupUseCase(this.repository);

  @override
  Future<({User? data, Failure? failure})> call(SignupParams params) {
    return repository.signup(
      name: params.name,
      email: params.email,
      password: params.password,
    );
  }
}
