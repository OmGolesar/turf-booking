// TurfX smoke tests.
//
// The full-app boot test was removed because it pulls in
// `authStateProvider` which touches Firebase, and Firebase can't be
// initialized in a plain `flutter test` environment. Add a
// full-app integration test under `integration_test/` once the
// Firebase emulator is wired into CI (tracked in FRONTEND_BACKEND_WIRING.md §8).
//
// These tests cover pure logic + widgets that don't touch Firebase, so they
// can run in any CI without secrets.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:turfx/core/theme/app_theme.dart';
import 'package:turfx/core/utils/formatters.dart';

void main() {
  group('Formatters.price', () {
    test('renders whole rupees with ₹ prefix', () {
      expect(Formatters.price(0), '₹0');
      expect(Formatters.price(45), '₹45');
      expect(Formatters.price(999), '₹999');
    });

    test('uses Indian numbering commas', () {
      expect(Formatters.price(1000), '₹1,000');
      expect(Formatters.price(12345), '₹12,345');
      expect(Formatters.price(100000), '₹100,000');
    });

    test('drops decimals (booking totals round to whole rupees)', () {
      expect(Formatters.price(97.35), '₹97');
      expect(Formatters.price(1449.5), '₹1,450');
    });
  });

  group('Formatters.duration', () {
    test('minutes-only under an hour', () {
      expect(Formatters.duration(30), '30m');
      expect(Formatters.duration(59), '59m');
    });

    test('hours + minutes', () {
      expect(Formatters.duration(60), '1h');
      expect(Formatters.duration(90), '1h 30m');
      expect(Formatters.duration(125), '2h 5m');
    });
  });

  testWidgets('AppTheme.darkTheme applies dark ThemeData', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.dark,
        home: const Scaffold(body: Text('TurfX')),
      ),
    );

    expect(find.text('TurfX'), findsOneWidget);
    final materialApp = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(materialApp.themeMode, ThemeMode.dark);
    expect(materialApp.darkTheme?.brightness, Brightness.dark);
  });
}
