import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';

/// Rounded pill chip. Active state fills `primary`; inactive uses `surface`
/// with a subtle border. Trailing chevron optional (used on Search Results).
class TurfFilterChip extends StatelessWidget {
  const TurfFilterChip({
    super.key,
    required this.label,
    required this.active,
    this.onTap,
    this.trailingIcon,
    this.dense = false,
  });

  final String label;
  final bool active;
  final VoidCallback? onTap;
  final IconData? trailingIcon;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final bg = active ? AppColors.primary : AppColors.surface;
    final textColor = active ? AppColors.onPrimary : AppColors.textSecondary;
    final borderColor = active ? Colors.transparent : AppColors.borderFaint;

    final vPad = dense ? 8.0 : 10.0;
    final hPad = dense ? 16.0 : 24.0;
    final textStyle = dense
        ? AppTypography.bodyXs.copyWith(color: textColor)
        : AppTypography.bodyMdStrong.copyWith(color: textColor);

    return Material(
      color: bg,
      shape: StadiumBorder(side: BorderSide(color: borderColor)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: hPad, vertical: vPad),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(label, style: textStyle),
              if (trailingIcon != null) ...[
                const SizedBox(width: 6),
                Icon(trailingIcon, size: 13.5, color: textColor),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
