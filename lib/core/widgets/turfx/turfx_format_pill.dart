import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';

/// Small "5v5" / "7v7" tinted-green pill.
class TurfFormatPill extends StatelessWidget {
  const TurfFormatPill(this.label, {super.key});

  final String label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.primaryTint,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        child: Text(
          label,
          style: AppTypography.labelXs.copyWith(color: AppColors.accentGreen),
        ),
      ),
    );
  }
}
