import 'package:flutter/material.dart';
import 'shimmer_loading.dart';

/// Skeleton card placeholder for turf cards.
///
/// Mimics the layout of [TurfCard] during loading state.
class SkeletonCard extends StatelessWidget {
  final bool isCompact;

  const SkeletonCard({super.key, this.isCompact = false});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ShimmerLoading(height: isCompact ? 100 : 150, borderRadius: 8),
            const SizedBox(height: 12),
            const ShimmerLoading(height: 16, width: 180),
            const SizedBox(height: 8),
            const ShimmerLoading(height: 12, width: 120),
            const SizedBox(height: 8),
            const ShimmerLoading(height: 14, width: 80),
          ],
        ),
      ),
    );
  }
}
