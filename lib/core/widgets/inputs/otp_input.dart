import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// OTP input widget for TurfX.
///
/// Displays individual digit boxes for OTP entry
/// with auto-focus and paste support.
class OtpInput extends StatelessWidget {
  final int length;
  final ValueChanged<String>? onCompleted;

  const OtpInput({
    super.key,
    this.length = 6,
    this.onCompleted,
  });

  @override
  Widget build(BuildContext context) {
    // TODO: Implement full OTP input in Step 3/4
    return TextField(
      keyboardType: TextInputType.number,
      maxLength: length,
      textAlign: TextAlign.center,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      decoration: const InputDecoration(
        hintText: 'Enter OTP',
        counterText: '',
      ),
      onChanged: (value) {
        if (value.length == length) {
          onCompleted?.call(value);
        }
      },
    );
  }
}
