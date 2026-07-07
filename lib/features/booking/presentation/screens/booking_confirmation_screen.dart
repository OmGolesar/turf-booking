import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/widgets/turfx_widgets.dart';

/// Confirmation (Dark) — Figma spec.
class BookingConfirmationScreen extends StatelessWidget {
  const BookingConfirmationScreen({super.key});

  static const _summary = [
    _ConfRow('Venue', 'Urban Astro Arena'),
    _ConfRow('Date & Time', 'Oct 24 • 18:00 - 20:00'),
    _ConfRow('Slots', '1 Full Pitch (5v5)'),
    _ConfRow('Total Paid', '\$120.00'),
    _ConfRow('Booking ID', 'TX-8924B', upper: true),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 40, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Success halo
              Center(
                child: SizedBox(
                  width: 128,
                  height: 128,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.primary.withValues(alpha: 0.1),
                        ),
                      ),
                      Container(
                        width: 96,
                        height: 96,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.primary,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.4),
                              blurRadius: 20,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        alignment: Alignment.center,
                        child: const Icon(Icons.check_rounded,
                            color: AppColors.onPrimary, size: 44),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              Center(
                child: Text('BOOKED!',
                    style: AppTypography.displayXl
                        .copyWith(color: AppColors.textPrimary)),
              ),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  'Your reservation is confirmed.',
                  style: AppTypography.bodyLg.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Summary card
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                decoration: BoxDecoration(
                  color: AppColors.surfaceAlt,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.border, width: 1),
                ),
                child: Column(
                  children: List.generate(_summary.length, (i) {
                    final isLast = i == _summary.length - 1;
                    return _summaryRow(_summary[i], showDivider: !isLast);
                  }),
                ),
              ),

              const SizedBox(height: 24),

              // QR hint banner
              Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.primaryTint,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.qr_code_scanner_rounded,
                        size: 16, color: AppColors.accentGreen),
                    const SizedBox(width: 8),
                    Text('Tap to show QR at venue',
                        style: AppTypography.bodyMdStrong.copyWith(
                          color: AppColors.accentGreen,
                        )),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Secondary buttons
              Row(
                children: [
                  Expanded(
                    child: TurfSecondaryButton(
                      label: 'Add to Calendar',
                      leadingIcon: Icons.calendar_today_rounded,
                      onPressed: () {},
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TurfSecondaryButton(
                      label: 'Share Booking',
                      leadingIcon: Icons.ios_share_rounded,
                      onPressed: () {},
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              TurfPrimaryButton(
                label: 'Back to Discover',
                onPressed: () => context.go(RouteNames.home),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _summaryRow(_ConfRow r, {required bool showDivider}) {
    return Container(
      decoration: BoxDecoration(
        border: showDivider
            ? const Border(
                bottom: BorderSide(color: AppColors.border, width: 1))
            : null,
      ),
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(r.label,
              style: AppTypography.bodySm.copyWith(
                color: AppColors.textSecondary,
              )),
          Text(r.value,
              style: (r.upper
                      ? AppTypography.bodyMdStrong.copyWith(letterSpacing: 0.8)
                      : AppTypography.bodyMdEmphasized)
                  .copyWith(color: AppColors.textPrimary)),
        ],
      ),
    );
  }
}

class _ConfRow {
  final String label;
  final String value;
  final bool upper;
  const _ConfRow(this.label, this.value, {this.upper = false});
}
