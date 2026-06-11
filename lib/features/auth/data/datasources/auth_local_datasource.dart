import '../models/user_model.dart';

/// Local data source for authentication.
///
/// Handles local storage of auth tokens and cached user data.
/// Will be implemented with SharedPreferences/Hive in Step 2.
abstract class AuthLocalDataSource {
  Future<void> cacheUser(UserModel user);
  Future<UserModel?> getCachedUser();
  Future<void> cacheToken(String token);
  Future<String?> getToken();
  Future<void> clearCache();
  Future<bool> hasToken();
}

// TODO: Implement in Step 2/4
// class AuthLocalDataSourceImpl implements AuthLocalDataSource { ... }
