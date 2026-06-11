import 'package:flutter/material.dart';

/// Social login button (Google, Apple, etc.) for TurfX.
class SocialLoginButton extends StatelessWidget {
  final String text;
  final String iconPath;
  final VoidCallback? onPressed;

  const SocialLoginButton({
    super.key,
    required this.text,
    required this.iconPath,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    // TODO: Implement in Step 4
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: const Icon(Icons.login, size: 20),
      label: Text(text),
    );
  }
}
