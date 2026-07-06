import '../entities/user.dart';
import '../../../../core/errors/failures.dart';

/// Abstract auth repository contract.
///
/// Defines all authentication operations.
/// Implemented by [AuthRepositoryImpl] in the data layer.
abstract class AuthRepository {
  Future<({User? data, Failure? failure})> login({
    required String email,
    required String password,
  });

  Future<({User? data, Failure? failure})> signup({
    required String name,
    required String email,
    required String password,
  });

  Future<({bool? data, Failure? failure})> sendOtp({
    required String phone,
  });

  Future<({User? data, Failure? failure})> verifyOtp({
    required String phone,
    required String otp,
  });

  Future<({User? data, Failure? failure})> googleSignIn();

  Future<({bool? data, Failure? failure})> logout();

  Future<bool> isAuthenticated();

  Future<User?> getCurrentUser();
}
