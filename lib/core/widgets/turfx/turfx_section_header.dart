import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';

/// Section header with title on the left and optional "See all" trailing link.
class TurfSectionHeader extends StatelessWidget {
  const TurfSectionHeader({
    super.key,
    required this.title,
    this.actionLabel,
    this.onActionTap,
    this.style,
  });

  final String title;
  final String? actionLabel;
  final VoidCallback? onActionTap;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: (style ?? AppTypography.h2Alt).copyWith(
            color: AppColors.textPrimary,
          ),
        ),
        if (actionLabel != null)
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: onActionTap,
            child: Text(
              actionLabel!,
              style: AppTypography.bodyMdStrong.copyWith(
                color: AppColors.accentGreen,
              ),
            ),
          ),
      ],
    );
  }
}
