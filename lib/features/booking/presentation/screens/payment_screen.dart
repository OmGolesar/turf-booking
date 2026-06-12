import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/router/route_names.dart';

class PaymentScreen extends StatefulWidget {
  const PaymentScreen({super.key});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  int _selected = 0;
  bool _paying = false;

  final _methods = [
    {'icon': Icons.account_balance_wallet, 'label': 'UPI / GPay', 'sub': 'Pay instantly via UPI'},
    {'icon': Icons.credit_card, 'label': 'Credit / Debit Card', 'sub': 'Visa, Mastercard, RuPay'},
    {'icon': Icons.account_balance, 'label': 'Net Banking', 'sub': 'All major banks supported'},
    {'icon': Icons.money, 'label': 'Pay at Venue', 'sub': 'Pay in cash when you arrive'},
  ];

  Future<void> _pay() async {
    setState(() => _paying = true);
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) {
      setState(() => _paying = false);
      context.go(RouteNames.bookingConfirmation);
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Payment')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Choose Payment Method',
                style: textTheme.headlineSmall
                    ?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 24),

            ...List.generate(_methods.length, (i) {
              final m = _methods[i];
              final isSelected = _selected == i;
              return GestureDetector(
                onTap: () => setState(() => _selected = i),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.primary.withValues(alpha: 0.08)
                        : colorScheme.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isSelected ? AppColors.primary : colorScheme.outline.withValues(alpha: 0.3),
                      width: isSelected ? 2 : 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppColors.primary.withValues(alpha: 0.15)
                              : colorScheme.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          m['icon'] as IconData,
                          color: isSelected ? AppColors.primary : colorScheme.onSurface,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(m['label'] as String,
                                style: textTheme.bodyMedium
                                    ?.copyWith(fontWeight: FontWeight.w700)),
                            Text(m['sub'] as String,
                                style: textTheme.bodySmall?.copyWith(
                                    color: colorScheme.onSurface
                                        .withValues(alpha: 0.5))),
                          ],
                        ),
                      ),
                      if (isSelected)
                        const Icon(Icons.check_circle_rounded,
                            color: AppColors.primary),
                    ],
                  ),
                ),
              );
            }),

            const Spacer(),

            // Amount row
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Amount to Pay',
                      style: TextStyle(fontWeight: FontWeight.w600)),
                  Text('₹967',
                      style: TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w900,
                          fontSize: 18)),
                ],
              ),
            ),

            const SizedBox(height: 16),

            GestureDetector(
              onTap: _paying ? null : _pay,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  gradient: _paying
                      ? const LinearGradient(colors: [Colors.grey, Colors.grey])
                      : AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: _paying
                      ? []
                      : [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.35),
                            blurRadius: 16,
                            offset: const Offset(0, 6),
                          )
                        ],
                ),
                child: Center(
                  child: _paying
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Text(
                          'Pay ₹967',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w700),
                        ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
