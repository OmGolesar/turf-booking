/// Named route path constants for GoRouter.
///
/// Use these constants everywhere instead of hardcoding strings.
abstract class RouteNames {
  RouteNames._();

  // ── Auth ──────────────────────────────────────────────────
  static const splash = '/';
  static const welcome = '/welcome';
  static const login = '/login';
  static const signup = '/signup';
  static const otp = '/otp';

  // ── Main Shell ────────────────────────────────────────────
  static const home = '/home';
  static const myBookings = '/my-bookings';
  static const profile = '/profile';

  // ── Turf ──────────────────────────────────────────────────
  static const turfListing = '/turfs';
  static const turfDetail = '/turfs/:id';

  // ── Booking Flow ──────────────────────────────────────────
  static const dateSelection = '/booking/date';
  static const slotSelection = '/booking/slots';
  static const bookingSummary = '/booking/summary';
  static const payment = '/booking/payment';
  static const bookingConfirmation = '/booking/confirmation';

  // ── Profile ───────────────────────────────────────────────
  static const settings = '/settings';

  // ── Helpers ───────────────────────────────────────────────
  static String turfDetailPath(String id) => '/turfs/$id';
}
