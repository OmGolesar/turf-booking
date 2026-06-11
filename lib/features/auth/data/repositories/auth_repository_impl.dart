import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../../../core/errors/failures.dart';

/// Concrete implementation of [AuthRepository].
///
/// Coordinates between remote and local data sources,
/// handles error mapping from exceptions to failures.
///
/// Will be fully implemented in Step 4.
class AuthRepositoryImpl implements AuthRepository {
  // final AuthRemoteDataSource remoteDataSource;
  // final AuthLocalDataSource localDataSource;
  // final NetworkInfo networkInfo;

  // AuthRepositoryImpl({
  //   required this.remoteDataSource,
  //   required this.localDataSource,
  //   required this.networkInfo,
  // });

  @override
  Future<({User? data, Failure? failure})> login({
    required String email,
    required String password,
  }) async {
    // TODO: Implement in Step 4
    throw UnimplementedError();
  }

  @override
  Future<({User? data, Failure? failure})> signup({
    required String name,
    required String email,
    required String password,
  }) async {
    throw UnimplementedError();
  }

  @override
  Future<({bool? data, Failure? failure})> sendOtp({required String phone}) async {
    throw UnimplementedError();
  }

  @override
  Future<({User? data, Failure? failure})> verifyOtp({
    required String phone,
    required String otp,
  }) async {
    throw UnimplementedError();
  }

  @override
  Future<({User? data, Failure? failure})> googleSignIn() async {
    throw UnimplementedError();
  }

  @override
  Future<({bool? data, Failure? failure})> logout() async {
    throw UnimplementedError();
  }

  @override
  Future<bool> isAuthenticated() async {
    // TODO: Check local storage for token
    return false;
  }

  @override
  Future<User?> getCurrentUser() async {
    // TODO: Return cached user
    return null;
  }
}
