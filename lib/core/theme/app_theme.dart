import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';
import 'app_typography.dart';
import 'app_radius.dart';

/// TurfX Material 3 theme configuration.
///
/// Dark is the primary identity — tokens are pulled from
/// the Figma "turf-dak-mode" spec. Light theme is preserved
/// for the settings toggle but is not the design driver.
class AppTheme {
  AppTheme._();

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
        color: Color(0xFFE5E7EB),
        thickness: 1,
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: _darkColorScheme,
      scaffoldBackgroundColor: AppColors.bg,
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
        color: AppColors.border,
        thickness: 1,
      ),
    );
  }

  static const ColorScheme _lightColorScheme = ColorScheme.light(
    primary: AppColors.primary,
    onPrimary: AppColors.onPrimary,
    primaryContainer: AppColors.accentGreen,
    secondary: AppColors.surfaceAlt,
    onSecondary: AppColors.textPrimary,
    tertiary: AppColors.accentGreen,
    surface: AppColors.surfaceLight,
    onSurface: AppColors.textPrimaryLight,
    error: AppColors.error,
    onError: Colors.white,
  );

  static const ColorScheme _darkColorScheme = ColorScheme.dark(
    primary: AppColors.primary,
    onPrimary: AppColors.onPrimary,
    primaryContainer: AppColors.primaryTint,
    secondary: AppColors.accentGreen,
    onSecondary: AppColors.onPrimaryDark,
    tertiary: AppColors.accentGreenBright,
    surface: AppColors.surface,
    onSurface: AppColors.textPrimary,
    surfaceContainerHighest: AppColors.surfaceAlt,
    outline: AppColors.border,
    outlineVariant: AppColors.divider,
    error: AppColors.error,
    onError: Colors.white,
  );

  static TextTheme _textTheme(Brightness brightness) {
    final color = brightness == Brightness.light
        ? AppColors.textPrimaryLight
        : AppColors.textPrimary;

    return TextTheme(
      displayLarge: AppTypography.displayXl.copyWith(color: color),
      displayMedium: AppTypography.displayLg.copyWith(color: color),
      displaySmall: AppTypography.h1.copyWith(color: color),
      headlineLarge: AppTypography.h1.copyWith(color: color),
      headlineMedium: AppTypography.h2.copyWith(color: color),
      headlineSmall: AppTypography.h3.copyWith(color: color),
      titleLarge: AppTypography.h2.copyWith(color: color),
      titleMedium: AppTypography.h3.copyWith(color: color),
      titleSmall: AppTypography.bodyXs.copyWith(color: color),
      bodyLarge: AppTypography.bodyMd.copyWith(color: color),
      bodyMedium: AppTypography.bodyXs.copyWith(color: color),
      bodySmall: AppTypography.labelXs.copyWith(color: color),
      labelLarge: AppTypography.labelLgBtn.copyWith(color: color),
      labelMedium: AppTypography.labelMdCta.copyWith(color: color),
      labelSmall: AppTypography.labelXs.copyWith(color: color),
    );
  }

  static AppBarTheme _appBarTheme(Brightness brightness) {
    final isLight = brightness == Brightness.light;
    return AppBarTheme(
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      backgroundColor: isLight ? AppColors.surfaceLight : AppColors.bg,
      foregroundColor: isLight ? AppColors.textPrimaryLight : AppColors.textPrimary,
      titleTextStyle: AppTypography.h1.copyWith(
        color: isLight ? AppColors.textPrimaryLight : AppColors.textPrimary,
      ),
    );
  }

  static CardThemeData _cardTheme(Brightness brightness) {
    final isLight = brightness == Brightness.light;
    return CardThemeData(
      elevation: 0,
      color: isLight ? AppColors.cardLight : AppColors.bgDeep,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        side: isLight
            ? BorderSide.none
            : const BorderSide(color: AppColors.border, width: 1),
      ),
      margin: EdgeInsets.zero,
    );
  }

  static ElevatedButtonThemeData get _elevatedButtonTheme {
    return ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.onPrimary,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
        ),
        textStyle: AppTypography.bodyMdStrong,
      ),
    );
  }

  static OutlinedButtonThemeData get _outlinedButtonTheme {
    return OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.textPrimary,
        backgroundColor: AppColors.surfaceAlt,
        side: const BorderSide(color: AppColors.border, width: 1),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
        ),
        textStyle: AppTypography.bodyMdStrong,
      ),
    );
  }

  static TextButtonThemeData get _textButtonTheme {
    return TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: AppColors.accentGreen,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        textStyle: AppTypography.labelMdCta,
      ),
    );
  }

  static InputDecorationTheme _inputDecorationTheme(Brightness brightness) {
    final isLight = brightness == Brightness.light;
    return InputDecorationTheme(
      filled: true,
      fillColor: isLight ? AppColors.backgroundLight : AppColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        borderSide: BorderSide(
          color: isLight ? const Color(0xFFE5E7EB) : AppColors.border,
        ),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        borderSide: BorderSide(
          color: isLight ? const Color(0xFFE5E7EB) : AppColors.border,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        borderSide: const BorderSide(color: AppColors.primary, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        borderSide: const BorderSide(color: AppColors.error),
      ),
      hintStyle: AppTypography.bodyLg.copyWith(
        color: isLight ? AppColors.textTertiaryLight : AppColors.textSecondary,
      ),
    );
  }

  static BottomNavigationBarThemeData _bottomNavTheme(Brightness brightness) {
    final isLight = brightness == Brightness.light;
    return BottomNavigationBarThemeData(
      backgroundColor: isLight ? AppColors.surfaceLight : AppColors.divider,
      selectedItemColor: AppColors.onPrimary,
      unselectedItemColor: isLight
          ? AppColors.textTertiaryLight
          : AppColors.textSecondaryAlt,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
      selectedLabelStyle: AppTypography.labelNav,
      unselectedLabelStyle: AppTypography.labelNav,
    );
  }

  static ChipThemeData _chipTheme(Brightness brightness) {
    final isLight = brightness == Brightness.light;
    return ChipThemeData(
      backgroundColor: isLight ? AppColors.backgroundLight : AppColors.surface,
      selectedColor: AppColors.primary,
      labelStyle: AppTypography.bodyXs.copyWith(
        color: isLight ? AppColors.textPrimaryLight : AppColors.textSecondary,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      side: BorderSide(
        color: isLight ? const Color(0xFFE5E7EB) : AppColors.border,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    );
  }
}
