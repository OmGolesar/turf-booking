import 'package:flutter/material.dart';

/// Styled icon button for TurfX.
///
/// Used for toolbar actions, favorites, share, etc.
class TurfXIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final Color? color;
  final double size;
  final String? tooltip;
  final bool hasBadge;

  const TurfXIconButton({
    super.key,
    required this.icon,
    this.onPressed,
    this.color,
    this.size = 24,
    this.tooltip,
    this.hasBadge = false,
  });

  @override
  Widget build(BuildContext context) {
    // TODO: Style in Step 3
    return IconButton(
      icon: Icon(icon, size: size, color: color),
      onPressed: onPressed,
      tooltip: tooltip,
    );
  }
}
