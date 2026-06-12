import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';
import 'app_typography.dart';
import 'app_radius.dart';

/// TurfX Material 3 theme configuration.
///
/// Provides complete [ThemeData] for both light and dark modes,
/// with custom color scheme, typography, and component themes.
class AppTheme {
  AppTheme._();

  // ── Light Theme ───────────────────────────────────────────
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: _lightColorScheme,
      scaffoldBackgroundColor: AppColors.backgroundLight,
      textTheme: GoogleFonts.interTextTheme(_textTheme(Brightness.light)),
      appBarTheme: _appBarTheme(Brightness.light),
      cardTheme: _cardTheme(Brightness.light),
      elevatedButtonTheme: _elevatedButtonTheme,
      outlinedButtonTheme: _outlinedButtonTheme,
      textButtonTheme: _textButtonTheme,
      inputDecorationTheme: _inputDecorationTheme(Brightness.light),
      bottomNavigationBarTheme: _bottomNavTheme(Brightness.light),
      chipTheme: _chipTheme(Brightness.light),
      dividerTheme: const DividerThemeData(
        color: AppColors.divider,
        thickness: 1,
      ),
    );
  }

  // ── Dark Theme ────────────────────────────────────────────
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: _darkColorScheme,
      scaffoldBackgroundColor: AppColors.backgroundDark,
      textTheme: GoogleFonts.interTextTheme(_textTheme(Brightness.dark)),
      appBarTheme: _appBarTheme(Brightness.dark),
      cardTheme: _cardTheme(Brightness.dark),
      elevatedButtonTheme: _elevatedButtonTheme,
      outlinedButtonTheme: _outlinedButtonTheme,
      textButtonTheme: _textButtonTheme,
      inputDecorationTheme: _inputDecorationTheme(Brightness.dark),
      bottomNavigationBarTheme: _bottomNavTheme(Brightness.dark),
      chipTheme: _chipTheme(Brightness.dark),
      dividerTheme: const DividerThemeData(
        color: AppColors.dividerDark,
        thickness: 1,
      ),
    );
  }

  // ── Color Schemes ─────────────────────────────────────────
  static const ColorScheme _lightColorScheme = ColorScheme.light(
    primary: AppColors.primary,
    onPrimary: Colors.white,
    primaryContainer: AppColors.primaryLight,
    secondary: AppColors.secondary,
    onSecondary: Colors.white,
    tertiary: AppColors.accent,
    surface: AppColors.surfaceLight,
    onSurface: AppColors.textPrimaryLight,
    error: AppColors.error,
    onError: Colors.white,
  );

  static const ColorScheme _darkColorScheme = ColorScheme.dark(
    primary: AppColors.primary,
    onPrimary: Colors.white,
    primaryContainer: AppColors.primaryDark,
    secondary: AppColors.secondary,
    onSecondary: Colors.white,
    tertiary: AppColors.accent,
    surface: AppColors.surfaceDark,
    onSurface: AppColors.textPrimaryDark,
    error: AppColors.error,
    onError: Colors.white,
  );

  // ── Text Theme ────────────────────────────────────────────
  static TextTheme _textTheme(Brightness brightness) {
    final color = brightness == Brightness.light
        ? AppColors.textPrimaryLight
        : AppColors.textPrimaryDark;

    return TextTheme(
      displayLarge: AppTypography.displayLarge.copyWith(color: color),
      displayMedium: AppTypography.displayMedium.copyWith(color: color),
      displaySmall: AppTypography.displaySmall.copyWith(color: color),
      headlineLarge: AppTypography.headlineLarge.copyWith(color: color),
      headlineMedium: AppTypography.headlineMedium.copyWith(color: color),
      headlineSmall: AppTypography.headlineSmall.copyWith(color: color),
      titleLarge: AppTypography.titleLarge.copyWith(color: color),
      titleMedium: AppTypography.titleMedium.copyWith(color: color),
      titleSmall: AppTypography.titleSmall.copyWith(color: color),
      bodyLarge: AppTypography.bodyLarge.copyWith(color: color),
      bodyMedium: AppTypography.bodyMedium.copyWith(color: color),
      bodySmall: AppTypography.bodySmall.copyWith(color: color),
      labelLarge: AppTypography.labelLarge.copyWith(color: color),
      labelMedium: AppTypography.labelMedium.copyWith(color: color),
      labelSmall: AppTypography.labelSmall.copyWith(color: color),
    );
  }

  // ── AppBar Theme ──────────────────────────────────────────
  static AppBarTheme _appBarTheme(Brightness brightness) {
    final isLight = brightness == Brightness.light;
    return AppBarTheme(
      elevation: 0,
      scrolledUnderElevation: 0.5,
      centerTitle: false,
      backgroundColor: isLight ? AppColors.surfaceLight : AppColors.surfaceDark,
      foregroundColor: isLight ? AppColors.textPrimaryLight : AppColors.textPrimaryDark,
      systemOverlayStyle: isLight
          ? SystemUiOverlayStyle.dark
          : SystemUiOverlayStyle.light,
      titleTextStyle: AppTypography.headlineSmall.copyWith(
        color: isLight ? AppColors.textPrimaryLight : AppColors.textPrimaryDark,
      ),
    );
  }

  // ── Card Theme ────────────────────────────────────────────
  static CardThemeData _cardTheme(Brightness brightness) {
    final isLight = brightness == Brightness.light;
    return CardThemeData(
      elevation: isLight ? 1 : 0,
      color: isLight ? AppColors.cardLight : AppColors.cardDark,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        side: isLight
            ? BorderSide.none
            : const BorderSide(color: AppColors.dividerDark, width: 0.5),
      ),
      margin: EdgeInsets.zero,
    );
  }

  // ── Button Themes ─────────────────────────────────────────
  static ElevatedButtonThemeData get _elevatedButtonTheme {
    return ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm),
        ),
        textStyle: AppTypography.button,
      ),
    );
  }

  static OutlinedButtonThemeData get _outlinedButtonTheme {
    return OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.primary,
        side: const BorderSide(color: AppColors.primary, width: 1.5),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm),
        ),
        textStyle: AppTypography.button,
      ),
    );
  }

  static TextButtonThemeData get _textButtonTheme {
    return TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: AppColors.primary,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        textStyle: AppTypography.button,
      ),
    );
  }

  // ── Input Decoration Theme ────────────────────────────────
  static InputDecorationTheme _inputDecorationTheme(Brightness brightness) {
    final isLight = brightness == Brightness.light;
    return InputDecorationTheme(
      filled: true,
      fillColor: isLight
          ? AppColors.backgroundLight
          : AppColors.surfaceDark,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.sm),
        borderSide: BorderSide(
          color: isLight ? AppColors.divider : AppColors.dividerDark,
        ),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.sm),
        borderSide: BorderSide(
          color: isLight ? AppColors.divider : AppColors.dividerDark,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.sm),
        borderSide: const BorderSide(color: AppColors.primary, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.sm),
        borderSide: const BorderSide(color: AppColors.error),
      ),
      hintStyle: AppTypography.bodyMedium.copyWith(
        color: isLight ? AppColors.textTertiaryLight : AppColors.textTertiaryDark,
      ),
    );
  }

  // ── Bottom Nav Theme ──────────────────────────────────────
  static BottomNavigationBarThemeData _bottomNavTheme(Brightness brightness) {
    final isLight = brightness == Brightness.light;
    return BottomNavigationBarThemeData(
      backgroundColor: isLight ? AppColors.surfaceLight : AppColors.surfaceDark,
      selectedItemColor: AppColors.primary,
      unselectedItemColor: isLight
          ? AppColors.textTertiaryLight
          : AppColors.textTertiaryDark,
      type: BottomNavigationBarType.fixed,
      elevation: 8,
      selectedLabelStyle: AppTypography.labelSmall,
      unselectedLabelStyle: AppTypography.labelSmall,
    );
  }

  // ── Chip Theme ────────────────────────────────────────────
  static ChipThemeData _chipTheme(Brightness brightness) {
    final isLight = brightness == Brightness.light;
    return ChipThemeData(
      backgroundColor: isLight ? AppColors.backgroundLight : AppColors.surfaceDark,
      selectedColor: AppColors.primary.withValues(alpha: 0.15),
      labelStyle: AppTypography.labelMedium.copyWith(
        color: isLight ? AppColors.textPrimaryLight : AppColors.textPrimaryDark,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      side: BorderSide(
        color: isLight ? AppColors.divider : AppColors.dividerDark,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
    );
  }
}
