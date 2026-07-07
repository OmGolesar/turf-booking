import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';

/// TurfX bottom nav — Discover / Search / Bookings / AI.
///
/// The active item is wrapped in a green pill; inactives show icon + label
/// in `#C6C6C7`. Height 80, top-border, subtle 12 px top-radius.
class TurfBottomNav extends StatelessWidget {
  const TurfBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
    this.pillTop = false,
  });

  /// 0 = Discover, 1 = Search, 2 = Bookings, 3 = AI
  final int currentIndex;
  final ValueChanged<int> onTap;

  /// If true, the nav has 12-px top radius (Home). Otherwise, squared
  /// (Search Results).
  final bool pillTop;

  static const _items = <_NavItem>[
    _NavItem(icon: Icons.home_rounded, label: 'Discover'),
    _NavItem(icon: Icons.search_rounded, label: 'Search'),
    _NavItem(icon: Icons.calendar_today_rounded, label: 'Bookings'),
    _NavItem(icon: Icons.auto_awesome_rounded, label: 'AI'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 80,
      decoration: BoxDecoration(
        color: AppColors.divider,
        borderRadius: pillTop
            ? const BorderRadius.vertical(top: Radius.circular(12))
            : null,
        border: const Border(
          top: BorderSide(color: AppColors.border, width: 1),
        ),
      ),
      padding: const EdgeInsets.only(top: 8, left: 8, right: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          for (var i = 0; i < _items.length; i++)
            _NavCell(
              item: _items[i],
              active: i == currentIndex,
              onTap: () => onTap(i),
            ),
        ],
      ),
    );
  }
}

class _NavItem {
  const _NavItem({required this.icon, required this.label});
  final IconData icon;
  final String label;
}

class _NavCell extends StatelessWidget {
  const _NavCell({required this.item, required this.active, required this.onTap});

  final _NavItem item;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final content = Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          item.icon,
          size: 20,
          color: active ? AppColors.onPrimary : AppColors.textSecondaryAlt,
        ),
        const SizedBox(height: 4),
        Text(
          item.label,
          style: AppTypography.labelNav.copyWith(
            color: active ? AppColors.onPrimary : AppColors.textSecondaryAlt,
          ),
        ),
      ],
    );

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: active
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(999),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.25),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: content,
            )
          : Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: content,
            ),
    );
  }
}
