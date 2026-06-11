/// Named route constants for TurfX.
///
/// Centralizes all route paths to prevent string duplication
/// and enable compile-time safety.
class RouteNames {
  RouteNames._();

  // ── Root ──────────────────────────────────────────────────
  static const String splash = '/';
  static const String welcome = '/welcome';

  // ── Auth ──────────────────────────────────────────────────
  static const String login = '/login';
  static const String signup = '/signup';
  static const String otp = '/otp';

  // ── Main Shell (Bottom Nav) ───────────────────────────────
  static const String home = '/home';
  static const String myBookings = '/my-bookings';
  static const String profile = '/profile';

  // ── Turf ──────────────────────────────────────────────────
  static const String turfListing = '/turfs';
  static const String turfDetail = '/turfs/:id';

  // ── Booking Flow ──────────────────────────────────────────
  static const String dateSelection = '/booking/date';
  static const String slotSelection = '/booking/slot';
  static const String bookingSummary = '/booking/summary';
  static const String payment = '/booking/payment';
  static const String bookingConfirmation = '/booking/confirmation';

  // ── Profile Sub-routes ────────────────────────────────────
  static const String settings = '/profile/settings';
  static const String bookingHistory = '/profile/booking-history';

  /// Helper to generate turf detail path with ID.
  static String turfDetailPath(String id) => '/turfs/$id';
}
