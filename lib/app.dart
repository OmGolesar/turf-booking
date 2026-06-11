import 'package:flutter/material.dart';

/// Root widget for the TurfX application.
///
/// Sets up MaterialApp.router with:
/// - Material 3 theming (light & dark)
/// - GoRouter navigation
/// - Riverpod state management (wrapped in main.dart)
class TurfXApp extends StatelessWidget {
  const TurfXApp({super.key});

  @override
  Widget build(BuildContext context) {
    // TODO: Replace with GoRouter and theme from core/theme
    return MaterialApp(
      title: 'TurfX',
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.system,
      // theme: AppTheme.lightTheme,
      // darkTheme: AppTheme.darkTheme,
      // routerConfig: appRouter,
      home: const Scaffold(
        body: Center(
          child: Text('TurfX - Coming Soon'),
        ),
      ),
    );
  }
}
