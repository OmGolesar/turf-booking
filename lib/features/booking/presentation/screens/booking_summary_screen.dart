import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/turfx_widgets.dart';
import '../../../turf_detail/domain/entities/time_slot.dart';
import '../../../turf_detail/presentation/providers/turf_detail_provider.dart';
import '../providers/booking_provider.dart';

/// Booking Summary (Dark) — Figma spec, live-wired.
class BookingSummaryScreen extends ConsumerWidget {
  const BookingSummaryScreen({super.key});

  static const _bookingFee = 20.0;
  static const _gstRate = 0.18;

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
    if (iso.isEmpty) return '—';
    final parts = iso.split('-');
    if (parts.length != 3) return iso;
    try {
      final y = int.parse(parts[0]);
      final mo = int.parse(parts[1]);
      final d = int.parse(parts[2]);
      final dt = DateTime(y, mo, d);
      const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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
      return '${dow[dt.weekday - 1]}, ${months[mo - 1]} $d';
    } catch (_) {
      return iso;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final booking = ref.watch(bookingNotifierProvider);
    final turfId = booking.turfId;
    final date = booking.selectedDate;

    if (turfId == null || date == null || booking.selectedSlotIds.isEmpty) {
      return Scaffold(
        backgroundColor: AppColors.surface,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              'No slots selected. Please pick a slot first.',
              textAlign: TextAlign.center,
              style:
                  AppTypography.bodyMd.copyWith(color: AppColors.textSecondary),
            ),
          ),
        ),
      );
    }

    final detail = ref.watch(turfDetailProvider(turfId));
    final slotsAsync = ref.watch(
      turfSlotsStreamProvider((turfId: turfId, date: date)),
    );

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Stack(
        children: [
          CustomScrollView(
            slivers: [
              SliverAppBar(
                pinned: true,
                backgroundColor: AppColors.surface,
                elevation: 0,
                toolbarHeight: 64,
                leading: Padding(
                  padding: const EdgeInsets.only(left: 20),
                  child: TurfRoundIconButton(
                    icon: Icons.arrow_back_rounded,
                    onPressed: () => context.canPop()
                        ? context.pop()
                        : context.go(RouteNames.home),
                  ),
                ),
                centerTitle: true,
                title: Text('Booking Summary',
                    style: AppTypography.h2
                        .copyWith(color: AppColors.textPrimary)),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 160),
                sliver: SliverList.list(
                  children: [
                    _buildReceiptCard(
                      context,
                      turfName: detail.asData?.value.name ?? '—',
                      turfLocation: detail.asData?.value.location ?? '',
                      dateLabel: _prettyDate(date),
                      slots: slotsAsync.asData?.value
                              .where(
                                  (s) => booking.selectedSlotIds.contains(s.id))
                              .toList() ??
                          const <TimeSlot>[],
                    ),
                    const SizedBox(height: 24),
                    _buildCouponInput(context),
                  ],
                ),
              ),
            ],
          ),

          // Sticky bottom action bar
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              child: Container(
                decoration: const BoxDecoration(
                  color: AppColors.overlayScrimSoft,
                  border: Border(
                    top: BorderSide(color: AppColors.border, width: 1),
                  ),
                ),
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                child: TurfPrimaryButton(
                  label: 'Proceed to Payment',
                  trailingIcon: Icons.arrow_forward_rounded,
                  variant: TurfPrimaryVariant.bright,
                  onPressed: () => context.push(RouteNames.payment),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReceiptCard(
    BuildContext context, {
    required String turfName,
    required String turfLocation,
    required String dateLabel,
    required List<TimeSlot> slots,
  }) {
    final slotsSorted = [...slots]
      ..sort((a, b) => a.startTime.compareTo(b.startTime));
    final startLabel =
        slotsSorted.isEmpty ? '—' : _fmt12h(slotsSorted.first.startTime);
    final endLabel =
        slotsSorted.isEmpty ? '—' : _fmt12h(slotsSorted.last.endTime);
    final hours = slotsSorted.length;
    final turfCharge = slotsSorted.fold<double>(0, (a, s) => a + s.price);
    final gst = (turfCharge + _bookingFee) * _gstRate;
    final total = turfCharge + _bookingFee + gst;

    return TurfElevatedCard(
      radius: 18,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(turfName,
                        style: AppTypography.h1
                            .copyWith(color: AppColors.textPrimary)),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined,
                            size: 13, color: AppColors.textSecondaryAlt),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(turfLocation,
                              style: AppTypography.bodyXs.copyWith(
                                color: AppColors.textSecondaryAlt,
                              )),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle_outline_rounded,
                    color: AppColors.primary, size: 26),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(color: AppColors.borderMuted, height: 1),
          const SizedBox(height: 16),
          _detailRow('Date', dateLabel),
          const SizedBox(height: 16),
          _detailRow('Time Slots', '$startLabel - $endLabel'),
          const SizedBox(height: 16),
          _detailRow('Duration', hours == 1 ? '1 Hour' : '$hours Hours'),
          const SizedBox(height: 20),
          _dashDivider(),
          const SizedBox(height: 16),
          _costRow('Slot Rate (${hours}hr)', Formatters.price(turfCharge)),
          const SizedBox(height: 8),
          _costRow('Platform Fee', Formatters.price(_bookingFee)),
          const SizedBox(height: 8),
          _costRow('GST (18%)', Formatters.price(gst)),
          const SizedBox(height: 16),
          const Divider(color: AppColors.borderMuted, height: 1),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Total Amount',
                      style: AppTypography.bodyXs.copyWith(
                        color: AppColors.textSecondaryAlt,
                      )),
                  Text('INCL. TAXES',
                      style: AppTypography.labelXsUpper.copyWith(
                        color: AppColors.textTertiary,
                      )),
                ],
              ),
              const Spacer(),
              Text(Formatters.price(total),
                  style: AppTypography.displayXxl.copyWith(
                    color: AppColors.primary,
                  )),
            ],
          ),
        ],
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: AppTypography.bodyXs
                .copyWith(color: AppColors.textSecondaryAlt)),
        Text(value,
            style: AppTypography.bodyMdEmphasized.copyWith(
              color: AppColors.textPrimary,
            )),
      ],
    );
  }

  Widget _costRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: AppTypography.bodyXs
                .copyWith(color: AppColors.textSecondaryAlt)),
        Text(value,
            style: AppTypography.bodyMd.copyWith(color: AppColors.textPrimary)),
      ],
    );
  }

  Widget _dashDivider() {
    return LayoutBuilder(
      builder: (context, constraints) {
        const dashWidth = 4.0;
        const dashSpace = 4.0;
        final count = (constraints.maxWidth / (dashWidth + dashSpace)).floor();
        return Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: List.generate(count, (_) {
            return Container(
              width: dashWidth,
              height: 1,
              color: AppColors.borderMuted,
            );
          }),
        );
      },
    );
  }

  Widget _buildCouponInput(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.bgDeep,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        child: Row(
          children: [
            const Icon(Icons.vpn_key_outlined,
                size: 20, color: AppColors.textSecondaryAlt),
            const SizedBox(width: 12),
            Expanded(
              child: TextField(
                cursorColor: AppColors.accentGreen,
                style: AppTypography.bodyMd.copyWith(
                  color: AppColors.textPrimary,
                ),
                decoration: InputDecoration(
                  isCollapsed: true,
                  border: InputBorder.none,
                  hintText: 'Add coupon code',
                  hintStyle: AppTypography.bodyMd.copyWith(
                    color: AppColors.textSecondaryAlt,
                  ),
                ),
              ),
            ),
            TextButton(
              onPressed: () {},
              style: TextButton.styleFrom(
                minimumSize: Size.zero,
                padding: EdgeInsets.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text('Apply',
                  style: AppTypography.labelMdCta.copyWith(
                    color: AppColors.primary,
                  )),
            ),
          ],
        ),
      ),
    );
  }
}
