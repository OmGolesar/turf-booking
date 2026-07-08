import 'package:flutter/material.dart';

/// TurfX typography — Inter. Matches the Figma "turf-dak-mode" scale.
class AppTypography {
  AppTypography._();

  static const String _fontFamily = 'Inter';

  // ── Figma display styles ──────────────────────────────────
  /// 48/56, 700, -0.02em — Booking Summary grand total.
  static const TextStyle displayXxl = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 48,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.96,
    height: 56 / 48,
  );

  /// 34/41, 800, -0.025em — "TurfX" brand mark, "BOOKED!" hero.
  static const TextStyle displayXl = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 34,
    fontWeight: FontWeight.w800,
    letterSpacing: -0.85,
    height: 41 / 34,
  );

  /// 48/50.4, 400, -0.0313em, UPPER — Welcome hero headline.
  static const TextStyle displayHero = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 48,
    fontWeight: FontWeight.w400,
    letterSpacing: -1.5,
    height: 50.4 / 48,
  );

  /// 36/42, 700 — Turf-Detail hero title, "Pick Date & Slot".
  static const TextStyle displayLg = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 36,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.9,
    height: 42 / 36,
  );

  // ── Heading ──────────────────────────────────────────────
  /// 24/32, 600 — page titles ("Football Turfs", "Payment").
  static const TextStyle h1 = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 24,
    fontWeight: FontWeight.w600,
    height: 32 / 24,
  );

  /// 20/28, 600 — card titles, section titles.
  static const TextStyle h2 = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 20,
    fontWeight: FontWeight.w600,
    height: 28 / 20,
  );

  /// 20/25, 600 — Home section headings ("Near You").
  static const TextStyle h2Alt = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 20,
    fontWeight: FontWeight.w600,
    height: 25 / 20,
  );

  /// 16/20, 600 — Home card names.
  static const TextStyle h3 = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 16,
    fontWeight: FontWeight.w600,
    height: 20 / 16,
  );

  // ── Body ─────────────────────────────────────────────────
  /// 17/24, 400 — search placeholder, confirmation description.
  static const TextStyle bodyLg = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 17,
    fontWeight: FontWeight.w400,
    height: 24 / 17,
  );

  /// 16/24, 600 — Booking Summary detail values.
  static const TextStyle bodyMdEmphasized = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 16,
    fontWeight: FontWeight.w600,
    height: 24 / 16,
  );

  /// 16/20, 600 — primary button labels.
  static const TextStyle bodyMdStrong = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 16,
    fontWeight: FontWeight.w600,
    height: 20 / 16,
  );

  /// 16/24, 400 — payment-method titles, coupon placeholder.
  static const TextStyle bodyMd = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 16,
    fontWeight: FontWeight.w400,
    height: 24 / 16,
  );

  /// 15/20, 400 — home card subtitle, "/hr" suffix.
  static const TextStyle bodySm = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 15,
    fontWeight: FontWeight.w400,
    height: 20 / 15,
  );

  /// 14/20, 400 — chip labels, address, slot times, payment secondary.
  static const TextStyle bodyXs = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w400,
    height: 20 / 14,
  );

  /// 14/22.75, 400 — About paragraph copy.
  static const TextStyle bodyXsLong = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w400,
    height: 22.75 / 14,
  );

  // ── Labels ───────────────────────────────────────────────
  /// 14/20, 600 — small button labels ("Add to Calendar").
  static const TextStyle labelLgBtn = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w600,
    height: 20 / 14,
  );

  /// 12/16, 600, 0.05em — card "Book" button, "PREMIUM" badge.
  static const TextStyle labelMdCta = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.6,
    height: 16 / 12,
  );

  /// 12/16, 600, 0.05em, UPPER — date-picker day, "MORNING", "BOOKED".
  static const TextStyle labelMdCtaUpper = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.6,
    height: 16 / 12,
  );

  /// 12/16, 600, 0.1em, UPPER — "TURFX ELITE" micro-label.
  static const TextStyle labelElite = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w600,
    letterSpacing: 1.2,
    height: 16 / 12,
  );

  /// 12/16, 700, 0.0417em — Rating chip "4.9".
  static const TextStyle labelRating = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.5,
    height: 16 / 12,
  );

  /// 10/15, 700 — Sport badge "CRICKET", "FUTSAL".
  static const TextStyle labelSmCaps = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 10,
    fontWeight: FontWeight.w700,
    height: 15 / 10,
  );

  /// 10/15, 400 — Bottom-nav labels.
  static const TextStyle labelNav = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 10,
    fontWeight: FontWeight.w400,
    height: 15 / 10,
  );

  /// 10/14, 500 — small chip text (5v5, "₹1,200" small, "Next slot").
  static const TextStyle labelXs = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 10,
    fontWeight: FontWeight.w500,
    height: 14 / 10,
  );

  /// 10/14, 500, 0.025em, UPPER — "SECURED BY RAZORPAY", "INCL. TAXES".
  static const TextStyle labelXsUpper = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 10,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.25,
    height: 14 / 10,
  );

  /// 10/12.5, 500 — Amenity chip labels ("Floodlights", "GPay").
  static const TextStyle labelXxs = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 10,
    fontWeight: FontWeight.w500,
    height: 12.5 / 10,
  );

  // ── Backwards-compatible aliases (Material text theme) ────
  static const TextStyle displayLarge = displayXl;
  static const TextStyle displayMedium = displayLg;
  static const TextStyle displaySmall = h1;
  static const TextStyle headlineLarge = h1;
  static const TextStyle headlineMedium = h2;
  static const TextStyle headlineSmall = h3;
  static const TextStyle titleLarge = h2;
  static const TextStyle titleMedium = h3;
  static const TextStyle titleSmall = bodyXs;
  static const TextStyle bodyLarge = bodyMd;
  static const TextStyle bodyMedium = bodyXs;
  static const TextStyle bodySmall = labelXs;
  static const TextStyle labelLarge = labelLgBtn;
  static const TextStyle labelMedium = labelMdCta;
  static const TextStyle labelSmall = labelXs;
  static const TextStyle button = bodyMdStrong;
  static const TextStyle caption = labelXs;
}
