import 'package:flutter/material.dart';

/// TurfX color palette — Figma "turf-dak-mode" spec.
///
/// All values sourced from the Figma design tokens. Dark mode is the primary
/// identity; the light-theme colors below are kept only so the existing
/// `AppTheme.lightTheme` continues to compile.
class AppColors {
  AppColors._();

  // ── Backgrounds / Surfaces ────────────────────────────────
  /// Primary app background (top-app-bar, most screens).
  static const Color bg = Color(0xFF0F1511);

  /// Deepest layer — Home / Confirmation root, card fills on lists.
  static const Color bgDeep = Color(0xFF0A0F0C);

  /// Elevated card fill, inactive chips, search input.
  static const Color surface = Color(0xFF171D19);

  /// Booking bar, secondary card, phone-number container.
  static const Color surfaceAlt = Color(0xFF1B211D);

  /// Disabled slot fill, muted chip.
  static const Color surfaceDim = Color(0xFF262B27);

  /// Blurred sticky-header / rating pill scrim.
  static const Color overlayScrim = Color(0xE60A0F0C);

  /// Sticky bottom-action-bar scrim.
  static const Color overlayScrimSoft = Color(0xE6171D19);

  // ── Borders / Dividers ────────────────────────────────────
  static const Color border = Color(0xFF3E4942);
  static const Color borderMuted = Color(0x4D3E4942);
  static const Color borderFaint = Color(0x333E4942);
  static const Color divider = Color(0xFF313632);

  // ── Text ──────────────────────────────────────────────────
  static const Color textPrimary = Color(0xFFDFE4DE);
  static const Color textSecondary = Color(0xFFBDCABF);
  static const Color textSecondaryAlt = Color(0xFFC6C6C7);
  static const Color textTertiary = Color(0xFF88948A);
  static const Color textDisabled = Color(0xFF3E4942);
  static const Color onPrimary = Color(0xFFEFFFF2);
  static const Color onPrimaryDark = Color(0xFF003822);

  // ── Brand / Semantic ──────────────────────────────────────
  static const Color primary = Color(0xFF0B8457);
  static const Color primaryTint = Color(0x330B8457);
  static const Color primaryTintStrong = Color(0x660B8457);
  static const Color accentGreen = Color(0xFF75DAA6);
  static const Color accentGreenBright = Color(0xFF91F7C0);
  static const Color focusBlue = Color(0xFF2563EB);

  // Semantic
  static const Color success = Color(0xFF22C55E);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);

  // Social-proof badges
  static const Color badgeGold = Color(0xFFFFD700);
  static const Color badgeHot = Color(0xFFFF6B35);

  // ── Gradients ─────────────────────────────────────────────
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF0B8457), Color(0xFF75DAA6)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  /// Welcome hero → bottom fade to bg.
  static const LinearGradient welcomeOverlay = LinearGradient(
    colors: [
      Color(0x1A0A0F0C),
      Color(0x990A0F0C),
      Color(0xFF0A0F0C),
    ],
    stops: [0.0, 0.75, 1.0],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  /// Turf Detail hero → top fade so title reads.
  static const LinearGradient detailHeroOverlay = LinearGradient(
    colors: [
      Color(0xFF0F1511),
      Color(0x990F1511),
      Color(0x000F1511),
    ],
    stops: [0.0, 0.5, 1.0],
    begin: Alignment.bottomCenter,
    end: Alignment.topCenter,
  );

  static const LinearGradient darkOverlayGradient = LinearGradient(
    colors: [Colors.transparent, Color(0xCC000000)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  // ── Shimmer ───────────────────────────────────────────────
  static const Color shimmerBase = Color(0xFFE0E0E0);
  static const Color shimmerHighlight = Color(0xFFF5F5F5);
  static const Color shimmerBaseDark = Color(0xFF2D2D2D);
  static const Color shimmerHighlightDark = Color(0xFF3D3D3D);

  // ── Backwards-compatible aliases ──────────────────────────
  // Existing widgets reference these — mapping to the new palette.
  static const Color primaryDark = Color(0xFF075E3E);
  static const Color primaryLight = accentGreen;
  static const Color secondary = surfaceAlt;
  static const Color accent = accentGreen;

  static const Color backgroundLight = Color(0xFFF8F9FA);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color cardLight = Color(0xFFFFFFFF);

  static const Color backgroundDark = bgDeep;
  static const Color surfaceDark = surface;
  static const Color cardDark = bgDeep;

  static const Color backgroundDarkPure = bgDeep;
  static const Color surfaceDarkElevated = surfaceAlt;

  static const Color textOnDarkPrimary = textPrimary;
  static const Color textOnDarkSecondary = textSecondary;
  static const Color textOnDarkTertiary = textTertiary;

  static const Color textPrimaryLight = Color(0xFF1A1A2E);
  static const Color textSecondaryLight = Color(0xFF6B7280);
  static const Color textTertiaryLight = Color(0xFF9CA3AF);

  static const Color textPrimaryDark = textPrimary;
  static const Color textSecondaryDark = textSecondary;
  static const Color textTertiaryDark = textTertiary;

  static const Color dividerDark = border;
}
