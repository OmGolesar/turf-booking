import 'package:flutter/material.dart';

/// Wraps any child with a subtle press-scale animation.
///
/// Scales the child down to [pressedScale] while the pointer is down and
/// springs back on release — the "instant, premium" tap feedback defined in
/// the TurfX design philosophy (Nike Run Club inspired).
///
/// Use [Pressable.button] (100ms) for CTAs and [Pressable.card] (150ms) for
/// cards, or instantiate directly for custom timing.
class Pressable extends StatefulWidget {
  const Pressable({
    super.key,
    required this.child,
    this.onTap,
    this.pressedScale = 0.97,
    this.duration = const Duration(milliseconds: 150),
    this.curve = Curves.easeOut,
    this.enabled = true,
  });

  /// Button preset — faster 100ms feedback for CTAs.
  const Pressable.button({
    super.key,
    required this.child,
    this.onTap,
    this.pressedScale = 0.97,
    this.enabled = true,
  })  : duration = const Duration(milliseconds: 100),
        curve = Curves.easeOut;

  /// Card preset — 150ms feedback for tappable cards/tiles.
  const Pressable.card({
    super.key,
    required this.child,
    this.onTap,
    this.pressedScale = 0.97,
    this.enabled = true,
  })  : duration = const Duration(milliseconds: 150),
        curve = Curves.easeOut;

  final Widget child;
  final VoidCallback? onTap;
  final double pressedScale;
  final Duration duration;
  final Curve curve;
  final bool enabled;

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (!widget.enabled) return;
    if (_pressed != value) setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: widget.enabled ? widget.onTap : null,
      onTapDown: (_) => _setPressed(true),
      onTapUp: (_) => _setPressed(false),
      onTapCancel: () => _setPressed(false),
      child: AnimatedScale(
        scale: _pressed ? widget.pressedScale : 1.0,
        duration: widget.duration,
        curve: widget.curve,
        child: widget.child,
      ),
    );
  }
}
