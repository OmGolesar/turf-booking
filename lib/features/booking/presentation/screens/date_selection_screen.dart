import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';

/// Retained for route compatibility — the Figma design merges date + slot
/// selection into a single screen. This shim forwards to the merged screen.
class DateSelectionScreen extends StatelessWidget {
  final String turfId;
  const DateSelectionScreen({super.key, required this.turfId});

  @override
  Widget build(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (context.mounted) {
        context.go('${RouteNames.slotSelection}?turfId=$turfId&date=');
      }
    });
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}
