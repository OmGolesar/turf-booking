/// Failure classes for the domain layer.
///
/// Failures represent expected error states and are returned
/// from repositories instead of throwing exceptions.
/// This enables clean error handling in the presentation layer.
library;

/// Base failure class.
abstract class Failure {
  final String message;

  const Failure({required this.message});

  @override
  String toString() => '$runtimeType(message: $message)';
}

/// Server-related failure (API errors, 5xx, etc.)
class ServerFailure extends Failure {
  final int? statusCode;

  const ServerFailure({required super.message, this.statusCode});
}

/// Network connectivity failure.
class NetworkFailure extends Failure {
  const NetworkFailure(
      {super.message = 'Please check your internet connection'});
}

/// Local cache/storage failure.
class CacheFailure extends Failure {
  const CacheFailure({super.message = 'Failed to load cached data'});
}

/// Authentication failure (expired token, invalid credentials).
class AuthFailure extends Failure {
  const AuthFailure({super.message = 'Authentication failed'});
}

/// Validation failure (invalid input).
class ValidationFailure extends Failure {
  final Map<String, String>? fieldErrors;

  const ValidationFailure({required super.message, this.fieldErrors});
}

/// Unknown/unexpected failure.
class UnknownFailure extends Failure {
  const UnknownFailure({super.message = 'An unexpected error occurred'});
}
