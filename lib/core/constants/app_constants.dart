/// Application-wide constants for TurfX.
class AppConstants {
  AppConstants._();

  /// Application name
  static const String appName = 'TurfX';

  /// Application version
  static const String appVersion = '1.0.0';

  /// Default pagination page size
  static const int defaultPageSize = 20;

  /// Animation durations
  static const Duration shortAnimation = Duration(milliseconds: 200);
  static const Duration mediumAnimation = Duration(milliseconds: 350);
  static const Duration longAnimation = Duration(milliseconds: 500);

  /// Shimmer loading item count
  static const int shimmerItemCount = 6;

  /// Maximum retry attempts for API calls
  static const int maxRetryAttempts = 3;

  /// Cache duration
  static const Duration cacheDuration = Duration(minutes: 30);

  /// Image quality for cached images
  static const int imageQuality = 80;

  /// Debounce duration for search
  static const Duration searchDebounceDuration = Duration(milliseconds: 500);
}
