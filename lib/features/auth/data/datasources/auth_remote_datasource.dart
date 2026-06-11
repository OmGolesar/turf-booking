import '../models/user_model.dart';

/// Remote data source for authentication.
///
/// Handles all API calls related to auth.
/// Will be implemented with Dio in Step 2.
abstract class AuthRemoteDataSource {
  Future<UserModel> login({required String email, required String password});
  Future<UserModel> signup({required String name, required String email, required String password});
  Future<void> sendOtp({required String phone});
  Future<UserModel> verifyOtp({required String phone, required String otp});
  Future<UserModel> googleSignIn({required String idToken});
  Future<void> logout();
}

// TODO: Implement in Step 2/4
// class AuthRemoteDataSourceImpl implements AuthRemoteDataSource { ... }
