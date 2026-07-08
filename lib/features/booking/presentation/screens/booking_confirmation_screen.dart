import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/turfx_widgets.dart';
import '../providers/booking_provider.dart';

/// Confirmation (Dark) — Figma spec, live-wired.
class BookingConfirmationScreen extends ConsumerWidget {
  const BookingConfirmationScreen({super.key});

  String _fmt12h(String hhmm) {
    final parts = hhmm.split(':');
    if (parts.length < 2) return hhmm;
    final h = int.tryParse(parts[0]) ?? 0;
    final m = parts[1];
    final period = h >= 12 ? 'PM' : 'AM';
    final h12 = h > 12 ? h - 12 : (h == 0 ? 12 : h);
    return '$h12:$m $period';
  }

  String _prettyDate(String iso) {
    final parts = iso.split('-');
    if (parts.length != 3) return iso;
    try {
      final mo = int.parse(parts[1]);
      final d = int.parse(parts[2]);
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      return '${months[mo - 1]} $d';
    } catch (_) {
      return iso;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final booking = ref.watch(bookingNotifierProvider).latestBooking;

    final rows = booking == null
        ? const <_ConfRow>[
            _ConfRow('Status', 'No booking found'),
          ]
        : [
            _ConfRow('Venue', booking.turfName),
            _ConfRow(
              'Date & Time',
              '${_prettyDate(booking.date)} • ${_fmt12h(booking.startTime)} - ${_fmt12h(booking.endTime)}',
            ),
            _ConfRow(
              'Slots',
              '${booking.slotCount} ${booking.slotCount == 1 ? "Slot" : "Slots"} (${booking.sport})',
            ),
            _ConfRow('Total Paid', Formatters.price(booking.totalAmount)),
            _ConfRow('Booking ID', booking.id, upper: true),
          ];

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
                  children: List.generate(rows.length, (i) {
                    final isLast = i == rows.length - 1;
                    return _summaryRow(rows[i], showDivider: !isLast);
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
          Flexible(
            child: Text(
              r.value,
              textAlign: TextAlign.end,
              style: (r.upper
                      ? AppTypography.bodyMdStrong.copyWith(letterSpacing: 0.8)
                      : AppTypography.bodyMdEmphasized)
                  .copyWith(color: AppColors.textPrimary),
            ),
          ),
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
