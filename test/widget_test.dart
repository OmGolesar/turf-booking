// TurfX smoke test.
//
// Verifies the app boots and renders its first frame without throwing.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:turfx/app.dart';

void main() {
  testWidgets('TurfX app boots and renders a frame', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: TurfXApp(),
      ),
    );

    // Allow the router to settle its initial route.
    await tester.pump();

    // The root MaterialApp should be present.
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
