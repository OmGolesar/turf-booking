import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'route_names.dart';
import '../../features/auth/presentation/screens/welcome_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/signup_screen.dart';
import '../../features/auth/presentation/screens/otp_screen.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/home/presentation/screens/home_screen.dart';
import '../../features/turf_listing/presentation/screens/turf_listing_screen.dart';
import '../../features/turf_detail/presentation/screens/turf_detail_screen.dart';
import '../../features/booking/presentation/screens/date_selection_screen.dart';
import '../../features/booking/presentation/screens/slot_selection_screen.dart';
import '../../features/booking/presentation/screens/booking_summary_screen.dart';
import '../../features/booking/presentation/screens/payment_screen.dart';
import '../../features/booking/presentation/screens/booking_confirmation_screen.dart';
import '../../features/my_bookings/presentation/screens/my_bookings_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';
import '../../features/profile/presentation/screens/settings_screen.dart';
import '../../features/admin/presentation/screens/admin_dashboard_screen.dart';
import '../../features/admin/presentation/screens/admin_booking_form_screen.dart';
import '../../features/admin/presentation/screens/admin_slot_manager_screen.dart';
import '../widgets/shell/main_shell.dart';

/// Riverpod provider exposing the [GoRouter] instance.
final appRouterProvider = Provider<GoRouter>((ref) {
  // Listen to auth state so GoRouter refreshes on auth changes.
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: RouteNames.welcome,
    debugLogDiagnostics: false,

    // ── Auth Redirect Logic ────────────────────────────────────────────────
    redirect: (context, state) {
      final isLoggedIn = authState.value != null;
      final isAdmin = authState.value?.isAdmin ?? false;
      final loc = state.matchedLocation;

      final isAuthRoute = loc == RouteNames.welcome ||
          loc == RouteNames.login ||
          loc == RouteNames.signup ||
          loc == RouteNames.otp;

      // If not logged in and trying to access protected routes → welcome
      if (!isLoggedIn && !isAuthRoute) return RouteNames.welcome;

      // If logged in and on auth screens → redirect to appropriate home
      if (isLoggedIn && isAuthRoute) {
        return isAdmin ? '/admin' : RouteNames.home;
      }

      return null; // No redirect needed
    },

    routes: [
      // ── Auth Routes ─────────────────────────────────────────────────────
      GoRoute(
        path: RouteNames.welcome,
        builder: (context, state) => const WelcomeScreen(),
      ),
      GoRoute(
        path: RouteNames.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: RouteNames.signup,
        builder: (context, state) => const SignupScreen(),
      ),
      GoRoute(
        path: RouteNames.otp,
        builder: (context, state) {
          final phone = state.uri.queryParameters['phone'] ?? '';
          return OtpScreen(phone: phone);
        },
      ),

      // ── Admin Routes ─────────────────────────────────────────────────────
      GoRoute(
        path: '/admin',
        builder: (context, state) => const AdminDashboardScreen(),
        routes: [
          GoRoute(
            path: 'add-booking',
            builder: (context, state) => const AdminBookingFormScreen(),
          ),
          GoRoute(
            path: 'slots',
            builder: (context, state) => const AdminSlotManagerScreen(),
          ),
          GoRoute(
            path: 'edit-turf',
            builder: (context, state) => const Scaffold(
              body: Center(child: Text('Turf Editor — Coming Soon')),
            ),
          ),
        ],
      ),

      // ── Main Shell (Bottom Nav — Discover · Search · Bookings · AI) ─────
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: RouteNames.home,
            builder: (context, state) => const HomeScreen(),
          ),
          GoRoute(
            path: RouteNames.turfListing,
            builder: (context, state) {
              final category = state.uri.queryParameters['category'];
              return TurfListingScreen(initialCategory: category);
            },
          ),
          GoRoute(
            path: RouteNames.myBookings,
            builder: (context, state) => const MyBookingsScreen(),
          ),
          GoRoute(
            path: RouteNames.profile,
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
      GoRoute(
        path: RouteNames.turfDetail,
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return TurfDetailScreen(turfId: id);
        },
      ),

      // ── Booking Flow ─────────────────────────────────────────────────────
      GoRoute(
        path: RouteNames.dateSelection,
        builder: (context, state) {
          final turfId = state.uri.queryParameters['turfId'] ?? '';
          return DateSelectionScreen(turfId: turfId);
        },
      ),
      GoRoute(
        path: RouteNames.slotSelection,
        builder: (context, state) {
          final turfId = state.uri.queryParameters['turfId'] ?? '';
          final date = state.uri.queryParameters['date'] ?? '';
          return SlotSelectionScreen(turfId: turfId, date: date);
        },
      ),
      GoRoute(
        path: RouteNames.bookingSummary,
        builder: (context, state) => const BookingSummaryScreen(),
      ),
      GoRoute(
        path: RouteNames.payment,
        builder: (context, state) => const PaymentScreen(),
      ),
      GoRoute(
        path: RouteNames.bookingConfirmation,
        builder: (context, state) => const BookingConfirmationScreen(),
      ),

      // ── Settings ─────────────────────────────────────────────────────────
      GoRoute(
        path: RouteNames.settings,
        builder: (context, state) => const SettingsScreen(),
      ),
    ],

    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('🔍', style: TextStyle(fontSize: 48)),
            const SizedBox(height: 16),
            Text('Page not found: ${state.uri}'),
          ],
        ),
      ),
    ),
  );
});
