import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_typography.dart';

/// TurfX primary CTA — fill `primary`, radius 16, glow shadow, text `onPrimary`.
///
/// The default variant is [TurfPrimaryVariant.solid]. Use
/// [TurfPrimaryVariant.bright] to switch to the bright-green background used
/// on the Booking Summary → Payment button (with dark text).
class TurfPrimaryButton extends StatelessWidget {
  const TurfPrimaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.trailingIcon,
    this.leadingIcon,
    this.isLoading = false,
    this.variant = TurfPrimaryVariant.solid,
    this.fullWidth = true,
    this.padding,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? trailingIcon;
  final IconData? leadingIcon;
  final bool isLoading;
  final TurfPrimaryVariant variant;
  final bool fullWidth;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    final bg = variant == TurfPrimaryVariant.bright
        ? AppColors.accentGreenBright
        : AppColors.primary;
    final fg = variant == TurfPrimaryVariant.bright
        ? AppColors.onPrimaryDark
        : AppColors.onPrimary;

    final child = Row(
      mainAxisSize: fullWidth ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (leadingIcon != null) ...[
          Icon(leadingIcon, size: 16, color: fg),
          const SizedBox(width: 8),
        ],
        if (isLoading)
          SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation(fg),
            ),
          )
        else
          Text(
            label,
            style: AppTypography.bodyMdStrong.copyWith(color: fg),
          ),
        if (trailingIcon != null && !isLoading) ...[
          const SizedBox(width: 8),
          Icon(trailingIcon, size: 16, color: fg),
        ],
      ],
    );

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.25),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: bg,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: isLoading ? null : onPressed,
          child: Padding(
            padding: padding ??
                const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: child,
          ),
        ),
      ),
    );
  }
}

enum TurfPrimaryVariant { solid, bright }
