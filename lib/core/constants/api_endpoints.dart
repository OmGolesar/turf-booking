/// All API endpoint paths for TurfX.
///
/// Centralizing endpoints prevents scattered string literals
/// and simplifies base URL or versioning changes.
class ApiEndpoints {
  ApiEndpoints._();

  /// Base URL — override via environment config
  static const String baseUrl = 'https://api.turfx.com/v1';

  // ── Authentication ────────────────────────────────────────
  static const String login = '/auth/login';
  static const String signup = '/auth/signup';
  static const String otpSend = '/auth/otp/send';
  static const String otpVerify = '/auth/otp/verify';
  static const String googleSignIn = '/auth/google';
  static const String refreshToken = '/auth/refresh';
  static const String logout = '/auth/logout';

  // ── Home ──────────────────────────────────────────────────
  static const String nearbyTurfs = '/turfs/nearby';
  static const String popularTurfs = '/turfs/popular';
  static const String categories = '/categories';

  // ── Turf Listing ──────────────────────────────────────────
  static const String turfs = '/turfs';
  static const String turfSearch = '/turfs/search';

  // ── Turf Detail ───────────────────────────────────────────
  static String turfDetail(String id) => '/turfs/$id';
  static String turfReviews(String id) => '/turfs/$id/reviews';
  static String turfSlots(String id) => '/turfs/$id/slots';

  // ── Booking ───────────────────────────────────────────────
  static const String bookings = '/bookings';
  static String bookingDetail(String id) => '/bookings/$id';
  static String cancelBooking(String id) => '/bookings/$id/cancel';
  static const String upcomingBookings = '/bookings/upcoming';
  static const String completedBookings = '/bookings/completed';

  // ── Profile ───────────────────────────────────────────────
  static const String profile = '/profile';
  static const String updateProfile = '/profile/update';

  // ── Payment ───────────────────────────────────────────────
  static const String createPayment = '/payments/create';
  static String paymentStatus(String id) => '/payments/$id/status';
}
