import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'core/router/app_router.dart';

/// Root widget for the TurfX application.
///
/// Wrapped in [ProviderScope] by main.dart.
/// Sets up [MaterialApp.router] with M3 theming and GoRouter.
class TurfXApp extends ConsumerWidget {
  const TurfXApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'TurfX',
      debugShowCheckedModeBanner: false,
      // Dark is TurfX's primary identity (Nike Run Club inspired).
      // Light theme stays available for the Settings toggle.
      themeMode: ThemeMode.dark,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      routerConfig: router,
    );
  }
}
