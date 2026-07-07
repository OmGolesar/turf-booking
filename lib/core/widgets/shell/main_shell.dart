import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../router/route_names.dart';
import '../../theme/app_colors.dart';
import '../turfx/turfx_bottom_nav.dart';

/// Bottom navigation shell — 4 tabs matching the Figma spec:
/// Discover · Search · Bookings · AI.
class MainShell extends StatelessWidget {
  final Widget child;

  const MainShell({super.key, required this.child});

  static const _tabs = <String>[
    RouteNames.home,
    RouteNames.turfListing,
    RouteNames.myBookings,
    RouteNames.profile, // "AI" placeholder — routes to profile for now.
  ];

  int _currentIndex(BuildContext context) {
    final loc = GoRouterState.of(context).uri.toString();
    for (int i = 0; i < _tabs.length; i++) {
      if (loc.startsWith(_tabs[i])) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final currentIndex = _currentIndex(context);
    return Scaffold(
      backgroundColor: AppColors.bgDeep,
      extendBody: true,
      body: child,
      bottomNavigationBar: TurfBottomNav(
        currentIndex: currentIndex,
        pillTop: true,
        onTap: (i) => context.go(_tabs[i]),
      ),
    );
  }
}
