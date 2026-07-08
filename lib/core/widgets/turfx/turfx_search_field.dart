import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_typography.dart';

/// Dark search input with leading icon + trailing filter button.
class TurfSearchField extends StatelessWidget {
  const TurfSearchField({
    super.key,
    required this.controller,
    this.hintText = 'Find turfs, clubs, or matches…',
    this.onFilterTap,
    this.onChanged,
    this.onSubmitted,
    this.showFilter = true,
    this.autofocus = false,
  });

  final TextEditingController controller;
  final String hintText;
  final VoidCallback? onFilterTap;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final bool showFilter;
  final bool autofocus;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            const Icon(Icons.search_rounded,
                size: 18, color: AppColors.textPrimary),
            const SizedBox(width: 12),
            Expanded(
              child: TextField(
                controller: controller,
                onChanged: onChanged,
                onSubmitted: onSubmitted,
                autofocus: autofocus,
                style:
                    AppTypography.bodyLg.copyWith(color: AppColors.textPrimary),
                cursorColor: AppColors.accentGreen,
                decoration: InputDecoration(
                  isCollapsed: true,
                  border: InputBorder.none,
                  hintText: hintText,
                  hintStyle: AppTypography.bodyLg.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
            ),
            if (showFilter)
              GestureDetector(
                onTap: onFilterTap,
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.bgDeep,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.tune_rounded,
                      size: 18, color: AppColors.textPrimary),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
