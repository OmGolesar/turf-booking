import '../../../../shared/domain/usecases/usecase.dart';
import '../../../../core/errors/failures.dart';
import '../entities/user.dart';
import '../repositories/auth_repository.dart';

/// OTP login parameters.
class OtpLoginParams {
  final String phone;
  final String otp;

  const OtpLoginParams({required this.phone, required this.otp});
}

/// Handles OTP-based login (phone verification).
class OtpLoginUseCase implements UseCase<User, OtpLoginParams> {
  final AuthRepository repository;

  const OtpLoginUseCase(this.repository);

  @override
  Future<({User? data, Failure? failure})> call(OtpLoginParams params) {
    return repository.verifyOtp(
      phone: params.phone,
      otp: params.otp,
    );
  }
}
