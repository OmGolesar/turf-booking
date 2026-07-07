import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/widgets/turfx_widgets.dart';

/// Welcome (Dark) — Figma spec:
/// Full-bleed hero image with dark gradient fade to bg; centered brand
/// anchor + hero headline + description + primary CTA.
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  static const _heroImage =
      'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=80';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDeep,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Hero image (full bleed, top-aligned 574 tall)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 574,
            child: Image.network(
              _heroImage,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF1B3A2A), Color(0xFF0A1F14)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
              ),
            ),
          ),

          // Gradient overlay 10% → 60% → 100% bg
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(gradient: AppColors.welcomeOverlay),
            ),
          ),

          // Content
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                children: [
                  const Spacer(flex: 5),

                  // Brand anchor — TURFX ELITE
                  Opacity(
                    opacity: 0.9,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.diamond_outlined,
                            size: 16, color: AppColors.primary),
                        const SizedBox(width: 6),
                        Text(
                          'TURFX ELITE',
                          style: AppTypography.labelElite.copyWith(
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Hero headline
                  Text(
                    'YOUR GAME,\nYOUR TURF.',
                    textAlign: TextAlign.center,
                    style: AppTypography.displayHero.copyWith(
                      color: AppColors.textPrimary,
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Description
                  SizedBox(
                    width: 320,
                    child: Text(
                      'Access professional-grade sports facilities instantly. '
                      'Book seamlessly, play harder, and elevate your performance '
                      'in a frictionless ecosystem.',
                      textAlign: TextAlign.center,
                      style: AppTypography.bodyMd.copyWith(
                        color: AppColors.textSecondaryAlt,
                      ),
                    ),
                  ),

                  const Spacer(flex: 3),

                  // Primary CTA
                  TurfPrimaryButton(
                    label: 'Get Started',
                    trailingIcon: Icons.arrow_forward_rounded,
                    onPressed: () => context.go(RouteNames.signup),
                  ),

                  const SizedBox(height: 12),

                  // Secondary — sign in link
                  TextButton(
                    onPressed: () => context.go(RouteNames.login),
                    child: Text(
                      'I already have an account',
                      style: AppTypography.labelLgBtn.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
