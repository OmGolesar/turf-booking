import '../entities/user.dart';

/// Abstract auth repository contract.
abstract class AuthRepository {
  Future<User> login({required String email, required String password});
  Future<User> signup(
      {required String name,
      required String email,
      required String password,
      String? phone});
  Future<void> logout();
  Stream<User?> get authStateChanges;
  Future<User?> getCurrentUser();
}
