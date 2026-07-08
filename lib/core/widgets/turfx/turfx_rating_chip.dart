import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';

/// Pill overlay used on top of images to show rating.
class TurfRatingChip extends StatelessWidget {
  const TurfRatingChip({
    super.key,
    required this.rating,
    this.reviewCount,
    this.dense = false,
  });

  final double rating;
  final int? reviewCount;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.overlayScrim,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.star_rounded,
                size: 12, color: AppColors.accentGreen),
            const SizedBox(width: 4),
            Text(
              reviewCount != null
                  ? '${rating.toStringAsFixed(1)} ($reviewCount)'
                  : rating.toStringAsFixed(1),
              style: AppTypography.labelRating.copyWith(
                color: AppColors.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
