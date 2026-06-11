/// Asset path constants for TurfX.
///
/// Centralizes all asset references to prevent typos
/// and enable easy refactoring.
class AssetPaths {
  AssetPaths._();

  // ── Base Paths ────────────────────────────────────────────
  static const String _images = 'assets/images';
  static const String _icons = 'assets/icons';
  static const String _animations = 'assets/animations';

  // ── Images ────────────────────────────────────────────────
  static const String logo = '$_images/logo.png';
  static const String logoDark = '$_images/logo_dark.png';

  // Onboarding
  static const String onboarding1 = '$_images/onboarding/onboarding_1.png';
  static const String onboarding2 = '$_images/onboarding/onboarding_2.png';
  static const String onboarding3 = '$_images/onboarding/onboarding_3.png';

  // Placeholders
  static const String turfPlaceholder = '$_images/placeholders/turf_placeholder.png';
  static const String avatarPlaceholder = '$_images/placeholders/avatar_placeholder.png';

  // ── Icons ─────────────────────────────────────────────────
  static const String cricket = '$_icons/sports/cricket.png';
  static const String football = '$_icons/sports/football.png';
  static const String badminton = '$_icons/sports/badminton.png';
  static const String tennis = '$_icons/sports/tennis.png';
  static const String basketball = '$_icons/sports/basketball.png';

  // ── Animations (Lottie) ───────────────────────────────────
  static const String loadingAnimation = '$_animations/loading.json';
  static const String successAnimation = '$_animations/success.json';
  static const String emptyAnimation = '$_animations/empty.json';
  static const String errorAnimation = '$_animations/error.json';
}
