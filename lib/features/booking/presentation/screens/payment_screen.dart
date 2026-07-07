import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/widgets/turfx_widgets.dart';

/// Payment (Dark) — Figma spec.
class PaymentScreen extends StatefulWidget {
  const PaymentScreen({super.key});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  int _selected = 0;
  bool _paying = false;

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

  Future<void> _pay() async {
    setState(() => _paying = true);
    await Future.delayed(const Duration(seconds: 1));
    if (mounted) {
      setState(() => _paying = false);
      context.go(RouteNames.bookingConfirmation);
    }
  }

  @override
  Widget build(BuildContext context) {
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
                    onPressed: () => context.pop(),
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
                    _buildAmountHeader(),
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
                      label: 'Pay ₹1,449',
                      leadingIcon: Icons.lock_rounded,
                      isLoading: _paying,
                      onPressed: _pay,
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

  Widget _buildAmountHeader() {
    return Column(
      children: [
        Text('Total Amount Due',
            style: AppTypography.bodyXs
                .copyWith(color: AppColors.textSecondaryAlt)),
        const SizedBox(height: 4),
        Text('₹1,449',
            style: AppTypography.displayLg
                .copyWith(color: AppColors.textPrimary)),
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
              child: Icon(method.icon,
                  size: 20, color: AppColors.textPrimary),
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
