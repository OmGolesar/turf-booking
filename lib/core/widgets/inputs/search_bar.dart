import 'package:flutter/material.dart';

/// Search bar widget for TurfX.
///
/// Animated search bar with icon, hint text,
/// and debounced search callback.
class TurfXSearchBar extends StatelessWidget {
  final TextEditingController? controller;
  final String hintText;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onTap;
  final bool readOnly;

  const TurfXSearchBar({
    super.key,
    this.controller,
    this.hintText = 'Search turfs, sports...',
    this.onChanged,
    this.onTap,
    this.readOnly = false,
  });

  @override
  Widget build(BuildContext context) {
    // TODO: Implement full design in Step 3
    return TextField(
      controller: controller,
      onChanged: onChanged,
      onTap: onTap,
      readOnly: readOnly,
      decoration: InputDecoration(
        hintText: hintText,
        prefixIcon: const Icon(Icons.search),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}
