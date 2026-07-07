import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/widgets/turfx_widgets.dart';

/// OTP Verification (Dark) — Figma spec.
class OtpScreen extends StatefulWidget {
  final String phone;
  const OtpScreen({super.key, required this.phone});

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final _controllers = List.generate(6, (_) => TextEditingController());
  final _focusNodes = List.generate(6, (_) => FocusNode());
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNodes.first.requestFocus();
    });
  }

  @override
  void dispose() {
    for (final c in _controllers) c.dispose();
    for (final f in _focusNodes) f.dispose();
    super.dispose();
  }

  String get _otpCode => _controllers.map((c) => c.text).join();

  void _onChanged(int i, String v) {
    if (v.length == 1 && i < 5) _focusNodes[i + 1].requestFocus();
    if (v.isEmpty && i > 0) _focusNodes[i - 1].requestFocus();
    setState(() {});
  }

  Future<void> _verify() async {
    if (_otpCode.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter the full 6-digit OTP')),
      );
      return;
    }
    setState(() => _loading = true);
    await Future.delayed(const Duration(milliseconds: 800));
    if (mounted) {
      setState(() => _loading = false);
      context.go(RouteNames.home);
    }
  }

  @override
  Widget build(BuildContext context) {
    final phone = widget.phone.isNotEmpty ? widget.phone : '+1 (***) ***-8921';

    return Scaffold(
      backgroundColor: AppColors.bgDeep,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 8),
              // Back button
              Align(
                alignment: Alignment.centerLeft,
                child: TurfRoundIconButton(
                  icon: Icons.arrow_back_rounded,
                  background: AppColors.surface,
                  onPressed: () => context.pop(),
                ),
              ),
              const SizedBox(height: 24),

              // Header
              Text(
                'Enter your phone number',
                style: AppTypography.h1.copyWith(color: AppColors.textPrimary),
              ),
              const SizedBox(height: 8),
              Text(
                "We've sent a 6-digit verification code to the number\nbelow.",
                style: AppTypography.bodyXs
                    .copyWith(color: AppColors.textSecondaryAlt),
              ),
              const SizedBox(height: 40),

              // Phone display
              Container(
                decoration: BoxDecoration(
                  color: AppColors.surfaceAlt,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                ),
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: AppColors.surfaceDim,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      alignment: Alignment.center,
                      child: const Text('🇺🇸', style: TextStyle(fontSize: 18)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'UNITED STATES',
                            style: AppTypography.labelMdCtaUpper.copyWith(
                              color: AppColors.textSecondaryAlt,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            phone,
                            style: AppTypography.bodyMd
                                .copyWith(color: AppColors.textPrimary),
                          ),
                        ],
                      ),
                    ),
                    TurfRoundIconButton(
                      icon: Icons.edit_rounded,
                      background: AppColors.surfaceDim,
                      foreground: AppColors.accentGreen,
                      showBorder: false,
                      onPressed: () => context.pop(),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 40),

              // OTP section
              Text(
                'Enter OTP',
                style: AppTypography.h2.copyWith(color: AppColors.textPrimary),
              ),
              const SizedBox(height: 24),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: List.generate(6, (i) => _otpBox(i)),
              ),

              const SizedBox(height: 24),

              // Resend
              Center(
                child: RichText(
                  text: TextSpan(
                    style: AppTypography.bodyXs.copyWith(
                      color: AppColors.textSecondaryAlt,
                    ),
                    children: [
                      const TextSpan(text: "Didn't receive a code? "),
                      TextSpan(
                        text: 'Resend in 00:45',
                        style: AppTypography.labelLgBtn.copyWith(
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const Spacer(),

              // Verify CTA
              TurfPrimaryButton(
                label: 'Verify & Continue',
                trailingIcon: Icons.arrow_forward_rounded,
                isLoading: _loading,
                onPressed: _verify,
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _otpBox(int i) {
    final filled = _controllers[i].text.isNotEmpty;
    return SizedBox(
      width: 48,
      height: 52,
      child: TextField(
        controller: _controllers[i],
        focusNode: _focusNodes[i],
        keyboardType: TextInputType.number,
        textAlign: TextAlign.center,
        maxLength: 1,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        style: AppTypography.displayLg.copyWith(color: AppColors.textPrimary),
        cursorColor: AppColors.primary,
        decoration: InputDecoration(
          counterText: '',
          filled: true,
          fillColor: AppColors.bgDeep,
          contentPadding: EdgeInsets.zero,
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
            borderSide: BorderSide(
              color: filled ? AppColors.primary : Colors.transparent,
              width: 2,
            ),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
            borderSide: const BorderSide(color: AppColors.primary, width: 2),
          ),
        ),
        onChanged: (v) => _onChanged(i, v),
      ),
    );
  }
}
