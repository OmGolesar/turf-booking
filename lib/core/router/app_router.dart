/// GoRouter configuration for TurfX.
///
/// Defines the complete route tree with:
/// - Auth guard redirects
/// - ShellRoute for bottom navigation
/// - Nested routes for booking flow
///
/// Will be fully implemented in Step 2 with GoRouter dependency.

// TODO: Implement with GoRouter in Step 2
//
// final GoRouter appRouter = GoRouter(
//   initialLocation: RouteNames.splash,
//   debugLogDiagnostics: kDebugMode,
//   redirect: _authGuard,
//   routes: [
//     // Splash & Welcome
//     GoRoute(path: RouteNames.splash, ...),
//     GoRoute(path: RouteNames.welcome, ...),
//
//     // Auth routes
//     GoRoute(path: RouteNames.login, ...),
//     GoRoute(path: RouteNames.signup, ...),
//     GoRoute(path: RouteNames.otp, ...),
//
//     // Main shell with bottom navigation
//     ShellRoute(
//       builder: (context, state, child) => MainShell(child: child),
//       routes: [
//         GoRoute(path: RouteNames.home, ...),
//         GoRoute(path: RouteNames.myBookings, ...),
//         GoRoute(path: RouteNames.profile, ...),
//       ],
//     ),
//
//     // Turf routes
//     GoRoute(path: RouteNames.turfListing, ...),
//     GoRoute(path: RouteNames.turfDetail, ...),
//
//     // Booking flow
//     GoRoute(path: RouteNames.dateSelection, ...),
//     GoRoute(path: RouteNames.slotSelection, ...),
//     GoRoute(path: RouteNames.bookingSummary, ...),
//     GoRoute(path: RouteNames.payment, ...),
//     GoRoute(path: RouteNames.bookingConfirmation, ...),
//   ],
// );
