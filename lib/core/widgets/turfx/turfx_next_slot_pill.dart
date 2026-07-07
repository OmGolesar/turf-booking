import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';

/// "Next slot: 18:00" pill on cards.
class TurfNextSlotPill extends StatelessWidget {
  const TurfNextSlotPill(this.time, {super.key});

  final String time;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.access_time_rounded,
                size: 10, color: AppColors.textSecondary),
            const SizedBox(width: 4),
            Text(
              'Next slot: $time',
              style: AppTypography.labelXs.copyWith(color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
