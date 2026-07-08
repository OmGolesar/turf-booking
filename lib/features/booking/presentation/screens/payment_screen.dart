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

/// Payment (Dark) — Figma spec, live-wired.
class PaymentScreen extends ConsumerStatefulWidget {
  const PaymentScreen({super.key});

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  static const _bookingFee = 20.0;
  static const _gstRate = 0.18;

  int _selected = 0;

  static const _methods = [
    _PaymentMethod(
      icon: Icons.qr_code_2_rounded,
      title: 'UPI ID / Scanner',
      subtitle: 'Google Pay, PhonePe, Paytm',
    ),
    _PaymentMethod(
      icon: Icons.credit_card_rounded,
      title: 'Credit / Debit Card',
      subtitle: 'Visa, Mastercard, RuPay',
    ),
    _PaymentMethod(
      icon: Icons.account_balance_rounded,
      title: 'Net Banking',
      subtitle: 'All Indian banks supported',
    ),
    _PaymentMethod(
      icon: Icons.account_balance_wallet_rounded,
      title: 'Wallets',
      subtitle: 'Amazon Pay, Mobikwik',
    ),
  ];

  static const _upiTiles = [
    _UpiTile('GPay', Icons.g_mobiledata_rounded, Color(0xFF4285F4)),
    _UpiTile('PhonePe', Icons.phone_iphone_rounded, Color(0xFF5F259F)),
    _UpiTile('Paytm', Icons.payment_rounded, Color(0xFF00BAF2)),
  ];

  Future<void> _pay({
    required String turfId,
    required String turfName,
    required String turfImage,
    required String turfLocation,
    required List<TimeSlot> slots,
    required double turfCharge,
  }) async {
    if (slots.isEmpty) return;
    final sorted = [...slots]
      ..sort((a, b) => a.startTime.compareTo(b.startTime));

    ref
        .read(bookingNotifierProvider.notifier)
        .setPaymentMethod(_methods[_selected].title);

    final booking =
        await ref.read(bookingNotifierProvider.notifier).createBooking(
              turfId: turfId,
              turfName: turfName,
              turfImage: turfImage,
              turfLocation: turfLocation,
              startTime: sorted.first.startTime,
              endTime: sorted.last.endTime,
              turfCharge: turfCharge,
            );

    if (!mounted) return;
    if (booking != null) {
      context.go(RouteNames.bookingConfirmation);
    } else {
      final err = ref.read(bookingNotifierProvider).errorMessage;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err ?? 'Payment failed. Please try again.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final booking = ref.watch(bookingNotifierProvider);
    final turfId = booking.turfId;
    final date = booking.selectedDate;

    if (turfId == null || date == null || booking.selectedSlotIds.isEmpty) {
      return Scaffold(
        backgroundColor: AppColors.bg,
        body: Center(
          child: Text(
            'No booking in progress.',
            style:
                AppTypography.bodyMd.copyWith(color: AppColors.textSecondary),
          ),
        ),
      );
    }

    final detail = ref.watch(turfDetailProvider(turfId));
    final slotsAsync = ref.watch(
      turfSlotsStreamProvider((turfId: turfId, date: date)),
    );

    final selectedSlots = slotsAsync.asData?.value
            .where((s) => booking.selectedSlotIds.contains(s.id))
            .toList() ??
        const <TimeSlot>[];
    final turfCharge = selectedSlots.fold<double>(0, (a, s) => a + s.price);
    final gst = (turfCharge + _bookingFee) * _gstRate;
    final total = turfCharge + _bookingFee + gst;

    final turf = detail.asData?.value;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Stack(
        children: [
          CustomScrollView(
            slivers: [
              SliverAppBar(
                pinned: true,
                backgroundColor: AppColors.bg,
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
                centerTitle: false,
                titleSpacing: 0,
                title: Text('Payment',
                    style: AppTypography.h1
                        .copyWith(color: AppColors.textPrimary)),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 200),
                sliver: SliverList.list(
                  children: [
                    _buildAmountHeader(total),
                    const SizedBox(height: 24),
                    Text('Quick UPI',
                        style: AppTypography.h2
                            .copyWith(color: AppColors.textPrimary)),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        for (var i = 0; i < _upiTiles.length; i++) ...[
                          Expanded(
                            child: _UpiChipButton(item: _upiTiles[i]),
                          ),
                          if (i != _upiTiles.length - 1)
                            const SizedBox(width: 12),
                        ],
                      ],
                    ),
                    const SizedBox(height: 24),
                    Text('All Payment Methods',
                        style: AppTypography.h2
                            .copyWith(color: AppColors.textPrimary)),
                    const SizedBox(height: 16),
                    _buildMethodsList(),
                  ],
                ),
              ),
            ],
          ),

          // Bottom pay action
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              child: Container(
                decoration: const BoxDecoration(
                  color: AppColors.bgDeep,
                  border: Border(
                    top: BorderSide(color: AppColors.border, width: 1),
                  ),
                ),
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                child: Column(
                  children: [
                    TurfPrimaryButton(
                      label: 'Pay ${Formatters.price(total)}',
                      leadingIcon: Icons.lock_rounded,
                      isLoading: booking.isLoading,
                      onPressed: (turf == null || selectedSlots.isEmpty)
                          ? null
                          : () => _pay(
                                turfId: turfId,
                                turfName: turf.name,
                                turfImage: turf.images.isNotEmpty
                                    ? turf.images.first
                                    : '',
                                turfLocation: turf.location,
                                slots: selectedSlots,
                                turfCharge: turfCharge,
                              ),
                    ),
                    const SizedBox(height: 12),
                    Opacity(
                      opacity: 0.7,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.lock_rounded,
                              size: 12, color: AppColors.textSecondaryAlt),
                          const SizedBox(width: 4),
                          Text('SECURED BY RAZORPAY',
                              style: AppTypography.labelXsUpper.copyWith(
                                color: AppColors.textSecondaryAlt,
                              )),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAmountHeader(double total) {
    return Column(
      children: [
        Text('Total Amount Due',
            style: AppTypography.bodyXs
                .copyWith(color: AppColors.textSecondaryAlt)),
        const SizedBox(height: 4),
        Text(Formatters.price(total),
            style:
                AppTypography.displayLg.copyWith(color: AppColors.textPrimary)),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.access_time_rounded,
                size: 14, color: AppColors.accentGreen),
            const SizedBox(width: 4),
            Text('Complete payment in 09:59',
                style: AppTypography.bodyXs.copyWith(
                  color: AppColors.accentGreen,
                )),
          ],
        ),
      ],
    );
  }

  Widget _buildMethodsList() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.bgDeep,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: Column(
        children: List.generate(_methods.length, (i) {
          final isLast = i == _methods.length - 1;
          return _PaymentMethodRow(
            method: _methods[i],
            selected: _selected == i,
            showDivider: !isLast,
            onTap: () => setState(() => _selected = i),
          );
        }),
      ),
    );
  }
}

class _PaymentMethod {
  final IconData icon;
  final String title;
  final String subtitle;
  const _PaymentMethod({
    required this.icon,
    required this.title,
    required this.subtitle,
  });
}

class _PaymentMethodRow extends StatelessWidget {
  const _PaymentMethodRow({
    required this.method,
    required this.selected,
    required this.showDivider,
    required this.onTap,
  });
  final _PaymentMethod method;
  final bool selected;
  final bool showDivider;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          border: showDivider
              ? const Border(
                  bottom: BorderSide(color: AppColors.border, width: 1))
              : null,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: const BoxDecoration(
                color: AppColors.divider,
                shape: BoxShape.circle,
              ),
              child: Icon(method.icon, size: 20, color: AppColors.textPrimary),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(method.title,
                      style: AppTypography.bodyMd.copyWith(
                        color: AppColors.textPrimary,
                      )),
                  Text(method.subtitle,
                      style: AppTypography.bodyXs.copyWith(
                        color: AppColors.textSecondaryAlt,
                      )),
                ],
              ),
            ),
            _radio(selected),
          ],
        ),
      ),
    );
  }

  Widget _radio(bool active) {
    return Container(
      width: 20,
      height: 20,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: active ? AppColors.focusBlue : Colors.transparent,
        border: Border.all(
          color: active ? AppColors.primary : AppColors.textTertiary,
          width: 2,
        ),
      ),
      alignment: Alignment.center,
      child: active
          ? Container(
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primary,
              ),
            )
          : null,
    );
  }
}

class _UpiTile {
  final String label;
  final IconData icon;
  final Color color;
  const _UpiTile(this.label, this.icon, this.color);
}

class _UpiChipButton extends StatelessWidget {
  const _UpiChipButton({required this.item});
  final _UpiTile item;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt,
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Column(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: item.color.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Icon(item.icon, size: 20, color: item.color),
          ),
          const SizedBox(height: 8),
          Text(item.label,
              style: AppTypography.labelXxs.copyWith(
                color: AppColors.textPrimary,
              )),
        ],
      ),
    );
  }
}
