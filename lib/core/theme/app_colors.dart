import 'package:flutter/material.dart';

/// TurfX color palette.
///
/// Uses a curated, harmonious color system built on HSL values
/// for precise control. Supports both light and dark themes.
class AppColors {
  AppColors._();

  // ── Brand Colors ──────────────────────────────────────────
  static const Color primary = Color(0xFF00C853);       // Vibrant green
  static const Color primaryDark = Color(0xFF009624);    // Deep green
  static const Color primaryLight = Color(0xFF5EFC82);   // Light green
  static const Color secondary = Color(0xFF1A1A2E);      // Deep navy
  static const Color accent = Color(0xFF00BFA5);         // Teal accent

  // ── Surface Colors (Light Theme) ──────────────────────────
  static const Color backgroundLight = Color(0xFFF8F9FA);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color cardLight = Color(0xFFFFFFFF);

  // ── Surface Colors (Dark Theme) ───────────────────────────
  static const Color backgroundDark = Color(0xFF0D1117);
  static const Color surfaceDark = Color(0xFF161B22);
  static const Color cardDark = Color(0xFF21262D);

  // ── Text Colors ───────────────────────────────────────────
  static const Color textPrimaryLight = Color(0xFF1A1A2E);
  static const Color textSecondaryLight = Color(0xFF6B7280);
  static const Color textTertiaryLight = Color(0xFF9CA3AF);

  static const Color textPrimaryDark = Color(0xFFF0F6FC);
  static const Color textSecondaryDark = Color(0xFF8B949E);
  static const Color textTertiaryDark = Color(0xFF484F58);

  // ── Semantic Colors ───────────────────────────────────────
  static const Color success = Color(0xFF22C55E);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);

  // ── Gradient Colors ───────────────────────────────────────
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF00C853), Color(0xFF00BFA5)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient darkOverlayGradient = LinearGradient(
    colors: [Colors.transparent, Color(0xCC000000)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  // ── Misc ──────────────────────────────────────────────────
  static const Color divider = Color(0xFFE5E7EB);
  static const Color dividerDark = Color(0xFF30363D);
  static const Color shimmerBase = Color(0xFFE0E0E0);
  static const Color shimmerHighlight = Color(0xFFF5F5F5);
  static const Color shimmerBaseDark = Color(0xFF2D2D2D);
  static const Color shimmerHighlightDark = Color(0xFF3D3D3D);
}
