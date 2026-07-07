import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/widgets/turfx_widgets.dart';

/// Booking Summary (Dark) — Figma spec.
class BookingSummaryScreen extends StatelessWidget {
  const BookingSummaryScreen({super.key});

  @override
  Widget build(BuildContext context) {
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
                    onPressed: () => context.pop(),
                  ),
                ),
                centerTitle: true,
                title: Text('Booking Summary',
                    style: AppTypography.h2.copyWith(
                      color: AppColors.textPrimary,
                    )),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 160),
                sliver: SliverList.list(
                  children: [
                    _buildReceiptCard(context),
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
                  onPressed: () => context.go(RouteNames.payment),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReceiptCard(BuildContext context) {
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
                    Text('Central Arena',
                        style: AppTypography.h1
                            .copyWith(color: AppColors.textPrimary)),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined,
                            size: 13, color: AppColors.textSecondaryAlt),
                        const SizedBox(width: 4),
                        Text('Downtown Sports Complex',
                            style: AppTypography.bodyXs.copyWith(
                              color: AppColors.textSecondaryAlt,
                            )),
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

          _detailRow('Date', 'Sat, Oct 14'),
          const SizedBox(height: 16),
          _detailRow('Time Slots', '6:00 PM - 8:00 PM'),
          const SizedBox(height: 16),
          _detailRow('Duration', '2 Hours'),

          const SizedBox(height: 20),
          _dashDivider(),
          const SizedBox(height: 16),

          _costRow('Slot Rate (2 hrs)', '\$80.00'),
          const SizedBox(height: 8),
          _costRow('Platform Fee', '\$2.50'),
          const SizedBox(height: 8),
          _costRow('GST (18%)', '\$14.85'),

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
              Text('\$97.35',
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
