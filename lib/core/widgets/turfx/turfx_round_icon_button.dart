import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';

/// 40 × 40 rounded icon button used for back / heart / actions.
class TurfRoundIconButton extends StatelessWidget {
  const TurfRoundIconButton({
    super.key,
    required this.icon,
    this.onPressed,
    this.background,
    this.foreground,
    this.size = 40,
    this.iconSize = 16,
    this.showBorder = true,
  });

  final IconData icon;
  final VoidCallback? onPressed;
  final Color? background;
  final Color? foreground;
  final double size;
  final double iconSize;
  final bool showBorder;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Material(
        color: background ?? AppColors.divider.withValues(alpha: 0.8),
        shape: showBorder
            ? RoundedRectangleBorder(
                side: const BorderSide(color: AppColors.borderMuted, width: 1),
                borderRadius: BorderRadius.circular(size / 2),
              )
            : CircleBorder(),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onPressed,
          child: Icon(icon,
              size: iconSize, color: foreground ?? AppColors.textPrimary),
        ),
      ),
    );
  }
}
