import 'package:firebase_auth/firebase_auth.dart' as fb;

import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_datasource.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource _remote;

  const AuthRepositoryImpl(this._remote);

  @override
  Stream<User?> get authStateChanges => _remote.authStateChanges;

  @override
  Future<User?> getCurrentUser() => _remote.getCurrentUser();

  @override
  Future<User> login({required String email, required String password}) async {
    try {
      return await _remote.login(email: email, password: password);
    } on fb.FirebaseAuthException catch (e) {
      throw _mapFirebaseException(e);
    }
  }

  @override
  Future<User> signup({
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {
    try {
      return await _remote.signup(
          name: name, email: email, password: password, phone: phone);
    } on fb.FirebaseAuthException catch (e) {
      throw _mapFirebaseException(e);
    }
  }

  @override
  Future<void> logout() => _remote.logout();

  /// Maps Firebase auth error codes to human-readable messages.
  Exception _mapFirebaseException(fb.FirebaseAuthException e) {
    switch (e.code) {
      case 'user-not-found':
        return Exception('No account found for this email. Please sign up.');
      case 'wrong-password':
        return Exception('Incorrect password. Please try again.');
      case 'email-already-in-use':
        return Exception(
            'An account with this email already exists. Please log in.');
      case 'invalid-email':
        return Exception('Please enter a valid email address.');
      case 'weak-password':
        return Exception('Password must be at least 6 characters.');
      case 'network-request-failed':
        return Exception('No internet connection. Please check your network.');
      case 'too-many-requests':
        return Exception('Too many attempts. Please try again later.');
      case 'invalid-credential':
        return Exception('Invalid email or password. Please try again.');
      default:
        return Exception(
            e.message ?? 'Authentication failed. Please try again.');
    }
  }
}
