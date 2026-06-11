import 'package:flutter/material.dart';

/// Custom app bar for TurfX.
///
/// Provides a consistent app bar with optional search,
/// actions, and back navigation.
class TurfXAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String? title;
  final List<Widget>? actions;
  final bool showBackButton;
  final VoidCallback? onBackPressed;
  final Widget? leading;
  final bool centerTitle;

  const TurfXAppBar({
    super.key,
    this.title,
    this.actions,
    this.showBackButton = true,
    this.onBackPressed,
    this.leading,
    this.centerTitle = false,
  });

  @override
  Widget build(BuildContext context) {
    // TODO: Implement styled app bar in Step 3
    return AppBar(
      title: title != null ? Text(title!) : null,
      actions: actions,
      centerTitle: centerTitle,
      leading: leading,
      automaticallyImplyLeading: showBackButton,
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}
